import fs from 'node:fs';
import path from 'node:path';

const packageRoot = path.resolve(new URL('..', import.meta.url).pathname);
const topologyPath = path.join(packageRoot, 'data', 'create-something-internal-topology.json');
const operatingSliceReviewPath = path.join(packageRoot, 'data', 'create-something-operating-slice-review.json');
const operatingSliceReadinessPath = path.join(packageRoot, 'data', 'create-something-operating-slice-readiness.json');
const outputPath = path.join(packageRoot, 'data', 'create-something-internal-topology.3d.json');

const topology = JSON.parse(fs.readFileSync(topologyPath, 'utf8'));
const operatingSliceReview = fs.existsSync(operatingSliceReviewPath)
  ? JSON.parse(fs.readFileSync(operatingSliceReviewPath, 'utf8'))
  : { slices: [] };
const operatingSliceReadiness = fs.existsSync(operatingSliceReadinessPath)
  ? JSON.parse(fs.readFileSync(operatingSliceReadinessPath, 'utf8'))
  : { items: [] };

const tierX = {
  Mixed: -360,
  Database: -120,
  Automation: 140,
  Judgment: 380
};

const statusZ = {
  mapped: -120,
  needs_atlas: 40,
  needs_substrate: 210
};

const palette = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#84cc16',
  '#f97316',
  '#ec4899',
  '#14b8a6',
  '#64748b'
];

const relationColors = {
  contains: '#64748b',
  depends_on: '#3b82f6',
  renders: '#8b5cf6',
  runs: '#10b981',
  documents: '#f59e0b',
  governs: '#ef4444',
  client_overlay: '#ec4899',
  configures: '#06b6d4'
};

const businessGroups = [
  {
    id: 'mcp-capability-platform',
    label: 'MCP Capability Platform',
    color: '#8b5cf6',
    meaning:
      'Reusable MCP capability creation: core servers, hub surfaces, auth, tool wrappers, and agent-callable product leverage.'
  },
  {
    id: 'cloudflare-delivery-spine',
    label: 'Cloudflare Delivery Spine',
    color: '#06b6d4',
    meaning:
      'Workers, runtime bindings, and deployable automation surfaces where workflows become durable services.'
  },
  {
    id: 'webflow-marketplace-ops',
    label: 'Webflow Marketplace Ops',
    color: '#f59e0b',
    meaning:
      'Webflow review, marketplace, template, app-governance, and dashboard surfaces that represent a clear operating vertical.'
  },
  {
    id: 'client-overlays',
    label: 'Client Overlays',
    color: '#ec4899',
    meaning:
      'Managed client systems attached as overlays to the CREATE SOMETHING operating topology rather than isolated one-off projects.'
  },
  {
    id: 'policy-judgment-os',
    label: 'Policy / Judgment OS',
    color: '#10b981',
    meaning:
      'Policies, Canon, judgment packages, approval behavior, and reusable quality constraints that govern delegated work.'
  },
  {
    id: 'agent-automation',
    label: 'Agent Automation',
    color: '#ef4444',
    meaning:
      'Runnable agents, Dify configs, schedulers, orchestration, observability hooks, and automation wrappers around capability.'
  },
  {
    id: 'database-substrate',
    label: 'Database Substrate',
    color: '#84cc16',
    meaning:
      'Substrate, database-layer records, source truth, topology artifacts, receipts, and API/MCP-readable state.'
  },
  {
    id: 'public-learning-surface',
    label: 'Public / Learning Surface',
    color: '#3b82f6',
    meaning:
      'Public agency, learning, LMS, articles, and narrative surfaces that turn the operating system into market education.'
  },
  {
    id: 'knowledge-playbooks',
    label: 'Knowledge / Playbooks',
    color: '#64748b',
    meaning:
      'Guides, docs, policy writeups, and playbooks that make repeated delivery decisions legible and transferable.'
  },
  {
    id: 'labs-experiments',
    label: 'Labs / Experiments',
    color: '#14b8a6',
    meaning:
      'Experimental packages, renderers, simulation surfaces, and exploratory proof points that may become future capability.'
  },
  {
    id: 'internal-platform',
    label: 'Internal Platform',
    color: '#e2e8f0',
    meaning:
      'Fallback internal platform area for repo surfaces that do not yet resolve cleanly to a business lens.'
  }
];

const businessGroupById = new Map(businessGroups.map((group) => [group.id, group]));

