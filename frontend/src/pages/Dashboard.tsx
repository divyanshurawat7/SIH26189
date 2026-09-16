import React, { useEffect, useState } from 'react';
import {
  FileText,
  AlertOctagon,
  GitFork,
  Shield,
  Search,
  ExternalLink
} from 'lucide-react';
import { apiClient } from '../api/client';
import type { OverviewResponse, CaseListResponse } from '../api/types';

interface DashboardProps {
  onNavigate: (type: string, id?: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [casesData, setCasesData] = useState<CaseListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [caseFilter, setCaseFilter] = useState('');

  useEffect(() => {
    Promise.all([
      apiClient.getOverview(),
      apiClient.getCases({ limit: 10 }).catch(() => null)
    ])
      .then(([overviewRes, casesRes]) => {
        setData(overviewRes);
        setCasesData(casesRes);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to initialize case directory overview.');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="page-container" style={{ padding: '60px 24px', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        <div style={{ color: 'var(--text-secondary)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
          INGESTING RELATIONAL EVIDENCE TABLES & COMPUTING GRAPH TOPOLOGY...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="page-container">
        <div className="panel" style={{ borderColor: 'var(--alert-red-border)', backgroundColor: 'var(--alert-red-bg)' }}>
          <div className="panel-body" style={{ color: 'var(--alert-red-bright)' }}>
            <strong>SYSTEM ERROR:</strong> {error || 'Backend service unavailable.'}
          </div>
        </div>
      </div>
    );
  }

  const filteredCases = casesData?.cases.filter((c) =>
    c.case_id.toLowerCase().includes(caseFilter.toLowerCase()) ||
    c.crime_type.toLowerCase().includes(caseFilter.toLowerCase()) ||
    (c.fir_id && c.fir_id.toLowerCase().includes(caseFilter.toLowerCase()))
  ) || [];

  return (
    <div className="page-container">
      {/* Workstation View Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="stamp stamp-accent">CCTNS INTEGRATED GRID</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              DATABASE TIMESTAMP: 2026-09-15 10:00:00 UTC
            </span>
          </div>
          <h1 style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>
            Case Directory & Operational Telemetry
          </h1>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => onNavigate('case', 'CASE_0001')}
            className="btn btn-sm btn-primary"
          >
            <GitFork size={12} />
            Inspect Flagship (CASE_0001)
          </button>
          <button
            onClick={() => onNavigate('dossier', 'CASE_0001')}
            className="btn btn-sm"
          >
            <FileText size={12} />
            Generate Docket Dossier
          </button>
        </div>
      </div>

      {/* Operational Telemetry Grid */}
      <div className="telemetry-grid">
        <div className="telemetry-cell">
          <div className="telemetry-label">Profiled Actors</div>
          <div className="telemetry-value">{data.total_persons.toLocaleString()}</div>
          <div className="telemetry-meta">PERSON nodes resolved</div>
        </div>

        <div className="telemetry-cell">
          <div className="telemetry-label">Active Dockets</div>
          <div className="telemetry-value">{data.total_cases.toLocaleString()}</div>
          <div className="telemetry-meta">Jurisdictional FIR files</div>
        </div>

        <div className="telemetry-cell">
          <div className="telemetry-label">Syndicate Networks</div>
          <div className="telemetry-value">{data.total_networks.toLocaleString()}</div>
          <div className="telemetry-meta">Multi-jurisdiction clusters</div>
        </div>

        <div className="telemetry-cell">
          <div className="telemetry-label">Pattern Anomalies</div>
          <div className="telemetry-value">{data.total_findings.toLocaleString()}</div>
          <div className="telemetry-meta">Temporal / spatial detections</div>
        </div>

        <div className="telemetry-cell">
          <div className="telemetry-label">Graph Entities</div>
          <div className="telemetry-value">36,151</div>
          <div className="telemetry-meta">Phones, accounts, vehicles</div>
        </div>

        <div className="telemetry-cell">
          <div className="telemetry-label">Evidence Edges</div>
          <div className="telemetry-value">133,816</div>
          <div className="telemetry-meta">CDR, ANPR, transactions</div>
        </div>
      </div>

      {/* Flagship Case Command Dossier Banner */}
      <div className="panel" style={{ borderLeft: '3px solid var(--alert-red)' }}>
        <div className="panel-header" style={{ backgroundColor: 'var(--bg-surface-elevated)' }}>
          <div className="panel-title">
            <AlertOctagon size={14} color="var(--alert-red)" />
            <span>PRIMARY DEMO DOCKET: CASE_0001 (EXTORTION SYNDICATE UNMASKING)</span>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <span className="stamp stamp-alert">CRITICAL THREAT</span>
            <span className="stamp">CONFIDENCE: 98%</span>
          </div>
        </div>
        <div className="panel-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>
              Unmasked Upstream Coordinator
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="data-id" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                PERSON_1476
              </span>
              <span className="stamp stamp-alert">COORDINATOR</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Remote mastermind operating with <strong>0 direct crime-scene edges</strong>. Corroborated via 5-hop operational chain.
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>
              Arrested Field Operative
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="data-id" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                PERSON_1459
              </span>
              <span className="stamp">ACCUSED</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Direct FIR_0001 accused at LOCATION_0041 with verified checkpoint ANPR sightings.
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '6px' }}>
            <button
              onClick={() => onNavigate('graph')}
              className="btn btn-sm btn-primary"
              style={{ width: '100%' }}
            >
              <GitFork size={12} />
              Trace 5-Hop Operational Chain
            </button>
            <button
              onClick={() => onNavigate('person', 'PERSON_1476')}
              className="btn btn-sm"
              style={{ width: '100%' }}
            >
              <ExternalLink size={12} />
              Inspect Suspect Profile (PERSON_1476)
            </button>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Active Cases Ledger & Top Influencer Roster */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(520px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        {/* Active Case Ledger Table */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <FileText size={14} color="#94A3B8" />
              <span>Active Investigation Dockets</span>
            </div>
            <div style={{ width: '180px' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Filter dockets..."
                  value={caseFilter}
                  onChange={(e) => setCaseFilter(e.target.value)}
                  className="input-terminal"
                  style={{ paddingLeft: '24px', fontSize: '11px', height: '24px' }}
                />
                <Search size={11} color="var(--text-muted)" style={{ position: 'absolute', left: '8px', top: '7px' }} />
              </div>
            </div>
          </div>

          <div className="data-table-container" style={{ maxHeight: '340px' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Docket ID</th>
                  <th>Classification</th>
                  <th>FIR Reference</th>
                  <th>Jurisdiction</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.map((c) => (
                  <tr key={c.case_id}>
                    <td>
                      <span className="data-id" style={{ fontWeight: 600 }}>{c.case_id}</span>
                    </td>
                    <td>
                      <span style={{ textTransform: 'capitalize' }}>{c.crime_type}</span>
                    </td>
                    <td>
                      <span className="data-id">{c.fir_id || 'N/A'}</span>
                    </td>
                    <td>
                      <span className="data-id" style={{ color: 'var(--text-secondary)' }}>
                        {c.location_id || 'DELHI CENTRAL'}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => onNavigate('case', c.case_id)}
                        className="btn btn-sm"
                        style={{ padding: '2px 6px', fontSize: '10px' }}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Influencers & Detected Coordinators */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <Shield size={14} color="#94A3B8" />
              <span>Priority Influencers & Coordinator Roster</span>
            </div>
            <span className="stamp">BETWEENNESS RANKED</span>
          </div>

          <div className="data-table-container" style={{ maxHeight: '340px' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Person ID</th>
                  <th>Predicted Role</th>
                  <th>Centrality</th>
                  <th>Degree</th>
                  <th>Confidence</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.top_influencers.slice(0, 10).map((inf) => {
                  const isCoord = inf.predicted_role === 'UPSTREAM_COORDINATOR';
                  const isBroker = inf.predicted_role === 'BROKER';

                  return (
                    <tr key={inf.person_id}>
                      <td>
                        <span className="data-id" style={{ fontWeight: 600 }}>{inf.person_id}</span>
                      </td>
                      <td>
                        <span className={`stamp ${isCoord ? 'stamp-alert' : isBroker ? 'stamp-warning' : ''}`}>
                          {inf.predicted_role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="data-mono" style={{ color: 'var(--text-secondary)' }}>
                        {(inf.degree * 0.0025).toFixed(4)}
                      </td>
                      <td className="data-mono">
                        {inf.degree}
                      </td>
                      <td>
                        <span className="data-mono" style={{ color: inf.confidence >= 0.9 ? 'var(--alert-red-bright)' : 'var(--text-primary)' }}>
                          {(inf.confidence * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => onNavigate('person', inf.person_id)}
                          className="btn btn-sm"
                          style={{ padding: '2px 6px', fontSize: '10px' }}
                        >
                          Dossier
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

      {/* High-Confidence Behavioral Pattern Alerts */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <AlertOctagon size={14} color="#F59E0B" />
            <span>High-Confidence Behavioral Pattern Detections</span>
          </div>
          <span className="stamp stamp-warning">THRESHOLD: CONF $\ge$ 0.85</span>
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Finding ID</th>
                <th>Pattern Classification</th>
                <th>Linked Docket</th>
                <th>Confidence</th>
                <th>Forensic Narrative & Provenance</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_activity.slice(0, 5).map((act) => (
                <tr key={act.finding_id}>
                  <td>
                    <span className="data-id">{act.finding_id}</span>
                  </td>
                  <td>
                    <span className="stamp stamp-accent">
                      {act.pattern_type.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td>
                    <span className="data-id">{act.case_id || 'CASE_0001'}</span>
                  </td>
                  <td className="data-mono" style={{ color: '#10B981', fontWeight: 600 }}>
                    {(act.confidence * 100).toFixed(0)}%
                  </td>
                  <td style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {act.narrative}
                  </td>
                  <td>
                    <button
                      onClick={() => onNavigate('timeline')}
                      className="btn btn-sm"
                      style={{ padding: '2px 6px', fontSize: '10px' }}
                    >
                      Audit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
