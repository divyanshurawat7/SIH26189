import React from 'react';
import {
  FolderKanban,
  GitFork,
  UserCheck,
  FileSpreadsheet,
  Clock,
  Printer,
  Share2,
  ShieldCheck,
  AlertCircle
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
  const operationalModes = [
    {
      id: 'dashboard',
      label: 'Case Directory & Overview',
      icon: FolderKanban,
      description: 'Active case dockets & telemetry'
    },
    {
      id: 'graph',
      label: 'Network Graph & Topology',
      icon: GitFork,
      description: 'Multi-hop path tracing canvas'
    },
    {
      id: 'person',
      label: selectedPersonId ? `Entity: ${selectedPersonId}` : 'Entity Profile & Dossier',
      icon: UserCheck,
      description: 'Suspect records & ML inference',
      activeId: selectedPersonId
    },
    {
      id: 'case',
      label: selectedCaseId ? `Docket: ${selectedCaseId}` : 'Case Investigation Docket',
      icon: FileSpreadsheet,
      description: 'FIR, evidence matrix & chain',
      activeId: selectedCaseId
    },
    {
      id: 'timeline',
      label: 'Timeline & Pattern Detection',
      icon: Clock,
      description: 'Chronological sequence & anomalies'
    },
    {
      id: 'dossier',
      label: 'Case Dossier Export',
      icon: Printer,
      description: 'Official printable police report'
    },
    {
      id: 'cross-case',
      label: 'Cross-Case Syndicate Linkage',
      icon: Share2,
      description: 'Multi-jurisdiction overlap audit'
    }
  ];

  return (
    <aside className="workstation-sidebar">
      {/* Top Workspace Modes */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div className="sidebar-section-title">
          Operational Workspaces
        </div>

        <nav role="navigation" aria-label="Workstation modes">
          {operationalModes.map((mode) => {
            const Icon = mode.icon;
            const isActive =
              currentTab === mode.id ||
              (mode.id === 'person' && (currentTab === 'person' || currentTab === 'persons')) ||
              (mode.id === 'case' && (currentTab === 'case' || currentTab === 'cases')) ||
              (mode.id === 'timeline' && currentTab === 'findings') ||
              (mode.id === 'graph' && currentTab === 'flagship');

            return (
              <button
                key={mode.id}
                data-testid={`nav-${mode.id}`}
                onClick={() => onSelectTab(mode.id, mode.activeId || undefined)}
                className={`nav-item ${isActive ? 'active' : ''}`}
                title={mode.description}
              >
                <Icon size={15} color={isActive ? '#3B82F6' : '#94A3B8'} style={{ flexShrink: 0 }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {mode.label}
                  </div>
                </div>
                {mode.activeId && (
                  <span className="stamp" style={{ fontSize: '9px', padding: '1px 4px' }}>
                    ACTIVE
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Pinned Case File / High-Priority Targets */}
        <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
          <div className="sidebar-section-title">
            Priority Docket Targets
          </div>

          <div style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {/* Flagship Docket */}
            <button
              onClick={() => onSelectTab('case', 'CASE_0001')}
              className="btn btn-sm"
              style={{
                width: '100%',
                justifyContent: 'flex-start',
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: selectedCaseId === 'CASE_0001' ? 'var(--border-focus)' : 'var(--border-subtle)'
              }}
            >
              <FileSpreadsheet size={12} color="#60A5FA" />
              <span className="data-id" style={{ fontSize: '11px' }}>CASE_0001</span>
              <span className="stamp" style={{ fontSize: '9px', marginLeft: 'auto' }}>EXTORTION</span>
            </button>

            {/* Target Mastermind */}
            <button
              onClick={() => onSelectTab('person', 'PERSON_1476')}
              className="btn btn-sm btn-alert"
              data-testid="shortcut-mastermind-1476"
              style={{ width: '100%', justifyContent: 'flex-start' }}
            >
              <AlertCircle size={12} />
              <span className="data-id" style={{ fontSize: '11px' }}>Mastermind: PERSON_1476</span>
              <span className="stamp stamp-alert" style={{ fontSize: '9px', marginLeft: 'auto' }}>COORDINATOR</span>
            </button>

            {/* Civilian Control */}
            <button
              onClick={() => onSelectTab('person', 'PERSON_0553')}
              className="btn btn-sm"
              data-testid="shortcut-innocent-0553"
              style={{ width: '100%', justifyContent: 'flex-start', backgroundColor: 'var(--safe-green-bg)', borderColor: 'var(--safe-green-border)' }}
            >
              <ShieldCheck size={12} color="#059669" />
              <span className="data-id" style={{ fontSize: '11px', color: '#059669' }}>PERSON_0553</span>
              <span className="stamp stamp-safe" style={{ fontSize: '9px', marginLeft: 'auto' }}>CIVILIAN SAFE</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Telemetry & Jurisdiction Badge */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--border-subtle)',
        backgroundColor: 'var(--bg-toolbar)',
        fontSize: '11px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '4px' }}>
          <span>DATABASE GRAPH</span>
          <span className="font-mono">36,151 NODES</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
          <span>EVIDENCE EDGES</span>
          <span className="font-mono">133,816 EDGES</span>
        </div>
        <div style={{
          marginTop: '8px',
          paddingTop: '6px',
          borderTop: '1px dashed var(--border-subtle)',
          fontSize: '9px',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)'
        }}>
          NODE: DEL-HQ-SIT-01 · MHA CCTNS
        </div>
      </div>
    </aside>
  );
};
