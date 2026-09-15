"""
SIH26189 — AI-Powered Criminal Network Analysis System
Module: src/graph_builder.py

Phase 3: Graph Construction
Builds a unified, multi-layer, typed directed graph (NetworkX MultiDiGraph)
representing the entire criminal intelligence ecosystem.

Entity Types (12):
- PERSON, ORGANIZATION, PHONE, DEVICE, BANK_ACCOUNT, VEHICLE,
  LOCATION, CELL_TOWER, CASE, FIR, EVENT, EVIDENCE

Features:
- Full multi-source relationship ingestion and edge derivation.
- Strict source traceability for every edge:
  (source_type, source_record_id, confidence, timestamp, weight).
- Flagship directed path verification:
  PERSON_1476 -> PERSON_0026 -> PERSON_0397 -> PERSON_0405 -> PERSON_1459 -> CASE_0001.
- Complete isolation check ensuring PERSON_1476 has zero direct CASE_0001 associations.
- Zero broken references (all edge endpoints are validated nodes in the graph).
- Comprehensive graph statistics reporting.
"""

from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Dict, List, Optional, Tuple, Any, Set, Union
import networkx as nx
import pandas as pd

from src.data_loader import RawDataset
from src.utils.logger import get_logger

logger = get_logger("GraphBuilder")


class EntityType(str, Enum):
    """Supported node entity types in the unified criminal network graph."""
    PERSON = "PERSON"
    ORGANIZATION = "ORGANIZATION"
    PHONE = "PHONE"
    DEVICE = "DEVICE"
    BANK_ACCOUNT = "BANK_ACCOUNT"
    VEHICLE = "VEHICLE"
    LOCATION = "LOCATION"
    CELL_TOWER = "CELL_TOWER"
    CASE = "CASE"
    FIR = "FIR"
    EVENT = "EVENT"
    EVIDENCE = "EVIDENCE"


class EdgeType(str, Enum):
    """Standardized relationship types across the multi-layer network."""
    # Operational and inter-personal edges
    CALLED = "CALLED"
    TRANSFERRED_MONEY = "TRANSFERRED_MONEY"
    OWNED = "OWNED"
    USED = "USED"
    MEMBER_OF = "MEMBER_OF"
    APPEARED_IN_CASE = "APPEARED_IN_CASE"
    ASSOCIATED_WITH = "ASSOCIATED_WITH"
    CO_LOCATED = "CO_LOCATED"
    TRAVELLED_WITH = "TRAVELLED_WITH"
    POTENTIAL_OPERATIONAL_LINK = "POTENTIAL_OPERATIONAL_LINK"
    CONNECTED_TO = "CONNECTED_TO"
    COMMUNICATED_WITH = "COMMUNICATED_WITH"

    # Derived infrastructure & ownership edges
    OWNS_PHONE = "OWNS_PHONE"
    USED_ON_DEVICE = "USED_ON_DEVICE"
    OWNS_ACCOUNT = "OWNS_ACCOUNT"
    LOCATED_AT_BRANCH = "LOCATED_AT_BRANCH"
    OWNS_VEHICLE = "OWNS_VEHICLE"
    RESIDES_AT = "RESIDES_AT"
    LOCATED_AT = "LOCATED_AT"

    # Case, legal & evidence edges
    FILED_FOR_CASE = "FILED_FOR_CASE"
    ACCUSED_IN = "ACCUSED_IN"
    COMPLAINANT_IN = "COMPLAINANT_IN"
    WITNESS_IN = "WITNESS_IN"
    OCCURRED_AT = "OCCURRED_AT"
    HAS_EVIDENCE = "HAS_EVIDENCE"
    EVIDENCE_OF = "EVIDENCE_OF"
    INVOLVES_ENTITY = "INVOLVES_ENTITY"

    # Telecom & financial transaction edges
    CALLED_PHONE = "CALLED_PHONE"
    TRANSFERRED_FUNDS_TO = "TRANSFERRED_FUNDS_TO"

    # Spatiotemporal event edges
    RECORDED_IN_EVENT = "RECORDED_IN_EVENT"
    INVOLVED_IN_EVENT = "INVOLVED_IN_EVENT"
    AT_TOWER = "AT_TOWER"
    AT_LOCATION = "AT_LOCATION"


