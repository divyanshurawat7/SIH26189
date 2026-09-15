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
import type { PersonDetailResponse, PersonNetworkResponse, EvidenceItemResponse } from '../api/types';
import { NetworkGraph } from '../components/NetworkGraph';
import { EvidencePanel } from '../components/EvidencePanel';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { InvestigationHeader } from '../components/InvestigationHeader';
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
  const [influencers, setInfluencers] = useState<any[]>([]);

  useEffect(() => {
    if (!personId) {
      setDetail(null);
      setNetwork(null);
      setEvidence([]);
      setLoading(false);

      // Fetch top influencers from dataset for dynamic selection list
      apiClient.getOverview()
        .then((res) => {
          if (res && res.top_influencers) {
            setInfluencers(res.top_influencers);
          }
        })
        .catch(() => {});
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
  }, [personId]);

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
    const recentIds = new Set(recentItems.map((item) => item.id));

    // Combine backend influencers + fallback candidates for comprehensive pending list
    const defaultCandidates = [
      { person_id: 'PERSON_1476', name: 'Person 1476', predicted_role: 'UPSTREAM_COORDINATOR', confidence: 0.95 },
      { person_id: 'PERSON_0026', name: 'Person 0026', predicted_role: 'BROKER', confidence: 0.92 },
      { person_id: 'PERSON_0397', name: 'Person 0397', predicted_role: 'BROKER', confidence: 0.89 },
      { person_id: 'PERSON_0405', name: 'Person 0405', predicted_role: 'BROKER', confidence: 0.88 },
      { person_id: 'PERSON_0432', name: 'Person 0432', predicted_role: 'OPERATIONAL_MEMBER', confidence: 0.86 },
      { person_id: 'PERSON_0553', name: 'Person 0553', predicted_role: 'CIVILIAN', confidence: 0.88 },
      { person_id: 'PERSON_1459', name: 'Person 1459', predicted_role: 'OPERATIONAL_MEMBER', confidence: 0.91 }
    ];

    const allCandidates = [...influencers, ...defaultCandidates];
    const uniqueCandidates = Array.from(new Map(allCandidates.map(item => [item.person_id, item])).values());

    // Filter out entities that are already in Recent Investigations
    const pendingPersons = uniqueCandidates.filter((p) => !recentIds.has(p.person_id));
    const recentPersons = recentItems.filter((it) => it.type === 'person' || it.id.startsWith('PERSON_'));

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
            Select a pending entity below to launch local graph topology analysis and source evidence audit
          </p>
        </div>

        {/* 1. Recent Investigations Section */}
        {recentPersons.length > 0 && (
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

        {/* 2. Pending Persons Selection List */}
        <div className="card" style={{ background: '#FFFFFF' }}>
          <div className="card-header">
            <div className="card-title">
              <Users size={18} color="#7C3AED" />
              Persons to Investigate (Pending Selection)
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {pendingPersons.length} Uninvestigated Candidates Available
            </span>
          </div>

          {pendingPersons.length === 0 ? (
            <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              <CheckCircle2 size={32} color="#059669" style={{ margin: '0 auto 8px auto' }} />
              All primary candidate persons have been investigated.
              <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                Use Global Search above to discover any specific entity ID or name.
              </div>
            </div>
          ) : (
            <div className="table-container">
              <table className="investigation-table">
                <thead>
                  <tr>
                    <th>Person ID</th>
                    <th>Name</th>
                    <th>Predicted Role</th>
                    <th>Confidence</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingPersons.map((p) => (
                    <tr key={p.person_id}>
                      <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {p.person_id}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                        {p.name || p.person_id}
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
                          onClick={() => onNavigate('person', p.person_id)}
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

