import React, { useState } from 'react';
import { Layers } from 'lucide-react';
import type { EvidenceItemResponse } from '../api/types';

interface EvidencePanelProps {
  evidence: EvidenceItemResponse[];
  title?: string;
  onSelectRecord?: (recordId: string) => void;
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({
  evidence,
  title = 'Underlying Traceable Source Evidence',
  onSelectRecord
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  if (!evidence || evidence.length === 0) {
    return (
      <div style={{
        padding: '30px',
        textAlign: 'center',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        color: 'var(--text-muted)',
        fontSize: '0.875rem'
      }}>
        No traceable evidence records available for this item.
      </div>
    );
  }

  // Categories present in this evidence set
  const categories = ['ALL', ...Array.from(new Set(evidence.map(e => e.source_type)))];

  const filtered = selectedCategory === 'ALL'
    ? evidence
    : evidence.filter(e => e.source_type === selectedCategory);

  const diversityScore = new Set(evidence.map(e => e.source_type)).size;

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      padding: '24px'
    }}>
      {/* Header with Diversity Metric */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        marginBottom: '18px',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '14px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} color="#A855F7" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {title}
            </h3>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Source records establishing legal provenance without synthetic fabrication
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge badge-coordinator">
            Diversity: {diversityScore} / 11 Categories
          </span>
          <span className="badge badge-info">
            {evidence.length} Total Records
          </span>
        </div>
      </div>

      {/* Category Pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{
              fontSize: '0.75rem',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              cursor: 'pointer',
              border: selectedCategory === cat ? '1px solid #A855F7' : '1px solid var(--border-subtle)',
              background: selectedCategory === cat ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255,255,255,0.03)',
              color: selectedCategory === cat ? '#E9D5FF' : 'var(--text-secondary)',
              fontWeight: selectedCategory === cat ? 600 : 400
            }}
          >
            {cat} ({cat === 'ALL' ? evidence.length : evidence.filter(e => e.source_type === cat).length})
          </button>
        ))}
      </div>

      {/* Records Table / List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '480px', overflowY: 'auto' }}>
        {filtered.map((item, idx) => (
          <div
            key={`${item.source_record_id}-${idx}`}
            onClick={() => onSelectRecord && onSelectRecord(item.source_record_id)}
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              transition: 'border-color 0.15s, background 0.15s',
              cursor: onSelectRecord ? 'pointer' : 'default'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontFamily: 'JetBrains Mono',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#60A5FA'
                }}>
                  {item.source_record_id}
                </span>

                <span style={{
                  fontSize: '0.65rem',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'var(--text-secondary)'
                }}>
                  {item.source_type}
                </span>

                {item.case_id && (
                  <span style={{
                    fontSize: '0.65rem',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'rgba(225,29,72,0.15)',
                    color: '#FB7185'
                  }}>
                    {item.case_id}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {item.timestamp || 'N/A'}
                </span>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: item.confidence >= 0.9 ? '#34D399' : '#FBBF24'
                }}>
                  {(item.confidence * 100).toFixed(0)}% Conf
                </span>
              </div>
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
              {item.description}
            </div>

            {item.entities && item.entities.length > 0 && (
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Linked Entities: {item.entities.join(', ')}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
