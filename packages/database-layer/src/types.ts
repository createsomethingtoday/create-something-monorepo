import type {
  SharedCanvasEdge,
  SharedCanvasLevelOfDetail,
  SharedCanvasNode,
  SharedCanvasRenderer,
  SharedCanvasSource,
  SharedCanvasState,
  SharedCanvasStateOptions,
  SharedCanvasViewport
} from '@create-something/canvas-kernel/shared-canvas-state';
import type {
  SubstrateComputeAgentWorkItem,
  SubstrateComputeAttentionRank,
  SubstrateComputeBottleneckCandidate,
  SubstrateComputeEdge,
  SubstrateComputeImpactScore,
  SubstrateComputeNode,
  SubstrateComputeScenarioInput,
  SubstrateComputeSnapshot,
  SubstrateComputeSnapshotOptions,
  SubstrateComputeWeightKey
} from '@create-something/canvas-kernel/substrate-compute-snapshot';

export type DatabaseLayerRecordStatus = 'ready' | 'review' | 'blocked' | 'complete';

export type DatabaseLayerBindingHealth = 'bound' | 'reviewed' | 'gap';

export type DatabaseLayerActionState = 'run' | 'wait' | 'stop' | 'complete';

export type DatabaseLayerSourceRecord = {
  id: string;
  source: string;
  sourceType: string;
  title: string;
  owner: string;
  status: DatabaseLayerRecordStatus;
  bindingHealth: DatabaseLayerBindingHealth;
  atlasCanvasId: string;
  atlasNodeId: string;
  relationCount: number;
  receiptId: string;
  updatedAt: string;
  summary: string;
  semantics: DatabaseLayerTopologySemantics;
};

export type DatabaseLayerAtlasBinding = {
  recordId: string;
  canvasId: string;
  nodeId: string;
  canvasTitle: string;
  nodeLabel: string;
  relationEvidence: string;
};

export type DatabaseLayerWorkflowAction = {
  id: string;
  recordId: string;
  state: DatabaseLayerActionState;
  title: string;
  owner: string;
  policy: string;
  detail: string;
};

export type DatabaseLayerReceipt = {
  id: string;
  recordId: string;
  type: 'transfer' | 'decision' | 'proof' | 'handoff';
  summary: string;
  evidence: string;
  createdAt: string;
};

export type DatabaseLayerCapability = {
  label: string;
  surface: 'API' | 'MCP' | 'Agent' | 'UI';
  detail: string;
};

export type DatabaseLayerPerformanceBudget = {
  label: string;
  surface: 'local' | 'cloud' | 'agent';
  target: string;
  baseline: string;
  detail: string;
};

export type DatabaseLayerPerformanceFastPath = {
  id: string;
  surface: 'api' | 'worker' | 'client' | 'agent';
  mechanism: string;
  evidence: string;
};

export type DatabaseLayerPerformanceContract = {
  id: string;
  generatedAt: string;
  topologyId: string;
  atlasCanvasId: string;
  runtime: 'substrate';
  baseline: 'obsidian_like_operator_speed';
  summary: {
    topologyRecords: number;
    topologyEdges: number;
    managementResources: number;
    managementOperations: number;
    workerCacheControl: string;
    generatedArtifactCount: number;
  };
  budgets: DatabaseLayerPerformanceBudget[];
  fastPath: DatabaseLayerPerformanceFastPath[];
  nonGoals: string[];
};

export type DatabaseLayerOrganizationReviewFinding = {
  id: string;
  classification: 'value_signal' | 'disconnect' | 'overlap' | 'redundancy' | 'risk';
  severity: 'info' | 'review' | 'high';
  title: string;
  summary: string;
  evidence: string[];
  nextAction: string;
};

export type DatabaseLayerOrganizationReviewMove = {
  id: string;
  title: string;
  tier: 'Database' | 'Automation' | 'Judgment' | 'Mixed';
  summary: string;
  evidence: string[];
  apiPath?: string;
  agentCommand?: string;
};

