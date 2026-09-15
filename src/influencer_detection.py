
from dataclasses import dataclass, field, asdict
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any, Set, Union
import networkx as nx
import pandas as pd

from src.utils.logger import get_logger

logger = get_logger("InfluencerDetection")


class RoleType(str, Enum):
    UPSTREAM_COORDINATOR = "UPSTREAM_COORDINATOR"
    BROKER = "BROKER"
    FINANCIAL_FACILITATOR = "FINANCIAL_FACILITATOR"
    OPERATIONAL_MEMBER = "OPERATIONAL_MEMBER"
    HIGH_DEGREE = "HIGH_DEGREE"
    PERIPHERAL_ASSOCIATE = "PERIPHERAL_ASSOCIATE"


@dataclass
class InfluencerResult:
    person_id: str
    predicted_role: str
    confidence_score: float
    graph_features: Dict[str, Any] = field(default_factory=dict)
    supporting_paths: List[List[str]] = field(default_factory=list)
    supporting_evidence_sources: List[str] = field(default_factory=list)
    connected_cases: List[str] = field(default_factory=list)
    is_criminally_significant: bool = True
    explanation: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    def __str__(self) -> str:
        paths_str = "None"
        if self.supporting_paths:
            paths_str = "\n    ".join(" -> ".join(p) for p in self.supporting_paths[:3])
        return (
            f"[{self.predicted_role}] {self.person_id} (Confidence: {self.confidence_score:.3f}, "
            f"Significant: {self.is_criminally_significant})\n"
            f"  Connected Cases:  {', '.join(self.connected_cases) if self.connected_cases else 'None'}\n"
            f"  Evidence Sources: {', '.join(self.supporting_evidence_sources)}\n"
            f"  Supporting Paths:\n    {paths_str}\n"
            f"  Explanation: {self.explanation}"
        )


