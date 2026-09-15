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
        background: 'var(--bg-card)',
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
        return { label: 'CDR Call', icon: PhoneCall, color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.15)', border: '#38BDF8' };
      case 'FINANCIAL_TRANSACTION':
      case 'TRANSACTION':
        return { label: 'Financial', icon: DollarSign, color: '#34D399', bg: 'rgba(52, 211, 153, 0.15)', border: '#34D399' };
      case 'LOCATION_EVENT':
      case 'LOCATION':
        return { label: 'Location Ping', icon: MapPin, color: '#F472B6', bg: 'rgba(244, 114, 182, 0.15)', border: '#F472B6' };
      case 'VEHICLE_EVENT':
      case 'VEHICLE':
        return { label: 'Vehicle ANPR', icon: Car, color: '#A78BFA', bg: 'rgba(167, 139, 250, 0.15)', border: '#A78BFA' };
      case 'FIR_RECORD':
      case 'FIR':
        return { label: 'FIR Filing', icon: FileText, color: '#F87171', bg: 'rgba(248, 113, 113, 0.15)', border: '#F87171' };
      case 'EVIDENCE_RECORD':
      case 'EVIDENCE':
        return { label: 'Forensic Evidence', icon: Shield, color: '#FBBF24', bg: 'rgba(251, 191, 36, 0.15)', border: '#FBBF24' };
      case 'SURVEILLANCE_REPORT':
      case 'SURVEILLANCE':
        return { label: 'Surveillance Log', icon: Eye, color: '#60A5FA', bg: 'rgba(96, 165, 250, 0.15)', border: '#60A5FA' };
      case 'INTELLIGENCE_REPORT':
      case 'INTELLIGENCE':
        return { label: 'Intel Report', icon: Cpu, color: '#C084FC', bg: 'rgba(192, 132, 252, 0.15)', border: '#C084FC' };
      default:
        return { label: type, icon: Clock, color: '#9CA3AF', bg: 'rgba(156, 163, 175, 0.15)', border: '#9CA3AF' };
    }
  };

  const categories = ['ALL', ...Array.from(new Set(events.map(e => e.event_type)))];

  const filteredEvents = filterType === 'ALL'
    ? events
    : events.filter(e => e.event_type === filterType);

  return (
    <div style={{
      background: 'var(--bg-card)',
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
          <Clock size={18} color="#60A5FA" />
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
                border: filterType === cat ? '1px solid #3B82F6' : '1px solid var(--border-subtle)',
                background: filterType === cat ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.03)',
                color: filterType === cat ? '#93C5FD' : 'var(--text-secondary)',
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
        borderLeft: '2px solid rgba(255, 255, 255, 0.08)',
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
                background: 'rgba(255, 255, 255, 0.02)',
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
                boxShadow: `0 0 8px ${meta.color}`
              }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0B0F17' }} />
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
                  <span style={{ color: '#F472B6', display: 'flex', alignItems: 'center', gap: '4px' }}>
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
