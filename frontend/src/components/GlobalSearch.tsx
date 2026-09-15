import React, { useState } from 'react';
import { Search, ArrowRight, User, Briefcase, Network, X } from 'lucide-react';

interface GlobalSearchProps {
  onNavigate: (type: 'person' | 'case' | 'network', id: string) => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ onNavigate }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const sampleSuggestions = [
    { type: 'person' as const, id: 'PERSON_1476', label: 'Swati Chauhan (Upstream Coordinator)', badge: 'Coordinator' },
    { type: 'person' as const, id: 'PERSON_0026', label: 'Intermediate Broker', badge: 'Broker' },
    { type: 'person' as const, id: 'PERSON_1459', label: 'Operational Member (Accused FIR_0001)', badge: 'Operative' },
    { type: 'person' as const, id: 'PERSON_0553', label: 'Civilian Control (Non-Criminal)', badge: 'Innocent' },
    { type: 'case' as const, id: 'CASE_0001', label: 'Flagship Extortion Case (FIR_0001)', badge: 'Case' },
    { type: 'case' as const, id: 'CASE_0002', label: 'Organized Crime Investigation', badge: 'Case' },
    { type: 'network' as const, id: 'NET_001', label: 'Syndicate Network 001', badge: 'Network' },
  ];

  const handleSelect = (type: 'person' | 'case' | 'network', id: string) => {
    onNavigate(type, id);
    setQuery('');
    setIsOpen(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = query.trim().toUpperCase();
    if (!clean) return;

    if (clean.startsWith('PERSON_') || /^\d+$/.test(clean)) {
      const id = clean.startsWith('PERSON_') ? clean : `PERSON_${clean.padStart(4, '0')}`;
      handleSelect('person', id);
    } else if (clean.startsWith('CASE_')) {
      handleSelect('case', clean);
    } else if (clean.startsWith('NET_')) {
      handleSelect('network', clean);
    } else {
      // Default guess: search as person if begins with P, else case
      if (clean.startsWith('P')) {
        handleSelect('person', clean);
      } else {
        handleSelect('case', clean);
      }
    }
  };

  const filtered = query.trim()
    ? sampleSuggestions.filter(s =>
        s.id.toLowerCase().includes(query.toLowerCase()) ||
        s.label.toLowerCase().includes(query.toLowerCase())
      )
    : sampleSuggestions.slice(0, 5);

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '480px' }}>
      <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: 'var(--bg-input)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '6px 12px',
          width: '100%',
          gap: '8px'
        }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search Person ID, Case ID, Network ID (e.g. PERSON_1476, CASE_0001)..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
              width: '100%'
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </form>

      {isOpen && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 40 }}
            onClick={() => setIsOpen(false)}
          />
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 50,
            maxHeight: '340px',
            overflowY: 'auto'
          }}>
            <div style={{ padding: '8px 12px', fontSize: '0.75rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
              INVESTIGATION SUGGESTIONS
            </div>
            {filtered.length === 0 ? (
              <div style={{ padding: '12px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Press Enter to search "{query.toUpperCase()}"
              </div>
            ) : (
              filtered.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item.type, item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {item.type === 'person' && <User size={15} color="#A855F7" />}
                    {item.type === 'case' && <Briefcase size={15} color="#EF4444" />}
                    {item.type === 'network' && <Network size={15} color="#3B82F6" />}
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {item.id}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {item.label}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      background: 'rgba(255,255,255,0.06)',
                      color: 'var(--text-secondary)'
                    }}>
                      {item.badge}
                    </span>
                    <ArrowRight size={13} color="var(--text-muted)" />
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};
