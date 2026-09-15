import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface HeaderAction {
  label: string;
  onClick: () => void;
  active?: boolean;
}

interface InvestigationHeaderProps {
  entityId: string;
  title: string;
  subtitle?: string;
  roleOrStatus: string;
  confidence?: number;
  isCriminal?: boolean;
  metrics?: { label: string; value: string | number }[];
  actions?: HeaderAction[];
}

export const InvestigationHeader: React.FC<InvestigationHeaderProps> = ({
  entityId,
  title,
  subtitle,
  roleOrStatus,
  confidence,
  isCriminal,
  metrics = [],
  actions = []
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(entityId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const getBadgeClass = (role: string) => {
    switch (role.toUpperCase()) {
      case 'UPSTREAM_COORDINATOR': return 'badge-coordinator';
      case 'BROKER': return 'badge-broker';
      case 'OPERATIONAL_MEMBER': return 'badge-operative';
      case 'FINANCIAL_FACILITATOR': return 'badge-financial';
      case 'PERIPHERAL_ASSOCIATE': return isCriminal === false ? 'badge-innocent' : 'badge-info';
      default: return 'badge-info';
    }
  };

  return (
    <div className="card" style={{
      marginBottom: '24px',
      background: '#FFFFFF',
      borderLeft: '4px solid #2563EB',
      padding: '20px 24px'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'JetBrains Mono', color: '#0F172A' }}>
              {entityId}
            </span>
            <button
              onClick={handleCopy}
              title="Copy ID"
              style={{
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '4px',
                padding: '4px 8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)'
              }}
            >
              {copied ? <Check size={12} color="#059669" /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <span className={`badge ${getBadgeClass(roleOrStatus)}`}>
              {roleOrStatus}
            </span>
            {confidence !== undefined && (
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', background: 'rgba(5,150,105,0.08)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
                {(confidence * 100).toFixed(0)}% Confidence
              </span>
            )}
          </div>

          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            {title}
          </h2>
          {subtitle && (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {subtitle}
            </p>
          )}

          {metrics.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '12px', flexWrap: 'wrap' }}>
              {metrics.map((m, idx) => (
                <div key={idx} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{m.label}: </span>
                  <strong style={{ color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>{m.value}</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        {actions.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {actions.map((act, idx) => (
              <button
                key={idx}
                onClick={act.onClick}
                className={act.active ? "btn btn-primary btn-sm" : "btn btn-secondary btn-sm"}
              >
                {act.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
