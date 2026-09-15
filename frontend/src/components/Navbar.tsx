import React, { useEffect, useState } from 'react';
import { ShieldAlert, Sparkles } from 'lucide-react';
import { GlobalSearch } from './GlobalSearch';
import { apiClient } from '../api/client';

interface NavbarProps {
  onNavigate: (type: 'dashboard' | 'flagship' | 'person' | 'case' | 'network' | 'findings' | 'cross-case' | string, id?: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate }) => {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  useEffect(() => {
    apiClient.getHealth()
      .then(() => setIsOnline(true))
      .catch(() => setIsOnline(false));
  }, []);

  return (
    <header style={{
      height: '64px',
      background: 'var(--bg-sidebar)',
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 30,
      boxShadow: 'var(--shadow-sm)'
    }}>
      {/* Brand */}
      <div
        onClick={() => onNavigate('dashboard')}
        style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
      >
        <div style={{
          width: '36px',
          height: '36px',
          background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <ShieldAlert size={20} color="#FFFFFF" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>
            SIH26189 <span style={{ color: '#2563EB', fontWeight: 600, fontSize: '0.8rem' }}>COMMAND CENTER</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            AI-Powered Criminal Network Analysis System
          </div>
        </div>
      </div>

      {/* Global Search Bar */}
      <GlobalSearch onNavigate={(type, id) => onNavigate(type, id)} />

      {/* Flagship Fast Action & Health Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button
          onClick={() => onNavigate('flagship')}
          className="btn btn-secondary btn-sm"
          style={{
            background: 'rgba(124, 58, 237, 0.08)',
            borderColor: 'rgba(124, 58, 237, 0.25)',
            color: '#7C3AED',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Sparkles size={13} color="#7C3AED" />
          Flagship Demo: CASE_0001
        </button>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          padding: '4px 10px',
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.75rem'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isOnline === true ? '#059669' : isOnline === false ? '#DC2626' : '#D97706',
            boxShadow: isOnline === true ? '0 0 6px rgba(5, 150, 105, 0.4)' : 'none'
          }} />
          <span style={{ color: isOnline === true ? '#059669' : isOnline === false ? '#DC2626' : 'var(--text-muted)', fontWeight: 500 }}>
            {isOnline === true ? 'API Live (8000)' : isOnline === false ? 'API Offline' : 'Connecting...'}
          </span>
        </div>
      </div>
    </header>
  );
};

