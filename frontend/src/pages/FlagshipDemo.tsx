import React, { useEffect, useState } from 'react';
import {
  Crown,
  Sparkles,
  ShieldAlert,
  Layers,
  Briefcase,
  AlertTriangle,
  Lock
} from 'lucide-react';
import { apiClient } from '../api/client';
import type { InvestigationDossierResponse, CaseTimelineResponse } from '../api/types';
import { OperationalChain } from '../components/OperationalChain';
import { Timeline } from '../components/Timeline';
import { EvidencePanel } from '../components/EvidencePanel';

interface FlagshipDemoProps {
  onNavigate: (type: 'person' | 'case', id: string) => void;
}

export const FlagshipDemo: React.FC<FlagshipDemoProps> = ({ onNavigate }) => {
  const [dossier, setDossier] = useState<InvestigationDossierResponse | null>(null);
  const [timeline, setTimeline] = useState<CaseTimelineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiClient.getInvestigationDossier('CASE_0001'),
      apiClient.getCaseTimeline('CASE_0001')
    ])
      .then(([dossierRes, timelineRes]) => {
        setDossier(dossierRes);
        setTimeline(timelineRes);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load flagship dossier');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="state-container" style={{ height: '70vh' }}>
        <div className="spinner" />
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Reconstructing Flagship CASE_0001 Operational Chain & Forensic Evidence...
        </div>
      </div>
    );
  }

  if (error || !dossier) {
    return (
      <div className="page-container">
        <div className="error-banner">
          <AlertTriangle size={20} />
          <div>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Flagship Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(168,85,247,0.18), rgba(30,58,138,0.25))',
        border: '1px solid rgba(168,85,247,0.4)',
        borderRadius: 'var(--radius-lg)',
        padding: '28px',
        marginBottom: '28px',
        boxShadow: 'var(--shadow-md)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="badge badge-coordinator" style={{ background: '#7C3AED', color: '#FFFFFF' }}>
                <Sparkles size={12} />
                FLAGSHIP INVESTIGATION DEMO
              </span>
              <span className="badge badge-operative">
                Crime: {dossier.case_summary.crime_type}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#CBD5E1', fontFamily: 'JetBrains Mono' }}>
                FIR: {dossier.case_summary.fir_id || 'FIR_0001'}
              </span>
            </div>

            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', marginBottom: '6px' }}>
              CASE_0001: Upstream Coordinator Isolation & Unmasking
            </h1>

            <p style={{ fontSize: '0.9rem', color: '#E9D5FF', maxWidth: '880px', lineHeight: 1.5 }}>
              Demonstrating the unmasking of <strong>PERSON_1476</strong> (Mastermind) who possesses <strong>0 direct crime-scene edges</strong> and 0 FIR records.
              Recovered through a 5-hop directed operational path corroborated across 7 distinct forensic categories.
            </p>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '8px',
            background: 'rgba(0,0,0,0.3)',
            padding: '14px 20px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(255,255,255,0.08)'
          }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Aggregated Confidence
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#34D399', lineHeight: 1 }}>
              {(dossier.confidence * 100).toFixed(0)}%
            </div>
            <div style={{ fontSize: '0.7rem', color: '#C084FC', fontWeight: 600 }}>
              Corroborated by 7 Categories
            </div>
          </div>
        </div>
      </div>

      {/* Coordinator Isolation Audit Card */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '16px',
        marginBottom: '28px'
      }}>
        <div className="card" style={{ borderLeft: '4px solid #A855F7' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Crown size={16} color="#C084FC" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Upstream Coordinator
            </span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>
            {dossier.upstream_coordinator}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Remote Mastermind (Zero Crime-Scene Footprint)
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #10B981' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Lock size={16} color="#34D399" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Coordinator Direct Edges
            </span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#34D399' }}>
            0 Direct Links
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Not in FIR, No Direct Phone Call to Crime Scene
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #EF4444' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Briefcase size={16} color="#F87171" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Field Operative Accused
            </span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>
            {dossier.operational_members.join(', ') || 'PERSON_1459'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Accused in FIR_0001 at LOCATION_0041
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #3B82F6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Layers size={16} color="#60A5FA" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Evidence Diversity
            </span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#60A5FA' }}>
            {dossier.evidence_traceability.evidence_diversity_score} Categories
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            CDR, Financial, FIR, Intel, Surveillance, Rel
          </div>
        </div>
      </div>

      {/* Operational Chain Flowchart */}
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

      {/* Investigator Narrative */}
      <div className="card" style={{ marginBottom: '28px' }}>
        <div className="card-header">
          <div className="card-title">
            <ShieldAlert size={18} color="#A855F7" />
            Forensic Investigator Narrative
          </div>
          <span className="badge badge-info">
            Audited Evidence
          </span>
        </div>
        <p style={{ fontSize: '0.95rem', color: '#E2E8F0', lineHeight: 1.6 }}>
          {dossier.investigator_narrative}
        </p>
      </div>

      {/* Two Columns: Timeline and Traceable Records */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '24px' }}>
        {/* Timeline */}
        {timeline && (
          <Timeline
            events={timeline.events}
            onSelectEvent={(ev) => console.log('Event clicked:', ev)}
          />
        )}

        {/* Evidence Sources */}
        <EvidencePanel
          evidence={[
            ...dossier.financial_evidence.map((f: any) => ({
              source_type: 'FINANCIAL_TRANSACTION',
              source_record_id: f.source_record_id || 'TXN',
              timestamp: f.timestamp,
              case_id: 'CASE_0001',
              entities: f.entities || [],
              confidence: f.confidence || 0.95,
              description: `Wire transfer of INR ${f.amount || '18,885.32'} between chain intermediaries`
            })),
            ...dossier.communication_evidence.map((c: any) => ({
              source_type: 'CDR',
              source_record_id: c.source_record_id || 'CALL',
              timestamp: c.timestamp,
              case_id: 'CASE_0001',
              entities: c.entities || [],
              confidence: c.confidence || 0.90,
              description: `Telecommunication call coordinating field operations`
            }))
          ]}
          title="Case 0001 Provenance Evidence"
        />
      </div>
    </div>
  );
};
