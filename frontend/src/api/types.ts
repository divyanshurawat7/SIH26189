/**
 * SIH26189 — Investigation Dashboard
 * TypeScript Data Models mirroring FastAPI Pydantic schemas.
 */

export interface HealthResponse {
  status: string;
  service: string;
  dataset: string;
  phases_completed: number;
}

export interface InfluencerOverviewItem {
  person_id: string;
  name: string;
  predicted_role: string;
  confidence: number;
  is_criminally_significant: boolean;
  degree: number;
  connected_cases_count: number;
}

export interface RecentActivityItem {
  finding_id: string;
  pattern_type: string;
  case_id?: string;
  confidence: number;
  entities_count: number;
  narrative: string;
}

export interface OverviewResponse {
  total_persons: number;
  total_cases: number;
  total_networks: number;
  total_findings: number;
  top_influencers: InfluencerOverviewItem[];
  high_confidence_findings_count: number;
  recent_activity: RecentActivityItem[];
}

export interface EvidenceItemResponse {
  source_type: string;
  source_record_id: string;
  timestamp?: string | null;
  case_id?: string | null;
  entities: string[];
  confidence: number;
  description: string;
}

export interface HybridIntelligenceData {
  person_id: string;
  role: string;
  confidence: number;
  rule_prediction: string;
  rule_confidence: number;
  rule_score: number;
  ml_prediction?: string | null;
  ml_confidence: number;
  ml_score: number;
  evidence_score: number;
  agreement: boolean;
  confidence_level: 'HIGH' | 'MEDIUM' | 'LOW' | string;
  ml_probabilities: Record<string, number>;
}

export interface ExplainabilityReason {
  type: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | string;
  title?: string | null;
  relationship?: string | null;
  reason?: string | null;
  person_id?: string | null;
  person_name?: string | null;
  caller?: string | null;
  other_person?: string | null;
  other_person_name?: string | null;
  minutes_between?: number | null;
  evidence_count?: number | null;
  source_types?: string[];
  record_ids?: string[];
  chain?: string[];
  readable_chain?: string[];
  op_in_links?: number | null;
  op_out_links?: number | null;
  source_categories?: string[];
  call_record_id?: string | null;
  transaction_record_id?: string | null;
  call_timestamp?: string | null;
  transaction_timestamp?: string | null;
  case_id?: string | null;
  transaction_description?: string | null;
}

export interface ExplainabilityData {
  person_id: string;
  role?: string | null;
  confidence?: number | null;
  flagged: boolean;
  summary: string;
  reason_count: number;
  high_severity_reasons: number;
  reasons: ExplainabilityReason[];
  evidence_count: number;
  evidence_source_categories: string[];
}

export interface PersonDetailResponse {
  person_id: string;
  name: string;
  city: string;
  occupation: string;
  predicted_role: string;
  confidence: number;
  criminal_significance: boolean;
  graph_features: {
    degree?: number;
    betweenness_centrality?: number;
    [key: string]: any;
  };
  connected_cases: string[];
  suspicious_patterns: string[];
  evidence_diversity: number;
  source_categories: string[];
  investigator_narrative: string;
  explanation: string;
  strongest_supporting_evidence: any[];
  hybrid_intelligence?: HybridIntelligenceData | null;
  explainability?: ExplainabilityData | null;
}

export interface CaseSummaryItem {
  case_id: string;
  crime_type: string;
  status: string;
  fir_id?: string | null;
  location_id?: string | null;
  incident_date?: string | null;
}

export interface CaseListResponse {
  total_cases: number;
  page: number;
  page_size: number;
  total_pages: number;
  cases: CaseSummaryItem[];
}

export interface PersonSummaryItem {
  person_id: string;
  name: string;
  city: string;
  occupation: string;
  predicted_role: string;
  confidence: number;
  criminal_significance: boolean;
}

export interface PersonListResponse {
  total_persons: number;
  page: number;
  page_size: number;
  total_pages: number;
  persons: PersonSummaryItem[];
}

export interface StrongestRelationship {
  target_entity: string;
  evidence_count: number;
  source_categories: string[];
  highest_confidence: number;
  sample_record_ids: string[];
}

export interface ImportantNeighbor {
  person_id: string;
  role: string;
  confidence: number;
  is_criminally_significant: boolean;
}

