import React, { useEffect, useState } from 'react';
import {
  Users,
  Briefcase,
  Network,
  AlertTriangle,
  Crown,
  Sparkles,
  TrendingUp
} from 'lucide-react';
import { apiClient } from '../api/client';
import type { OverviewResponse } from '../api/types';

interface DashboardProps {
  onNavigate: (type: 'flagship' | 'person' | 'case' | 'findings' | 'cross-case', id?: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.getOverview()
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load intelligence overview');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="state-container" style={{ height: '70vh' }}>
        <div className="spinner" />
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Loading Intelligence Ecosystem & Graph Metrics...
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '6px' }}>
          Connecting to FastAPI backend at port 8000
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="page-container">
        <div className="error-banner">
          <AlertTriangle size={20} />
          <div>
            <strong>Backend API Connection Error:</strong> {error}
            <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>
              Ensure Uvicorn is running: <code style={{ color: '#fff' }}>uvicorn src.api:app --reload</code>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">
            Criminal Intelligence Command Center
          </h1>
          <p className="page-subtitle">
            Forensic multi-hop graph intelligence, influencer discovery, and behavioral pattern analysis
          </p>
        </div>

        <button
          onClick={() => onNavigate('flagship')}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Sparkles size={16} />
          View Flagship CASE_0001
        </button>
      </div>

      {/* Primary Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-tile">
          <div className="metric-icon" style={{ color: '#60A5FA' }}>
            <Users size={22} />
          </div>
          <div>
            <div className="metric-value">{data.total_persons.toLocaleString()}</div>
            <div className="metric-label">Total Actors Profiled</div>
          </div>
        </div>

        <div className="metric-tile">
          <div className="metric-icon" style={{ color: '#EF4444' }}>
            <Briefcase size={22} />
          </div>
          <div>
            <div className="metric-value">{data.total_cases.toLocaleString()}</div>
            <div className="metric-label">Criminal Cases Indexed</div>
          </div>
        </div>

        <div className="metric-tile">
          <div className="metric-icon" style={{ color: '#A855F7' }}>
            <Network size={22} />
          </div>
          <div>
            <div className="metric-value">{data.total_networks}</div>
            <div className="metric-label">Identified Syndicates</div>
          </div>
        </div>

        <div className="metric-tile">
          <div className="metric-icon" style={{ color: '#F59E0B' }}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <div className="metric-value">{data.total_findings.toLocaleString()}</div>
            <div className="metric-label">Behavioral Findings</div>
          </div>
        </div>
      </div>

      {/* Flagship Highlight Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(37,99,235,0.12))',
        border: '1px solid rgba(168,85,247,0.3)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        marginBottom: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: 'var(--shadow-md)'
      }}>
        <div style={{ maxWidth: '800px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className="badge badge-coordinator">
              <Crown size={12} />
              FLAGSHIP MASTERMIND AUDIT
            </span>
            <span style={{ fontSize: '0.75rem', color: '#93C5FD', fontWeight: 600 }}>
              CASE_0001 • Extortion Syndicate
            </span>
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F3E8FF', marginBottom: '6px' }}>
            Upstream Coordinator PERSON_1476 Isolated & Corroborated
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#D8B4FE', lineHeight: 1.5 }}>
            Mastermind operating with <strong>0 direct edges to the crime scene</strong> and 0 FIR mentions,
            successfully unmasked through the 5-hop operational chain (PERSON_1476 → PERSON_0026 → PERSON_0397 → PERSON_0405 → PERSON_1459 → CASE_0001) backed by 7 forensic categories.
          </p>
        </div>

        <button
          onClick={() => onNavigate('flagship')}
          className="btn"
          style={{
            background: '#8B5CF6',
            color: '#FFFFFF',
            whiteSpace: 'nowrap',
            padding: '10px 20px',
            fontSize: '0.9rem',
            fontWeight: 600
          }}
        >
          Inspect 5-Hop Dossier
        </button>
      </div>

      {/* Two Column Layout: Top Influencers & Recent Findings */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '24px' }}>
        {/* Top Influencers */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Crown size={18} color="#F59E0B" />
              Key Criminal Influencers & Coordinators
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Ranked by Centrality & Role
            </span>
          </div>

          <div className="table-container">
            <table className="investigation-table">
              <thead>
                <tr>
                  <th>Person ID / Name</th>
                  <th>Predicted Role</th>
                  <th>Confidence</th>
                  <th>Degree</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.top_influencers.slice(0, 8).map((inf) => (
                  <tr key={inf.person_id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>
                        {inf.person_id}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {inf.name}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${
                        inf.predicted_role === 'UPSTREAM_COORDINATOR'
                          ? 'badge-coordinator'
                          : inf.predicted_role === 'BROKER'
                          ? 'badge-broker'
                          : inf.predicted_role === 'OPERATIONAL_MEMBER'
                          ? 'badge-operative'
                          : 'badge-financial'
                      }`}>
                        {inf.predicted_role}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: '#34D399' }}>
                        {(inf.confidence * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td style={{ fontFamily: 'JetBrains Mono' }}>
                      {inf.degree}
                    </td>
                    <td>
                      <button
                        onClick={() => onNavigate('person', inf.person_id)}
                        className="btn btn-secondary btn-sm"
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

        {/* High-Confidence Detections */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <TrendingUp size={18} color="#3B82F6" />
              High-Confidence Behavioral Patterns
            </div>
            <button
              onClick={() => onNavigate('findings')}
              className="btn btn-secondary btn-sm"
            >
              View All {data.total_findings}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.recent_activity.slice(0, 6).map((item) => (
              <div
                key={item.finding_id}
                onClick={() => onNavigate('findings')}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 16px',
                  cursor: 'pointer',
                  transition: 'background 0.15s, border-color 0.15s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      background: 'rgba(59, 130, 246, 0.15)',
                      color: '#60A5FA',
                      border: '1px solid rgba(59, 130, 246, 0.3)'
                    }}>
                      {item.pattern_type}
                    </span>
                    {item.case_id && (
                      <span style={{ fontSize: '0.75rem', fontFamily: 'JetBrains Mono', color: '#FB7185' }}>
                        {item.case_id}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#34D399' }}>
                    {(item.confidence * 100).toFixed(0)}% Conf
                  </span>
                </div>

                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {item.narrative}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
