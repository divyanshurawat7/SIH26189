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
  selectedPersonId?: string | null;
  selectedCaseId?: string | null;
  onSelectTab: (tab: string, id?: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  selectedPersonId,
  selectedCaseId,
  onSelectTab
}) => {
  const mainNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'persons',
      label: selectedPersonId ? `Person (${selectedPersonId})` : 'Persons & Influencers',
      icon: Users,
      badge: selectedPersonId ? 'ACTIVE' : undefined
    },
    {
      id: 'cases',
      label: selectedCaseId ? `Case (${selectedCaseId})` : 'Case Investigations',
      icon: Briefcase,
      badge: selectedCaseId ? 'ACTIVE' : undefined
    },
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
      flexShrink: 0,
      height: '100vh',
      position: 'sticky',
      top: 0
    }}>
      {/* Navigation Links */}
      <div style={{ padding: '20px 12px', overflowY: 'auto' }}>
        <div style={{
          fontSize: '0.7rem',
          fontWeight: 600,
          letterSpacing: '0.05em',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          padding: '0 12px 10px 12px'
        }}>
          Command Center
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id || (currentTab === 'person' && item.id === 'persons') || (currentTab === 'case' && item.id === 'cases');
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: isActive ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                  color: isActive ? '#2563EB' : 'var(--text-secondary)',
                  border: isActive ? '1px solid rgba(37, 99, 235, 0.25)' : '1px solid transparent',
                  cursor: 'pointer',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.85rem',
                  textAlign: 'left',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <Icon size={17} color={isActive ? '#2563EB' : 'var(--text-secondary)'} />
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.label}
                  </span>
                </div>
                {item.badge && (
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background: '#2563EB',
                    color: '#FFFFFF'
                  }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Demo & Shortcuts */}
        <div style={{
          fontSize: '0.7rem',
          fontWeight: 600,
          letterSpacing: '0.05em',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          padding: '24px 12px 10px 12px'
        }}>
          Demo & Fast Audits
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <button
            onClick={() => onSelectTab('flagship')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 12px',
              borderRadius: 'var(--radius-md)',
              background: currentTab === 'flagship' ? 'rgba(124, 58, 237, 0.08)' : 'transparent',
              border: currentTab === 'flagship' ? '1px solid rgba(124, 58, 237, 0.25)' : '1px solid transparent',
              color: currentTab === 'flagship' ? '#7C3AED' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 500
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={14} color="#7C3AED" />
              Flagship CASE_0001
            </span>
            <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(124, 58, 237, 0.1)', color: '#7C3AED', fontWeight: 600 }}>
              Demo
            </span>
          </button>

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
            <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', background: 'var(--role-coordinator-bg)', color: 'var(--role-coordinator)', fontWeight: 600 }}>
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
              <ShieldCheck size={14} color="#0D9488" />
              Innocent: PERSON_0553
            </span>
            <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', background: 'var(--role-innocent-bg)', color: 'var(--role-innocent)', fontWeight: 600 }}>
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
        <div>36,151 nodes • 133,816 edges</div>
        <div style={{ marginTop: '6px', color: '#059669', fontWeight: 600 }}>Phase 8 Complete • 117 Tests</div>
      </div>
    </aside>
  );
};

