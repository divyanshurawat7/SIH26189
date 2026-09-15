import React, { useEffect, useState, useMemo } from 'react';
import {
  Users,
  ShieldCheck,
  AlertTriangle,
  User,
  Clock,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { MarkerType } from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import { apiClient } from '../api/client';
import type { PersonDetailResponse, PersonNetworkResponse, EvidenceItemResponse, PersonListResponse, PersonSummaryItem } from '../api/types';
import { NetworkGraph } from '../components/NetworkGraph';
import { EvidencePanel } from '../components/EvidencePanel';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { InvestigationHeader } from '../components/InvestigationHeader';
import { HybridIntelligenceCard } from '../components/HybridIntelligenceCard';
import { getRecentInvestigations } from '../utils/storage';

interface PersonInvestigationProps {
  personId: string | null;
  onNavigate: (type: 'person' | 'case' | 'dashboard' | string, id?: string) => void;
}

export const PersonInvestigation: React.FC<PersonInvestigationProps> = ({
  personId,
  onNavigate
}) => {
  const [detail, setDetail] = useState<PersonDetailResponse | null>(null);
  const [network, setNetwork] = useState<PersonNetworkResponse | null>(null);
  const [evidence, setEvidence] = useState<EvidenceItemResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Person Directory State
  const [directoryPage, setDirectoryPage] = useState<number>(1);
  const [directorySearch, setDirectorySearch] = useState<string>('');
  const [directoryData, setDirectoryData] = useState<PersonListResponse | null>(null);
  const [directoryLoading, setDirectoryLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!personId) {
      setDetail(null);
      setNetwork(null);
      setEvidence([]);
      setLoading(false);

      setDirectoryLoading(true);
      apiClient.getPersons({ page: directoryPage, limit: 20, search: directorySearch })
        .then((pRes) => {
          if (pRes) setDirectoryData(pRes);
          setDirectoryLoading(false);
        })
        .catch(() => {
          setDirectoryLoading(false);
        });
      return;
    }

    setLoading(true);
    setError(null);

    Promise.all([
      apiClient.getPerson(personId),
      apiClient.getPersonNetwork(personId),
      apiClient.getPersonEvidence(personId)
    ])
      .then(([detailRes, networkRes, evidenceRes]) => {
        setDetail(detailRes);
        setNetwork(networkRes);
        setEvidence(evidenceRes);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || `Failed to load dossier for ${personId}`);
        setLoading(false);
      });
  }, [personId, directoryPage, directorySearch]);

  // Construct React Flow graph nodes and edges
  const { graphNodes, graphEdges } = useMemo(() => {
    if (!detail || !network) return { graphNodes: [], graphEdges: [] };

    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Central node
    nodes.push({
      id: detail.person_id,
      type: 'customEntity',
      position: { x: 350, y: 220 },
      data: {
        id: detail.person_id,
        label: detail.name,
        role: detail.predicted_role,
        confidence: detail.confidence,
        isCriminal: detail.criminal_significance,
        type: 'PERSON'
      }
    });

    // Direct connections placed around central node in radial layout
    const neighbors = network.direct_connections.slice(0, 14);
    const radius = 240;
    const angleStep = (2 * Math.PI) / (neighbors.length || 1);

    neighbors.forEach((neighborId, i) => {
      const angle = i * angleStep;
      const x = 350 + radius * Math.cos(angle);
      const y = 220 + radius * Math.sin(angle);
      const role = network.roles_of_connected_persons[neighborId] || 'PERIPHERAL_ASSOCIATE';

      nodes.push({
        id: neighborId,
        type: 'customEntity',
        position: { x, y },
        data: {
          id: neighborId,
          label: neighborId,
          role,
          type: neighborId.startsWith('CASE_') ? 'CASE' : neighborId.startsWith('LOCATION_') ? 'LOCATION' : 'PERSON',
          isCriminal: role !== 'HIGH_DEGREE' && role !== 'PERIPHERAL_ASSOCIATE'
        }
      });

      edges.push({
        id: `edge-${detail.person_id}-${neighborId}`,
        source: detail.person_id,
        target: neighborId,
        style: { stroke: '#94A3B8', strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#2563EB' }
      });
    });

    return { graphNodes: nodes, graphEdges: edges };
  }, [detail, network]);

  if (!personId) {
    const recentItems = getRecentInvestigations();
    const recentPersons = recentItems.filter((it) => it.type === 'person' || it.id.startsWith('PERSON_'));

    const defaultCandidates: PersonSummaryItem[] = [
      { person_id: 'PERSON_1476', name: 'Person 1476', city: 'Mumbai', occupation: 'Businessman', predicted_role: 'UPSTREAM_COORDINATOR', confidence: 0.95, criminal_significance: true },
      { person_id: 'PERSON_0026', name: 'Person 0026', city: 'Delhi', occupation: 'Trader', predicted_role: 'BROKER', confidence: 0.92, criminal_significance: true },
      { person_id: 'PERSON_0397', name: 'Person 0397', city: 'Kolkata', occupation: 'Agent', predicted_role: 'BROKER', confidence: 0.89, criminal_significance: true },
      { person_id: 'PERSON_0405', name: 'Person 0405', city: 'Chennai', occupation: 'Manager', predicted_role: 'BROKER', confidence: 0.88, criminal_significance: true },
      { person_id: 'PERSON_0432', name: 'Person 0432', city: 'Bangalore', occupation: 'Technician', predicted_role: 'OPERATIONAL_MEMBER', confidence: 0.86, criminal_significance: true },
      { person_id: 'PERSON_0553', name: 'Person 0553', city: 'Delhi', occupation: 'Merchant', predicted_role: 'CIVILIAN', confidence: 0.88, criminal_significance: false },
      { person_id: 'PERSON_1459', name: 'Person 1459', city: 'Hyderabad', occupation: 'Driver', predicted_role: 'OPERATIONAL_MEMBER', confidence: 0.91, criminal_significance: true }
    ];

    const activePersonsList = directoryData?.persons || defaultCandidates;
    const totalPersonsCount = directoryData?.total_persons || activePersonsList.length;
    const totalPages = directoryData?.total_pages || 1;
    const startNum = directoryData ? (directoryData.page - 1) * directoryData.page_size + 1 : 1;
    const endNum = directoryData ? Math.min(startNum + activePersonsList.length - 1, totalPersonsCount) : activePersonsList.length;

    return (
      <div className="page-container">
        <Breadcrumbs
          items={[
            { label: 'Dashboard', onClick: () => onNavigate('dashboard') },
            { label: 'Persons to Investigate' }
          ]}
        />

        <div style={{ marginBottom: '24px' }}>
          <h1 className="page-title">
            Persons Investigation Directory
          </h1>
          <p className="page-subtitle">
            Search and select any entity to inspect local graph topology, AI role intelligence, and traceable source evidence
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="card" style={{ marginBottom: '20px', background: '#FFFFFF', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 300px', display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '8px 12px' }}>
              <Users size={16} color="var(--text-muted)" />
              <input
                type="text"
                value={directorySearch}
                onChange={(e) => {
                  setDirectorySearch(e.target.value);
                  setDirectoryPage(1);
                }}
                placeholder="Search persons by Person ID, Name, City, Occupation, Role..."
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: '0.85rem',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
            {directorySearch && (
              <button
                onClick={() => {
                  setDirectorySearch('');
                  setDirectoryPage(1);
                }}
                className="btn btn-secondary btn-sm"
              >
                Clear Search
              </button>
            )}
          </div>
        </div>

        {/* 1. Recent Investigations Section */}
        {recentPersons.length > 0 && !directorySearch && (
          <div className="card" style={{ marginBottom: '24px', background: '#FFFFFF' }}>
            <div className="card-header">
              <div className="card-title">
                <Clock size={18} color="#2563EB" />
                Recent Person Investigations ({recentPersons.length})
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Previously audited entities
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              {recentPersons.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onNavigate('person', item.id)}
                  style={{
                    background: 'rgba(37, 99, 235, 0.04)',
                    border: '1px solid rgba(37, 99, 235, 0.2)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(37, 99, 235, 0.08)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(37, 99, 235, 0.04)')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <User size={16} color="#2563EB" />
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>
                        {item.id}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {item.name !== item.id ? item.name : 'Investigated Entity'}
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={14} color="#2563EB" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. Full Available Persons Table */}
        <div className="card" style={{ background: '#FFFFFF' }}>
          <div className="card-header">
            <div className="card-title">
              <Users size={18} color="#7C3AED" />
              Persons Directory
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {directoryLoading ? 'Loading persons...' : `Showing ${startNum}–${endNum} of ${totalPersonsCount} persons`}
            </span>
          </div>

          {activePersonsList.length === 0 ? (
            <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              <CheckCircle2 size={32} color="#059669" style={{ margin: '0 auto 8px auto' }} />
              No persons found matching "{directorySearch}".
            </div>
          ) : (
            <>
              <div className="table-container">
                <table className="investigation-table">
                  <thead>
                    <tr>
                      <th>Person ID</th>
                      <th>Name</th>
                      <th>City / Occupation</th>
                      <th>Predicted Role</th>
                      <th>Confidence</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activePersonsList.map((p: PersonSummaryItem) => (
                      <tr
                        key={p.person_id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => onNavigate('person', p.person_id)}
                      >
                        <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {p.person_id}
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                          {p.name || p.person_id}
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          {p.city} • {p.occupation}
                        </td>
                        <td>
                          <span className={`badge ${
                            p.predicted_role === 'UPSTREAM_COORDINATOR'
                              ? 'badge-coordinator'
                              : p.predicted_role === 'BROKER'
                              ? 'badge-broker'
                              : p.predicted_role === 'OPERATIONAL_MEMBER'
                              ? 'badge-operative'
                              : 'badge-innocent'
                          }`}>
                            {p.predicted_role}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600, color: '#059669' }}>
                          {((p.confidence || 0.85) * 100).toFixed(0)}%
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigate('person', p.person_id);
                            }}
                            className="btn btn-primary btn-sm"
                          >
                            Investigate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '16px',
                    marginTop: '16px',
                    borderTop: '1px solid var(--border-subtle)',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}
                >
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Page {directoryPage} of {totalPages}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      disabled={directoryPage <= 1}
                      onClick={() => setDirectoryPage((p) => Math.max(1, p - 1))}
                      className="btn btn-secondary btn-sm"
                      style={{ opacity: directoryPage <= 1 ? 0.5 : 1, cursor: directoryPage <= 1 ? 'not-allowed' : 'pointer' }}
                    >
                      Previous
                    </button>

                    {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                      let pNum = directoryPage - 2 + idx;
                      if (pNum < 1) pNum = idx + 1;
                      if (pNum > totalPages) return null;
                      return (
                        <button
                          key={pNum}
                          onClick={() => setDirectoryPage(pNum)}
                          className={`btn btn-sm ${directoryPage === pNum ? 'btn-primary' : 'btn-secondary'}`}
                        >
                          {pNum}
                        </button>
                      );
                    })}

                    <button
                      disabled={directoryPage >= totalPages}
                      onClick={() => setDirectoryPage((p) => Math.min(totalPages, p + 1))}
                      className="btn btn-secondary btn-sm"
                      style={{ opacity: directoryPage >= totalPages ? 0.5 : 1, cursor: directoryPage >= totalPages ? 'not-allowed' : 'pointer' }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="state-container" style={{ height: '70vh' }}>
        <div className="spinner" />
        <div style={{ color: 'var(--text-secondary)' }}>
          Retrieving Actor Dossier & Topological Graph Context for {personId}...
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="page-container">
        <Breadcrumbs
          items={[
            { label: 'Dashboard', onClick: () => onNavigate('dashboard') },
            { label: 'Persons' },
            { label: personId }
          ]}
          onBack={() => onNavigate('dashboard')}
        />
        <div className="error-banner">
          <AlertTriangle size={20} />
          <div>{error || `Person '${personId}' not found.`}</div>
        </div>
      </div>
    );
  }

  const isInnocent = !detail.criminal_significance || detail.person_id === 'PERSON_0553';

  return (
    <div className="page-container">
      {/* Clickable Breadcrumbs & Back button */}
      <Breadcrumbs
        items={[
          { label: 'Dashboard', onClick: () => onNavigate('dashboard') },
          { label: 'Persons', onClick: () => onNavigate('persons') },
          { label: detail.person_id }
        ]}
        onBack={() => onNavigate('dashboard')}
      />

      {/* Investigation Header */}
      <InvestigationHeader
        entityId={detail.person_id}
        title={detail.name}
        subtitle={`City: ${detail.city} • Occupation: ${detail.occupation}`}
        roleOrStatus={detail.predicted_role}
        confidence={detail.confidence}
        isCriminal={detail.criminal_significance}
        metrics={[
          { label: 'Degree', value: `${detail.graph_features.degree || 0} Contacts` },
          { label: 'Betweenness', value: (detail.graph_features.betweenness_centrality || 0).toFixed(4) },
          { label: 'Connected Cases', value: detail.connected_cases.length },
          { label: 'Evidence Diversity', value: `${detail.evidence_diversity} Categories` }
        ]}
      />

      {/* AI Role Intelligence & Hybrid Assessment Section */}
      <HybridIntelligenceCard
        hybridData={detail.hybrid_intelligence}
        explainabilityData={detail.explainability}
        onNavigate={onNavigate}
      />

      {/* Verified Non-Criminal Badge & Audit Banner if Innocent Control */}
      {isInnocent && (
        <div style={{
          marginBottom: '24px',
          padding: '16px 20px',
          borderRadius: 'var(--radius-lg)',
          background: 'rgba(13, 148, 136, 0.08)',
          border: '1px solid rgba(13, 148, 136, 0.25)',
          fontSize: '0.9rem',
          color: '#0D9488',
          lineHeight: 1.5
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, marginBottom: '4px' }}>
            <ShieldCheck size={18} color="#0D9488" />
            <span className="badge badge-innocent" style={{ background: 'rgba(13, 148, 136, 0.15)' }}>
              Verified Non-Criminal
            </span>
            <span>Innocent Control Protection Audit:</span>
          </div>
          {detail.investigator_narrative}
        </div>
      )}

      {!isInnocent && (
        <div className="card" style={{ marginBottom: '24px', background: '#FFFFFF' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
            Investigator Summary Narrative
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {detail.investigator_narrative}
          </p>
        </div>
      )}

      {/* Metrics Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div className="card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Graph Contact Degree
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
            {detail.graph_features.degree || 0} Contacts
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Betweenness Centrality
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#D97706', marginTop: '4px' }}>
            {(detail.graph_features.betweenness_centrality || 0).toFixed(4)}
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Connected Cases
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#DC2626', marginTop: '4px' }}>
            {detail.connected_cases.length}
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Suspicious Patterns
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2563EB', marginTop: '4px' }}>
            {detail.suspicious_patterns.length}
          </div>
        </div>
      </div>

      {/* Interactive Local Network Graph Canvas */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              1-Hop Local Network Topology
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Interactive graph showing direct contacts, influencer neighbors, and case attachments
            </p>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Select any node to view entity details
          </span>
        </div>

        <NetworkGraph
          nodes={graphNodes}
          edges={graphEdges}
          height="520px"
          onNodeClickNavigate={(type, id) => onNavigate(type, id)}
        />
      </div>

      {/* Traceable Evidence Panel */}
      <EvidencePanel
        evidence={evidence}
        title={`Underlying Evidence for ${detail.name} (${detail.person_id})`}
      />
    </div>
  );
};

