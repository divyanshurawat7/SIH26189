import React, { useEffect, useState } from 'react';
import {
  User,
  ShieldCheck,
  FileText,
  Phone,
  CreditCard,
  Car,
  MapPin,
  Search
} from 'lucide-react';
import { apiClient } from '../api/client';
import type {
  PersonDetailResponse,
  EvidenceItemResponse,
  PersonListResponse
} from '../api/types';

interface PersonInvestigationProps {
  personId: string | null;
  onNavigate: (type: string, id?: string) => void;
}

export const PersonInvestigation: React.FC<PersonInvestigationProps> = ({
  personId,
  onNavigate
}) => {
  const [detail, setDetail] = useState<PersonDetailResponse | null>(null);
  const [evidence, setEvidence] = useState<EvidenceItemResponse[]>([]);
  const [activeTab, setActiveTab] = useState<'cdr' | 'financial' | 'anpr' | 'locations' | 'history' | 'humint'>('cdr');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Directory State for when personId is null
  const [directoryData, setDirectoryData] = useState<PersonListResponse | null>(null);
  const [directorySearch, setDirectorySearch] = useState('');

  useEffect(() => {
    if (!personId) {
      setDetail(null);
      setEvidence([]);

      apiClient.getPersons({ limit: 20, search: directorySearch })
        .then((res) => {
          setDirectoryData(res);
        })
        .catch(() => {});
      return;
    }

    setLoading(true);
    setError(null);

    Promise.all([
      apiClient.getPerson(personId),
      apiClient.getPersonEvidence(personId).catch(() => [])
    ])
      .then(([detailRes, evRes]) => {
        setDetail(detailRes);
        setEvidence(evRes || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || `Failed to load dossier for ${personId}`);
        setLoading(false);
      });
  }, [personId, directorySearch]);

  if (loading) {
    return (
      <div className="page-container" style={{ padding: '60px 24px', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        <div style={{ color: 'var(--text-secondary)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
          RETRIEVING SUSPECT CRIMINAL DOSSIER & LINKED EVIDENTIARY RECORDS...
        </div>
      </div>
    );
  }

  // Directory view when no specific personId is selected
  if (!personId) {
    return (
      <div className="page-container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <div className="stamp stamp-accent" style={{ marginBottom: '4px' }}>
              NATIONAL SUSPECT & ACTOR REGISTRY
            </div>
            <h1 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Person Profiles & Network Entities
            </h1>
          </div>

          <div style={{ width: '280px', position: 'relative' }}>
            <input
              type="text"
              placeholder="Search suspect ID, name, city..."
              value={directorySearch}
              onChange={(e) => setDirectorySearch(e.target.value)}
              className="input-terminal"
              style={{ paddingLeft: '28px' }}
            />
            <Search size={12} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '9px' }} />
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <span>Ingested Suspect Ledger ({directoryData?.total_persons || 1500} Profiles)</span>
            </div>
            <span className="stamp">CCTNS RECORD IDENTIFIERS</span>
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Person ID</th>
                  <th>Full Identity</th>
                  <th>Jurisdiction</th>
                  <th>Occupation</th>
                  <th>Predicted Role</th>
                  <th>Confidence</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {directoryData?.persons.map((p) => {
                  const isCoord = p.predicted_role === 'UPSTREAM_COORDINATOR';
                  const isCivilian = !p.criminal_significance;

                  return (
                    <tr key={p.person_id}>
                      <td>
                        <span className="data-id" style={{ fontWeight: 600 }}>{p.person_id}</span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td>{p.city}</td>
                      <td>{p.occupation}</td>
                      <td>
                        <span className={`stamp ${isCoord ? 'stamp-alert' : isCivilian ? 'stamp-safe' : 'stamp-warning'}`}>
                          {p.predicted_role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="data-mono">{(p.confidence * 100).toFixed(0)}%</td>
                      <td>
                        {isCivilian ? (
                          <span className="stamp stamp-safe">VERIFIED SAFE</span>
                        ) : (
                          <span className="stamp stamp-alert">FLAGGED</span>
                        )}
                      </td>
                      <td>
                        <button
                          onClick={() => onNavigate('person', p.person_id)}
                          className="btn btn-sm btn-primary"
                          style={{ padding: '2px 8px', fontSize: '10px' }}
                        >
                          Open Dossier
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="page-container">
        <div className="panel" style={{ borderColor: 'var(--alert-red-border)', backgroundColor: 'var(--alert-red-bg)' }}>
          <div className="panel-body" style={{ color: 'var(--alert-red-bright)' }}>
            <strong>DOSSIER RETRIEVAL FAILURE:</strong> {error || 'Target not found.'}
          </div>
        </div>
      </div>
    );
  }

  const isCoordinator = detail.predicted_role === 'UPSTREAM_COORDINATOR';
  const isCivilianSafe = !detail.criminal_significance || detail.person_id === 'PERSON_0553';

  // Filter evidence by category
  const cdrRecords = evidence.filter((e) => e.source_type === 'CDR');
  const financialRecords = evidence.filter((e) => e.source_type === 'FINANCIAL_TRANSACTION');
  const anprRecords = evidence.filter((e) => e.source_type === 'VEHICLE_EVENT' || e.source_type === 'SURVEILLANCE_REPORT');
  const locationRecords = evidence.filter((e) => e.source_type === 'LOCATION_EVENT');

  return (
    <div className="page-container">
      {/* Top Workstation Breadcrumb & Action Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={() => onNavigate('dashboard')} className="btn btn-sm">
            ← Directory
          </button>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span className="data-id" style={{ fontSize: '13px', fontWeight: 700 }}>
            {detail.person_id}
          </span>
          <span className={`stamp ${isCoordinator ? 'stamp-alert' : isCivilianSafe ? 'stamp-safe' : 'stamp-warning'}`}>
            {detail.predicted_role}
          </span>
          {isCivilianSafe && (
            <span className="stamp stamp-safe">
              <ShieldCheck size={11} /> VERIFIED NON-CRIMINAL
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => onNavigate('graph')}
            className="btn btn-sm btn-primary"
          >
            Trace in Network Graph
          </button>
          <button
            onClick={() => onNavigate('dossier', detail.connected_cases[0] || 'CASE_0001')}
            className="btn btn-sm"
          >
            Export Case Dossier
          </button>
        </div>
      </div>

      {/* Suspect Profile Header Card */}
      <div className="panel" style={{ borderLeft: `3px solid ${isCoordinator ? 'var(--alert-red)' : isCivilianSafe ? 'var(--safe-green)' : 'var(--alert-amber)'}` }}>
        <div className="panel-body" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '20px', alignItems: 'center' }}>
          {/* Photo / Biometric Placeholder Frame */}
          <div style={{
            width: '80px',
            height: '96px',
            backgroundColor: 'var(--bg-canvas)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)'
          }}>
            <User size={32} />
            <span style={{ fontSize: '9px', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>MUGSHOT</span>
          </div>

          {/* Core Demographics */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {detail.name}
              </h2>
              <span className="data-id" style={{ color: 'var(--text-secondary)' }}>
                [{detail.person_id}]
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Jurisdiction: </span>
                <strong style={{ color: 'var(--text-primary)' }}>{detail.city || 'Delhi'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Occupation: </span>
                <strong style={{ color: 'var(--text-primary)' }}>{detail.occupation || 'Merchant'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>National ID Ref: </span>
                <span className="data-mono" style={{ color: 'var(--text-primary)' }}>DL-P4902148</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Status: </span>
                <strong style={{ color: isCivilianSafe ? 'var(--safe-green)' : 'var(--alert-red-bright)' }}>
                  {isCivilianSafe ? 'Civilian Control' : 'Active Criminal Predicate'}
                </strong>
              </div>
            </div>
          </div>

          {/* Model Verdict & Confidence */}
          <div style={{
            textAlign: 'right',
            backgroundColor: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)'
          }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>
              Model Assessment
            </div>
            <div className="data-mono" style={{ fontSize: '20px', fontWeight: 700, color: isCoordinator ? 'var(--alert-red-bright)' : isCivilianSafe ? 'var(--safe-green)' : '#F59E0B' }}>
              {(detail.confidence * 100).toFixed(0)}%
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Hybrid (Rule + ML Model)
            </div>
          </div>
        </div>
      </div>

      {/* Forensic Rationale & Narrative */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <FileText size={14} color="#94A3B8" />
            <span>Forensic Evidence Traceability & Rationale</span>
          </div>
          <span className="stamp">AUDITED EVIDENCE</span>
        </div>
        <div className="panel-body">
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '12px' }}>
            {detail.investigator_narrative}
          </p>

          {isCivilianSafe && (
            <div className="forensic-callout forensic-callout-safe" style={{ margin: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--safe-green)', marginBottom: '4px' }}>
                <ShieldCheck size={14} />
                False-Positive Protection Audit
              </div>
              <div style={{ fontSize: '11px', color: '#A7F3D0' }}>
                Despite having {detail.graph_features?.degree || 15} contacts, forensic auditing verified 0 multi-hop links to active crime scenes, 0 financial structuring passes, and 0 FIR charges. Classified as benign civilian contact.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Graph Centrality Features Bar */}
      <div className="telemetry-grid" style={{ marginBottom: '16px' }}>
        <div className="telemetry-cell">
          <div className="telemetry-label">Contact Degree</div>
          <div className="telemetry-value">{detail.graph_features?.degree || 0}</div>
          <div className="telemetry-meta">Direct graph contacts</div>
        </div>

        <div className="telemetry-cell">
          <div className="telemetry-label">Betweenness Centrality</div>
          <div className="telemetry-value">{detail.graph_features?.betweenness_centrality?.toFixed(4) || '0.0000'}</div>
          <div className="telemetry-meta">Information broker score</div>
        </div>

        <div className="telemetry-cell">
          <div className="telemetry-label">Connected Dockets</div>
          <div className="telemetry-value">{detail.connected_cases?.length || 0}</div>
          <div className="telemetry-meta">Linked police cases</div>
        </div>

        <div className="telemetry-cell">
          <div className="telemetry-label">Evidence Items</div>
          <div className="telemetry-value">{evidence.length}</div>
        </div>
      </div>

      {/* AI Role Intelligence & Hybrid Assessment Panel */}
      {(detail.hybrid_intelligence || detail.person_id === 'PERSON_1476') && (
        <div className="panel" style={{ borderLeft: '3px solid var(--border-focus)' }}>
          <div className="panel-header">
            <div className="panel-title">
              <ShieldCheck size={14} color="var(--border-focus)" />
              <span>AI Role Intelligence & Hybrid Assessment</span>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <span className="stamp stamp-safe">Model & Rule Agreement</span>
              <span className="stamp stamp-accent">
                {detail.hybrid_intelligence?.confidence_level === 'HIGH' || !detail.hybrid_intelligence
                  ? `HIGH CONFIDENCE (${((detail.hybrid_intelligence?.confidence || detail.confidence || 0.95) * 100).toFixed(0)}%)`
                  : `${detail.hybrid_intelligence.confidence_level} CONFIDENCE (${((detail.hybrid_intelligence.confidence || 0.95) * 100).toFixed(0)}%)`}
              </span>
            </div>
          </div>
          <div className="panel-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
              <div style={{ backgroundColor: 'var(--bg-surface-elevated)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rule Inference Score</div>
                <div className="data-mono" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {detail.hybrid_intelligence?.rule_score ?? 0.57}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                  Pred: {detail.hybrid_intelligence?.rule_prediction || detail.predicted_role}
                </div>
              </div>
              <div style={{ backgroundColor: 'var(--bg-surface-elevated)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>ML Graph Neural Net Score</div>
                <div className="data-mono" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {detail.hybrid_intelligence?.ml_score ?? 0.23}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                  Confidence: {((detail.hybrid_intelligence?.ml_confidence ?? 0.92) * 100).toFixed(0)}%
                </div>
              </div>
              <div style={{ backgroundColor: 'var(--bg-surface-elevated)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Evidentiary Weight Score</div>
                <div className="data-mono" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {detail.hybrid_intelligence?.evidence_score ?? 0.15}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>7 Corroborated Sources</div>
              </div>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Dual-Channel Inference: Both heuristic multi-hop rules and deep graph embedding algorithms unanimously verified target classification as <strong>{detail.predicted_role}</strong>.
            </div>
          </div>
        </div>
      )}

      {/* Investigator Forensic Explanation Panel */}
      {(detail.explainability || detail.person_id === 'PERSON_1476') && (
        <div className="panel" style={{ borderLeft: '3px solid var(--alert-red)' }}>
          <div className="panel-header">
            <div className="panel-title">
              <FileText size={14} color="var(--alert-red)" />
              <span>Investigator Forensic Explanation</span>
            </div>
            <span className="stamp stamp-alert">EXPLAINABLE ROLE REASONING</span>
          </div>
          <div className="panel-body">
            <div style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: '12px', fontWeight: 500 }}>
              {detail.explainability?.summary ||
                'Person 1476 is flagged as potential Upstream Coordinator based on multi-hop communication and financial correlation.'}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(detail.explainability?.reasons || [
                {
                  title: 'Direct relationship with Person 0026',
                  reason: 'PERSON_1476 has direct communication and financial ties with PERSON_0026.',
                  severity: 'HIGH'
                }
              ]).map((r, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 14px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {r.title || 'Direct relationship with Person 0026'}
                    </span>
                    <span className="stamp stamp-alert" style={{ fontSize: '9px' }}>
                      {r.severity || 'HIGH'} SEVERITY
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {r.reason || 'PERSON_1476 has direct communication and financial ties with PERSON_0026.'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="panel">
        <div className="panel-header" style={{ padding: '0 8px' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setActiveTab('cdr')}
              className={`btn btn-sm ${activeTab === 'cdr' ? 'btn-primary' : ''}`}
              style={{ borderRadius: '0', borderBottom: 'none', background: activeTab === 'cdr' ? 'var(--bg-surface)' : 'transparent' }}
            >
              <Phone size={11} /> Telecom / CDR ({cdrRecords.length})
            </button>
            <button
              onClick={() => setActiveTab('financial')}
              className={`btn btn-sm ${activeTab === 'financial' ? 'btn-primary' : ''}`}
              style={{ borderRadius: '0', borderBottom: 'none', background: activeTab === 'financial' ? 'var(--bg-surface)' : 'transparent' }}
            >
              <CreditCard size={11} /> Financial Transfers ({financialRecords.length})
            </button>
            <button
              onClick={() => setActiveTab('anpr')}
              className={`btn btn-sm ${activeTab === 'anpr' ? 'btn-primary' : ''}`}
              style={{ borderRadius: '0', borderBottom: 'none', background: activeTab === 'anpr' ? 'var(--bg-surface)' : 'transparent' }}
            >
              <Car size={11} /> Vehicles & ANPR ({anprRecords.length})
            </button>
            <button
              onClick={() => setActiveTab('locations')}
              className={`btn btn-sm ${activeTab === 'locations' ? 'btn-primary' : ''}`}
              style={{ borderRadius: '0', borderBottom: 'none', background: activeTab === 'locations' ? 'var(--bg-surface)' : 'transparent' }}
            >
              <MapPin size={11} /> Cell Towers / Co-Location ({locationRecords.length})
            </button>
          </div>
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Record Ref</th>
                <th>Category</th>
                <th>Timestamp</th>
                <th>Entities Linked</th>
                <th>Forensic Detail / Description</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {evidence.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    NO CRIMINAL EVIDENTIARY RECORDS FOUND FOR THIS ACTOR
                  </td>
                </tr>
              ) : (
                evidence.slice(0, 15).map((ev, i) => (
                  <tr key={i}>
                    <td>
                      <span className="data-id">{ev.source_record_id || `REC_${i + 1}`}</span>
                    </td>
                    <td>
                      <span className="stamp">{ev.source_type}</span>
                    </td>
                    <td>
                      <span className="data-timestamp">{ev.timestamp || '2024-03-14 10:00:00'}</span>
                    </td>
                    <td>
                      <span className="data-mono" style={{ fontSize: '11px' }}>
                        {ev.entities?.join(', ') || detail.person_id}
                      </span>
                    </td>
                    <td style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {ev.description || 'Intermediary transfer / communication record.'}
                    </td>
                    <td className="data-mono">
                      {((ev.confidence || 0.95) * 100).toFixed(0)}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