export type DatabaseLayerOrganizationReview = {
  id: string;
  generatedAt: string;
  topologyId: string;
  atlasCanvasId: string;
  valueState: 'valuable' | 'valuable_with_review_signals' | 'blocked';
  answer: string;
  summary: {
    nodes: number;
    edges: number;
    mapped: number;
    hardGaps: number;
    reviewSignals: number;
    operatingSlices: number;
    clientOverlays: number;
    automationRecords: number;
    databaseRecords: number;
    workerRecords: number;
    mcpRecords: number;
    policyRecords: number;
    guideRecords: number;
  };
  findings: DatabaseLayerOrganizationReviewFinding[];
  recommendedMoves: DatabaseLayerOrganizationReviewMove[];
};

export type DatabaseLayerBusinessOperatingLane = {
  id: string;
  sourceMoveId: string;
  title: string;
  tier: DatabaseLayerTopologyTier;
  status: 'operationalized';
  operatingLane:
    | 'substrate_product_surface'
    | 'worker_runtime_review'
    | 'client_overlay_delivery'
    | 'policy_guide_attachment';
  summary: string;
  evidence: string[];
  sourceArtifacts: string[];
  resources: unknown[];
  metrics: Record<string, unknown>;
  relatedSliceIds: string[];
  deliveryPacketIds: string[];
  policyAttachmentCount: number;
  apiPath: string;
  mcpUri: string;
  agentCommand: string;
  receiptId: string;
  approvalBoundary: string;
  nextAction: string;
  verification: string[];
};

export type DatabaseLayerBusinessClientDeliveryPacket = {
  clientSlug: string;
  title: string;
  status: 'mapped';
  atlasCanvasId: string;
  packageCount: number;
  receiptCount: number;
  nextActionCount: number;
  runtimeCount: number;
  docCount: number;
  workerConfigCount: number;
  apiPath: string;
  mcpUri: string;
  agentCommand: string;
  packages: unknown[];
  receiptIds: string[];
  actionIds: string[];
  approvalBoundary: string;
};

export type DatabaseLayerBusinessPolicyGuideAttachment = {
  sliceId: string;
  title: string;
  tier: DatabaseLayerTopologyTier;
  surface: DatabaseLayerTopologySurface;
  productionStatus: 'approval_required' | 'blocked';
  policyRecordIds: string[];
  guideRecordIds: string[];
  docRecordIds: string[];
  policyPaths: string[];
  guidePaths: string[];
  docPaths: string[];
  approvalBoundary: string;
  receiptPath: string;
  attachmentStatus: 'attached' | 'review';
};

export type DatabaseLayerBusinessOperatingRecommendations = {
  id: string;
  generatedAt: string;
  topologyId: string;
  atlasCanvasId: string;
  sourceOrganizationReviewId: string;
  sourceManagementSurfaceId: string;
  valueState: 'operationalized_recommendations';
  answer: string;
  summary: {
    recommendedMoves: number;
    operationalizedLanes: number;
    topologyNodes: number;
    topologyEdges: number;
    managementResources: number;
    managementOperations: number;
    operatingSlices: number;
    workerSlices: number;
    clientDeliveryPackets: number;
    policyGuideAttachments: number;
    approvalRequiredForExternalWrites: boolean;
  };
  lanes: DatabaseLayerBusinessOperatingLane[];
  workerRuntimeReview: unknown;
  clientDeliveryPackets: DatabaseLayerBusinessClientDeliveryPacket[];
  policyGuideAttachments: DatabaseLayerBusinessPolicyGuideAttachment[];
  receipts: DatabaseLayerReceipt[];
  approvalBoundary: string;
};

export type DatabaseLayerSystemDesignPrinciple = {
  label: string;
  tier: 'Database' | 'Automation' | 'Judgment';
  principle: string;
  evidence: string;
};

export type DatabaseLayerRuntimeProfile = {
  name: string;
  posture: 'first-class' | 'candidate' | 'legacy';
  storage: string[];
  apiBoundary: string;
  mcpBoundary: string;
  uiBoundary: string;
  atlasBoundary: string;
  desktopBoundary: string;
};

export type DatabaseLayerTopologyTier = 'Database' | 'Automation' | 'Judgment' | 'Mixed';

export type DatabaseLayerTopologySurface =
  | 'repo'
  | 'package'
  | 'app'
  | 'worker'
  | 'client'
  | 'mcp'
  | 'agent'
  | 'policy'
  | 'guide'
  | 'doc'
  | 'config';

export type DatabaseLayerTopologyNodeStatus = 'mapped' | 'needs_atlas' | 'needs_substrate';

