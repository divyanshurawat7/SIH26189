/**
 * SIH26189 — Centralized API Client
 * Connects frontend views to the FastAPI backend.
 */

import type {
  HealthResponse,
  OverviewResponse,
  PersonDetailResponse,
  PersonNetworkResponse,
  EvidenceItemResponse,
  CaseDetailResponse,
  CaseTimelineResponse,
  CaseEvidenceResponse,
  NetworkDetailResponse,
  FindingSummaryResponse,
  FindingDetailResponse,
  CrossCaseResponse,
  InvestigationDossierResponse
} from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(options?.headers || {})
      },
      ...options
    });

    if (!response.ok) {
      let errorDetail = `Request failed with status ${response.status}`;
      try {
        const errorJson = await response.json();
        if (errorJson && errorJson.detail) {
          errorDetail = typeof errorJson.detail === 'string'
            ? errorJson.detail
            : JSON.stringify(errorJson.detail);
        }
      } catch {
        // Fallback to text error or status message
      }
      throw new ApiError(response.status, errorDetail);
    }

    return await response.json();
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(0, `Backend API unreachable at ${url}. Please verify FastAPI is running on port 8000.`);
  }
}

export const apiClient = {
  getHealth: () => fetchJson<HealthResponse>('/health'),

  getOverview: () => fetchJson<OverviewResponse>('/overview'),

  getPerson: (personId: string) =>
    fetchJson<PersonDetailResponse>(`/persons/${encodeURIComponent(personId)}`),

  getPersonNetwork: (personId: string) =>
    fetchJson<PersonNetworkResponse>(`/persons/${encodeURIComponent(personId)}/network`),

  getPersonEvidence: (personId: string) =>
    fetchJson<EvidenceItemResponse[]>(`/persons/${encodeURIComponent(personId)}/evidence`),

  getCase: (caseId: string) =>
    fetchJson<CaseDetailResponse>(`/cases/${encodeURIComponent(caseId)}`),

  getCaseTimeline: (caseId: string) =>
    fetchJson<CaseTimelineResponse>(`/cases/${encodeURIComponent(caseId)}/timeline`),

  getCaseEvidence: (caseId: string) =>
    fetchJson<CaseEvidenceResponse>(`/cases/${encodeURIComponent(caseId)}/evidence`),

  getNetwork: (networkId: string) =>
    fetchJson<NetworkDetailResponse>(`/networks/${encodeURIComponent(networkId)}`),

  getFindings: (params?: {
    case_id?: string;
    person_id?: string;
    pattern_type?: string;
    min_confidence?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.case_id) searchParams.set('case_id', params.case_id);
    if (params?.person_id) searchParams.set('person_id', params.person_id);
    if (params?.pattern_type) searchParams.set('pattern_type', params.pattern_type);
    if (params?.min_confidence !== undefined && params?.min_confidence !== null) {
      searchParams.set('min_confidence', params.min_confidence.toString());
    }
    const qs = searchParams.toString();
    return fetchJson<FindingSummaryResponse[]>(`/findings${qs ? `?${qs}` : ''}`);
  },

  getFindingDetail: (findingId: string) =>
    fetchJson<FindingDetailResponse>(`/findings/${encodeURIComponent(findingId)}`),

  getCrossCase: (entityId: string) =>
    fetchJson<CrossCaseResponse>(`/cross-case/${encodeURIComponent(entityId)}`),

  getInvestigationDossier: (caseId: string) =>
    fetchJson<InvestigationDossierResponse>(`/investigation/${encodeURIComponent(caseId)}`)
};