@dataclass
class GraphStatistics:
    """Summary metrics of the constructed network graph."""
    total_nodes: int
    nodes_by_type: Dict[str, int]
    total_edges: int
    edges_by_type: Dict[str, int]
    weakly_connected_components: int
    strongly_connected_components: int
    flagship_shortest_path: Optional[List[str]] = None
    isolated_coordinator_direct_case_edges: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class GraphBuilder:
    """
    Constructs an in-memory NetworkX MultiDiGraph from raw relational tables.
    """

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

    def __init__(self):
        pass

    def build_graph(
        self,
        dataset: RawDataset,
        include_events: bool = True,
        include_cdr_calls: bool = True,
        include_transactions: bool = True,
        max_cdr_edges: Optional[int] = None,
        max_transaction_edges: Optional[int] = None
    ) -> nx.MultiDiGraph:
        """
        Builds the unified multi-layer criminal network graph from RawDataset.
        """
        logger.info("Initializing NetworkX MultiDiGraph construction...")
        G = nx.MultiDiGraph()

        # 1. Add all 12 entity types
        self._add_nodes(G, dataset, include_events=include_events)

        # 2. Add raw relationships
        self._add_raw_relationships(G, dataset)

        # 3. Add derived ownership and organizational links
        self._add_ownership_and_civil_links(G, dataset)

        # 4. Add Case, FIR, and Evidence relationships
        self._add_legal_and_evidence_links(G, dataset)

        # 5. Add Telecom CDR phone calls
        if include_cdr_calls:
            self._add_cdr_phone_calls(G, dataset, max_edges=max_cdr_edges)

        # 6. Add Financial Fund Transfers
        if include_transactions:
            self._add_financial_transactions(G, dataset, max_edges=max_transaction_edges)

        # 7. Add Spatiotemporal Event Links
        if include_events:
            self._add_event_links(G, dataset)

        logger.info(
            f"Graph construction complete: {G.number_of_nodes()} nodes, "
            f"{G.number_of_edges()} edges."
        )
        return G

    def _add_nodes(self, G: nx.MultiDiGraph, dataset: RawDataset, include_events: bool = True) -> None:
        """Adds all entity nodes with attributes to the graph."""
        logger.info("Adding entity nodes to graph...")

        # 1. PERSON
        for _, r in dataset.persons.iterrows():
            G.add_node(
                r["person_id"],
                entity_type=EntityType.PERSON.value,
                id=r["person_id"],
                name=r["name"],
                name_variant=r.get("name_variant", ""),
                age=int(r["age"]) if pd.notna(r.get("age")) else None,
                gender=str(r.get("gender", "")),
                city=str(r.get("city", "")),
                occupation=str(r.get("occupation", "")),
                risk_indicator=str(r.get("risk_indicator", "none")),
                address_id=str(r.get("address_id", "")),
                primary_phone_id=str(r.get("primary_phone_id", ""))
            )

        # 2. ORGANIZATION
        for _, r in dataset.organizations.iterrows():
            G.add_node(
                r["organization_id"],
                entity_type=EntityType.ORGANIZATION.value,
                id=r["organization_id"],
                name=r["organization_name"],
                org_type=r.get("organization_type", ""),
                city=str(r.get("city", "")),
                known_activity=str(r.get("known_activity", ""))
            )

        # 3. PHONE
        for _, r in dataset.phones.iterrows():
            G.add_node(
                r["phone_id"],
                entity_type=EntityType.PHONE.value,
                id=r["phone_id"],
                device_id=str(r.get("device_id", "")),
                person_id=str(r.get("person_id", "")),
                activation_date=str(r.get("activation_date", ""))
            )

        # 4. DEVICE
        for _, r in dataset.devices.iterrows():
            G.add_node(
                r["device_id"],
                entity_type=EntityType.DEVICE.value,
                id=r["device_id"],
                device_type=str(r.get("device_type", "")),
                first_seen=str(r.get("first_seen", ""))
            )

        # 5. BANK_ACCOUNT
        for _, r in dataset.bank_accounts.iterrows():
            G.add_node(
                r["account_id"],
                entity_type=EntityType.BANK_ACCOUNT.value,
                id=r["account_id"],
                person_id=str(r.get("person_id", "")),
                account_type=str(r.get("account_type", "")),
                bank_alias=str(r.get("bank_alias", "")),
                opening_date=str(r.get("opening_date", "")),
                branch_location_id=str(r.get("branch_location_id", ""))
            )

        # 6. VEHICLE
        for _, r in dataset.vehicles.iterrows():
            G.add_node(
                r["vehicle_id"],
                entity_type=EntityType.VEHICLE.value,
                id=r["vehicle_id"],
                owner_person_id=str(r.get("owner_person_id", "")),
                vehicle_type=str(r.get("vehicle_type", "")),
                model=str(r.get("model", "")),
                registration_alias=str(r.get("registration_alias", ""))
            )

        # 7. LOCATION
        for _, r in dataset.locations.iterrows():
            G.add_node(
                r["location_id"],
                entity_type=EntityType.LOCATION.value,
                id=r["location_id"],
                city=str(r.get("city", "")),
                area_alias=str(r.get("area_alias", "")),
                latitude=float(r["latitude"]) if pd.notna(r.get("latitude")) else None,
                longitude=float(r["longitude"]) if pd.notna(r.get("longitude")) else None,
                location_type=str(r.get("location_type", ""))
            )

        # 8. CELL_TOWER
        for _, r in dataset.cell_towers.iterrows():
            G.add_node(
                r["tower_id"],
                entity_type=EntityType.CELL_TOWER.value,
                id=r["tower_id"],
                location_id=str(r.get("location_id", "")),
                city=str(r.get("city", "")),
                latitude=float(r["latitude"]) if pd.notna(r.get("latitude")) else None,
                longitude=float(r["longitude"]) if pd.notna(r.get("longitude")) else None,
                coverage_radius=float(r["coverage_radius"]) if pd.notna(r.get("coverage_radius")) else None
            )

        # 9. CASE
        for _, r in dataset.cases.iterrows():
            G.add_node(
                r["case_id"],
                entity_type=EntityType.CASE.value,
                id=r["case_id"],
                fir_id=str(r.get("fir_id", "")),
                crime_type=str(r.get("crime_type", "")),
                city=str(r.get("city", "")),
                status=str(r.get("status", "")),
                opened_date=str(r.get("opened_date", ""))
            )

        # 10. FIR
        for _, r in dataset.fir_records.iterrows():
            G.add_node(
                r["fir_id"],
                entity_type=EntityType.FIR.value,
                id=r["fir_id"],
                case_id=str(r.get("case_id", "")),
                crime_type=str(r.get("crime_type", "")),
                date=str(r.get("date", "")),
                location_id=str(r.get("location_id", "")),
                narrative=str(r.get("narrative", ""))
            )

        # 11. EVIDENCE
        for _, r in dataset.evidence.iterrows():
            G.add_node(
                r["evidence_id"],
                entity_type=EntityType.EVIDENCE.value,
                id=r["evidence_id"],
                case_id=str(r.get("case_id", "")),
                evidence_type=str(r.get("evidence_type", "")),
                description=str(r.get("description", "")),
                reliability=float(r["reliability"]) if pd.notna(r.get("reliability")) else 1.0,
                confidence=float(r["confidence"]) if pd.notna(r.get("confidence")) else 1.0
            )

        # 12. EVENT (Location events and Vehicle events)
        if include_events:
            for _, r in dataset.location_events.iterrows():
                G.add_node(
                    r["location_event_id"],
                    entity_type=EntityType.EVENT.value,
                    id=r["location_event_id"],
                    event_category="LOCATION_PING",
                    timestamp=str(r.get("timestamp", "")),
                    source=str(r.get("source", ""))
                )

            for _, r in dataset.vehicle_events.iterrows():
                G.add_node(
                    r["event_id"],
                    entity_type=EntityType.EVENT.value,
                    id=r["event_id"],
                    event_category=str(r.get("event_type", "VEHICLE_EVENT")),
                    timestamp=str(r.get("timestamp", "")),
                    source=str(r.get("source", ""))
                )

    def _add_raw_relationships(self, G: nx.MultiDiGraph, dataset: RawDataset) -> None:
        """Ingests raw relationships table."""
        logger.info("Adding raw relationships to graph...")
        added_count = 0
        for _, r in dataset.relationships.iterrows():
            u = str(r["source_entity_id"])
            v = str(r["target_entity_id"])
            if u in G and v in G:
                G.add_edge(
                    u,
                    v,
                    key=f"REL_{r['relationship_id']}",
                    edge_type=str(r["relationship_type"]),
                    source_type="RAW_RELATIONSHIP",
                    source_record_id=str(r["relationship_id"]),
                    confidence=float(r["confidence"]) if pd.notna(r.get("confidence")) else 1.0,
                    timestamp=str(r.get("last_seen", r.get("first_seen", ""))),
                    weight=float(r.get("frequency", 1.0))
                )
                added_count += 1
        logger.debug(f"Added {added_count} raw relationships.")

    def _add_ownership_and_civil_links(self, G: nx.MultiDiGraph, dataset: RawDataset) -> None:
        """Derives ownership, device usage, civil registry, and infrastructure edges."""
        logger.info("Adding ownership and civil infrastructure edges...")

        # 1. Phone Ownership (Person -> Phone)
        for _, r in dataset.phones.iterrows():
            p_id = str(r["person_id"])
            ph_id = str(r["phone_id"])
            if p_id in G and ph_id in G:
                G.add_edge(
                    p_id,
                    ph_id,
                    key=f"OWN_PHONE_{ph_id}",
                    edge_type=EdgeType.OWNS_PHONE.value,
                    source_type="TELCO_SUBSCRIBER_RECORD",
                    source_record_id=ph_id,
                    confidence=float(r["ownership_confidence"]) if pd.notna(r.get("ownership_confidence")) else 1.0,
                    timestamp=str(r.get("activation_date", ""))
                )

            # Device usage (Phone -> Device)
            dev_id = str(r.get("device_id", ""))
            if ph_id in G and dev_id in G:
                G.add_edge(
                    ph_id,
                    dev_id,
                    key=f"USE_DEV_{ph_id}_{dev_id}",
                    edge_type=EdgeType.USED_ON_DEVICE.value,
                    source_type="TELCO_SUBSCRIBER_RECORD",
                    source_record_id=ph_id,
                    confidence=1.0,
                    timestamp=str(r.get("activation_date", ""))
                )

        # 2. Bank Account Ownership (Person -> Account)
        for _, r in dataset.bank_accounts.iterrows():
            p_id = str(r["person_id"])
            acc_id = str(r["account_id"])
            if p_id in G and acc_id in G:
                G.add_edge(
                    p_id,
                    acc_id,
                    key=f"OWN_ACC_{acc_id}",
                    edge_type=EdgeType.OWNS_ACCOUNT.value,
                    source_type="BANK_RECORD",
                    source_record_id=acc_id,
                    confidence=float(r["ownership_confidence"]) if pd.notna(r.get("ownership_confidence")) else 1.0,
                    timestamp=str(r.get("opening_date", ""))
                )

            # Account branch location (Account -> Location)
            loc_id = str(r.get("branch_location_id", ""))
            if acc_id in G and loc_id in G:
                G.add_edge(
                    acc_id,
                    loc_id,
                    key=f"ACC_BRANCH_{acc_id}_{loc_id}",
                    edge_type=EdgeType.LOCATED_AT_BRANCH.value,
                    source_type="BANK_RECORD",
                    source_record_id=acc_id,
                    confidence=1.0,
                    timestamp=str(r.get("opening_date", ""))
                )

        # 3. Vehicle Ownership (Person -> Vehicle)
        for _, r in dataset.vehicles.iterrows():
            p_id = str(r["owner_person_id"])
            v_id = str(r["vehicle_id"])
            if p_id in G and v_id in G:
                G.add_edge(
                    p_id,
                    v_id,
                    key=f"OWN_VEH_{v_id}",
                    edge_type=EdgeType.OWNS_VEHICLE.value,
                    source_type="VEHICLE_REGISTRATION",
                    source_record_id=v_id,
                    confidence=float(r["confidence"]) if pd.notna(r.get("confidence")) else 1.0,
                    timestamp=str(r.get("ownership_start", ""))
                )

        # 4. Residence (Person -> Location)
        for _, r in dataset.persons.iterrows():
            p_id = str(r["person_id"])
            addr_id = str(r.get("address_id", ""))
            if p_id in G and addr_id in G:
                G.add_edge(
                    p_id,
                    addr_id,
                    key=f"RESIDE_{p_id}_{addr_id}",
                    edge_type=EdgeType.RESIDES_AT.value,
                    source_type="CIVIL_REGISTRY",
                    source_record_id=p_id,
                    confidence=1.0,
                    timestamp=""
                )

        # 5. Cell Tower Location (Tower -> Location)
        for _, r in dataset.cell_towers.iterrows():
            t_id = str(r["tower_id"])
            loc_id = str(r.get("location_id", ""))
            if t_id in G and loc_id in G:
                G.add_edge(
                    t_id,
                    loc_id,
                    key=f"TOWER_LOC_{t_id}_{loc_id}",
                    edge_type=EdgeType.LOCATED_AT.value,
                    source_type="TELECOM_INFRASTRUCTURE",
                    source_record_id=t_id,
                    confidence=1.0,
                    timestamp=""
                )

    def _add_legal_and_evidence_links(self, G: nx.MultiDiGraph, dataset: RawDataset) -> None:
        """Derives FIR, Case, and Evidence relationships."""
        logger.info("Adding FIR, Case, and Evidence edges...")

        # 1. FIR Associations
        for _, r in dataset.fir_records.iterrows():
            fir_id = str(r["fir_id"])
            case_id = str(r.get("case_id", ""))
            accused_id = str(r.get("accused_id", ""))
            complainant_id = str(r.get("complainant_id", ""))
            witness_id = str(r.get("witness_id", ""))
            loc_id = str(r.get("location_id", ""))
            date = str(r.get("date", ""))
            conf = float(r["confidence"]) if pd.notna(r.get("confidence")) else 1.0

            # FIR -> Case
            if fir_id in G and case_id in G:
                G.add_edge(
                    fir_id,
                    case_id,
                    key=f"FIR_FOR_CASE_{fir_id}_{case_id}",
                    edge_type=EdgeType.FILED_FOR_CASE.value,
                    source_type="FIR_RECORD",
                    source_record_id=fir_id,
                    confidence=conf,
                    timestamp=date
                )

            # Accused -> FIR
            if accused_id in G and fir_id in G:
                G.add_edge(
                    accused_id,
                    fir_id,
                    key=f"ACCUSED_IN_{accused_id}_{fir_id}",
                    edge_type=EdgeType.ACCUSED_IN.value,
                    source_type="FIR_RECORD",
                    source_record_id=fir_id,
                    confidence=conf,
                    timestamp=date
                )

            # Complainant -> FIR
            if complainant_id in G and fir_id in G:
                G.add_edge(
                    complainant_id,
                    fir_id,
                    key=f"COMPLAINANT_IN_{complainant_id}_{fir_id}",
                    edge_type=EdgeType.COMPLAINANT_IN.value,
                    source_type="FIR_RECORD",
                    source_record_id=fir_id,
                    confidence=conf,
                    timestamp=date
                )

            # Witness -> FIR
            if witness_id in G and fir_id in G:
                G.add_edge(
                    witness_id,
                    fir_id,
                    key=f"WITNESS_IN_{witness_id}_{fir_id}",
                    edge_type=EdgeType.WITNESS_IN.value,
                    source_type="FIR_RECORD",
                    source_record_id=fir_id,
                    confidence=conf,
                    timestamp=date
                )

            # FIR -> Location
            if fir_id in G and loc_id in G:
                G.add_edge(
                    fir_id,
                    loc_id,
                    key=f"FIR_AT_{fir_id}_{loc_id}",
                    edge_type=EdgeType.OCCURRED_AT.value,
                    source_type="FIR_RECORD",
                    source_record_id=fir_id,
                    confidence=conf,
                    timestamp=date
                )

        # 2. Evidence Links
        for _, r in dataset.evidence.iterrows():
            ev_id = str(r["evidence_id"])
            case_id = str(r.get("case_id", ""))
            ent_id = str(r.get("entity_id", ""))
            rel_ent_id = str(r.get("related_entity_id", ""))
            conf = float(r["confidence"]) if pd.notna(r.get("confidence")) else 1.0
            ts = str(r.get("timestamp", ""))

            # Case -> Evidence
            if case_id in G and ev_id in G:
                G.add_edge(
                    case_id,
                    ev_id,
                    key=f"HAS_EVID_{case_id}_{ev_id}",
                    edge_type=EdgeType.HAS_EVIDENCE.value,
                    source_type="EVIDENCE_RECORD",
                    source_record_id=ev_id,
                    confidence=conf,
                    timestamp=ts
                )

            # Evidence -> Entity
            if ev_id in G and ent_id in G:
                G.add_edge(
                    ev_id,
                    ent_id,
                    key=f"EVID_OF_{ev_id}_{ent_id}",
                    edge_type=EdgeType.EVIDENCE_OF.value,
                    source_type="EVIDENCE_RECORD",
                    source_record_id=ev_id,
                    confidence=conf,
                    timestamp=ts
                )

            # Evidence -> Related Entity
            if ev_id in G and rel_ent_id in G:
                G.add_edge(
                    ev_id,
                    rel_ent_id,
                    key=f"EVID_INVOLVES_{ev_id}_{rel_ent_id}",
                    edge_type=EdgeType.INVOLVES_ENTITY.value,
                    source_type="EVIDENCE_RECORD",
                    source_record_id=ev_id,
                    confidence=conf,
                    timestamp=ts
                )

    def _add_cdr_phone_calls(
        self,
        G: nx.MultiDiGraph,
        dataset: RawDataset,
        max_edges: Optional[int] = None
    ) -> None:
        """Derives direct telecommunication edges between phones."""
        logger.info("Adding CDR telecommunication call edges...")
        df_cdr = dataset.cdr_records if max_edges is None else dataset.cdr_records.head(max_edges)
        added = 0
        for _, r in df_cdr.iterrows():
            u = str(r["caller_phone_id"])
            v = str(r["receiver_phone_id"])
            if u in G and v in G:
                call_id = str(r["call_id"])
                G.add_edge(
                    u,
                    v,
                    key=f"CDR_{call_id}",
                    edge_type=EdgeType.CALLED_PHONE.value,
                    source_type="CDR_RECORD",
                    source_record_id=call_id,
                    confidence=float(r["confidence"]) if pd.notna(r.get("confidence")) else 1.0,
                    timestamp=str(r.get("timestamp", "")),
                    duration_seconds=int(r.get("duration_seconds", 0)),
                    call_type=str(r.get("call_type", "voice"))
                )
                added += 1
        logger.debug(f"Added {added} CDR call edges.")

    def _add_financial_transactions(
        self,
        G: nx.MultiDiGraph,
        dataset: RawDataset,
        max_edges: Optional[int] = None
    ) -> None:
        """Derives financial fund transfer edges between bank accounts."""
        logger.info("Adding financial transaction edges...")
        df_tx = dataset.financial_transactions if max_edges is None else dataset.financial_transactions.head(max_edges)
        added = 0
        for _, r in df_tx.iterrows():
            u = str(r["sender_account_id"])
            v = str(r["receiver_account_id"])
            if u in G and v in G:
                txn_id = str(r["transaction_id"])
                G.add_edge(
                    u,
                    v,
                    key=f"TXN_{txn_id}",
                    edge_type=EdgeType.TRANSFERRED_FUNDS_TO.value,
                    source_type="FINANCIAL_TRANSACTION",
                    source_record_id=txn_id,
                    confidence=float(r["confidence"]) if pd.notna(r.get("confidence")) else 1.0,
                    timestamp=str(r.get("timestamp", "")),
                    amount=float(r.get("amount", 0.0)),
                    channel=str(r.get("channel", "UPI"))
                )
                added += 1
        logger.debug(f"Added {added} financial transaction edges.")

    def _add_event_links(self, G: nx.MultiDiGraph, dataset: RawDataset) -> None:
        """Adds location ping and vehicle sighting event edges."""
        logger.info("Adding event links...")

        # Location Events
        for _, r in dataset.location_events.iterrows():
            ev_id = str(r["location_event_id"])
            ent_id = str(r.get("entity_id", ""))
            tower_id = str(r.get("tower_id", ""))
            loc_id = str(r.get("location_id", ""))
            ts = str(r.get("timestamp", ""))
            conf = float(r["confidence"]) if pd.notna(r.get("confidence")) else 1.0

            if ent_id in G and ev_id in G:
                G.add_edge(
                    ent_id,
                    ev_id,
                    key=f"EV_REC_{ent_id}_{ev_id}",
                    edge_type=EdgeType.RECORDED_IN_EVENT.value,
                    source_type="LOCATION_EVENT",
                    source_record_id=ev_id,
                    confidence=conf,
                    timestamp=ts
                )

            if ev_id in G and tower_id in G:
                G.add_edge(
                    ev_id,
                    tower_id,
                    key=f"EV_TOWER_{ev_id}_{tower_id}",
                    edge_type=EdgeType.AT_TOWER.value,
                    source_type="LOCATION_EVENT",
                    source_record_id=ev_id,
                    confidence=conf,
                    timestamp=ts
                )

            if ev_id in G and loc_id in G:
                G.add_edge(
                    ev_id,
                    loc_id,
                    key=f"EV_LOC_{ev_id}_{loc_id}",
                    edge_type=EdgeType.AT_LOCATION.value,
                    source_type="LOCATION_EVENT",
                    source_record_id=ev_id,
                    confidence=conf,
                    timestamp=ts
                )

        # Vehicle Events
        for _, r in dataset.vehicle_events.iterrows():
            ev_id = str(r["event_id"])
            v_id = str(r.get("vehicle_id", ""))
            loc_id = str(r.get("location_id", ""))
            ts = str(r.get("timestamp", ""))
            conf = float(r["confidence"]) if pd.notna(r.get("confidence")) else 1.0

            if v_id in G and ev_id in G:
                G.add_edge(
                    v_id,
                    ev_id,
                    key=f"VEH_EV_{v_id}_{ev_id}",
                    edge_type=EdgeType.INVOLVED_IN_EVENT.value,
                    source_type="VEHICLE_EVENT",
                    source_record_id=ev_id,
                    confidence=conf,
                    timestamp=ts
                )

            if ev_id in G and loc_id in G:
                G.add_edge(
                    ev_id,
                    loc_id,
                    key=f"VEH_EV_LOC_{ev_id}_{loc_id}",
                    edge_type=EdgeType.AT_LOCATION.value,
                    source_type="VEHICLE_EVENT",
                    source_record_id=ev_id,
                    confidence=conf,
                    timestamp=ts
                )


