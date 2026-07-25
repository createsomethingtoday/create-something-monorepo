import {
  CANVAS_KERNEL_RENDERER,
  SHARED_CANVAS_STATE_VERSION
} from '@create-something/canvas-kernel/shared-canvas-state';
import {
  SUBSTRATE_COMPUTE_SNAPSHOT_VERSION,
  type SubstrateComputeWeightKey
} from '@create-something/canvas-kernel/substrate-compute-snapshot';

import type {
  DatabaseLayerActionState,
  DatabaseLayerAtlasBinding,
  DatabaseLayerAtlasCanvas,
  DatabaseLayerAtlasNodeKind,
  DatabaseLayerAtlasNodeStatus,
  DatabaseLayerBindingHealth,
  DatabaseLayerTopologyCompletionLane,
  DatabaseLayerTopologyCompletionReport,
  DatabaseLayerTopologyGapKind,
  DatabaseLayerInternalTopology,
  DatabaseLayerReceipt,
  DatabaseLayerRecordStatus,
  DatabaseLayerSharedCanvasState,
  DatabaseLayerSharedCanvasStateOptions,
  DatabaseLayerSourceRecord,
  DatabaseLayerSubstrateComputeAgentWorkItem,
  DatabaseLayerSubstrateComputeAttentionRank,
  DatabaseLayerSubstrateComputeBottleneckCandidate,
  DatabaseLayerSubstrateComputeImpactScore,
  DatabaseLayerSubstrateComputeNode,
  DatabaseLayerSubstrateComputeSnapshot,
  DatabaseLayerSubstrateComputeSnapshotOptions,
  DatabaseLayerTopologyNode,
  DatabaseLayerTopologyProjection,
  DatabaseLayerTopologySemantics,
  DatabaseLayerTopologySemanticsOptions,
  DatabaseLayerWorkflowAction
} from './types.js';

type TopologyBoardSectionKey = 'core' | 'runtime' | 'agent_plane' | 'judgment';

type TopologyBoardSection = {
  columns: number;
  key: TopologyBoardSectionKey;
  rank: number;
  x: number;
  y: number;
};

const BOARD_CARD_WIDTH = 232;
const BOARD_CARD_HEIGHT = 124;
const BOARD_CARD_GAP_X = 26;
const BOARD_CARD_GAP_Y = 24;
const COMPUTE_WEIGHT_KEYS: SubstrateComputeWeightKey[] = [
  'latency',
  'cost',
  'trust',
  'confidence',
  'reliability',
  'impact'
];

const BOARD_SECTIONS: Record<TopologyBoardSectionKey, TopologyBoardSection> = {
  core: { columns: 3, key: 'core', rank: 0, x: 84, y: 168 },
  runtime: { columns: 5, key: 'runtime', rank: 1, x: 940, y: 168 },
  agent_plane: { columns: 4, key: 'agent_plane', rank: 2, x: 2308, y: 168 },
  judgment: { columns: 4, key: 'judgment', rank: 3, x: 3402, y: 168 }
};

const SURFACE_RANK: Record<DatabaseLayerTopologyNode['surface'], number> = {
  repo: 0,
  client: 1,
  app: 2,
  package: 3,
  worker: 4,
  mcp: 5,
  agent: 6,
  config: 7,
  policy: 8,
  guide: 9,
  doc: 10
};

function recordStatus(status: DatabaseLayerTopologyNode['status']): DatabaseLayerRecordStatus {
  if (status === 'mapped') return 'ready';
  return 'review';
}

function bindingHealth(status: DatabaseLayerTopologyNode['status']): DatabaseLayerBindingHealth {
  if (status === 'mapped') return 'bound';
  return 'gap';
}

function actionState(status: DatabaseLayerTopologyNode['status']): DatabaseLayerActionState {
  return status === 'mapped' ? 'complete' : 'wait';
}

function atlasStatus(status: DatabaseLayerTopologyNode['status']): DatabaseLayerAtlasNodeStatus {
  if (status === 'mapped') return 'unknown';
  if (status === 'needs_substrate') return 'stop';
  return 'wait';
}

function freshnessState(options: DatabaseLayerTopologySemanticsOptions): DatabaseLayerTopologySemantics['freshness'] {
  const checkedAt = options.checkedAt;
  const reviewBy = options.reviewBy;
  if (!checkedAt || !reviewBy) return { state: 'unknown', checkedAt, reviewBy };
  const now = Date.parse(options.now ?? new Date().toISOString());
  const review = Date.parse(reviewBy);
  if (!Number.isFinite(now) || !Number.isFinite(review)) {
    return { state: 'unknown', checkedAt, reviewBy };
  }
  return { state: now > review ? 'stale' : 'current', checkedAt, reviewBy };
}

