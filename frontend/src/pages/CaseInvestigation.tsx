import React, { useEffect, useState } from 'react';
import {
  Crown,
  GitBranch,
  Target,
  AlertTriangle,
  Briefcase,
  Clock,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { apiClient } from '../api/client';
import type {
  CaseDetailResponse,
  InvestigationDossierResponse,
  CaseTimelineResponse,
  CaseEvidenceResponse,
  CaseListResponse,
  CaseSummaryItem
} from '../api/types';
import { OperationalChain } from '../components/OperationalChain';
import { Timeline } from '../components/Timeline';
import { EvidencePanel } from '../components/EvidencePanel';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { InvestigationHeader } from '../components/InvestigationHeader';
import { getRecentInvestigations } from '../utils/storage';

interface CaseInvestigationProps {
  caseId: string | null;
  onNavigate: (type: 'person' | 'case' | 'dashboard' | string, id?: string) => void;
}

export const CaseInvestigation: React.FC<CaseInvestigationProps> = ({
  caseId,
  onNavigate
}) => {
  const [caseDetail, setCaseDetail] = useState<CaseDetailResponse | null>(null);
  const [dossier, setDossier] = useState<InvestigationDossierResponse | null>(null);
  const [timeline, setTimeline] = useState<CaseTimelineResponse | null>(null);
  const [evidenceData, setEvidenceData] = useState<CaseEvidenceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Directory State for full API-backed case list
  const [directoryPage, setDirectoryPage] = useState<number>(1);
  const [directorySearch, setDirectorySearch] = useState<string>('');
  const [directoryData, setDirectoryData] = useState<CaseListResponse | null>(null);
  const [directoryLoading, setDirectoryLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!caseId) {
      setCaseDetail(null);
      setDossier(null);
      setTimeline(null);
      setEvidenceData(null);
      setLoading(false);

      setDirectoryLoading(true);
      apiClient.getCases({ page: directoryPage, limit: 20, search: directorySearch })
        .then((res) => {
          setDirectoryData(res);
          setDirectoryLoading(false);
        })
        .catch(() => {
          setDirectoryLoading(false);
        });
      return;
    }

    setLoading(true);
    setError(null);

    Promise.all([
      apiClient.getCase(caseId),
      apiClient.getInvestigationDossier(caseId),
      apiClient.getCaseTimeline(caseId),
      apiClient.getCaseEvidence(caseId)
    ])
      .then(([cRes, dRes, tRes, eRes]) => {
        setCaseDetail(cRes);
        setDossier(dRes);
        setTimeline(tRes);
        setEvidenceData(eRes);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || `Failed to load case investigation for ${caseId}`);
        setLoading(false);
      });
  }, [caseId, directoryPage, directorySearch]);

  if (!caseId) {
    const recentItems = getRecentInvestigations();
    const recentCases = recentItems.filter((it) => it.type === 'case' || it.id.startsWith('CASE_'));

    // Fallback static list if API directory fails or loading
    const defaultCandidates: CaseSummaryItem[] = [
      { case_id: 'CASE_0001', crime_type: 'Extortion Racket', fir_id: 'FIR_0001', location_id: 'LOCATION_0041', status: 'UNDER_INVESTIGATION' },
      { case_id: 'CASE_0002', crime_type: 'Cyber Financial Scam', fir_id: 'FIR_0002', location_id: 'LOCATION_0012', status: 'UNDER_INVESTIGATION' },
      { case_id: 'CASE_0003', crime_type: 'Money Laundering', fir_id: 'FIR_0003', location_id: 'LOCATION_0088', status: 'UNDER_INVESTIGATION' },
      { case_id: 'CASE_0004', crime_type: 'Extortion Call Cascade', fir_id: 'FIR_0004', location_id: 'LOCATION_0015', status: 'UNDER_INVESTIGATION' },
      { case_id: 'CASE_0005', crime_type: 'Cross-Jurisdictional Fraud', fir_id: 'FIR_0005', location_id: 'LOCATION_0023', status: 'UNDER_INVESTIGATION' },
      { case_id: 'CASE_0012', crime_type: 'Financial Transfer Chain', fir_id: 'FIR_0012', location_id: 'LOCATION_0045', status: 'UNDER_INVESTIGATION' },
      { case_id: 'CASE_0025', crime_type: 'Cross-Border Syndicate Operation', fir_id: 'FIR_0025', location_id: 'LOCATION_0099', status: 'UNDER_INVESTIGATION' }
    ];

    const activeCasesList = directoryData?.cases || defaultCandidates;
    const totalCasesCount = directoryData?.total_cases || activeCasesList.length;
    const totalPages = directoryData?.total_pages || 1;
    const startNum = directoryData ? (directoryData.page - 1) * directoryData.page_size + 1 : 1;
    const endNum = directoryData ? Math.min(startNum + activeCasesList.length - 1, totalCasesCount) : activeCasesList.length;

    return (
      <div className="page-container">
        <Breadcrumbs
          items={[
            { label: 'Dashboard', onClick: () => onNavigate('dashboard') },
            { label: 'Cases to Investigate' }
          ]}
        />

        <div style={{ marginBottom: '24px' }}>
          <h1 className="page-title">
            Case Investigation Directory
          </h1>
          <p className="page-subtitle">
            Browse and search all available criminal cases to inspect FIR details, forensic event timelines, and multi-hop operational chains
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="card" style={{ marginBottom: '20px', background: '#FFFFFF', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 300px', display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '8px 12px' }}>
              <Briefcase size={16} color="var(--text-muted)" />
              <input
                type="text"
                value={directorySearch}
                onChange={(e) => {
                  setDirectorySearch(e.target.value);
                  setDirectoryPage(1);
                }}
                placeholder="Search cases by Case ID, Crime type, FIR reference, Location..."
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: '0.85rem',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
            {directorySearch && (
              <button
                onClick={() => {
                  setDirectorySearch('');
                  setDirectoryPage(1);
                }}
                className="btn btn-secondary btn-sm"
              >
                Clear Search
              </button>
            )}
          </div>
        </div>

        {/* 1. Recent Case Investigations */}
        {recentCases.length > 0 && !directorySearch && (
          <div className="card" style={{ marginBottom: '24px', background: '#FFFFFF' }}>
            <div className="card-header">
              <div className="card-title">
                <Clock size={18} color="#DC2626" />
                Recent Case Investigations ({recentCases.length})
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Previously audited case files
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              {recentCases.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onNavigate('case', item.id)}
                  style={{
                    background: 'rgba(220, 38, 38, 0.04)',
                    border: '1px solid rgba(220, 38, 38, 0.2)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(220, 38, 38, 0.08)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(220, 38, 38, 0.04)')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Briefcase size={16} color="#DC2626" />
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>
                        {item.id}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {item.name !== item.id ? item.name : 'Investigated Case'}
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={14} color="#DC2626" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. Full Available Cases Table */}
        <div className="card" style={{ background: '#FFFFFF' }}>
          <div className="card-header">
            <div className="card-title">
              <Briefcase size={18} color="#DC2626" />
              Criminal Cases Directory
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {directoryLoading ? 'Loading cases...' : `Showing ${startNum}–${endNum} of ${totalCasesCount} cases`}
            </span>
          </div>

          {activeCasesList.length === 0 ? (
            <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              <CheckCircle2 size={32} color="#059669" style={{ margin: '0 auto 8px auto' }} />
              No cases found matching "{directorySearch}".
            </div>
          ) : (
            <>
              <div className="table-container">
                <table className="investigation-table">
                  <thead>
                    <tr>
                      <th>Case ID</th>
                      <th>Crime Type</th>
                      <th>FIR Reference</th>
                      <th>Location</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeCasesList.map((c: CaseSummaryItem) => (
                      <tr
                        key={c.case_id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => onNavigate('case', c.case_id)}
                      >
                        <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {c.case_id}
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                          {c.crime_type}
                        </td>
                        <td style={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem', color: '#2563EB' }}>
                          {c.fir_id || 'N/A'}
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          {c.location_id || 'N/A'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigate('case', c.case_id);
                            }}
                            className="btn btn-primary btn-sm"
                            style={{ background: '#DC2626', borderColor: '#DC2626' }}
                          >
                            Investigate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '16px',
                    marginTop: '16px',
                    borderTop: '1px solid var(--border-subtle)',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}
                >
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Page {directoryPage} of {totalPages}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      disabled={directoryPage <= 1}
                      onClick={() => setDirectoryPage((p) => Math.max(1, p - 1))}
                      className="btn btn-secondary btn-sm"
                      style={{ opacity: directoryPage <= 1 ? 0.5 : 1, cursor: directoryPage <= 1 ? 'not-allowed' : 'pointer' }}
                    >
                      Previous
                    </button>

                    {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                      let pNum = directoryPage - 2 + idx;
                      if (pNum < 1) pNum = idx + 1;
                      if (pNum > totalPages) return null;
                      return (
                        <button
                          key={pNum}
                          onClick={() => setDirectoryPage(pNum)}
                          className={`btn btn-sm ${directoryPage === pNum ? 'btn-primary' : 'btn-secondary'}`}
                          style={directoryPage === pNum ? { background: '#DC2626', borderColor: '#DC2626' } : {}}
                        >
                          {pNum}
                        </button>
                      );
                    })}

                    <button
                      disabled={directoryPage >= totalPages}
                      onClick={() => setDirectoryPage((p) => Math.min(totalPages, p + 1))}
                      className="btn btn-secondary btn-sm"
                      style={{ opacity: directoryPage >= totalPages ? 0.5 : 1, cursor: directoryPage >= totalPages ? 'not-allowed' : 'pointer' }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="state-container" style={{ height: '70vh' }}>
        <div className="spinner" />
        <div style={{ color: 'var(--text-secondary)' }}>
          Retrieving Case Dossier & Dynamic Operational Hierarchy for {caseId}...
        </div>
      </div>
    );
  }

  if (error || !caseDetail || !dossier) {
    return (
      <div className="page-container">
        <Breadcrumbs
          items={[
            { label: 'Dashboard', onClick: () => onNavigate('dashboard') },
            { label: 'Cases' },
            { label: caseId }
          ]}
          onBack={() => onNavigate('dashboard')}
        />
        <div className="error-banner">
          <AlertTriangle size={20} />
          <div>{error || `Case '${caseId}' not found.`}</div>
        </div>
      </div>
    );
  }

  // Flatten evidence by category for the evidence panel
  const allEvidenceItems = evidenceData
    ? Object.values(evidenceData.evidence_by_category).flat()
    : [];

  return (
    <div className="page-container">
      {/* Clickable Breadcrumbs & Back button */}
      <Breadcrumbs
        items={[
          { label: 'Dashboard', onClick: () => onNavigate('dashboard') },
          { label: 'Cases', onClick: () => onNavigate('cases') },
          { label: caseDetail.case_id }
        ]}
        onBack={() => onNavigate('dashboard')}
      />

      {/* Investigation Header */}
      <InvestigationHeader
        entityId={caseDetail.case_id}
        title={`Criminal Case File: ${caseDetail.case_id}`}
        subtitle={`Offense Category: ${caseDetail.crime_type} • FIR: ${caseDetail.fir_information.fir_id || 'N/A'}`}
        roleOrStatus={caseDetail.status}
        confidence={dossier.confidence}
        metrics={[
          { label: 'FIR Section', value: caseDetail.fir_information.section || 'N/A' },
          { label: 'FIR Date', value: caseDetail.fir_information.date || 'N/A' },
          { label: 'Location', value: caseDetail.fir_information.location_id || 'N/A' },
          { label: 'Timeline Events', value: timeline?.events.length || 0 }
        ]}
      />

      {/* Case Narrative */}
      <div className="card" style={{ marginBottom: '24px', background: '#FFFFFF' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
          Investigator Summary Narrative
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {caseDetail.investigation_narrative}
        </p>
      </div>

      {/* Dynamic Operational Chain Diagram */}
      <div style={{ marginBottom: '28px' }}>
        <OperationalChain
          chain={dossier.operational_chain}
          coordinator={dossier.upstream_coordinator}
          brokers={dossier.brokers}
          operationalMembers={dossier.operational_members}
          onSelectNode={(id) => {
            if (id.startsWith('PERSON_')) onNavigate('person', id);
            else if (id.startsWith('CASE_')) onNavigate('case', id);
          }}
        />
      </div>

      {/* Key Actors Summary Card */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '16px',
        marginBottom: '28px'
      }}>
        {/* Coordinator */}
        <div className="card" style={{ borderLeft: '4px solid #7C3AED' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Crown size={16} color="#7C3AED" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Upstream Coordinator
            </span>
          </div>
          {dossier.upstream_coordinator ? (
            <button
              onClick={() => onNavigate('person', dossier.upstream_coordinator!)}
              style={{
                background: 'transparent',
                border: 'none',
                fontFamily: 'JetBrains Mono',
                fontSize: '1.15rem',
                fontWeight: 700,
                color: '#7C3AED',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              {dossier.upstream_coordinator}
            </button>
          ) : (
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>None / Direct</div>
          )}
        </div>

        {/* Brokers */}
        <div className="card" style={{ borderLeft: '4px solid #D97706' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <GitBranch size={16} color="#D97706" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Intermediary Brokers ({dossier.brokers.length})
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {dossier.brokers.length > 0 ? (
              dossier.brokers.map((b) => (
                <button
                  key={b}
                  onClick={() => onNavigate('person', b)}
                  style={{
                    fontSize: '0.8rem',
                    fontFamily: 'JetBrains Mono',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'var(--role-broker-bg)',
                    border: '1px solid var(--role-broker-border)',
                    color: '#D97706',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  {b}
                </button>
              ))
            ) : (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>None</span>
            )}
          </div>
        </div>

        {/* Operational Members */}
        <div className="card" style={{ borderLeft: '4px solid #DC2626' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Target size={16} color="#DC2626" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Operational Members ({dossier.operational_members.length})
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {dossier.operational_members.length > 0 ? (
              dossier.operational_members.map((m) => (
                <button
                  key={m}
                  onClick={() => onNavigate('person', m)}
                  style={{
                    fontSize: '0.8rem',
                    fontFamily: 'JetBrains Mono',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'var(--role-operative-bg)',
                    border: '1px solid var(--role-operative-border)',
                    color: '#DC2626',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  {m}
                </button>
              ))
            ) : (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>None</span>
            )}
          </div>
        </div>
      </div>

      {/* Timeline & Evidence Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '24px' }}>
        {timeline && <Timeline events={timeline.events} />}
        <EvidencePanel evidence={allEvidenceItems} title={`Traceable Records for ${caseDetail.case_id}`} />
      </div>
    </div>
  );
};

