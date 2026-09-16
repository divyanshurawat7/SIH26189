import React, { useEffect, useState } from 'react';
import {
  Clock,
  AlertOctagon
} from 'lucide-react';
import { apiClient } from '../api/client';
import type { FindingSummaryResponse, CaseTimelineResponse } from '../api/types';

interface TimelinePatternViewProps {
  onNavigate: (type: string, id?: string) => void;
  caseId?: string;
}

export const TimelinePatternView: React.FC<TimelinePatternViewProps> = ({
  onNavigate,
  caseId = 'CASE_0001'
}) => {
  const [timeline, setTimeline] = useState<CaseTimelineResponse | null>(null);
  const [findings, setFindings] = useState<FindingSummaryResponse[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [patternTypeFilter, setPatternTypeFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiClient.getCaseTimeline(caseId).catch(() => null),
      apiClient.getFindings({ min_confidence: 0.80 }).catch(() => [])
    ])
      .then(([timelineRes, findingsRes]) => {
        setTimeline(timelineRes);
        setFindings(findingsRes || []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [caseId]);

  if (loading) {
    return (
      <div className="page-container" style={{ padding: '60px 24px', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        <div style={{ color: 'var(--text-secondary)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
          RECONSTRUCTING FORENSIC TIMELINE & SCANNING BEHAVIORAL ANOMALIES...
        </div>
      </div>
    );
  }

  const filteredEvents = timeline?.events.filter((ev) => {
    if (selectedCategory === 'ALL') return true;
    return ev.event_type.toUpperCase().includes(selectedCategory);
  }) || [];

  const filteredFindings = findings.filter((f) => {
    if (!patternTypeFilter) return true;
    return f.finding_type.toLowerCase().includes(patternTypeFilter.toLowerCase()) ||
           f.narrative.toLowerCase().includes(patternTypeFilter.toLowerCase());
  });

  return (
    <div className="page-container">
      {/* Top Workstation Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="stamp stamp-accent">FORENSIC CHRONOLOGY & ANOMALIES</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              DOCKET REF: {caseId}
            </span>
          </div>
          <h1 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Timeline Sequence & Behavioral Pattern Detection
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => onNavigate('graph')}
            className="btn btn-sm btn-primary"
          >
            Correlate with Graph Canvas
          </button>
        </div>
      </div>

      {/* Behavioral Pattern Anomaly Alerts Deck */}
      <div className="panel" style={{ borderLeft: '3px solid var(--alert-amber)' }}>
        <div className="panel-header" style={{ backgroundColor: 'var(--bg-surface-elevated)' }}>
          <div className="panel-title">
            <AlertOctagon size={14} color="var(--alert-amber)" />
            <span>Detected Behavioral Pattern Anomalies ({filteredFindings.length} Detections)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="text"
              placeholder="Filter anomalies..."
              value={patternTypeFilter}
              onChange={(e) => setPatternTypeFilter(e.target.value)}
              className="input-terminal"
              style={{ padding: '2px 8px', fontSize: '10px', width: '150px', height: '22px' }}
            />
            <span className="stamp stamp-warning">HIGH THREAT ANOMALIES</span>
          </div>
        </div>

        <div className="panel-body" style={{ padding: '12px 16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '10px' }}>
            {filteredFindings.slice(0, 4).map((f) => (
              <div
                key={f.finding_id}
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span className="data-id" style={{ fontWeight: 600, fontSize: '11px' }}>{f.finding_id}</span>
                  <span className="stamp stamp-alert">CONF: {(f.confidence * 100).toFixed(0)}%</span>
                </div>

                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  {f.finding_type.replace(/_/g, ' ').toUpperCase()}
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: '6px' }}>
                  {f.narrative}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  <span>PROVENANCE: {f.evidence_sources?.join(', ') || 'CDR_RECORDS · FINANCIAL'}</span>
                  <span style={{ color: 'var(--text-primary)' }}>ENTITIES: {f.entities.length}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chronological Evidence Sequence Ledger */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <Clock size={14} color="#94A3B8" />
            <span>Chronological Event Ledger ({filteredEvents.length} Events)</span>
          </div>

          {/* Category Filter Chips */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {['ALL', 'CDR', 'FINANCIAL', 'VEHICLE', 'FIR'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : ''}`}
                style={{ padding: '2px 8px', fontSize: '10px' }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp (UTC)</th>
                <th>Category</th>
                <th>Source Record ID</th>
                <th>Entities Linked</th>
                <th>Location / Checkpoint</th>
                <th>Forensic Event Narrative</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    NO FORENSIC EVENTS RECORDED IN THIS TIME WINDOW
                  </td>
                </tr>
              ) : (
                filteredEvents.map((ev, idx) => (
                  <tr key={idx}>
                    <td>
                      <span className="data-timestamp">{ev.timestamp || '2024-03-14 10:00:00'}</span>
                    </td>
                    <td>
                      <span className="stamp">{ev.event_type}</span>
                    </td>
                    <td>
                      <span className="data-id">{ev.source_record_id || `EV_${idx + 1}`}</span>
                    </td>
                    <td>
                      <span className="data-mono" style={{ fontSize: '11px' }}>
                        {ev.entities?.join(', ') || 'CASE_0001'}
                      </span>
                    </td>
                    <td>
                      <span className="data-coord">{ev.location || 'LOCATION_0041'}</span>
                    </td>
                    <td style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {ev.description}
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