class InfluencerDetector:

    FLAGSHIP_COORDINATOR = "PERSON_1476"
    FLAGSHIP_CASE = "CASE_0001"
    FLAGSHIP_EXPECTED_PATH = [
        "PERSON_1476",
        "PERSON_0026",
        "PERSON_0397",
        "PERSON_0405",
        "PERSON_1459",
        "CASE_0001"
    ]
    FLAGSHIP_INNOCENT = "PERSON_0553"

    def __init__(self, graph: nx.MultiDiGraph):
        self.G = graph
        self._person_nodes = [
            n for n, d in self.G.nodes(data=True) if d.get("entity_type") == "PERSON"
        ]
        self._features: Optional[Dict[str, Dict[str, Any]]] = None
        self._p_subgraph: Optional[nx.DiGraph] = None
        self._op_subgraph: Optional[nx.DiGraph] = None

    def _get_person_subgraph(self) -> nx.DiGraph:
        if self._p_subgraph is None:
            P = nx.DiGraph()
            for p in self._person_nodes:
                P.add_node(p)
            for u, v, d in self.G.edges(data=True):
                if u in P and v in P:
                    w = float(d.get("weight", 1.0))
                    P.add_edge(u, v, weight=w)
            self._p_subgraph = P
        return self._p_subgraph

    def _get_operational_subgraph(self) -> nx.DiGraph:
        if self._op_subgraph is None:
            Op = nx.DiGraph()
            op_edge_types = {
                "POTENTIAL_OPERATIONAL_LINK",
                "APPEARED_IN_CASE",
                "ACCUSED_IN",
                "FILED_FOR_CASE"
            }
            for u, v, d in self.G.edges(data=True):
                et = d.get("edge_type", "")
                if et in op_edge_types:
                    Op.add_edge(u, v, **d)
            self._op_subgraph = Op
        return self._op_subgraph

    def compute_person_features(self) -> Dict[str, Dict[str, Any]]:
        """
        Compute graph features for all PERSON nodes.

        Optimized version:
        - Betweenness centrality uses sampling on large graphs.
        - Operational paths to cases are computed using reverse BFS
        instead of person × case nx.has_path() calls.
        - Results are cached after the first computation.
        """
        if self._features is not None:
            return self._features

        logger.info(
            f"Computing graph features for {len(self._person_nodes)} PERSON nodes..."
        )

        P_sub = self._get_person_subgraph()
        Op_sub = self._get_operational_subgraph()

        # ============================================================
        # 1. CENTRALITY
        # ============================================================

        person_count = len(P_sub)

        if person_count <= 500:
            bc = nx.betweenness_centrality(
                P_sub,
                weight="weight"
            )
        else:
            # Large PERSON graphs:
            # use a smaller deterministic sample for fast,
            # reproducible approximation.
            sample_size = min(100, person_count)

            logger.info(
                f"Using sampled betweenness centrality: "
                f"k={sample_size}/{person_count}"
            )

            bc = nx.betweenness_centrality(
                P_sub,
                k=sample_size,
                weight="weight",
                seed=42
            )
        # Closeness is comparatively manageable for our PERSON graph.
        closeness = nx.closeness_centrality(P_sub)

        # ============================================================
        # 2. CASE NODES
        # ============================================================

        case_nodes = [
            n
            for n, d in self.G.nodes(data=True)
            if d.get("entity_type") == "CASE"
        ]

        # ============================================================
        # 3. PRECOMPUTE OPERATIONAL PATHS TO CASES
        # ============================================================
        #
        # OLD:
        #
        #   for every person:
        #       for every case:
        #           nx.has_path(...)
        #           nx.shortest_path(...)
        #
        # That causes a huge amount of repeated graph traversal.
        #
        # NEW:
        #
        #   Reverse the operational graph.
        #   Start BFS from every case.
        #   A path:
        #
        #       PERSON -> ... -> CASE
        #
        #   becomes:
        #
        #       CASE -> ... -> PERSON
        #
        #   in the reversed graph.
        #
        # ============================================================

        op_paths_by_person: Dict[str, List[Tuple[str, int, List[str]]]] = {
            pid: []
            for pid in self._person_nodes
        }

        if len(Op_sub) > 0 and len(case_nodes) > 0:

            # Reverse graph so we can search outward from CASE nodes.
            Op_reverse = Op_sub.reverse(copy=False)

            for case_id in case_nodes:

                if case_id not in Op_reverse:
                    continue

                # One BFS per CASE.
                # This is dramatically cheaper than person × case
                # has_path/shortest_path calls.
                try:
                    shortest_paths = nx.single_source_shortest_path(
                        Op_reverse,
                        case_id
                    )
                except Exception as exc:
                    logger.warning(
                        f"Operational BFS failed for {case_id}: {exc}"
                    )
                    continue

                for person_id, reverse_path in shortest_paths.items():

                    if person_id not in op_paths_by_person:
                        continue

                    # reverse_path:
                    # CASE -> PERSON
                    #
                    # Convert back:
                    # PERSON -> CASE
                    forward_path = list(reversed(reverse_path))

                    hops = len(forward_path) - 1

                    # We only care about meaningful multi-hop chains.
                    if hops >= 1:
                        op_paths_by_person[person_id].append(
                            (
                                case_id,
                                hops,
                                forward_path
                            )
                        )

            # Keep only the shortest 5 paths per person.
            # This prevents unnecessarily large feature objects.
            for pid in op_paths_by_person:
                op_paths_by_person[pid].sort(key=lambda x: x[1])
                op_paths_by_person[pid] = op_paths_by_person[pid][:5]

        # ============================================================
        # 4. COMPUTE PERSON-LEVEL FEATURES
        # ============================================================

        features: Dict[str, Dict[str, Any]] = {}

        person_set = set(self._person_nodes)

        for pid in self._person_nodes:

            out_e = list(self.G.out_edges(pid, data=True))
            in_e = list(self.G.in_edges(pid, data=True))
            all_e = out_e + in_e

            # --------------------------------------------------------
            # Basic degree features
            # --------------------------------------------------------

            deg = len(all_e)
            in_deg = len(in_e)
            out_deg = len(out_e)

            weighted_deg = sum(
                float(d.get("weight", 1.0))
                for _, _, d in all_e
            )

            # --------------------------------------------------------
            # Edge/source types
            # --------------------------------------------------------

            etypes = [
                d.get("edge_type", "")
                for _, _, d in all_e
            ]

            stypes = {
                d.get("source_type", "")
                for _, _, d in all_e
                if d.get("source_type")
            }

            # --------------------------------------------------------
            # Communication / financial / location signals
            # --------------------------------------------------------

            call_count = sum(
                1
                for e in etypes
                if "CALL" in e or "COMMUNICATED" in e
            )

            tx_count = sum(
                1
                for e in etypes
                if "TRANSFERRED" in e
            )

            loc_count = sum(
                1
                for e in etypes
                if (
                    "LOCATION" in e
                    or "RESIDES" in e
                    or "EVENT" in e
                )
            )

            # --------------------------------------------------------
            # Operational links
            # --------------------------------------------------------

            op_in_links = sum(
                1
                for _, _, d in in_e
                if d.get("edge_type") == "POTENTIAL_OPERATIONAL_LINK"
            )

            op_out_links = sum(
                1
                for _, _, d in out_e
                if d.get("edge_type") == "POTENTIAL_OPERATIONAL_LINK"
            )

            op_links = op_in_links + op_out_links

            # --------------------------------------------------------
            # Connected persons
            # --------------------------------------------------------

            connected_persons = set()

            for u, v, _ in out_e:
                if v in person_set and v != pid:
                    connected_persons.add(v)

            for u, v, _ in in_e:
                if u in person_set and u != pid:
                    connected_persons.add(u)

            # --------------------------------------------------------
            # Direct case appearances
            # --------------------------------------------------------

            direct_cases = [
                v
                for _, v, d in out_e
                if (
                    d.get("edge_type") == "APPEARED_IN_CASE"
                    or str(v).startswith("CASE_")
                )
            ]

            # Also check incoming case edges.
            for u, v, d in in_e:
                if (
                    d.get("edge_type") == "APPEARED_IN_CASE"
                    and str(u).startswith("CASE_")
                ):
                    if u not in direct_cases:
                        direct_cases.append(u)

            # --------------------------------------------------------
            # Operational multi-hop paths
            # --------------------------------------------------------

            op_paths_to_cases = op_paths_by_person.get(pid, [])

            # --------------------------------------------------------
            # General graph fallback
            #
            # Only perform this if there is NO operational path.
            # This keeps the expensive search away from the normal path.
            # --------------------------------------------------------

            general_paths_to_cases: List[
                Tuple[str, int, List[str]]
            ] = []

            if not op_paths_to_cases:

                # Limit search to a small number of cases.
                # Operational paths are preferred whenever available.
                for case_id in case_nodes[:30]:

                    try:
                        path = nx.shortest_path(
                            self.G,
                            pid,
                            case_id
                        )
                    except nx.NetworkXNoPath:
                        continue
                    except Exception:
                        continue

                    if len(path) <= 6:
                        general_paths_to_cases.append(
                            (
                                case_id,
                                len(path) - 1,
                                path
                            )
                        )

                general_paths_to_cases.sort(
                    key=lambda x: x[1]
                )

            # --------------------------------------------------------
            # Evidence source diversity
            # --------------------------------------------------------

            evidence_categories = set()

            for source_type in stypes:

                s = str(source_type).upper()

                if "CDR" in s:
                    evidence_categories.add("CDR")

                elif "FINANCIAL" in s or "BANK" in s:
                    evidence_categories.add("financial")

                elif "LOCATION" in s or "CIVIL" in s:
                    evidence_categories.add("location")

                elif "VEHICLE" in s:
                    evidence_categories.add("vehicle")

                elif "SURVEILLANCE" in s:
                    evidence_categories.add("surveillance")

                elif "INTEL" in s:
                    evidence_categories.add("intelligence")

                elif "RELATIONSHIP" in s:
                    evidence_categories.add("relationships")

                elif "FIR" in s:
                    evidence_categories.add("legal_fir")

                elif "EVIDENCE" in s:
                    evidence_categories.add("forensic_evidence")

            # --------------------------------------------------------
            # Store features
            # --------------------------------------------------------

            features[pid] = {
                "degree": deg,
                "weighted_degree": round(weighted_deg, 2),

                "in_degree": in_deg,
                "out_degree": out_deg,

                "betweenness_centrality": round(
                    bc.get(pid, 0.0),
                    5
                ),

                "closeness_centrality": round(
                    closeness.get(pid, 0.0),
                    5
                ),

                "connected_persons_count": len(
                    connected_persons
                ),

                "communication_links_count": call_count,
                "financial_links_count": tx_count,
                "location_links_count": loc_count,

                "operational_links_count": op_links,
                "op_in_links": op_in_links,
                "op_out_links": op_out_links,

                "direct_case_count": len(
                    direct_cases
                ),

                "direct_cases": direct_cases,

                "operational_paths_to_cases": sorted(
                    op_paths_to_cases,
                    key=lambda x: x[1]
                ),

                "general_paths_to_cases": sorted(
                    general_paths_to_cases,
                    key=lambda x: x[1]
                ),

                "evidence_sources": sorted(
                    list(evidence_categories)
                ),

                "evidence_source_diversity": len(
                    evidence_categories
                ),
            }

        self._features = features

        logger.info(
            "Graph feature computation complete."
        )

        return features

    def detect_influencers(self) -> List[InfluencerResult]:
        """
        Classifies all PERSON nodes into roles and calculates explainable influencer results.
        Returns list of InfluencerResult sorted by influence significance.
        """
        features = self.compute_person_features()
        results: List[InfluencerResult] = []

        for pid, feat in features.items():
            deg = feat["degree"]
            bc_val = feat["betweenness_centrality"]
            op_links = feat["operational_links_count"]
            op_in_links = feat.get("op_in_links", 0)
            op_out_links = feat.get("op_out_links", 0)
            direct_cases = feat["direct_cases"]
            op_paths = feat["operational_paths_to_cases"]
            tx_count = feat["financial_links_count"]
            call_count = feat["communication_links_count"]
            sources = feat["evidence_sources"]
            div = feat["evidence_source_diversity"]

            has_op_reach = len(op_paths) > 0
            min_op_hops = op_paths[0][1] if has_op_reach else 999
            reachable_cases = [c for c, _, _ in op_paths] if has_op_reach else direct_cases

            # Role Decision Logic:
            # -------------------------------------------------------------
            # 1. UPSTREAM_COORDINATOR:
            # - Origin of operational directives: op_in_links == 0 and op_out_links >= 1
            # - Multi-hop operational chain (hops >= 2) to crime/case node
            # - Zero direct case appearance (isolated from direct event)
            # - Meaningful operational connections
            if op_in_links == 0 and op_out_links >= 1 and has_op_reach and min_op_hops >= 2 and len(direct_cases) == 0:
                role = RoleType.UPSTREAM_COORDINATOR.value
                confidence = min(0.98, 0.70 + (0.05 * div) + (0.1 * min(bc_val * 10, 1.0)))
                is_crim = True
                paths = [p for _, _, p in op_paths[:3]]
                explanation = (
                    f"Identified as UPSTREAM_COORDINATOR: Orchestrates case(s) ({', '.join(reachable_cases[:2])}) "
                    f"via a {min_op_hops}-hop directed operational chain without directly appearing in the crime. "
                    f"Exhibits root initiator status (op_in=0, op_out={op_out_links}), betweenness centrality of {bc_val:.4f}, "
                    f"and multi-source evidence across {div} categories ({', '.join(sources)})."
                )

            # 2. OPERATIONAL_MEMBER:
            # - Directly appears in case or FIR (direct_cases > 0)
            # - Or operational executor / recruiter cell in immediate contact with field agents
            elif len(direct_cases) > 0 or (op_links >= 2 and bc_val < 0.015):
                role = RoleType.OPERATIONAL_MEMBER.value
                confidence = min(0.95, 0.75 + (0.05 * min(deg // 5, 4)))
                is_crim = True
                paths = [[pid, c] for c in direct_cases] if direct_cases else ([p for _, _, p in op_paths[:2]] if has_op_reach else [])
                explanation = (
                    f"Identified as OPERATIONAL_MEMBER: Active field/operational participant in criminal network. "
                    f"Direct case links: {direct_cases if direct_cases else 'Field execution operative'}. Node degree={deg}."
                )

            # 3. BROKER:
            # - Intermediary bridging upstream planners to execution cells:
            #   high betweenness centrality (bc >= 0.015) with operational links,
            #   or bridging multiple operational branches (op_links >= 2 and bc >= 0.015)
            elif (op_links >= 2 and bc_val >= 0.015) or (bc_val >= 0.015 and op_links >= 1):
                role = RoleType.BROKER.value
                confidence = min(0.95, 0.70 + (0.15 * min(bc_val * 10, 1.0)) + (0.05 * op_links))
                is_crim = True
                paths = [p for _, _, p in op_paths[:3]] if has_op_reach else []
                explanation = (
                    f"Identified as BROKER: Key structural bridge connecting operational clusters with betweenness "
                    f"centrality {bc_val:.4f} and {op_links} operational coordination links (in={op_in_links}, out={op_out_links})."
                )

            # 4. FINANCIAL_FACILITATOR:
            # - High financial transfer volume and ratio without operational command links
            elif tx_count >= 3 and (tx_count / max(deg, 1)) >= 0.15 and op_links == 0:
                role = RoleType.FINANCIAL_FACILITATOR.value
                confidence = min(0.92, 0.65 + (0.05 * min(tx_count, 5)))
                is_crim = True
                paths = []
                explanation = (
                    f"Identified as FINANCIAL_FACILITATOR: High financial volume with {tx_count} fund transfer links "
                    f"({(tx_count/deg)*100:.1f}% of total interactions) routing money across network accounts without direct operational field links."
                )

            # 5. HIGH_DEGREE (Innocent high-degree trap differentiation):
            # - High call/telecom volume (deg >= 12 or call_count >= 5), BUT:
            #   * Zero operational links (op_links == 0)
            #   * Low betweenness centrality (bc < 0.005)
            #   * No multi-hop operational chain to cases
            # - Correctly marked as NON-CRIMINAL / INNOCENT CONTACT
            elif (deg >= 12 or call_count >= 5) and op_links == 0 and not has_op_reach and bc_val < 0.005:
                role = RoleType.HIGH_DEGREE.value
                confidence = 0.85
                is_crim = False
                paths = []
                explanation = (
                    f"Identified as HIGH_DEGREE (Innocent contact): High communication volume ({call_count} calls, "
                    f"degree={deg}) but lacks criminal operational links, exhibits near-zero betweenness ({bc_val:.5f}), "
                    f"and has zero multi-hop operational paths to crime cases. Classified as non-criminal high-degree contact."
                )

            # 6. PERIPHERAL_ASSOCIATE:
            # - Outer associate connected to network members
            else:
                role = RoleType.PERIPHERAL_ASSOCIATE.value
                confidence = 0.70
                is_crim = True if (op_links > 0 or has_op_reach) else False
                paths = [p for _, _, p in op_paths[:2]] if has_op_reach else []
                explanation = (
                    f"Identified as PERIPHERAL_ASSOCIATE: Outer contact with degree={deg}, betweenness={bc_val:.5f}, "
                    f"participating in routine calls/transfers on the periphery."
                )

            res = InfluencerResult(
                person_id=pid,
                predicted_role=role,
                confidence_score=round(confidence, 3),
                graph_features=feat,
                supporting_paths=paths,
                supporting_evidence_sources=sources,
                connected_cases=reachable_cases,
                is_criminally_significant=is_crim,
                explanation=explanation
            )
            results.append(res)

        # Composite ranking score: prioritize criminal coordinators, brokers, and facilitators
        def rank_key(r: InfluencerResult) -> float:
            role_prio = {
                RoleType.UPSTREAM_COORDINATOR.value: 100.0,
                RoleType.BROKER.value: 80.0,
                RoleType.FINANCIAL_FACILITATOR.value: 60.0,
                RoleType.OPERATIONAL_MEMBER.value: 50.0,
                RoleType.PERIPHERAL_ASSOCIATE.value: 20.0,
                RoleType.HIGH_DEGREE.value: 10.0
            }.get(r.predicted_role, 0.0)

            bc = r.graph_features.get("betweenness_centrality", 0.0)
            op = r.graph_features.get("operational_links_count", 0)
            div = r.graph_features.get("evidence_source_diversity", 0)
            sig_mult = 1.0 if r.is_criminally_significant else 0.1

            return (role_prio * sig_mult) + (bc * 50.0) + (op * 5.0) + div

        results.sort(key=rank_key, reverse=True)
        return results

    def get_top_influencers(self, n: int = 20) -> List[InfluencerResult]:
        """Returns top N ranked influencers."""
        return self.detect_influencers()[:n]

    def find_upstream_coordinators(self) -> List[InfluencerResult]:
        """Filters and returns all detected potential upstream coordinators."""
        all_inf = self.detect_influencers()
        return [r for r in all_inf if r.predicted_role == RoleType.UPSTREAM_COORDINATOR.value]

    @classmethod
    def evaluate_against_ground_truth(
        cls,
        predictions: List[InfluencerResult],
        ground_truth_roles_path: Union[str, Path],
        ground_truth_influencers_path: Optional[Union[str, Path]] = None
    ) -> Dict[str, Any]:
        """
        Evaluates predictions against ground truth AFTER detection.
        Computes precision, recall, F1, role metrics, and innocent false positive rate.
        """
        df_roles = pd.read_csv(ground_truth_roles_path)
        gt_role_map = dict(zip(df_roles["person_id"], df_roles["role"]))

        pred_map = {r.person_id: r for r in predictions}

        # Role-level matches
        role_stats: Dict[str, Dict[str, int]] = {}
        for role in [
            "UPSTREAM_COORDINATOR", "BROKER", "FINANCIAL_FACILITATOR",
            "OPERATIONAL_MEMBER", "HIGH_DEGREE", "PERIPHERAL_ASSOCIATE"
        ]:
            role_stats[role] = {"tp": 0, "fp": 0, "fn": 0}

        # Evaluate on labeled persons
        tp_total = 0
        total_eval = len(gt_role_map)

        for pid, true_role in gt_role_map.items():
            pred_obj = pred_map.get(pid)
            pred_role = pred_obj.predicted_role if pred_obj else "NONE"

            # Role equivalence mapping for ground truth categories
            normalized_true_role = true_role
            if true_role in ("HIGH_DEGREE_INNOCENT", "INNOCENT_CONTACT"):
                normalized_true_role = "HIGH_DEGREE"
            elif true_role == "RECRUITER":
                normalized_true_role = "OPERATIONAL_MEMBER"

            if pred_role == normalized_true_role:
                tp_total += 1
                if pred_role in role_stats:
                    role_stats[pred_role]["tp"] += 1
            else:
                if normalized_true_role in role_stats:
                    role_stats[normalized_true_role]["fn"] += 1
                if pred_role in role_stats:
                    role_stats[pred_role]["fp"] += 1

        # Calculate Precision, Recall, F1 for each role
        role_metrics = {}
        for role, s in role_stats.items():
            tp, fp, fn = s["tp"], s["fp"], s["fn"]
            prec = tp / (tp + fp) if (tp + fp) > 0 else 0.0
            rec = tp / (tp + fn) if (tp + fn) > 0 else 0.0
            f1 = (2 * prec * rec) / (prec + rec) if (prec + rec) > 0 else 0.0
            role_metrics[role] = {
                "precision": round(prec, 3),
                "recall": round(rec, 3),
                "f1": round(f1, 3),
                "tp": tp,
                "fp": fp,
                "fn": fn
            }

        overall_acc = tp_total / total_eval if total_eval > 0 else 0.0

        # Flagship coordinator check
        flagship_res = pred_map.get(cls.FLAGSHIP_COORDINATOR)
        flagship_detected = (
            flagship_res is not None
            and flagship_res.predicted_role == RoleType.UPSTREAM_COORDINATOR.value
        )
        flagship_path_recovered = False
        if flagship_res and flagship_res.supporting_paths:
            for p in flagship_res.supporting_paths:
                if p == cls.FLAGSHIP_EXPECTED_PATH:
                    flagship_path_recovered = True
                    break

        # Innocent high-degree false positive check
        innocent_res = pred_map.get(cls.FLAGSHIP_INNOCENT)
        innocent_handled_correctly = (
            innocent_res is not None
            and not innocent_res.is_criminally_significant
            and innocent_res.predicted_role == RoleType.HIGH_DEGREE.value
        )

        return {
            "total_evaluated_entities": total_eval,
            "overall_accuracy": round(overall_acc, 3),
            "role_metrics": role_metrics,
            "flagship_coordinator_detected": flagship_detected,
            "flagship_coordinator_role": flagship_res.predicted_role if flagship_res else None,
            "flagship_path_recovered": flagship_path_recovered,
            "innocent_high_degree_false_positive_prevented": innocent_handled_correctly,
            "innocent_high_degree_predicted_role": innocent_res.predicted_role if innocent_res else None
        }
