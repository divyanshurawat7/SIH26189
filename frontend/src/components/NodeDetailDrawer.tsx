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
      background: '#FFFFFF',
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
          {isPerson && <User size={18} color="#7C3AED" />}
          {isCase && <Briefcase size={18} color="#DC2626" />}
          {isLocation && <MapPin size={18} color="#059669" />}
          {isVehicle && <Car size={18} color="#2563EB" />}
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
              ? 'var(--role-coordinator-bg)'
              : node.role === 'BROKER'
              ? 'var(--role-broker-bg)'
              : node.role === 'OPERATIONAL_MEMBER'
              ? 'var(--role-operative-bg)'
              : 'var(--role-innocent-bg)',
            border: `1px solid ${
              node.role === 'UPSTREAM_COORDINATOR'
                ? 'var(--role-coordinator-border)'
                : node.role === 'BROKER'
                ? 'var(--role-broker-border)'
                : node.role === 'OPERATIONAL_MEMBER'
                ? 'var(--role-operative-border)'
                : 'var(--role-innocent-border)'
            }`,
            fontSize: '0.8rem',
            fontWeight: 700,
            color: node.role === 'UPSTREAM_COORDINATOR'
              ? '#7C3AED'
              : node.role === 'BROKER'
              ? '#D97706'
              : node.role === 'OPERATIONAL_MEMBER'
              ? '#DC2626'
              : '#0D9488'
          }}>
            {node.role === 'UPSTREAM_COORDINATOR' && <Crown size={14} color="#7C3AED" />}
            {node.role === 'BROKER' && <GitBranch size={14} color="#D97706" />}
            {node.role === 'OPERATIONAL_MEMBER' && <Target size={14} color="#DC2626" />}
            {node.role === 'PERIPHERAL_ASSOCIATE' && <ShieldCheck size={14} color="#0D9488" />}
            {node.role}
          </div>
        </div>
      )}

      {/* Attribute Properties */}
      <div style={{
        background: 'var(--bg-panel)',
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
            <span style={{ color: '#059669', fontWeight: 600 }}>{(node.confidence * 100).toFixed(0)}%</span>
          </div>
        )}

        {node.isCriminal !== undefined && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Predicate Status:</span>
            <span style={{ color: node.isCriminal ? '#DC2626' : '#059669', fontWeight: 600 }}>
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

