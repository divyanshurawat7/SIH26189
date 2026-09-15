import React from 'react';
import { ArrowRight, Crown, GitBranch, Target, Briefcase } from 'lucide-react';

interface OperationalChainProps {
  chain: string[];
  coordinator?: string | null;
  brokers?: string[];
  operationalMembers?: string[];
  onSelectNode?: (nodeId: string) => void;
}

export const OperationalChain: React.FC<OperationalChainProps> = ({
  chain,
  coordinator,
  brokers = [],
  operationalMembers = [],
  onSelectNode
}) => {
  if (!chain || chain.length === 0) {
    return (
      <div style={{
        padding: '24px',
        background: 'rgba(255,255,255,0.02)',
        borderRadius: 'var(--radius-md)',
        color: 'var(--text-muted)',
        fontSize: '0.875rem',
        textAlign: 'center'
      }}>
        No multi-hop operational chain identified for this case. Field actors appear directly linked or uncoordinated.
      </div>
    );
  }

  const getNodeRole = (nodeId: string, index: number) => {
    if (nodeId === coordinator || index === 0) {
      return {
        role: 'UPSTREAM COORDINATOR',
        desc: 'Remote Command & Control (Zero direct crime exposure)',
        badgeClass: 'badge-coordinator',
        icon: Crown,
        color: '#C084FC',
        border: 'rgba(168, 85, 247, 0.5)',
        bg: 'rgba(168, 85, 247, 0.1)'
      };
    }
    if (nodeId.startsWith('CASE_') || index === chain.length - 1) {
      return {
        role: 'CRIME TARGET',
        desc: 'Incident Location & FIR Offense',
        badgeClass: 'badge-case',
        icon: Briefcase,
        color: '#FB7185',
        border: 'rgba(225, 29, 72, 0.5)',
        bg: 'rgba(225, 29, 72, 0.1)'
      };
    }
    if (operationalMembers.includes(nodeId) || index === chain.length - 2) {
      return {
        role: 'OPERATIONAL EXECUTOR',
        desc: 'On-scene FIR Accused / Physical Perpetrator',
        badgeClass: 'badge-operative',
        icon: Target,
        color: '#F87171',
        border: 'rgba(239, 68, 68, 0.5)',
        bg: 'rgba(239, 68, 68, 0.1)'
      };
    }
    if (brokers.includes(nodeId) || (index > 0 && index < chain.length - 2)) {
      return {
        role: 'INTERMEDIARY BROKER',
        desc: 'Cluster Bridge / Financial & Telecom Conduit',
        badgeClass: 'badge-broker',
        icon: GitBranch,
        color: '#FBBF24',
        border: 'rgba(245, 158, 11, 0.5)',
        bg: 'rgba(245, 158, 11, 0.1)'
      };
    }
    return {
      role: 'NETWORK ASSOCIATE',
      desc: 'Transitional Link in Operational Hierarchy',
      badgeClass: 'badge-info',
      icon: GitBranch,
      color: '#60A5FA',
      border: 'rgba(96, 165, 250, 0.5)',
      bg: 'rgba(96, 165, 250, 0.1)'
    };
  };

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      padding: '24px',
      overflowX: 'auto'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Recovered Multi-Hop Operational Command Chain
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Hop-by-hop remote command hierarchy reconstructed through forensic telecom & financial cascading
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge badge-info">
            {chain.length - 1} Hops
          </span>
          <span className="badge badge-coordinator">
            Directed Flow
          </span>
        </div>
      </div>

      {/* Horizontal Flow Cards */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 4px',
        minWidth: 'max-content'
      }}>
        {chain.map((nodeId, idx) => {
          const info = getNodeRole(nodeId, idx);
          const Icon = info.icon;
          const isLast = idx === chain.length - 1;

          return (
            <React.Fragment key={`${nodeId}-${idx}`}>
              <div
                onClick={() => onSelectNode && onSelectNode(nodeId)}
                style={{
                  background: info.bg,
                  border: `1px solid ${info.border}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 18px',
                  width: '210px',
                  cursor: 'pointer',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: '-9px',
                  left: '12px',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  background: info.color,
                  color: '#000000',
                  padding: '1px 7px',
                  borderRadius: 'var(--radius-full)'
                }}>
                  {idx === 0 ? 'MASTERMIND' : idx === chain.length - 1 ? 'OFFENSE' : `HOP ${idx}`}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', marginBottom: '8px' }}>
                  <Icon size={16} color={info.color} />
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {nodeId}
                  </span>
                </div>

                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: info.color, marginBottom: '4px' }}>
                  {info.role}
                </div>

                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                  {info.desc}
                </div>
              </div>

              {!isLast && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                  padding: '0 4px'
                }}>
                  <ArrowRight size={20} color="#60A5FA" />
                  <span style={{ fontSize: '0.65rem', color: '#60A5FA', fontWeight: 500 }}>
                    calls / funds
                  </span>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
