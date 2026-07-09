import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_ARTIFACT_PATH = path.resolve(
  __dirname,
  '../data/create-something-internal-topology.3d.json'
);
const DEFAULT_ATLAS_SESSION_PATH = path.resolve(
  __dirname,
  '../data/create-something-internal-operating-topology.atlas-session.json'
);
const DEFAULT_CLIENT_OVERLAY_COVERAGE_PATH = path.resolve(
  __dirname,
  '../data/create-something-client-overlay-coverage.json'
);

const DEFAULT_STATE = Object.freeze({
  lensId: 'operational',
  groupId: null,
  status: '',
  tier: '',
  edgeMode: 'operational',
  search: '',
  selectedNodeId: null
});

const VALID_STATUS = new Set(['', 'mapped', 'needs_atlas', 'needs_substrate']);
const VALID_TIER = new Set(['', 'Database', 'Automation', 'Judgment', 'Mixed']);
const VALID_EDGE_MODE = new Set(['operational', 'structural', 'all', 'contains']);

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/^@/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const TOOL_INPUT_SCHEMAS = {
  topology3d_context_read: {
    type: 'object',
    additionalProperties: false,
    properties: contextStateProperties({ limit: true })
  },
  topology3d_context_set: {
    type: 'object',
    additionalProperties: false,
    properties: contextStateProperties()
  },
  topology3d_node_focus: {
    type: 'object',
    additionalProperties: false,
    required: ['nodeId'],
    properties: {
      nodeId: { type: 'string', description: 'Topology node id to focus.' },
      lensId: { type: 'string', enum: ['operational', 'business', 'apiAi'] }
    }
  },
  topology3d_lens_summarize: {
    type: 'object',
    additionalProperties: false,
    properties: {
      lensId: { type: 'string', enum: ['operational', 'business', 'apiAi'] }
    }
  },
  topology3d_selection_export: {
    type: 'object',
    additionalProperties: false,
    properties: {
      limit: { type: 'integer', minimum: 0, maximum: 500 }
    }
  },
  topology3d_insights_read: {
    type: 'object',
    additionalProperties: false,
    properties: {
      lensId: { type: 'string', enum: ['operational', 'business', 'apiAi'] }
    }
  },
  topology3d_group_explain: {
    type: 'object',
    additionalProperties: false,
    required: ['groupId'],
    properties: {
      lensId: { type: 'string', enum: ['operational', 'business', 'apiAi'] },
      groupId: { type: 'string', description: 'Group id within the selected topology lens.' },
      limit: { type: 'integer', minimum: 1, maximum: 25 }
    }
  },
  topology3d_atlas_context_read: {
    type: 'object',
    additionalProperties: false,
    properties: {
      nodeId: { type: 'string', description: 'Topology node id to join into the Atlas canvas.' },
      atlasNodeId: { type: 'string', description: 'Atlas canvas node id to join back to topology.' },
      includeStory: { type: 'boolean', description: 'Include matching Atlas story steps and callouts.' },
      limit: { type: 'integer', minimum: 0, maximum: 100 }
    }
  },
  topology3d_atlas_story_read: {
    type: 'object',
    additionalProperties: false,
    properties: {
      stepId: { type: 'string', description: 'Optional Atlas story step id to focus.' },
      limit: { type: 'integer', minimum: 0, maximum: 100 }
    }
  },
  topology3d_client_overlay_context_read: {
    type: 'object',
    additionalProperties: false,
    properties: {
      clientSlug: { type: 'string', description: 'Client overlay slug to load.' },
      nodeId: { type: 'string', description: 'Topology node id whose client overlay should be loaded.' }
    }
  }
};

function contextStateProperties(extra = {}) {
  return {
    lensId: { type: 'string', enum: ['operational', 'business', 'apiAi'] },
    groupId: { type: ['string', 'null'] },
    status: { type: 'string', enum: ['', 'mapped', 'needs_atlas', 'needs_substrate'] },
    tier: { type: 'string', enum: ['', 'Database', 'Automation', 'Judgment', 'Mixed'] },
    edgeMode: { type: 'string', enum: ['operational', 'structural', 'all', 'contains'] },
    search: { type: 'string' },
    selectedNodeId: { type: ['string', 'null'] },
    ...(extra.limit ? { limit: { type: 'integer', minimum: 0, maximum: 500 } } : {})
  };
}

export function loadTopology3dArtifact(artifactPath = DEFAULT_ARTIFACT_PATH) {
  return JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
}

export function loadTopology3dAtlasSession(atlasSessionPath = DEFAULT_ATLAS_SESSION_PATH) {
  return JSON.parse(fs.readFileSync(atlasSessionPath, 'utf8'));
}

export function loadTopology3dClientOverlayCoverage(
  clientOverlayCoveragePath = DEFAULT_CLIENT_OVERLAY_COVERAGE_PATH
) {
  return JSON.parse(fs.readFileSync(clientOverlayCoveragePath, 'utf8'));
}

