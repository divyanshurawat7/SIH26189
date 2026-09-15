import React, { useEffect, useState } from 'react';
import {
  Crown,
  GitBranch,
  Target,
  FileText,
  MapPin,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { apiClient } from '../api/client';
import type {
  CaseDetailResponse,
  InvestigationDossierResponse,
  CaseTimelineResponse,
  CaseEvidenceResponse
} from '../api/types';
import { OperationalChain } from '../components/OperationalChain';
import { Timeline } from '../components/Timeline';
import { EvidencePanel } from '../components/EvidencePanel';

interface CaseInvestigationProps {
  caseId: string;
  onNavigate: (type: 'person' | 'case', id: string) => void;
}

export const CaseInvestigation: React.FC<CaseInvestigationProps> = ({
  caseId,
  onNavigate
}) => {
  const [caseDetail, setCaseDetail] = useState<CaseDetailResponse | null>(null);
  const [dossier, setDossier] = useState<InvestigationDossierResponse | null>(null);
  const [timeline, setTimeline] = useState<CaseTimelineResponse | null>(null);
  const [evidenceData, setEvidenceData] = useState<CaseEvidenceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, [caseId]);

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
        <div className="error-banner">
          <AlertTriangle size={20} />
          <div>{error}</div>
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
      {/* Case Header Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{
                fontFamily: 'JetBrains Mono',
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'var(--text-primary)'
              }}>
                {caseDetail.case_id}
              </span>

              <span className="badge badge-case">
                {caseDetail.crime_type}
              </span>

              <span className="badge badge-info">
                Status: {caseDetail.status}
              </span>
            </div>

            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Criminal Case File: {caseDetail.case_id}
            </h1>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {caseDetail.fir_information.fir_id && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={14} color="#F87171" />
                  FIR: <strong>{caseDetail.fir_information.fir_id}</strong>
                  {caseDetail.fir_information.section && <span>(Section {caseDetail.fir_information.section})</span>}
                </div>
              )}

              {caseDetail.fir_information.date && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={14} color="#60A5FA" />
                  Date: <strong>{caseDetail.fir_information.date}</strong>
                </div>
              )}

              {caseDetail.fir_information.location_id && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={14} color="#10B981" />
                  Location: <strong>{caseDetail.fir_information.location_id}</strong>
                </div>
              )}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Dossier Confidence
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#34D399' }}>
              {(dossier.confidence * 100).toFixed(0)}%
            </div>
          </div>
        </div>

        {/* Narrative Box */}
        <div style={{
          marginTop: '16px',
          padding: '14px 16px',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--border-subtle)',
          fontSize: '0.9rem',
          color: 'var(--text-primary)',
          lineHeight: 1.5
        }}>
          {caseDetail.investigation_narrative}
        </div>
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
        <div className="card" style={{ borderLeft: '4px solid #A855F7' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Crown size={16} color="#C084FC" />
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
                color: '#C084FC',
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
        <div className="card" style={{ borderLeft: '4px solid #F59E0B' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <GitBranch size={16} color="#FBBF24" />
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
                    background: 'rgba(245,158,11,0.15)',
                    border: '1px solid rgba(245,158,11,0.3)',
                    color: '#FDE68A',
                    cursor: 'pointer'
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
        <div className="card" style={{ borderLeft: '4px solid #EF4444' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Target size={16} color="#F87171" />
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
                    background: 'rgba(239,68,68,0.15)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    color: '#FECACA',
                    cursor: 'pointer'
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
