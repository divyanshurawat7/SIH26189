"""
SIH26189 — AI-Powered Criminal Network Analysis System
Module: src/evidence_traceability.py

Phase 6: Evidence Traceability
Provides a unified evidence tracing layer that links high-level intelligence findings,
roles, multi-hop operational chains, and case conclusions back to concrete,
verifiable source records across the raw dataset.

Core Principles:
1. Strict Provenance: Every evidence item traces back to a genuine primary key in the raw CSVs.
2. High-Performance Indexing: In-memory indexes built once upon initialization for O(1) lookups.
3. Multi-Source Diversity: Quantifies independent categories (CDR, Transactions, Location,
   Vehicle, Surveillance, Intelligence, FIR, Criminal History, Relationships, Evidence Records, Social Media).
4. Explainable Confidence: Aggregates source confidence without inventing unwarranted certainty.
5. Zero Ground-Truth Leakage: Predicts and traces using strictly raw datasets and graph topology.
"""

from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional, Tuple, Any, Set, Union
import math
import pandas as pd
import networkx as nx

from src.data_loader import RawDataset
from src.utils.logger import get_logger

logger = get_logger("EvidenceTraceability")


@dataclass
class EvidenceItem:
    """
    Standardized, canonical representation of a verified raw evidence record.
    Preserves original dataset source record IDs and provenance.
    """
    evidence_id: str
    source_type: str            # e.g., "CDR", "FINANCIAL_TRANSACTION", "LOCATION_EVENT", etc.
    source_record_id: str       # Actual CSV primary key (e.g. CALL_000001, TXN_000001, REL_000004)
    entity_ids: List[str]       # Directly involved entities (persons, orgs, phones, accounts, vehicles)
    case_id: Optional[str] = None
    timestamp: Optional[str] = None
    location_id: Optional[str] = None
    confidence: float = 1.0
    reliability: float = 1.0
    description: str = ""
    raw_record: Optional[Dict[str, Any]] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    def __str__(self) -> str:
        case_part = f" | Case: {self.case_id}" if self.case_id else ""
        time_part = f" | Time: {self.timestamp}" if self.timestamp else ""
        return (
            f"[{self.source_type}] {self.source_record_id}{case_part}{time_part} "
            f"(Conf: {self.confidence:.2f}, Rel: {self.reliability:.2f}): {self.description}"
        )


@dataclass
class EvidenceTrace:
    """
    Structured outcome of tracing an intelligence finding, entity, pair, or chain.
    Quantifies source categories, diversity, and explainable confidence.
    """
    target_id: str              # finding_id, person_id, case_id, or "A -> B -> C"
    target_type: str            # "FINDING", "PERSON", "CASE", "PAIR", "CHAIN"
    evidence_items: List[EvidenceItem] = field(default_factory=list)
    source_categories: List[str] = field(default_factory=list)
    source_count: int = 0
    diversity_score: float = 0.0
    aggregate_confidence: float = 0.0
    aggregate_reliability: float = 0.0
    hop_traces: List[Dict[str, Any]] = field(default_factory=list)
    narrative: str = ""

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["evidence_items"] = [item.to_dict() if isinstance(item, EvidenceItem) else item for item in self.evidence_items]
        return d

    def __str__(self) -> str:
        cats = ", ".join(self.source_categories)
        return (
            f"=== Evidence Trace for {self.target_type}: {self.target_id} ===\n"
            f"Total Items: {self.source_count} | Categories ({len(self.source_categories)}): [{cats}]\n"
            f"Diversity Score: {self.diversity_score:.2f} | Confidence: {self.aggregate_confidence:.2f} | Reliability: {self.aggregate_reliability:.2f}\n"
            f"Narrative: {self.narrative}\n"
        )