export function createTopology3dRuntime(options = {}) {
  const artifact = options.artifact ?? loadTopology3dArtifact(options.artifactPath);
  const atlasSession = options.atlasSession ?? loadTopology3dAtlasSession(options.atlasSessionPath);
  const clientOverlayCoverage =
    options.clientOverlayCoverage ?? loadTopology3dClientOverlayCoverage(options.clientOverlayCoveragePath);
  const atlasNodes = atlasSession.canvas?.nodes ?? [];
  const atlasEdges = atlasSession.canvas?.edges ?? [];
  const atlasNodeById = new Map(atlasNodes.map((node) => [node.id, node]));
  const atlasNodeByTopologyId = new Map(atlasNodes.map((node) => [node.atlasId, node]));
  const topologyNodeById = new Map(artifact.nodes.map((node, index) => [node.id, { node, index }]));
  const clientOverlayByKey = buildClientOverlayIndex(clientOverlayCoverage.overlays ?? []);
  let state = normalizeState(artifact, {
    ...DEFAULT_STATE,
    selectedNodeId: artifact.nodes?.[0]?.id ?? null,
    ...(options.initialState ?? {})
  });

  function lensFor(lensId = state.lensId) {
    const lens = artifact.lenses?.[lensId];
    if (!lens) {
      throw new Error(`Unknown lensId "${lensId}". Use one of: ${Object.keys(artifact.lenses ?? {}).join(', ')}.`);
    }
    return lens;
  }

  function lensNodeView(nodeIndex, lensId = state.lensId) {
    const lens = lensFor(lensId);
    const nodeView = lens.nodes?.[nodeIndex];
    if (nodeView) return nodeView;

    const node = artifact.nodes[nodeIndex];
    return {
      groupId: node.clusterId,
      x: node.x,
      y: node.y,
      z: node.z,
      color: node.color
    };
  }

  function normalizeStateForRead(nextState = {}) {
    return normalizeState(artifact, { ...state, ...compactUndefined(nextState) });
  }

  function visibleNodeIndexes(readState = state) {
    const group = readState.groupId;
    const query = String(readState.search ?? '').trim().toLowerCase();
    const indexes = [];

    for (let index = 0; index < artifact.nodes.length; index += 1) {
      const node = artifact.nodes[index];
      const nodeView = lensNodeView(index, readState.lensId);
      if (group && nodeView.groupId !== group) continue;
      if (readState.status && node.status !== readState.status) continue;
      if (readState.tier && node.tier !== readState.tier) continue;
      if (query && !`${node.label} ${node.path} ${node.surface} ${node.owner}`.toLowerCase().includes(query)) {
        continue;
      }
      indexes.push(index);
    }

    return indexes;
  }

  function visibleEdge(edge, visibleSet, readState = state) {
    if (!visibleSet.has(edge.source) || !visibleSet.has(edge.target)) return false;
    if (readState.edgeMode === 'all') return true;
    if (readState.edgeMode === 'contains') return edge.relation === 'contains';
    if (readState.edgeMode === 'structural') return edge.relation !== 'contains';

    const source = artifact.nodes[edge.source];
    const target = artifact.nodes[edge.target];
    return edge.relation !== 'contains' && source?.path !== '.' && target?.path !== '.';
  }

  function groupFor(nodeIndex, lensId = state.lensId) {
    const lens = lensFor(lensId);
    const nodeView = lensNodeView(nodeIndex, lensId);
    return (lens.groups ?? []).find((candidate) => candidate.id === nodeView.groupId) ?? null;
  }

  function nodePacket(nodeIndex, lensId = state.lensId) {
    const node = artifact.nodes[nodeIndex];
    if (!node) return null;
    const nodeView = lensNodeView(nodeIndex, lensId);
    const group = groupFor(nodeIndex, lensId);
    return {
      ...node,
      lensView: nodeView,
      atlas: {
        sessionId: atlasSession.id ?? artifact.atlasCanvasId,
        atlasCanvasId: artifact.atlasCanvasId,
        atlasNodeId: node.atlasNodeId,
        hasAtlasNode: atlasNodeById.has(node.atlasNodeId)
      },
      group: group
        ? {
            id: group.id,
            label: group.label,
            meaning: group.meaning
          }
        : null
    };
  }

  function adjacentEdges(nodeIndex) {
    return artifact.edges
      .filter((edge) => edge.source === nodeIndex || edge.target === nodeIndex)
      .map((edge) => ({
        id: edge.id,
        relation: edge.relation,
        source: artifact.nodes[edge.source]?.id,
        target: artifact.nodes[edge.target]?.id,
        evidence: edge.evidence
      }));
  }

  function insightsRead(options = {}) {
    const readState = normalizeStateForRead(options);
    return {
      observations: artifact.insights?.observations ?? [],
      improvementCandidates: artifact.insights?.improvementCandidates ?? [],
      completedImprovements: artifact.insights?.completedImprovements ?? [],
      relationCounts: artifact.insights?.relationCounts ?? {},
      surfaceCounts: artifact.insights?.surfaceCounts ?? {},
      tierCounts: artifact.insights?.tierCounts ?? {},
      lens: artifact.insights?.lenses?.[readState.lensId] ?? null
    };
  }

  function contextSnapshot(options = {}) {
    const { limit: rawLimit, ...stateOptions } = options;
    const readState = normalizeStateForRead(stateOptions);
    const limit = Number.isFinite(rawLimit) ? Math.max(0, Math.min(500, rawLimit)) : 80;
    const lens = lensFor(readState.lensId);
    const visible = visibleNodeIndexes(readState);
    const visibleSet = new Set(visible);
    const visibleEdges = artifact.edges.filter((edge) => visibleEdge(edge, visibleSet, readState));
    const visibleGroupIds = new Set(visible.map((nodeIndex) => lensNodeView(nodeIndex, readState.lensId).groupId));
    const selectedIndex = artifact.nodes.findIndex((node) => node.id === readState.selectedNodeId);

    return {
      api: artifact.contextApi,
      state: readState,
      lens: {
        id: lens.id,
        label: lens.label,
        groupLabel: lens.groupLabel,
        inferred: Boolean(lens.inferred),
        meaning: lens.meaning
      },
      insights: insightsRead({ lensId: readState.lensId }),
      counts: {
        totalNodes: artifact.nodes.length,
        totalEdges: artifact.edges.length,
        visibleNodes: visible.length,
        visibleEdges: visibleEdges.length,
        visibleGroups: visibleGroupIds.size
      },
      groups: (lens.groups ?? [])
        .filter((group) => visibleGroupIds.has(group.id))
        .map((group) => ({
          id: group.id,
          label: group.label,
          count: group.count,
          meaning: group.meaning,
          surfaceCounts: group.surfaceCounts,
          statusCounts: group.statusCounts
        })),
      selectedNode: selectedIndex >= 0 ? nodePacket(selectedIndex, readState.lensId) : null,
      nodes: visible.slice(0, limit).map((nodeIndex) => nodePacket(nodeIndex, readState.lensId)).filter(Boolean),
      edges: visibleEdges.slice(0, limit).map((edge) => ({
        id: edge.id,
        relation: edge.relation,
        source: artifact.nodes[edge.source]?.id,
        target: artifact.nodes[edge.target]?.id,
        evidence: edge.evidence
      }))
    };
  }

  function setViewState(nextState = {}) {
    state = normalizeState(artifact, { ...state, ...compactUndefined(nextState) });
    return contextSnapshot({ limit: 80 });
  }

  function focusNode(nodeId, lensId) {
    const nodeIndex = artifact.nodes.findIndex((node) => node.id === nodeId);
    if (nodeIndex < 0) {
      throw new Error(`Unknown nodeId "${nodeId}". Call topology3d_context_read or topology3d_lens_summarize to find valid node ids.`);
    }

    state = normalizeState(artifact, { ...state, lensId: lensId ?? state.lensId, selectedNodeId: nodeId });
    return {
      state,
      node: nodePacket(nodeIndex, state.lensId),
      substrate: artifact.nodes[nodeIndex]?.substrate ?? null,
      atlas: atlasContextRead({ nodeId, includeStory: true, limit: 12 }),
      lensViews: lensViewsForNode(nodeIndex),
      adjacentEdges: adjacentEdges(nodeIndex),
      selected: nodeId
    };
  }

  function summarizeLens(lensId = state.lensId) {
    const lens = lensFor(lensId);
    return {
      lens: {
        id: lens.id,
        label: lens.label,
        groupLabel: lens.groupLabel,
        inferred: Boolean(lens.inferred),
        meaning: lens.meaning
      },
      groups: (lens.groups ?? []).map((group) => ({
        id: group.id,
        label: group.label,
        count: group.count,
        meaning: group.meaning,
        surfaceCounts: group.surfaceCounts,
        statusCounts: group.statusCounts
      })),
      counts: {
        nodes: artifact.nodes.length,
        edges: artifact.edges.length,
        groups: lens.groups?.length ?? 0
      }
    };
  }

  function explainGroup(options = {}) {
    const readState = normalizeStateForRead({
      lensId: options.lensId ?? state.lensId,
      groupId: options.groupId
    });
    if (!readState.groupId) throw new Error('topology3d_group_explain requires groupId.');

    const limit = Number.isFinite(options.limit) ? Math.max(1, Math.min(25, options.limit)) : 8;
    const lens = lensFor(readState.lensId);
    const group = (lens.groups ?? []).find((candidate) => candidate.id === readState.groupId);
    if (!group) throw new Error(`Unknown groupId "${readState.groupId}" for lens "${readState.lensId}".`);

    const lensInsight = artifact.insights?.lenses?.[readState.lensId] ?? null;
    const groupInsight = lensInsight?.groups?.find((candidate) => candidate.id === readState.groupId) ?? null;
    const nodeIndexes = artifact.nodes
      .map((node, index) => ({ node, index }))
      .filter((entry) => lensNodeView(entry.index, readState.lensId).groupId === readState.groupId);
    const nodeIndexSet = new Set(nodeIndexes.map((entry) => entry.index));
    const representativeNodes = (groupInsight?.classificationEvidence?.representativeNodes ?? nodeIndexes.map(({ node }) => node))
      .slice(0, limit)
      .map((node) => ({
        id: node.id,
        label: node.label,
        path: node.path,
        tier: node.tier,
        surface: node.surface,
        status: node.status
      }));

    const outbound = [];
    const inbound = [];
    for (const edge of artifact.edges) {
      if (edge.relation === 'contains') continue;
      const sourceInGroup = nodeIndexSet.has(edge.source);
      const targetInGroup = nodeIndexSet.has(edge.target);
      if (sourceInGroup === targetInGroup) continue;
      const sourceGroupId = lensNodeView(edge.source, readState.lensId).groupId;
      const targetGroupId = lensNodeView(edge.target, readState.lensId).groupId;
      const packet = {
        relation: edge.relation,
        source: artifact.nodes[edge.source]?.id,
        sourceLabel: artifact.nodes[edge.source]?.label,
        sourceGroupId,
        sourceGroupLabel: (lens.groups ?? []).find((candidate) => candidate.id === sourceGroupId)?.label ?? sourceGroupId,
        target: artifact.nodes[edge.target]?.id,
        targetLabel: artifact.nodes[edge.target]?.label,
        targetGroupId,
        targetGroupLabel: (lens.groups ?? []).find((candidate) => candidate.id === targetGroupId)?.label ?? targetGroupId,
        evidence: edge.evidence
      };
      if (sourceInGroup) outbound.push(packet);
      if (targetInGroup) inbound.push(packet);
    }

    const linkedImprovementCandidates = (artifact.insights?.improvementCandidates ?? []).filter(
      (candidate) =>
        candidate.lensId === readState.lensId &&
        Array.isArray(candidate.groupIds) &&
        candidate.groupIds.includes(readState.groupId)
    );
    const linkedCompletedImprovements = (artifact.insights?.completedImprovements ?? []).filter(
      (candidate) =>
        candidate.lensId === readState.lensId &&
        Array.isArray(candidate.groupIds) &&
        candidate.groupIds.includes(readState.groupId)
    );

    return {
      lens: {
        id: lens.id,
        label: lens.label,
        inferred: Boolean(lens.inferred),
        meaning: lens.meaning
      },
      group: {
        id: group.id,
        label: group.label,
        count: group.count,
        meaning: group.meaning,
        surfaceCounts: group.surfaceCounts,
        statusCounts: group.statusCounts,
        structuralCrossEdges: groupInsight?.structuralCrossEdges ?? null,
        inboundStructuralEdges: groupInsight?.inboundStructuralEdges ?? null,
        outboundStructuralEdges: groupInsight?.outboundStructuralEdges ?? null
      },
      classificationEvidence: groupInsight?.classificationEvidence ?? {
        dominantSurfaces: Object.entries(group.surfaceCounts ?? {})
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([surface, count]) => ({ surface, count })),
        representativeNodes
      },
      directionalLinks: {
        topLensLinks: (lensInsight?.directionalStructuralLinks ?? [])
          .filter((link) => link.source === readState.groupId || link.target === readState.groupId)
          .slice(0, limit),
        inbound: inbound.slice(0, limit),
        outbound: outbound.slice(0, limit)
      },
      representativeNodes,
      improvementCandidates: linkedImprovementCandidates,
      completedImprovements: linkedCompletedImprovements,
      caveat:
        'This explains repo-derived topology evidence. It is not an authoritative customer, revenue, roadmap, or production ownership source.'
    };
  }

  function atlasSessionSummary() {
    return {
      id: atlasSession.id ?? artifact.atlasCanvasId,
      client: atlasSession.client,
      workflow: atlasSession.workflow,
      owner: atlasSession.owner,
      createdAt: atlasSession.createdAt,
      updatedAt: atlasSession.updatedAt,
      topologyId: artifact.topologyId,
      atlasCanvasId: artifact.atlasCanvasId,
      nodes: atlasNodes.length,
      edges: atlasEdges.length,
      storySteps: atlasSession.story?.steps?.length ?? 0,
      observations: atlasSession.observations?.length ?? 0,
      proposals: atlasSession.proposals?.length ?? 0,
      suggestions: atlasSession.suggestions?.length ?? 0
    };
  }

  function atlasStoryRead(options = {}) {
    const limit = Number.isFinite(options.limit) ? Math.max(0, Math.min(100, options.limit)) : 40;
    const story = atlasSession.story ?? {};
    const steps = (story.steps ?? []).slice(0, limit).map((step) => ({
      ...step,
      focusTopologyNodeIds: (step.focusNodeIds ?? [])
        .map((atlasNodeId) => atlasNodeById.get(atlasNodeId)?.atlasId)
        .filter(Boolean)
    }));
    const activeStepId = options.stepId ?? story.activeStepId;
    const activeStep = steps.find((step) => step.id === activeStepId) ?? null;

    return {
      atlasSession: atlasSessionSummary(),
      story: {
        active: Boolean(story.active),
        activeStepId: story.activeStepId ?? null,
        title: story.title ?? null,
        narration: story.narration ?? null,
        nextAction: story.nextAction ?? null,
        dimUnfocused: Boolean(story.dimUnfocused),
        updatedAt: story.updatedAt ?? null,
        updatedBy: story.updatedBy ?? null
      },
      activeStep,
      steps,
      callouts: (story.callouts ?? []).slice(0, limit).map((callout) => ({
        ...callout,
        topologyNodeId: atlasNodeById.get(callout.nodeId)?.atlasId ?? null
      })),
      questions: (story.questions ?? []).slice(0, limit)
    };
  }

  function atlasContextRead(options = {}) {
    const limit = Number.isFinite(options.limit) ? Math.max(0, Math.min(100, options.limit)) : 40;
    let topologyEntry = options.nodeId ? topologyNodeById.get(options.nodeId) : null;
    let atlasNode = options.atlasNodeId ? atlasNodeById.get(options.atlasNodeId) : null;

    if (!atlasNode && topologyEntry) atlasNode = atlasNodeByTopologyId.get(topologyEntry.node.id) ?? null;
    if (!topologyEntry && atlasNode?.atlasId) topologyEntry = topologyNodeById.get(atlasNode.atlasId) ?? null;
    if (!topologyEntry && state.selectedNodeId) topologyEntry = topologyNodeById.get(state.selectedNodeId) ?? null;
    if (!atlasNode && topologyEntry) atlasNode = atlasNodeByTopologyId.get(topologyEntry.node.id) ?? null;

    if (options.nodeId && !topologyEntry) {
      throw new Error(`Unknown topology node id "${options.nodeId}".`);
    }
    if (options.atlasNodeId && !atlasNode) {
      throw new Error(`Unknown Atlas node id "${options.atlasNodeId}".`);
    }

    const joinedTopologyNode = topologyEntry ? nodePacket(topologyEntry.index, state.lensId) : null;
    const joinedAtlasNode = atlasNode ?? null;
    const adjacentAtlasEdges = joinedAtlasNode
      ? atlasEdges
          .filter((edge) => edge.source === joinedAtlasNode.id || edge.target === joinedAtlasNode.id)
          .slice(0, limit)
          .map((edge) => ({
            ...edge,
            sourceTopologyNodeId: atlasNodeById.get(edge.source)?.atlasId ?? null,
            targetTopologyNodeId: atlasNodeById.get(edge.target)?.atlasId ?? null
          }))
      : [];

    const story = options.includeStory === false
      ? null
      : atlasStoryForNode(joinedAtlasNode?.id, limit);

    return {
      atlasSession: atlasSessionSummary(),
      topologyNode: joinedTopologyNode,
      atlasNode: joinedAtlasNode,
      atlasEdges: adjacentAtlasEdges,
      story,
      joins: {
        topologyId: artifact.topologyId,
        atlasCanvasId: artifact.atlasCanvasId,
        topologyNodeId: joinedTopologyNode?.id ?? null,
        atlasNodeId: joinedAtlasNode?.id ?? null
      },
      boundary:
        'Read-only Atlas session context. Atlas writes, proposal action changes, and production write-back require the owning Atlas promotion workflow.'
    };
  }

  function atlasStoryForNode(atlasNodeId, limit) {
    if (!atlasNodeId) return atlasStoryRead({ limit });
    const story = atlasSession.story ?? {};
    const steps = (story.steps ?? [])
      .filter((step) => (step.focusNodeIds ?? []).includes(atlasNodeId))
      .slice(0, limit)
      .map((step) => ({
        ...step,
        focusTopologyNodeIds: (step.focusNodeIds ?? [])
          .map((id) => atlasNodeById.get(id)?.atlasId)
          .filter(Boolean)
      }));
    const callouts = (story.callouts ?? [])
      .filter((callout) => callout.nodeId === atlasNodeId)
      .slice(0, limit)
      .map((callout) => ({
        ...callout,
        topologyNodeId: atlasNodeById.get(callout.nodeId)?.atlasId ?? null
      }));

    return {
      activeStepId: story.activeStepId ?? null,
      steps,
      callouts,
      questions: (story.questions ?? []).slice(0, limit)
    };
  }

  function clientOverlayContextRead(options = {}) {
    let topologyEntry = options.nodeId ? topologyNodeById.get(options.nodeId) : null;
    if (options.nodeId && !topologyEntry) throw new Error(`Unknown topology node id "${options.nodeId}".`);
    if (!topologyEntry && state.selectedNodeId) topologyEntry = topologyNodeById.get(state.selectedNodeId) ?? null;

    const node = topologyEntry?.node ?? null;
    const key = options.clientSlug ?? node?.clientOverlay?.clientSlug ?? node?.clientSlug;
    if (!key) {
      throw new Error('topology3d_client_overlay_context_read requires clientSlug or a selected client topology node.');
    }

    const overlay = clientOverlayByKey.get(key) ?? clientOverlayByKey.get(slug(String(key)));
    if (!overlay) throw new Error(`Unknown client overlay "${key}".`);

    const overlaySlug = slug(overlay.clientSlug);
    const selectedNode = topologyEntry ? nodePacket(topologyEntry.index, state.lensId) : null;
    return {
      clientOverlay: overlay,
      selectedNode,
      handoff: {
        topologyId: artifact.topologyId,
        atlasCanvasId: artifact.atlasCanvasId,
        clientSlug: overlay.clientSlug,
        clientOverlayApiPath: `/api/substrate/client-overlays/${overlaySlug}`,
        clientOverlayMcpUri: `substrate://client-overlays/${overlaySlug}`,
        clientOverlayAgentCommand: 'databaseLayer.clientOverlays.get',
        clientOverlayTopology3dResourceUri: `topology3d://create-something/internal/client-overlay/${overlaySlug}`,
        clientOverlayAtlasCanvasId: overlay.atlasCanvasId,
        selectedNodeId: selectedNode?.id ?? null,
        selectedPath: selectedNode?.path ?? null,
        packageCount: overlay.packages.length,
        receiptCount: overlay.receipts.length,
        nextActionCount: overlay.nextActions.length
      },
      boundary:
        'Read-only client overlay context. Client system writes, Atlas write-back, Cloudflare changes, and production promotion require the owning approval workflow.'
    };
  }

  function selectionExport(options = {}) {
    const snapshot = contextSnapshot(options);
    return {
      state: snapshot.state,
      selectedNode: snapshot.selectedNode,
      visibleNodes: snapshot.nodes,
      visibleEdges: snapshot.edges,
      substrate: snapshot.selectedNode?.substrate ?? null,
      clientOverlay: snapshot.selectedNode?.clientOverlay ?? null,
      handoff: {
        topologyId: artifact.topologyId,
        atlasCanvasId: artifact.atlasCanvasId,
        lensId: snapshot.state.lensId,
        groupId: snapshot.state.groupId,
        substrateRecordId: snapshot.selectedNode?.substrate?.recordId ?? snapshot.state.selectedNodeId,
        substrateApiPath: snapshot.selectedNode?.substrate?.apiPath ?? null,
        substrateMcpUri: snapshot.selectedNode?.substrate?.mcpUri ?? null,
        substrateAgentCommand: snapshot.selectedNode?.substrate?.agentCommand ?? null,
        receiptId: snapshot.selectedNode?.substrate?.receiptId ?? null,
        actionId: snapshot.selectedNode?.substrate?.actionId ?? null,
        operatingSliceId: snapshot.selectedNode?.substrate?.operatingSliceId ?? null,
        readinessApiPath: snapshot.selectedNode?.substrate?.readinessApiPath ?? null,
        clientOverlaySlug: snapshot.selectedNode?.clientOverlay?.clientSlug ?? null,
        clientOverlayApiPath: snapshot.selectedNode?.clientOverlay?.apiPath ?? null,
        clientOverlayMcpUri: snapshot.selectedNode?.clientOverlay?.mcpUri ?? null,
        clientOverlayAgentCommand: snapshot.selectedNode?.clientOverlay?.agentCommand ?? null,
        clientOverlayTopology3dResourceUri: snapshot.selectedNode?.clientOverlay?.topology3dResourceUri ?? null,
        selectedNodeId: snapshot.state.selectedNodeId,
        selectedAtlasNodeId: snapshot.selectedNode?.atlas?.atlasNodeId ?? null,
        selectedPath: snapshot.selectedNode?.path ?? null,
        selectedGroup: snapshot.selectedNode?.group?.label ?? null,
        visibleNodeCount: snapshot.counts.visibleNodes,
        visibleEdgeCount: snapshot.counts.visibleEdges,
        meaning: snapshot.selectedNode?.group?.meaning ?? snapshot.lens.meaning
      }
    };
  }

  function readResource(uri) {
    if (uri === 'topology3d://create-something/internal/artifact') return artifact;
    if (uri === 'topology3d://create-something/internal/lenses') {
      return Object.fromEntries(Object.keys(artifact.lenses ?? {}).map((lensId) => [lensId, summarizeLens(lensId)]));
    }
    if (uri === 'topology3d://create-something/internal/state') return state;
    if (uri === 'topology3d://create-something/internal/context') return contextSnapshot();
    if (uri === 'topology3d://create-something/internal/insights') return insightsRead();
    if (uri === 'topology3d://create-something/internal/atlas-session') return atlasSession;
    if (uri === 'topology3d://create-something/internal/atlas-story') return atlasStoryRead();
    if (uri === 'topology3d://create-something/internal/client-overlays') {
      return {
        id: clientOverlayCoverage.id,
        topologyId: artifact.topologyId,
        atlasCanvasId: artifact.atlasCanvasId,
        overlays: (clientOverlayCoverage.overlays ?? []).map(clientOverlaySummary)
      };
    }

    const clientOverlayPrefix = 'topology3d://create-something/internal/client-overlay/';
    if (uri.startsWith(clientOverlayPrefix)) {
      const clientSlug = decodeURIComponent(uri.slice(clientOverlayPrefix.length));
      return clientOverlayContextRead({ clientSlug });
    }

    const atlasNodePrefix = 'topology3d://create-something/internal/atlas-node/';
    if (uri.startsWith(atlasNodePrefix)) {
      const atlasNodeId = decodeURIComponent(uri.slice(atlasNodePrefix.length));
      return atlasContextRead({ atlasNodeId, includeStory: true });
    }

    const nodePrefix = 'topology3d://create-something/internal/node/';
    if (uri.startsWith(nodePrefix)) {
      const nodeId = decodeURIComponent(uri.slice(nodePrefix.length));
      const nodeIndex = artifact.nodes.findIndex((node) => node.id === nodeId);
      if (nodeIndex < 0) {
        throw new Error(`Unknown node resource "${nodeId}".`);
      }
      return {
        node: nodePacket(nodeIndex, state.lensId),
        lensViews: lensViewsForNode(nodeIndex),
        adjacentEdges: adjacentEdges(nodeIndex)
      };
    }

    throw new Error(`Unknown topology resource "${uri}". Use resources/list for available URI templates.`);
  }

  function callTool(name, args = {}) {
    if (name === 'topology3d_context_read') return contextSnapshot(args);
    if (name === 'topology3d_context_set') return setViewState(args);
    if (name === 'topology3d_node_focus') return focusNode(args.nodeId, args.lensId);
    if (name === 'topology3d_lens_summarize') return summarizeLens(args.lensId);
    if (name === 'topology3d_selection_export') return selectionExport(args);
    if (name === 'topology3d_insights_read') return insightsRead(args);
    if (name === 'topology3d_group_explain') return explainGroup(args);
    if (name === 'topology3d_atlas_context_read') return atlasContextRead(args);
    if (name === 'topology3d_atlas_story_read') return atlasStoryRead(args);
    if (name === 'topology3d_client_overlay_context_read') return clientOverlayContextRead(args);
    throw new Error(`Unknown tool "${name}". Use tools/list for available topology3d tools.`);
  }

  function lensViewsForNode(nodeIndex) {
    return Object.fromEntries(
      Object.entries(artifact.lenses ?? {}).map(([id, lens]) => {
        const groupId = lens.nodes?.[nodeIndex]?.groupId ?? artifact.nodes[nodeIndex].clusterId;
        return [
          id,
          {
            groupId,
            groupLabel: (lens.groups ?? []).find((group) => group.id === groupId)?.label ?? null
          }
        ];
      })
    );
  }

  function toolsList() {
    return (artifact.contextApi?.tools ?? []).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: TOOL_INPUT_SCHEMAS[tool.name] ?? { type: 'object', additionalProperties: true },
      annotations: {
        readOnlyHint: tool.kind === 'read',
        destructiveHint: false,
        idempotentHint: tool.kind === 'read',
        openWorldHint: false
      }
    }));
  }

  function resourcesList() {
    return (artifact.contextApi?.resources ?? []).map((resource) => ({
      uri: resource.uri,
      name: resource.uri.replace('topology3d://create-something/internal/', ''),
      description: resource.description,
      mimeType: 'application/json'
    }));
  }

  return {
    artifact,
    atlasSession,
    get state() {
      return state;
    },
    contextSnapshot,
    focusNode,
    explainGroup,
    atlasContextRead,
    atlasStoryRead,
    clientOverlayContextRead,
    insightsRead,
    readResource,
    resourcesList,
    selectionExport,
    setViewState,
    summarizeLens,
    toolsList,
    callTool
  };
}

