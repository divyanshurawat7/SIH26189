"""
SIH26189 — AI-Powered Criminal Network Analysis System
Module: src/api_models.py

Phase 7: Investigation REST API Backend — Pydantic Models
Provides strictly typed, validated, and JSON-serializable request/response models
for all investigation endpoints.
"""

from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field, ConfigDict


# =============================================================================
# 1. System & Health Models
# =============================================================================

class HealthResponse(BaseModel):
    """Health check response schema."""
    model_config = ConfigDict(extra="ignore")

    status: str = Field("ok", description="Service health status")
    service: str = Field("SIH26189 Investigation API", description="Service name")
    dataset: str = Field("synthetic", description="Underlying dataset type")
    phases_completed: int = Field(6, description="Completed pipeline phases")


class ErrorResponse(BaseModel):
    """Standardized API error message."""
    detail: str = Field(..., description="Explanation of error")


# =============================================================================
# 2. Evidence Models
# =============================================================================

class EvidenceItemResponse(BaseModel):
    """Traceable individual evidence record schema."""
    model_config = ConfigDict(extra="ignore")

    source_type: str = Field(..., description="Source category (e.g. CDR, FINANCIAL_TRANSACTION)")
    source_record_id: str = Field(..., description="Unique record identifier")
    timestamp: Optional[str] = Field(None, description="ISO-8601 or date string of event")
    case_id: Optional[str] = Field(None, description="Associated case ID if known")
    entities: List[str] = Field(default_factory=list, description="Entities involved")
    confidence: float = Field(..., description="Evidence reliability/confidence score")
    description: str = Field(..., description="Forensic description of record")


# =============================================================================
# 3. Person Models
# =============================================================================

class PersonDetailResponse(BaseModel):
    """Detailed actor profile, role detection, and forensic evidence diversity."""
    model_config = ConfigDict(extra="ignore")

    person_id: str = Field(..., description="Unique person identifier")
    name: str = Field(..., description="Subject name")
    city: str = Field(..., description="City of residence")
    occupation: str = Field(..., description="Recorded occupation")
    predicted_role: str = Field(..., description="Predicted network role")
    confidence: float = Field(..., description="Role prediction confidence score")
    criminal_significance: bool = Field(..., description="Whether actor exhibits verified criminal predicate")
    graph_features: Dict[str, Any] = Field(default_factory=dict, description="Topological features (degree, betweenness, etc.)")
    connected_cases: List[str] = Field(default_factory=list, description="Directly or multi-hop connected cases")
    suspicious_patterns: List[str] = Field(default_factory=list, description="Behavioral patterns involving this actor")
    evidence_diversity: int = Field(..., description="Number of distinct evidence categories")
    source_categories: List[str] = Field(default_factory=list, description="List of evidence categories supporting actor")
    investigator_narrative: str = Field(..., description="Comprehensive investigative narrative")
    explanation: str = Field(..., description="Role classification explanation")
    strongest_supporting_evidence: List[Dict[str, Any]] = Field(default_factory=list, description="Top evidence items")


class PersonNetworkResponse(BaseModel):
    """Local network topology, important neighbors, and operational paths for an actor."""
    model_config = ConfigDict(extra="ignore")

    person_id: str = Field(..., description="Subject person ID")
    direct_connections: List[str] = Field(default_factory=list, description="Direct graph neighbors")
    important_neighbors: List[Dict[str, Any]] = Field(default_factory=list, description="Key influencer neighbors with roles")
    operational_paths: List[List[str]] = Field(default_factory=list, description="Multi-hop operational paths involving actor")
    roles_of_connected_persons: Dict[str, str] = Field(default_factory=dict, description="Mapping of neighbor ID to predicted role")
    connected_cases: List[str] = Field(default_factory=list, description="Connected criminal cases")
    strongest_relationships: List[Dict[str, Any]] = Field(default_factory=list, description="Strongest edges with weights and types")


# =============================================================================
# 4. Case Models
# =============================================================================

class FIRInfo(BaseModel):
    """FIR summary information."""
    model_config = ConfigDict(extra="ignore")

    fir_id: Optional[str] = None
    crime_type: Optional[str] = None
    section: Optional[str] = None
    date: Optional[str] = None
    location_id: Optional[str] = None
    accused_id: Optional[str] = None
    complainant_name: Optional[str] = None


