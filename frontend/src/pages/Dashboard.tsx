import React, { useEffect, useState } from 'react';
import {
  Users,
  Briefcase,
  Network,
  AlertTriangle,
  Crown,
  Sparkles,
  TrendingUp,
  Clock,
  Activity,
  ArrowRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { apiClient } from '../api/client';
import type { OverviewResponse, HealthResponse } from '../api/types';
import { getRecentInvestigations, type RecentItem } from '../utils/storage';

interface DashboardProps {
  onNavigate: (type: 'flagship' | 'person' | 'case' | 'findings' | 'cross-case' | 'persons' | 'cases' | string, id?: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    Promise.all([
      apiClient.getOverview(),
      apiClient.getHealth().catch(() => null)
    ])
      .then(([overviewRes, healthRes]) => {
        setData(overviewRes);
        setHealth(healthRes);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load intelligence overview');
        setLoading(false);
      });

    setRecentItems(getRecentInvestigations());
  }, []);

  if (loading) {
    return (
      <div className="state-container" style={{ height: '70vh' }}>
        <div className="spinner" />
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Initializing Investigation Command Center & Graph Engine...
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
              Ensure Uvicorn is running: <code style={{ color: '#991B1B' }}>uvicorn src.api:app --reload</code>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="page-title">
            Investigation Command Center
          </h1>
          <p className="page-subtitle">
            AI-powered criminal network intelligence, evidence traceability, and multi-hop graph analysis
          </p>
        </div>

        <button
          onClick={() => onNavigate('flagship')}
          className="btn btn-secondary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Sparkles size={14} color="#7C3AED" />
          Featured Demo (CASE_0001)
        </button>
      </div>

      {/* 1 & 2. Hero Global Search Prompt & Start Investigation Actions */}
      <div className="card" style={{ marginBottom: '24px', background: '#FFFFFF', border: '1px solid var(--border-subtle)', padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={18} color="#2563EB" />
              Start Investigation
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Search for any person, case, or network ID above, or choose an investigation domain below:
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => onNavigate('persons')}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Users size={16} />
              Investigate Person
            </button>

            <button
              onClick={() => onNavigate('cases')}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#DC2626', borderColor: '#DC2626' }}
            >
              <Briefcase size={16} />
              Investigate Case
            </button>

            <button
              onClick={() => onNavigate('cross-case')}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Network size={16} color="#2563EB" />
              Explore Network
            </button>
          </div>
        </div>
      </div>

      {/* 3. System Overview Metrics Grid */}
      <div className="metrics-grid" style={{ marginBottom: '24px' }}>
        <div className="metric-tile">
          <div className="metric-icon" style={{ color: '#2563EB' }}>
            <Users size={22} />
          </div>
          <div>
            <div className="metric-value">{data.total_persons.toLocaleString()}</div>
            <div className="metric-label">Total Persons</div>
          </div>
        </div>

        <div className="metric-tile">
          <div className="metric-icon" style={{ color: '#DC2626' }}>
            <Briefcase size={22} />
          </div>
          <div>
            <div className="metric-value">{data.total_cases.toLocaleString()}</div>
            <div className="metric-label">Total Cases</div>
          </div>
        </div>

        <div className="metric-tile">
          <div className="metric-icon" style={{ color: '#7C3AED' }}>
            <Network size={22} />
          </div>
          <div>
            <div className="metric-value">{data.total_networks}</div>
            <div className="metric-label">Identified Networks</div>
          </div>
        </div>

        <div className="metric-tile">
          <div className="metric-icon" style={{ color: '#D97706' }}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <div className="metric-value">{data.total_findings.toLocaleString()}</div>
            <div className="metric-label">Behavioral Findings</div>
          </div>
        </div>
      </div>

      {/* 4. Recent Investigations (from localStorage) */}
      {recentItems.length > 0 && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <div className="card-title">
              <Clock size={17} color="#2563EB" />
              Recent Investigations
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Last {recentItems.length} items viewed
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            {recentItems.map((item) => (
              <div
                key={item.id}
                onClick={() => onNavigate(item.type, item.id)}
                style={{
                  background: 'var(--bg-panel)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'background 0.15s, border-color 0.15s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(37,99,235,0.3)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
              >
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>
                    {item.id}
                  </div>
                  {item.name !== item.id && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.name}
                    </div>
                  )}
                </div>
                <ArrowRight size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5 & 6. Two Column Layout: High-Confidence Detections & Influencers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        {/* 5. High-Confidence Behavioral Patterns */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <TrendingUp size={18} color="#2563EB" />
              High-Confidence Intelligence Patterns
            </div>
            <button
              onClick={() => onNavigate('findings')}
              className="btn btn-secondary btn-sm"
            >
              View All ({data.total_findings})
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {data.recent_activity.slice(0, 5).map((item) => (
              <div
                key={item.finding_id}
                onClick={() => onNavigate('findings')}
                style={{
                  background: 'var(--bg-panel)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px',
                  cursor: 'pointer',
                  transition: 'background 0.15s, border-color 0.15s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(37, 99, 235, 0.3)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      background: 'rgba(37, 99, 235, 0.08)',
                      color: '#2563EB',
                      border: '1px solid rgba(37, 99, 235, 0.25)'
                    }}>
                      {item.pattern_type}
                    </span>
                    {item.case_id && (
                      <span style={{ fontSize: '0.75rem', fontFamily: 'JetBrains Mono', color: '#DC2626' }}>
                        {item.case_id}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#059669' }}>
                    {(item.confidence * 100).toFixed(0)}% Conf
                  </span>
                </div>

                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }}>
                  {item.narrative}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 6. Key Criminal Influencers Table */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-header">
            <div className="card-title">
              <Crown size={18} color="#D97706" />
              Key Criminal Influencers & Centrality
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Top Central Entities
            </span>
          </div>

          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table className="investigation-table" style={{ width: '100%', tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ width: '32%' }}>Person</th>
                  <th style={{ width: '30%' }}>Role</th>
                  <th style={{ width: '16%' }}>Conf</th>
                  <th style={{ width: '10%' }}>Deg</th>
                  <th style={{ width: '12%', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.top_influencers.slice(0, 6).map((inf) => (
                  <tr key={inf.person_id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {inf.person_id}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                      }`} style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                        {inf.predicted_role === 'UPSTREAM_COORDINATOR' ? 'COORDINATOR' : inf.predicted_role}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: '#059669', fontSize: '0.8rem' }}>
                        {(inf.confidence * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td style={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem' }}>
                      {inf.degree}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => onNavigate('person', inf.person_id)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '2px 8px', fontSize: '0.75rem' }}
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
      </div>

      {/* 7. Compact Featured Demo Investigation Card */}
      <div className="card" style={{
        marginBottom: '24px',
        padding: '16px 20px',
        borderLeft: '4px solid #7C3AED',
        background: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '1 1 300px' }}>
          <div style={{
            background: 'rgba(124,58,237,0.1)',
            borderRadius: 'var(--radius-md)',
            padding: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Crown size={20} color="#7C3AED" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-coordinator" style={{ fontSize: '0.7rem' }}>
                Featured Demo Case
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                CASE_0001
              </span>
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
              Upstream Coordinator Isolation Demo (PERSON_1476)
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Optional reference walkthrough demonstrating 5-hop mastermind unmasking (0 crime scene edges).
            </div>
          </div>
        </div>

        <button
          onClick={() => onNavigate('flagship')}
          className="btn btn-secondary btn-sm"
          style={{ height: '36px', padding: '0 16px', fontWeight: 600, color: '#7C3AED', borderColor: 'rgba(124,58,237,0.3)' }}
        >
          View Demo Investigation
        </button>
      </div>

      {/* 8. System Status Banner */}
      <div className="card" style={{ background: '#FFFFFF' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Activity size={18} color="#059669" />
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                System Status: {health ? health.service : 'SIH26189 Engine Ready'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Dataset: {health ? health.dataset : 'synthetic'} • Pipeline: Phase 1–6 Operational
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="badge badge-innocent" style={{ textTransform: 'none', fontSize: '0.75rem' }}>
              <ShieldCheck size={12} />
              11 Source Evidence Categories Live
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

