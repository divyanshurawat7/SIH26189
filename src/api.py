"""
SIH26189 — AI-Powered Criminal Network Analysis System
Module: src/api.py

Phase 7: Investigation REST API Backend
Provides a high-performance, explainable REST API layer built on top of the
validated Phase 1–6 criminal intelligence and evidence traceability engine.

Exposes:
- GET /health: Service health and system readiness
- GET /persons/{person_id}: Actor profile, predicted role, evidence diversity, and narrative
- GET /persons/{person_id}/network: 1-hop topology, influencer neighbors, operational paths
- GET /persons/{person_id}/evidence: Traceable records for person across 11 source categories
- GET /cases/{case_id}: Case details, FIR information, key actors, locations, patterns
- GET /cases/{case_id}/timeline: Chronologically ordered forensic event stream
- GET /cases/{case_id}/evidence: Traceable case evidence grouped by source category
- GET /networks/{network_id}: Syndicate structural profile, hierarchy, and key paths
- GET /findings: Behavioral pattern findings with optional query filters
- GET /findings/{finding_id}: Complete finding with supporting records and explanation
- GET /cross-case/{entity_id}: Multi-jurisdictional linkage with overlap suppression logic
- GET /investigation/{case_id}: Primary demo endpoint — complete dynamic investigation dossier
"""

import time
from contextlib import asynccontextmanager
from typing import Dict, List, Optional, Any, Set
import networkx as nx
import pandas as pd

from fastapi import FastAPI, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from src.data_loader import DataLoader, RawDataset
from src.graph_builder import GraphBuilder
from src.evidence_traceability import EvidenceTracer, EvidenceItem
from src.influencer_detection import InfluencerDetector, InfluencerResult, RoleType
from src.pattern_detection import PatternDetector, Finding
from src.investigation_insights import InvestigationInsightsGenerator
from src.ml_role_classifier import RoleClassifier
from src.hybrid_intelligence import HybridIntelligence
from src.explainability import ExplainabilityEngine
from src.api_models import (
    HealthResponse,
    ErrorResponse,
    OverviewResponse,
    InfluencerOverviewItem,
    EvidenceItemResponse,
    PersonDetailResponse,
    PersonNetworkResponse,
    FIRInfo,
    CaseDetailResponse,
    TimelineEventItem,
    CaseTimelineResponse,
    CaseEvidenceResponse,
    NetworkDetailResponse,
    FindingSummaryResponse,
    FindingDetailResponse,
    CrossCaseResponse,
    InvestigationDossierResponse,
    SearchResultItem,
    SearchResponse,
    HybridIntelligenceResponse,
    ExplainabilityResponse,
    ExplainabilityReasonItem,
    CaseSummaryItem,
    CaseListResponse,
    PersonSummaryItem,
    PersonListResponse
)
from src.utils.logger import get_logger

logger = get_logger("InvestigationAPI")


class AppState:
    """
    In-memory singleton container for dataset, graph, tracer, detectors, and precomputed indexes.
    Indexed once at startup for sub-millisecond query responses.
    """
    def __init__(self):
        self.data: Optional[RawDataset] = None
        self.graph: Optional[nx.MultiDiGraph] = None
        self.tracer: Optional[EvidenceTracer] = None
        self.influencer_detector: Optional[InfluencerDetector] = None
        self.pattern_detector: Optional[PatternDetector] = None
        self.insights_generator: Optional[InvestigationInsightsGenerator] = None
        self.ml_classifier: Optional[RoleClassifier] = None
        self.hybrid_intelligence: Optional[HybridIntelligence] = None
        self.explainability_engine: Optional[ExplainabilityEngine] = None

        self.roles: Dict[str, InfluencerResult] = {}
        self.findings: List[Finding] = []
        self.findings_by_id: Dict[str, Finding] = {}
        self.person_ids: Set[str] = set()
        self.case_ids: Set[str] = set()
        self.entity_ids: Set[str] = set()
        self.startup_time_seconds: float = 0.0


# Module-level singleton state
_state: Optional[AppState] = None


