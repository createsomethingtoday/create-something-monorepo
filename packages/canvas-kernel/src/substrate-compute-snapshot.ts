export const SUBSTRATE_COMPUTE_SNAPSHOT_VERSION = 'flow.substrate-compute-snapshot.v1' as const;

export type SubstrateComputeScenarioKind =
  | 'impact'
  | 'attention'
  | 'bottleneck'
  | 'agent_work_queue';

export type SubstrateComputeWeightKey =
  | 'latency'
  | 'cost'
  | 'trust'
  | 'confidence'
  | 'reliability'
  | 'impact';

export type SubstrateComputeNode = {
  id: string;
  index: number;
  atlasNodeId: string;
  label: string;
  tier: string;
  surface: string;
  status: string;
  owner: string;
  path: string;
  weights: Record<SubstrateComputeWeightKey, number>;
};

export type SubstrateComputeEdge = {
  id: string;
  index: number;
  source: number;
  sourceId: string;
  target: number;
  targetId: string;
  relation: string;
  evidence: string;
  weights: Record<SubstrateComputeWeightKey, number>;
};

export type SubstrateComputeScenarioInput = {
  id: string;
  kind: SubstrateComputeScenarioKind;
  sourceNodeId: string | null;
  description: string;
  maxDepth: number;
};

export type SubstrateComputeImpactScore = {
  depth: number;
  nodeId: string;
  score: number;
};

export type SubstrateComputeAttentionRank = {
  nodeId: string;
  rank: number;
  score: number;
  reasons: string[];
};

export type SubstrateComputeBottleneckCandidate = {
  nodeId: string;
  score: number;
  inbound: number;
  outbound: number;
  reasons: string[];
};

export type SubstrateComputeAgentWorkItem = {
  nodeId: string;
  rank: number;
  action: 'inspect' | 'simulate' | 'execute' | 'receipt';
  reason: string;
};

export type SubstrateComputeSnapshot = {
  version: typeof SUBSTRATE_COMPUTE_SNAPSHOT_VERSION;
  id: string;
  topologyId: string;
  atlasCanvasId: string;
  sessionId: string;
  generatedAt: string;
  engine: 'cpu';
  source: 'substrate' | 'atlas-session';
  scenario: SubstrateComputeScenarioInput;
  counts: {
    nodes: number;
    edges: number;
    impactNodes: number;
    attentionNodes: number;
    bottleneckNodes: number;
    workItems: number;
  };
  buffers: {
    nodeIds: string[];
    edgeIds: string[];
    edgeSources: number[];
    edgeTargets: number[];
    weightKeys: SubstrateComputeWeightKey[];
    edgeWeights: number[][];
    nodeWeights: number[][];
  };
  nodes: SubstrateComputeNode[];
  edges: SubstrateComputeEdge[];
  outputs: {
    impact: SubstrateComputeImpactScore[];
    attention: SubstrateComputeAttentionRank[];
    bottlenecks: SubstrateComputeBottleneckCandidate[];
    agentWorkQueue: SubstrateComputeAgentWorkItem[];
  };
  endpoints: {
    computeSnapshot: string;
    canvasState: string;
    topology: string;
    records: string;
  };
};

export type SubstrateComputeSnapshotOptions = {
  sessionId?: string;
  source?: 'substrate' | 'atlas-session';
  generatedAt?: string;
  scenario?: Partial<SubstrateComputeScenarioInput>;
  limit?: number;
};