export function projectTopologyNodeSemantics(
  node: DatabaseLayerTopologyNode,
  options: DatabaseLayerTopologySemanticsOptions = {}
): DatabaseLayerTopologySemantics {
  const coverage =
    node.status === 'mapped' ? 'mapped' : node.status === 'needs_atlas' ? 'partial' : 'missing';
  return {
    coverage,
    verification: options.verification ?? 'unverified',
    health: options.health ?? 'unknown',
    authority: options.authority ?? 'unknown',
    proof: options.proof ?? 'unknown',
    provenance:
      options.provenance ?? {
        kind: 'derived',
        sourceLabel: 'Repo topology coverage',
        explanation: 'Coverage is derived from discovered repo structure and does not prove runtime state.'
      },
    freshness: freshnessState(options),
    change: options.change ?? 'unknown'
  };
}

function atlasKind(node: DatabaseLayerTopologyNode): DatabaseLayerAtlasNodeKind {
  if (node.surface === 'repo') return 'actor';
  if (node.surface === 'client') return 'actor';
  if (node.surface === 'policy') return 'constraint';
  if (node.surface === 'guide' || node.surface === 'doc') return 'human';
  if (node.surface === 'agent') return 'ai';
  if (node.surface === 'config') return 'data';
  if (node.tier === 'Database') return 'data';
  if (node.tier === 'Automation') return 'system';
  if (node.tier === 'Judgment') return 'constraint';
  return node.surface === 'app' ? 'touchpoint' : 'system';
}

function boardSectionKey(node: DatabaseLayerTopologyNode): TopologyBoardSectionKey {
  if (node.surface === 'worker') return 'runtime';
  if (node.surface === 'mcp' || node.surface === 'agent' || node.surface === 'config') {
    return 'agent_plane';
  }
  if (node.surface === 'policy' || node.surface === 'guide' || node.surface === 'doc') {
    return 'judgment';
  }
  return 'core';
}

function topologyBoardPositions(
  nodes: DatabaseLayerTopologyNode[]
): Map<string, { x: number; y: number }> {
  const sectionIndexes = new Map<TopologyBoardSectionKey, number>();
  const positions = new Map<string, { x: number; y: number }>();
  const ordered = [...nodes].sort((a, b) => {
    const aSection = BOARD_SECTIONS[boardSectionKey(a)];
    const bSection = BOARD_SECTIONS[boardSectionKey(b)];
    const sectionDelta = aSection.rank - bSection.rank;
    if (sectionDelta !== 0) return sectionDelta;

    const surfaceDelta = SURFACE_RANK[a.surface] - SURFACE_RANK[b.surface];
    if (surfaceDelta !== 0) return surfaceDelta;
    return a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
  });

  for (const node of ordered) {
    const section = BOARD_SECTIONS[boardSectionKey(node)];
    const index = sectionIndexes.get(section.key) ?? 0;
    sectionIndexes.set(section.key, index + 1);
    const column = index % section.columns;
    const row = Math.floor(index / section.columns);
    positions.set(node.id, {
      x: section.x + column * (BOARD_CARD_WIDTH + BOARD_CARD_GAP_X),
      y: section.y + row * (BOARD_CARD_HEIGHT + BOARD_CARD_GAP_Y)
    });
  }

  return positions;
}

function relationCount(topology: DatabaseLayerInternalTopology, nodeId: string): number {
  return topology.edges.filter((edge) => edge.source === nodeId || edge.target === nodeId).length;
}

function boundedInteger(value: number | undefined, fallback: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(Math.round(value as number), max));
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(1, Number(value.toFixed(4))));
}

function nodeComputeWeights(node: DatabaseLayerTopologyNode, relationTotal: number): Record<SubstrateComputeWeightKey, number> {
  const relationWeight = Math.min(1, relationTotal / 16);
  const statusRisk =
    node.status === 'needs_substrate' ? 1 : node.status === 'needs_atlas' ? 0.72 : 0.18;
  const surfaceCost: Partial<Record<DatabaseLayerTopologyNode['surface'], number>> = {
    worker: 0.82,
    mcp: 0.74,
    agent: 0.72,
    config: 0.68,
    app: 0.56,
    package: 0.48,
    client: 0.64,
    policy: 0.42,
    guide: 0.3,
    doc: 0.24,
    repo: 0.36
  };
  const automationWeight = node.tier === 'Automation' ? 0.25 : 0;
  const judgmentWeight = node.tier === 'Judgment' ? 0.18 : 0;

  return {
    latency: clampScore((surfaceCost[node.surface] ?? 0.4) + relationWeight * 0.22),
    cost: clampScore((surfaceCost[node.surface] ?? 0.4) + automationWeight),
    trust: clampScore(1 - statusRisk * 0.58),
    confidence: clampScore(node.status === 'mapped' ? 0.92 : node.status === 'needs_atlas' ? 0.55 : 0.38),
    reliability: clampScore(1 - statusRisk * 0.5),
    impact: clampScore(0.25 + relationWeight * 0.65 + automationWeight + judgmentWeight)
  };
}

