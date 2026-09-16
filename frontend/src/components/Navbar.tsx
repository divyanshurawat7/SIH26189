import React, { useEffect, useState } from 'react';
import { Shield, Radio, FileText } from 'lucide-react';
import { GlobalSearch } from './GlobalSearch';
import { apiClient } from '../api/client';

interface NavbarProps {
  onNavigate: (type: 'dashboard' | 'flagship' | 'person' | 'case' | 'network' | 'findings' | 'cross-case' | 'dossier' | string, id?: string) => void;
  activeCaseId?: string | null;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate, activeCaseId = 'CASE_0001' }) => {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  useEffect(() => {
    apiClient.getHealth()
      .then(() => setIsOnline(true))
      .catch(() => setIsOnline(false));
  }, []);

  return (
    <>
      {/* Top Classification Banner */}
      <div className="classification-banner">
        <span>RESTRICTED // FOR OFFICIAL USE ONLY</span>
        <span>MHA CRIME ANALYSIS GRID // CCTNS INTEGRATED</span>
        <span className="classification-tag">CONFIDENTIAL LAW ENFORCEMENT SENSITIVE</span>
      </div>

      {/* Primary Workstation Chrome Header */}
      <header className="workstation-header">
        {/* System Identity */}
        <div
          onClick={() => onNavigate('dashboard')}
          className="system-brand"
          style={{ cursor: 'pointer' }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') onNavigate('dashboard'); }}
        >
          <div style={{
            width: '28px',
            height: '28px',
            backgroundColor: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Shield size={16} color="#1E40AF" />
          </div>
          <div>
            <div className="system-title">
              CRIMINAL NETWORK ANALYSIS SYSTEM
            </div>
            <div className="system-subtitle">
              NATIONAL INTELLIGENCE & INVESTIGATION WORKSTATION
            </div>
          </div>
        </div>

        {/* Active Docket Context */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Active Docket:
          </span>
          <button
            onClick={() => onNavigate('case', activeCaseId || 'CASE_0001')}
            className="stamp stamp-accent"
            style={{ cursor: 'pointer' }}
            title="Open active case investigation"
          >
            {activeCaseId || 'CASE_0001'} (FLAGSHIP)
          </button>
        </div>

        {/* Global Search Bar */}
        <div style={{ flex: '1 1 360px', maxWidth: '440px' }}>
          <GlobalSearch onNavigate={(type, id) => onNavigate(type, id)} />
        </div>

        {/* Operator Context & Engine Telemetry */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Quick Case Dossier Export Button */}
          <button
            onClick={() => onNavigate('dossier', activeCaseId || 'CASE_0001')}
            className="btn btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Export official printable case dossier"
          >
            <FileText size={12} />
            Export Case File
          </button>

          {/* Institutional Multi-Officer Taskforce Identity (No individual person name) */}
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              TASKFORCE // JOINT SIT CELL
            </span>
            <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              TERMINAL: MHA-SIT-HQ · CLEARANCE: L3
            </span>
          </div>

          {/* Engine Status Stamp */}
          <div
            className={`stamp ${isOnline ? 'stamp-safe' : 'stamp-alert'}`}
            style={{ padding: '3px 8px' }}
            title={isOnline ? 'FastAPI Engine Connected on Port 8000' : 'Backend Engine Offline'}
          >
            <Radio size={10} />
            <span>{isOnline ? 'API LIVE' : 'API DISCONNECTED'}</span>
          </div>
        </div>
      </header>
    </>
  );
};