const apiAiGroups = [
  {
    id: 'agent-callable-interfaces',
    label: 'Agent-Callable Interfaces',
    color: '#8b5cf6',
    meaning:
      'MCP servers, tool surfaces, and hub contracts that make capability directly callable by agents and API clients.'
  },
  {
    id: 'runtime-api-delivery',
    label: 'Runtime API Delivery',
    color: '#06b6d4',
    meaning:
      'Workers, apps, and deployable runtime endpoints where durable API-first services can execute.'
  },
  {
    id: 'ai-orchestration',
    label: 'AI Orchestration',
    color: '#ef4444',
    meaning:
      'Agents, Dify workflows, schedulers, harnesses, and orchestration surfaces that turn APIs into AI-native workflows.'
  },
  {
    id: 'machine-readable-governance',
    label: 'Machine-Readable Governance',
    color: '#10b981',
    meaning:
      'Policy, Canon, approval, and judgment artifacts that agents can carry as operating constraints instead of relying on prompt memory.'
  },
  {
    id: 'api-readable-substrate',
    label: 'API-Readable Substrate',
    color: '#84cc16',
    meaning:
      'Database, topology, receipts, source records, and substrate surfaces that expose state as durable machine-readable context.'
  },
  {
    id: 'knowledge-to-tools',
    label: 'Knowledge To Tools',
    color: '#f59e0b',
    meaning:
      'Guides, playbooks, and documentation that should be convertible into prompts, tools, policy checks, or repeatable workflows.'
  },
  {
    id: 'client-api-overlays',
    label: 'Client API Overlays',
    color: '#ec4899',
    meaning:
      'Client-attached systems that should connect through explicit APIs, permissions, and reusable agent workflows.'
  },
  {
    id: 'public-ai-distribution',
    label: 'Public AI Distribution',
    color: '#3b82f6',
    meaning:
      'Public learning, articles, LMS, and narrative surfaces that package the operating system for adoption by humans and agents.'
  },
  {
    id: 'capability-packages',
    label: 'Capability Packages',
    color: '#14b8a6',
    meaning:
      'Reusable packages and internal modules that should publish clear contracts for API-first and agent-native composition.'
  },
  {
    id: 'unclassified-interface',
    label: 'Unclassified Interface',
    color: '#e2e8f0',
    meaning:
      'Repo surfaces that do not yet clearly advertise an API, agent contract, policy role, or machine-readable interface.'
  }
];

const apiAiGroupById = new Map(apiAiGroups.map((group) => [group.id, group]));

function clusterId(node) {
  if (node.clientSlug) return `client:${node.clientSlug}`;
  if (node.surface === 'policy' || node.surface === 'guide' || node.surface === 'doc') {
    return `knowledge:${node.surface}`;
  }
  if (node.surface === 'worker' || node.surface === 'mcp' || node.surface === 'agent' || node.surface === 'config') {
    return `automation:${node.surface}`;
  }
  if (node.tier === 'Database') return 'tier:database';
  return `${node.surface}:${node.tier.toLowerCase()}`;
}

function clusterLabel(id) {
  const [scope, value] = id.split(':');
  if (scope === 'client') return `Client / ${value}`;
  if (scope === 'knowledge') return `Knowledge / ${value}`;
  if (scope === 'automation') return `Automation / ${value}`;
  if (scope === 'tier') return 'Database layer';
  return `${scope} / ${value}`;
}

function clusterMeaning(id, nodes) {
  const [scope, value] = id.split(':');
  const mapped = nodes.filter((node) => node.status === 'mapped').length;
  const gaps = nodes.length - mapped;

  if (scope === 'client') {
    return `${value} is a managed client overlay. The cluster shows how much of that client surface has become reusable operating topology versus follow-up Atlas/Substrate completion work.`;
  }

  if (scope === 'automation') {
    if (value === 'worker') {
      return `Cloudflare worker runtime surface. This cluster is the delivery and integration layer where business workflows become deployed automation.`;
    }
    if (value === 'mcp') {
      return `MCP product surface. This cluster shows agent-accessible capabilities that can become CREATE SOMETHING leverage across clients and internal operations.`;
    }
    if (value === 'agent') {
      return `Agent configuration surface. This cluster shows where judgment and workflow policy are packaged into runnable assistants.`;
    }
    return `Automation configuration surface. This cluster is mostly routing, intake, and execution wiring.`;
  }

  if (scope === 'knowledge') {
    if (value === 'policy') {
      return `Judgment layer. Policies here define what agents and operators are allowed to do, and where review or proof is required.`;
    }
    if (value === 'guide') {
      return `Operating playbook layer. Guides here turn repeated delivery decisions into reusable practice.`;
    }
    return `Narrative and reference layer. Docs here explain the operating system and public positioning.`;
  }

  if (scope === 'tier') {
    return `Database substrate. This cluster is the record layer behind topology, actions, receipts, and API/MCP access.`;
  }

  if (scope === 'app') {
    return `Application surface. These are user-facing or operator-facing experiences attached to the CREATE SOMETHING operating system.`;
  }

  if (scope === 'package') {
    return `Reusable package surface. These are shared capabilities and libraries that support multiple workflows or products.`;
  }

  return `Topology group with ${nodes.length} records, ${mapped} mapped and ${gaps} still requiring Atlas/Substrate completion.`;
}