function edgeComputeWeights(edge: DatabaseLayerInternalTopology['edges'][number]): Record<SubstrateComputeWeightKey, number> {
  const relationImpact: Record<DatabaseLayerInternalTopology['edges'][number]['relation'], number> = {
    client_overlay: 0.78,
    configures: 0.74,
    contains: 0.46,
    depends_on: 0.9,
    documents: 0.34,
    governs: 0.82,
    renders: 0.58,
    runs: 0.86
  };
  const impact = relationImpact[edge.relation] ?? 0.5;
  return {
    latency: clampScore(impact * 0.72),
    cost: clampScore(impact * 0.62),
    trust: clampScore(edge.relation === 'governs' || edge.relation === 'documents' ? 0.86 : 0.7),
    confidence: clampScore(edge.evidence ? 0.82 : 0.45),
    reliability: clampScore(edge.relation === 'depends_on' || edge.relation === 'runs' ? 0.64 : 0.78),
    impact
  };
}

function arrayWeights(weights: Record<SubstrateComputeWeightKey, number>): number[] {
  return COMPUTE_WEIGHT_KEYS.map((key) => weights[key]);
}

function receiptType(node: DatabaseLayerTopologyNode): DatabaseLayerReceipt['type'] {
  if (node.status === 'mapped') return 'proof';
  if (node.status === 'needs_substrate') return 'decision';
  return 'handoff';
}

function gapTitle(node: DatabaseLayerTopologyNode): string {
  if (node.status === 'needs_substrate') return `Bind Substrate record for ${node.title}`;
  return `Attach Atlas coverage for ${node.title}`;
}

function gapDetail(node: DatabaseLayerTopologyNode): string {
  if (node.status === 'needs_substrate') {
    return `${node.path} is visible in the topology but still needs a canonical Substrate binding before it can be operated through API/MCP.`;
  }

  return `${node.path} is visible in the topology but still needs Atlas coverage before it is considered part of the mapped operating system.`;
}

function gapKindForNode(node: DatabaseLayerTopologyNode): DatabaseLayerTopologyGapKind | undefined {
  if (node.status === 'needs_atlas') return 'needs_atlas';
  if (node.status === 'needs_substrate') return 'needs_substrate';
  return undefined;
}

function priorityScore(node: DatabaseLayerTopologyNode, topology: DatabaseLayerInternalTopology): number {
  const relationWeight = Math.min(relationCount(topology, node.id), 12);
  const statusWeight = node.status === 'needs_substrate' ? 20 : 0;
  const surfaceWeight: Partial<Record<DatabaseLayerTopologyNode['surface'], number>> = {
    client: 220,
    worker: 100,
    agent: 90,
    config: 80,
    mcp: 70,
    app: 60,
    policy: 50,
    guide: 40,
    package: 30,
    doc: 20
  };

  return (surfaceWeight[node.surface] ?? 10) + statusWeight + relationWeight;
}

function priorityRationale(node: DatabaseLayerTopologyNode): string {
  if (node.surface === 'client') {
    return 'Client overlay coverage comes first so managed work can inherit the same Atlas/Substrate operating model as CREATE SOMETHING.';
  }

  if (node.status === 'needs_substrate' && node.surface === 'worker') {
    return 'Cloudflare runtime config should be bound into Substrate before agents depend on it for execution evidence.';
  }

  if (node.status === 'needs_substrate') {
    return 'Automation/config state needs a canonical Substrate record before it can be managed through API, MCP, or agent workflows.';
  }

  if (node.surface === 'policy') {
    return 'Policy artifacts need Atlas coverage so judgment stays visible beside execution and database state.';
  }

  return 'Visible repo topology gap needs Atlas coverage before it is considered part of the complete operating map.';
}

function countByStatusAndSurface(
  topology: DatabaseLayerInternalTopology
): DatabaseLayerTopologyCompletionReport['statusBySurface'] {
  const counts = new Map<string, DatabaseLayerTopologyCompletionReport['statusBySurface'][number]>();
  for (const node of topology.nodes) {
    const key = `${node.status}:${node.surface}`;
    const current =
      counts.get(key) ??
      ({
        status: node.status,
        surface: node.surface,
        count: 0
      } satisfies DatabaseLayerTopologyCompletionReport['statusBySurface'][number]);
    current.count += 1;
    counts.set(key, current);
  }

  return [...counts.values()].sort(
    (a, b) => a.status.localeCompare(b.status) || a.surface.localeCompare(b.surface)
  );
}