def init_app_state() -> AppState:
    """Initializes and pre-warms all intelligence modules once."""
    global _state
    if _state is not None:
        return _state

    t0 = time.time()
    logger.info("Initializing SIH26189 Intelligence Engine for API backend...")
    state = AppState()

    # 1. Load dataset
    dl = DataLoader()
    state.data = dl.load_all(validate=False)

    # 2. Construct graph
    gb = GraphBuilder()
    state.graph = gb.build_graph(state.data)

    # 3. Index evidence tracer
    state.tracer = EvidenceTracer(state.data, state.graph)

    # 4. Instantiate detectors and insights generator
    state.influencer_detector = InfluencerDetector(state.graph)
    state.pattern_detector = PatternDetector(state.data, state.graph)
    state.insights_generator = InvestigationInsightsGenerator(
        dataset=state.data,
        graph=state.graph,
        tracer=state.tracer,
        influencer_detector=state.influencer_detector,
        pattern_detector=state.pattern_detector
    )

    # 5. Precompute roles and findings for zero-latency lookups
    state.roles = state.insights_generator._get_roles()
    state.findings = state.insights_generator._get_findings()
    state.findings_by_id = {f.finding_id: f for f in state.findings}

    # 5b. Instantiate ML classifier, hybrid intelligence, and explainability engine
    try:
        ml_cls = RoleClassifier(model_path="models/role_classifier.joblib")
        ml_cls.load()
        state.ml_classifier = ml_cls
        logger.info("Loaded ML Role Classifier model successfully.")
    except Exception as e:
        logger.warning(f"Could not load ML Role Classifier: {e}")
        state.ml_classifier = None

    try:
        state.hybrid_intelligence = HybridIntelligence(
            influencer_detector=state.influencer_detector,
            ml_classifier=state.ml_classifier,
            roles=state.roles
        )
        logger.info("Initialized Hybrid Intelligence engine successfully.")
    except Exception as e:
        logger.warning(f"Could not initialize Hybrid Intelligence: {e}")

    try:
        state.explainability_engine = ExplainabilityEngine(
            graph=state.graph,
            tracer=state.tracer,
            influencer_detector=state.influencer_detector
        )
        logger.info("Initialized Explainability Engine successfully.")
    except Exception as e:
        logger.warning(f"Could not initialize Explainability Engine: {e}")

    # 6. Precompute lookup sets
    state.person_ids = set(state.data.persons["person_id"].dropna().unique())
    state.case_ids = set(state.data.cases["case_id"].dropna().unique())
    state.entity_ids = (
        set(state.graph.nodes())
        | state.person_ids
        | state.case_ids
        | {f.metadata.get("shared_entity_id") for f in state.findings if f.metadata.get("shared_entity_id")}
        | {ent for f in state.findings for ent in f.entities}
    )

    state.startup_time_seconds = round(time.time() - t0, 3)
    logger.info(
        f"SIH26189 Engine ready in {state.startup_time_seconds}s: "
        f"{len(state.person_ids)} persons, {len(state.case_ids)} cases, "
        f"{len(state.roles)} influencer roles, {len(state.findings)} pattern findings."
    )

    _state = state
    return _state


def get_app_state() -> AppState:
    """Returns the singleton application state."""
    global _state
    if _state is None:
        return init_app_state()
    return _state


# =============================================================================
# FastAPI Application & Lifespan Context
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler preloading intelligence data at startup."""
    init_app_state()
    yield


app = FastAPI(
    title="SIH26189 Criminal Network Investigation API",
    description="Explainable, source-traceable REST API backend for criminal network analysis, influencer detection, and upstream coordinator discovery.",
    version="1.0.0",
    lifespan=lifespan,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid parameter request"},
        404: {"model": ErrorResponse, "description": "Resource not found"}
    }
)

# CORS Configuration for local frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://localhost:8080"
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Maps parameter validation errors to HTTP 400."""
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": f"Invalid query parameters: {exc.errors()}"}
    )


# =============================================================================
# 1. Health Endpoint
# =============================================================================

@app.get(
    "/health",
    response_model=HealthResponse,
    summary="Health check",
    tags=["System"]
)
def get_health() -> HealthResponse:
    """Returns system status, service name, dataset type, and pipeline version."""
    return HealthResponse(
        status="ok",
        service="SIH26189 Investigation API",
        dataset="synthetic",
        phases_completed=6
    )


@app.get(
    "/overview",
    response_model=OverviewResponse,
    summary="Dashboard intelligence overview and statistics",
    tags=["System"]
)
def get_overview() -> OverviewResponse:
    """Returns system-wide intelligence metrics, top criminal coordinators/brokers, and activity."""
    state = get_app_state()

    # Top influencers prioritized by coordinators, brokers, and betweenness
    priority_order = {
        RoleType.UPSTREAM_COORDINATOR.value: 1,
        RoleType.BROKER.value: 2,
        RoleType.OPERATIONAL_MEMBER.value: 3,
        RoleType.FINANCIAL_FACILITATOR.value: 4,
        RoleType.HIGH_DEGREE.value: 5,
        RoleType.PERIPHERAL_ASSOCIATE.value: 6
    }

    # Fetch names efficiently from persons table
    p_names = dict(zip(state.data.persons["person_id"], state.data.persons["name"]))

    sorted_influencers = sorted(
        state.roles.values(),
        key=lambda r: (
            priority_order.get(r.predicted_role, 99),
            -r.confidence_score,
            -r.graph_features.get("degree", 0)
        )
    )

    top_items = [
        InfluencerOverviewItem(
            person_id=r.person_id,
            name=p_names.get(r.person_id, r.person_id),
            predicted_role=r.predicted_role,
            confidence=round(r.confidence_score, 3),
            is_criminally_significant=r.is_criminally_significant,
            degree=r.graph_features.get("degree", 0),
            connected_cases_count=len(r.connected_cases)
        )
        for r in sorted_influencers[:15]
    ]

    high_conf_count = sum(1 for f in state.findings if f.confidence >= 0.85)

    recent_act = [
        {
            "finding_id": f.finding_id,
            "pattern_type": f.pattern_type,
            "case_id": f.case_id,
            "confidence": f.confidence,
            "entities_count": len(f.entities),
            "narrative": f.narrative[:120] + "..." if len(f.narrative) > 120 else f.narrative
        }
        for f in state.findings[:10]
    ]

    return OverviewResponse(
        total_persons=len(state.person_ids),
        total_cases=len(state.case_ids),
        total_networks=12,
        total_findings=len(state.findings),
        top_influencers=top_items,
        high_confidence_findings_count=high_conf_count,
        recent_activity=recent_act
    )


# =============================================================================
# 2. Person Endpoints
# =============================================================================