function businessGroupId(node) {
  const key = `${node.path} ${node.title} ${node.packageName ?? ''} ${node.tags?.join(' ') ?? ''}`.toLowerCase();

  if (node.clientSlug || node.path.includes('/clients/')) return 'client-overlays';
  if (/webflow|marketplace-template|template-search|app-governance|reviewer|bundle-scanner/.test(key)) {
    return 'webflow-marketplace-ops';
  }
  if (/database-layer|substrate|notion-tools|source-record|topology|hydra-db|codebase-vector-database/.test(key)) {
    return 'database-substrate';
  }
  if (
    node.surface === 'policy' ||
    node.tier === 'Judgment' ||
    /canon|policy|judgment|tufte|delivery-schema|agent-kit|pi-policy|pi-three-tier|mcp-authz/.test(key)
  ) {
    return 'policy-judgment-os';
  }
  if (node.surface === 'mcp' || /mcp|composio|hub|toolkit|playbook/.test(key)) return 'mcp-capability-platform';
  if (node.surface === 'agent' || /agent|dify|scheduler|orchestration|observability|harness/.test(key)) {
    return 'agent-automation';
  }
  if (node.surface === 'worker' || /wrangler|worker|cloudflare|runtime/.test(key)) return 'cloudflare-delivery-spine';
  if (/agency|learn|lms|ltd|io|article|content|public|landing|seo|aeo/.test(key)) {
    return 'public-learning-surface';
  }
  if (node.surface === 'guide' || node.surface === 'doc' || /docs\//.test(key)) return 'knowledge-playbooks';
  if (/huggingface|simulation|seeing|ascii|motion|renderer|experiments|labs|spritz/.test(key)) {
    return 'labs-experiments';
  }

  return 'internal-platform';
}

function apiAiGroupId(node) {
  const key = `${node.path} ${node.title} ${node.packageName ?? ''} ${node.tags?.join(' ') ?? ''}`.toLowerCase();

  if (node.clientSlug || node.path.includes('/clients/')) return 'client-api-overlays';
  if (/database-layer|substrate|source-record|topology|receipt|hydra-db|codebase-vector-database/.test(key)) {
    return 'api-readable-substrate';
  }
  if (node.surface === 'mcp' || /mcp|hub|tool|composio|gateway/.test(key)) {
    return 'agent-callable-interfaces';
  }
  if (node.surface === 'agent' || /agent|dify|scheduler|orchestration|harness|eval|observability/.test(key)) {
    return 'ai-orchestration';
  }
  if (node.surface === 'policy' || node.tier === 'Judgment' || /policy|canon|judgment|approval|governance|authz/.test(key)) {
    return 'machine-readable-governance';
  }
  if (node.surface === 'worker' || node.surface === 'app' || /worker|wrangler|cloudflare|api|runtime|endpoint/.test(key)) {
    return 'runtime-api-delivery';
  }
  if (node.surface === 'guide' || node.surface === 'doc' || /docs\//.test(key)) {
    return /agency|learn|lms|article|seo|aeo|public|marketing/.test(key)
      ? 'public-ai-distribution'
      : 'knowledge-to-tools';
  }
  if (node.surface === 'package' || /package|library|component|sdk/.test(key)) return 'capability-packages';

  return 'unclassified-interface';
}

function hexToRgb(hex) {
  const value = hex.replace('#', '');
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16)
  };
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/^@/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function relationCount(nodeId) {
  return topology.edges.filter((edge) => edge.source === nodeId || edge.target === nodeId).length;
}

const sliceByRecordId = new Map();
for (const slice of operatingSliceReview.slices ?? []) {
  for (const recordId of slice.recordIds ?? []) {
    if (!sliceByRecordId.has(recordId)) sliceByRecordId.set(recordId, slice);
  }
}

const readinessBySliceId = new Map((operatingSliceReadiness.items ?? []).map((item) => [item.sliceId, item]));

function substratePacket(node) {
  const recordSlug = slug(node.id);
  const slice = sliceByRecordId.get(node.id);
  const sliceSlug = slice ? slug(slice.id) : null;
  const readiness = slice ? readinessBySliceId.get(slice.id) : null;

  return {
    recordId: node.id,
    apiPath: `/api/substrate/topology/internal/records/${recordSlug}`,
    mcpUri: `substrate://topology/internal/records/${recordSlug}`,
    agentCommand: 'databaseLayer.topology.records.get',
    receiptId: `receipt:${node.id}`,
    actionId: node.status === 'mapped' ? null : `action:${node.status}:${node.id}`,
    operatingSliceId: slice?.id ?? null,
    operatingSliceApiPath: sliceSlug ? `/api/substrate/operating-slices/${sliceSlug}` : null,
    readinessApiPath: sliceSlug ? `/api/substrate/operating-slices/${sliceSlug}/readiness` : null,
    readinessStatus: readiness?.productionStatus ?? null,
    atlasCanvasId: topology.atlasCanvasId,
    atlasNodeId: node.atlasNodeId
  };
}

const nodesByCluster = new Map();
for (const node of topology.nodes) {
  const id = clusterId(node);
  const group = nodesByCluster.get(id) ?? [];
  group.push(node);
  nodesByCluster.set(id, group);
}

const nodesByBusinessGroup = new Map();
for (const node of topology.nodes) {
  const id = businessGroupId(node);
  const group = nodesByBusinessGroup.get(id) ?? [];
  group.push(node);
  nodesByBusinessGroup.set(id, group);
}

const nodesByApiAiGroup = new Map();
for (const node of topology.nodes) {
  const id = apiAiGroupId(node);
  const group = nodesByApiAiGroup.get(id) ?? [];
  group.push(node);
  nodesByApiAiGroup.set(id, group);
}

const clusters = [...nodesByCluster.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([id, nodes], index) => {
    const angle = (index / Math.max(nodesByCluster.size, 1)) * Math.PI * 2;
    const radius = 520 + (index % 3) * 90;
    const color = palette[index % palette.length];
    const surfaceCounts = {};
    const statusCounts = {};

    for (const node of nodes) {
      surfaceCounts[node.surface] = (surfaceCounts[node.surface] ?? 0) + 1;
      statusCounts[node.status] = (statusCounts[node.status] ?? 0) + 1;
    }

    return {
      id,
      label: clusterLabel(id),
      meaning: clusterMeaning(id, nodes),
      color,
      count: nodes.length,
      surfaceCounts,
      statusCounts,
      x: Math.round(Math.cos(angle) * radius),
      y: Math.round(Math.sin(angle) * radius),
      z: Math.round((index % 5) * 80 - 160)
    };
  });

const clusterById = new Map(clusters.map((cluster) => [cluster.id, cluster]));
const nodeIndexById = new Map();