function clientOverlaySummary(overlay) {
  const overlaySlug = slug(overlay.clientSlug);
  return {
    clientSlug: overlay.clientSlug,
    slug: overlaySlug,
    recordId: overlay.recordId,
    atlasCanvasId: overlay.atlasCanvasId,
    title: overlay.title,
    owner: overlay.owner,
    status: overlay.status,
    packageCount: overlay.packages.length,
    apiPath: `/api/substrate/client-overlays/${overlaySlug}`,
    mcpUri: `substrate://client-overlays/${overlaySlug}`,
    agentCommand: 'databaseLayer.clientOverlays.get',
    topology3dResourceUri: `topology3d://create-something/internal/client-overlay/${overlaySlug}`
  };
}

function buildClientOverlayIndex(overlays) {
  const index = new Map();
  for (const overlay of overlays) {
    index.set(overlay.clientSlug, overlay);
    index.set(slug(overlay.clientSlug), overlay);
    index.set(overlay.recordId, overlay);
    index.set(slug(overlay.recordId), overlay);
    index.set(overlay.atlasCanvasId, overlay);
    index.set(slug(overlay.atlasCanvasId), overlay);
    for (const pkg of overlay.packages ?? []) {
      index.set(pkg.recordId, overlay);
      index.set(slug(pkg.recordId), overlay);
      index.set(pkg.atlasNodeId, overlay);
      index.set(slug(pkg.atlasNodeId), overlay);
      index.set(pkg.path, overlay);
      index.set(slug(pkg.path), overlay);
    }
  }
  return index;
}

