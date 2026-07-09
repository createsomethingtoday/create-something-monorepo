import React, { useMemo } from 'react';

import type {
  AtlasCanvasNode,
  AtlasCanvasNodeKind,
  AtlasCanvasNodeStatus,
  AtlasSession
} from '../types.js';
import {
  CanvasKernel,
  type CanvasKernelFocusRequest,
  type CanvasKernelPalette,
  type CanvasKernelProjection,
  type CanvasKernelViewport
} from '@create-something/canvas-kernel';

type FastNode = Pick<
  AtlasCanvasNode,
  'height' | 'id' | 'kind' | 'label' | 'status' | 'width' | 'x' | 'y'
>;

type FastEdge = {
  id: string;
  source: string;
  target: string;
};

export type FastTopologyGraph = {
  edges: FastEdge[];
  nodes: FastNode[];
};

type FastTopologyCanvasProps = {
  activeNodeIds: Set<string>;
  fitRequest: number;
  focusRequest: CanvasKernelFocusRequest;
  onNodeSelect: (nodeId: string) => void;
  onPaneClick: () => void;
  onViewportChange?: (viewport: CanvasKernelViewport) => void;
  selectedNodeId: string | null;
  session: AtlasSession;
  visibleNodeIds: Set<string> | null;
};

const CANON_NODE_FACE: [number, number, number, number] = [0.992, 0.992, 0.972, 0.96];
const CANON_NODE_FACE_SELECTED: [number, number, number, number] = [1, 1, 0.992, 0.99];
const CANON_NODE_BORDER: [number, number, number, number] = [0.07, 0.08, 0.11, 0.24];
const CANON_EDGE: [number, number, number, number] = [0.12, 0.13, 0.15, 0.15];
const KIND_STRIPE: Record<AtlasCanvasNodeKind, [number, number, number, number]> = {
  actor: [0.07, 0.08, 0.11, 0.5],
  ai: [0.18, 0.28, 0.22, 0.42],
  constraint: [0.77, 0.12, 0.23, 0.46],
  data: [0.49, 0.49, 0.46, 0.42],
  human: [0.0, 0.28, 1, 0.34],
  system: [0.18, 0.19, 0.2, 0.42],
  touchpoint: [0.36, 0.29, 0.42, 0.36]
};
const STATUS_RING: Record<AtlasCanvasNodeStatus, [number, number, number, number]> = {
  run: [0.12, 0.24, 0.18, 0.3],
  stop: [0.77, 0.12, 0.23, 0.38],
  unknown: CANON_NODE_BORDER,
  wait: [0.0, 0.28, 1, 0.26]
};

const ATLAS_CANVAS_PALETTE: CanvasKernelPalette = {
  activeRing: [0.0, 0.28, 1, 0.32],
  edge: CANON_EDGE,
  kindStripe: KIND_STRIPE,
  nodeBorder: CANON_NODE_BORDER,
  nodeFace: CANON_NODE_FACE,
  nodeFaceSelected: CANON_NODE_FACE_SELECTED,
  selectedRing: [0.0, 0.28, 1, 0.72],
  statusRing: STATUS_RING
};

export function fastTopologyGraph(
  session: AtlasSession,
  visibleNodeIds: Set<string> | null
): FastTopologyGraph {
  const nodes = session.canvas.nodes
    .filter((node) => !visibleNodeIds || visibleNodeIds.has(node.id))
    .map((node) => ({
      height: node.height,
      id: node.id,
      kind: node.kind,
      label: node.label,
      status: node.status,
      width: node.width,
      x: node.x,
      y: node.y
    }));
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = session.canvas.edges
    .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
    .map((edge) => ({ id: edge.id, source: edge.source, target: edge.target }));
  return { edges, nodes };
}

export function FastTopologyCanvas({
  activeNodeIds,
  fitRequest,
  focusRequest,
  onNodeSelect,
  onPaneClick,
  onViewportChange,
  selectedNodeId,
  session,
  visibleNodeIds
}: FastTopologyCanvasProps): React.ReactElement {
  const projection = useMemo<CanvasKernelProjection>(
    () => fastTopologyGraph(session, visibleNodeIds),
    [session, visibleNodeIds]
  );

  return (
    <CanvasKernel
      activeNodeIds={activeNodeIds}
      ariaLabel="CREATE SOMETHING canvas"
      fitRequest={fitRequest}
      focusRequest={focusRequest}
      onNodeSelect={onNodeSelect}
      onPaneClick={onPaneClick}
      onViewportChange={onViewportChange}
      palette={ATLAS_CANVAS_PALETTE}
      projection={projection}
      selectedNodeId={selectedNodeId}
    />
  );
}