const activeBusinessGroups = businessGroups
  .filter((group) => nodesByBusinessGroup.has(group.id))
  .map((group, index, activeGroups) => {
    const groupNodes = nodesByBusinessGroup.get(group.id);
    const angle = (index / Math.max(activeGroups.length, 1)) * Math.PI * 2 - Math.PI / 2;
    const radius = group.id === 'internal-platform' ? 120 : 660 + (index % 2) * 90;
    const statusCounts = {};
    const surfaceCounts = {};

    for (const node of groupNodes) {
      statusCounts[node.status] = (statusCounts[node.status] ?? 0) + 1;
      surfaceCounts[node.surface] = (surfaceCounts[node.surface] ?? 0) + 1;
    }

    return {
      ...group,
      count: groupNodes.length,
      statusCounts,
      surfaceCounts,
      x: Math.round(Math.cos(angle) * radius),
      y: Math.round(Math.sin(angle) * radius),
      z: Math.round((index % 4) * 95 - 140)
    };
  });

const businessGroupLayoutById = new Map(activeBusinessGroups.map((group) => [group.id, group]));
const businessNodeViews = topology.nodes.map((node) => {
  const groupId = businessGroupId(node);
  const group = businessGroupLayoutById.get(groupId) ?? businessGroupById.get('internal-platform');
  const groupNodes = nodesByBusinessGroup.get(groupId) ?? [node];
  const localIndex = groupNodes.findIndex((candidate) => candidate.id === node.id);
  const localAngle = (localIndex / Math.max(groupNodes.length, 1)) * Math.PI * 2;
  const ring = 42 + Math.floor(localIndex / 22) * 46;
  const statusOffset = statusZ[node.status] ?? 0;

  return {
    groupId,
    x: Math.round(group.x * 0.25 + Math.cos(localAngle) * ring),
    y: Math.round(group.y * 0.28 + Math.sin(localAngle) * ring),
    z: Math.round(group.z + statusOffset * 0.45 + (localIndex % 6) * 22),
    color: group.color
  };
});

const activeApiAiGroups = apiAiGroups
  .filter((group) => nodesByApiAiGroup.has(group.id))
  .map((group, index, activeGroups) => {
    const groupNodes = nodesByApiAiGroup.get(group.id);
    const angle = (index / Math.max(activeGroups.length, 1)) * Math.PI * 2 - Math.PI / 2;
    const radius = group.id === 'unclassified-interface' ? 130 : 700 + (index % 2) * 80;
    const statusCounts = {};
    const surfaceCounts = {};

    for (const node of groupNodes) {
      statusCounts[node.status] = (statusCounts[node.status] ?? 0) + 1;
      surfaceCounts[node.surface] = (surfaceCounts[node.surface] ?? 0) + 1;
    }

    return {
      ...group,
      count: groupNodes.length,
      statusCounts,
      surfaceCounts,
      x: Math.round(Math.cos(angle) * radius),
      y: Math.round(Math.sin(angle) * radius),
      z: Math.round((index % 5) * 78 - 150)
    };
  });

const apiAiGroupLayoutById = new Map(activeApiAiGroups.map((group) => [group.id, group]));
const apiAiNodeViews = topology.nodes.map((node) => {
  const groupId = apiAiGroupId(node);
  const group = apiAiGroupLayoutById.get(groupId) ?? apiAiGroupById.get('unclassified-interface');
  const groupNodes = nodesByApiAiGroup.get(groupId) ?? [node];
  const localIndex = groupNodes.findIndex((candidate) => candidate.id === node.id);
  const localAngle = (localIndex / Math.max(groupNodes.length, 1)) * Math.PI * 2;
  const ring = 44 + Math.floor(localIndex / 20) * 48;
  const statusOffset = statusZ[node.status] ?? 0;

  return {
    groupId,
    x: Math.round(group.x * 0.24 + Math.cos(localAngle) * ring),
    y: Math.round(group.y * 0.27 + Math.sin(localAngle) * ring),
    z: Math.round(group.z + statusOffset * 0.45 + (localIndex % 7) * 20),
    color: group.color
  };
});

const nodes = topology.nodes.map((node, index) => {
  const cluster = clusterById.get(clusterId(node));
  const group = nodesByCluster.get(cluster.id);
  const localIndex = group.findIndex((candidate) => candidate.id === node.id);
  const localAngle = (localIndex / Math.max(group.length, 1)) * Math.PI * 2;
  const ring = 38 + Math.floor(localIndex / 24) * 42;
  const relations = relationCount(node.id);

  nodeIndexById.set(node.id, index);

  if (node.id === topology.rootNodeId) {
    return {
      id: node.id,
      atlasNodeId: node.atlasNodeId,
      substrate: substratePacket(node),
      label: node.title,
      path: node.path,
      tier: node.tier,
      surface: node.surface,
      status: node.status,
      owner: node.owner,
      clusterId: cluster.id,
      relationCount: relations,
      x: 0,
      y: 0,
      z: -60,
      size: 18,
      color: '#e2e8f0',
      targetPath: node.path
    };
  }

  return {
    id: node.id,
    atlasNodeId: node.atlasNodeId,
    substrate: substratePacket(node),
    label: node.title,
    path: node.path,
    tier: node.tier,
    surface: node.surface,
    status: node.status,
    owner: node.owner,
    clusterId: cluster.id,
    relationCount: relations,
    x: Math.round((tierX[node.tier] ?? 0) + cluster.x * 0.18 + Math.cos(localAngle) * ring),
    y: Math.round(cluster.y * 0.32 + Math.sin(localAngle) * ring),
    z: Math.round((statusZ[node.status] ?? 0) + cluster.z + (localIndex % 7) * 18),
    size: Math.min(18, 5 + Math.sqrt(relations + 1) * 2),
    color: cluster.color,
    targetPath: node.path
  };
});

