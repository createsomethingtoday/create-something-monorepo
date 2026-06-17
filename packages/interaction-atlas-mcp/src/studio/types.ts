export type AtlasCanvasNodeKind =
  | 'actor'
  | 'human'
  | 'ai'
  | 'system'
  | 'data'
  | 'constraint'
  | 'touchpoint';

export type AtlasCanvasNodeStatus = 'run' | 'wait' | 'stop' | 'unknown';
export type AtlasSessionActor = 'operator' | 'agent' | 'system';
export type AtlasSuggestionStatus = 'queued' | 'accepted' | 'rejected';

export type AtlasCanvasNode = {
  id: string;
  kind: AtlasCanvasNodeKind;
  label: string;
  atlasId?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  owner?: string;
  status: AtlasCanvasNodeStatus;
  notes?: string;
  evidence?: string;
  createdBy: AtlasSessionActor;
  updatedAt: string;
};

export type AtlasCanvasEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
  evidence?: string;
  createdBy: AtlasSessionActor;
  updatedAt: string;
};

export type AtlasObservation = {
  id: string;
  text: string;
  source: AtlasSessionActor;
  createdAt: string;
};

export type AtlasSuggestion = {
  id: string;
  status: AtlasSuggestionStatus;
  reason: string;
  createdAt: string;
  acceptedAt?: string;
  payload: Omit<AtlasCanvasNode, 'id' | 'createdBy' | 'updatedAt'>;
};

export type AtlasSessionCanvas = {
  nodes: AtlasCanvasNode[];
  edges: AtlasCanvasEdge[];
};

export type AtlasSession = {
  version: 1;
  id: string;
  client: string;
  workflow: string;
  owner?: string;
  createdAt: string;
  updatedAt: string;
  canvas: AtlasSessionCanvas;
  observations: AtlasObservation[];
  suggestions: AtlasSuggestion[];
};

export type AtlasPaletteItem = {
  id: string;
  kind: AtlasCanvasNodeKind;
  label: string;
  description?: string;
};
