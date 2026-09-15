import React from 'react';
import {
  BrainCircuit,
  CheckCircle2,
  AlertCircle,
  FileText
} from 'lucide-react';
import type { HybridIntelligenceData, ExplainabilityData } from '../api/types';

interface HybridIntelligenceCardProps {
  hybridData?: HybridIntelligenceData | null;
  explainabilityData?: ExplainabilityData | null;
  onNavigate?: (type: string, id?: string) => void;
}

export const HybridIntelligenceCard: React.FC<HybridIntelligenceCardProps> = ({
  hybridData,
  explainabilityData,
  onNavigate
}) => {
  if (!hybridData && !explainabilityData) {
    return null;
  }

  const confidencePct = hybridData
    ? (hybridData.confidence * 100).toFixed(0)
    : explainabilityData?.confidence
    ? (explainabilityData.confidence * 100).toFixed(0)
    : '85';

  const isAgreement = hybridData ? hybridData.agreement : true;
  const confidenceLevel = hybridData?.confidence_level || 'HIGH';

  const finalRoleDisplay = (role?: string | null) => {
    if (!role) return 'UNASSIGNED';
    return role.replace(/_/g, ' ').toUpperCase();
  };

  return (
    <div
      className="card"
      style={{
        marginBottom: '24px',
        background: '#FFFFFF',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-sm)'
      }}
    >
      {/* Header */}
      <div
        className="card-header"
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '12px',
          marginBottom: '16px'
        }}
      >
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BrainCircuit size={20} color="#2563EB" />
          <span>AI Role Intelligence & Hybrid Assessment</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isAgreement ? (
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(5, 150, 105, 0.08)',
                color: '#059669',
                border: '1px solid rgba(5, 150, 105, 0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <CheckCircle2 size={13} />
              Model & Rule Agreement
            </span>
          ) : (
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(217, 119, 6, 0.08)',
                color: '#D97706',
                border: '1px solid rgba(217, 119, 6, 0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <AlertCircle size={13} />
              Review Required (Signal Discrepancy)
            </span>
          )}

          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: 'var(--radius-full)',
              background:
                confidenceLevel === 'HIGH'
                  ? 'rgba(37, 99, 235, 0.08)'
                  : confidenceLevel === 'MEDIUM'
                  ? 'rgba(217, 119, 6, 0.08)'
                  : 'rgba(100, 116, 139, 0.08)',
              color:
                confidenceLevel === 'HIGH'
                  ? '#2563EB'
                  : confidenceLevel === 'MEDIUM'
                  ? '#D97706'
                  : '#64748B',
              border: `1px solid ${
                confidenceLevel === 'HIGH'
                  ? 'rgba(37, 99, 235, 0.25)'
                  : confidenceLevel === 'MEDIUM'
                  ? 'rgba(217, 119, 6, 0.25)'
                  : 'rgba(100, 116, 139, 0.25)'
              }`
            }}
          >
            {confidenceLevel} CONFIDENCE ({confidencePct}%)
          </span>
        </div>
      </div>

      {/* Grid: Hybrid Metrics */}
      {hybridData && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            marginBottom: '20px'
          }}
        >
          {/* Final Role */}
          <div
            style={{
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px'
            }}
          >
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Final Hybrid Role
            </div>
            <div
              style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginTop: '4px',
                fontFamily: 'JetBrains Mono'
              }}
            >
              {finalRoleDisplay(hybridData.role)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600, marginTop: '2px' }}>
              Combined Score: {(hybridData.confidence * 100).toFixed(1)}%
            </div>
          </div>

          {/* ML Prediction */}
          <div
            style={{
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px'
            }}
          >
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              ML Classifier Model
            </div>
            <div
              style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: '#2563EB',
                marginTop: '4px',
                fontFamily: 'JetBrains Mono'
              }}
            >
              {finalRoleDisplay(hybridData.ml_prediction)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Model Conf: {(hybridData.ml_confidence * 100).toFixed(1)}%
            </div>
          </div>

          {/* Rule-Based Assessment */}
          <div
            style={{
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px'
            }}
          >
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Rule-Based Engine
            </div>
            <div
              style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: '#7C3AED',
                marginTop: '4px',
                fontFamily: 'JetBrains Mono'
              }}
            >
              {finalRoleDisplay(hybridData.rule_prediction)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Rule Conf: {(hybridData.rule_confidence * 100).toFixed(1)}%
            </div>
          </div>

          {/* Evidence Strength */}
          <div
            style={{
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px'
            }}
          >
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Evidence Strength Score
            </div>
            <div
              style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: '#D97706',
                marginTop: '4px',
                fontFamily: 'JetBrains Mono'
              }}
            >
              {(hybridData.evidence_score * 100).toFixed(0)} / 100
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Multi-source corroboration
            </div>
          </div>
        </div>
      )}

      {/* Investigator Explanation Section */}
      {explainabilityData && (
        <div style={{ marginTop: '16px' }}>
          <div
            style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FileText size={16} color="#2563EB" />
            <span>Investigator Forensic Explanation</span>
          </div>

          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
            {explainabilityData.summary}
          </p>

          {/* Factual Evidence Reasons List */}
          {explainabilityData.reasons && explainabilityData.reasons.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Supporting Evidence & Factual Triggers ({explainabilityData.reasons.length})
              </div>

              {explainabilityData.reasons.map((r, i) => (
                <div
                  key={i}
                  style={{
                    background: 'var(--bg-panel)',
                    borderLeft: `3px solid ${
                      r.severity === 'HIGH' ? '#DC2626' : r.severity === 'MEDIUM' ? '#D97706' : '#2563EB'
                    }`,
                    borderRadius: '0 var(--radius-md) var(--radius-md) 0',
                    padding: '10px 14px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {r.title || r.type.replace(/_/g, ' ')}
                    </span>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background:
                          r.severity === 'HIGH'
                            ? 'rgba(220, 38, 38, 0.1)'
                            : r.severity === 'MEDIUM'
                            ? 'rgba(217, 119, 6, 0.1)'
                            : 'rgba(37, 99, 235, 0.1)',
                        color: r.severity === 'HIGH' ? '#DC2626' : r.severity === 'MEDIUM' ? '#D97706' : '#2563EB'
                      }}
                    >
                      {r.severity} SEVERITY
                    </span>
                  </div>

                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                    {r.reason || r.relationship}
                  </p>

                  {/* Connected person action link if applicable */}
                  {r.other_person && onNavigate && (
                    <div style={{ marginTop: '6px' }}>
                      <button
                        onClick={() => onNavigate('person', r.other_person!)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#2563EB',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: 0,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        Inspect {r.other_person_name ? `${r.other_person_name} (${r.other_person})` : r.other_person} →
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
