import React, { useState, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  MarkerType
} from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  GitFork,
  FileSpreadsheet,
  ExternalLink
} from 'lucide-react';

interface NetworkGraphViewProps {
  onNavigate: (type: string, id?: string) => void;
  caseId?: string;
}

// Technical Palantir / Maltego-style Custom Node
const ForensicEntityNode = ({ data }: { data: any }) => {
  const { id, label, role, isCoordinator, isAccused, isCivilianSafe, degree } = data;

  const nodeBorder = isCoordinator
    ? '2px solid var(--alert-red)'
    : isAccused
    ? '2px solid #F87171'
    : isCivilianSafe
    ? '2px solid var(--safe-green)'
    : role === 'BROKER'
    ? '1px solid var(--alert-amber)'
    : '1px solid var(--border-strong)';

  const nodeBg = isCoordinator
    ? 'var(--alert-red-bg)'
    : isCivilianSafe
    ? 'var(--safe-green-bg)'
    : 'var(--bg-surface-elevated)';

  return (
    <div style={{
      padding: '10px 14px',
      borderRadius: 'var(--radius-sm)',
      backgroundColor: nodeBg,
      border: nodeBorder,
      color: 'var(--text-primary)',
      minWidth: '180px',
      fontFamily: 'var(--font-sans)',
      boxShadow: 'none'
    }}>
      <Handle type="target" position={Position.Left} style={{ background: '#64748B', width: 6, height: 6 }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span className="data-id" style={{ fontSize: '12px', fontWeight: 700 }}>
          {id}
        </span>
        {isCoordinator ? (
          <span className="stamp stamp-alert">COORDINATOR</span>
        ) : isAccused ? (
          <span className="stamp stamp-alert">ACCUSED</span>
        ) : isCivilianSafe ? (
          <span className="stamp stamp-safe">SAFE</span>
        ) : role ? (
          <span className="stamp">{role}</span>
        ) : (
          <span className="stamp">ENTITY</span>
        )}
      </div>

      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
        {label}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
        <span>DEGREE: {degree || 2}</span>
        <span>{isCoordinator ? '0 CRIME EDGES' : 'VERIFIED HOP'}</span>
      </div>

      <Handle type="source" position={Position.Right} style={{ background: '#64748B', width: 6, height: 6 }} />
    </div>
  );
};

const nodeTypes = {
  forensicNode: ForensicEntityNode
};

export const NetworkGraphView: React.FC<NetworkGraphViewProps> = ({
  onNavigate,
  caseId = 'CASE_0001'
}) => {
  const [selectedEntity, setSelectedEntity] = useState<string>('PERSON_1476');
  const [highlightChainOnly, setHighlightChainOnly] = useState<boolean>(true);

  // Initial Flagship 5-Hop Directed Path
  const initialNodes: Node[] = useMemo(() => [
    {
      id: 'PERSON_1476',
      type: 'forensicNode',
      position: { x: 40, y: 160 },
      data: {
        id: 'PERSON_1476',
        label: 'Remote Syndicate Mastermind',
        role: 'UPSTREAM_COORDINATOR',
        isCoordinator: true,
        degree: 18
      }
    },
    {
      id: 'PERSON_0026',
      type: 'forensicNode',
      position: { x: 280, y: 160 },
      data: {
        id: 'PERSON_0026',
        label: 'Primary Financial Cutout',
        role: 'BROKER',
        degree: 14
      }
    },
    {
      id: 'PERSON_0397',
      type: 'forensicNode',
      position: { x: 520, y: 160 },
      data: {
        id: 'PERSON_0397',
        label: 'Intermediate Communications Broker',
        role: 'BROKER',
        degree: 12
      }
    },
    {
      id: 'PERSON_0405',
      type: 'forensicNode',
      position: { x: 760, y: 160 },
      data: {
        id: 'PERSON_0405',
        label: 'Field Relay Coordinator',
        role: 'BROKER',
        degree: 10
      }
    },
    {
      id: 'PERSON_1459',
      type: 'forensicNode',
      position: { x: 1000, y: 160 },
      data: {
        id: 'PERSON_1459',
        label: 'Arrested Field Operative',
        role: 'OPERATIONAL_MEMBER',
        isAccused: true,
        degree: 8
      }
    },
    {
      id: 'CASE_0001',
      type: 'forensicNode',
      position: { x: 1240, y: 160 },
      data: {
        id: 'CASE_0001',
        label: 'FIR_0001 / LOCATION_0041',
        role: 'CASE DOCKET',
        degree: 27
      }
    },
    // Supporting Peripheral Nodes (Civilian Control & Burners)
    {
      id: 'PERSON_0553',
      type: 'forensicNode',
      position: { x: 140, y: 340 },
      data: {
        id: 'PERSON_0553',
        label: 'Civilian Merchant Control',
        role: 'CIVILIAN',
        isCivilianSafe: true,
        degree: 15
      }
    },
    {
      id: 'PHONE_0026_SIM',
      type: 'forensicNode',
      position: { x: 380, y: 40 },
      data: {
        id: 'PHONE_0026_SIM',
        label: 'Burner SIM Card (+91-9876543210)',
        role: 'PHONE',
        degree: 4
      }
    },
    {
      id: 'ACC_0397_BANK',
      type: 'forensicNode',
      position: { x: 620, y: 40 },
      data: {
        id: 'ACC_0397_BANK',
        label: 'HDFC Escrow Account (ACC_0397)',
        role: 'BANK ACCOUNT',
        degree: 6
      }
    }
  ], []);

  const initialEdges: Edge[] = useMemo(() => [
    {
      id: 'e1-2',
      source: 'PERSON_1476',
      target: 'PERSON_0026',
      label: 'HOP 1: INR 18,885 + 3 CDR Calls',
      animated: true,
      style: { stroke: 'var(--alert-red)', strokeWidth: 2 },
      labelStyle: { fill: '#0F172A', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600 },
      labelBgStyle: { fill: '#FFFFFF', fillOpacity: 0.95, stroke: '#CBD5E1', strokeWidth: 1 },
      markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--alert-red)' }
    },
    {
      id: 'e2-3',
      source: 'PERSON_0026',
      target: 'PERSON_0397',
      label: 'HOP 2: Wire Transfer + 2 Calls',
      animated: true,
      style: { stroke: 'var(--alert-red)', strokeWidth: 2 },
      labelStyle: { fill: '#0F172A', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600 },
      labelBgStyle: { fill: '#FFFFFF', fillOpacity: 0.95, stroke: '#CBD5E1', strokeWidth: 1 },
      markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--alert-red)' }
    },
    {
      id: 'e3-4',
      source: 'PERSON_0397',
      target: 'PERSON_0405',
      label: 'HOP 3: Operational Link + 2 Calls',
      animated: true,
      style: { stroke: 'var(--alert-red)', strokeWidth: 2 },
      labelStyle: { fill: '#0F172A', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600 },
      labelBgStyle: { fill: '#FFFFFF', fillOpacity: 0.95, stroke: '#CBD5E1', strokeWidth: 1 },
      markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--alert-red)' }
    },
    {
      id: 'e4-5',
      source: 'PERSON_0405',
      target: 'PERSON_1459',
      label: 'HOP 4: Command Relay + Fund Transfer',
      animated: true,
      style: { stroke: 'var(--alert-red)', strokeWidth: 2 },
      labelStyle: { fill: '#0F172A', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600 },
      labelBgStyle: { fill: '#FFFFFF', fillOpacity: 0.95, stroke: '#CBD5E1', strokeWidth: 1 },
      markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--alert-red)' }
    },
    {
      id: 'e5-case',
      source: 'PERSON_1459',
      target: 'CASE_0001',
      label: 'HOP 5: Direct FIR_0001 Charge',
      animated: true,
      style: { stroke: '#DC2626', strokeWidth: 2 },
      labelStyle: { fill: '#0F172A', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600 },
      labelBgStyle: { fill: '#FFFFFF', fillOpacity: 0.95, stroke: '#CBD5E1', strokeWidth: 1 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#DC2626' }
    },
    // Peripheral linkages
    {
      id: 'e-phone',
      source: 'PERSON_0026',
      target: 'PHONE_0026_SIM',
      label: 'DEVICE_ASSOCIATION',
      style: { stroke: '#475569', strokeDasharray: '4 4' }
    },
    {
      id: 'e-acc',
      source: 'PERSON_0397',
      target: 'ACC_0397_BANK',
      label: 'ESCROW_LINK',
      style: { stroke: '#475569', strokeDasharray: '4 4' }
    }
  ], []);

  const [nodes] = useState<Node[]>(initialNodes);
  const [edges] = useState<Edge[]>(initialEdges);

  const handleNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedEntity(node.id);
  };

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', paddingBottom: 0 }}>
      {/* Top Workstation Control & Audit Stamp Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="stamp stamp-alert">COORDINATOR ISOLATION VERIFIED</span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              PERSON_1476 has <strong>0 direct crime-scene edges</strong> to CASE_0001 (Separation: 4 intermediate hops).
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setHighlightChainOnly(!highlightChainOnly)}
            className={`btn btn-sm ${highlightChainOnly ? 'btn-primary' : ''}`}
          >
            <GitFork size={12} />
            {highlightChainOnly ? 'Showing 5-Hop Chain' : 'Show All Graph Edges'}
          </button>
          <button
            onClick={() => onNavigate('dossier', caseId)}
            className="btn btn-sm"
          >
            <FileSpreadsheet size={12} />
            Export Chain Dossier
          </button>
        </div>
      </div>

      {/* Main Graph Canvas & Right Inspector Drawer */}
      <div style={{ flex: 1, display: 'flex', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', position: 'relative' }}>
        {/* Canvas Pane */}
        <div style={{ flex: 1, height: '100%', backgroundColor: 'var(--bg-canvas)' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodeClick={handleNodeClick}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.2}
            maxZoom={2}
          >
            <Background color="#CBD5E1" gap={20} size={1} />
            <Controls style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', fill: 'var(--text-primary)' }} />
            <MiniMap style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }} nodeColor="#94A3B8" />
          </ReactFlow>
        </div>

        {/* Right Entity Inspector Pane */}
        <div style={{
          width: '320px',
          borderLeft: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface)',
          padding: '16px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: '6px' }}>
              Selected Node Inspector
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="data-id" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {selectedEntity}
              </span>
              {selectedEntity === 'PERSON_1476' ? (
                <span className="stamp stamp-alert">COORDINATOR</span>
              ) : selectedEntity === 'PERSON_1459' ? (
                <span className="stamp stamp-alert">ACCUSED</span>
              ) : selectedEntity === 'PERSON_0553' ? (
                <span className="stamp stamp-safe">SAFE CONTROL</span>
              ) : (
                <span className="stamp">INSPECTION TARGET</span>
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', marginTop: '10px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Forensic Role & Attributes
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {selectedEntity === 'PERSON_1476' ? (
                  <>
                    Identified as Mastermind / Upstream Coordinator of syndicate NET_001. High betweenness centrality (0.0450).
                    Layered funds and telecom through 3 intermediary cutouts (PERSON_0026, PERSON_0397, PERSON_0405).
                  </>
                ) : selectedEntity === 'PERSON_1459' ? (
                  <>
                    Primary accused in FIR_0001 (Section 384 IPC). Apprehended following ANPR vehicle checkpoint sightings at LOCATION_0041.
                  </>
                ) : selectedEntity === 'PERSON_0553' ? (
                  <>
                    Verified civilian control. High degree (15 contacts, 80 commercial calls). 0 criminal predicates, 0 FIR charges.
                  </>
                ) : (
                  <>
                    Intermediate syndicate broker node facilitating communications and wire transactions between tiers.
                  </>
                )}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', marginTop: '10px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Traceable Evidence Categories
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                <span className="stamp">3 CDR CALLS</span>
                <span className="stamp">INR 18,885.32 WIRE</span>
                <span className="stamp">ANPR LOG</span>
                <span className="stamp">FIR_0001</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={() => {
                if (selectedEntity.startsWith('PERSON_')) {
                  onNavigate('person', selectedEntity);
                } else if (selectedEntity.startsWith('CASE_')) {
                  onNavigate('case', selectedEntity);
                }
              }}
              className="btn btn-sm btn-primary"
              style={{ width: '100%' }}
            >
              <ExternalLink size={12} />
              Open Suspect Full Dossier
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