class GraphValidator:
    """
    Validates graph integrity, reference soundness, source traceability,
    and flagship network invariants.
    """

    @classmethod
    def validate(
        cls,
        G: nx.MultiDiGraph,
        expected_entity_types: Optional[Set[str]] = None
    ) -> Dict[str, Any]:
        """Runs comprehensive validation suite on the network graph."""
        logger.info("Executing comprehensive graph validation suite...")
        report: Dict[str, Any] = {
            "status": "PASS",
            "errors": [],
            "warnings": [],
            "entity_types_found": {},
            "relationship_types_found": {},
            "broken_references_count": 0,
            "missing_traceability_count": 0,
            "flagship_directed_path": None,
            "flagship_path_valid": False,
            "coordinator_isolation_valid": False
        }

        # 1. Entity type verification
        for n, data in G.nodes(data=True):
            etype = data.get("entity_type", "UNKNOWN")
            report["entity_types_found"][etype] = report["entity_types_found"].get(etype, 0) + 1

        required_etypes = expected_entity_types if expected_entity_types is not None else {e.value for e in EntityType}
        missing_etypes = required_etypes - set(report["entity_types_found"].keys())
        if missing_etypes:
            err = f"Missing required entity types in graph: {missing_etypes}"
            report["errors"].append(err)
            report["status"] = "FAIL"

        # 2. Edge validation & Reference soundness
        for u, v, k, data in G.edges(keys=True, data=True):
            rel_type = data.get("edge_type", "UNKNOWN")
            report["relationship_types_found"][rel_type] = report["relationship_types_found"].get(rel_type, 0) + 1

            # Broken references
            if u not in G or v not in G:
                report["broken_references_count"] += 1
                report["errors"].append(f"Broken edge reference: {u} -> {v}")
                report["status"] = "FAIL"

            # Source traceability
            if not data.get("source_type") or not data.get("source_record_id"):
                report["missing_traceability_count"] += 1
                report["errors"].append(f"Edge {u} -> {v} (key={k}) missing source traceability")
                report["status"] = "FAIL"

        # 3. Flagship Directed Shortest Path Check
        PERSON_A = GraphBuilder.FLAGSHIP_COORDINATOR
        CASE_OBJ = GraphBuilder.FLAGSHIP_CASE
        expected_path = GraphBuilder.FLAGSHIP_EXPECTED_PATH

        if nx.has_path(G, PERSON_A, CASE_OBJ):
            actual_path = nx.shortest_path(G, source=PERSON_A, target=CASE_OBJ)
            report["flagship_directed_path"] = actual_path
            if actual_path == expected_path:
                report["flagship_path_valid"] = True
                logger.info(f"Flagship directed path verified: {' -> '.join(actual_path)}")
            else:
                err = f"Shortest path {actual_path} does not match expected {expected_path}"
                report["errors"].append(err)
                report["status"] = "FAIL"
        else:
            err = f"No directed path found from {PERSON_A} to {CASE_OBJ}"
            report["errors"].append(err)
            report["status"] = "FAIL"

        # 4. Upstream Coordinator Isolation Check
        # PERSON_A must have ZERO direct edges to CASE_0001
        has_direct_edge = G.has_edge(PERSON_A, CASE_OBJ)
        if has_direct_edge:
            err = f"CRITICAL: Coordinator {PERSON_A} has a direct edge to {CASE_OBJ}!"
            report["errors"].append(err)
            report["status"] = "FAIL"
            report["coordinator_isolation_valid"] = False
        else:
            report["coordinator_isolation_valid"] = True
            logger.info(f"Coordinator isolation verified: {PERSON_A} has 0 direct edges to {CASE_OBJ}.")

        return report


