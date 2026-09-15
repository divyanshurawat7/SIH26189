import React, { useEffect, useState } from 'react';
import { ShieldAlert, Sparkles } from 'lucide-react';
import { GlobalSearch } from './GlobalSearch';
import { apiClient } from '../api/client';

interface NavbarProps {
  onNavigate: (type: 'dashboard' | 'flagship' | 'person' | 'case' | 'network' | 'findings' | 'cross-case', id?: string) => void;
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
      zIndex: 30
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '36px',
          height: '36px',
          background: 'linear-gradient(135deg, #7C3AED, #2563EB)',
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
            SIH26189 <span style={{ color: '#60A5FA', fontWeight: 500, fontSize: '0.8rem' }}>INTELLIGENCE</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Criminal Network Analysis Platform
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
            background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(37,99,235,0.15))',
            borderColor: 'rgba(168,85,247,0.4)',
            color: '#E9D5FF',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Sparkles size={13} color="#C084FC" />
          Flagship Demo: CASE_0001
        </button>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          padding: '4px 10px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.75rem'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isOnline === true ? '#10B981' : isOnline === false ? '#EF4444' : '#F59E0B',
            boxShadow: isOnline === true ? '0 0 8px #10B981' : 'none'
          }} />
          <span style={{ color: isOnline === true ? '#34D399' : isOnline === false ? '#F87171' : 'var(--text-muted)', fontWeight: 500 }}>
            {isOnline === true ? 'API Live (8000)' : isOnline === false ? 'API Offline' : 'Connecting...'}
          </span>
        </div>
      </div>
    </header>
  );
};
