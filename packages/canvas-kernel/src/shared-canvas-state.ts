export const SHARED_CANVAS_STATE_VERSION = 'flow.shared-canvas-state.v1' as const;

export const CANVAS_KERNEL_RENDERER = 'canvas-kernel' as const;

export type SharedCanvasRenderer = typeof CANVAS_KERNEL_RENDERER;

export type SharedCanvasSource = 'substrate' | 'atlas-session';

export type SharedCanvasLevelOfDetail = 'detail' | 'compact' | 'skeleton';

export type SharedCanvasViewport = {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
  limit: number;
  lod: SharedCanvasLevelOfDetail;
};

export type SharedCanvasNode = {
  id: string;
  atlasId?: string;
  sourceRecordId: string;
  label: string;
  kind: string;
  status: string;
  x: number;
  y: number;
  width: number;
  height: number;
  owner?: string;
  tier?: string;
  surface?: string;
  path?: string;
};

export type SharedCanvasEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
  evidence: string;
};

export type SharedCanvasState = {
  version: typeof SHARED_CANVAS_STATE_VERSION;
  id: string;
  topologyId: string;
  atlasCanvasId: string;
  sessionId: string;
  renderer: SharedCanvasRenderer;
  source: SharedCanvasSource;
  generatedAt: string;
  lens: string;
  query: string;
  storyStepId: string | null;
  selectedNodeId: string | null;
  focusedNodeIds: string[];
  viewport: SharedCanvasViewport;
  counts: {
    totalNodes: number;
    totalEdges: number;
    candidateNodes: number;
    visibleNodes: number;
    visibleEdges: number;
    omittedNodes: number;
    omittedEdges: number;
  };
  visibleNodeIds: string[];
  visibleEdgeIds: string[];
  nodes: SharedCanvasNode[];
  edges: SharedCanvasEdge[];
  joins: {
    substrateRecordId: string;
    topologyNodeId: string;
    atlasCanvasId: string;
    atlasNodeId: string;
  }[];
  endpoints: {
    canvasState: string;
    atlasSession: string;
    atlasViewport: string;
    topology: string;
    records: string;
  };
};

export type SharedCanvasStateOptions = {
  sessionId?: string;
  source?: SharedCanvasSource;
  renderer?: SharedCanvasRenderer;
  generatedAt?: string;
  lens?: string;
  query?: string;
  storyStepId?: string | null;
  selectedNodeId?: string | null;
  focusedNodeIds?: string[];
  viewport?: Partial<Omit<SharedCanvasViewport, 'lod'>>;
};
