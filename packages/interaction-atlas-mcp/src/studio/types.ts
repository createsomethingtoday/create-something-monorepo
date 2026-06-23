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
export type AtlasPrimitiveBindingKind =
  | 'airtable_table'
  | 'cloudflare_d1'
  | 'cloudflare_r2'
  | 'cloudflare_worker'
  | 'config'
  | 'dify_agent'
  | 'mcp_server'
  | 'policy'
  | 'repo_path'
  | 'script'
  | 'webflow_cloud_app'
  | 'webflow_code_component';
export type AtlasPrimitiveSyncStatus = 'synced' | 'partial' | 'missing' | 'unbound' | 'unknown';

export type AtlasPrimitiveBinding = {
  id: string;
  kind: AtlasPrimitiveBindingKind;
  label: string;
  source: string;
  selector?: string;
  required?: boolean;
};

export type AtlasPrimitiveBindingCheck = AtlasPrimitiveBinding & {
  status: Exclude<AtlasPrimitiveSyncStatus, 'partial' | 'unbound'>;
  summary: string;
};

export type AtlasNodeSync = {
  status: AtlasPrimitiveSyncStatus;
  checkedAt: string;
  summary: string;
  bindingCount: number;
  issueCount: number;
  checks: AtlasPrimitiveBindingCheck[];
};

export type AtlasWritebackRisk = 'safe' | 'review' | 'approval';
export type AtlasWritebackActionStatus = 'proposed' | 'approved' | 'applied' | 'rejected';
export type AtlasWritebackProposalStatus = 'proposed' | 'approved' | 'applied' | 'rejected';

export type AtlasWritebackTarget = {
  nodeId: string;
  nodeLabel: string;
  bindingIds: string[];
  bindingKinds: AtlasPrimitiveBindingKind[];
  sources: string[];
};

export type AtlasWritebackAction = {
  id: string;
  nodeId: string;
  risk: AtlasWritebackRisk;
  target: AtlasWritebackTarget;
  title: string;
  summary: string;
  suggestedChange: string;
  requires: string[];
  status: AtlasWritebackActionStatus;
  reviewedAt?: string;
  reviewedBy?: AtlasSessionActor;
  reviewNote?: string;
};

export type AtlasWritebackProposalSummary = {
  total: number;
  safe: number;
  review: number;
  approval: number;
  drift: number;
  proposed: number;
  approved: number;
  applied: number;
  rejected: number;
};

export type AtlasWritebackProposal = {
  id: string;
  profile: 'template-system';
  createdAt: string;
  status: AtlasWritebackProposalStatus;
  summary: AtlasWritebackProposalSummary;
  actions: AtlasWritebackAction[];
};

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
  bindings?: AtlasPrimitiveBinding[];
  sync?: AtlasNodeSync;
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

export type AtlasStoryCallout = {
  id: string;
  nodeId?: string;
  text: string;
  severity: 'info' | 'risk' | 'decision';
};

export type AtlasStoryQuestion = {
  id: string;
  nodeId?: string;
  owner?: string;
  question: string;
  status: 'open' | 'answered';
};

export type AtlasStoryStep = {
  id: string;
  title: string;
  summary: string;
  focusNodeIds?: string[];
  focusEdgeIds?: string[];
  owner?: string;
  proof?: string;
  status?: 'current' | 'done' | 'next';
};

export type AtlasStoryState = {
  active: boolean;
  activeStepId?: string;
  title?: string;
  narration?: string;
  nextAction?: string;
  focusNodeIds: string[];
  focusEdgeIds: string[];
  dimUnfocused: boolean;
  callouts: AtlasStoryCallout[];
  questions: AtlasStoryQuestion[];
  steps: AtlasStoryStep[];
  updatedAt: string;
  updatedBy: AtlasSessionActor;
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
  story?: AtlasStoryState;
  proposals?: AtlasWritebackProposal[];
  suggestions: AtlasSuggestion[];
};

export type AtlasPaletteItem = {
  id: string;
  kind: AtlasCanvasNodeKind;
  label: string;
  description?: string;
};
