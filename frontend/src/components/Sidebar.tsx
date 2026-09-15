import React from 'react';
import {
  LayoutDashboard,
  Sparkles,
  Users,
  Briefcase,
  AlertTriangle,
  Network,
  ShieldCheck,
  Info
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string, id?: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'flagship', label: 'Flagship CASE_0001', icon: Sparkles, highlight: true },
    { id: 'persons', label: 'Persons & Influencers', icon: Users },
    { id: 'cases', label: 'Case Investigations', icon: Briefcase },
    { id: 'findings', label: 'Behavioral Findings', icon: AlertTriangle },
    { id: 'cross-case', label: 'Cross-Case Linkages', icon: Network },
  ];

  return (
    <aside style={{
      width: '240px',
      background: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      flexShrink: 0
    }}>
      {/* Navigation Links */}
      <div style={{ padding: '20px 12px' }}>
        <div style={{
          fontSize: '0.7rem',
          fontWeight: 600,
          letterSpacing: '0.05em',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          padding: '0 12px 10px 12px'
        }}>
          Investigation Modules
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: isActive
                    ? 'rgba(59, 130, 246, 0.15)'
                    : item.highlight
                    ? 'rgba(168, 85, 247, 0.08)'
                    : 'transparent',
                  color: isActive
                    ? '#60A5FA'
                    : item.highlight
                    ? '#E9D5FF'
                    : 'var(--text-secondary)',
                  border: isActive
                    ? '1px solid rgba(59, 130, 246, 0.3)'
                    : item.highlight
                    ? '1px solid rgba(168, 85, 247, 0.2)'
                    : '1px solid transparent',
                  cursor: 'pointer',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.875rem',
                  textAlign: 'left',
                  transition: 'background 0.15s, color 0.15s'
                }}
              >
                <Icon size={17} color={isActive ? '#60A5FA' : item.highlight ? '#C084FC' : 'currentColor'} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Quick Investigator Shortcuts */}
        <div style={{
          fontSize: '0.7rem',
          fontWeight: 600,
          letterSpacing: '0.05em',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          padding: '24px 12px 10px 12px'
        }}>
          Key Fast-Audits
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <button
            onClick={() => onSelectTab('person', 'PERSON_1476')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.8rem',
              textAlign: 'left'
            }}
          >
            <span>Mastermind: PERSON_1476</span>
            <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(168,85,247,0.2)', color: '#C084FC' }}>
              Coord
            </span>
          </button>

          <button
            data-testid="shortcut-innocent-0553"
            aria-label="Innocent Control PERSON_0553"
            onClick={() => onSelectTab('person', 'PERSON_0553')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.8rem',
              textAlign: 'left'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={14} color="#10B981" />
              Innocent: PERSON_0553
            </span>
            <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(16,185,129,0.2)', color: '#34D399' }}>
              Civilian
            </span>
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid var(--border-subtle)',
        fontSize: '0.75rem',
        color: 'var(--text-muted)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
          <Info size={13} />
          Synthetic Intelligence Dataset
        </div>
        <div>36,151 graph nodes • 133,816 edges</div>
        <div style={{ marginTop: '6px', color: '#10B981' }}>Phase 8 Complete • 117 Tests</div>
      </div>
    </aside>
  );
};
