import type {
  DatabaseLayerEdgeRequest,
  DatabaseLayerEdgeResponse,
  DatabaseLayerApiResponse,
  DatabaseLayerClientOverlay,
  DatabaseLayerInternalTopology,
  DatabaseLayerManagementApiState,
  DatabaseLayerManagementSurface,
  DatabaseLayerOperatingSlice,
  DatabaseLayerOperatingSliceReadinessItem,
  DatabaseLayerTopologyNode,
  DatabaseLayerWorkflowAction,
  DatabaseLayerReceipt,
  DatabaseLayerWorkerResponseFactory
} from './types.js';
import { projectTopologyToSharedCanvasState } from './topology.js';
import { projectTopologyToSubstrateComputeSnapshot } from './topology.js';

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8'
};

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/^@/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function json<T>(status: DatabaseLayerApiResponse<T>['status'], body: T): DatabaseLayerApiResponse<T> {
  return { status, headers: JSON_HEADERS, body };
}

function jsonRpcResult(id: unknown, result: unknown) {
  return { jsonrpc: '2.0', id: id ?? null, result };
}

function jsonRpcError(id: unknown, code: number, message: string, data?: unknown) {
  return {
    jsonrpc: '2.0',
    id: id ?? null,
    error: {
      code,
      message,
      ...(data === undefined ? {} : { data })
    }
  };
}