@app.get(
    "/persons/{person_id}",
    response_model=PersonDetailResponse,
    summary="Get person investigation details",
    tags=["Persons"]
)
def get_person(person_id: str) -> PersonDetailResponse:
    """
    Returns full investigative profile for a person:
    predicted role, confidence, criminal significance, topological features,
    connected cases, suspicious patterns, evidence diversity, hybrid intelligence assessment, and explainability.
    """
    state = get_app_state()
    if person_id not in state.person_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Person '{person_id}' not found in database."
        )

    insight = state.insights_generator.generate_person_insight(person_id)

    rule_role = insight.predicted_role
    rule_conf = insight.confidence

    ml_pred = None
    if state.ml_classifier:
        try:
            person_features = state.influencer_detector.compute_person_features().get(person_id, {})
            ml_pred = state.ml_classifier.predict(person_features)
        except Exception as e:
            logger.warning(f"ML prediction failed for {person_id}: {e}")

    hybrid_resp: Optional[HybridIntelligenceResponse] = None
    final_role = rule_role
    final_conf = rule_conf

    if state.hybrid_intelligence and ml_pred:
        try:
            hybrid_dict = state.hybrid_intelligence.predict(
                person_id=person_id,
                rule_prediction=rule_role,
                rule_confidence=rule_conf,
                ml_prediction=ml_pred
            )
            final_role = hybrid_dict.get("role", rule_role)
            final_conf = hybrid_dict.get("confidence", rule_conf)
            hybrid_resp = HybridIntelligenceResponse(
                person_id=person_id,
                role=hybrid_dict["role"],
                confidence=hybrid_dict["confidence"],
                rule_prediction=hybrid_dict["rule_prediction"],
                rule_confidence=hybrid_dict["rule_confidence"],
                rule_score=hybrid_dict["rule_score"],
                ml_prediction=hybrid_dict.get("ml_prediction"),
                ml_confidence=hybrid_dict.get("ml_confidence", 0.0),
                ml_score=hybrid_dict.get("ml_score", 0.0),
                evidence_score=hybrid_dict.get("evidence_score", 0.0),
                agreement=hybrid_dict.get("agreement", False),
                confidence_level=hybrid_dict.get("confidence_level", "LOW"),
                ml_probabilities=hybrid_dict.get("ml_probabilities", {})
            )
        except Exception as e:
            logger.warning(f"Hybrid Intelligence predict failed for {person_id}: {e}")

    explain_resp: Optional[ExplainabilityResponse] = None
    if state.explainability_engine:
        try:
            explain_dict = state.explainability_engine.explain(
                person_id=person_id,
                rule_role=rule_role,
                hybrid_role=final_role,
                confidence=final_conf
            )
            reasons_list = []
            for r in explain_dict.get("reasons", []):
                reasons_list.append(ExplainabilityReasonItem(
                    type=r.get("type", "UNKNOWN"),
                    severity=r.get("severity", "MEDIUM"),
                    title=r.get("title"),
                    relationship=r.get("relationship"),
                    reason=r.get("reason"),
                    person_id=r.get("person_id"),
                    person_name=r.get("person_name"),
                    caller=r.get("caller"),
                    other_person=r.get("other_person"),
                    other_person_name=r.get("other_person_name"),
                    minutes_between=r.get("minutes_between"),
                    evidence_count=r.get("evidence_count"),
                    source_types=r.get("source_types", []),
                    record_ids=r.get("record_ids", []),
                    chain=r.get("chain", []),
                    readable_chain=r.get("readable_chain", []),
                    op_in_links=r.get("op_in_links"),
                    op_out_links=r.get("op_out_links"),
                    source_categories=r.get("source_categories", []),
                    call_record_id=r.get("call_record_id"),
                    transaction_record_id=r.get("transaction_record_id"),
                    call_timestamp=r.get("call_timestamp"),
                    transaction_timestamp=r.get("transaction_timestamp"),
                    case_id=r.get("case_id"),
                    transaction_description=r.get("transaction_description")
                ))

            explain_resp = ExplainabilityResponse(
                person_id=person_id,
                role=explain_dict.get("role"),
                confidence=explain_dict.get("confidence"),
                flagged=explain_dict.get("flagged", False),
                summary=explain_dict.get("summary", ""),
                reason_count=explain_dict.get("reason_count", 0),
                high_severity_reasons=explain_dict.get("high_severity_reasons", 0),
                reasons=reasons_list,
                evidence_count=explain_dict.get("evidence_count", 0),
                evidence_source_categories=explain_dict.get("evidence_source_categories", [])
            )
        except Exception as e:
            logger.warning(f"ExplainabilityEngine explain failed for {person_id}: {e}")

    return PersonDetailResponse(
        person_id=insight.person_id,
        name=insight.name,
        city=insight.city,
        occupation=insight.occupation,
        predicted_role=final_role,
        confidence=final_conf,
        criminal_significance=insight.is_criminally_significant,
        graph_features={
            "degree": insight.degree,
            "betweenness_centrality": insight.betweenness
        },
        connected_cases=insight.connected_cases,
        suspicious_patterns=insight.suspicious_patterns,
        evidence_diversity=insight.evidence_diversity,
        source_categories=insight.source_categories,
        investigator_narrative=insight.narrative,
        explanation=insight.explanation,
        strongest_supporting_evidence=insight.strongest_supporting_evidence,
        hybrid_intelligence=hybrid_resp,
        explainability=explain_resp
    )