function countByTierAndStatus(
  topology: DatabaseLayerInternalTopology
): DatabaseLayerTopologyCompletionReport['statusByTier'] {
  const counts = new Map<string, DatabaseLayerTopologyCompletionReport['statusByTier'][number]>();
  for (const node of topology.nodes) {
    const key = `${node.tier}:${node.status}`;
    const current =
      counts.get(key) ??
      ({
        tier: node.tier,
        status: node.status,
        count: 0
      } satisfies DatabaseLayerTopologyCompletionReport['statusByTier'][number]);
    current.count += 1;
    counts.set(key, current);
  }

  return [...counts.values()].sort(
    (a, b) => a.tier.localeCompare(b.tier) || a.status.localeCompare(b.status)
  );
}

function boundedNumber(value: number | undefined, fallback: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(value as number, min), max);
}

function canvasLevelOfDetail(zoom: number) {
  return zoom >= 0.85 ? 'detail' : zoom >= 0.35 ? 'compact' : 'skeleton';
}

function completionLanes(
  topology: DatabaseLayerInternalTopology
): DatabaseLayerTopologyCompletionLane[] {
  const nodes = topology.nodes.filter((node) => node.status !== 'mapped');
  const count = (predicate: (node: DatabaseLayerTopologyNode) => boolean) =>
    nodes.filter(predicate).length;

  return [
    {
      id: 'client_atlas',
      title: 'Client Atlas coverage',
      gapKind: 'needs_atlas',
      count: count((node) => node.surface === 'client'),
      summary: 'Managed client overlays become first-class Atlas maps connected to the CREATE SOMETHING root topology.',
      nextAction: 'Review each client overlay and attach workflow, agent, MCP, database, and proof nodes.'
    },
    {
      id: 'substrate_runtime',
      title: 'Substrate runtime bindings',
      gapKind: 'needs_substrate',
      count: count((node) => node.status === 'needs_substrate' && node.surface === 'worker'),
      summary: 'Cloudflare runtime configs become canonical Substrate records before automation depends on them.',
      nextAction: 'Bind worker configs to API/MCP-addressable records with receipt-backed sync checks.'
    },
    {
      id: 'mcp_agent',
      title: 'MCP and agent operating graph',
      gapKind: 'needs_substrate',
      count: count(
        (node) =>
          (node.status === 'needs_substrate' || node.status === 'needs_atlas') &&
          (node.surface === 'mcp' || node.surface === 'agent' || node.surface === 'config')
      ),
      summary: 'MCP, Dify, and agent surfaces are made legible as database-backed automation lanes.',
      nextAction: 'Connect MCP/agent records to owners, policies, and runtime evidence.'
    },
    {
      id: 'policy_judgment',
      title: 'Policy and judgment map',
      gapKind: 'needs_atlas',
      count: count((node) => node.surface === 'policy' || node.surface === 'guide' || node.surface === 'doc'),
      summary: 'Policy artifacts and operating guides remain visible beside execution rather than living as detached docs.',
      nextAction: 'Attach policy and guide nodes to the workflows they govern.'
    },
    {
      id: 'package_atlas',
      title: 'Package and app Atlas coverage',
      gapKind: 'needs_atlas',
      count: count((node) => node.surface === 'package' || node.surface === 'app'),
      summary: 'Remaining packages and apps are grouped into the root topology for complete codebase legibility.',
      nextAction: 'Cluster packages/apps by product lane and bind cross-package dependencies.'
    }
  ];
}

export function projectTopologyToSourceRecords(
  topology: DatabaseLayerInternalTopology
): DatabaseLayerSourceRecord[] {
  return topology.nodes.map((node) => ({
    id: node.id,
    source: 'CREATE SOMETHING monorepo',
    sourceType: node.surface,
    title: node.title,
    owner: node.owner,
    status: recordStatus(node.status),
    bindingHealth: bindingHealth(node.status),
    atlasCanvasId: topology.atlasCanvasId,
    atlasNodeId: node.atlasNodeId,
    relationCount: relationCount(topology, node.id),
    receiptId: `receipt:${node.id}`,
    updatedAt: topology.coverage.generatedAt,
    summary: node.summary,
    semantics: projectTopologyNodeSemantics(node, { checkedAt: topology.coverage.generatedAt })
  }));
}

export function projectTopologyToAtlasBindings(
  topology: DatabaseLayerInternalTopology
): DatabaseLayerAtlasBinding[] {
  return topology.nodes.map((node) => ({
    recordId: node.id,
    canvasId: topology.atlasCanvasId,
    nodeId: node.atlasNodeId,
    canvasTitle: topology.title,
    nodeLabel: node.title,
    relationEvidence: `${node.path} mapped from repo topology as ${node.surface}/${node.tier}.`
  }));
}