export type DatabaseLayerTopologyCoverageState = 'mapped' | 'partial' | 'missing';

export type DatabaseLayerTopologyVerificationState = 'verified' | 'declared' | 'unverified';

export type DatabaseLayerTopologyHealthState = 'healthy' | 'degraded' | 'unavailable' | 'unknown';

export type DatabaseLayerTopologyAuthorityState = 'run' | 'wait' | 'stop' | 'unknown';

export type DatabaseLayerTopologyProofState = 'attached' | 'missing' | 'not-required' | 'unknown';

export type DatabaseLayerTopologyProvenanceKind = 'observed' | 'derived' | 'declared';

export type DatabaseLayerTopologyFreshnessState = 'current' | 'stale' | 'unknown';

export type DatabaseLayerTopologyChangeState = 'added' | 'changed' | 'removed' | 'unchanged' | 'unknown';

export type DatabaseLayerTopologyProvenance = {
  kind: DatabaseLayerTopologyProvenanceKind;
  sourceLabel: string;
  explanation: string;
};

export type DatabaseLayerTopologyFreshness = {
  state: DatabaseLayerTopologyFreshnessState;
  checkedAt?: string;
  reviewBy?: string;
};

export type DatabaseLayerTopologySemantics = {
  coverage: DatabaseLayerTopologyCoverageState;
  verification: DatabaseLayerTopologyVerificationState;
  health: DatabaseLayerTopologyHealthState;
  authority: DatabaseLayerTopologyAuthorityState;
  proof: DatabaseLayerTopologyProofState;
  provenance: DatabaseLayerTopologyProvenance;
  freshness: DatabaseLayerTopologyFreshness;
  change: DatabaseLayerTopologyChangeState;
};

export type DatabaseLayerTopologySemanticsOptions = {
  verification?: DatabaseLayerTopologyVerificationState;
  health?: DatabaseLayerTopologyHealthState;
  authority?: DatabaseLayerTopologyAuthorityState;
  proof?: DatabaseLayerTopologyProofState;
  provenance?: DatabaseLayerTopologyProvenance;
  checkedAt?: string;
  reviewBy?: string;
  now?: string;
  change?: DatabaseLayerTopologyChangeState;
};

export type DatabaseLayerSystemContextLens = 'dependencies' | 'authority' | 'change' | 'proof';

export type DatabaseLayerSystemContextNodeKind =
  | 'actor'
  | 'human'
  | 'ai'
  | 'system'
  | 'data'
  | 'constraint'
  | 'touchpoint';

export type DatabaseLayerSystemContextNode = {
  id: string;
  label: string;
  kind: DatabaseLayerSystemContextNodeKind;
  summary: string;
  semantics: Omit<DatabaseLayerTopologySemantics, 'provenance' | 'freshness'> & {
    freshness: DatabaseLayerTopologyFreshnessState;
  };
  provenance: DatabaseLayerTopologyProvenance;
  owner: string;
  evidence: string[];
  recovery: string;
  visibility?: 'public' | 'client' | 'internal';
  internal?: Record<string, unknown>;
};

export type DatabaseLayerSystemContextRelationship = {
  id: string;
  source: string;
  target: string;
  relation: string;
  provenance: DatabaseLayerTopologyProvenanceKind;
  visibility?: 'public' | 'client' | 'internal';
  internal?: Record<string, unknown>;
};

export type DatabaseLayerSystemContextSource = {
  version: 'system-context.operating-slice.v1';
  id: string;
  audience: 'internal' | 'client' | 'public';
  reviewStatus: string;
  workflow: {
    label: string;
    summary: string;
    boundary: string;
  };
  source: {
    kind: DatabaseLayerTopologyProvenanceKind;
    label: string;
    href?: string;
    checkedAt?: string;
    reviewBy?: string;
    freshness: DatabaseLayerTopologyFreshnessState;
  };
  comparison?: {
    label: string;
    checkedAt?: string;
  };
  nodes: DatabaseLayerSystemContextNode[];
  relationships: DatabaseLayerSystemContextRelationship[];
  lenses: Record<DatabaseLayerSystemContextLens, string[]>;
  receipt: {
    sourceLabel: string;
    lastCheckedLabel: string;
    changeLabel: string;
    recoveryLabel: string;
  };
};