export function createJsonRpcHandler(runtime = createTopology3dRuntime()) {
  return async function handleJsonRpc(message) {
    const { id, method, params = {} } = message;
    try {
      if (method === 'initialize') {
        return result(id, {
          protocolVersion: params.protocolVersion ?? '2024-11-05',
          capabilities: {
            resources: {},
            tools: {}
          },
          serverInfo: {
            name: '@create-something/database-layer/topology3d',
            version: '0.1.0'
          }
        });
      }

      if (method === 'notifications/initialized') return null;

      if (method === 'resources/list') return result(id, { resources: runtime.resourcesList() });

      if (method === 'resources/read') {
        const uri = params.uri;
        if (!uri) throw new Error('resources/read requires params.uri.');
        const value = runtime.readResource(uri);
        return result(id, {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(value, null, 2)
            }
          ]
        });
      }

      if (method === 'tools/list') return result(id, { tools: runtime.toolsList() });

      if (method === 'tools/call') {
        const value = runtime.callTool(params.name, params.arguments ?? {});
        return result(id, {
          content: [
            {
              type: 'text',
              text: JSON.stringify(value, null, 2)
            }
          ],
          structuredContent: value
        });
      }

      throw new Error(`Unsupported MCP method "${method}".`);
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32000,
          message: error instanceof Error ? error.message : String(error)
        }
      };
    }
  };
}

