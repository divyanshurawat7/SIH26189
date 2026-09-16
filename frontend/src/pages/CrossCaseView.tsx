import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Search
} from 'lucide-react';
import { apiClient } from '../api/client';
import type { CrossCaseResponse } from '../api/types';

interface CrossCaseViewProps {
  onNavigate: (type: string, id?: string) => void;
}

export const CrossCaseView: React.FC<CrossCaseViewProps> = ({ onNavigate }) => {
  const [searchEntity, setSearchEntity] = useState('NET_001');
  const [data, setData] = useState<CrossCaseResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sampleTargets = [
    { id: 'NET_001', type: 'SYNDICATE', label: 'NET_001 (Verified Syndicate)' },
    { id: 'NET_002', type: 'SYNDICATE', label: 'NET_002 (Verified Syndicate)' },
    { id: 'LOCATION_0011', type: 'LOCATION', label: 'LOCATION_0011 (Civilian Overlap)' },
    { id: 'PERSON_0553', type: 'CIVILIAN', label: 'PERSON_0553 (Civilian Control)' }
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
      {/* Top Header */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span className="stamp stamp-accent">MULTI-JURISDICTIONAL LINKAGE</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            INTER-CASE INTELLIGENCE OVERLAP
          </span>
        </div>
        <h1 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
          Cross-Case Syndicate Coordination vs. Incidental Overlap
        </h1>
      </div>

      {/* Target Search & Preset Row */}
      <div className="panel" style={{ marginBottom: '16px' }}>
        <div className="panel-body" style={{ padding: '12px 16px' }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
              <input
                type="text"
                placeholder="Enter Target ID (e.g. NET_001, LOCATION_0011, PERSON_0553)..."
                value={searchEntity}
                onChange={(e) => setSearchEntity(e.target.value)}
                className="input-terminal"
                style={{ paddingLeft: '28px' }}
              />
              <Search size={12} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '9px' }} />
            </div>

            <button type="submit" className="btn btn-sm btn-primary">
              Run Linkage Audit
            </button>
          </form>

          {/* Quick Targets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Quick Presets:</span>
            {sampleTargets.map((target) => (
              <button
                key={target.id}
                onClick={() => {
                  setSearchEntity(target.id);
                  fetchCrossCase(target.id);
                }}
                className={`btn btn-sm ${searchEntity === target.id ? 'btn-primary' : ''}`}
                style={{ fontSize: '10px', padding: '2px 8px' }}
              >
                {target.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <div style={{ color: 'var(--text-secondary)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
            ANALYZING MULTI-JURISDICTIONAL COORDINATION GRAPH...
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="panel" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="panel-body" style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
            {error}
          </div>
        </div>
      )}

      {data && !loading && (
        <div className="panel" style={{ borderLeft: `3px solid ${isCriminalLink ? 'var(--alert-red)' : 'var(--safe-green)'}` }}>
          <div className="panel-header">
            <div className="panel-title">
              {isCriminalLink ? (
                <ShieldAlert size={14} color="var(--alert-red-bright)" />
              ) : (
                <ShieldCheck size={14} color="var(--safe-green)" />
              )}
              <span>LINKAGE VERDICT: {isCriminalLink ? 'VERIFIED CRIMINAL COORDINATION' : 'INCIDENTAL CIVILIAN OVERLAP'}</span>
            </div>
            <span className={`stamp ${isCriminalLink ? 'stamp-alert' : 'stamp-safe'}`}>
              {isCriminalLink ? 'ORGANIZED CRIME' : 'SUPPRESSED BENIGN'}
            </span>
          </div>

          <div className="panel-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>
                  Target Identifier
                </div>
                <div className="data-id" style={{ fontSize: '15px', fontWeight: 700 }}>
                  {data.entity}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>
                  Linked Investigation Dockets
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {data.connected_cases.map((c) => (
                    <button
                      key={c}
                      onClick={() => onNavigate('case', c)}
                      className="btn btn-sm"
                      style={{ padding: '2px 6px', fontSize: '10px' }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                Forensic Reasoning & Suppression Safeguard
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {data.explanation}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