export type DatabaseLayerSystemContextProjection = Omit<
  DatabaseLayerSystemContextSource,
  'nodes' | 'relationships' | 'lenses'
> & {
  audience: 'internal' | 'client' | 'public';
  selectedLens: DatabaseLayerSystemContextLens;
  nodes: Array<Omit<DatabaseLayerSystemContextNode, 'internal'>>;
  relationships: Array<Omit<DatabaseLayerSystemContextRelationship, 'internal'>>;
  lenses: Record<DatabaseLayerSystemContextLens, string[]>;
  visibleNodeIds: string[];
  visibleRelationshipIds: string[];
  redactions: string[];
};

export type DatabaseLayerSystemContextProjectionOptions = {
  audience: 'internal' | 'client' | 'public';
  lens?: DatabaseLayerSystemContextLens;
  maxNodes?: number;
  now?: string;
};

export type DatabaseLayerTopologyNode = {
  id: string;
  atlasNodeId: string;
  title: string;
  path: string;
  tier: DatabaseLayerTopologyTier;
  surface: DatabaseLayerTopologySurface;
  owner: string;
  status: DatabaseLayerTopologyNodeStatus;
  summary: string;
  tags: string[];
  packageName?: string;
  runtime?: string;
  clientSlug?: string;
};

export type DatabaseLayerTopologyEdge = {
  id: string;
  source: string;
  target: string;
  relation:
    | 'contains'
    | 'depends_on'
    | 'renders'
    | 'runs'
    | 'documents'
    | 'governs'
    | 'client_overlay'
    | 'configures';
  evidence: string;
};

export type DatabaseLayerTopologyCoverage = {
  generatedAt: string;
  rootPath: string;
  packageCount: number;
  appCount: number;
  workerCount: number;
  clientOverlayCount: number;
  policyCount: number;
  guideCount: number;
  configCount: number;
};

export type DatabaseLayerInternalTopology = {
  id: string;
  title: string;
  atlasCanvasId: string;
  rootNodeId: string;
  coverage: DatabaseLayerTopologyCoverage;
  nodes: DatabaseLayerTopologyNode[];
  edges: DatabaseLayerTopologyEdge[];
};

export type DatabaseLayerAtlasNodeKind =
  | 'actor'
  | 'human'
  | 'ai'
  | 'system'
  | 'data'
  | 'constraint'
  | 'touchpoint';

export type DatabaseLayerAtlasNodeStatus = 'run' | 'wait' | 'stop' | 'unknown';

export type DatabaseLayerAtlasNode = {
  id: string;
  kind: DatabaseLayerAtlasNodeKind;
  label: string;
  owner?: string;
  status: DatabaseLayerAtlasNodeStatus;
  notes?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  sourceRecordId: string;
  createdBy: 'system';
  updatedAt: string;
};

export type DatabaseLayerAtlasEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
  evidence: string;
  createdBy: 'system';
  updatedAt: string;
};

export type DatabaseLayerAtlasCanvas = {
  version: 1;
  id: string;
  title: string;
  nodes: DatabaseLayerAtlasNode[];
  edges: DatabaseLayerAtlasEdge[];
  createdAt: string;
  updatedAt: string;
};

export type DatabaseLayerSharedCanvasRenderer = SharedCanvasRenderer;

export type DatabaseLayerSharedCanvasSource = SharedCanvasSource;

export type DatabaseLayerSharedCanvasLevelOfDetail = SharedCanvasLevelOfDetail;

export type DatabaseLayerSharedCanvasViewport = SharedCanvasViewport;

export type DatabaseLayerSharedCanvasNode = Omit<SharedCanvasNode, 'kind' | 'status' | 'surface' | 'tier'> & {
  kind: DatabaseLayerAtlasNodeKind;
  status: DatabaseLayerAtlasNodeStatus;
  tier?: DatabaseLayerTopologyTier;
  surface?: DatabaseLayerTopologySurface;
};

export type DatabaseLayerSharedCanvasEdge = SharedCanvasEdge;

export type DatabaseLayerSharedCanvasState = Omit<SharedCanvasState, 'edges' | 'nodes' | 'viewport'> & {
  viewport: DatabaseLayerSharedCanvasViewport;
  nodes: DatabaseLayerSharedCanvasNode[];
  edges: DatabaseLayerSharedCanvasEdge[];
};