export function encodeMcpFrame(message) {
  const body = JSON.stringify(message);
  return `Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n${body}`;
}

export function createMcpFrameParser(onMessage) {
  let buffer = Buffer.alloc(0);

  return function push(chunk) {
    buffer = Buffer.concat([buffer, Buffer.from(chunk)]);

    while (buffer.length > 0) {
      const headerEnd = buffer.indexOf('\r\n\r\n');
      if (headerEnd >= 0) {
        const header = buffer.slice(0, headerEnd).toString('utf8');
        const match = /^Content-Length:\s*(\d+)$/im.exec(header);
        if (!match) throw new Error('Invalid MCP frame: missing Content-Length header.');
        const length = Number(match[1]);
        const bodyStart = headerEnd + 4;
        if (buffer.length < bodyStart + length) return;
        const body = buffer.slice(bodyStart, bodyStart + length).toString('utf8');
        buffer = buffer.slice(bodyStart + length);
        onMessage(JSON.parse(body));
        continue;
      }

      const newline = buffer.indexOf('\n');
      if (newline < 0) return;
      const line = buffer.slice(0, newline).toString('utf8').trim();
      buffer = buffer.slice(newline + 1);
      if (line) onMessage(JSON.parse(line));
    }
  };
}

function normalizeState(artifact, state) {
  const next = {
    lensId: state.lensId ?? DEFAULT_STATE.lensId,
    groupId: state.groupId || null,
    status: state.status ?? DEFAULT_STATE.status,
    tier: state.tier ?? DEFAULT_STATE.tier,
    edgeMode: state.edgeMode ?? DEFAULT_STATE.edgeMode,
    search: state.search ?? DEFAULT_STATE.search,
    selectedNodeId: state.selectedNodeId ?? DEFAULT_STATE.selectedNodeId
  };

  if (!artifact.lenses?.[next.lensId]) {
    throw new Error(`Unknown lensId "${next.lensId}". Use one of: ${Object.keys(artifact.lenses ?? {}).join(', ')}.`);
  }

  if (!VALID_STATUS.has(next.status)) {
    throw new Error(`Unknown status "${next.status}". Use mapped, needs_atlas, needs_substrate, or an empty string.`);
  }

  if (!VALID_TIER.has(next.tier)) {
    throw new Error(`Unknown tier "${next.tier}". Use Database, Automation, Judgment, Mixed, or an empty string.`);
  }

  if (!VALID_EDGE_MODE.has(next.edgeMode)) {
    throw new Error(`Unknown edgeMode "${next.edgeMode}". Use operational, structural, all, or contains.`);
  }

  const lens = artifact.lenses[next.lensId];
  if (next.groupId && !(lens.groups ?? []).some((group) => group.id === next.groupId)) {
    throw new Error(`Unknown groupId "${next.groupId}" for lens "${next.lensId}".`);
  }

  if (next.selectedNodeId && !artifact.nodes.some((node) => node.id === next.selectedNodeId)) {
    throw new Error(`Unknown selectedNodeId "${next.selectedNodeId}".`);
  }

  return next;
}

function compactUndefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}

function result(id, value) {
  return {
    jsonrpc: '2.0',
    id,
    result: value
  };
}

async function runStdio() {
  const runtime = createTopology3dRuntime();
  const handleJsonRpc = createJsonRpcHandler(runtime);
  const parser = createMcpFrameParser(async (message) => {
    const response = await handleJsonRpc(message);
    if (response) process.stdout.write(encodeMcpFrame(response));
  });

  process.stdin.on('data', (chunk) => {
    try {
      parser(chunk);
    } catch (error) {
      const response = {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32700,
          message: error instanceof Error ? error.message : String(error)
        }
      };
      process.stdout.write(encodeMcpFrame(response));
    }
  });
}

if (process.argv[1] === __filename) {
  runStdio();
}