class CaseDetailResponse(BaseModel):
    """Comprehensive case overview, FIR details, key actors, locations, and patterns."""
    model_config = ConfigDict(extra="ignore")

    case_id: str = Field(..., description="Unique case identifier")
    crime_type: str = Field(..., description="Offense category")
    status: str = Field(..., description="Case status (e.g. under_investigation, closed)")
    fir_information: FIRInfo = Field(default_factory=FIRInfo, description="Registered FIR details")
    important_persons: Dict[str, Any] = Field(default_factory=dict, description="Key actors by role (coordinator, brokers, operational)")
    predicted_roles: Dict[str, str] = Field(default_factory=dict, description="Actor to role mapping")
    suspicious_patterns: List[str] = Field(default_factory=list, description="Detected behavioral patterns")
    locations: List[str] = Field(default_factory=list, description="Locations involved")
    vehicles: List[str] = Field(default_factory=list, description="Vehicles involved")
    timeline: List[Dict[str, Any]] = Field(default_factory=list, description="Summary timeline events")
    cross_case_links: List[str] = Field(default_factory=list, description="Connected cross-case IDs")
    investigation_narrative: str = Field(..., description="Investigative narrative summary")


class TimelineEventItem(BaseModel):
    """Individual chronological event record in case timeline."""
    model_config = ConfigDict(extra="ignore")

    timestamp: str = Field(..., description="Event timestamp")
    event_type: str = Field(..., description="Type of event (CALL, TRANSACTION, LOCATION_EVENT, etc.)")
    source_record_id: str = Field(..., description="Source record identifier")
    entities: List[str] = Field(default_factory=list, description="Entities involved")
    location: Optional[str] = Field(None, description="Location identifier if available")
    description: str = Field(..., description="Summary description")


class CaseTimelineResponse(BaseModel):
    """Chronologically ordered event stream for a case."""
    model_config = ConfigDict(extra="ignore")

    case_id: str = Field(..., description="Case identifier")
    total_events: int = Field(..., description="Total timeline events")
    events: List[TimelineEventItem] = Field(default_factory=list, description="Ordered event records")


class CaseEvidenceResponse(BaseModel):
    """Traceable case evidence grouped by source category."""
    model_config = ConfigDict(extra="ignore")

    case_id: str = Field(..., description="Case identifier")
    total_records: int = Field(..., description="Total evidence records")
    categories_count: int = Field(..., description="Number of distinct source categories")
    evidence_by_category: Dict[str, List[EvidenceItemResponse]] = Field(
        default_factory=dict, description="Evidence items grouped by category"
    )


# =============================================================================
# 5. Syndicate / Network Models
# =============================================================================

class NetworkDetailResponse(BaseModel):
    """Syndicate structural profile across key actors, hierarchy, and evidence diversity."""
    model_config = ConfigDict(extra="ignore")

    network_id: str = Field(..., description="Syndicate network ID (e.g. NET_001)")
    primary_case: Optional[str] = Field(None, description="Primary anchor case")
    upstream_coordinator: Optional[str] = Field(None, description="Identified upstream coordinator")
    brokers: List[str] = Field(default_factory=list, description="Identified brokers")
    operational_members: List[str] = Field(default_factory=list, description="On-scene operational members")
    financial_facilitators: List[str] = Field(default_factory=list, description="Financial conduits")
    peripheral_associates: List[str] = Field(default_factory=list, description="Peripheral affiliates")
    important_paths: List[List[str]] = Field(default_factory=list, description="Key operational chains")
    connected_cases: List[str] = Field(default_factory=list, description="Connected cases")
    evidence_diversity: int = Field(..., description="Distinct evidence categories")
    source_categories: List[str] = Field(default_factory=list, description="List of source categories")
    investigation_narrative: str = Field(..., description="Structural narrative")


# =============================================================================
# 6. Findings Models
# =============================================================================