export type DatabaseLayerSharedCanvasStateOptions = SharedCanvasStateOptions;

export type DatabaseLayerSubstrateComputeWeightKey = SubstrateComputeWeightKey;

export type DatabaseLayerSubstrateComputeNode = SubstrateComputeNode & {
  tier: DatabaseLayerTopologyTier;
  surface: DatabaseLayerTopologySurface;
  status: DatabaseLayerTopologyNodeStatus;
};

export type DatabaseLayerSubstrateComputeEdge = SubstrateComputeEdge;

export type DatabaseLayerSubstrateComputeScenarioInput = SubstrateComputeScenarioInput;

export type DatabaseLayerSubstrateComputeImpactScore = SubstrateComputeImpactScore;

export type DatabaseLayerSubstrateComputeAttentionRank = SubstrateComputeAttentionRank;

export type DatabaseLayerSubstrateComputeBottleneckCandidate = SubstrateComputeBottleneckCandidate;

export type DatabaseLayerSubstrateComputeAgentWorkItem = SubstrateComputeAgentWorkItem;

export type DatabaseLayerSubstrateComputeSnapshot = Omit<SubstrateComputeSnapshot, 'edges' | 'nodes'> & {
  nodes: DatabaseLayerSubstrateComputeNode[];
  edges: DatabaseLayerSubstrateComputeEdge[];
};

export type DatabaseLayerSubstrateComputeSnapshotOptions = SubstrateComputeSnapshotOptions;

export type DatabaseLayerTopologyProjection = {
  topologyId: string;
  atlasCanvas: DatabaseLayerAtlasCanvas;
  sharedCanvasState: DatabaseLayerSharedCanvasState;
  computeSnapshot: DatabaseLayerSubstrateComputeSnapshot;
  sourceRecords: DatabaseLayerSourceRecord[];
  atlasBindings: DatabaseLayerAtlasBinding[];
  gapActions: DatabaseLayerWorkflowAction[];
  receipts: DatabaseLayerReceipt[];
 };

export type DatabaseLayerTopologyGapKind = 'needs_atlas' | 'needs_substrate';

export type DatabaseLayerTopologyGapCount = {
  needs_atlas: number;
  needs_substrate: number;
};

export type DatabaseLayerTopologyStatusSurfaceCount = {
  status: DatabaseLayerTopologyNodeStatus;
  surface: DatabaseLayerTopologySurface;
  count: number;
};

export type DatabaseLayerTopologyTierStatusCount = {
  tier: DatabaseLayerTopologyTier;
  status: DatabaseLayerTopologyNodeStatus;
  count: number;
};

export type DatabaseLayerTopologyClientOverlay = {
  clientSlug: string;
  path: string;
  title: string;
  status: DatabaseLayerTopologyNodeStatus;
  tier: DatabaseLayerTopologyTier;
  runtime?: string;
  relationCount: number;
  actionId?: string;
};

export type DatabaseLayerTopologyPriorityItem = {
  rank: number;
  actionId: string;
  recordId: string;
  title: string;
  owner: string;
  gapKind: DatabaseLayerTopologyGapKind;
  surface: DatabaseLayerTopologySurface;
  tier: DatabaseLayerTopologyTier;
  path: string;
  clientSlug?: string;
  relationCount: number;
  rationale: string;
};

export type DatabaseLayerTopologyCompletionLane = {
  id: 'client_atlas' | 'substrate_runtime' | 'mcp_agent' | 'policy_judgment' | 'package_atlas';
  title: string;
  gapKind: DatabaseLayerTopologyGapKind;
  count: number;
  summary: string;
  nextAction: string;
};

export type DatabaseLayerTopologyCompletionReport = {
  id: string;
  topologyId: string;
  atlasCanvasId: string;
  generatedAt: string;
  totals: {
    nodes: number;
    edges: number;
    mapped: number;
    gaps: number;
    gapCounts: DatabaseLayerTopologyGapCount;
  };
  statusBySurface: DatabaseLayerTopologyStatusSurfaceCount[];
  statusByTier: DatabaseLayerTopologyTierStatusCount[];
  clientOverlays: DatabaseLayerTopologyClientOverlay[];
  completionLanes: DatabaseLayerTopologyCompletionLane[];
  firstCompletionWave: DatabaseLayerTopologyPriorityItem[];
};