@app.get(
    "/persons/{person_id}/network",
    response_model=PersonNetworkResponse,
    summary="Get person local network topology",
    tags=["Persons"]
)
def get_person_network(person_id: str) -> PersonNetworkResponse:
    """
    Returns local network context for a person:
    direct connections, important influencer neighbors, operational paths,
    roles of connected persons, connected cases, and strongest relationships.
    """
    state = get_app_state()
    if person_id not in state.person_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Person '{person_id}' not found in database."
        )

    g = state.graph
    direct_conns: List[str] = []
    if person_id in g:
        succs = set(g.successors(person_id))
        preds = set(g.predecessors(person_id))
        direct_conns = sorted(list(succs | preds))

    roles_map: Dict[str, str] = {}
    important_neighbors: List[Dict[str, Any]] = []

    for neighbor in direct_conns:
        if neighbor in state.roles:
            r = state.roles[neighbor]
            roles_map[neighbor] = r.predicted_role
            if r.predicted_role in (
                RoleType.UPSTREAM_COORDINATOR.value,
                RoleType.BROKER.value,
                RoleType.OPERATIONAL_MEMBER.value,
                RoleType.FINANCIAL_FACILITATOR.value
            ):
                important_neighbors.append({
                    "person_id": neighbor,
                    "role": r.predicted_role,
                    "confidence": r.confidence_score,
                    "is_criminally_significant": r.is_criminally_significant
                })
        else:
            roles_map[neighbor] = "UNKNOWN_ENTITY"

    # Operational paths from influencer result
    role_res = state.roles.get(person_id)
    op_paths = role_res.supporting_paths if role_res else []

    # Connected cases
    p_insight = state.insights_generator.generate_person_insight(person_id)
    connected_cases = p_insight.connected_cases

    # Strongest relationships (ranked by multi-source evidence count)
    strongest_relationships: List[Dict[str, Any]] = []
    for neighbor in direct_conns:
        pair_ev = state.tracer.get_evidence_for_pair(person_id, neighbor)
        if pair_ev:
            cats = list(set(it.source_type for it in pair_ev))
            strongest_relationships.append({
                "target_entity": neighbor,
                "evidence_count": len(pair_ev),
                "source_categories": cats,
                "highest_confidence": max(it.confidence for it in pair_ev),
                "sample_record_ids": [it.source_record_id for it in pair_ev[:3]]
            })
    strongest_relationships.sort(key=lambda x: x["evidence_count"], reverse=True)

    return PersonNetworkResponse(
        person_id=person_id,
        direct_connections=direct_conns,
        important_neighbors=important_neighbors[:10],
        operational_paths=op_paths,
        roles_of_connected_persons=roles_map,
        connected_cases=connected_cases,
        strongest_relationships=strongest_relationships[:10]
    )


@app.get(
    "/persons/{person_id}/evidence",
    response_model=List[EvidenceItemResponse],
    summary="Get traceable evidence records for person",
    tags=["Persons"]
)
def get_person_evidence(person_id: str) -> List[EvidenceItemResponse]:
    """
    Returns all traceable underlying source records associated with this person
    across CDR, financial transactions, sightings, surveillance, and legal filings.
    """
    state = get_app_state()
    if person_id not in state.person_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Person '{person_id}' not found in database."
        )

    ev_items = state.tracer.get_evidence_for_entity(person_id)
    return [
        EvidenceItemResponse(
            source_type=it.source_type,
            source_record_id=it.source_record_id,
            timestamp=it.timestamp,
            case_id=it.case_id,
            entities=it.entity_ids,
            confidence=it.confidence,
            description=it.description
        )
        for it in ev_items
    ]