class FindingSummaryResponse(BaseModel):
    """Summary of a suspicious behavioral pattern finding."""
    model_config = ConfigDict(extra="ignore")

    finding_id: str = Field(..., description="Unique finding ID")
    finding_type: str = Field(..., description="Pattern type (e.g. convoy_movement, layered_financial_call_chain)")
    entities: List[str] = Field(default_factory=list, description="Entities involved")
    case: Optional[str] = Field(None, description="Associated case ID")
    score: float = Field(..., description="Severity or anomaly score")
    confidence: float = Field(..., description="Pattern confidence score")
    timestamp_window: Dict[str, Optional[str]] = Field(default_factory=dict, description="Start and end timestamps")
    evidence_count: int = Field(..., description="Number of supporting records")
    evidence_sources: List[str] = Field(default_factory=list, description="Evidence categories involved")
    narrative: str = Field(..., description="Forensic explanation")


class FindingDetailResponse(BaseModel):
    """Complete finding with supporting evidence items and source record breakdown."""
    model_config = ConfigDict(extra="ignore")

    finding_id: str = Field(..., description="Finding ID")
    finding_type: str = Field(..., description="Pattern type")
    case: Optional[str] = Field(None, description="Associated case ID")
    score: float = Field(..., description="Anomaly score")
    confidence: float = Field(..., description="Confidence score")
    timestamp_window: Dict[str, Optional[str]] = Field(default_factory=dict, description="Start and end timestamps")
    entities: List[str] = Field(default_factory=list, description="Entities involved")
    related_entities: List[str] = Field(default_factory=list, description="Related contextual entities")
    related_cases: List[str] = Field(default_factory=list, description="Related cases")
    evidence_categories: List[str] = Field(default_factory=list, description="Evidence categories")
    source_records: List[str] = Field(default_factory=list, description="Supporting record IDs")
    supporting_evidence: List[EvidenceItemResponse] = Field(default_factory=list, description="Detailed evidence items")
    explanation: str = Field(..., description="Detailed explanation")
    narrative: str = Field(..., description="Investigative narrative")


# =============================================================================
# 7. Cross-Case Models
# =============================================================================

class CrossCaseResponse(BaseModel):
    """Cross-case entity linkage analysis with overlap suppression semantics."""
    model_config = ConfigDict(extra="ignore")

    entity: str = Field(..., description="Entity identifier evaluated")
    connected_cases: List[str] = Field(default_factory=list, description="Cases linked by entity")
    strength_of_linkage: str = Field(..., description="Linkage strength (e.g. strong_criminal_coordination, incidental_civilian_overlap)")
    supporting_evidence: List[str] = Field(default_factory=list, description="Supporting record IDs or evidence summaries")
    source_categories: List[str] = Field(default_factory=list, description="Distinct evidence categories")
    explanation: str = Field(..., description="Investigative justification")


# =============================================================================
# 8. Primary Demo Endpoint: Investigation Dossier Models
# =============================================================================

class InvestigationDossierResponse(BaseModel):
    """Comprehensive, dynamically generated investigation dossier."""
    model_config = ConfigDict(extra="ignore")

    case_id: str = Field(..., description="Case identifier")
    case_summary: Dict[str, Any] = Field(default_factory=dict, description="Case overview attributes")
    upstream_coordinator: Optional[str] = Field(None, description="Recovered upstream coordinator")
    operational_chain: List[str] = Field(default_factory=list, description="Hop-by-hop operational chain")
    brokers: List[str] = Field(default_factory=list, description="Identified brokers")
    operational_members: List[str] = Field(default_factory=list, description="Operational field members")
    financial_facilitators: List[str] = Field(default_factory=list, description="Financial conduits")
    financial_evidence: List[Dict[str, Any]] = Field(default_factory=list, description="Key transactions")
    communication_evidence: List[Dict[str, Any]] = Field(default_factory=list, description="Key calls")
    temporal_evidence: List[Dict[str, Any]] = Field(default_factory=list, description="Timeline & sequence highlights")
    spatial_evidence: List[Dict[str, Any]] = Field(default_factory=list, description="Location & co-location events")
    vehicle_evidence: List[Dict[str, Any]] = Field(default_factory=list, description="Vehicle events & sightings")
    cross_case_connections: List[str] = Field(default_factory=list, description="Related case connections")
    evidence_traceability: Dict[str, Any] = Field(default_factory=dict, description="Traceability metrics & diversity")
    confidence: float = Field(..., description="Overall aggregated dossier confidence")
    investigator_narrative: str = Field(..., description="Complete investigative summary narrative")
