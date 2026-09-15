import React, { useEffect, useState, useMemo } from 'react';
import {
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { MarkerType } from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import { apiClient } from '../api/client';
import type { PersonDetailResponse, PersonNetworkResponse, EvidenceItemResponse } from '../api/types';
import { NetworkGraph } from '../components/NetworkGraph';
import { EvidencePanel } from '../components/EvidencePanel';

interface PersonInvestigationProps {
  personId: string;
  onNavigate: (type: 'person' | 'case', id: string) => void;
}

export const PersonInvestigation: React.FC<PersonInvestigationProps> = ({
  personId,
  onNavigate
}) => {
  const [detail, setDetail] = useState<PersonDetailResponse | null>(null);
  const [network, setNetwork] = useState<PersonNetworkResponse | null>(null);
  const [evidence, setEvidence] = useState<EvidenceItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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

    // Central focal node
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
        style: { stroke: '#4B5563', strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#60A5FA' }
      });
    });

    return { graphNodes: nodes, graphEdges: edges };
  }, [detail, network]);

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
        <div className="error-banner">
          <AlertTriangle size={20} />
          <div>{error}</div>
        </div>
      </div>
    );
  }

  const isInnocent = !detail.criminal_significance || detail.person_id === 'PERSON_0553';

  return (
    <div className="page-container">
      {/* Actor Dossier Header Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{
                fontFamily: 'JetBrains Mono',
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'var(--text-primary)'
              }}>
                {detail.person_id}
              </span>

              <span className={`badge ${
                detail.predicted_role === 'UPSTREAM_COORDINATOR'
                  ? 'badge-coordinator'
                  : detail.predicted_role === 'BROKER'
                  ? 'badge-broker'
                  : detail.predicted_role === 'OPERATIONAL_MEMBER'
                  ? 'badge-operative'
                  : isInnocent
                  ? 'badge-innocent'
                  : 'badge-financial'
              }`}>
                {detail.predicted_role}
              </span>

              {isInnocent && (
                <span className="badge badge-innocent" style={{ background: 'rgba(20,184,166,0.25)', color: '#2DD4BF' }}>
                  <ShieldCheck size={12} />
                  Verified Non-Criminal
                </span>
              )}
            </div>

            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
              {detail.name}
            </h1>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              City: <strong>{detail.city}</strong> • Occupation: <strong>{detail.occupation}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Role Confidence
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#34D399' }}>
                {(detail.confidence * 100).toFixed(0)}%
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Evidence Diversity
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#A855F7' }}>
                {detail.evidence_diversity} Categories
              </div>
            </div>
          </div>
        </div>

        {/* Narrative / Innocent Explanation Alert */}
        <div style={{
          marginTop: '18px',
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          background: isInnocent ? 'rgba(20,184,166,0.08)' : 'rgba(255,255,255,0.02)',
          border: `1px solid ${isInnocent ? 'rgba(20,184,166,0.3)' : 'var(--border-subtle)'}`,
          fontSize: '0.9rem',
          color: isInnocent ? '#CCFBF1' : 'var(--text-primary)',
          lineHeight: 1.5
        }}>
          {isInnocent && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, marginBottom: '4px', color: '#2DD4BF' }}>
              <ShieldCheck size={16} />
              Innocent Control Protection Audit:
            </div>
          )}
          {detail.investigator_narrative}
        </div>
      </div>

      {/* Metrics Row: Degree, Betweenness, Connected Cases, Patterns */}
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
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#F59E0B', marginTop: '4px' }}>
            {(detail.graph_features.betweenness_centrality || 0).toFixed(4)}
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Connected Cases
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#EF4444', marginTop: '4px' }}>
            {detail.connected_cases.length}
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Suspicious Patterns
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3B82F6', marginTop: '4px' }}>
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