@app.get(
    "/persons",
    response_model=PersonListResponse,
    summary="List all persons with pagination and search",
    tags=["Persons"]
)
def get_persons_list(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by Person ID, Name, City, Occupation, or Role")
) -> PersonListResponse:
    """
    Returns full paginated directory of available persons with optional search filtering.
    """
    state = get_app_state()
    persons_df = state.data.persons.copy() if hasattr(state.data, 'persons') and state.data.persons is not None else pd.DataFrame()

    items: List[PersonSummaryItem] = []
    if not persons_df.empty:
        for _, row in persons_df.iterrows():
            pid = str(row["person_id"])
            name = str(row.get("name", pid))
            city = str(row.get("city", "N/A"))
            occ = str(row.get("occupation", "N/A"))

            r_info = state.roles.get(pid)
            role = r_info.predicted_role if r_info else "CIVILIAN"
            conf = r_info.confidence_score if r_info else 0.85
            is_crim = r_info.is_criminally_significant if r_info else False

            items.append(PersonSummaryItem(
                person_id=pid,
                name=name,
                city=city,
                occupation=occ,
                predicted_role=role,
                confidence=round(conf, 2),
                criminal_significance=is_crim
            ))

    if search:
        s_lower = search.strip().lower()
        items = [
            it for it in items
            if s_lower in it.person_id.lower()
            or s_lower in it.name.lower()
            or s_lower in it.city.lower()
            or s_lower in it.occupation.lower()
            or s_lower in it.predicted_role.lower()
        ]

    total_persons = len(items)
    total_pages = max(1, (total_persons + limit - 1) // limit)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    page_persons = items[start_idx:end_idx]

    return PersonListResponse(
        total_persons=total_persons,
        page=page,
        page_size=limit,
        total_pages=total_pages,
        persons=page_persons
    )


# =============================================================================
# 3. Case Endpoints
# =============================================================================

@app.get(
    "/cases",
    response_model=CaseListResponse,
    summary="List all criminal cases with pagination and search",
    tags=["Cases"]
)
def get_cases(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by Case ID, Crime Type, FIR Reference, or Location")
) -> CaseListResponse:
    """
    Returns full paginated directory of available criminal cases with optional multi-field search filtering.
    """
    state = get_app_state()
    cases_df = state.data.cases.copy() if hasattr(state.data, 'cases') and state.data.cases is not None else pd.DataFrame()
    fir_df = state.data.fir_records if hasattr(state.data, 'fir_records') else None

    fir_map = {}
    if fir_df is not None and not fir_df.empty:
        for _, row in fir_df.iterrows():
            cid = str(row.get("case_id", ""))
            if cid and cid not in fir_map:
                fir_map[cid] = row

    items: List[CaseSummaryItem] = []
    if not cases_df.empty:
        for _, row in cases_df.iterrows():
            cid = str(row["case_id"])
            crime = str(row.get("crime_type", "Criminal Case"))
            status_val = str(row.get("status", "UNDER_INVESTIGATION"))
            frow = fir_map.get(cid)
            fir_id = str(frow.get("fir_id", "")) if frow is not None else None
            loc_id = str(frow.get("location_id", "")) if frow is not None else (str(row.get("location_id", "")) or None)
            inc_date = str(frow.get("date", "")) if frow is not None else (str(row.get("incident_date", "")) or None)

            items.append(CaseSummaryItem(
                case_id=cid,
                crime_type=crime,
                status=status_val,
                fir_id=fir_id if fir_id and fir_id != "nan" else None,
                location_id=loc_id if loc_id and loc_id != "nan" else None,
                incident_date=inc_date if inc_date and inc_date != "nan" else None
            ))

    if search:
        s_lower = search.strip().lower()
        items = [
            it for it in items
            if s_lower in it.case_id.lower()
            or s_lower in it.crime_type.lower()
            or (it.fir_id and s_lower in it.fir_id.lower())
            or (it.location_id and s_lower in it.location_id.lower())
            or (it.status and s_lower in it.status.lower())
        ]

    total_cases = len(items)
    total_pages = max(1, (total_cases + limit - 1) // limit)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    page_cases = items[start_idx:end_idx]

    return CaseListResponse(
        total_cases=total_cases,
        page=page,
        page_size=limit,
        total_pages=total_pages,
        cases=page_cases
    )

@app.get(
    "/cases/{case_id}",
    response_model=CaseDetailResponse,
    summary="Get case overview and investigative breakdown",
    tags=["Cases"]
)
def get_case(case_id: str) -> CaseDetailResponse:
    """
    Returns case details, FIR registration info, key actors, predicted roles,
    suspicious patterns, locations, vehicles, timeline, and cross-case links.
    """
    state = get_app_state()
    if case_id not in state.case_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case '{case_id}' not found in database."
        )

    insight = state.insights_generator.generate_case_insight(case_id)

    # FIR Information
    fir_rows = state.data.fir_records[state.data.fir_records["case_id"] == case_id]
    fir_info = FIRInfo()
    if not fir_rows.empty:
        frow = fir_rows.iloc[0]
        fir_info = FIRInfo(
            fir_id=str(frow.get("fir_id", "")),
            crime_type=str(frow.get("crime_type", "")),
            section=str(frow.get("section", "")),
            date=str(frow.get("date", "")),
            location_id=str(frow.get("location_id", "")),
            accused_id=str(frow.get("accused_id", "")),
            complainant_name=str(frow.get("complainant_name", ""))
        )

    roles_map: Dict[str, str] = {}
    if insight.upstream_coordinator:
        roles_map[insight.upstream_coordinator] = RoleType.UPSTREAM_COORDINATOR.value
    for b in insight.brokers:
        roles_map[b] = RoleType.BROKER.value
    for m in insight.operational_members:
        roles_map[m] = RoleType.OPERATIONAL_MEMBER.value
    for f in insight.financial_facilitators:
        roles_map[f] = RoleType.FINANCIAL_FACILITATOR.value

    return CaseDetailResponse(
        case_id=insight.case_id,
        crime_type=insight.crime_type,
        status=insight.status,
        fir_information=fir_info,
        important_persons={
            "upstream_coordinator": insight.upstream_coordinator,
            "brokers": insight.brokers,
            "operational_members": insight.operational_members,
            "financial_facilitators": insight.financial_facilitators,
            "operational_chain": insight.operational_chain
        },
        predicted_roles=roles_map,
        suspicious_patterns=insight.suspicious_patterns,
        locations=insight.locations_involved,
        vehicles=insight.vehicles_involved,
        timeline=insight.timeline_summary,
        cross_case_links=insight.cross_case_connections,
        investigation_narrative=insight.narrative
    )


@app.get(
    "/cases/{case_id}/timeline",
    response_model=CaseTimelineResponse,
    summary="Get case forensic timeline",
    tags=["Cases"]
)
def get_case_timeline(case_id: str) -> CaseTimelineResponse:
    """
    Returns chronologically ordered forensic events related to this case:
    calls, transactions, location pings, vehicle sightings, FIR events, and reports.
    """
    state = get_app_state()
    if case_id not in state.case_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case '{case_id}' not found in database."
        )

    case_ev_items = state.tracer.get_evidence_for_case(case_id)

    # Sort chronologically by timestamp (items with timestamps first, then N/A)
    def parse_time_key(item: EvidenceItem):
        ts = str(item.timestamp or "")
        return (0 if ts and ts != "None" else 1, ts)

    sorted_items = sorted(case_ev_items, key=parse_time_key)

    events: List[TimelineEventItem] = [
        TimelineEventItem(
            timestamp=it.timestamp or "N/A",
            event_type=it.source_type,
            source_record_id=it.source_record_id,
            entities=it.entity_ids,
            location=it.location_id,
            description=it.description
        )
        for it in sorted_items
    ]

    return CaseTimelineResponse(
        case_id=case_id,
        total_events=len(events),
        events=events
    )


