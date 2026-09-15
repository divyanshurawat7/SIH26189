import React, { useState, useEffect } from 'react';
import {
  Network,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Search,
  Briefcase,
  AlertCircle
} from 'lucide-react';
import { apiClient } from '../api/client';
import type { CrossCaseResponse } from '../api/types';

interface CrossCaseViewProps {
  onNavigate: (type: 'person' | 'case', id: string) => void;
}

export const CrossCaseView: React.FC<CrossCaseViewProps> = ({ onNavigate }) => {
  const [searchEntity, setSearchEntity] = useState('NET_001');
  const [data, setData] = useState<CrossCaseResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sampleTargets = [
    { id: 'NET_001', type: 'SYNDICATE', label: 'Syndicate Network 001 (Verified)' },
    { id: 'NET_002', type: 'SYNDICATE', label: 'Syndicate Network 002 (Verified)' },
    { id: 'LOCATION_0011', type: 'LOCATION', label: 'Delhi Location 0011 (Incidental Overlap)' },
    { id: 'PERSON_0553', type: 'CIVILIAN', label: 'Civilian Control (Non-Criminal)' }
  ];

  const fetchCrossCase = (entityId: string) => {
    setLoading(true);
    setError(null);

    apiClient.getCrossCase(entityId)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || `No cross-case linkages found for '${entityId}'`);
        setData(null);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCrossCase(searchEntity);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchEntity.trim()) {
      fetchCrossCase(searchEntity.trim());
    }
  };

  const isCriminalLink = data?.strength_of_linkage === 'strong_criminal_coordination';

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 className="page-title">
          <Network size={24} color="#A855F7" />
          Multi-Jurisdictional Cross-Case Linkage Analysis
        </h1>
        <p className="page-subtitle">
          Distinguishing coordinated syndicate recurrence from routine civilian witness & geographic overlaps
        </p>
      </div>

      {/* Entity Query Bar */}
      <form onSubmit={handleSearchSubmit} className="card" style={{ marginBottom: '24px', padding: '18px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 320px', display: 'flex', alignItems: 'center', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', padding: '8px 14px', border: '1px solid var(--border-subtle)' }}>
            <Search size={16} color="var(--text-muted)" style={{ marginRight: '8px' }} />
            <input
              type="text"
              placeholder="Enter Entity ID (e.g. NET_001, ORG_0001, LOCATION_0011)..."
              value={searchEntity}
              onChange={(e) => setSearchEntity(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                width: '100%'
              }}
            />
          </div>

          <button type="submit" className="btn btn-primary">
            Analyze Cross-Case Links
          </button>
        </div>

        {/* Quick presets */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quick Presets:</span>
          {sampleTargets.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setSearchEntity(t.id);
                fetchCrossCase(t.id);
              }}
              style={{
                fontSize: '0.75rem',
                padding: '3px 8px',
                borderRadius: 'var(--radius-sm)',
                background: searchEntity === t.id ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${searchEntity === t.id ? '#A855F7' : 'var(--border-subtle)'}`,
                color: searchEntity === t.id ? '#E9D5FF' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </form>

      {/* Result Display */}
      {loading ? (
        <div className="state-container" style={{ height: '40vh' }}>
          <div className="spinner" />
          <div style={{ color: 'var(--text-muted)' }}>Evaluating Cross-Case Forensics for {searchEntity}...</div>
        </div>
      ) : error ? (
        <div className="card" style={{ padding: '36px', textAlign: 'center' }}>
          <AlertCircle size={28} color="#F59E0B" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
            No Multi-Case Criminal Connection Found
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto' }}>
            {error}. Entity does not satisfy multi-hop operational coordination or recurrence thresholds.
          </p>
        </div>
      ) : data ? (
        <div className="card" style={{
          borderLeft: `5px solid ${isCriminalLink ? '#A855F7' : '#14B8A6'}`
        }}>
          {/* Status Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {data.entity}
              </span>

              <span className={`badge ${isCriminalLink ? 'badge-coordinator' : 'badge-innocent'}`}>
                {isCriminalLink ? (
                  <>
                    <ShieldAlert size={12} />
                    Strong Criminal Syndicate Recurrence
                  </>
                ) : (
                  <>
                    <ShieldCheck size={12} />
                    Incidental Civilian / Geographic Overlap
                  </>
                )}
              </span>
            </div>

            <span className="badge badge-info">
              {data.connected_cases.length} Connected Cases
            </span>
          </div>

          {/* Explanation Banner */}
          <div style={{
            background: isCriminalLink ? 'rgba(168,85,247,0.08)' : 'rgba(20,184,166,0.08)',
            border: `1px solid ${isCriminalLink ? 'rgba(168,85,247,0.3)' : 'rgba(20,184,166,0.3)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            fontSize: '0.9rem',
            color: 'var(--text-primary)',
            lineHeight: 1.5,
            marginBottom: '24px'
          }}>
            <strong>Forensic Evaluation: </strong>
            {data.explanation}
          </div>

          {/* Connected Cases Tree */}
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '14px' }}>
            Linked Criminal Cases
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            {data.connected_cases.map((caseId) => (
              <div
                key={caseId}
                onClick={() => onNavigate('case', caseId)}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, background 0.15s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#EF4444')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Briefcase size={15} color="#F87171" />
                  <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {caseId}
                  </span>
                </div>
                <ArrowRight size={14} color="var(--text-muted)" />
              </div>
            ))}
          </div>

          {/* Supporting Evidence IDs */}
          {data.supporting_evidence && data.supporting_evidence.length > 0 && (
            <div>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                Supporting Corroboration Records
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {data.supporting_evidence.map((rid) => (
                  <span
                    key={rid}
                    style={{
                      fontFamily: 'JetBrains Mono',
                      fontSize: '0.75rem',
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(255,255,255,0.05)',
                      color: '#60A5FA',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    {rid}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