export function projectTopologyToReceipts(topology: DatabaseLayerInternalTopology): DatabaseLayerReceipt[] {
  return topology.nodes.map((node) => ({
    id: `receipt:${node.id}`,
    recordId: node.id,
    type: receiptType(node),
    summary:
      node.status === 'mapped'
        ? `${node.title} is part of the mapped root topology.`
        : `${node.title} is visible but still has a topology completion gap.`,
    evidence: `${node.path} was discovered during topology generation at ${topology.coverage.generatedAt}.`,
    createdAt: topology.coverage.generatedAt
  }));
}

export function projectTopologyToGapActions(
  topology: DatabaseLayerInternalTopology
): DatabaseLayerWorkflowAction[] {
  return topology.nodes
    .filter((node) => node.status !== 'mapped')
    .map((node) => ({
      id: `action:${node.status}:${node.id}`,
      recordId: node.id,
      state: actionState(node.status),
      title: gapTitle(node),
      owner: node.owner,
      policy: 'Root topology review before external writes',
      detail: gapDetail(node)
    }));
}

export function projectTopologyToAtlasCanvas(topology: DatabaseLayerInternalTopology): DatabaseLayerAtlasCanvas {
  const positions = topologyBoardPositions(topology.nodes);
  return {
    version: 1,
    id: topology.atlasCanvasId,
    title: topology.title,
    createdAt: topology.coverage.generatedAt,
    updatedAt: topology.coverage.generatedAt,
    nodes: topology.nodes.map((node) => {
      const position = positions.get(node.id) ?? { x: 84, y: 168 };
      return {
        id: node.atlasNodeId,
        kind: atlasKind(node),
        label: node.title,
        owner: node.owner,
        status: atlasStatus(node.status),
        notes: `${node.path} | ${node.surface} | ${node.tier}`,
        x: position.x,
        y: position.y,
        width: BOARD_CARD_WIDTH,
        height: 142,
        sourceRecordId: node.id,
        createdBy: 'system',
        updatedAt: topology.coverage.generatedAt
      };
    }),
    edges: topology.edges.map((edge) => ({
      id: edge.id.replace(/^substrate:/, 'atlas:').replace(/:/g, '_'),
      source: topology.nodes.find((node) => node.id === edge.source)?.atlasNodeId ?? edge.source,
      target: topology.nodes.find((node) => node.id === edge.target)?.atlasNodeId ?? edge.target,
      label: edge.relation,
      evidence: edge.evidence,
      createdBy: 'system',
      updatedAt: topology.coverage.generatedAt
    }))
  };
}

export function projectTopologyToSharedCanvasState(
  topology: DatabaseLayerInternalTopology,
  options: DatabaseLayerSharedCanvasStateOptions = {}
): DatabaseLayerSharedCanvasState {
  const canvas = projectTopologyToAtlasCanvas(topology);
  const nodeByRecordId = new Map(topology.nodes.map((node) => [node.id, node]));
  const minX = Math.min(...canvas.nodes.map((node) => node.x));
  const minY = Math.min(...canvas.nodes.map((node) => node.y));
  const x = boundedNumber(options.viewport?.x, Number.isFinite(minX) ? minX : 0, -1_000_000, 1_000_000);
  const y = boundedNumber(options.viewport?.y, Number.isFinite(minY) ? minY : 0, -1_000_000, 1_000_000);
  const width = boundedNumber(options.viewport?.width, 4800, 1, 100_000);
  const height = boundedNumber(options.viewport?.height, 3600, 1, 100_000);
  const zoom = boundedNumber(options.viewport?.zoom, 1, 0.05, 8);
  const limit = Math.round(boundedNumber(options.viewport?.limit, 250, 1, 500));
  const right = x + width;
  const bottom = y + height;
  const candidateNodes = canvas.nodes.filter((node) => {
    return node.x + node.width >= x && node.x <= right && node.y + node.height >= y && node.y <= bottom;
  });
  const visibleNodes = candidateNodes.slice(0, limit);
  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
  const visibleEdges = canvas.edges.filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target));
  const sessionId = options.sessionId ?? topology.atlasCanvasId;

  return {
    version: SHARED_CANVAS_STATE_VERSION,
    id: `${topology.id}:canvas-state:${sessionId}`,
    topologyId: topology.id,
    atlasCanvasId: topology.atlasCanvasId,
    sessionId,
    renderer: options.renderer ?? CANVAS_KERNEL_RENDERER,
    source: options.source ?? 'substrate',
    generatedAt: options.generatedAt ?? topology.coverage.generatedAt,
    lens: options.lens ?? 'all',
    query: options.query ?? '',
    storyStepId: options.storyStepId ?? null,
    selectedNodeId: options.selectedNodeId ?? null,
    focusedNodeIds: options.focusedNodeIds ?? [],
    viewport: { x, y, width, height, zoom, limit, lod: canvasLevelOfDetail(zoom) },
    counts: {
      totalNodes: canvas.nodes.length,
      totalEdges: canvas.edges.length,
      candidateNodes: candidateNodes.length,
      visibleNodes: visibleNodes.length,
      visibleEdges: visibleEdges.length,
      omittedNodes: Math.max(0, candidateNodes.length - visibleNodes.length),
      omittedEdges: Math.max(0, canvas.edges.length - visibleEdges.length)
    },
    visibleNodeIds: visibleNodes.map((node) => node.id),
    visibleEdgeIds: visibleEdges.map((edge) => edge.id),
    nodes: visibleNodes.map((node) => {
      const record = nodeByRecordId.get(node.sourceRecordId);
      return {
        id: node.id,
        atlasId: node.sourceRecordId,
        sourceRecordId: node.sourceRecordId,
        label: node.label,
        kind: node.kind,
        status: node.status,
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
        owner: node.owner,
        tier: record?.tier,
        surface: record?.surface,
        path: record?.path
      };
    }),
    edges: visibleEdges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      evidence: edge.evidence
    })),
    joins: visibleNodes.map((node) => ({
      substrateRecordId: node.sourceRecordId,
      topologyNodeId: node.sourceRecordId,
      atlasCanvasId: topology.atlasCanvasId,
      atlasNodeId: node.id
    })),
    endpoints: {
      canvasState: `/api/substrate/atlas-sessions/${encodeURIComponent(sessionId)}/canvas-state`,
      atlasSession: `/api/substrate/atlas-sessions/${encodeURIComponent(sessionId)}`,
      atlasViewport: `/api/substrate/atlas-sessions/${encodeURIComponent(sessionId)}/viewport`,
      topology: '/api/substrate/topology/internal',
      records: '/api/substrate/topology/internal/records'
    }
  };
}

