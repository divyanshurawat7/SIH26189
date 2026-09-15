import React, { useState, useEffect, useRef } from 'react';
import { Search, ArrowRight, User, Briefcase, Network, Car, Smartphone, X, Clock, Trash2, Loader2 } from 'lucide-react';
import { apiClient } from '../api/client';
import type { SearchResultItem } from '../api/types';

interface GlobalSearchProps {
  onNavigate: (type: 'person' | 'case' | 'network' | string, id: string) => void;
}

import { getRecentInvestigations, saveRecentInvestigation, type RecentItem } from '../utils/storage';
export type { RecentItem };

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ onNavigate }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load recent searches from central storage
  useEffect(() => {
    setRecentSearches(getRecentInvestigations());
  }, [isOpen]);

  const saveRecent = (id: string, type: string, name: string) => {
    const updated = saveRecentInvestigation(id, type, name);
    setRecentSearches(updated);
  };

  const clearRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem('sih_recent_searches');
  };

  // Debounced API Search
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const clean = query.trim();
    if (!clean) {
      setResults([]);
      setLoading(false);
      setSelectedIndex(-1);
      return;
    }

    setLoading(true);
    debounceTimerRef.current = setTimeout(() => {
      apiClient.search(clean)
        .then((res) => {
          setResults(res.results || []);
          setLoading(false);
          setSelectedIndex(-1);
        })
        .catch(() => {
          setResults([]);
          setLoading(false);
        });
    }, 250);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [query]);

  const handleSelect = (type: string, id: string, name?: string) => {
    saveRecent(id, type, name || id);
    onNavigate(type, id);
    setQuery('');
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = query.trim().toUpperCase();
    if (!clean) return;

    if (selectedIndex >= 0 && selectedIndex < results.length) {
      const item = results[selectedIndex];
      handleSelect(item.entity_type, item.entity_id, item.display_name);
      return;
    }

    if (results.length > 0) {
      const first = results[0];
      handleSelect(first.entity_type, first.entity_id, first.display_name);
      return;
    }

    // Direct resolution fallback if typed exact ID format
    if (clean.startsWith('PERSON_') || /^\d+$/.test(clean)) {
      const id = clean.startsWith('PERSON_') ? clean : `PERSON_${clean.padStart(4, '0')}`;
      handleSelect('person', id);
    } else if (clean.startsWith('CASE_')) {
      handleSelect('case', clean);
    } else if (clean.startsWith('NET_')) {
      handleSelect('network', clean);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const highlightMatch = (text: string, q: string) => {
    if (!q.trim()) return text;
    const parts = text.split(new RegExp(`(${q})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === q.toLowerCase() ? (
        <mark key={i} style={{ background: '#FEF08A', color: '#0F172A', padding: '0 2px', borderRadius: '2px' }}>
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const getIconForType = (type: string) => {
    switch (type.toLowerCase()) {
      case 'person': return <User size={15} color="#7C3AED" />;
      case 'case': return <Briefcase size={15} color="#DC2626" />;
      case 'network': return <Network size={15} color="#2563EB" />;
      case 'vehicle': return <Car size={15} color="#2563EB" />;
      case 'phone': return <Smartphone size={15} color="#0D9488" />;
      default: return <Search size={15} color="#475569" />;
    }
  };

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
            placeholder="Search person name, ID, case, vehicle or network..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
              width: '100%'
            }}
          />
          {loading && <Loader2 size={14} className="spinner" style={{ margin: 0, width: 14, height: 14 }} />}
          {query && !loading && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults([]);
              }}
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
            background: '#FFFFFF',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 50,
            maxHeight: '380px',
            overflowY: 'auto'
          }}>
            {!query.trim() ? (
              // Recent Searches Section
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  borderBottom: '1px solid var(--border-subtle)',
                  background: 'var(--bg-panel)'
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={12} /> RECENT INVESTIGATIONS
                  </span>
                  {recentSearches.length > 0 && (
                    <button
                      onClick={clearRecent}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        fontSize: '0.7rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Trash2 size={11} /> Clear
                    </button>
                  )}
                </div>

                {recentSearches.length === 0 ? (
                  <div style={{ padding: '16px', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    No recent searches. Type a person name or case ID above to discover.
                  </div>
                ) : (
                  recentSearches.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelect(item.type, item.id, item.name)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {getIconForType(item.type)}
                        <div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>
                            {item.id}
                          </div>
                          {item.name !== item.id && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              {item.name}
                            </div>
                          )}
                        </div>
                      </div>
                      <ArrowRight size={13} color="var(--text-muted)" />
                    </div>
                  ))
                )}
              </div>
            ) : (
              // Backend Search Results Section
              <div>
                <div style={{
                  padding: '8px 12px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  borderBottom: '1px solid var(--border-subtle)',
                  background: 'var(--bg-panel)',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <span>SEARCH RESULTS ({results.length})</span>
                  <span>Use ↑ ↓ Arrow Keys</span>
                </div>

                {results.length === 0 && !loading ? (
                  <div style={{ padding: '16px', fontSize: '0.875rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    No matching entities found for "{query}".
                  </div>
                ) : (
                  results.map((item, index) => {
                    const isSelected = selectedIndex === index;
                    return (
                      <div
                        key={item.entity_id}
                        onClick={() => handleSelect(item.entity_type, item.entity_id, item.display_name)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          cursor: 'pointer',
                          borderBottom: '1px solid var(--border-subtle)',
                          background: isSelected ? 'var(--bg-card-hover)' : 'transparent',
                          transition: 'background 0.15s'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = isSelected ? 'var(--bg-card-hover)' : 'transparent')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {getIconForType(item.entity_type)}
                          <div>
                            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>
                              {highlightMatch(item.entity_id, query)}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              {highlightMatch(item.display_name, query)}
                              {item.details && <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>• {item.details}</span>}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {item.role_or_status && (
                            <span style={{
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-full)',
                              background: item.role_or_status === 'UPSTREAM_COORDINATOR'
                                ? 'var(--role-coordinator-bg)'
                                : item.role_or_status === 'BROKER'
                                ? 'var(--role-broker-bg)'
                                : 'var(--bg-panel)',
                              color: item.role_or_status === 'UPSTREAM_COORDINATOR'
                                ? 'var(--role-coordinator)'
                                : item.role_or_status === 'BROKER'
                                ? 'var(--role-broker)'
                                : 'var(--text-secondary)',
                              border: '1px solid var(--border-subtle)'
                            }}>
                              {item.role_or_status}
                            </span>
                          )}
                          <ArrowRight size={13} color="var(--text-muted)" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