export interface PersonNetworkResponse {
  person_id: string;
  direct_connections: string[];
  important_neighbors: ImportantNeighbor[];
  operational_paths: string[][];
  roles_of_connected_persons: Record<string, string>;
  connected_cases: string[];
  strongest_relationships: StrongestRelationship[];
}

export interface FIRInfo {
  fir_id?: string | null;
  crime_type?: string | null;
  section?: string | null;
  date?: string | null;
  location_id?: string | null;
  accused_id?: string | null;
  complainant_name?: string | null;
}

export interface ImportantPersonsMap {
  upstream_coordinator?: string | null;
  brokers: string[];
  operational_members: string[];
  financial_facilitators: string[];
  operational_chain: string[];
}

export interface CaseDetailResponse {
  case_id: string;
  crime_type: string;
  status: string;
  fir_information: FIRInfo;
  important_persons: ImportantPersonsMap;
  predicted_roles: Record<string, string>;
  suspicious_patterns: string[];
  locations: string[];
  vehicles: string[];
  timeline: { time?: string; event?: string }[];
  cross_case_links: string[];
  investigation_narrative: string;
}

export interface TimelineEventItem {
  timestamp: string;
  event_type: string;
  source_record_id: string;
  entities: string[];
  location?: string | null;
  description: string;
}

export interface CaseTimelineResponse {
  case_id: string;
  total_events: number;
  events: TimelineEventItem[];
}

export interface CaseEvidenceResponse {
  case_id: string;
  total_records: number;
  categories_count: number;
  evidence_by_category: Record<string, EvidenceItemResponse[]>;
}

export interface NetworkDetailResponse {
  network_id: string;
  primary_case?: string | null;
  upstream_coordinator?: string | null;
  brokers: string[];
  operational_members: string[];
  financial_facilitators: string[];
  peripheral_associates: string[];
  important_paths: string[][];
  connected_cases: string[];
  evidence_diversity: number;
  source_categories: string[];
  investigation_narrative: string;
}

export interface FindingSummaryResponse {
  finding_id: string;
  finding_type: string;
  entities: string[];
  case?: string | null;
  score: number;
  confidence: number;
  timestamp_window: {
    start_time?: string | null;
    end_time?: string | null;
  };
  evidence_count: number;
  evidence_sources: string[];
  narrative: string;
}

export interface FindingDetailResponse {
  finding_id: string;
  finding_type: string;
  case?: string | null;
  score: number;
  confidence: number;
  timestamp_window: {
    start_time?: string | null;
    end_time?: string | null;
  };
  entities: string[];
  related_entities: string[];
  related_cases: string[];
  evidence_categories: string[];
  source_records: string[];
  supporting_evidence: EvidenceItemResponse[];
  explanation: string;
  narrative: string;
}

export interface CrossCaseResponse {
  entity: string;
  connected_cases: string[];
  strength_of_linkage: 'strong_criminal_coordination' | 'incidental_civilian_overlap' | string;
  supporting_evidence: string[];
  source_categories: string[];
  explanation: string;
}

export interface InvestigationDossierResponse {
  case_id: string;
  case_summary: {
    case_id: string;
    crime_type: string;
    status: string;
    fir_id?: string | null;
    incident_date?: string | null;
    incident_location?: string | null;
  };
  upstream_coordinator?: string | null;
  operational_chain: string[];
  brokers: string[];
  operational_members: string[];
  financial_facilitators: string[];
  financial_evidence: any[];
  communication_evidence: any[];
  temporal_evidence: any[];
  spatial_evidence: any[];
  vehicle_evidence: any[];
  cross_case_connections: string[];
  evidence_traceability: {
    total_case_records: number;
    evidence_diversity_score: number;
    source_categories: string[];
    operational_chain_length: number;
    sample_record_ids: string[];
  };
  confidence: number;
  investigator_narrative: string;
}

export interface SearchResultItem {
  entity_id: string;
  entity_type: 'person' | 'case' | 'network' | 'vehicle' | 'phone' | 'location' | string;
  display_name: string;
  role_or_status?: string | null;
  confidence?: number | null;
  details?: string | null;
}

export interface SearchResponse {
  query: string;
  total_results: number;
  results: SearchResultItem[];
}