const edges = topology.edges
  .map((edge) => {
    const sourceIndex = nodeIndexById.get(edge.source);
    const targetIndex = nodeIndexById.get(edge.target);
    if (sourceIndex === undefined || targetIndex === undefined) return null;

    return {
      id: edge.id,
      source: sourceIndex,
      target: targetIndex,
      relation: edge.relation,
      evidence: edge.evidence,
      color: relationColors[edge.relation] ?? '#94a3b8',
      alpha: edge.relation === 'contains' ? 0.16 : 0.48
    };
  })
  .filter(Boolean);

function countBy(items, keyFor) {
  const counts = {};
  for (const item of items) {
    const key = keyFor(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

const relationCounts = countBy(edges, (edge) => edge.relation);
const surfaceCounts = countBy(nodes, (node) => node.surface);
const tierCounts = countBy(nodes, (node) => node.tier);

function groupIdForLens(lensId, nodeIndex) {
  if (lensId === 'business') return businessNodeViews[nodeIndex]?.groupId;
  if (lensId === 'apiAi') return apiAiNodeViews[nodeIndex]?.groupId;
  return nodes[nodeIndex]?.clusterId;
}

function buildLensInsight(lensId, label, groups) {
  const groupStats = new Map(
    groups.map((group) => [
      group.id,
      {
        id: group.id,
        label: group.label,
        count: group.count,
        surfaceCounts: group.surfaceCounts,
        statusCounts: group.statusCounts,
        knowledgeCount: (group.surfaceCounts?.guide ?? 0) + (group.surfaceCounts?.doc ?? 0),
        knowledgePct: Number(
          ((((group.surfaceCounts?.guide ?? 0) + (group.surfaceCounts?.doc ?? 0)) / Math.max(group.count, 1)) * 100).toFixed(1)
        ),
        internalEdges: 0,
        crossEdges: 0,
        structuralCrossEdges: 0,
        inboundStructuralEdges: 0,
        outboundStructuralEdges: 0,
        relationCounts: {}
      }
    ])
  );
  const pairStats = new Map();
  const directedPairStats = new Map();

  for (const edge of edges) {
    const sourceGroupId = groupIdForLens(lensId, edge.source);
    const targetGroupId = groupIdForLens(lensId, edge.target);
    const sourceGroup = groupStats.get(sourceGroupId);
    const targetGroup = groupStats.get(targetGroupId);
    const structural = edge.relation !== 'contains';

    if (sourceGroup) {
      sourceGroup.relationCounts[edge.relation] = (sourceGroup.relationCounts[edge.relation] ?? 0) + 1;
    }
    if (targetGroup && targetGroup !== sourceGroup) {
      targetGroup.relationCounts[edge.relation] = (targetGroup.relationCounts[edge.relation] ?? 0) + 1;
    }

    if (sourceGroupId === targetGroupId) {
      if (sourceGroup) sourceGroup.internalEdges += 1;
      continue;
    }

    if (sourceGroup) {
      sourceGroup.crossEdges += 1;
      if (structural) {
        sourceGroup.structuralCrossEdges += 1;
        sourceGroup.outboundStructuralEdges += 1;
      }
    }
    if (targetGroup) {
      targetGroup.crossEdges += 1;
      if (structural) {
        targetGroup.structuralCrossEdges += 1;
        targetGroup.inboundStructuralEdges += 1;
      }
    }

    if (!structural) continue;
    const key = [sourceGroupId, targetGroupId].sort().join('::');
    const pair = pairStats.get(key) ?? {
      a: sourceGroupId,
      b: targetGroupId,
      count: 0,
      relations: {}
    };
    pair.count += 1;
    pair.relations[edge.relation] = (pair.relations[edge.relation] ?? 0) + 1;
    pairStats.set(key, pair);

    const directedKey = `${sourceGroupId}->${targetGroupId}`;
    const directedPair = directedPairStats.get(directedKey) ?? {
      source: sourceGroupId,
      target: targetGroupId,
      count: 0,
      relations: {},
      examples: []
    };
    directedPair.count += 1;
    directedPair.relations[edge.relation] = (directedPair.relations[edge.relation] ?? 0) + 1;
    if (directedPair.examples.length < 5) {
      directedPair.examples.push({
        relation: edge.relation,
        sourceId: nodes[edge.source]?.id,
        sourceLabel: nodes[edge.source]?.label,
        targetId: nodes[edge.target]?.id,
        targetLabel: nodes[edge.target]?.label,
        evidence: edge.evidence
      });
    }
    directedPairStats.set(directedKey, directedPair);
  }

  const groupRows = [...groupStats.values()]
    .map((group) => {
      const groupNodeIndexes = nodes
        .map((node, index) => ({ node, index }))
        .filter((entry) => groupIdForLens(lensId, entry.index) === group.id);
      const dominantSurfaces = Object.entries(group.surfaceCounts ?? {})
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([surface, count]) => ({ surface, count }));
      const representativeNodes = groupNodeIndexes
        .slice()
        .sort((a, b) => b.node.size - a.node.size || a.node.label.localeCompare(b.node.label))
        .slice(0, 6)
        .map(({ node }) => ({
          id: node.id,
          label: node.label,
          path: node.path,
          tier: node.tier,
          surface: node.surface,
          status: node.status
        }));

      return {
        ...group,
        structuralCrossEdgesPerNode: Number((group.structuralCrossEdges / Math.max(group.count, 1)).toFixed(2)),
        classificationEvidence: {
          dominantSurfaces,
          representativeNodes
        }
      };
    })
    .sort((a, b) => b.count - a.count);
  const groupById = new Map(groups.map((group) => [group.id, group]));

  return {
    lensId,
    label,
    groups: groupRows,
    topStructuralPairs: [...pairStats.values()]
      .map((pair) => ({
        ...pair,
        aLabel: groupById.get(pair.a)?.label ?? pair.a,
        bLabel: groupById.get(pair.b)?.label ?? pair.b
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12),
    directionalStructuralLinks: [...directedPairStats.values()]
      .map((link) => ({
        ...link,
        sourceLabel: groupById.get(link.source)?.label ?? link.source,
        targetLabel: groupById.get(link.target)?.label ?? link.target
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 18)
  };
}

function buildTopologyInsights() {
  const business = buildLensInsight('business', 'Business', activeBusinessGroups);
  const apiAi = buildLensInsight('apiAi', 'API / AI', activeApiAiGroups);
  const relationTotal = edges.length;
  const containsShare = Number((((relationCounts.contains ?? 0) / Math.max(relationTotal, 1)) * 100).toFixed(1));
  const findGroup = (lensInsight, id) => lensInsight.groups.find((group) => group.id === id);
  const clientApiOverlays = findGroup(apiAi, 'client-api-overlays');
  const apiReadableSubstrate = findGroup(apiAi, 'api-readable-substrate');
  const capabilityPackages = findGroup(apiAi, 'capability-packages');
  const agentCallable = findGroup(apiAi, 'agent-callable-interfaces');
  const aiOrchestration = findGroup(apiAi, 'ai-orchestration');
  const machineGovernance = findGroup(apiAi, 'machine-readable-governance');
  const publicLearning = findGroup(business, 'public-learning-surface');
  const agentAutomation = findGroup(business, 'agent-automation');
  const hasSubstrateOperatorContract = nodes.some(
    (node) =>
      node.path === 'docs/guides/SUBSTRATE_TOPOLOGY_OPERATOR_CONTRACT.md' &&
      groupIdForLens('apiAi', nodes.indexOf(node)) === 'api-readable-substrate'
  );
  const improvementCandidates = [
    {
      id: 'client-api-overlay-playbooks',
      lensId: 'apiAi',
      groupIds: ['client-api-overlays'],
      priority: clientApiOverlays?.knowledgeCount === 0 ? 'high' : 'medium',
      title: 'Add client overlay playbooks or API contracts.',
      evidence: `Client API Overlays has ${clientApiOverlays?.count ?? 0} records and ${clientApiOverlays?.knowledgeCount ?? 0} guide/doc records.`,
      suggestedAction:
        'Add at least one machine-readable client overlay runbook or API contract that explains source bindings, permissions, receipts, and safe agent actions.'
    },
    !hasSubstrateOperatorContract
      ? {
          id: 'substrate-operator-contract',
          lensId: 'apiAi',
          groupIds: ['api-readable-substrate'],
          priority: apiReadableSubstrate?.knowledgeCount === 0 ? 'high' : 'medium',
          title: 'Expose a substrate operator contract.',
          evidence: `API-Readable Substrate has ${apiReadableSubstrate?.count ?? 0} records, ${apiReadableSubstrate?.structuralCrossEdges ?? 0} structural cross-group edges, and ${apiReadableSubstrate?.knowledgeCount ?? 0} guide/doc records.`,
          suggestedAction:
            'Document the agent-facing context operations, read/write boundaries, receipts, and promotion path for Substrate/topology surfaces.'
        }
      : null,
    {
      id: 'capability-package-contracts',
      lensId: 'apiAi',
      groupIds: ['capability-packages'],
      priority: capabilityPackages?.knowledgeCount === 0 ? 'medium' : 'low',
      title: 'Attach agent-readable contracts to capability packages.',
      evidence: `Capability Packages has ${capabilityPackages?.count ?? 0} package records and ${capabilityPackages?.knowledgeCount ?? 0} guide/doc records in the API / AI lens.`,
      suggestedAction:
        'Publish package-level contract metadata that states callable APIs, MCP resources/tools, policies, and handoff receipts.'
    }
  ].filter(Boolean);
  const completedImprovements = [
    {
      id: 'semantic-edge-weighting',
      title: 'Separate containment proof from semantic dependency proof.',
      evidence: `Contains edges represent ${containsShare}% of the graph, so generated insights now compute top structural pairs and cross-group coupling with contains edges excluded.`,
      completedBy:
        'Added generated lens insights with structural cross edges, structural pairs, observations, improvement candidates, and topology3d_insights_read.'
    },
    {
      id: 'agent-explainable-groups',
      title: 'Make cluster explanations agent-readable.',
      evidence:
        'Generated insight groups now include classification evidence and directional structural links for explaining why a cluster matters.',
      completedBy:
        'Added representative group records, dominant surfaces, directed relationship summaries, and topology3d_group_explain.'
    },
    hasSubstrateOperatorContract
      ? {
          id: 'substrate-operator-contract',
          lensId: 'apiAi',
          groupIds: ['api-readable-substrate'],
          title: 'Expose a substrate operator contract.',
          evidence:
            'docs/guides/SUBSTRATE_TOPOLOGY_OPERATOR_CONTRACT.md defines the agent-facing context operations, read/write boundaries, handoff packet, and validation path for topology/Substrate surfaces.',
          completedBy:
            'Added a guide contract and regenerated topology insights so API-Readable Substrate has guide/doc coverage.'
        }
      : null
  ].filter(Boolean);

  return {
    generatedAt: topology.coverage.generatedAt,
    relationCounts,
    surfaceCounts,
    tierCounts,
    observations: [
      {
        id: 'api-surface-is-largest-interface',
        severity: 'signal',
        title: 'Agent-callable interfaces are the largest API / AI group.',
        evidence: `${agentCallable?.count ?? 0} of ${nodes.length} records are grouped as agent-callable interfaces, led by MCP/tool surfaces, workers, configs, and policy attachments.`,
        implication:
          'The repo is already shaped around MCP/API capability creation more than a single application surface.'
      },
      {
        id: 'knowledge-operates-as-product-tissue',
        severity: 'signal',
        title: 'Knowledge is operating tissue, not just documentation.',
        evidence: `Public / Learning Surface is ${publicLearning?.knowledgePct ?? 0}% guide/doc, Agent Automation is ${agentAutomation?.knowledgePct ?? 0}% guide/doc, and AI Orchestration is ${aiOrchestration?.knowledgePct ?? 0}% guide/doc.`,
        implication:
          'Playbooks appear to be where repeated delivery decisions become reusable workflow behavior.'
      },
      {
        id: 'governance-is-cross-cutting',
        severity: 'signal',
        title: 'Governance is cross-cutting infrastructure.',
        evidence: `Machine-Readable Governance has ${machineGovernance?.structuralCrossEdges ?? 0} structural cross-group edges and ${machineGovernance?.structuralCrossEdgesPerNode ?? 0} structural cross edges per node.`,
        implication:
          'Policy/Judgment is not isolated content; it binds runtime, agents, and MCP capability.'
      },
      {
        id: 'contains-edges-dominate-raw-topology',
        severity: 'caveat',
        title: 'Raw topology is still dominated by containment edges.',
        evidence: `${relationCounts.contains ?? 0} of ${relationTotal} edges are contains edges (${containsShare}%).`,
        implication:
          'Operational and structural edge modes are necessary for reading business implications; raw edge count overstates root/substrate centrality.'
      }
    ],
    improvementCandidates,
    completedImprovements,
    lenses: {
      business,
      apiAi
    }
  };
}

const insights = buildTopologyInsights();

const contextApi = {
  id: 'create-something.topology3d.context.v1',
  purpose:
    'Agent-native control contract for reading and managing the 3D topology context without scraping the browser UI.',
  stateSchema: {
    lensId: {
      enum: ['operational', 'business', 'apiAi'],
      default: 'operational',
      description: 'Current topology lens.'
    },
    groupId: {
      type: 'string',
      nullable: true,
      description: 'Current cluster, business area, or interface group id for the active lens.'
    },
    status: {
      enum: ['', 'mapped', 'needs_atlas', 'needs_substrate'],
      default: '',
      description: 'Topology record mapping status filter.'
    },
    tier: {
      enum: ['', 'Database', 'Automation', 'Judgment', 'Mixed'],
      default: '',
      description: 'Three-tier framework filter.'
    },
    edgeMode: {
      enum: ['operational', 'structural', 'all', 'contains'],
      default: 'operational',
      description: 'Visible edge class.'
    },
    search: {
      type: 'string',
      default: '',
      description: 'Case-insensitive query over label, path, surface, and owner.'
    },
    selectedNodeId: {
      type: 'string',
      nullable: true,
      description: 'Focused topology node id.'
    }
  },
  resources: [
    {
      uri: 'topology3d://create-something/internal/artifact',
      description: 'Complete precomputed renderer artifact with nodes, edges, lenses, groups, and context API metadata.'
    },
    {
      uri: 'topology3d://create-something/internal/lenses',
      description: 'Available topology lenses and their group labels.'
    },
    {
      uri: 'topology3d://create-something/internal/state',
      description: 'Current lens, filters, edge mode, search query, and selected node.'
    },
    {
      uri: 'topology3d://create-something/internal/context',
      description: 'Resolved context snapshot: active lens, visible groups, visible nodes, visible edges, and selected record.'
    },
    {
      uri: 'topology3d://create-something/internal/node/{nodeId}',
      description: 'Single topology record with Substrate handles, lens views, adjacent edges, group meanings, and source path.'
    },
    {
      uri: 'topology3d://create-something/internal/insights',
      description: 'Generated observations, caveats, and improvement candidates derived from the topology artifact.'
    },
    {
      uri: 'topology3d://create-something/internal/atlas-session',
      description: 'Read-only exported Atlas Studio session associated with this topology projection.'
    },
    {
      uri: 'topology3d://create-something/internal/atlas-story',
      description: 'Read-only Atlas story, callouts, questions, and guided navigation steps for the associated canvas.'
    },
    {
      uri: 'topology3d://create-something/internal/atlas-node/{atlasNodeId}',
      description: 'Single Atlas canvas node joined back to its topology node and adjacent Atlas edges.'
    }
  ],
  tools: [
    {
      name: 'topology3d_context_read',
      kind: 'read',
      description:
        'Return the current context snapshot or a projected snapshot for supplied lens/filter/search arguments.',
      input: ['lensId', 'groupId', 'status', 'tier', 'edgeMode', 'search', 'selectedNodeId', 'limit'],
      returns: ['state', 'lens', 'groups', 'selectedNode', 'nodes', 'edges', 'counts']
    },
    {
      name: 'topology3d_context_set',
      kind: 'view_state',
      description:
        'Set the active lens, group, status, tier, edge mode, search query, and selected node for a human or agent session.',
      input: ['lensId', 'groupId', 'status', 'tier', 'edgeMode', 'search', 'selectedNodeId'],
      returns: ['state', 'selectedNode', 'counts']
    },
    {
      name: 'topology3d_node_focus',
      kind: 'view_state',
      description:
        'Focus one topology node by id, return its Substrate record handles, lens group meanings, adjacent edges, and source path.',
      input: ['nodeId', 'lensId'],
      returns: ['state', 'node', 'substrate', 'lensViews', 'adjacentEdges']
    },
    {
      name: 'topology3d_lens_summarize',
      kind: 'read',
      description:
        'Summarize a lens by group counts, surface distribution, status counts, and meaning for conversational navigation.',
      input: ['lensId'],
      returns: ['lens', 'groups', 'counts']
    },
    {
      name: 'topology3d_selection_export',
      kind: 'read',
      description:
        'Export the selected node and visible context as a compact handoff packet for another agent or MCP workflow.',
      input: ['limit'],
      returns: ['state', 'selectedNode', 'visibleNodes', 'visibleEdges', 'handoff', 'substrate']
    },
    {
      name: 'topology3d_insights_read',
      kind: 'read',
      description:
        'Return generated observations, caveats, structural pairings, and improvement candidates for agent-led review loops.',
      input: ['lensId'],
      returns: ['observations', 'improvementCandidates', 'lens']
    },
    {
      name: 'topology3d_group_explain',
      kind: 'read',
      description:
        'Explain one cluster, business area, or interface group with classification evidence, inbound/outbound structural links, representative records, and linked improvement candidates.',
      input: ['lensId', 'groupId', 'limit'],
      returns: ['lens', 'group', 'classificationEvidence', 'directionalLinks', 'representativeNodes', 'improvementCandidates']
    },
    {
      name: 'topology3d_atlas_context_read',
      kind: 'read',
      description:
        'Read the associated Atlas canvas context for the active or supplied topology node, including Atlas node, adjacent Atlas edges, story steps, callouts, and topology join ids.',
      input: ['nodeId', 'atlasNodeId', 'includeStory', 'limit'],
      returns: ['atlasSession', 'topologyNode', 'atlasNode', 'atlasEdges', 'story']
    },
    {
      name: 'topology3d_atlas_story_read',
      kind: 'read',
      description:
        'Read the associated Atlas story, active step, callouts, questions, and focus topology joins without loading the full canvas.',
      input: ['stepId', 'limit'],
      returns: ['atlasSession', 'story', 'activeStep', 'steps', 'callouts', 'questions']
    }
  ],
  mcp: {
    serverName: '@create-something/database-layer/topology3d',
    lifecycle: 'local-stdio-runtime',
    boundaries: [
      'read-only against generated topology artifacts',
      'view-state tools may change a local viewer session but do not mutate topology truth',
      'write-back to Atlas, Substrate, Cloudflare, client systems, or production review state requires a separate governed promotion tool'
    ]
  }
};

const artifact = {
  version: 1,
  topologyId: topology.id,
  atlasCanvasId: topology.atlasCanvasId,
  generatedAt: topology.coverage.generatedAt,
  rendererBudget: {
    initialUsableMs: 500,
    interactionMs: 50,
    filterMs: 100,
    layout: 'precomputed'
  },
  counts: {
    nodes: nodes.length,
    edges: edges.length,
    clusters: clusters.length,
    businessGroups: activeBusinessGroups.length,
    apiAiGroups: activeApiAiGroups.length
  },
  contextApi,
  insights,
  colorLegend: Object.fromEntries(palette.map((color, index) => [`cluster_${index}`, hexToRgb(color)])),
  lenses: {
    operational: {
      id: 'operational',
      label: 'Operational',
      groupLabel: 'Cluster',
      meaning:
        'Repo-derived operating topology grouped by technical surface, tier, status, and runtime shape.',
      groups: clusters
    },
    business: {
      id: 'business',
      label: 'Business',
      groupLabel: 'Business Area',
      inferred: true,
      meaning:
        'Inferred business lens over the same topology records. Useful for reading emerging business shape, not a canonical revenue taxonomy.',
      groups: activeBusinessGroups,
      nodes: businessNodeViews
    },
    apiAi: {
      id: 'apiAi',
      label: 'API / AI',
      groupLabel: 'Interface',
      inferred: true,
      meaning:
        'API-first and AI-native lens over the same topology records. Useful for checking whether capability is exposed as callable interfaces, machine-readable state, governed agent workflows, or reusable knowledge.',
      groups: activeApiAiGroups,
      nodes: apiAiNodeViews
    }
  },
  clusters,
  nodes,
  edges
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(`${outputPath}.tmp`, `${JSON.stringify(artifact, null, 2)}\n`);
fs.renameSync(`${outputPath}.tmp`, outputPath);

console.log(
  `Wrote ${path.relative(packageRoot, outputPath)} with ${nodes.length} nodes, ${edges.length} edges, and ${clusters.length} clusters.`
);