export type DatabaseLayerTopologyDiagnosticsSignalClassification =
  | 'hard_gap'
  | 'review_signal'
  | 'positive_signal';

export type DatabaseLayerTopologyDiagnosticsSignalSeverity = 'info' | 'review' | 'high';

export type DatabaseLayerTopologyDiagnosticsSignal = {
  id: string;
  classification: DatabaseLayerTopologyDiagnosticsSignalClassification;
  severity: DatabaseLayerTopologyDiagnosticsSignalSeverity;
  title: string;
  summary: string;
  evidence: string[];
  nodeIds: string[];
  paths: string[];
  nextAction: string;
};

export type DatabaseLayerTopologyDiagnostics = {
  id: string;
  topologyId: string;
  atlasCanvasId: string;
  generatedAt: string;
  summary: {
    valueState: 'connected_map' | 'connected_map_with_review_signals' | 'hard_gaps_present';
    nodes: number;
    edges: number;
    mapped: number;
    hardGapCount: number;
    reviewSignalCount: number;
    exactDuplicatePathCount: number;
    isolatedNodeCount: number;
    surfaceCounts: Record<string, number>;
    tierCounts: Record<string, number>;
  };
  signals: DatabaseLayerTopologyDiagnosticsSignal[];
};

export type DatabaseLayerClientOverlayPackage = {
  recordId: string;
  atlasNodeId: string;
  packageName: string;
  path: string;
  tier: DatabaseLayerTopologyTier;
  runtime?: string;
  summary: string;
  commands: string[];
  docs: string[];
  workerConfigs: string[];
};

export type DatabaseLayerClientOverlay = {
  clientSlug: string;
  recordId: string;
  atlasCanvasId: string;
  title: string;
  owner: string;
  status: 'mapped';
  packages: DatabaseLayerClientOverlayPackage[];
  atlasNodes: Array<{
    id: string;
    recordId: string;
    label: string;
    kind: DatabaseLayerAtlasNodeKind;
    path: string;
  }>;
  substrateRecords: DatabaseLayerSourceRecord[];
  receipts: DatabaseLayerReceipt[];
  nextActions: DatabaseLayerWorkflowAction[];
};

export type DatabaseLayerClientOverlayCoverage = {
  id: string;
  generatedAt: string;
  topologyId: string;
  atlasCanvasId: string;
  overlays: DatabaseLayerClientOverlay[];
};

export type DatabaseLayerRuntimeBindingKind =
  | 'assets'
  | 'd1'
  | 'durable_object'
  | 'kv'
  | 'queue'
  | 'r2'
  | 'route'
  | 'var'
  | 'vectorize'
  | 'unknown';

export type DatabaseLayerRuntimeBindingRef = {
  kind: DatabaseLayerRuntimeBindingKind;
  name: string;
  target?: string;
};

export type DatabaseLayerCloudflareRuntimeRecord = {
  recordId: string;
  atlasNodeId: string;
  configPath: string;
  packagePath: string;
  name?: string;
  main?: string;
  compatibilityDate?: string;
  pagesBuildOutputDir?: string;
  format: 'toml' | 'json' | 'jsonc';
  bindings: DatabaseLayerRuntimeBindingRef[];
  routes: string[];
  sourceRecord: DatabaseLayerSourceRecord;
  receipt: DatabaseLayerReceipt;
  reviewAction: DatabaseLayerWorkflowAction;
};

export type DatabaseLayerRuntimeBindingCoverage = {
  id: string;
  generatedAt: string;
  topologyId: string;
  atlasCanvasId: string;
  runtime: 'cloudflare';
  records: DatabaseLayerCloudflareRuntimeRecord[];
};

export type DatabaseLayerAgentConfigKind = 'dify_agent' | 'dify_mcp_intake';

export type DatabaseLayerAgentConfigServerRef = {
  serverId?: string;
  displayName?: string;
  transport?: string;
  url?: string;
  authType?: string;
};

