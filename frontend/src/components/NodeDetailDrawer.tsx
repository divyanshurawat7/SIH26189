import React from 'react';
import { X, User, Briefcase, MapPin, Car, ShieldCheck, Crown, GitBranch, Target } from 'lucide-react';

interface NodeDetailDrawerProps {
  node: {
    id: string;
    label?: string;
    type?: string;
    role?: string;
    confidence?: number;
    isCriminal?: boolean;
    data?: any;
  } | null;
  onClose: () => void;
  onNavigate: (type: 'person' | 'case', id: string) => void;
}

export const NodeDetailDrawer: React.FC<NodeDetailDrawerProps> = ({ node, onClose, onNavigate }) => {
  if (!node) return null;

  const isPerson = node.id.startsWith('PERSON_');
  const isCase = node.id.startsWith('CASE_');
  const isLocation = node.id.startsWith('LOCATION_');
  const isVehicle = node.id.startsWith('VEHICLE_');

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      width: '360px',
      background: 'var(--bg-card)',
      borderLeft: '1px solid var(--border-subtle)',
      boxShadow: 'var(--shadow-lg)',
      zIndex: 20,
      display: 'flex',
      flexDirection: 'column',
      padding: '24px',
      overflowY: 'auto'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isPerson && <User size={18} color="#A855F7" />}
          {isCase && <Briefcase size={18} color="#EF4444" />}
          {isLocation && <MapPin size={18} color="#10B981" />}
          {isVehicle && <Car size={18} color="#60A5FA" />}
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Entity Inspector
          </span>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
        >
          <X size={18} />
        </button>
      </div>

      {/* ID & Title */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>
          {node.id}
        </div>
        {node.label && node.label !== node.id && (
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {node.label}
          </div>
        )}
      </div>

      {/* Role / Status Badge */}
      {node.role && (
        <div style={{ marginBottom: '18px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: 'var(--radius-md)',
            background: node.role === 'UPSTREAM_COORDINATOR'
              ? 'rgba(168,85,247,0.2)'
              : node.role === 'BROKER'
              ? 'rgba(245,158,11,0.2)'
              : node.role === 'OPERATIONAL_MEMBER'
              ? 'rgba(239,68,68,0.2)'
              : 'rgba(20,184,166,0.2)',
            border: `1px solid ${
              node.role === 'UPSTREAM_COORDINATOR'
                ? 'rgba(168,85,247,0.5)'
                : node.role === 'BROKER'
                ? 'rgba(245,158,11,0.5)'
                : node.role === 'OPERATIONAL_MEMBER'
                ? 'rgba(239,68,68,0.5)'
                : 'rgba(20,184,166,0.5)'
            }`,
            fontSize: '0.8rem',
            fontWeight: 700,
            color: 'var(--text-primary)'
          }}>
            {node.role === 'UPSTREAM_COORDINATOR' && <Crown size={14} color="#C084FC" />}
            {node.role === 'BROKER' && <GitBranch size={14} color="#FBBF24" />}
            {node.role === 'OPERATIONAL_MEMBER' && <Target size={14} color="#F87171" />}
            {node.role === 'PERIPHERAL_ASSOCIATE' && <ShieldCheck size={14} color="#2DD4BF" />}
            {node.role}
          </div>
        </div>
      )}

      {/* Attribute Properties */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '16px',
        marginBottom: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        fontSize: '0.8rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)' }}>Entity Class:</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{node.type || 'GRAPH_NODE'}</span>
        </div>

        {node.confidence !== undefined && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Confidence:</span>
            <span style={{ color: '#34D399', fontWeight: 600 }}>{(node.confidence * 100).toFixed(0)}%</span>
          </div>
        )}

        {node.isCriminal !== undefined && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Predicate Status:</span>
            <span style={{ color: node.isCriminal ? '#F87171' : '#34D399', fontWeight: 600 }}>
              {node.isCriminal ? 'Criminal Suspect' : 'Verified Civilian / Non-Criminal'}
            </span>
          </div>
        )}
      </div>

      {/* Action Button */}
      <div style={{ marginTop: 'auto' }}>
        {isPerson && (
          <button
            onClick={() => onNavigate('person', node.id)}
            className="btn btn-primary"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <User size={15} />
            Open Full Person Dossier
          </button>
        )}

        {isCase && (
          <button
            onClick={() => onNavigate('case', node.id)}
            className="btn btn-primary"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <Briefcase size={15} />
            Open Full Case Dossier
          </button>
        )}
      </div>
    </div>
  );
};