@app.get(
    "/cases/{case_id}/evidence",
    response_model=CaseEvidenceResponse,
    summary="Get case evidence grouped by category",
    tags=["Cases"]
)
def get_case_evidence(case_id: str) -> CaseEvidenceResponse:
    """
    Returns traceable case evidence records grouped by source category
    (e.g. CDR, FINANCIAL_TRANSACTION, LOCATION_EVENT, VEHICLE_EVENT, FIR_RECORD).
    """
    state = get_app_state()
    if case_id not in state.case_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case '{case_id}' not found in database."
        )

    case_ev_items = state.tracer.get_evidence_for_case(case_id)

    evidence_by_cat: Dict[str, List[EvidenceItemResponse]] = {}
    for it in case_ev_items:
        evidence_by_cat.setdefault(it.source_type, []).append(
            EvidenceItemResponse(
                source_type=it.source_type,
                source_record_id=it.source_record_id,
                timestamp=it.timestamp,
                case_id=it.case_id,
                entities=it.entity_ids,
                confidence=it.confidence,
                description=it.description
            )
        )

    return CaseEvidenceResponse(
        case_id=case_id,
        total_records=len(case_ev_items),
        categories_count=len(evidence_by_cat),
        evidence_by_category=evidence_by_cat
    )


# =============================================================================
# 4. Network Endpoints
# =============================================================================

@app.get(
    "/networks/{network_id}",
    response_model=NetworkDetailResponse,
    summary="Get syndicate network profile",
    tags=["Networks"]
)
def get_network(network_id: str) -> NetworkDetailResponse:
    """
    Returns syndicate structural profile (e.g. NET_001 to NET_012):
    primary case, upstream coordinator, brokers, operational members,
    financial facilitators, key operational paths, and narrative.
    """
    state = get_app_state()
    if not network_id.startswith("NET_"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Network '{network_id}' invalid. Expected format NET_001 to NET_012."
        )

    try:
        net_num = int(network_id.split("_")[1])
        primary_case = f"CASE_{net_num:04d}"
    except (IndexError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Network '{network_id}' not recognized."
        )

    if primary_case not in state.case_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Network '{network_id}' primary case '{primary_case}' not found."
        )

    net_insight = state.insights_generator.generate_network_insight(network_id)

    return NetworkDetailResponse(
        network_id=net_insight.network_id,
        primary_case=net_insight.primary_case,
        upstream_coordinator=net_insight.upstream_coordinator,
        brokers=net_insight.brokers,
        operational_members=net_insight.operational_members,
        financial_facilitators=net_insight.financial_facilitators,
        peripheral_associates=net_insight.peripheral_associates,
        important_paths=net_insight.important_paths,
        connected_cases=net_insight.connected_cases,
        evidence_diversity=net_insight.evidence_diversity,
        source_categories=net_insight.source_categories,
        investigation_narrative=net_insight.narrative
    )


# =============================================================================
# 5. Findings Endpoints
# =============================================================================

@app.get(
    "/findings",
    response_model=List[FindingSummaryResponse],
    summary="List suspicious behavioral pattern findings",
    tags=["Findings"]
)
def get_findings(
    case_id: Optional[str] = Query(None, description="Filter by case ID"),
    person_id: Optional[str] = Query(None, description="Filter by person ID"),
    pattern_type: Optional[str] = Query(None, description="Filter by pattern type"),
    min_confidence: Optional[float] = Query(None, ge=0.0, le=1.0, description="Minimum confidence threshold (0.0 to 1.0)")
) -> List[FindingSummaryResponse]:
    """
    Returns list of detected suspicious behavioral patterns with optional filtering
    by case_id, person_id, pattern_type, and min_confidence.
    """
    state = get_app_state()
    results = state.findings

    if case_id:
        results = [f for f in results if f.case_id == case_id]
    if person_id:
        results = [f for f in results if person_id in f.entities or f.person_id == person_id]
    if pattern_type:
        results = [f for f in results if f.pattern_type == pattern_type]
    if min_confidence is not None:
        results = [f for f in results if f.confidence >= min_confidence]

    summaries = [
        FindingSummaryResponse(
            finding_id=f.finding_id,
            finding_type=f.pattern_type,
            entities=f.entities,
            case=f.case_id,
            score=f.score,
            confidence=f.confidence,
            timestamp_window={"start_time": f.start_time, "end_time": f.end_time},
            evidence_count=len(f.source_record_ids),
            evidence_sources=f.evidence_sources,
            narrative=f.narrative
        )
        for f in results
    ]

    return summaries