export type DatabaseLayerAgentConfigRecord = {
  recordId: string;
  atlasNodeId: string;
  configPath: string;
  kind: DatabaseLayerAgentConfigKind;
  status?: string;
  owner?: string;
  title: string;
  mode?: string;
  model?: string;
  sourceDslPath?: string;
  serverRefs: DatabaseLayerAgentConfigServerRef[];
  toolCount: number;
  writeToolCount: number;
  secretRefCount: number;
  smokeStatus?: string;
  evalStatus?: string;
  sourceRecord: DatabaseLayerSourceRecord;
  receipt: DatabaseLayerReceipt;
  reviewAction: DatabaseLayerWorkflowAction;
};

export type DatabaseLayerAgentConfigCoverage = {
  id: string;
  generatedAt: string;
  topologyId: string;
  atlasCanvasId: string;
  records: DatabaseLayerAgentConfigRecord[];
};

export type DatabaseLayerAtlasCoverageGroupKind =
  | 'application_surface'
  | 'automation_surface'
  | 'database_surface'
  | 'judgment_surface'
  | 'knowledge_surface'
  | 'mcp_surface'
  | 'package_surface';

export type DatabaseLayerAtlasCoverageGroup = {
  id: string;
  kind: DatabaseLayerAtlasCoverageGroupKind;
  title: string;
  tier: DatabaseLayerTopologyTier;
  surface: DatabaseLayerTopologySurface;
  owner: string;
  nodeCount: number;
  summary: string;
};

export type DatabaseLayerAtlasCoverageRecord = {
  recordId: string;
  atlasNodeId: string;
  groupId: string;
  path: string;
  title: string;
  tier: DatabaseLayerTopologyTier;
  surface: DatabaseLayerTopologySurface;
  owner: string;
  relationCount: number;
  sourceRecord: DatabaseLayerSourceRecord;
  receipt: DatabaseLayerReceipt;
  reviewAction: DatabaseLayerWorkflowAction;
};

export type DatabaseLayerAtlasCoverage = {
  id: string;
  generatedAt: string;
  topologyId: string;
  atlasCanvasId: string;
  groups: DatabaseLayerAtlasCoverageGroup[];
  records: DatabaseLayerAtlasCoverageRecord[];
};

export type DatabaseLayerOperatingSliceStatus = 'review_ready' | 'needs_operator_review';

export type DatabaseLayerOperatingSlice = {
  id: string;
  title: string;
  status: DatabaseLayerOperatingSliceStatus;
  atlasCoverageGroupIds: string[];
  recordIds: string[];
  owner: string;
  tier: DatabaseLayerTopologyTier;
  surface: DatabaseLayerTopologySurface;
  nodeCount: number;
  evidence: string[];
  validationCommands: string[];
  promotionBoundary: string;
  rollbackNote: string;
  nextAction: string;
};

export type DatabaseLayerOperatingSliceReview = {
  id: string;
  generatedAt: string;
  topologyId: string;
  atlasCanvasId: string;
  sourceCoverageId: string;
  slices: DatabaseLayerOperatingSlice[];
};

export type DatabaseLayerReadinessGateStatus = 'pass' | 'review' | 'fail';

export type DatabaseLayerReadinessGate = {
  id: string;
  status: DatabaseLayerReadinessGateStatus;
  summary: string;
  evidence: string;
};

export type DatabaseLayerWorkerRuntimeReadiness = {
  runtime: 'cloudflare';
  runtimeConfigRecords: number;
  workerPackageRecords: number;
  bindingRefs: number;
  routeRefs: number;
  bindingKinds: Record<string, number>;
  workersWithD1: number;
  workersWithDurableObjects: number;
  workersWithQueues: number;
  workersWithR2: number;
  secretHandling: string;
};

export type DatabaseLayerOperatingSliceReadinessItem = {
  sliceId: string;
  title: string;
  status: DatabaseLayerOperatingSliceStatus;
  productionStatus: 'approval_required' | 'blocked';
  tier: DatabaseLayerTopologyTier;
  surface: DatabaseLayerTopologySurface;
  owner: string;
  recordCount: number;
  mappedRecordCount: number;
  missingRecordIds: string[];
  gates: DatabaseLayerReadinessGate[];
  validationCommands: string[];
  promotionBoundary: string;
  rollbackNote: string;
  nextAction: string;
  workerRuntime?: DatabaseLayerWorkerRuntimeReadiness;
};

export type DatabaseLayerOperatingSliceReadiness = {
  id: string;
  generatedAt: string;
  topologyId: string;
  atlasCanvasId: string;
  sourceReviewId: string;
  items: DatabaseLayerOperatingSliceReadinessItem[];
};