function pathFromUrl(urlOrPath: string): string {
  if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
    const withoutProtocol = urlOrPath.replace(/^https?:\/\/[^/]+/, '');
    const pathOnly = withoutProtocol.split(/[?#]/, 1)[0];
    return pathOnly || '/';
  }
  return urlOrPath.split(/[?#]/, 1)[0] || '/';
}

function normalizePath(urlOrPath: string): string {
  const pathname = pathFromUrl(urlOrPath);
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1);
  return pathname;
}

function searchParamsFromUrl(urlOrPath: string): Record<string, string> {
  const query = (urlOrPath.split('?', 2)[1] ?? '').split('#', 1)[0] ?? '';
  const params: Record<string, string> = {};
  for (const part of query.split('&')) {
    if (!part) continue;
    const [rawKey, rawValue = ''] = part.split('=', 2);
    const key = decodeURIComponent(rawKey.replace(/\+/g, ' '));
    params[key] = decodeURIComponent(rawValue.replace(/\+/g, ' '));
  }
  return params;
}

function bySliceKey<T extends { sliceId?: string; id?: string }>(items: T[]): Map<string, T> {
  const index = new Map<string, T>();
  for (const item of items) {
    const id = item.sliceId ?? item.id;
    if (!id) continue;
    index.set(id, item);
    index.set(slug(id), item);
  }
  return index;
}

function byTopologyNodeKey(nodes: DatabaseLayerTopologyNode[]): Map<string, DatabaseLayerTopologyNode> {
  const index = new Map<string, DatabaseLayerTopologyNode>();
  for (const node of nodes) {
    index.set(node.id, node);
    index.set(slug(node.id), node);
    index.set(node.atlasNodeId, node);
    index.set(slug(node.atlasNodeId), node);
  }
  return index;
}

function byClientOverlayKey(overlays: DatabaseLayerClientOverlay[] = []): Map<string, DatabaseLayerClientOverlay> {
  const index = new Map<string, DatabaseLayerClientOverlay>();
  for (const overlay of overlays) {
    index.set(overlay.clientSlug, overlay);
    index.set(slug(overlay.clientSlug), overlay);
    index.set(overlay.recordId, overlay);
    index.set(slug(overlay.recordId), overlay);
    index.set(overlay.atlasCanvasId, overlay);
    index.set(slug(overlay.atlasCanvasId), overlay);
    for (const pkg of overlay.packages) {
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

function topologySummary(topology: DatabaseLayerInternalTopology) {
  return {
    id: topology.id,
    title: topology.title,
    atlasCanvasId: topology.atlasCanvasId,
    nodes: topology.nodes.length,
    edges: topology.edges.length,
    coverage: topology.coverage
  };
}

function topologyRecordSummary(node: DatabaseLayerTopologyNode) {
  const recordSlug = slug(node.id);
  return {
    id: node.id,
    slug: recordSlug,
    atlasNodeId: node.atlasNodeId,
    title: node.title,
    path: node.path,
    tier: node.tier,
    surface: node.surface,
    owner: node.owner,
    status: node.status,
    clientSlug: node.clientSlug,
    apiPath: `/api/substrate/topology/internal/records/${recordSlug}`,
    mcpUri: `substrate://topology/internal/records/${recordSlug}`,
    agentCommand: 'databaseLayer.topology.records.get'
  };
}

function topologyRecordSearchText(node: DatabaseLayerTopologyNode): string {
  return [
    node.id,
    node.atlasNodeId,
    node.title,
    node.path,
    node.tier,
    node.surface,
    node.owner,
    node.status,
    node.summary,
    node.packageName,
    node.runtime,
    node.clientSlug,
    ...(node.tags ?? [])
  ]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .join(' ')
    .toLowerCase();
}

function compactTopologyEdges(edges: DatabaseLayerInternalTopology['edges']) {
  return edges.slice(0, 50);
}

function facetEntries(values: Array<string | undefined>) {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

function objectRecords(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object') : [];
}

function receiptTimestamp(receipt: DatabaseLayerReceipt | Record<string, unknown>): string {
  const createdAt = 'createdAt' in receipt ? receipt.createdAt : undefined;
  const attachedAt = 'attachedAt' in receipt ? receipt.attachedAt : undefined;
  return typeof createdAt === 'string' ? createdAt : typeof attachedAt === 'string' ? attachedAt : '';
}

function coverageRecords(value: unknown): Record<string, unknown>[] {
  return objectRecords((value as { records?: unknown } | undefined)?.records);
}

function stringField(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function numberField(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function parseBoundedNumber(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number.parseFloat(value ?? '');
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(parsed, max));
}

function parseOptionalBoundedNumber(value: string | undefined, min: number, max: number): number | undefined {
  const parsed = Number.parseFloat(value ?? '');
  if (!Number.isFinite(parsed)) return undefined;
  return Math.max(min, Math.min(parsed, max));
}

function operationPathMatcher(apiPath: string) {
  const names: string[] = [];
  const pattern = apiPath
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\\\{([^}]+)\\\}/g, (_match, name: string) => {
      names.push(name);
      return '([^/]+)';
    });
  return {
    apiPath,
    names,
    re: new RegExp(`^${pattern}$`)
  };
}

function sliceSummary(slice: DatabaseLayerOperatingSlice, readiness?: DatabaseLayerOperatingSliceReadinessItem) {
  return {
    id: slice.id,
    slug: slug(slice.id),
    title: slice.title,
    status: slice.status,
    productionStatus: readiness?.productionStatus,
    tier: slice.tier,
    surface: slice.surface,
    owner: slice.owner,
    recordCount: slice.recordIds.length,
    nodeCount: slice.nodeCount,
    apiPath: `/api/substrate/operating-slices/${slug(slice.id)}`,
    readinessApiPath: `/api/substrate/operating-slices/${slug(slice.id)}/readiness`
  };
}

function clientOverlaySummary(overlay: DatabaseLayerClientOverlay) {
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
    atlasNodeCount: overlay.atlasNodes.length,
    substrateRecordCount: overlay.substrateRecords.length,
    receiptCount: overlay.receipts.length,
    nextActionCount: overlay.nextActions.length,
    apiPath: `/api/substrate/client-overlays/${overlaySlug}`,
    mcpUri: `substrate://client-overlays/${overlaySlug}`,
    agentCommand: 'databaseLayer.clientOverlays.get'
  };
}

export function createDatabaseLayerManagementApi(state: DatabaseLayerManagementApiState) {
  const sliceByKey = bySliceKey(state.operatingSliceReview.slices);
  const readinessByKey = bySliceKey(state.operatingSliceReadiness.items);
  const topologyNodeByKey = byTopologyNodeKey(state.topology.nodes);
  const clientOverlayByKey = byClientOverlayKey(state.clientOverlayCoverage?.overlays);
  const resourceByUri = new Map(state.managementSurface.resources.map((resource) => [resource.mcpUri, resource]));
  const resourceByRecordId = new Map(
    state.managementSurface.resources
      .filter((resource) => resource.recordId)
      .map((resource) => [resource.recordId as string, resource])
  );

  function getOperatingSlice(key: string): DatabaseLayerOperatingSlice | undefined {
    return sliceByKey.get(decodeURIComponent(key));
  }

  function getOperatingSliceReadiness(key: string): DatabaseLayerOperatingSliceReadinessItem | undefined {
    return readinessByKey.get(decodeURIComponent(key));
  }

  function listOperatingSlices() {
    return state.operatingSliceReview.slices.map((slice) =>
      sliceSummary(slice, getOperatingSliceReadiness(slice.id))
    );
  }

  function listClientOverlays() {
    return (state.clientOverlayCoverage?.overlays ?? []).map(clientOverlaySummary);
  }

  function getClientOverlay(key: string): DatabaseLayerClientOverlay | undefined {
    return clientOverlayByKey.get(decodeURIComponent(key));
  }

  function getTopologyRecord(key: string): DatabaseLayerTopologyNode | undefined {
    return topologyNodeByKey.get(decodeURIComponent(key));
  }

  function listTopologyRecords() {
    return state.topology.nodes.map(topologyRecordSummary);
  }

  function atlasSessionCanvas() {
    return (state.atlasSession as { canvas?: { nodes?: Record<string, unknown>[]; edges?: Record<string, unknown>[] } } | undefined)
      ?.canvas;
  }

  function getAtlasSessionNode(node: DatabaseLayerTopologyNode) {
    const canvas = atlasSessionCanvas();
    return canvas?.nodes?.find(
      (candidate) =>
        candidate.id === node.atlasNodeId ||
        candidate.atlasId === node.id ||
        candidate.sourceRecordId === node.id
    );
  }

  function getAtlasSessionEdges(atlasNodeId: string) {
    const edges = atlasSessionCanvas()?.edges ?? [];
    return {
      incoming: edges.filter((edge) => edge.target === atlasNodeId).slice(0, 50),
      outgoing: edges.filter((edge) => edge.source === atlasNodeId).slice(0, 50),
      incomingCount: edges.filter((edge) => edge.target === atlasNodeId).length,
      outgoingCount: edges.filter((edge) => edge.source === atlasNodeId).length
    };
  }

  function activeAtlasSessionId() {
    return (state.atlasSession as { id?: string } | undefined)?.id ?? state.topology.atlasCanvasId;
  }

  function atlasViewport(args: Record<string, string> = {}) {
    const sessionId = args.sessionId?.trim() || activeAtlasSessionId();
    if (sessionId !== activeAtlasSessionId()) return undefined;
    const nodes = objectRecords(atlasSessionCanvas()?.nodes);
    const edges = objectRecords(atlasSessionCanvas()?.edges);
    const minX = Math.min(...nodes.map((node) => numberField(node, 'x') ?? 0));
    const minY = Math.min(...nodes.map((node) => numberField(node, 'y') ?? 0));
    const x = parseBoundedNumber(args.x, Number.isFinite(minX) ? minX : 0, -1_000_000, 1_000_000);
    const y = parseBoundedNumber(args.y, Number.isFinite(minY) ? minY : 0, -1_000_000, 1_000_000);
    const width = parseBoundedNumber(args.width, 1200, 1, 100_000);
    const height = parseBoundedNumber(args.height, 800, 1, 100_000);
    const zoom = parseBoundedNumber(args.zoom, 1, 0.05, 8);
    const parsedLimit = Number.parseInt(args.limit ?? '', 10);
    const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(parsedLimit, 250)) : 100;
    const right = x + width;
    const bottom = y + height;
    const visibleCandidates = nodes.filter((node) => {
      const nodeX = numberField(node, 'x') ?? 0;
      const nodeY = numberField(node, 'y') ?? 0;
      const nodeWidth = numberField(node, 'width') ?? 180;
      const nodeHeight = numberField(node, 'height') ?? 96;
      return nodeX + nodeWidth >= x && nodeX <= right && nodeY + nodeHeight >= y && nodeY <= bottom;
    });
    const visibleNodes = visibleCandidates.slice(0, limit);
    const visibleNodeIds = new Set(visibleNodes.map((node) => stringField(node, 'id')).filter((id): id is string => Boolean(id)));
    const visibleEdges = edges.filter((edge) => {
      const source = stringField(edge, 'source');
      const target = stringField(edge, 'target');
      return Boolean(source && target && visibleNodeIds.has(source) && visibleNodeIds.has(target));
    });
    const lod = zoom >= 0.85 ? 'detail' : zoom >= 0.35 ? 'compact' : 'skeleton';

    return {
      id: `${state.managementSurface.id}:atlas-viewport:${sessionId}`,
      topologyId: state.topology.id,
      atlasCanvasId: state.topology.atlasCanvasId,
      sessionId,
      viewport: { x, y, width, height, zoom, limit },
      rendering: {
        lod,
        strategy: 'bounded_canvas_window',
        nodeBudget: limit,
        edgePolicy: 'visible_nodes_only'
      },
      summary: {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        candidateNodes: visibleCandidates.length,
        visibleNodes: visibleNodes.length,
        visibleEdges: visibleEdges.length,
        omittedNodes: Math.max(0, visibleCandidates.length - visibleNodes.length),
        density: visibleNodes.length / Math.max(1, width * height)
      },
      nodes: visibleNodes.map((node) => {
        const record = getTopologyRecord(stringField(node, 'atlasId') ?? stringField(node, 'sourceRecordId') ?? '');
        return {
          id: stringField(node, 'id') ?? '',
          atlasId: stringField(node, 'atlasId') ?? stringField(node, 'sourceRecordId'),
          label: stringField(node, 'label') ?? '',
          kind: stringField(node, 'kind') ?? 'system',
          status: stringField(node, 'status') ?? 'unknown',
          x: numberField(node, 'x') ?? 0,
          y: numberField(node, 'y') ?? 0,
          width: numberField(node, 'width') ?? 180,
          height: numberField(node, 'height') ?? 96,
          record: record ? topologyRecordSummary(record) : undefined
        };
      }),
      edges: visibleEdges.map((edge) => ({
        id: stringField(edge, 'id') ?? '',
        source: stringField(edge, 'source') ?? '',
        target: stringField(edge, 'target') ?? '',
        label: stringField(edge, 'label') ?? '',
        evidence: stringField(edge, 'evidence') ?? ''
      })),
      endpoints: {
        fullSession: `/api/substrate/atlas-sessions/${encodeURIComponent(sessionId)}`,
        workbench: '/api/substrate/workbench',
        query: '/api/substrate/query'
      }
    };
  }

  function sharedCanvasState(args: Record<string, string> = {}) {
    const sessionId = args.sessionId?.trim() || activeAtlasSessionId();
    if (sessionId !== activeAtlasSessionId()) return undefined;
    const story = (state.atlasSession as {
      story?: {
        activeStepId?: string;
        focusNodeIds?: unknown;
      };
    } | undefined)?.story;
    const focusedNodeIds = Array.isArray(story?.focusNodeIds)
      ? story.focusNodeIds.filter((id): id is string => typeof id === 'string')
      : [];

    return projectTopologyToSharedCanvasState(state.topology, {
      sessionId,
      source: state.atlasSession ? 'atlas-session' : 'substrate',
      renderer: 'canvas-kernel',
      lens: args.lens || 'all',
      query: args.q ?? args.query ?? '',
      storyStepId: typeof story?.activeStepId === 'string' ? story.activeStepId : null,
      selectedNodeId: args.selectedNodeId || null,
      focusedNodeIds,
      viewport: {
        x: parseOptionalBoundedNumber(args.x, -1_000_000, 1_000_000),
        y: parseOptionalBoundedNumber(args.y, -1_000_000, 1_000_000),
        width: parseOptionalBoundedNumber(args.width, 1, 100_000),
        height: parseOptionalBoundedNumber(args.height, 1, 100_000),
        zoom: parseOptionalBoundedNumber(args.zoom, 0.05, 8),
        limit: parseOptionalBoundedNumber(args.limit, 1, 500)
      }
    });
  }

  function computeSnapshot(args: Record<string, string> = {}) {
    const sessionId = args.sessionId?.trim() || activeAtlasSessionId();
    if (sessionId !== activeAtlasSessionId()) return undefined;
    const sourceNodeId = args.sourceNodeId ? getTopologyRecord(args.sourceNodeId)?.id ?? args.sourceNodeId : undefined;
    return projectTopologyToSubstrateComputeSnapshot(state.topology, {
      sessionId,
      source: state.atlasSession ? 'atlas-session' : 'substrate',
      limit: parseOptionalBoundedNumber(args.limit, 1, 100),
      scenario: {
        id: args.scenario ? `${state.topology.id}:scenario:${slug(args.scenario)}` : undefined,
        kind: 'impact',
        sourceNodeId,
        maxDepth: parseOptionalBoundedNumber(args.maxDepth, 1, 8),
        description: args.scenario
          ? `Read-only Substrate compute preview for ${args.scenario}.`
          : undefined
      }
    });
  }

  function workflowActionsForRecord(node: DatabaseLayerTopologyNode) {
    if (node.status === 'mapped') return [];
    return [
      {
        id: `action:${node.status}:${node.id}`,
        recordId: node.id,
        state: node.status === 'needs_atlas' ? 'wait' : 'stop',
        title:
          node.status === 'needs_atlas'
            ? `Attach Atlas binding for ${node.title}`
            : `Create Substrate record for ${node.title}`,
        owner: node.owner,
        policy: 'Root topology review before external writes',
        detail:
          node.status === 'needs_atlas'
            ? 'Record exists in Substrate topology and needs a durable Atlas projection.'
            : 'Topology item needs a canonical Substrate record before API/MCP/agent workflow management.'
      }
    ];
  }

  function actionWithContext(
    action: DatabaseLayerWorkflowAction,
    sourceKind: string,
    sourcePath: string,
    apiPath?: string
  ) {
    const record = topologyNodeByKey.get(action.recordId);
    return {
      ...action,
      sourceKind,
      sourcePath,
      apiPath,
      record: record ? topologyRecordSummary(record) : undefined,
      recordContextApiPath: record ? `/api/substrate/topology/internal/records/${slug(record.id)}/context` : undefined
    };
  }

  function workflowQueueActions() {
    const topologyGapActions = state.topology.nodes
      .flatMap((node) => workflowActionsForRecord(node))
      .map((action) => actionWithContext(action as DatabaseLayerWorkflowAction, 'topology_gap', 'packages/database-layer/data/create-something-internal-topology.json'));
    const operatingSliceActions = state.operatingSliceReadiness.items.map((item) =>
      actionWithContext(
        {
          id: `action:operating-slice-review:${item.sliceId}`,
          recordId: item.sliceId,
          state: item.productionStatus === 'blocked' ? 'stop' : 'wait',
          title: `Review ${item.title} for production workflow use`,
          owner: item.owner,
          policy: 'Operating slice promotion review before production writes',
          detail: item.nextAction
        },
        'operating_slice',
        'packages/database-layer/data/create-something-operating-slice-readiness.json',
        `/api/substrate/operating-slices/${slug(item.sliceId)}/readiness`
      )
    );
    const clientOverlayActions = (state.clientOverlayCoverage?.overlays ?? [])
      .flatMap((overlay) => overlay.nextActions)
      .map((action) =>
        actionWithContext(
          action,
          'client_overlay',
          'packages/database-layer/data/create-something-client-overlay-coverage.json',
          `/api/substrate/client-overlays/${slug(action.recordId)}`
        )
      );
    const runtimeActions = coverageRecords(state.runtimeBindingCoverage)
      .map((record) => record.reviewAction)
      .filter((action): action is DatabaseLayerWorkflowAction => Boolean(action) && typeof action === 'object')
      .map((action) =>
        actionWithContext(
          action,
          'runtime_binding',
          'packages/database-layer/data/create-something-runtime-binding-coverage.json',
          action.recordId ? `/api/substrate/topology/internal/records/${slug(action.recordId)}/context` : undefined
        )
      );
    const agentConfigActions = coverageRecords(state.agentConfigCoverage)
      .map((record) => record.reviewAction)
      .filter((action): action is DatabaseLayerWorkflowAction => Boolean(action) && typeof action === 'object')
      .map((action) =>
        actionWithContext(
          action,
          'agent_config',
          'packages/database-layer/data/create-something-agent-config-coverage.json',
          action.recordId ? `/api/substrate/topology/internal/records/${slug(action.recordId)}/context` : undefined
        )
      );

    return [
      ...operatingSliceActions,
      ...clientOverlayActions,
      ...runtimeActions,
      ...agentConfigActions,
      ...topologyGapActions
    ].sort((a, b) => a.sourceKind.localeCompare(b.sourceKind) || a.title.localeCompare(b.title));
  }

  function receiptLedgerEntry(
    receiptLike: DatabaseLayerReceipt | Record<string, unknown>,
    sourceKind: string,
    sourcePath: string,
    fallbackRecordId?: string
  ) {
    const receipt = receiptLike as Record<string, unknown>;
    const selectedRecord = getTopologyRecord(stringField(receipt, 'recordId') ?? fallbackRecordId ?? '');
    const recordId = selectedRecord?.id ?? stringField(receipt, 'recordId') ?? fallbackRecordId ?? '';
    const productId = stringField(receipt, 'productId');
    const type = stringField(receipt, 'type') ?? productId ?? 'proof';
    const title = stringField(receipt, 'title') ?? stringField(receipt, 'summary') ?? stringField(receipt, 'id') ?? 'Receipt';
    const summary = stringField(receipt, 'summary') ?? title;
    const evidence = stringField(receipt, 'evidence') ?? stringField(receipt, 'source') ?? summary;

    return {
      id: stringField(receipt, 'id') ?? `receipt:${sourceKind}:${slug(recordId || title)}`,
      recordId,
      type,
      sourceKind,
      title,
      summary,
      evidence,
      createdAt: receiptTimestamp(receipt),
      sourcePath,
      record: selectedRecord ? topologyRecordSummary(selectedRecord) : undefined,
      recordContextApiPath: selectedRecord
        ? `/api/substrate/topology/internal/records/${slug(selectedRecord.id)}/context`
        : undefined
    };
  }

  function receiptLedgerEntries() {
    const atlasReceipts = objectRecords(atlasSessionCanvas()?.nodes)
      .flatMap((node) =>
        objectRecords(node.governanceRecords).map((receipt) =>
          receiptLedgerEntry(
            receipt,
            'atlas',
            'packages/database-layer/data/create-something-internal-operating-topology.atlas-session.json',
            stringField(node, 'atlasId') ?? stringField(node, 'sourceRecordId')
          )
        )
      );
    const clientOverlayReceipts = (state.clientOverlayCoverage?.overlays ?? [])
      .flatMap((overlay) =>
        overlay.receipts.map((receipt) =>
          receiptLedgerEntry(
            receipt,
            'client_overlay',
            'packages/database-layer/data/create-something-client-overlay-coverage.json',
            overlay.recordId
          )
        )
      );
    const runtimeReceipts = coverageRecords(state.runtimeBindingCoverage)
      .map((record) => ({
        record,
        receipt: record.receipt
      }))
      .filter((entry): entry is { record: Record<string, unknown>; receipt: DatabaseLayerReceipt | Record<string, unknown> } =>
        Boolean(entry.receipt) && typeof entry.receipt === 'object'
      )
      .map((entry) =>
        receiptLedgerEntry(
          entry.receipt,
          'runtime_binding',
          'packages/database-layer/data/create-something-runtime-binding-coverage.json',
          stringField(entry.record, 'recordId')
        )
      );
    const agentConfigReceipts = coverageRecords(state.agentConfigCoverage)
      .map((record) => ({
        record,
        receipt: record.receipt
      }))
      .filter((entry): entry is { record: Record<string, unknown>; receipt: DatabaseLayerReceipt | Record<string, unknown> } =>
        Boolean(entry.receipt) && typeof entry.receipt === 'object'
      )
      .map((entry) =>
        receiptLedgerEntry(
          entry.receipt,
          'agent_config',
          'packages/database-layer/data/create-something-agent-config-coverage.json',
          stringField(entry.record, 'recordId')
        )
      );
    return [...atlasReceipts, ...clientOverlayReceipts, ...runtimeReceipts, ...agentConfigReceipts].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
  }

  function workflowQueueReceipts() {
    return receiptLedgerEntries();
  }

  function receiptLedger(args: Record<string, string> = {}) {
    const selectedRecord = args.recordId ? getTopologyRecord(args.recordId) : undefined;
    const recordIdFilter = args.recordId ? selectedRecord?.id ?? args.recordId.trim() : '';
    const typeFilter = args.type?.trim();
    const sourceFilter = args.source?.trim();
    const parsedLimit = Number.parseInt(args.limit ?? '', 10);
    const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(parsedLimit, 250)) : 25;
    const allReceipts = receiptLedgerEntries();
    const filteredReceipts = allReceipts.filter((receipt) => {
      if (recordIdFilter && receipt.recordId !== recordIdFilter) return false;
      if (typeFilter && receipt.type !== typeFilter) return false;
      if (sourceFilter && receipt.sourceKind !== sourceFilter) return false;
      return true;
    });

    return {
      id: `${state.managementSurface.id}:receipts`,
      topologyId: state.topology.id,
      atlasCanvasId: state.topology.atlasCanvasId,
      filters: {
        recordId: args.recordId ?? '',
        type: typeFilter ?? '',
        source: sourceFilter ?? ''
      },
      limit,
      summary: {
        totalReceipts: allReceipts.length,
        filteredReceipts: filteredReceipts.length,
        byType: facetEntries(allReceipts.map((receipt) => receipt.type)),
        bySource: facetEntries(allReceipts.map((receipt) => receipt.sourceKind))
      },
      receipts: filteredReceipts.slice(0, limit),
      endpoints: {
        workflowQueue: '/api/substrate/workflow/queue',
        workbench: '/api/substrate/workbench',
        records: '/api/substrate/topology/internal/records'
      }
    };
  }

  function workflowQueue(args: Record<string, string> = {}) {
    const stateFilter = args.state?.trim();
    const sourceFilter = args.source?.trim();
    const parsedLimit = Number.parseInt(args.limit ?? '', 10);
    const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(parsedLimit, 250)) : 25;
    const allActions = workflowQueueActions();
    const filteredActions = allActions.filter((action) => {
      if (stateFilter && action.state !== stateFilter) return false;
      if (sourceFilter && action.sourceKind !== sourceFilter) return false;
      return true;
    });
    const receipts = workflowQueueReceipts();
    return {
      id: `${state.managementSurface.id}:workflow-queue`,
      topologyId: state.topology.id,
      atlasCanvasId: state.topology.atlasCanvasId,
      filters: {
        state: stateFilter ?? '',
        source: sourceFilter ?? ''
      },
      limit,
      summary: {
        totalActions: allActions.length,
        filteredActions: filteredActions.length,
        byState: facetEntries(allActions.map((action) => action.state)),
        bySource: facetEntries(allActions.map((action) => action.sourceKind)),
        approvalRequired: state.operatingSliceReadiness.items.filter((item) => item.productionStatus === 'approval_required').length,
        blocked: allActions.filter((action) => action.state === 'stop').length
      },
      actions: filteredActions.slice(0, limit),
      receipts: {
        total: receipts.length,
        recent: receipts.slice(0, 25)
      },
      endpoints: {
        workbench: '/api/substrate/workbench',
        records: '/api/substrate/topology/internal/records',
        operatingSlices: '/api/substrate/operating-slices',
        receipts: '/api/substrate/receipts'
      }
    };
  }

  function queryRecords(args: Record<string, string> = {}) {
    const query = args.q?.trim().toLowerCase() ?? '';
    const surface = args.surface?.trim();
    const tier = args.tier?.trim();
    const status = args.status?.trim();
    const parsedLimit = Number.parseInt(args.limit ?? '', 10);
    const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(parsedLimit, 100)) : 25;
    const records = state.topology.nodes.filter((node) => {
      if (surface && node.surface !== surface) return false;
      if (tier && node.tier !== tier) return false;
      if (status && node.status !== status) return false;
      if (!query) return true;
      return topologyRecordSearchText(node).includes(query);
    });

    return {
      id: `${state.managementSurface.id}:query`,
      topologyId: state.topology.id,
      atlasCanvasId: state.topology.atlasCanvasId,
      filters: {
        q: args.q ?? '',
        surface: surface ?? '',
        tier: tier ?? '',
        status: status ?? ''
      },
      limit,
      total: records.length,
      records: records.slice(0, limit).map(topologyRecordSummary)
    };
  }

  function topologyFacets() {
    return {
      surface: facetEntries(state.topology.nodes.map((node) => node.surface)),
      tier: facetEntries(state.topology.nodes.map((node) => node.tier)),
      status: facetEntries(state.topology.nodes.map((node) => node.status)),
      owner: facetEntries(state.topology.nodes.map((node) => node.owner)),
      clientSlug: facetEntries(state.topology.nodes.map((node) => node.clientSlug))
    };
  }

  function workbenchSnapshot(args: Record<string, string> = {}) {
    const query = queryRecords(args);
    const selectedRecord = args.recordId ? getTopologyRecord(args.recordId) : undefined;
    if (args.recordId && !selectedRecord) return undefined;
    const selectedContext = selectedRecord ? topologyRecordContext(selectedRecord) : undefined;
    return {
      id: `${state.managementSurface.id}:workbench`,
      topology: topologySummary(state.topology),
      filters: query.filters,
      facets: topologyFacets(),
      query,
      selectedContext,
      endpoints: {
        query: '/api/substrate/query',
        records: '/api/substrate/topology/internal/records',
        selectedContext: selectedRecord
          ? `/api/substrate/topology/internal/records/${slug(selectedRecord.id)}/context`
          : '/api/substrate/topology/internal/records/{recordId}/context',
        openapi: '/api/substrate/openapi.json',
        capabilities: '/api/substrate/capabilities'
      }
    };
  }

  function contractAudit() {
    const readOperations = state.managementSurface.operations.filter(
      (operation) => operation.apiMethod === 'GET'
    );
    const writeOperations = state.managementSurface.operations.filter(
      (operation) => operation.apiMethod !== 'GET'
    );
    const readMatchers = readOperations.map((operation) => ({
      operation,
      ...operationPathMatcher(operation.apiPath)
    }));
    const resourceMatches = state.managementSurface.resources.map((resource) => {
      const match = readMatchers.find((candidate) => candidate.re.test(resource.apiPath));
      return {
        resourceId: resource.id,
        kind: resource.kind,
        apiPath: resource.apiPath,
        mcpUri: resource.mcpUri,
        agentCommand: resource.agentCommand,
        operationId: match?.operation.id,
        operationPath: match?.operation.apiPath,
        mcpTool: match?.operation.mcpTool
      };
    });
    const unmatchedResources = resourceMatches.filter((match) => !match.operationId);
    const operationPathCounts = new Map<string, number>();
    for (const operation of state.managementSurface.operations) {
      const key = `${operation.apiMethod} ${operation.apiPath}`;
      operationPathCounts.set(key, (operationPathCounts.get(key) ?? 0) + 1);
    }
    const duplicateOperationPaths = Array.from(operationPathCounts.entries())
      .filter(([, count]) => count > 1)
      .map(([path, count]) => ({ path, count }));
    const ungatedWriteOperations = writeOperations.filter((operation) => !operation.requiresApproval);
    const byOperation = readOperations
      .map((operation) => ({
        operationId: operation.id,
        apiPath: operation.apiPath,
        mcpTool: operation.mcpTool,
        agentCommand: operation.agentCommand,
        resourceCount: resourceMatches.filter((match) => match.operationId === operation.id).length
      }))
      .filter((entry) => entry.resourceCount > 0)
      .sort((a, b) => b.resourceCount - a.resourceCount || a.operationId.localeCompare(b.operationId));
    const status =
      unmatchedResources.length === 0 &&
      duplicateOperationPaths.length === 0 &&
      ungatedWriteOperations.length === 0
        ? 'pass'
        : 'review';

    return {
      id: `${state.managementSurface.id}:contract-audit`,
      status,
      topologyId: state.topology.id,
      atlasCanvasId: state.topology.atlasCanvasId,
      summary: {
        resources: state.managementSurface.resources.length,
        operations: state.managementSurface.operations.length,
        readOperations: readOperations.length,
        writeOperations: writeOperations.length,
        readOperationCoverageCount: resourceMatches.length - unmatchedResources.length,
        unmatchedResourceCount: unmatchedResources.length,
        duplicateOperationPathCount: duplicateOperationPaths.length,
        ungatedWriteOperationCount: ungatedWriteOperations.length
      },
      resourceCoverage: {
        byOperation,
        unmatchedResources
      },
      operationIntegrity: {
        duplicateOperationPaths,
        missingToolOrCommand: state.managementSurface.operations
          .filter((operation) => !operation.mcpTool || !operation.agentCommand || !operation.apiPath)
          .map((operation) => operation.id)
      },
      approval: {
        writeOperationsApprovalGated:
          writeOperations.length > 0 && writeOperations.every((operation) => operation.requiresApproval),
        ungatedWriteOperations: ungatedWriteOperations.map((operation) => operation.id)
      },
      endpoints: {
        capabilities: '/api/substrate/capabilities',
        openapi: '/api/substrate/openapi.json',
        management: '/api/substrate/management',
        workbench: '/api/substrate/workbench'
      }
    };
  }

  function capabilitiesIndex() {
    const readOperations = state.managementSurface.operations.filter(
      (operation) => operation.apiMethod === 'GET'
    );
    const writeOperations = state.managementSurface.operations.filter(
      (operation) => operation.apiMethod !== 'GET'
    );
    const resourceUris = state.managementSurface.resources.map((resource) => resource.mcpUri);
    const toolNames = state.managementSurface.operations.map((operation) => operation.mcpTool);
    const commands = Array.from(
      new Set([
        ...state.managementSurface.operations.map((operation) => operation.agentCommand),
        ...state.managementSurface.resources.map((resource) => resource.agentCommand)
      ])
    ).sort();

    return {
      id: `${state.managementSurface.id}:capabilities`,
      generatedAt: state.managementSurface.generatedAt,
      topologyId: state.managementSurface.topologyId,
      atlasCanvasId: state.managementSurface.atlasCanvasId,
      posture: state.managementSurface.posture,
      api: {
        basePath: '/api/substrate',
        endpoints: state.managementSurface.operations.map((operation) => ({
          id: operation.id,
          method: operation.apiMethod,
          path: operation.apiPath,
          title: operation.title,
          mode: operation.mode,
          requiresApproval: operation.requiresApproval,
          mcpTool: operation.mcpTool,
          agentCommand: operation.agentCommand
        }))
      },
      mcp: {
        resources: state.managementSurface.resources.length,
        tools: state.managementSurface.operations.length,
        jsonRpcEndpoint: '/api/substrate/mcp/rpc',
        resourceListEndpoint: '/api/substrate/mcp/resources',
        toolListEndpoint: '/api/substrate/mcp/tools',
        sampleResourceUris: [
          'substrate://capabilities',
          'substrate://contract/audit',
          'substrate://workbench',
          'substrate://canvas-state',
          'substrate://compute-snapshot',
          'substrate://atlas-sessions/create-something-internal-operating-topology/viewport',
          'substrate://workflow/queue',
          'substrate://receipts',
          'substrate://query',
          'substrate://client-overlays',
          'substrate://topology/internal',
          'substrate://performance',
          'substrate://organization-review',
          'substrate://business/recommendations'
        ].filter((uri) => resourceUris.includes(uri)),
        sampleTools: [
          'database_layer_get_capabilities',
          'database_layer_get_contract_audit',
          'database_layer_get_workbench',
          'database_layer_get_canvas_state',
          'database_layer_get_compute_snapshot',
          'database_layer_get_atlas_viewport',
          'database_layer_get_workflow_queue',
          'database_layer_list_receipts',
          'database_layer_get_topology',
          'database_layer_get_atlas_session',
          'database_layer_get_runtime_binding_coverage',
          'database_layer_query_records',
          'database_layer_get_client_overlay',
          'database_layer_get_performance_contract',
          'database_layer_get_organization_review',
          'database_layer_get_business_recommendations',
          'database_layer_get_topology_diagnostics'
        ].filter((name) => toolNames.includes(name))
      },
      agent: {
        commands,
        commandCount: commands.length
      },
      approval: {
        requiredForWrites: writeOperations.length > 0 && writeOperations.every((operation) => operation.requiresApproval),
        readOperations: readOperations.length,
        writeOperations: writeOperations.length,
        mutationBoundary:
          writeOperations[0]?.mutationBoundary ??
          'Read-only capability index. No production state mutation.'
      },
      performance: {
        baseline: state.performanceContract?.baseline ?? 'obsidian_like_operator_speed',
        budgetCount: state.performanceContract?.budgets.length ?? 0,
        fastPathCount: state.performanceContract?.fastPath.length ?? 0
      }
    };
  }

  function healthStatus() {
    const readOperations = state.managementSurface.operations.filter(
      (operation) => operation.apiMethod === 'GET'
    );
    const writeOperations = state.managementSurface.operations.filter(
      (operation) => operation.apiMethod !== 'GET'
    );
    return {
      id: `${state.managementSurface.id}:health`,
      status: 'ok',
      runtime: 'substrate',
      generatedAt: state.managementSurface.generatedAt,
      topology: {
        id: state.topology.id,
        atlasCanvasId: state.topology.atlasCanvasId,
        nodes: state.topology.nodes.length,
        edges: state.topology.edges.length,
        rootNodeId: state.topology.rootNodeId
      },
      management: {
        resources: state.managementSurface.resources.length,
        operations: state.managementSurface.operations.length,
        readOperations: readOperations.length,
        writeOperations: writeOperations.length,
        posture: state.managementSurface.posture
      },
      approval: {
        writeOperationsApprovalGated:
          writeOperations.length > 0 && writeOperations.every((operation) => operation.requiresApproval),
        mutationBoundary:
          writeOperations[0]?.mutationBoundary ??
          'Read-only health endpoint. No production state mutation.'
      },
      performance: {
        baseline: state.performanceContract?.baseline ?? 'obsidian_like_operator_speed',
        budgets: state.performanceContract?.budgets.length ?? 0,
        fastPath: state.performanceContract?.fastPath.length ?? 0
      },
      cloudflare: {
        cacheControl: 'public, max-age=15',
        cors: true,
        methods: ['GET', 'HEAD', 'OPTIONS']
      },
      endpoints: {
        capabilities: '/api/substrate/capabilities',
        openapi: '/api/substrate/openapi.json',
        management: '/api/substrate/management',
        mcpRpc: '/api/substrate/mcp/rpc'
      }
    };
  }

  function openApiPath(apiPath: string): string {
    return apiPath.replace(/^\/api\/substrate/, '') || '/';
  }

  function openApiPathParamNames(apiPath: string): Set<string> {
    return new Set(Array.from(apiPath.matchAll(/\{([^}]+)\}/g)).map((match) => match[1]));
  }

  function openApiParameters(operation: DatabaseLayerManagementSurface['operations'][number]) {
    const pathParams = openApiPathParamNames(operation.apiPath);
    const pathParameters = Object.entries(operation.inputSchema)
      .filter(([name]) => pathParams.has(name))
      .map(([name, description]) => ({
        name,
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description
      }));
    const queryParameters =
      operation.apiMethod === 'GET'
        ? Object.entries(operation.inputSchema)
            .filter(([name]) => !pathParams.has(name))
            .map(([name, description]) => ({
              name,
              in: 'query',
              required: false,
              schema: { type: 'string' },
              description
            }))
        : [];
    return [...pathParameters, ...queryParameters];
  }

  function openApiRequestBody(operation: DatabaseLayerManagementSurface['operations'][number]) {
    if (operation.apiMethod === 'GET') return undefined;
    const pathParams = openApiPathParamNames(operation.apiPath);
    const bodyProperties = Object.fromEntries(
      Object.entries(operation.inputSchema)
        .filter(([name]) => !pathParams.has(name))
        .map(([name, description]) => [name, { type: 'string', description }])
    );
    if (!Object.keys(bodyProperties).length) return undefined;
    return {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: bodyProperties
          }
        }
      }
    };
  }

  function openApiResponse(operation: DatabaseLayerManagementSurface['operations'][number]) {
    return {
      description: operation.requiresApproval
        ? 'Approval-gated response or local proposal receipt.'
        : 'Successful read response.',
      content: {
        'application/json': {
          schema: { type: 'object' }
        }
      }
    };
  }

  function openApiContract() {
    const paths: Record<string, Record<string, unknown>> = {};
    for (const operation of state.managementSurface.operations) {
      const pathKey = openApiPath(operation.apiPath);
      const methodKey = operation.apiMethod.toLowerCase();
      paths[pathKey] ??= {};
      const requestBody = openApiRequestBody(operation);
      paths[pathKey][methodKey] = {
        operationId: operation.mcpTool,
        summary: operation.title,
        description: operation.mutationBoundary,
        tags: [operation.mode],
        parameters: openApiParameters(operation),
        ...(requestBody ? { requestBody } : {}),
        responses: {
          [operation.requiresApproval ? '403' : '200']: openApiResponse(operation)
        },
        'x-agent-command': operation.agentCommand,
        'x-mcp-tool': operation.mcpTool,
        'x-output-ref': operation.outputRef,
        'x-requires-approval': operation.requiresApproval
      };
    }

    return {
      openapi: '3.1.0',
      info: {
        title: 'CREATE SOMETHING Substrate Database Layer API',
        version: state.managementSurface.generatedAt,
        description:
          'Machine-readable API contract derived from the generated Substrate management surface.'
      },
      servers: [{ url: '/api/substrate' }],
      paths,
      components: {
        schemas: {
          SubstrateJsonObject: {
            type: 'object',
            additionalProperties: true
          }
        }
      },
      'x-substrate': {
        managementSurfaceId: state.managementSurface.id,
        topologyId: state.managementSurface.topologyId,
        atlasCanvasId: state.managementSurface.atlasCanvasId,
        posture: state.managementSurface.posture,
        resourceCount: state.managementSurface.resources.length,
        operationCount: state.managementSurface.operations.length
      }
    };
  }

  function topologyRecordDetail(node: DatabaseLayerTopologyNode) {
    const incomingEdges = state.topology.edges.filter((edge) => edge.target === node.id);
    const outgoingEdges = state.topology.edges.filter((edge) => edge.source === node.id);
    const relatedRecordIds = Array.from(
      new Set([
        ...incomingEdges.map((edge) => edge.source),
        ...outgoingEdges.map((edge) => edge.target)
      ])
    );

    return {
      ...topologyRecordSummary(node),
      record: node,
      resource: resourceByRecordId.get(node.id),
      incomingEdges,
      outgoingEdges,
      relatedRecordIds
    };
  }

  function topologyRecordContext(node: DatabaseLayerTopologyNode) {
    const incomingEdges = state.topology.edges.filter((edge) => edge.target === node.id);
    const outgoingEdges = state.topology.edges.filter((edge) => edge.source === node.id);
    const relatedRecordIds = Array.from(
      new Set([
        ...incomingEdges.map((edge) => edge.source),
        ...outgoingEdges.map((edge) => edge.target)
      ])
    );
    const relatedRecords = relatedRecordIds
      .map((id) => topologyNodeByKey.get(id))
      .filter((record): record is DatabaseLayerTopologyNode => Boolean(record))
      .slice(0, 50)
      .map(topologyRecordSummary);
    const atlasNode = getAtlasSessionNode(node);
    const atlasEdges = getAtlasSessionEdges(node.atlasNodeId);
    const diagnosticSignals = (state.topologyDiagnostics?.signals ?? []).filter((signal) => {
      const nodeIds = Array.isArray(signal.nodeIds) ? signal.nodeIds : [];
      const paths = Array.isArray(signal.paths) ? signal.paths : [];
      return nodeIds.includes(node.id) || nodeIds.includes(node.atlasNodeId) || paths.includes(node.path);
    });
    const organizationFindings = (state.organizationReview?.findings ?? []).filter((finding) =>
      [...finding.evidence, finding.title, finding.summary].some((value) =>
        [node.id, node.path, node.surface, node.tier].some((needle) => value.includes(needle))
      )
    );

    return {
      id: `${state.managementSurface.id}:record-context:${slug(node.id)}`,
      topologyId: state.topology.id,
      atlasCanvasId: state.topology.atlasCanvasId,
      record: topologyRecordSummary(node),
      sourceRecord: node,
      resource: resourceByRecordId.get(node.id),
      atlas: {
        node: atlasNode ?? {
          id: node.atlasNodeId,
          atlasId: node.id,
          label: node.title,
          status: node.status
        },
        bindings: Array.isArray(atlasNode?.bindings) ? atlasNode.bindings : [],
        sync: atlasNode?.sync,
        products: Array.isArray(atlasNode?.products) ? atlasNode.products : [],
        incomingEdges: atlasEdges.incoming,
        outgoingEdges: atlasEdges.outgoing,
        incomingEdgeCount: atlasEdges.incomingCount,
        outgoingEdgeCount: atlasEdges.outgoingCount
      },
      topology: {
        incomingEdges: compactTopologyEdges(incomingEdges),
        outgoingEdges: compactTopologyEdges(outgoingEdges),
        incomingEdgeCount: incomingEdges.length,
        outgoingEdgeCount: outgoingEdges.length,
        relatedRecordIds,
        relatedRecordCount: relatedRecordIds.length,
        relatedRecords
      },
      workflow: {
        status: node.status,
        actions: workflowActionsForRecord(node)
      },
      proof: {
        receipts: Array.isArray(atlasNode?.governanceRecords) ? atlasNode.governanceRecords : []
      },
      review: {
        diagnosticSignals,
        organizationFindings
      },
      endpoints: {
        record: `/api/substrate/topology/internal/records/${slug(node.id)}`,
        query: '/api/substrate/query',
        atlasSession: '/api/substrate/atlas-sessions/create-something-internal-operating-topology',
        diagnostics: '/api/substrate/topology/internal/diagnostics',
        organizationReview: '/api/substrate/organization-review'
      }
    };
  }

  function mcpToolArgs(name: string, key?: string): Record<string, string> {
    if (!key) return {};
    if (name === 'database_layer_get_topology_record' || name === 'database_layer_get_topology_record_context') {
      return { recordId: decodeURIComponent(key) };
    }
    if (
      name === 'database_layer_get_atlas_session' ||
      name === 'database_layer_get_atlas_viewport' ||
      name === 'database_layer_get_canvas_state' ||
      name === 'database_layer_get_compute_snapshot'
    ) {
      return { sessionId: decodeURIComponent(key) };
    }
    if (name === 'database_layer_get_client_overlay') return { clientSlug: decodeURIComponent(key) };
    return { sliceId: decodeURIComponent(key) };
  }

  function handle(method: string, urlOrPath: string): DatabaseLayerApiResponse {
    const normalizedMethod = method.toUpperCase();
    const pathname = normalizePath(urlOrPath);
    const mcpToolCallMatch = pathname.match(/^\/api\/substrate\/mcp\/tools\/([^/]+)\/call(?:\/([^/]+))?$/);

    if (mcpToolCallMatch?.[1] && normalizedMethod !== 'GET') {
      return callMcpTool(
        decodeURIComponent(mcpToolCallMatch[1]),
        mcpToolArgs(decodeURIComponent(mcpToolCallMatch[1]), mcpToolCallMatch[2])
      );
    }

    if (normalizedMethod !== 'GET') {
      const operation = state.managementSurface.operations.find(
        (candidate) =>
          candidate.apiMethod === normalizedMethod &&
          (candidate.apiPath === pathname || candidate.apiPath.includes('{sliceId}'))
      );
      return json(operation ? 403 : 405, {
        error: operation ? 'approval_required' : 'method_not_allowed',
        message: operation
          ? operation.mutationBoundary
          : 'This database-layer API helper currently serves read-only management state.',
        operation
      });
    }

    if (pathname === '/api/substrate/management') {
      return json(200, state.managementSurface);
    }

    if (pathname === '/api/substrate/capabilities') {
      return json(200, capabilitiesIndex());
    }

    if (pathname === '/api/substrate/health') {
      return json(200, healthStatus());
    }

    if (pathname === '/api/substrate/openapi.json') {
      return json(200, openApiContract());
    }

    if (pathname === '/api/substrate/contract/audit') {
      return json(200, contractAudit());
    }

    if (pathname === '/api/substrate/workbench') {
      const snapshot = workbenchSnapshot(searchParamsFromUrl(urlOrPath));
      if (!snapshot) return json(404, { error: 'topology_record_not_found', recordId: searchParamsFromUrl(urlOrPath).recordId });
      return json(200, snapshot);
    }

    if (pathname === '/api/substrate/workflow/queue') {
      return json(200, workflowQueue(searchParamsFromUrl(urlOrPath)));
    }

    if (pathname === '/api/substrate/receipts') {
      return json(200, receiptLedger(searchParamsFromUrl(urlOrPath)));
    }

    if (pathname === '/api/substrate/query') {
      return json(200, queryRecords(searchParamsFromUrl(urlOrPath)));
    }

    if (pathname === '/api/substrate/topology/internal') {
      return json(200, {
        summary: topologySummary(state.topology),
        topology: state.topology
      });
    }

    if (pathname === '/api/substrate/topology/internal/diagnostics') {
      return json(200, state.topologyDiagnostics ?? {
        resource: state.managementSurface.resources.find((resource) => resource.kind === 'diagnostics'),
        note: 'Topology diagnostics payload was not attached to this management API state.'
      });
    }

    if (pathname === '/api/substrate/performance') {
      return json(200, state.performanceContract ?? {
        resource: state.managementSurface.resources.find((resource) => resource.kind === 'performance'),
        note: 'Performance contract payload was not attached to this management API state.'
      });
    }

    if (pathname === '/api/substrate/organization-review') {
      return json(200, state.organizationReview ?? {
        resource: state.managementSurface.resources.find((resource) => resource.kind === 'organization_review'),
        note: 'Organization review payload was not attached to this management API state.'
      });
    }

    if (pathname === '/api/substrate/business/recommendations') {
      return json(200, state.businessRecommendations ?? {
        resource: state.managementSurface.resources.find((resource) => resource.kind === 'business_recommendations'),
        note: 'Business operating recommendations payload was not attached to this management API state.'
      });
    }

    if (pathname === '/api/substrate/canvas-state') {
      const canvasState = sharedCanvasState(searchParamsFromUrl(urlOrPath));
      if (!canvasState) return json(404, { error: 'canvas_state_not_found', sessionId: activeAtlasSessionId() });
      return json(200, canvasState);
    }

    if (pathname === '/api/substrate/compute-snapshot') {
      const snapshot = computeSnapshot(searchParamsFromUrl(urlOrPath));
      if (!snapshot) return json(404, { error: 'compute_snapshot_not_found', sessionId: activeAtlasSessionId() });
      return json(200, snapshot);
    }

    const canvasStateMatch = pathname.match(/^\/api\/substrate\/atlas-sessions\/([^/]+)\/canvas-state$/);
    if (canvasStateMatch?.[1]) {
      const canvasState = sharedCanvasState({
        ...searchParamsFromUrl(urlOrPath),
        sessionId: decodeURIComponent(canvasStateMatch[1])
      });
      if (!canvasState) return json(404, { error: 'atlas_session_not_found', sessionId: decodeURIComponent(canvasStateMatch[1]) });
      return json(200, canvasState);
    }

    const computeSnapshotMatch = pathname.match(/^\/api\/substrate\/atlas-sessions\/([^/]+)\/compute-snapshot$/);
    if (computeSnapshotMatch?.[1]) {
      const snapshot = computeSnapshot({
        ...searchParamsFromUrl(urlOrPath),
        sessionId: decodeURIComponent(computeSnapshotMatch[1])
      });
      if (!snapshot) return json(404, { error: 'atlas_session_not_found', sessionId: decodeURIComponent(computeSnapshotMatch[1]) });
      return json(200, snapshot);
    }

    const atlasViewportMatch = pathname.match(/^\/api\/substrate\/atlas-sessions\/([^/]+)\/viewport$/);
    if (atlasViewportMatch?.[1]) {
      const viewport = atlasViewport({
        ...searchParamsFromUrl(urlOrPath),
        sessionId: decodeURIComponent(atlasViewportMatch[1])
      });
      if (!viewport) return json(404, { error: 'atlas_session_not_found', sessionId: decodeURIComponent(atlasViewportMatch[1]) });
      return json(200, viewport);
    }

    const atlasSessionMatch = pathname.match(/^\/api\/substrate\/atlas-sessions\/([^/]+)$/);
    if (atlasSessionMatch?.[1]) {
      const sessionId = decodeURIComponent(atlasSessionMatch[1]);
      if (sessionId !== activeAtlasSessionId()) return json(404, { error: 'atlas_session_not_found', sessionId });
      return json(200, state.atlasSession ?? {
        resource: state.managementSurface.resources.find((resource) => resource.kind === 'atlas_session'),
        note: 'Atlas session payload was not attached to this management API state.'
      });
    }

    if (pathname === '/api/substrate/coverage/runtime-bindings/cloudflare') {
      return json(200, state.runtimeBindingCoverage ?? {
        resource: state.managementSurface.resources.find((resource) => resource.kind === 'coverage'),
        note: 'Runtime binding coverage payload was not attached to this management API state.'
      });
    }

    if (pathname === '/api/substrate/client-overlays') {
      return json(200, {
        id: state.clientOverlayCoverage?.id ?? 'substrate:create-something:client-overlay-coverage',
        topologyId: state.topology.id,
        atlasCanvasId: state.topology.atlasCanvasId,
        overlays: listClientOverlays()
      });
    }

    const clientOverlayMatch = pathname.match(/^\/api\/substrate\/client-overlays\/([^/]+)$/);
    if (clientOverlayMatch?.[1]) {
      const overlay = getClientOverlay(clientOverlayMatch[1]);
      if (!overlay) return json(404, { error: 'client_overlay_not_found', clientSlug: clientOverlayMatch[1] });
      return json(200, overlay);
    }

    if (pathname === '/api/substrate/topology/internal/records') {
      return json(200, {
        topologyId: state.topology.id,
        atlasCanvasId: state.topology.atlasCanvasId,
        records: listTopologyRecords()
      });
    }

    const topologyRecordContextMatch = pathname.match(/^\/api\/substrate\/topology\/internal\/records\/([^/]+)\/context$/);
    if (topologyRecordContextMatch?.[1]) {
      const record = getTopologyRecord(topologyRecordContextMatch[1]);
      if (!record) return json(404, { error: 'topology_record_not_found', record: topologyRecordContextMatch[1] });
      return json(200, topologyRecordContext(record));
    }

    const topologyRecordMatch = pathname.match(/^\/api\/substrate\/topology\/internal\/records\/([^/]+)$/);
    if (topologyRecordMatch?.[1]) {
      const record = getTopologyRecord(topologyRecordMatch[1]);
      if (!record) return json(404, { error: 'topology_record_not_found', record: topologyRecordMatch[1] });
      return json(200, topologyRecordDetail(record));
    }

    if (pathname === '/api/substrate/operating-slices') {
      return json(200, {
        id: state.operatingSliceReview.id,
        slices: listOperatingSlices()
      });
    }

    if (pathname === '/api/substrate/mcp/resources') {
      return json(200, { resources: mcpResources() });
    }

    const mcpResourceMatch = pathname.match(/^\/api\/substrate\/mcp\/resources\/([^/]+)$/);
    if (mcpResourceMatch?.[1]) {
      return readMcpResource(decodeURIComponent(mcpResourceMatch[1]));
    }

    if (pathname === '/api/substrate/mcp/tools') {
      return json(200, { tools: mcpTools() });
    }

    if (mcpToolCallMatch?.[1]) {
      return callMcpTool(
        decodeURIComponent(mcpToolCallMatch[1]),
        mcpToolArgs(decodeURIComponent(mcpToolCallMatch[1]), mcpToolCallMatch[2])
      );
    }

    const readinessMatch = pathname.match(/^\/api\/substrate\/operating-slices\/([^/]+)\/readiness$/);
    if (readinessMatch?.[1]) {
      const item = getOperatingSliceReadiness(readinessMatch[1]);
      if (!item) return json(404, { error: 'slice_readiness_not_found', slice: readinessMatch[1] });
      return json(200, item);
    }

    const sliceMatch = pathname.match(/^\/api\/substrate\/operating-slices\/([^/]+)$/);
    if (sliceMatch?.[1]) {
      const slice = getOperatingSlice(sliceMatch[1]);
      if (!slice) return json(404, { error: 'slice_not_found', slice: sliceMatch[1] });
      return json(200, {
        ...slice,
        slug: slug(slice.id),
        readiness: getOperatingSliceReadiness(slice.id)
      });
    }

    return json(404, { error: 'not_found', path: pathname });
  }

  function handleRequest(request: { method: string; url: string }): DatabaseLayerApiResponse {
    return handle(request.method, request.url);
  }

  function mcpResources() {
    return state.managementSurface.resources.map((resource) => ({
      uri: resource.mcpUri,
      name: resource.title,
      description: resource.policy,
      mimeType: 'application/json'
    }));
  }

  function mcpTools() {
    return state.managementSurface.operations.map((operation) => ({
      name: operation.mcpTool,
      description: `${operation.title}. ${operation.mutationBoundary}`,
      inputSchema: {
        type: 'object',
        properties: Object.fromEntries(
          Object.entries(operation.inputSchema).map(([key, description]) => [
            key,
            { type: 'string', description }
          ])
        )
      },
      requiresApproval: operation.requiresApproval
    }));
  }

  function readMcpResource(uri: string): DatabaseLayerApiResponse {
    const resource = resourceByUri.get(uri);
    if (!resource) return json(404, { error: 'mcp_resource_not_found', uri });

    if (resource.kind === 'capabilities') {
      return json(200, capabilitiesIndex());
    }
    if (resource.kind === 'health') {
      return json(200, healthStatus());
    }
    if (resource.kind === 'openapi') {
      return json(200, openApiContract());
    }
    if (resource.kind === 'contract_audit') {
      return json(200, contractAudit());
    }
    if (resource.kind === 'query') {
      return json(200, queryRecords());
    }
    if (resource.kind === 'workbench') {
      return json(200, workbenchSnapshot());
    }
    if (resource.kind === 'workflow_queue') {
      return json(200, workflowQueue());
    }
    if (resource.kind === 'receipts') {
      return json(200, receiptLedger());
    }
    if (resource.kind === 'topology') {
      return json(200, { summary: topologySummary(state.topology), topology: state.topology });
    }
    if (resource.kind === 'diagnostics') {
      return json(200, state.topologyDiagnostics ?? {
        resource,
        note: 'Topology diagnostics payload was not attached to this management API state.'
      });
    }
    if (resource.kind === 'performance') {
      return json(200, state.performanceContract ?? {
        resource,
        note: 'Performance contract payload was not attached to this management API state.'
      });
    }
    if (resource.kind === 'organization_review') {
      return json(200, state.organizationReview ?? {
        resource,
        note: 'Organization review payload was not attached to this management API state.'
      });
    }
    if (resource.kind === 'business_recommendations') {
      return json(200, state.businessRecommendations ?? {
        resource,
        note: 'Business operating recommendations payload was not attached to this management API state.'
      });
    }
    if (resource.kind === 'canvas_state') {
      const canvasState = sharedCanvasState(resource.recordId ? { sessionId: resource.recordId.replace(/:canvas-state$/, '') } : {});
      if (!canvasState) return json(404, { error: 'canvas_state_not_found', uri });
      return json(200, canvasState);
    }
    if (resource.kind === 'compute_snapshot') {
      const snapshot = computeSnapshot(resource.recordId ? { sessionId: resource.recordId.replace(/:compute-snapshot$/, '') } : {});
      if (!snapshot) return json(404, { error: 'compute_snapshot_not_found', uri });
      return json(200, snapshot);
    }
    if (resource.kind === 'client_overlay') {
      if (resource.mcpUri === 'substrate://client-overlays') {
        return json(200, {
          id: state.clientOverlayCoverage?.id ?? 'substrate:create-something:client-overlay-coverage',
          topologyId: state.topology.id,
          atlasCanvasId: state.topology.atlasCanvasId,
          overlays: listClientOverlays()
        });
      }
      if (!resource.recordId) return json(400, { error: 'client_overlay_resource_missing_record', uri });
      const overlay = getClientOverlay(resource.recordId);
      if (!overlay) return json(404, { error: 'client_overlay_not_found', uri });
      return json(200, overlay);
    }
    if (resource.kind === 'topology_record' && resource.recordId) {
      const record = getTopologyRecord(resource.recordId);
      if (!record) return json(404, { error: 'topology_record_not_found', uri });
      return json(200, topologyRecordDetail(record));
    }
    if (resource.kind === 'slice' && resource.recordId) {
      const slice = getOperatingSlice(resource.recordId);
      if (!slice) return json(404, { error: 'slice_not_found', uri });
      return json(200, { ...slice, readiness: getOperatingSliceReadiness(slice.id) });
    }
    if (resource.kind === 'readiness' && resource.recordId) {
      const readiness = getOperatingSliceReadiness(resource.recordId);
      if (!readiness) return json(404, { error: 'slice_readiness_not_found', uri });
      return json(200, readiness);
    }
    if (resource.kind === 'coverage') {
      return json(200, state.runtimeBindingCoverage ?? {
        resource,
        note: 'Runtime binding coverage payload was not attached to this management API state.'
      });
    }
    if (resource.kind === 'atlas_session') {
      return json(200, state.atlasSession ?? {
        resource,
        note: 'Atlas session payload was not attached to this management API state.'
      });
    }
    if (resource.kind === 'atlas_viewport') {
      const viewport = atlasViewport(resource.recordId ? { sessionId: resource.recordId.replace(/:viewport$/, '') } : {});
      if (!viewport) return json(404, { error: 'atlas_viewport_not_found', uri });
      return json(200, viewport);
    }

    return json(400, { error: 'unsupported_resource_kind', resource });
  }

  function callMcpTool(name: string, args: Record<string, string> = {}): DatabaseLayerApiResponse {
    const operation = state.managementSurface.operations.find((candidate) => candidate.mcpTool === name);
    if (!operation) return json(404, { error: 'mcp_tool_not_found', name });

    if (operation.requiresApproval) {
      return json(403, {
        error: 'approval_required',
        operation,
        message: operation.mutationBoundary
      });
    }

    if (name === 'database_layer_get_capabilities') {
      return json(200, capabilitiesIndex());
    }
    if (name === 'database_layer_get_health') {
      return json(200, healthStatus());
    }
    if (name === 'database_layer_get_openapi') {
      return json(200, openApiContract());
    }
    if (name === 'database_layer_get_contract_audit') {
      return json(200, contractAudit());
    }
    if (name === 'database_layer_query_records') {
      return json(200, queryRecords(args));
    }
    if (name === 'database_layer_get_workbench') {
      const snapshot = workbenchSnapshot(args);
      if (!snapshot) return json(404, { error: 'topology_record_not_found', recordId: args.recordId });
      return json(200, snapshot);
    }
    if (name === 'database_layer_get_workflow_queue') {
      return json(200, workflowQueue(args));
    }
    if (name === 'database_layer_list_receipts') {
      return json(200, receiptLedger(args));
    }
    if (name === 'database_layer_get_topology') {
      return json(200, { summary: topologySummary(state.topology), topology: state.topology });
    }
    if (name === 'database_layer_get_atlas_session') {
      return json(200, state.atlasSession ?? {
        resource: state.managementSurface.resources.find((resource) => resource.kind === 'atlas_session'),
        note: 'Atlas session payload was not attached to this management API state.'
      });
    }
    if (name === 'database_layer_get_canvas_state') {
      const canvasState = sharedCanvasState(args);
      if (!canvasState) return json(404, { error: 'atlas_session_not_found', sessionId: args.sessionId });
      return json(200, canvasState);
    }
    if (name === 'database_layer_get_compute_snapshot') {
      const snapshot = computeSnapshot(args);
      if (!snapshot) return json(404, { error: 'atlas_session_not_found', sessionId: args.sessionId });
      return json(200, snapshot);
    }
    if (name === 'database_layer_get_atlas_viewport') {
      const viewport = atlasViewport(args);
      if (!viewport) return json(404, { error: 'atlas_session_not_found', sessionId: args.sessionId });
      return json(200, viewport);
    }
    if (name === 'database_layer_get_runtime_binding_coverage') {
      return json(200, state.runtimeBindingCoverage ?? {
        resource: state.managementSurface.resources.find((resource) => resource.kind === 'coverage'),
        note: 'Runtime binding coverage payload was not attached to this management API state.'
      });
    }
    if (name === 'database_layer_list_operating_slices') {
      return json(200, { slices: listOperatingSlices() });
    }
    if (name === 'database_layer_list_client_overlays') {
      return json(200, {
        id: state.clientOverlayCoverage?.id ?? 'substrate:create-something:client-overlay-coverage',
        overlays: listClientOverlays()
      });
    }
    if (name === 'database_layer_get_client_overlay') {
      const clientSlug = args.clientSlug;
      if (!clientSlug) return json(400, { error: 'missing_clientSlug' });
      const overlay = getClientOverlay(clientSlug);
      if (!overlay) return json(404, { error: 'client_overlay_not_found', clientSlug });
      return json(200, overlay);
    }
    if (name === 'database_layer_get_topology_diagnostics') {
      return json(200, state.topologyDiagnostics ?? {
        resource: state.managementSurface.resources.find((resource) => resource.kind === 'diagnostics'),
        note: 'Topology diagnostics payload was not attached to this management API state.'
      });
    }
    if (name === 'database_layer_get_performance_contract') {
      return json(200, state.performanceContract ?? {
        resource: state.managementSurface.resources.find((resource) => resource.kind === 'performance'),
        note: 'Performance contract payload was not attached to this management API state.'
      });
    }
    if (name === 'database_layer_get_organization_review') {
      return json(200, state.organizationReview ?? {
        resource: state.managementSurface.resources.find((resource) => resource.kind === 'organization_review'),
        note: 'Organization review payload was not attached to this management API state.'
      });
    }
    if (name === 'database_layer_get_business_recommendations') {
      return json(200, state.businessRecommendations ?? {
        resource: state.managementSurface.resources.find((resource) => resource.kind === 'business_recommendations'),
        note: 'Business operating recommendations payload was not attached to this management API state.'
      });
    }
    if (name === 'database_layer_list_topology_records') {
      return json(200, { records: listTopologyRecords() });
    }
    if (name === 'database_layer_get_topology_record') {
      const recordId = args.recordId;
      if (!recordId) return json(400, { error: 'missing_recordId' });
      const record = getTopologyRecord(recordId);
      if (!record) return json(404, { error: 'topology_record_not_found', recordId });
      return json(200, topologyRecordDetail(record));
    }
    if (name === 'database_layer_get_topology_record_context') {
      const recordId = args.recordId;
      if (!recordId) return json(400, { error: 'missing_recordId' });
      const record = getTopologyRecord(recordId);
      if (!record) return json(404, { error: 'topology_record_not_found', recordId });
      return json(200, topologyRecordContext(record));
    }
    if (name === 'database_layer_get_operating_slice') {
      const sliceId = args.sliceId;
      if (!sliceId) return json(400, { error: 'missing_sliceId' });
      const slice = getOperatingSlice(sliceId);
      if (!slice) return json(404, { error: 'slice_not_found', sliceId });
      return json(200, { ...slice, readiness: getOperatingSliceReadiness(slice.id) });
    }
    if (name === 'database_layer_get_operating_slice_readiness') {
      const sliceId = args.sliceId;
      if (!sliceId) return json(400, { error: 'missing_sliceId' });
      const readiness = getOperatingSliceReadiness(sliceId);
      if (!readiness) return json(404, { error: 'slice_readiness_not_found', sliceId });
      return json(200, readiness);
    }

    return json(400, { error: 'unsupported_mcp_tool', operation });
  }

  function handleMcpJsonRpc(bodyText: string): DatabaseLayerApiResponse {
    let payload: unknown;
    try {
      payload = JSON.parse(bodyText || '{}');
    } catch {
      return json(400, jsonRpcError(null, -32700, 'Parse error'));
    }

    const request = payload as {
      id?: unknown;
      jsonrpc?: string;
      method?: string;
      params?: Record<string, unknown>;
    };
    if (request.jsonrpc !== undefined && request.jsonrpc !== '2.0') {
      return json(400, jsonRpcError(request.id, -32600, 'Invalid Request'));
    }
    if (typeof request.method !== 'string') {
      return json(400, jsonRpcError(request.id, -32600, 'Invalid Request'));
    }

    if (request.method === 'resources/list') {
      return json(200, jsonRpcResult(request.id, { resources: mcpResources() }));
    }
    if (request.method === 'resources/read') {
      const uri = typeof request.params?.uri === 'string' ? request.params.uri : undefined;
      if (!uri) return json(400, jsonRpcError(request.id, -32602, 'Missing params.uri'));
      const resource = readMcpResource(uri);
      if (resource.status !== 200) return json(resource.status, jsonRpcError(request.id, -32000, 'Resource read failed', resource.body));
      return json(
        200,
        jsonRpcResult(request.id, {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(resource.body, null, 2)
            }
          ]
        })
      );
    }
    if (request.method === 'tools/list') {
      return json(200, jsonRpcResult(request.id, { tools: mcpTools() }));
    }
    if (request.method === 'tools/call') {
      const name = typeof request.params?.name === 'string' ? request.params.name : undefined;
      const args = (request.params?.arguments ?? {}) as Record<string, string>;
      if (!name) return json(400, jsonRpcError(request.id, -32602, 'Missing params.name'));
      const tool = callMcpTool(name, args);
      if (tool.status === 403) {
        return json(403, jsonRpcError(request.id, -32001, 'Approval required', tool.body));
      }
      if (tool.status !== 200) return json(tool.status, jsonRpcError(request.id, -32000, 'Tool call failed', tool.body));
      return json(
        200,
        jsonRpcResult(request.id, {
          content: [
            {
              type: 'text',
              text: JSON.stringify(tool.body, null, 2)
            }
          ]
        })
      );
    }

    return json(404, jsonRpcError(request.id, -32601, 'Method not found'));
  }

  function runAgentCommand(command: string, args: Record<string, string> = {}): DatabaseLayerApiResponse {
    if (command === 'databaseLayer.management.get') {
      return json(200, state.managementSurface);
    }
    if (command === 'databaseLayer.capabilities.get') {
      return json(200, capabilitiesIndex());
    }
    if (command === 'databaseLayer.health.get') {
      return json(200, healthStatus());
    }
    if (command === 'databaseLayer.openapi.get') {
      return json(200, openApiContract());
    }
    if (command === 'databaseLayer.contract.audit') {
      return json(200, contractAudit());
    }
    if (command === 'databaseLayer.query.records') {
      return json(200, queryRecords(args));
    }
    if (command === 'databaseLayer.workbench.get') {
      const snapshot = workbenchSnapshot(args);
      if (!snapshot) return json(404, { error: 'topology_record_not_found', recordId: args.recordId });
      return json(200, snapshot);
    }
    if (command === 'databaseLayer.workflow.queue') {
      return json(200, workflowQueue(args));
    }
    if (command === 'databaseLayer.receipts.list') {
      return json(200, receiptLedger(args));
    }
    if (command === 'databaseLayer.topology.get') {
      return json(200, { summary: topologySummary(state.topology), topology: state.topology });
    }
    if (command === 'databaseLayer.topology.records.list') {
      return json(200, { records: listTopologyRecords() });
    }
    if (command === 'databaseLayer.topology.records.get') {
      const recordId = args.recordId;
      if (!recordId) return json(400, { error: 'missing_recordId' });
      const record = getTopologyRecord(recordId);
      if (!record) return json(404, { error: 'topology_record_not_found', recordId });
      return json(200, topologyRecordDetail(record));
    }
    if (command === 'databaseLayer.topology.records.context') {
      const recordId = args.recordId;
      if (!recordId) return json(400, { error: 'missing_recordId' });
      const record = getTopologyRecord(recordId);
      if (!record) return json(404, { error: 'topology_record_not_found', recordId });
      return json(200, topologyRecordContext(record));
    }
    if (command === 'databaseLayer.topology.diagnostics') {
      return json(200, state.topologyDiagnostics ?? {
        resource: state.managementSurface.resources.find((resource) => resource.kind === 'diagnostics'),
        note: 'Topology diagnostics payload was not attached to this management API state.'
      });
    }
    if (command === 'databaseLayer.performance.get') {
      return json(200, state.performanceContract ?? {
        resource: state.managementSurface.resources.find((resource) => resource.kind === 'performance'),
        note: 'Performance contract payload was not attached to this management API state.'
      });
    }
    if (command === 'databaseLayer.organization.review') {
      return json(200, state.organizationReview ?? {
        resource: state.managementSurface.resources.find((resource) => resource.kind === 'organization_review'),
        note: 'Organization review payload was not attached to this management API state.'
      });
    }
    if (command === 'databaseLayer.business.recommendations.get') {
      return json(200, state.businessRecommendations ?? {
        resource: state.managementSurface.resources.find((resource) => resource.kind === 'business_recommendations'),
        note: 'Business operating recommendations payload was not attached to this management API state.'
      });
    }
    if (command === 'databaseLayer.atlasSessions.get') {
      return json(200, state.atlasSession ?? {
        resource: state.managementSurface.resources.find((resource) => resource.kind === 'atlas_session'),
        note: 'Atlas session payload was not attached to this management API state.'
      });
    }
    if (command === 'databaseLayer.canvas.state') {
      const canvasState = sharedCanvasState(args);
      if (!canvasState) return json(404, { error: 'atlas_session_not_found', sessionId: args.sessionId });
      return json(200, canvasState);
    }
    if (command === 'databaseLayer.compute.snapshot') {
      const snapshot = computeSnapshot(args);
      if (!snapshot) return json(404, { error: 'atlas_session_not_found', sessionId: args.sessionId });
      return json(200, snapshot);
    }
    if (command === 'databaseLayer.atlasSessions.viewport') {
      const viewport = atlasViewport(args);
      if (!viewport) return json(404, { error: 'atlas_session_not_found', sessionId: args.sessionId });
      return json(200, viewport);
    }
    if (command === 'databaseLayer.coverage.runtimeBindings') {
      return json(200, state.runtimeBindingCoverage ?? {
        resource: state.managementSurface.resources.find((resource) => resource.kind === 'coverage'),
        note: 'Runtime binding coverage payload was not attached to this management API state.'
      });
    }
    if (command === 'databaseLayer.clientOverlays.list') {
      return json(200, {
        id: state.clientOverlayCoverage?.id ?? 'substrate:create-something:client-overlay-coverage',
        overlays: listClientOverlays()
      });
    }
    if (command === 'databaseLayer.clientOverlays.get') {
      const clientSlug = args.clientSlug;
      if (!clientSlug) return json(400, { error: 'missing_clientSlug' });
      const overlay = getClientOverlay(clientSlug);
      if (!overlay) return json(404, { error: 'client_overlay_not_found', clientSlug });
      return json(200, overlay);
    }
    if (command === 'databaseLayer.operatingSlices.list') {
      return json(200, { slices: listOperatingSlices() });
    }
    if (command === 'databaseLayer.operatingSlices.get') {
      const sliceId = args.sliceId;
      if (!sliceId) return json(400, { error: 'missing_sliceId' });
      const slice = getOperatingSlice(sliceId);
      if (!slice) return json(404, { error: 'slice_not_found', sliceId });
      return json(200, { ...slice, readiness: getOperatingSliceReadiness(slice.id) });
    }
    if (command === 'databaseLayer.operatingSlices.readiness') {
      const sliceId = args.sliceId;
      if (!sliceId) return json(400, { error: 'missing_sliceId' });
      const readiness = getOperatingSliceReadiness(sliceId);
      if (!readiness) return json(404, { error: 'slice_readiness_not_found', sliceId });
      return json(200, readiness);
    }

    const operation = state.managementSurface.operations.find((candidate) => candidate.agentCommand === command);
    if (operation?.requiresApproval) {
      return json(403, {
        error: 'approval_required',
        operation,
        message: operation.mutationBoundary
      });
    }

    return json(404, { error: 'agent_command_not_found', command });
  }

  return {
    handle,
    handleRequest,
    listOperatingSlices,
    getOperatingSlice,
    getOperatingSliceReadiness,
    listClientOverlays,
    getClientOverlay,
    listTopologyRecords,
    getTopologyRecord,
    mcpResources,
    mcpTools,
    readMcpResource,
    callMcpTool,
    handleMcpJsonRpc,
    runAgentCommand
  };
}

