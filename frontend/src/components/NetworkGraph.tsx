import React, { useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position
} from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Crown, GitBranch, Target, ShieldCheck, Briefcase, MapPin, Car, User, Smartphone, Building } from 'lucide-react';
import { NodeDetailDrawer } from './NodeDetailDrawer';

// Custom Typed Node Component
const CustomEntityNode = ({ data }: { data: any }) => {
  const { id, label, role, type, isCriminal } = data;

  const getStyle = () => {
    if (role === 'UPSTREAM_COORDINATOR') {
      return {
        border: '2px solid #A855F7',
        background: '#1F1335',
        color: '#E9D5FF',
        glow: '0 0 14px rgba(168,85,247,0.5)',
        icon: Crown,
        tag: 'COORDINATOR'
      };
    }
    if (role === 'BROKER') {
      return {
        border: '2px solid #F59E0B',
        background: '#2A1F0D',
        color: '#FDE68A',
        glow: '0 0 10px rgba(245,158,11,0.4)',
        icon: GitBranch,
        tag: 'BROKER'
      };
    }
    if (role === 'OPERATIONAL_MEMBER') {
      return {
        border: '2px solid #EF4444',
        background: '#2D1214',
        color: '#FECACA',
        glow: '0 0 10px rgba(239,68,68,0.4)',
        icon: Target,
        tag: 'OPERATIVE'
      };
    }
    if (role === 'PERIPHERAL_ASSOCIATE' && isCriminal === false) {
      return {
        border: '2px solid #14B8A6',
        background: '#0D2622',
        color: '#99F6E4',
        glow: '0 0 10px rgba(20,184,166,0.3)',
        icon: ShieldCheck,
        tag: 'NON-CRIMINAL'
      };
    }
    if (id.startsWith('CASE_')) {
      return {
        border: '2px solid #E11D48',
        background: '#290E17',
        color: '#FECDD3',
        glow: '0 0 10px rgba(225,29,72,0.4)',
        icon: Briefcase,
        tag: 'CASE'
      };
    }
    if (id.startsWith('LOCATION_')) {
      return {
        border: '1px solid #10B981',
        background: '#0D2319',
        color: '#A7F3D0',
        glow: 'none',
        icon: MapPin,
        tag: 'LOCATION'
      };
    }
    if (id.startsWith('VEHICLE_')) {
      return {
        border: '1px solid #60A5FA',
        background: '#101F35',
        color: '#BFDBFE',
        glow: 'none',
        icon: Car,
        tag: 'VEHICLE'
      };
    }
    if (id.startsWith('PHONE_')) {
      return {
        border: '1px solid #38BDF8',
        background: '#0C202F',
        color: '#BAE6FD',
        glow: 'none',
        icon: Smartphone,
        tag: 'PHONE'
      };
    }
    if (id.startsWith('ORG_')) {
      return {
        border: '1px solid #F97316',
        background: '#29180C',
        color: '#FED7AA',
        glow: 'none',
        icon: Building,
        tag: 'ORGANIZATION'
      };
    }
    return {
      border: '1px solid rgba(255,255,255,0.15)',
      background: '#161F2E',
      color: '#E5E7EB',
      glow: 'none',
      icon: User,
      tag: type || 'ENTITY'
    };
  };

  const style = getStyle();
  const Icon = style.icon;

  return (
    <div style={{
      border: style.border,
      background: style.background,
      color: style.color,
      boxShadow: style.glow,
      borderRadius: 'var(--radius-md)',
      padding: '10px 14px',
      minWidth: '160px',
      fontSize: '0.8rem',
      cursor: 'pointer'
    }}>
      <Handle type="target" position={Position.Top} style={{ background: '#60A5FA' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Icon size={14} color={style.color} />
          <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em' }}>
            {style.tag}
          </span>
        </div>
      </div>
      <div style={{ fontWeight: 700, fontSize: '0.85rem', fontFamily: 'JetBrains Mono' }}>
        {id}
      </div>
      {label && label !== id && (
        <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {label}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: '#60A5FA' }} />
    </div>
  );
};

const nodeTypes = {
  customEntity: CustomEntityNode,
};

interface NetworkGraphProps {
  nodes: Node[];
  edges: Edge[];
  height?: string;
  onNodeClickNavigate?: (type: 'person' | 'case', id: string) => void;
}

export const NetworkGraph: React.FC<NetworkGraphProps> = ({
  nodes,
  edges,
  height = '560px',
  onNodeClickNavigate
}) => {
  const [selectedNode, setSelectedNode] = useState<any>(null);

  const onNodeClick = (_: any, node: Node) => {
    setSelectedNode({
      id: node.id,
      label: (node.data as any)?.label,
      role: (node.data as any)?.role,
      type: (node.data as any)?.type,
      confidence: (node.data as any)?.confidence,
      isCriminal: (node.data as any)?.isCriminal,
      data: node.data
    });
  };

  return (
    <div style={{
      position: 'relative',
      height,
      width: '100%',
      background: '#080B12',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden'
    }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        fitView
        minZoom={0.2}
        maxZoom={2.5}
      >
        <Background color="rgba(255, 255, 255, 0.04)" gap={16} size={1} />
        <Controls position="top-left" />
        <MiniMap
          nodeStrokeWidth={3}
          nodeColor={(node: Node) => {
            const role = (node.data as any)?.role;
            if (role === 'UPSTREAM_COORDINATOR') return '#A855F7';
            if (role === 'BROKER') return '#F59E0B';
            if (role === 'OPERATIONAL_MEMBER') return '#EF4444';
            if (node.id.startsWith('CASE_')) return '#E11D48';
            return '#3B82F6';
          }}
          maskColor="rgba(8, 11, 18, 0.8)"
          style={{ background: '#0D131F', border: '1px solid var(--border-subtle)' }}
        />
      </ReactFlow>

      {/* Slide-Over Node Detail Drawer */}
      {selectedNode && (
        <NodeDetailDrawer
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onNavigate={(type, id) => {
            setSelectedNode(null);
            if (onNodeClickNavigate) onNodeClickNavigate(type, id);
          }}
        />
      )}
    </div>
  );
};