export type DatabaseLayerManagementSurfaceKind =
  | 'capabilities'
  | 'business_recommendations'
  | 'client_overlay'
  | 'contract_audit'
  | 'health'
  | 'openapi'
  | 'query'
  | 'receipts'
  | 'workbench'
  | 'workflow_queue'
  | 'topology'
  | 'topology_record'
  | 'diagnostics'
  | 'organization_review'
  | 'performance'
  | 'slice'
  | 'readiness'
  | 'coverage'
  | 'atlas_session'
  | 'canvas_state'
  | 'compute_snapshot'
  | 'atlas_viewport';

export type DatabaseLayerManagementAccessMode = 'read' | 'propose' | 'approve' | 'receipt';

export type DatabaseLayerManagementResource = {
  id: string;
  kind: DatabaseLayerManagementSurfaceKind;
  title: string;
  recordId?: string;
  sourcePath: string;
  apiPath: string;
  mcpUri: string;
  agentCommand: string;
  access: DatabaseLayerManagementAccessMode[];
  policy: string;
};

export type DatabaseLayerManagementOperation = {
  id: string;
  title: string;
  mode: DatabaseLayerManagementAccessMode;
  apiMethod: 'GET' | 'POST';
  apiPath: string;
  mcpTool: string;
  agentCommand: string;
  inputSchema: Record<string, string>;
  outputRef: string;
  requiresApproval: boolean;
  mutationBoundary: string;
};

export type DatabaseLayerManagementSurface = {
  id: string;
  generatedAt: string;
  topologyId: string;
  atlasCanvasId: string;
  sourceReadinessId: string;
  posture: 'api_first' | 'mcp_first' | 'agent_native';
  resources: DatabaseLayerManagementResource[];
  operations: DatabaseLayerManagementOperation[];
};

export type DatabaseLayerApiStatus = 200 | 204 | 400 | 403 | 404 | 405;

export type DatabaseLayerApiResponse<T = unknown> = {
  status: DatabaseLayerApiStatus;
  headers: Record<string, string>;
  body: T;
};

export type DatabaseLayerEdgeRequest = {
  method: string;
  url: string;
  bodyText?: string;
  headers?: Record<string, string | undefined>;
};

export type DatabaseLayerEdgeResponse = {
  status: DatabaseLayerApiStatus;
  headers: Record<string, string>;
  bodyText: string;
};

export type DatabaseLayerWorkerResponseInit = {
  status: DatabaseLayerApiStatus;
  headers: Record<string, string>;
};

export type DatabaseLayerWorkerResponseLike = {
  status: number;
  headers: Record<string, string>;
  bodyText: string;
};

export type DatabaseLayerWorkerResponseFactory<TResponse = DatabaseLayerWorkerResponseLike> = (
  bodyText: string,
  init: DatabaseLayerWorkerResponseInit
) => TResponse;

export type DatabaseLayerManagementApiState = {
  managementSurface: DatabaseLayerManagementSurface;
  operatingSliceReview: DatabaseLayerOperatingSliceReview;
  operatingSliceReadiness: DatabaseLayerOperatingSliceReadiness;
  topology: DatabaseLayerInternalTopology;
  atlasSession?: unknown;
  clientOverlayCoverage?: DatabaseLayerClientOverlayCoverage;
  agentConfigCoverage?: unknown;
  runtimeBindingCoverage?: unknown;
  topologyDiagnostics?: DatabaseLayerTopologyDiagnostics;
  performanceContract?: DatabaseLayerPerformanceContract;
  organizationReview?: DatabaseLayerOrganizationReview;
  businessRecommendations?: DatabaseLayerBusinessOperatingRecommendations;
};

export type DatabaseLayerDemoState = {
  runtime: DatabaseLayerRuntimeProfile;
  records: DatabaseLayerSourceRecord[];
  bindings: DatabaseLayerAtlasBinding[];
  actions: DatabaseLayerWorkflowAction[];
  receipts: DatabaseLayerReceipt[];
  capabilities: DatabaseLayerCapability[];
  performanceBudgets: DatabaseLayerPerformanceBudget[];
  systemDesignPrinciples: DatabaseLayerSystemDesignPrinciple[];
};