class GraphStatisticsReporter:
    """Calculates graph metrics and generates structural reports."""

    @classmethod
    def generate_statistics(cls, G: nx.MultiDiGraph) -> GraphStatistics:
        """Calculates graph metrics."""
        nodes_by_type: Dict[str, int] = {}
        for _, data in G.nodes(data=True):
            etype = data.get("entity_type", "UNKNOWN")
            nodes_by_type[etype] = nodes_by_type.get(etype, 0) + 1

        edges_by_type: Dict[str, int] = {}
        for _, _, data in G.edges(data=True):
            etype = data.get("edge_type", "UNKNOWN")
            edges_by_type[etype] = edges_by_type.get(etype, 0) + 1

        wcc = nx.number_weakly_connected_components(G)
        scc = nx.number_strongly_connected_components(G)

        p_a = GraphBuilder.FLAGSHIP_COORDINATOR
        c_obj = GraphBuilder.FLAGSHIP_CASE
        path = nx.shortest_path(G, p_a, c_obj) if nx.has_path(G, p_a, c_obj) else None

        direct_edges = 1 if G.has_edge(p_a, c_obj) else 0

        return GraphStatistics(
            total_nodes=G.number_of_nodes(),
            nodes_by_type=nodes_by_type,
            total_edges=G.number_of_edges(),
            edges_by_type=edges_by_type,
            weakly_connected_components=wcc,
            strongly_connected_components=scc,
            flagship_shortest_path=path,
            isolated_coordinator_direct_case_edges=direct_edges
        )
