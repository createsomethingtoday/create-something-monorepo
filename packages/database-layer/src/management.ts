import type {
  DatabaseLayerEdgeRequest,
  DatabaseLayerEdgeResponse,
  DatabaseLayerApiResponse,
  DatabaseLayerInternalTopology,
  DatabaseLayerManagementApiState,
  DatabaseLayerManagementSurface,
  DatabaseLayerOperatingSlice,
  DatabaseLayerOperatingSliceReadinessItem,
  DatabaseLayerTopologyNode,
  DatabaseLayerWorkerResponseFactory
} from './types.js';

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
    apiPath: `/api/substrate/topology/internal/records/${recordSlug}`,
    mcpUri: `substrate://topology/internal/records/${recordSlug}`,
    agentCommand: 'databaseLayer.topology.records.get'
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

export function createDatabaseLayerManagementApi(state: DatabaseLayerManagementApiState) {
  const sliceByKey = bySliceKey(state.operatingSliceReview.slices);
  const readinessByKey = bySliceKey(state.operatingSliceReadiness.items);
  const topologyNodeByKey = byTopologyNodeKey(state.topology.nodes);
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

  function getTopologyRecord(key: string): DatabaseLayerTopologyNode | undefined {
    return topologyNodeByKey.get(decodeURIComponent(key));
  }

  function listTopologyRecords() {
    return state.topology.nodes.map(topologyRecordSummary);
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

  function mcpToolArgs(name: string, key?: string): Record<string, string> {
    if (!key) return {};
    if (name === 'database_layer_get_topology_record') return { recordId: decodeURIComponent(key) };
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

    if (pathname === '/api/substrate/atlas-sessions/create-something-internal-operating-topology') {
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

    if (pathname === '/api/substrate/topology/internal/records') {
      return json(200, {
        topologyId: state.topology.id,
        atlasCanvasId: state.topology.atlasCanvasId,
        records: listTopologyRecords()
      });
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

    if (resource.kind === 'topology') {
      return json(200, { summary: topologySummary(state.topology), topology: state.topology });
    }
    if (resource.kind === 'diagnostics') {
      return json(200, state.topologyDiagnostics ?? {
        resource,
        note: 'Topology diagnostics payload was not attached to this management API state.'
      });
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

    if (name === 'database_layer_list_operating_slices') {
      return json(200, { slices: listOperatingSlices() });
    }
    if (name === 'database_layer_get_topology_diagnostics') {
      return json(200, state.topologyDiagnostics ?? {
        resource: state.managementSurface.resources.find((resource) => resource.kind === 'diagnostics'),
        note: 'Topology diagnostics payload was not attached to this management API state.'
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
    if (command === 'databaseLayer.topology.diagnostics') {
      return json(200, state.topologyDiagnostics ?? {
        resource: state.managementSurface.resources.find((resource) => resource.kind === 'diagnostics'),
        note: 'Topology diagnostics payload was not attached to this management API state.'
      });
    }
    if (command === 'databaseLayer.atlasSessions.get') {
      return json(200, state.atlasSession ?? {
        resource: state.managementSurface.resources.find((resource) => resource.kind === 'atlas_session'),
        note: 'Atlas session payload was not attached to this management API state.'
      });
    }
    if (command === 'databaseLayer.coverage.runtimeBindings') {
      return json(200, state.runtimeBindingCoverage ?? {
        resource: state.managementSurface.resources.find((resource) => resource.kind === 'coverage'),
        note: 'Runtime binding coverage payload was not attached to this management API state.'
      });
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