export function createDatabaseLayerManagementEdgeAdapter(
  state: DatabaseLayerManagementApiState,
  options: {
    corsOrigin?: string;
    cacheControl?: string;
  } = {}
) {
  const api = createDatabaseLayerManagementApi(state);
  const corsOrigin = options.corsOrigin ?? '*';
  const cacheControl = options.cacheControl ?? 'public, max-age=15';

  function edgeHeaders(response: DatabaseLayerApiResponse, method: string): Record<string, string> {
    const isRead = response.status === 200 && method === 'GET';
    return {
      ...response.headers,
      'access-control-allow-origin': corsOrigin,
      'access-control-allow-methods': 'GET, HEAD, OPTIONS, POST',
      'access-control-allow-headers': 'content-type, authorization',
      'cache-control': isRead ? cacheControl : 'no-store'
    };
  }

  function handleEdgeRequest(request: DatabaseLayerEdgeRequest): DatabaseLayerEdgeResponse {
    const method = request.method.toUpperCase();
    const pathname = normalizePath(request.url);

    if (method === 'OPTIONS') {
      return {
        status: 204,
        headers: {
          'access-control-allow-origin': corsOrigin,
          'access-control-allow-methods': 'GET, HEAD, OPTIONS, POST',
          'access-control-allow-headers': 'content-type, authorization',
          'cache-control': 'no-store'
        },
        bodyText: ''
      };
    }

    if (pathname === '/api/substrate/mcp/rpc' && method === 'POST') {
      const response = api.handleMcpJsonRpc(request.bodyText ?? '');
      return {
        status: response.status,
        headers: edgeHeaders(response, method),
        bodyText: JSON.stringify(response.body, null, 2)
      };
    }

    const response = api.handleRequest({
      method: method === 'HEAD' ? 'GET' : method,
      url: request.url
    });
    return {
      status: response.status,
      headers: edgeHeaders(response, method === 'HEAD' ? 'GET' : method),
      bodyText: method === 'HEAD' ? '' : JSON.stringify(response.body, null, 2)
    };
  }

  return {
    api,
    handleEdgeRequest
  };
}

