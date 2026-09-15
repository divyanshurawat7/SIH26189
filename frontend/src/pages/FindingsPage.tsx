import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Filter,
  X,
  ShieldAlert
} from 'lucide-react';
import { apiClient } from '../api/client';
import type { FindingSummaryResponse, FindingDetailResponse } from '../api/types';

interface FindingsPageProps {
  onNavigate: (type: 'person' | 'case', id: string) => void;
}

export const FindingsPage: React.FC<FindingsPageProps> = ({ onNavigate }) => {
  const [findings, setFindings] = useState<FindingSummaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [caseFilter, setCaseFilter] = useState('');
  const [personFilter, setPersonFilter] = useState('');
  const [patternFilter, setPatternFilter] = useState('');
  const [minConfidence, setMinConfidence] = useState(0.80);

  // Selected finding for modal/detail inspector
  const [selectedFinding, setSelectedFinding] = useState<FindingDetailResponse | null>(null);

  const fetchFindings = () => {
    setLoading(true);
    apiClient.getFindings({
      case_id: caseFilter.trim() || undefined,
      person_id: personFilter.trim() || undefined,
      pattern_type: patternFilter.trim() || undefined,
      min_confidence: minConfidence
    })
      .then((data) => {
        setFindings(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load behavioral findings');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchFindings();
  }, [minConfidence]);

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFindings();
  };

  const handleOpenDetail = (findingId: string) => {
    apiClient.getFindingDetail(findingId)
      .then((res) => {
        setSelectedFinding(res);
      })
      .catch(() => {});
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 className="page-title">
            <AlertTriangle size={22} color="#F59E0B" />
            Suspicious Behavioral Pattern Detections
          </h1>
          <p className="page-subtitle">
            Unsupervised spatiotemporal anomalies, communication cascades, vehicle convoys, and cross-case links
          </p>
        </div>

        <span className="badge badge-info" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
          {findings.length} Matching Findings
        </span>
      </div>

      {/* Filter Control Bar */}
      <form onSubmit={handleApplyFilters} className="card" style={{ marginBottom: '24px', padding: '16px 20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px' }}>
          {/* Case Filter */}
          <div style={{ flex: '1 1 180px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Case ID
            </label>
            <input
              type="text"
              placeholder="e.g. CASE_0001"
              value={caseFilter}
              onChange={(e) => setCaseFilter(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 10px',
                color: 'var(--text-primary)',
                fontSize: '0.85rem'
              }}
            />
          </div>

          {/* Person Filter */}
          <div style={{ flex: '1 1 180px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Person ID
            </label>
            <input
              type="text"
              placeholder="e.g. PERSON_1476"
              value={personFilter}
              onChange={(e) => setPersonFilter(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 10px',
                color: 'var(--text-primary)',
                fontSize: '0.85rem'
              }}
            />
          </div>

          {/* Pattern Type Filter */}
          <div style={{ flex: '1 1 180px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Pattern Type
            </label>
            <select
              value={patternFilter}
              onChange={(e) => setPatternFilter(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 10px',
                color: 'var(--text-primary)',
                fontSize: '0.85rem'
              }}
            >
              <option value="">All Pattern Types</option>
              <option value="layered_financial_call_chain">Layered Financial & Call Chain</option>
              <option value="vehicle_convoy">Vehicle Convoy</option>
              <option value="rapid_transfer_chain">Rapid Transfer Chain</option>
              <option value="cross_case_entity_link">Cross-Case Entity Link</option>
              <option value="communication_burst">Communication Burst</option>
            </select>
          </div>

          {/* Min Confidence Slider */}
          <div style={{ flex: '1 1 200px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Min Confidence
              </label>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#34D399' }}>
                {(minConfidence * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={minConfidence}
              onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
          </div>

          {/* Submit Button */}
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button type="submit" className="btn btn-primary btn-sm" style={{ height: '34px', padding: '0 16px' }}>
              <Filter size={13} />
              Filter Findings
            </button>
          </div>
        </div>
      </form>

      {/* Findings Table */}
      <div className="card">
        {loading ? (
          <div className="state-container" style={{ padding: '40px' }}>
            <div className="spinner" />
            <div style={{ color: 'var(--text-muted)' }}>Filtering Behavioral Findings...</div>
          </div>
        ) : error ? (
          <div className="error-banner">
            <AlertTriangle size={18} />
            <div>{error}</div>
          </div>
        ) : findings.length === 0 ? (
          <div className="state-container" style={{ padding: '40px' }}>
            <div style={{ color: 'var(--text-muted)' }}>
              No suspicious findings match the selected filter criteria.
            </div>
          </div>
        ) : (
          <div className="table-container">
            <table className="investigation-table">
              <thead>
                <tr>
                  <th>Finding ID</th>
                  <th>Pattern Type</th>
                  <th>Entities Involved</th>
                  <th>Case Attachment</th>
                  <th>Score</th>
                  <th>Confidence</th>
                  <th>Records</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {findings.map((f) => (
                  <tr key={f.finding_id}>
                    <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {f.finding_id}
                    </td>

                    <td>
                      <span style={{
                        display: 'inline-block',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        background: 'rgba(59,130,246,0.15)',
                        color: '#60A5FA',
                        border: '1px solid rgba(59,130,246,0.3)'
                      }}>
                        {f.finding_type}
                      </span>
                    </td>

                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {f.entities.slice(0, 3).join(', ')}
                      {f.entities.length > 3 && ` +${f.entities.length - 3} more`}
                    </td>

                    <td>
                      {f.case ? (
                        <button
                          onClick={() => onNavigate('case', f.case!)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            fontFamily: 'JetBrains Mono',
                            fontSize: '0.8rem',
                            color: '#FB7185',
                            cursor: 'pointer'
                          }}
                        >
                          {f.case}
                        </button>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Global</span>
                      )}
                    </td>

                    <td style={{ fontFamily: 'JetBrains Mono', fontSize: '0.85rem' }}>
                      {f.score.toFixed(2)}
                    </td>

                    <td>
                      <span style={{
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: f.confidence >= 0.9 ? '#34D399' : '#FBBF24'
                      }}>
                        {(f.confidence * 100).toFixed(0)}%
                      </span>
                    </td>

                    <td style={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem' }}>
                      {f.evidence_count} recs
                    </td>

                    <td>
                      <button
                        onClick={() => handleOpenDetail(f.finding_id)}
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
        )}
      </div>

      {/* Finding Detail Modal */}
      {selectedFinding && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '85vh',
            overflowY: 'auto',
            padding: '24px',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={20} color="#F59E0B" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Finding Detail: {selectedFinding.finding_id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedFinding(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <span className="badge badge-info">{selectedFinding.finding_type}</span>
              {selectedFinding.case && <span className="badge badge-case">{selectedFinding.case}</span>}
              <span className="badge badge-coordinator">Confidence: {(selectedFinding.confidence * 100).toFixed(0)}%</span>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
              fontSize: '0.875rem',
              color: 'var(--text-primary)',
              lineHeight: 1.5,
              marginBottom: '18px'
            }}>
              {selectedFinding.narrative}
            </div>

            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px' }}>
              Supporting Evidence Records ({selectedFinding.supporting_evidence.length})
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
              {selectedFinding.supporting_evidence.map((ev, i) => (
                <div
                  key={`${ev.source_record_id}-${i}`}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 12px',
                    fontSize: '0.8rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontFamily: 'JetBrains Mono', color: '#60A5FA', fontWeight: 600 }}>
                      {ev.source_record_id}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>{ev.source_type}</span>
                  </div>
                  <div style={{ color: 'var(--text-secondary)' }}>
                    {ev.description}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedFinding(null)}
                className="btn btn-secondary"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
