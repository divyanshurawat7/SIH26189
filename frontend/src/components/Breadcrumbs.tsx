import React from 'react';
import { ChevronRight, ArrowLeft } from 'lucide-react';

interface BreadcrumbsProps {
  items: { label: string; onClick?: () => void }[];
  onBack?: () => void;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, onBack }) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '16px',
      fontSize: '0.8rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
        {items.map((item, index) => (
          <React.Fragment key={index}>
            {index > 0 && <ChevronRight size={14} color="var(--text-muted)" />}
            {item.onClick ? (
              <button
                onClick={item.onClick}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: index === items.length - 1 ? 'var(--text-primary)' : '#2563EB',
                  fontWeight: index === items.length - 1 ? 600 : 500,
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '0.8rem'
                }}
              >
                {item.label}
              </button>
            ) : (
              <span style={{
                color: index === items.length - 1 ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: index === items.length - 1 ? 600 : 500,
                fontFamily: item.label.includes('_') ? 'JetBrains Mono' : 'inherit'
              }}>
                {item.label}
              </span>
            )}
          </React.Fragment>
        ))}
      </div>

      {onBack && (
        <button
          onClick={onBack}
          className="btn btn-secondary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={13} /> Back
        </button>
      )}
    </div>
  );
};