class EvidenceTracer:
    """
    In-memory indexing and evidence provenance engine.
    Constructs fast index mappings across all 20 raw tables to enable O(1) trace lookups.
    """

    SUPPORTED_SOURCE_TYPES = [
        "CDR",
        "FINANCIAL_TRANSACTION",
        "LOCATION_EVENT",
        "VEHICLE_EVENT",
        "SURVEILLANCE_REPORT",
        "INTELLIGENCE_REPORT",
        "SOCIAL_MEDIA",
        "FIR_RECORD",
        "CRIMINAL_HISTORY",
        "EVIDENCE_RECORD",
        "RELATIONSHIP"
    ]

    def __init__(self, dataset: RawDataset, graph: Optional[nx.MultiDiGraph] = None):
        self.data = dataset
        self.graph = graph

        # Cross-reference entity mappings
        self.phone_to_person: Dict[str, str] = {}
        self.person_to_phones: Dict[str, List[str]] = {}
        self.account_to_person: Dict[str, str] = {}
        self.person_to_accounts: Dict[str, List[str]] = {}
        self.vehicle_to_person: Dict[str, str] = {}
        self.person_to_vehicles: Dict[str, List[str]] = {}

        # Primary In-Memory Indexes for O(1) Lookups
        self._record_index: Dict[str, EvidenceItem] = {}
        self._entity_index: Dict[str, List[EvidenceItem]] = {}
        self._case_index: Dict[str, List[EvidenceItem]] = {}
        self._pair_index: Dict[Tuple[str, str], List[EvidenceItem]] = {}
        self._location_index: Dict[str, List[EvidenceItem]] = {}

        self._build_cross_references()
        self._build_indexes()
        logger.info(
            f"EvidenceTracer initialized: {len(self._record_index)} source records indexed across "
            f"{len(self._entity_index)} entities, {len(self._pair_index)} pairs, {len(self._case_index)} cases."
        )

    def _build_cross_references(self):
        """Constructs mappings between auxiliary identifiers and canonical person nodes."""
        # Phones
        if hasattr(self.data, "phones") and not self.data.phones.empty:
            for _, r in self.data.phones.iterrows():
                ph = str(r["phone_id"])
                p = str(r["person_id"])
                if ph and p and p.startswith("PERSON_"):
                    self.phone_to_person[ph] = p
                    self.person_to_phones.setdefault(p, []).append(ph)

        # Bank Accounts
        if hasattr(self.data, "bank_accounts") and not self.data.bank_accounts.empty:
            for _, r in self.data.bank_accounts.iterrows():
                acc = str(r["account_id"])
                p = str(r["person_id"])
                if acc and p and p.startswith("PERSON_"):
                    self.account_to_person[acc] = p
                    self.person_to_accounts.setdefault(p, []).append(acc)

        # Vehicles
        if hasattr(self.data, "vehicles") and not self.data.vehicles.empty:
            for _, r in self.data.vehicles.iterrows():
                v = str(r["vehicle_id"])
                p = str(r["owner_person_id"])
                if v and p and p.startswith("PERSON_"):
                    self.vehicle_to_person[v] = p
                    self.person_to_vehicles.setdefault(p, []).append(v)

    def _register_item(
        self,
        item: EvidenceItem,
        involved_entities: List[str],
        case_id: Optional[str] = None,
        location_id: Optional[str] = None
    ):
        """Helper to register an EvidenceItem into all relevant index maps."""
        # 1. Primary Record ID Index
        self._record_index[item.source_record_id] = item

        # 2. Entity Index
        unique_entities = set()
        for e in involved_entities:
            if e and str(e).strip() and str(e) != "nan":
                e_clean = str(e).strip()
                unique_entities.add(e_clean)
                self._entity_index.setdefault(e_clean, []).append(item)

        # 3. Pair Index (for all pairs among primary entities, especially persons)
        ent_list = sorted(list(unique_entities))
        for i in range(len(ent_list)):
            for j in range(i + 1, len(ent_list)):
                pair = (ent_list[i], ent_list[j])
                self._pair_index.setdefault(pair, []).append(item)

        # 4. Case Index
        if case_id and str(case_id).strip() and str(case_id).startswith("CASE_"):
            cid_clean = str(case_id).strip()
            self._case_index.setdefault(cid_clean, []).append(item)

        # 5. Location Index
        if location_id and str(location_id).strip() and str(location_id).startswith("LOCATION_"):
            lid_clean = str(location_id).strip()
            self._location_index.setdefault(lid_clean, []).append(item)

    def _build_indexes(self):
        """Indexes all 11 evidence tables from RawDataset."""
        # 1. CDR Records (Telecommunication)
        if hasattr(self.data, "cdr_records") and not self.data.cdr_records.empty:
            for _, r in self.data.cdr_records.iterrows():
                cid = str(r["call_id"])
                c_ph = str(r.get("caller_phone_id", ""))
                r_ph = str(r.get("receiver_phone_id", ""))
                c_p = self.phone_to_person.get(c_ph)
                r_p = self.phone_to_person.get(r_ph)
                dur = r.get("duration_seconds", 0)
                ts = str(r.get("timestamp", ""))

                ents = [c_ph, r_ph]
                if c_p:
                    ents.append(c_p)
                if r_p:
                    ents.append(r_p)

                desc = f"Call from {c_ph} ({c_p or 'Unknown'}) to {r_ph} ({r_p or 'Unknown'}), duration {dur}s."
                item = EvidenceItem(
                    evidence_id=f"EV_CDR_{cid}",
                    source_type="CDR",
                    source_record_id=cid,
                    entity_ids=ents,
                    case_id=None,
                    timestamp=ts,
                    location_id=str(r.get("tower_id", "")) if pd.notna(r.get("tower_id")) else None,
                    confidence=float(r.get("confidence", 0.95)) if pd.notna(r.get("confidence")) else 0.95,
                    reliability=0.95,
                    description=desc,
                    raw_record={"duration_seconds": dur, "caller_phone": c_ph, "receiver_phone": r_ph}
                )
                self._register_item(item, ents)

        # 2. Financial Transactions
        if hasattr(self.data, "financial_transactions") and not self.data.financial_transactions.empty:
            for _, r in self.data.financial_transactions.iterrows():
                tid = str(r["transaction_id"])
                s_acc = str(r.get("sender_account_id", ""))
                r_acc = str(r.get("receiver_account_id", ""))
                s_p = self.account_to_person.get(s_acc)
                r_p = self.account_to_person.get(r_acc)
                amt = r.get("amount", 0.0)
                ts = str(r.get("timestamp", ""))
                cid = str(r.get("case_id", "")) if pd.notna(r.get("case_id")) else None

                ents = [s_acc, r_acc]
                if s_p:
                    ents.append(s_p)
                if r_p:
                    ents.append(r_p)
                if cid:
                    ents.append(cid)

                desc = f"Fund transfer of INR {amt:,.2f} from account {s_acc} ({s_p or 'Unknown'}) to {r_acc} ({r_p or 'Unknown'})."
                item = EvidenceItem(
                    evidence_id=f"EV_TXN_{tid}",
                    source_type="FINANCIAL_TRANSACTION",
                    source_record_id=tid,
                    entity_ids=ents,
                    case_id=cid,
                    timestamp=ts,
                    location_id=None,
                    confidence=float(r.get("confidence", 0.96)) if pd.notna(r.get("confidence")) else 0.96,
                    reliability=0.95,
                    description=desc,
                    raw_record={"amount": amt, "sender_account": s_acc, "receiver_account": r_acc}
                )
                self._register_item(item, ents, case_id=cid)

        # 3. Location Events
        if hasattr(self.data, "location_events") and not self.data.location_events.empty:
            for _, r in self.data.location_events.iterrows():
                leid = str(r["location_event_id"])
                ent = str(r.get("entity_id", ""))
                etype = str(r.get("entity_type", "PERSON"))
                loc = str(r.get("location_id", ""))
                ts = str(r.get("timestamp", ""))
                src = str(r.get("source", "TOWER_PING"))
                conf = float(r.get("confidence", 0.90)) if pd.notna(r.get("confidence")) else 0.90

                ents = [ent]
                desc = f"{etype} {ent} presence recorded at {loc} via {src}."
                item = EvidenceItem(
                    evidence_id=f"EV_LOC_{leid}",
                    source_type="LOCATION_EVENT",
                    source_record_id=leid,
                    entity_ids=ents,
                    case_id=None,
                    timestamp=ts,
                    location_id=loc,
                    confidence=conf,
                    reliability=0.88,
                    description=desc,
                    raw_record={"event_source": src, "tower_id": str(r.get("tower_id", ""))}
                )
                self._register_item(item, ents, location_id=loc)

        # 4. Vehicle Events
        if hasattr(self.data, "vehicle_events") and not self.data.vehicle_events.empty:
            for _, r in self.data.vehicle_events.iterrows():
                veid = str(r["event_id"])
                veh = str(r.get("vehicle_id", ""))
                owner_p = self.vehicle_to_person.get(veh)
                loc = str(r.get("location_id", ""))
                ts = str(r.get("timestamp", ""))
                etype = str(r.get("event_type", "ANPR"))
                conf = float(r.get("confidence", 0.92)) if pd.notna(r.get("confidence")) else 0.92

                ents = [veh]
                if owner_p:
                    ents.append(owner_p)

                desc = f"Vehicle {veh} (Owner: {owner_p or 'Unknown'}) observed at {loc} via {etype} checkpoint."
                item = EvidenceItem(
                    evidence_id=f"EV_VEH_{veid}",
                    source_type="VEHICLE_EVENT",
                    source_record_id=veid,
                    entity_ids=ents,
                    case_id=None,
                    timestamp=ts,
                    location_id=loc,
                    confidence=conf,
                    reliability=0.90,
                    description=desc,
                    raw_record={"event_type": etype, "vehicle_id": veh}
                )
                self._register_item(item, ents, location_id=loc)

        # 5. Surveillance Reports
        if hasattr(self.data, "surveillance_reports") and not self.data.surveillance_reports.empty:
            for _, r in self.data.surveillance_reports.iterrows():
                srid = str(r["report_id"])
                cid = str(r.get("case_id", "")) if pd.notna(r.get("case_id")) else None
                loc = str(r.get("location_id", "")) if pd.notna(r.get("location_id")) else None
                pref = str(r.get("person_reference", "")) if pd.notna(r.get("person_reference")) else None
                vref = str(r.get("vehicle_reference", "")) if pd.notna(r.get("vehicle_reference")) else None
                obs = str(r.get("observation", ""))
                conf = float(r.get("confidence", 0.85)) if pd.notna(r.get("confidence")) else 0.85
                ts = str(r.get("timestamp", ""))

                ents = []
                if pref:
                    ents.append(pref)
                if vref:
                    ents.append(vref)
                    if vref in self.vehicle_to_person:
                        ents.append(self.vehicle_to_person[vref])
                if cid:
                    ents.append(cid)

                item = EvidenceItem(
                    evidence_id=f"EV_SURV_{srid}",
                    source_type="SURVEILLANCE_REPORT",
                    source_record_id=srid,
                    entity_ids=ents,
                    case_id=cid,
                    timestamp=ts,
                    location_id=loc,
                    confidence=conf,
                    reliability=0.85,
                    description=f"Field surveillance: {obs}",
                    raw_record={"observation": obs}
                )
                self._register_item(item, ents, case_id=cid, location_id=loc)

        # 6. Intelligence Reports
        if hasattr(self.data, "intelligence_reports") and not self.data.intelligence_reports.empty:
            for _, r in self.data.intelligence_reports.iterrows():
                irid = str(r["report_id"])
                cid = str(r.get("case_id", "")) if pd.notna(r.get("case_id")) else None
                sub_p = str(r.get("subject_person_id", "")) if pd.notna(r.get("subject_person_id")) else None
                sub_org = str(r.get("subject_organization_id", "")) if pd.notna(r.get("subject_organization_id")) else None
                obs = str(r.get("observation", ""))
                conf = float(r.get("confidence", 0.80)) if pd.notna(r.get("confidence")) else 0.80
                rel_str = str(r.get("reliability", "B"))
                rel_map = {"A": 0.95, "B": 0.85, "C": 0.70, "D": 0.55}
                reliability = rel_map.get(rel_str, 0.80)
                ts = str(r.get("timestamp", ""))

                ents = []
                if sub_p:
                    ents.append(sub_p)
                if sub_org:
                    ents.append(sub_org)
                if cid:
                    ents.append(cid)

                item = EvidenceItem(
                    evidence_id=f"EV_INTEL_{irid}",
                    source_type="INTELLIGENCE_REPORT",
                    source_record_id=irid,
                    entity_ids=ents,
                    case_id=cid,
                    timestamp=ts,
                    location_id=None,
                    confidence=conf,
                    reliability=reliability,
                    description=f"Confidential intelligence report: {obs}",
                    raw_record={"observation": obs, "source": str(r.get("source", ""))}
                )
                self._register_item(item, ents, case_id=cid)

        # 7. FIR Records
        if hasattr(self.data, "fir_records") and not self.data.fir_records.empty:
            for _, r in self.data.fir_records.iterrows():
                fid = str(r["fir_id"])
                cid = str(r.get("case_id", ""))
                acc = str(r.get("accused_id", "")) if pd.notna(r.get("accused_id")) else None
                comp = str(r.get("complainant_id", "")) if pd.notna(r.get("complainant_id")) else None
                wit = str(r.get("witness_id", "")) if pd.notna(r.get("witness_id")) else None
                loc = str(r.get("location_id", "")) if pd.notna(r.get("location_id")) else None
                crime = str(r.get("crime_type", "crime"))
                narr = str(r.get("narrative", ""))
                conf = float(r.get("confidence", 0.90)) if pd.notna(r.get("confidence")) else 0.90
                ts = str(r.get("date", ""))

                ents = [cid]
                if acc:
                    ents.append(acc)
                if comp:
                    ents.append(comp)
                if wit:
                    ents.append(wit)

                desc = f"First Information Report {fid} filed for {cid} ({crime}). Accused: {acc or 'None'}."
                item = EvidenceItem(
                    evidence_id=f"EV_FIR_{fid}",
                    source_type="FIR_RECORD",
                    source_record_id=fid,
                    entity_ids=ents,
                    case_id=cid,
                    timestamp=ts,
                    location_id=loc,
                    confidence=conf,
                    reliability=0.92,
                    description=desc,
                    raw_record={"crime_type": crime, "narrative": narr, "accused": acc}
                )
                self._register_item(item, ents, case_id=cid, location_id=loc)

        # 8. Criminal History
        if hasattr(self.data, "criminal_history") and not self.data.criminal_history.empty:
            for _, r in self.data.criminal_history.iterrows():
                hid = str(r["history_id"])
                pid = str(r.get("person_id", ""))
                cid = str(r.get("case_id", "")) if pd.notna(r.get("case_id")) else None
                crime = str(r.get("crime_type", ""))
                role = str(r.get("role", "accused"))
                status = str(r.get("status", "chargesheet_filed"))
                ts = str(r.get("date", ""))
                conf = float(r.get("confidence", 0.90)) if pd.notna(r.get("confidence")) else 0.90

                ents = [pid]
                if cid:
                    ents.append(cid)

                desc = f"Criminal registry record: {pid} documented as {role} ({status}) in {cid or 'past offenses'} for {crime}."
                item = EvidenceItem(
                    evidence_id=f"EV_HIST_{hid}",
                    source_type="CRIMINAL_HISTORY",
                    source_record_id=hid,
                    entity_ids=ents,
                    case_id=cid,
                    timestamp=ts,
                    location_id=None,
                    confidence=conf,
                    reliability=0.92,
                    description=desc,
                    raw_record={"crime_type": crime, "role": role, "status": status}
                )
                self._register_item(item, ents, case_id=cid)

        # 9. Evidence Records
        if hasattr(self.data, "evidence") and not self.data.evidence.empty:
            for _, r in self.data.evidence.iterrows():
                evid = str(r["evidence_id"])
                cid = str(r.get("case_id", "")) if pd.notna(r.get("case_id")) else None
                etype = str(r.get("evidence_type", "FORENSIC"))
                ent1 = str(r.get("entity_id", "")) if pd.notna(r.get("entity_id")) else None
                ent2 = str(r.get("related_entity_id", "")) if pd.notna(r.get("related_entity_id")) else None
                desc = str(r.get("description", ""))
                conf = float(r.get("confidence", 0.90)) if pd.notna(r.get("confidence")) else 0.90
                rel = float(r.get("reliability", 0.85)) if pd.notna(r.get("reliability")) else 0.85
                ts = str(r.get("date", ""))

                ents = []
                if ent1:
                    ents.append(ent1)
                if ent2:
                    ents.append(ent2)
                if cid:
                    ents.append(cid)

                item = EvidenceItem(
                    evidence_id=f"EV_EVID_{evid}",
                    source_type="EVIDENCE_RECORD",
                    source_record_id=evid,
                    entity_ids=ents,
                    case_id=cid,
                    timestamp=ts,
                    location_id=None,
                    confidence=conf,
                    reliability=rel,
                    description=f"{etype} physical/digital evidence: {desc}",
                    raw_record={"evidence_type": etype, "description": desc}
                )
                self._register_item(item, ents, case_id=cid)

        # 10. Relationships (Interpersonal / Syndicate Links)
        if hasattr(self.data, "relationships") and not self.data.relationships.empty:
            for _, r in self.data.relationships.iterrows():
                relid = str(r["relationship_id"])
                u = str(r.get("source_entity_id", ""))
                v = str(r.get("target_entity_id", ""))
                rtype = str(r.get("relationship_type", "ASSOCIATED_WITH"))
                conf = float(r.get("confidence", 0.85)) if pd.notna(r.get("confidence")) else 0.85
                ts = str(r.get("last_seen", r.get("first_seen", "")))

                ents = [u, v]
                desc = f"Verified relationship link ({rtype}) between {u} and {v} with confidence {conf:.2f}."
                item = EvidenceItem(
                    evidence_id=f"EV_REL_{relid}",
                    source_type="RELATIONSHIP",
                    source_record_id=relid,
                    entity_ids=ents,
                    case_id=v if str(v).startswith("CASE_") else (u if str(u).startswith("CASE_") else None),
                    timestamp=ts,
                    location_id=None,
                    confidence=conf,
                    reliability=0.90,
                    description=desc,
                    raw_record={"relationship_type": rtype, "frequency": r.get("frequency", 1)}
                )
                self._register_item(item, ents, case_id=item.case_id)

        # 11. Social Media Records
        if hasattr(self.data, "social_media_records") and not self.data.social_media_records.empty:
            for _, r in self.data.social_media_records.iterrows():
                smid = str(r["social_record_id"])
                p = str(r.get("person_id", ""))
                plat = str(r.get("platform", "Social"))
                post = str(r.get("content", ""))
                ment = str(r.get("mentioned_person_id", "")) if pd.notna(r.get("mentioned_person_id")) else None
                loc = str(r.get("location_id", "")) if pd.notna(r.get("location_id")) else None
                ts = str(r.get("timestamp", ""))
                conf = float(r.get("confidence", 0.70)) if pd.notna(r.get("confidence")) else 0.70

                ents = [p]
                if ment:
                    ents.append(ment)

                item = EvidenceItem(
                    evidence_id=f"EV_SOC_{smid}",
                    source_type="SOCIAL_MEDIA",
                    source_record_id=smid,
                    entity_ids=ents,
                    case_id=None,
                    timestamp=ts,
                    location_id=loc,
                    confidence=conf,
                    reliability=0.75,
                    description=f"{plat} social monitoring record for {p}: \"{post[:80]}...\"",
                    raw_record={"platform": plat, "content": post}
                )
                self._register_item(item, ents, location_id=loc)

    # =========================================================================
    # Query & Retrieval API
    # =========================================================================

    def get_evidence_by_record_id(self, record_id: str) -> Optional[EvidenceItem]:
        """Returns verified EvidenceItem for any raw record ID in O(1) time."""
        return self._record_index.get(str(record_id).strip())

    def get_evidence_for_entity(self, entity_id: str, limit: Optional[int] = None) -> List[EvidenceItem]:
        """Returns all evidence items involving an entity in O(1) time."""
        items = self._entity_index.get(str(entity_id).strip(), [])
        if limit:
            return items[:limit]
        return list(items)

    def get_evidence_for_pair(self, entity_u: str, entity_v: str, limit: Optional[int] = None) -> List[EvidenceItem]:
        """Returns all direct pairwise evidence records connecting two entities."""
        pair = tuple(sorted([str(entity_u).strip(), str(entity_v).strip()]))
        items = self._pair_index.get(pair, [])
        if limit:
            return items[:limit]
        return list(items)

    def get_evidence_for_case(self, case_id: str, limit: Optional[int] = None) -> List[EvidenceItem]:
        """Returns all evidence associated with a case."""
        items = self._case_index.get(str(case_id).strip(), [])
        if limit:
            return items[:limit]
        return list(items)

    def get_evidence_for_location(self, location_id: str, limit: Optional[int] = None) -> List[EvidenceItem]:
        """Returns all evidence associated with a location."""
        items = self._location_index.get(str(location_id).strip(), [])
        if limit:
            return items[:limit]
        return list(items)

    # =========================================================================
    # Diversity & Explainable Confidence Aggregation
    # =========================================================================

    @classmethod
    def calculate_evidence_diversity(cls, items: List[EvidenceItem]) -> Tuple[int, List[str], float]:
        """
        Calculates distinct source category count, category names, and normalized diversity score.
        Multiple records from the same category (e.g. 5 CDR calls) strictly count as 1 category.
        """
        if not items:
            return 0, [], 0.0

        cats = sorted(list(set(item.source_type for item in items)))
        cat_count = len(cats)
        # Normalized diversity score relative to 6 expected distinct forensic layers
        diversity_score = min(1.0, cat_count / 6.0)
        return cat_count, cats, round(diversity_score, 3)

    @classmethod
    def calculate_aggregate_confidence(cls, items: List[EvidenceItem]) -> Tuple[float, float]:
        """
        Calculates explainable confidence and reliability without inventing certainty.
        Formula:
          - Base confidence = mean(item.confidence)
          - Base reliability = mean(item.reliability)
          - Multi-source corroboration factor = min(1.0, 0.70 + 0.06 * num_categories)
          - Final score = min(0.98, base * factor)
          - Never claims 1.0 (100% confirmed) unless explicitly backed by single confirmed source.
        """
        if not items:
            return 0.0, 0.0

        num_cats = len(set(item.source_type for item in items))
        mean_conf = sum(item.confidence for item in items) / len(items)
        mean_rel = sum(item.reliability for item in items) / len(items)

        # Corroboration boost factor based on independent source categories
        corrob_factor = min(1.0, 0.70 + (0.06 * num_cats))

        final_conf = min(0.98, mean_conf * corrob_factor)
        final_rel = min(0.98, mean_rel * corrob_factor)
        return round(final_conf, 3), round(final_rel, 3)

    # =========================================================================
    # High-Level Tracing Engine
    # =========================================================================

    def trace_finding(self, finding: Any) -> EvidenceTrace:
        """
        Traces any Finding or InfluencerResult back to underlying source records.
        """
        # Determine attributes whether finding is dataclass or dict
        if hasattr(finding, "finding_id"):
            fid = finding.finding_id
            entities = getattr(finding, "entities", [])
            source_rec_ids = getattr(finding, "source_record_ids", [])
            case_id = getattr(finding, "case_id", None)
            ptype = getattr(finding, "pattern_type", "FINDING")
        elif isinstance(finding, dict):
            fid = finding.get("finding_id", "FINDING_UNKNOWN")
            entities = finding.get("entities", [])
            source_rec_ids = finding.get("source_record_ids", [])
            case_id = finding.get("case_id")
            ptype = finding.get("pattern_type", "FINDING")
        else:
            fid = str(finding)
            entities = []
            source_rec_ids = []
            case_id = None
            ptype = "OBJECT"

        evidence_items: List[EvidenceItem] = []
        seen_rec_ids: Set[str] = set()

        # 1. Direct source record lookup
        for rec_id in source_rec_ids:
            item = self.get_evidence_by_record_id(rec_id)
            if item and item.source_record_id not in seen_rec_ids:
                evidence_items.append(item)
                seen_rec_ids.add(item.source_record_id)

        # 2. Pairwise relationships among involved entities if evidence items < 5
        if len(evidence_items) < 5 and len(entities) >= 2:
            for i in range(len(entities)):
                for j in range(i + 1, len(entities)):
                    pair_items = self.get_evidence_for_pair(entities[i], entities[j])
                    for item in pair_items:
                        if item.source_record_id not in seen_rec_ids:
                            evidence_items.append(item)
                            seen_rec_ids.add(item.source_record_id)
                            if len(evidence_items) >= 25:
                                break

        # Calculate metrics
        cat_count, cats, div_score = self.calculate_evidence_diversity(evidence_items)
        agg_conf, agg_rel = self.calculate_aggregate_confidence(evidence_items)

        narrative = (
            f"Trace for [{ptype}] {fid} verified by {len(evidence_items)} source records across "
            f"{cat_count} independent categories ({', '.join(cats)}). "
            f"Aggregate confidence: {agg_conf:.2f}."
        )

        return EvidenceTrace(
            target_id=fid,
            target_type=ptype,
            evidence_items=evidence_items,
            source_categories=cats,
            source_count=len(evidence_items),
            diversity_score=div_score,
            aggregate_confidence=agg_conf,
            aggregate_reliability=agg_rel,
            narrative=narrative
        )

    def explain_hop(self, u: str, v: str) -> Dict[str, Any]:
        """
        Extracts verified evidence items and explanations for a single hop between two nodes.
        Supports both Person -> Person (calls, transactions, relationships) and Person -> Case (FIR, events).
        """
        pair_items = self.get_evidence_for_pair(u, v)
        cat_count, cats, div_score = self.calculate_evidence_diversity(pair_items)

        hop_type = "INTER_ACTOR_COORDINATION"
        if str(v).startswith("CASE_"):
            hop_type = "CRIME_CASE_PARTICIPATION"

        # Group by source type
        records_by_type: Dict[str, List[str]] = {}
        for it in pair_items:
            records_by_type.setdefault(it.source_type, []).append(it.source_record_id)

        desc = f"Hop {u} -> {v} confirmed by {len(pair_items)} records across categories: {', '.join(cats) or 'GRAPH_LINK'}."
        return {
            "source": u,
            "target": v,
            "hop_type": hop_type,
            "evidence_count": len(pair_items),
            "source_categories": cats,
            "diversity_score": div_score,
            "records_by_type": records_by_type,
            "evidence_items": [it.to_dict() for it in pair_items[:10]],
            "explanation": desc
        }

    def trace_chain(self, path: List[str]) -> EvidenceTrace:
        """
        Generates hop-by-hop explanation and source traceability for any multi-hop operational chain.
        Works dynamically for any path without hardcoding.
        """
        if not path or len(path) < 2:
            return EvidenceTrace(
                target_id="EMPTY_CHAIN",
                target_type="CHAIN",
                narrative="No path provided for chain tracing."
            )

        chain_str = " -> ".join(path)
        all_items: List[EvidenceItem] = []
        hop_traces: List[Dict[str, Any]] = []
        seen_ids: Set[str] = set()

        for i in range(len(path) - 1):
            u = path[i]
            v = path[i + 1]
            hop_info = self.explain_hop(u, v)
            hop_traces.append(hop_info)

            # Collect raw items
            pair_items = self.get_evidence_for_pair(u, v)
            for it in pair_items:
                if it.source_record_id not in seen_ids:
                    all_items.append(it)
                    seen_ids.add(it.source_record_id)

        cat_count, cats, div_score = self.calculate_evidence_diversity(all_items)
        agg_conf, agg_rel = self.calculate_aggregate_confidence(all_items)

        narrative = (
            f"Multi-hop operational chain of {len(path)-1} hops ({chain_str}) traced back to "
            f"{len(all_items)} concrete source records across {cat_count} independent categories ({', '.join(cats)}). "
            f"Corroborated with aggregate confidence {agg_conf:.2f}."
        )

        return EvidenceTrace(
            target_id=chain_str,
            target_type="CHAIN",
            evidence_items=all_items,
            source_categories=cats,
            source_count=len(all_items),
            diversity_score=div_score,
            aggregate_confidence=agg_conf,
            aggregate_reliability=agg_rel,
            hop_traces=hop_traces,
            narrative=narrative
        )