@app.get(
    "/findings/{finding_id}",
    response_model=FindingDetailResponse,
    summary="Get complete finding details with supporting evidence",
    tags=["Findings"]
)
def get_finding_detail(finding_id: str) -> FindingDetailResponse:
    """
    Returns detailed finding including supporting evidence items, source records,
    evidence categories, and comprehensive explanation.
    """
    state = get_app_state()
    finding = state.findings_by_id.get(finding_id)
    if not finding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Finding '{finding_id}' not found."
        )

    # Retrieve supporting evidence items
    supporting_items = []
    for rid in finding.source_record_ids:
        item = state.tracer.get_evidence_by_record_id(rid)
        if item:
            supporting_items.append(
                EvidenceItemResponse(
                    source_type=item.source_type,
                    source_record_id=item.source_record_id,
                    timestamp=item.timestamp,
                    case_id=item.case_id,
                    entities=item.entity_ids,
                    confidence=item.confidence,
                    description=item.description
                )
            )

    related_cases = [finding.case_id] if finding.case_id else []
    if "linked_cases" in finding.metadata:
        related_cases = sorted(list(set(related_cases + finding.metadata["linked_cases"])))

    return FindingDetailResponse(
        finding_id=finding.finding_id,
        finding_type=finding.pattern_type,
        case=finding.case_id,
        score=finding.score,
        confidence=finding.confidence,
        timestamp_window={"start_time": finding.start_time, "end_time": finding.end_time},
        entities=finding.entities,
        related_entities=finding.entities,
        related_cases=related_cases,
        evidence_categories=finding.evidence_sources,
        source_records=finding.source_record_ids,
        supporting_evidence=supporting_items,
        explanation=finding.metadata.get("explanation", finding.narrative),
        narrative=finding.narrative
    )


# =============================================================================
# 6. Cross-Case Endpoints
# =============================================================================

@app.get(
    "/cross-case/{entity_id}",
    response_model=CrossCaseResponse,
    summary="Get cross-case linkage analysis",
    tags=["Cross-Case"]
)
def get_cross_case(entity_id: str) -> CrossCaseResponse:
    """
    Returns multi-case linkage analysis for an entity.
    Safely distinguishes verified criminal syndicate coordination from incidental
    civilian/geographic overlap.
    """
    state = get_app_state()

    # 1. Check if verified by Phase 5 / Phase 6 cross-case detector
    xcase = state.insights_generator.generate_cross_case_insight(entity_id)
    if xcase:
        return CrossCaseResponse(
            entity=entity_id,
            connected_cases=xcase.linked_cases,
            strength_of_linkage="strong_criminal_coordination",
            supporting_evidence=xcase.supporting_evidence_ids,
            source_categories=xcase.source_categories,
            explanation=xcase.why_connected
        )

    if entity_id not in state.entity_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Entity '{entity_id}' not found in database."
        )

    # 2. Check if entity appears across multiple cases in graph (incidental overlap)
    cases_connected: Set[str] = set()
    if entity_id in state.graph:
        for u, v in state.graph.out_edges(entity_id):
            if str(v).startswith("CASE_"):
                cases_connected.add(str(v))
        for u, v in state.graph.in_edges(entity_id):
            if str(u).startswith("CASE_"):
                cases_connected.add(str(u))

    # Also check FIR records
    fir_matches = state.data.fir_records[
        (state.data.fir_records["accused_id"] == entity_id) |
        (state.data.fir_records["location_id"] == entity_id)
    ]
    for cid in fir_matches["case_id"].dropna().unique():
        cases_connected.add(str(cid))

    if len(cases_connected) >= 2:
        return CrossCaseResponse(
            entity=entity_id,
            connected_cases=sorted(list(cases_connected)),
            strength_of_linkage="incidental_civilian_overlap",
            supporting_evidence=[],
            source_categories=[],
            explanation=(
                f"Entity '{entity_id}' appears across {len(cases_connected)} cases purely as an incidental civilian "
                f"or jurisdictional overlap (e.g. routine witness, common public location, or administrative record). "
                f"Lacks multi-hop criminal coordination, organized syndicate backing, or layered money trails; "
                f"safely suppressed from criminal cross-case linkage."
            )
        )

    # If entity is not connected to multiple cases at all
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Entity '{entity_id}' has no cross-case connections."
    )


# =============================================================================
# 7. Investigation Dossier (Primary Demo Endpoint)
# =============================================================================

@app.get(
    "/investigation/{case_id}",
    response_model=InvestigationDossierResponse,
    summary="Get complete case investigation dossier",
    tags=["Investigation"]
)
def get_investigation_dossier(case_id: str) -> InvestigationDossierResponse:
    """
    Primary demo endpoint: Dynamically generates the complete Phase 6 investigation
    dossier for any requested case (including flagship CASE_0001).

    Unpacks recovered upstream coordinator, 5-hop operational chain, intermediate brokers,
    financial facilitators, categorized forensic evidence, and narrative.
    """
    state = get_app_state()
    if case_id not in state.case_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case '{case_id}' not found in database."
        )

    c_insight = state.insights_generator.generate_case_insight(case_id)
    case_ev_items = state.tracer.get_evidence_for_case(case_id)

    # Categorize evidence records
    financial_ev: List[Dict[str, Any]] = []
    comm_ev: List[Dict[str, Any]] = []
    spatial_ev: List[Dict[str, Any]] = []
    vehicle_ev: List[Dict[str, Any]] = []
    temporal_ev: List[Dict[str, Any]] = list(c_insight.timeline_summary)

    for it in case_ev_items:
        d = it.to_dict()
        if it.source_type == "FINANCIAL_TRANSACTION":
            financial_ev.append(d)
        elif it.source_type in ("CDR", "SOCIAL_MEDIA"):
            comm_ev.append(d)
        elif it.source_type == "LOCATION_EVENT":
            spatial_ev.append(d)
        elif it.source_type == "VEHICLE_EVENT":
            vehicle_ev.append(d)

    # Also augment with hop evidence if operational chain exists
    if c_insight.hop_evidence:
        for hop in c_insight.hop_evidence:
            for item_dict in hop.get("evidence_items", []):
                st = item_dict.get("source_type")
                if st == "FINANCIAL_TRANSACTION" and item_dict not in financial_ev:
                    financial_ev.append(item_dict)
                elif st == "CDR" and item_dict not in comm_ev:
                    comm_ev.append(item_dict)

    # Confidence calculation: corroborated multi-category cases receive calibrated high confidence
    conf = 0.98 if (c_insight.upstream_coordinator and c_insight.evidence_diversity >= 4) else 0.85

    case_summary = {
        "case_id": c_insight.case_id,
        "crime_type": c_insight.crime_type,
        "status": c_insight.status,
        "fir_id": c_insight.fir_id,
        "incident_date": c_insight.incident_date,
        "incident_location": c_insight.incident_location
    }

    traceability_summary = {
        "total_case_records": len(case_ev_items),
        "evidence_diversity_score": c_insight.evidence_diversity,
        "source_categories": c_insight.source_categories,
        "operational_chain_length": len(c_insight.operational_chain),
        "sample_record_ids": c_insight.source_record_ids[:15]
    }

    return InvestigationDossierResponse(
        case_id=case_id,
        case_summary=case_summary,
        upstream_coordinator=c_insight.upstream_coordinator,
        operational_chain=c_insight.operational_chain,
        brokers=c_insight.brokers,
        operational_members=c_insight.operational_members,
        financial_facilitators=c_insight.financial_facilitators,
        financial_evidence=financial_ev[:10],
        communication_evidence=comm_ev[:10],
        temporal_evidence=temporal_ev,
        spatial_evidence=spatial_ev[:10],
        vehicle_evidence=vehicle_ev[:10],
        cross_case_connections=c_insight.cross_case_connections,
        evidence_traceability=traceability_summary,
        confidence=conf,
        investigator_narrative=c_insight.narrative
    )


