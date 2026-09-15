import React, { useState } from 'react';
import {
  PhoneCall,
  DollarSign,
  MapPin,
  Car,
  FileText,
  Shield,
  Eye,
  Cpu,
  Clock
} from 'lucide-react';
import type { TimelineEventItem } from '../api/types';

interface TimelineProps {
  events: TimelineEventItem[];
  onSelectEvent?: (event: TimelineEventItem) => void;
}

export const Timeline: React.FC<TimelineProps> = ({ events, onSelectEvent }) => {
  const [filterType, setFilterType] = useState<string>('ALL');

  if (!events || events.length === 0) {
    return (
      <div style={{
        padding: '36px',
        textAlign: 'center',
        background: '#FFFFFF',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        color: 'var(--text-muted)'
      }}>
        No chronological forensic events recorded for this entity.
      </div>
    );
  }

  const getCategoryMeta = (type: string) => {
    switch (type.toUpperCase()) {
      case 'CDR':
      case 'CALL':
        return { label: 'CDR Call', icon: PhoneCall, color: '#0284C7', bg: 'rgba(2, 132, 199, 0.08)', border: 'rgba(2, 132, 199, 0.3)' };
      case 'FINANCIAL_TRANSACTION':
      case 'TRANSACTION':
        return { label: 'Financial', icon: DollarSign, color: '#059669', bg: 'rgba(5, 150, 105, 0.08)', border: 'rgba(5, 150, 105, 0.3)' };
      case 'LOCATION_EVENT':
      case 'LOCATION':
        return { label: 'Location Ping', icon: MapPin, color: '#DB2777', bg: 'rgba(219, 39, 119, 0.08)', border: 'rgba(219, 39, 119, 0.3)' };
      case 'VEHICLE_EVENT':
      case 'VEHICLE':
        return { label: 'Vehicle ANPR', icon: Car, color: '#7C3AED', bg: 'rgba(124, 58, 237, 0.08)', border: 'rgba(124, 58, 237, 0.3)' };
      case 'FIR_RECORD':
      case 'FIR':
        return { label: 'FIR Filing', icon: FileText, color: '#DC2626', bg: 'rgba(220, 38, 38, 0.08)', border: 'rgba(220, 38, 38, 0.3)' };
      case 'EVIDENCE_RECORD':
      case 'EVIDENCE':
        return { label: 'Forensic Evidence', icon: Shield, color: '#D97706', bg: 'rgba(217, 119, 6, 0.08)', border: 'rgba(217, 119, 6, 0.3)' };
      case 'SURVEILLANCE_REPORT':
      case 'SURVEILLANCE':
        return { label: 'Surveillance Log', icon: Eye, color: '#2563EB', bg: 'rgba(37, 99, 235, 0.08)', border: 'rgba(37, 99, 235, 0.3)' };
      case 'INTELLIGENCE_REPORT':
      case 'INTELLIGENCE':
        return { label: 'Intel Report', icon: Cpu, color: '#7C3AED', bg: 'rgba(124, 58, 237, 0.08)', border: 'rgba(124, 58, 237, 0.3)' };
      default:
        return { label: type, icon: Clock, color: '#475569', bg: 'var(--bg-panel)', border: 'var(--border-subtle)' };
    }
  };

  const categories = ['ALL', ...Array.from(new Set(events.map(e => e.event_type)))];

  const filteredEvents = filterType === 'ALL'
    ? events
    : events.filter(e => e.event_type === filterType);

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      padding: '24px'
    }}>
      {/* Header & Filter pills */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        marginBottom: '20px',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={18} color="#2563EB" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Forensic Activity Timeline
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            ({filteredEvents.length} events)
          </span>
        </div>

        {/* Category Filter Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterType(cat)}
              style={{
                fontSize: '0.75rem',
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                cursor: 'pointer',
                border: filterType === cat ? '1px solid #2563EB' : '1px solid var(--border-subtle)',
                background: filterType === cat ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-panel)',
                color: filterType === cat ? '#2563EB' : 'var(--text-secondary)',
                fontWeight: filterType === cat ? 600 : 400
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Vertical Timeline Stream */}
      <div style={{
        position: 'relative',
        paddingLeft: '24px',
        borderLeft: '2px solid rgba(15, 23, 42, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px'
      }}>
        {filteredEvents.map((event, idx) => {
          const meta = getCategoryMeta(event.event_type);
          const Icon = meta.icon;

          return (
            <div
              key={`${event.source_record_id}-${idx}`}
              onClick={() => onSelectEvent && onSelectEvent(event)}
              style={{
                position: 'relative',
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                cursor: 'pointer',
                transition: 'border-color 0.15s, transform 0.15s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = meta.border;
                e.currentTarget.style.transform = 'translateX(4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.transform = 'none';
              }}
            >
              {/* Timeline Bullet Node */}
              <div style={{
                position: 'absolute',
                left: '-33px',
                top: '16px',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: meta.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 0 6px ${meta.color}`
              }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FFFFFF' }} />
              </div>

              {/* Event Metadata Row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    background: meta.bg,
                    color: meta.color
                  }}>
                    <Icon size={12} />
                    {meta.label}
                  </span>

                  <span style={{ fontSize: '0.75rem', fontFamily: 'JetBrains Mono', color: 'var(--text-muted)' }}>
                    {event.source_record_id}
                  </span>
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {event.timestamp}
                </div>
              </div>

              {/* Description */}
              <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '8px' }}>
                {event.description}
              </div>

              {/* Entities & Location */}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', fontSize: '0.75rem' }}>
                {event.location && (
                  <span style={{ color: '#DB2777', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={12} />
                    {event.location}
                  </span>
                )}

                {event.entities && event.entities.length > 0 && (
                  <span style={{ color: 'var(--text-muted)' }}>
                    Entities: {event.entities.join(', ')}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