export function projectTopologyToSubstrateComputeSnapshot(
  topology: DatabaseLayerInternalTopology,
  options: DatabaseLayerSubstrateComputeSnapshotOptions = {}
): DatabaseLayerSubstrateComputeSnapshot {
  const sessionId = options.sessionId ?? topology.atlasCanvasId;
  const maxDepth = boundedInteger(options.scenario?.maxDepth, 3, 1, 8);
  const limit = boundedInteger(options.limit, 24, 1, 100);
  const sourceNodeId = options.scenario?.sourceNodeId ?? topology.rootNodeId;
  const scenario = {
    id: options.scenario?.id ?? `${topology.id}:scenario:impact:${sourceNodeId}`,
    kind: options.scenario?.kind ?? 'impact',
    sourceNodeId,
    description:
      options.scenario?.description ??
      `CPU impact preview from ${sourceNodeId}. This is a read-only projection; it does not mutate Substrate truth.`,
    maxDepth
  } satisfies DatabaseLayerSubstrateComputeSnapshot['scenario'];

  const relationTotals = new Map<string, number>();
  for (const edge of topology.edges) {
    relationTotals.set(edge.source, (relationTotals.get(edge.source) ?? 0) + 1);
    relationTotals.set(edge.target, (relationTotals.get(edge.target) ?? 0) + 1);
  }

  const nodeIndexById = new Map(topology.nodes.map((node, index) => [node.id, index]));
  const nodes: DatabaseLayerSubstrateComputeNode[] = topology.nodes.map((node, index) => ({
    id: node.id,
    index,
    atlasNodeId: node.atlasNodeId,
    label: node.title,
    tier: node.tier,
    surface: node.surface,
    status: node.status,
    owner: node.owner,
    path: node.path,
    weights: nodeComputeWeights(node, relationTotals.get(node.id) ?? 0)
  }));

  const edges: DatabaseLayerSubstrateComputeSnapshot['edges'] = [];
  for (const [index, edge] of topology.edges.entries()) {
    const source = nodeIndexById.get(edge.source);
    const target = nodeIndexById.get(edge.target);
    if (source === undefined || target === undefined) continue;
    edges.push({
      id: edge.id,
      index,
      source,
      sourceId: edge.source,
      target,
      targetId: edge.target,
      relation: edge.relation,
      evidence: edge.evidence,
      weights: edgeComputeWeights(edge)
    });
  }

  const adjacency = new Map<string, Array<{ edge: DatabaseLayerSubstrateComputeSnapshot['edges'][number]; nodeId: string }>>();
  for (const edge of edges) {
    const outgoing = adjacency.get(edge.sourceId) ?? [];
    outgoing.push({ edge, nodeId: edge.targetId });
    adjacency.set(edge.sourceId, outgoing);
  }

  const impactScores = new Map<string, { depth: number; score: number }>();
  const queue: Array<{ depth: number; nodeId: string; score: number }> = scenario.sourceNodeId
    ? [{ depth: 0, nodeId: scenario.sourceNodeId, score: 1 }]
    : [];
  while (queue.length) {
    const current = queue.shift();
    if (!current || current.depth > maxDepth) continue;
    const previous = impactScores.get(current.nodeId);
    if (previous && previous.score >= current.score) continue;
    impactScores.set(current.nodeId, { depth: current.depth, score: clampScore(current.score) });
    if (current.depth === maxDepth) continue;
    for (const next of adjacency.get(current.nodeId) ?? []) {
      const relationDecay = 0.42 + next.edge.weights.impact * 0.48;
      queue.push({
        depth: current.depth + 1,
        nodeId: next.nodeId,
        score: current.score * relationDecay
      });
    }
  }

  const impact: DatabaseLayerSubstrateComputeImpactScore[] = Array.from(impactScores.entries())
    .map(([nodeId, value]) => ({ nodeId, depth: value.depth, score: value.score }))
    .sort((a, b) => b.score - a.score || a.depth - b.depth || a.nodeId.localeCompare(b.nodeId))
    .slice(0, limit);

  const incomingCounts = new Map<string, number>();
  const outgoingCounts = new Map<string, number>();
  for (const edge of edges) {
    outgoingCounts.set(edge.sourceId, (outgoingCounts.get(edge.sourceId) ?? 0) + 1);
    incomingCounts.set(edge.targetId, (incomingCounts.get(edge.targetId) ?? 0) + 1);
  }

  const attention: DatabaseLayerSubstrateComputeAttentionRank[] = nodes
    .map((node) => {
      const reasons: string[] = [];
      const statusBoost = node.status === 'needs_substrate' ? 0.48 : node.status === 'needs_atlas' ? 0.34 : 0;
      if (node.status !== 'mapped') reasons.push(node.status);
      const connectivity = Math.min(1, ((incomingCounts.get(node.id) ?? 0) + (outgoingCounts.get(node.id) ?? 0)) / 18);
      if (connectivity > 0.5) reasons.push('high_relation_count');
      if (node.surface === 'worker' || node.surface === 'mcp' || node.surface === 'agent') reasons.push('automation_surface');
      const impactScore = impactScores.get(node.id)?.score ?? 0;
      if (impactScore > 0.25) reasons.push('scenario_impacted');
      return {
        nodeId: node.id,
        rank: 0,
        score: clampScore(statusBoost + connectivity * 0.3 + node.weights.impact * 0.22 + impactScore * 0.28),
        reasons: reasons.length ? reasons : ['mapped_baseline']
      };
    })
    .sort((a, b) => b.score - a.score || a.nodeId.localeCompare(b.nodeId))
    .slice(0, limit)
    .map((item, index) => ({ ...item, rank: index + 1 }));

  const bottlenecks: DatabaseLayerSubstrateComputeBottleneckCandidate[] = nodes
    .map((node) => {
      const inbound = incomingCounts.get(node.id) ?? 0;
      const outbound = outgoingCounts.get(node.id) ?? 0;
      const reasons: string[] = [];
      if (inbound >= 4) reasons.push('high_inbound');
      if (outbound >= 4) reasons.push('high_outbound');
      if (node.surface === 'worker' || node.surface === 'mcp') reasons.push('runtime_or_mcp_chokepoint');
      if (node.status !== 'mapped') reasons.push('unresolved_binding');
      return {
        nodeId: node.id,
        score: clampScore(Math.min(1, (inbound + outbound) / 22) + node.weights.latency * 0.24 + node.weights.cost * 0.16),
        inbound,
        outbound,
        reasons: reasons.length ? reasons : ['low_bottleneck_signal']
      };
    })
    .filter((candidate) => candidate.score > 0.2)
    .sort((a, b) => b.score - a.score || b.outbound - a.outbound || a.nodeId.localeCompare(b.nodeId))
    .slice(0, limit);

  const agentWorkQueue: DatabaseLayerSubstrateComputeAgentWorkItem[] = attention.slice(0, limit).map((item, index) => {
    const node = nodes[nodeIndexById.get(item.nodeId) ?? -1];
    const action: DatabaseLayerSubstrateComputeAgentWorkItem['action'] =
      node?.status === 'needs_substrate'
        ? 'execute'
        : node?.status === 'needs_atlas'
          ? 'simulate'
          : item.reasons.includes('scenario_impacted')
            ? 'inspect'
            : 'receipt';
    return {
      nodeId: item.nodeId,
      rank: index + 1,
      action,
      reason: `${item.reasons.join(', ')}; score=${item.score.toFixed(4)}`
    };
  });

  return {
    version: SUBSTRATE_COMPUTE_SNAPSHOT_VERSION,
    id: `${topology.id}:compute-snapshot:${sessionId}:${scenario.kind}`,
    topologyId: topology.id,
    atlasCanvasId: topology.atlasCanvasId,
    sessionId,
    generatedAt: options.generatedAt ?? topology.coverage.generatedAt,
    engine: 'cpu',
    source: options.source ?? 'substrate',
    weightModel: {
      kind: 'derived',
      source: 'static_topology_heuristic',
      observedTelemetry: false,
      description:
        'Weights are deterministic estimates derived from topology surface, status, and relationship structure. They are not observed runtime telemetry.'
    },
    scenario,
    counts: {
      nodes: nodes.length,
      edges: edges.length,
      impactNodes: impact.length,
      attentionNodes: attention.length,
      bottleneckNodes: bottlenecks.length,
      workItems: agentWorkQueue.length
    },
    buffers: {
      nodeIds: nodes.map((node) => node.id),
      edgeIds: edges.map((edge) => edge.id),
      edgeSources: edges.map((edge) => edge.source),
      edgeTargets: edges.map((edge) => edge.target),
      weightKeys: COMPUTE_WEIGHT_KEYS,
      edgeWeights: edges.map((edge) => arrayWeights(edge.weights)),
      nodeWeights: nodes.map((node) => arrayWeights(node.weights))
    },
    nodes,
    edges,
    outputs: {
      impact,
      attention,
      bottlenecks,
      agentWorkQueue
    },
    endpoints: {
      computeSnapshot: `/api/substrate/atlas-sessions/${encodeURIComponent(sessionId)}/compute-snapshot`,
      canvasState: `/api/substrate/atlas-sessions/${encodeURIComponent(sessionId)}/canvas-state`,
      topology: '/api/substrate/topology/internal',
      records: '/api/substrate/topology/internal/records'
    }
  };
}