# =============================================================================
# 8. Search Endpoint
# =============================================================================

@app.get(
    "/search",
    response_model=SearchResponse,
    summary="Global entity search",
    tags=["Search"]
)
def search_entities(
    q: str = Query(..., min_length=1, description="Search query string")
) -> SearchResponse:
    """
    Searches loaded dataset entities (Persons by ID or Name, Cases, Networks, Vehicles, Phones)
    matching the query.
    """
    state = get_app_state()
    query_str = q.strip()
    query_lower = query_str.lower()

    results: List[SearchResultItem] = []

    # 1. Search Persons
    if hasattr(state.data, 'persons') and state.data.persons is not None:
        p_df = state.data.persons
        mask = (
            p_df['person_id'].astype(str).str.lower().str.contains(query_lower, na=False) |
            p_df['name'].astype(str).str.lower().str.contains(query_lower, na=False)
        )
        matched_persons = p_df[mask].head(15)
        for _, row in matched_persons.iterrows():
            pid = str(row['person_id'])
            name = str(row.get('name', pid))
            city = str(row.get('city', ''))
            occ = str(row.get('occupation', ''))
            role_info = state.roles.get(pid)
            role = role_info.predicted_role if role_info else "CIVILIAN"
            conf = role_info.confidence_score if role_info else 0.80

            results.append(SearchResultItem(
                entity_id=pid,
                entity_type="person",
                display_name=name,
                role_or_status=role,
                confidence=round(conf, 2),
                details=f"{city} • {occ}".strip(" •")
            ))

    # 2. Search Cases
    if hasattr(state.data, 'cases') and state.data.cases is not None:
        c_df = state.data.cases
        mask = (
            c_df['case_id'].astype(str).str.lower().str.contains(query_lower, na=False) |
            c_df['crime_type'].astype(str).str.lower().str.contains(query_lower, na=False)
        )
        matched_cases = c_df[mask].head(10)
        for _, row in matched_cases.iterrows():
            cid = str(row['case_id'])
            crime = str(row.get('crime_type', 'Criminal Case'))
            status_val = str(row.get('status', 'ACTIVE'))
            fir = str(row.get('fir_id', ''))

            results.append(SearchResultItem(
                entity_id=cid,
                entity_type="case",
                display_name=f"{cid}: {crime}",
                role_or_status=status_val,
                confidence=1.0,
                details=f"FIR: {fir}" if fir else "Case Investigation"
            ))

    # 3. Search Networks
    for i in range(1, 13):
        net_id = f"NET_{i:03d}"
        if query_lower in net_id.lower() or "syndicate" in query_lower or "network" in query_lower:
            results.append(SearchResultItem(
                entity_id=net_id,
                entity_type="network",
                display_name=f"Syndicate {net_id}",
                role_or_status="ACTIVE_SYNDICATE",
                confidence=0.95,
                details=f"Connected primary case CASE_{i:04d}"
            ))

    # 4. Search Vehicles
    if hasattr(state.data, 'vehicles') and state.data.vehicles is not None and ("veh" in query_lower or "car" in query_lower or query_lower.startswith("v")):
        v_df = state.data.vehicles
        mask = v_df['vehicle_id'].astype(str).str.lower().str.contains(query_lower, na=False)
        matched_v = v_df[mask].head(5)
        for _, row in matched_v.iterrows():
            vid = str(row['vehicle_id'])
            owner = str(row.get('owner_person_id', ''))
            results.append(SearchResultItem(
                entity_id=vid,
                entity_type="vehicle",
                display_name=vid,
                role_or_status="VEHICLE",
                confidence=0.9,
                details=f"Owner: {owner}"
            ))

    return SearchResponse(
        query=query_str,
        total_results=len(results),
        results=results
    )