function defaultWorkerResponseFactory(bodyText: string, init: { status: number; headers: Record<string, string> }) {
  return {
    status: init.status,
    headers: init.headers,
    bodyText
  };
}

function edgeRequestHeaders(headers: unknown): Record<string, string | undefined> | undefined {
  if (!headers) return undefined;
  if (typeof (headers as { entries?: unknown }).entries === 'function') {
    return Object.fromEntries((headers as { entries: () => Iterable<[string, string]> }).entries());
  }
  return headers as Record<string, string | undefined>;
}

export function createDatabaseLayerManagementWorker<TResponse = ReturnType<typeof defaultWorkerResponseFactory>>(
  state: DatabaseLayerManagementApiState,
  options: {
    corsOrigin?: string;
    cacheControl?: string;
    responseFactory?: DatabaseLayerWorkerResponseFactory<TResponse>;
  } = {}
) {
  const edge = createDatabaseLayerManagementEdgeAdapter(state, {
    corsOrigin: options.corsOrigin,
    cacheControl: options.cacheControl
  });
  const responseFactory = options.responseFactory ?? (defaultWorkerResponseFactory as DatabaseLayerWorkerResponseFactory<TResponse>);

  return {
    edge,
    async fetch(request: DatabaseLayerEdgeRequest & { text?: () => Promise<string> }): Promise<TResponse> {
      const method = request.method.toUpperCase();
      const bodyText =
        request.bodyText ??
        (method === 'POST' && typeof request.text === 'function' ? await request.text() : undefined);
      const result = edge.handleEdgeRequest({
        method,
        url: request.url,
        bodyText,
        headers: edgeRequestHeaders(request.headers)
      });
      return responseFactory(result.bodyText, {
        status: result.status,
        headers: result.headers
      });
    }
  };
}

export function createDatabaseLayerManagementApiSummary(managementSurface: DatabaseLayerManagementSurface) {
  return {
    id: managementSurface.id,
    posture: managementSurface.posture,
    resources: managementSurface.resources.length,
    operations: managementSurface.operations.length,
    readOperations: managementSurface.operations.filter((operation) => operation.apiMethod === 'GET').length,
    approvalGatedWriteOperations: managementSurface.operations.filter(
      (operation) => operation.apiMethod !== 'GET' && operation.requiresApproval
    ).length
  };
}