export function projectInternalTopology(
  topology: DatabaseLayerInternalTopology
): DatabaseLayerTopologyProjection {
  return {
    topologyId: topology.id,
    atlasCanvas: projectTopologyToAtlasCanvas(topology),
    sharedCanvasState: projectTopologyToSharedCanvasState(topology),
    computeSnapshot: projectTopologyToSubstrateComputeSnapshot(topology),
    sourceRecords: projectTopologyToSourceRecords(topology),
    atlasBindings: projectTopologyToAtlasBindings(topology),
    gapActions: projectTopologyToGapActions(topology),
    receipts: projectTopologyToReceipts(topology)
  };
}

export function buildTopologyCompletionReport(
  topology: DatabaseLayerInternalTopology
): DatabaseLayerTopologyCompletionReport {
  const projection = projectInternalTopology(topology);
  const nodesById = new Map(topology.nodes.map((node) => [node.id, node]));
  const actionsByRecordId = new Map(projection.gapActions.map((action) => [action.recordId, action]));
  const gapCounts = topology.nodes.reduce(
    (counts, node) => {
      if (node.status === 'needs_atlas') counts.needs_atlas += 1;
      if (node.status === 'needs_substrate') counts.needs_substrate += 1;
      return counts;
    },
    { needs_atlas: 0, needs_substrate: 0 }
  );
  const mapped = topology.nodes.filter((node) => node.status === 'mapped').length;
  const clientOverlays = topology.nodes
    .filter((node) => node.surface === 'client')
    .map((node) => ({
      clientSlug: node.clientSlug ?? node.path.split('/').at(-1) ?? 'unknown',
      path: node.path,
      title: node.title,
      status: node.status,
      tier: node.tier,
      runtime: node.runtime,
      relationCount: relationCount(topology, node.id),
      actionId: actionsByRecordId.get(node.id)?.id
    }))
    .sort((a, b) => a.clientSlug.localeCompare(b.clientSlug) || a.path.localeCompare(b.path));
  const firstCompletionWave = projection.gapActions
    .map((action) => {
      const node = nodesById.get(action.recordId);
      if (!node) return undefined;
      const gapKind = gapKindForNode(node);
      if (!gapKind) return undefined;
      return {
        action,
        node,
        score: priorityScore(node, topology)
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => b.score - a.score || a.node.path.localeCompare(b.node.path))
    .slice(0, 24)
    .map((item, index) => ({
      rank: index + 1,
      actionId: item.action.id,
      recordId: item.action.recordId,
      title: item.action.title,
      owner: item.action.owner,
      gapKind: gapKindForNode(item.node) ?? 'needs_atlas',
      surface: item.node.surface,
      tier: item.node.tier,
      path: item.node.path,
      clientSlug: item.node.clientSlug,
      relationCount: relationCount(topology, item.node.id),
      rationale: priorityRationale(item.node)
    }));

  return {
    id: 'substrate:create-something:topology:completion-report:internal',
    topologyId: topology.id,
    atlasCanvasId: topology.atlasCanvasId,
    generatedAt: topology.coverage.generatedAt,
    totals: {
      nodes: topology.nodes.length,
      edges: topology.edges.length,
      mapped,
      gaps: topology.nodes.length - mapped,
      gapCounts
    },
    statusBySurface: countByStatusAndSurface(topology),
    statusByTier: countByTierAndStatus(topology),
    clientOverlays,
    completionLanes: completionLanes(topology),
    firstCompletionWave
  };
}
