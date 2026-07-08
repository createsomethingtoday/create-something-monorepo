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
  DatabaseLayerSourceRecord,
  DatabaseLayerTopologyNode,
  DatabaseLayerTopologyProjection,
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
  if (status === 'mapped') return 'run';
  if (status === 'needs_substrate') return 'stop';
  return 'wait';
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
    summary: node.summary
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

export function projectInternalTopology(
  topology: DatabaseLayerInternalTopology
): DatabaseLayerTopologyProjection {
  return {
    topologyId: topology.id,
    atlasCanvas: projectTopologyToAtlasCanvas(topology),
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
