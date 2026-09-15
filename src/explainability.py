from typing import Any, Dict, List, Optional
from datetime import datetime


class ExplainabilityEngine:
    """
    Generates investigator-readable explanations from actual
    graph relationships and traceable evidence.

    The engine does NOT invent relationships.
    Every factual reason is backed by an existing graph/evidence record.
    """

    def __init__(self, graph, tracer, influencer_detector):
        self.graph = graph
        self.tracer = tracer
        self.influencer_detector = influencer_detector

    # ============================================================
    # Helpers
    # ============================================================

    @staticmethod
    def _person_name(graph, person_id: str) -> str:
        """Get person name from graph node attributes."""
        if person_id in graph:
            data = graph.nodes[person_id]
            return str(
                data.get("name")
                or data.get("label")
                or person_id
            )
        return person_id

    @staticmethod
    def _parse_timestamp(value: Any) -> Optional[datetime]:
        if value is None:
            return None

        text = str(value).strip()

        if not text or text.lower() in ("none", "nan", "nat"):
            return None

        try:
            return datetime.fromisoformat(
                text.replace("Z", "+00:00")
            )
        except Exception:
            return None

    @staticmethod
    def _minutes_between(
        first: Any,
        second: Any,
    ) -> Optional[float]:

        t1 = ExplainabilityEngine._parse_timestamp(first)
        t2 = ExplainabilityEngine._parse_timestamp(second)

        if not t1 or not t2:
            return None

        return abs((t2 - t1).total_seconds()) / 60.0

    # ============================================================
    # Evidence retrieval
    # ============================================================

    def _get_person_evidence(
        self,
        person_id: str,
    ) -> List[Any]:

        try:
            return self.tracer.get_evidence_for_entity(
                person_id
            )
        except Exception:
            return []

    def _get_pair_evidence(
        self,
        source: str,
        target: str,
    ) -> List[Any]:

        try:
            return self.tracer.get_evidence_for_pair(
                source,
                target,
            )
        except Exception:
            return []

    # ============================================================
    # Communication → Financial correlation
    # ============================================================

    def _find_temporal_correlations(
        self,
        person_id: str,
        evidence: List[Any],
    ) -> List[Dict[str, Any]]:

        correlations = []

        calls = [
            e for e in evidence
            if str(e.source_type).upper()
            in ("CDR", "CALL", "COMMUNICATION")
        ]

        financial = [
            e for e in evidence
            if str(e.source_type).upper()
            in (
                "FINANCIAL_TRANSACTION",
                "TRANSACTION",
                "BANK_TRANSACTION",
            )
        ]

        for call in calls:
            call_entities = list(
                getattr(call, "entity_ids", []) or []
            )

            other_persons = [
                x for x in call_entities
                if x != person_id
                and str(x).startswith("PERSON_")
            ]

            if not other_persons:
                continue

            for other_person in other_persons:

                pair_financial = self._get_pair_evidence(
                    other_person,
                    person_id,
                )

                pair_financial += self._get_pair_evidence(
                    person_id,
                    other_person,
                )

                # Also inspect person's complete evidence
                # because account/entity chains may not be direct.
                candidate_financial = (
                    financial + pair_financial
                )

                for txn in candidate_financial:

                    minutes = self._minutes_between(
                        getattr(call, "timestamp", None),
                        getattr(txn, "timestamp", None),
                    )

                    if minutes is None:
                        continue

                    # Only describe close temporal relationships.
                    if minutes > 180:
                        continue

                    amount = None

                    # EvidenceItem doesn't guarantee an amount field,
                    # so inspect the description safely.
                    description = str(
                        getattr(txn, "description", "")
                        or ""
                    )

                    correlations.append({
                        "call_record_id": getattr(
                            call,
                            "source_record_id",
                            None,
                        ),
                        "transaction_record_id": getattr(
                            txn,
                            "source_record_id",
                            None,
                        ),
                        "caller": person_id,
                        "other_person": other_person,
                        "call_timestamp": getattr(
                            call,
                            "timestamp",
                            None,
                        ),
                        "transaction_timestamp": getattr(
                            txn,
                            "timestamp",
                            None,
                        ),
                        "minutes_between": round(
                            minutes,
                            2,
                        ),
                        "transaction_description": description,
                        "case_id": getattr(
                            txn,
                            "case_id",
                            None,
                        ),
                    })

        # Remove duplicate pairs
        unique = {}
        for item in correlations:
            key = (
                item["call_record_id"],
                item["transaction_record_id"],
            )
            unique[key] = item

        return list(unique.values())

    # ============================================================
    # Relationship explanations
    # ============================================================

    def _build_relationship_reasons(
        self,
        person_id: str,
    ) -> List[Dict[str, Any]]:

        reasons = []

        if person_id not in self.graph:
            return reasons

        neighbors = set(
            self.graph.successors(person_id)
        ) | set(
            self.graph.predecessors(person_id)
        )

        for neighbor in neighbors:

            if not str(neighbor).startswith("PERSON_"):
                continue

            pair_evidence = self._get_pair_evidence(
                person_id,
                neighbor,
            )

            pair_evidence += self._get_pair_evidence(
                neighbor,
                person_id,
            )

            if not pair_evidence:
                continue

            source_types = sorted(
                set(
                    str(e.source_type)
                    for e in pair_evidence
                )
            )

            name = self._person_name(
                self.graph,
                neighbor,
            )

            reasons.append({
                "type": "DIRECT_RELATIONSHIP",
                "severity": "HIGH",
                "person_id": neighbor,
                "person_name": name,
                "relationship": (
                    f"{person_id} has a direct relationship "
                    f"with {name}."
                ),
                "evidence_count": len(pair_evidence),
                "source_types": source_types,
                "record_ids": [
                    e.source_record_id
                    for e in pair_evidence[:5]
                ],
            })

        return reasons

    # ============================================================
    # Operational chain explanation
    # ============================================================

    def _build_chain_reason(
        self,
        person_id: str,
        role_result: Any,
    ) -> Optional[Dict[str, Any]]:

        paths = getattr(
            role_result,
            "supporting_paths",
            [],
        ) or []

        if not paths:
            return None

        path = paths[0]

        if isinstance(path, dict):
            nodes = (
                path.get("path")
                or path.get("nodes")
                or []
            )
        else:
            nodes = list(path)

        if not nodes:
            return None

        readable = []

        for node in nodes:
            readable.append(
                self._person_name(
                    self.graph,
                    str(node),
                )
                if str(node).startswith("PERSON_")
                else str(node)
            )

        return {
            "type": "OPERATIONAL_CHAIN",
            "severity": "HIGH",
            "title": "Multi-hop operational connection",
            "chain": nodes,
            "readable_chain": readable,
            "reason": (
                "The person is connected to an operational case "
                "through a multi-hop relationship chain."
            ),
        }

    # ============================================================
    # Main explanation
    # ============================================================

    def explain(
        self,
        person_id: str,
        rule_role: Optional[str] = None,
        hybrid_role: Optional[str] = None,
        confidence: Optional[float] = None,
    ) -> Dict[str, Any]:

        evidence = self._get_person_evidence(
            person_id
        )

        features = (
            self.influencer_detector
            .compute_person_features()
            .get(person_id, {})
        )

        reasons: List[Dict[str, Any]] = []

        # --------------------------------------------------------
        # 1. Actual direct relationships
        # --------------------------------------------------------

        reasons.extend(
            self._build_relationship_reasons(
                person_id
            )
        )

        # --------------------------------------------------------
        # 2. Operational chain
        # --------------------------------------------------------

        role_result = None

        try:
            role_result = (
                self.influencer_detector
                .detect_influencers()
                .get(person_id)
            )
        except Exception:
            role_result = None

        if role_result:

            chain_reason = self._build_chain_reason(
                person_id,
                role_result,
            )

            if chain_reason:
                reasons.append(
                    chain_reason
                )

        # --------------------------------------------------------
        # 3. Communication → financial correlation
        # --------------------------------------------------------

        correlations = (
            self._find_temporal_correlations(
                person_id,
                evidence,
            )
        )

        for correlation in correlations[:10]:

            other_person = correlation[
                "other_person"
            ]

            other_name = self._person_name(
                self.graph,
                other_person,
            )

            minutes = correlation[
                "minutes_between"
            ]

            reasons.append({
                "type": "TEMPORAL_FINANCIAL_CORRELATION",
                "severity": "HIGH",
                "title": "Communication followed by financial activity",
                "reason": (
                    f"{self._person_name(self.graph, person_id)} "
                    f"communicated with {other_name}, followed "
                    f"by a financial transaction approximately "
                    f"{minutes:g} minutes later."
                ),
                "caller": person_id,
                "other_person": other_person,
                "other_person_name": other_name,
                "call_record_id": correlation[
                    "call_record_id"
                ],
                "transaction_record_id": correlation[
                    "transaction_record_id"
                ],
                "call_timestamp": correlation[
                    "call_timestamp"
                ],
                "transaction_timestamp": correlation[
                    "transaction_timestamp"
                ],
                "case_id": correlation[
                    "case_id"
                ],
                "transaction_description": correlation[
                    "transaction_description"
                ],
            })

        # --------------------------------------------------------
        # 4. Structural reason
        # --------------------------------------------------------

        op_in = int(
            features.get("op_in_links", 0)
        )

        op_out = int(
            features.get("op_out_links", 0)
        )

        if op_in == 0 and op_out > 0:

            reasons.append({
                "type": "OPERATIONAL_DIRECTION",
                "severity": "HIGH",
                "title": "Initiates operational activity",
                "reason": (
                    f"{self._person_name(self.graph, person_id)} "
                    f"has {op_in} incoming operational links and "
                    f"{op_out} outgoing operational links."
                ),
                "op_in_links": op_in,
                "op_out_links": op_out,
            })

        # --------------------------------------------------------
        # 5. Evidence diversity
        # --------------------------------------------------------

        source_types = sorted(
            set(
                str(e.source_type)
                for e in evidence
            )
        )

        if len(source_types) >= 3:

            reasons.append({
                "type": "MULTI_SOURCE_CORROBORATION",
                "severity": "MEDIUM",
                "title": "Activity corroborated by multiple sources",
                "reason": (
                    f"Observed activity is supported by "
                    f"{len(source_types)} different evidence "
                    f"source categories."
                ),
                "source_categories": source_types,
                "evidence_count": len(evidence),
            })

        # --------------------------------------------------------
        # 6. Final summary
        # --------------------------------------------------------

        high_reasons = sum(
            1
            for r in reasons
            if r.get("severity") == "HIGH"
        )

        if hybrid_role:
            role = hybrid_role
        else:
            role = rule_role

        summary = (
            f"{self._person_name(self.graph, person_id)} "
            f"is flagged for further investigation"
        )

        if role:
            summary += (
                f" as a potential {role.replace('_', ' ').title()}."
            )
        else:
            summary += " based on correlated network activity."

        return {
            "person_id": person_id,
            "role": role,
            "confidence": confidence,
            "flagged": high_reasons > 0,
            "summary": summary,
            "reason_count": len(reasons),
            "high_severity_reasons": high_reasons,
            "reasons": reasons,
            "evidence_count": len(evidence),
            "evidence_source_categories": source_types,
        }