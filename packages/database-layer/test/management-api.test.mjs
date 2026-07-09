import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  createDatabaseLayerManagementEdgeAdapter,
  createDatabaseLayerManagementApi,
  createDatabaseLayerManagementApiSummary,
  createDatabaseLayerManagementWorker
} from '../dist/index.js';

const packageRoot = path.resolve(new URL('..', import.meta.url).pathname);
const managementSurface = JSON.parse(
  fs.readFileSync(path.join(packageRoot, 'data', 'create-something-management-surface.json'), 'utf8')
);
const operatingSliceReview = JSON.parse(
  fs.readFileSync(path.join(packageRoot, 'data', 'create-something-operating-slice-review.json'), 'utf8')
);
const operatingSliceReadiness = JSON.parse(
  fs.readFileSync(path.join(packageRoot, 'data', 'create-something-operating-slice-readiness.json'), 'utf8')
);
const topology = JSON.parse(
  fs.readFileSync(path.join(packageRoot, 'data', 'create-something-internal-topology.json'), 'utf8')
);
const atlasSession = JSON.parse(
  fs.readFileSync(path.join(packageRoot, 'data', 'create-something-internal-operating-topology.atlas-session.json'), 'utf8')
);
const clientOverlayCoverage = JSON.parse(
  fs.readFileSync(path.join(packageRoot, 'data', 'create-something-client-overlay-coverage.json'), 'utf8')
);
const agentConfigCoverage = JSON.parse(
  fs.readFileSync(path.join(packageRoot, 'data', 'create-something-agent-config-coverage.json'), 'utf8')
);
const runtimeBindingCoverage = JSON.parse(
  fs.readFileSync(path.join(packageRoot, 'data', 'create-something-runtime-binding-coverage.json'), 'utf8')
);
const topologyDiagnostics = JSON.parse(
  fs.readFileSync(path.join(packageRoot, 'data', 'create-something-topology-diagnostics.json'), 'utf8')
);
const performanceContract = JSON.parse(
  fs.readFileSync(path.join(packageRoot, 'data', 'create-something-performance-contract.json'), 'utf8')
);
const organizationReview = JSON.parse(
  fs.readFileSync(path.join(packageRoot, 'data', 'create-something-organization-review.json'), 'utf8')
);
const businessRecommendations = JSON.parse(
  fs.readFileSync(path.join(packageRoot, 'data', 'create-something-business-operating-recommendations.json'), 'utf8')
);

const managementApiState = {
  managementSurface,
  operatingSliceReview,
  operatingSliceReadiness,
  topology,
  atlasSession,
  clientOverlayCoverage,
  agentConfigCoverage,
  runtimeBindingCoverage,
  topologyDiagnostics,
  performanceContract,
  organizationReview,
  businessRecommendations
};

const api = createDatabaseLayerManagementApi(managementApiState);
const edge = createDatabaseLayerManagementEdgeAdapter(
  managementApiState,
  { corsOrigin: 'https://app-governance-dash.createsomething.agency' }
);
const worker = createDatabaseLayerManagementWorker(
  managementApiState,
  {
    corsOrigin: 'https://app-governance-dash.createsomething.agency',
    responseFactory: (bodyText, init) => ({
      status: init.status,
      headers: init.headers,
      bodyText,
      json: () => JSON.parse(bodyText || '{}')
    })
  }
);

test('management API summarizes the generated control surface', () => {
  const summary = createDatabaseLayerManagementApiSummary(managementSurface);

  assert.equal(summary.id, managementSurface.id);
  assert.equal(summary.posture, 'agent_native');
  assert.equal(summary.resources, managementSurface.resources.length);
  assert.equal(summary.operations, managementSurface.operations.length);
  assert.equal(
    summary.readOperations,
    managementSurface.operations.filter((operation) => operation.apiMethod === 'GET').length
  );
  assert.equal(
    summary.approvalGatedWriteOperations,
    managementSurface.operations.filter((operation) => operation.apiMethod !== 'GET' && operation.requiresApproval).length
  );
});

test('management API exposes a compact capabilities index across API, MCP, and agents', () => {
  const direct = api.handle('GET', '/api/substrate/capabilities');
  const resourceRead = api.readMcpResource('substrate://capabilities');
  const toolCall = api.callMcpTool('database_layer_get_capabilities');
  const agentRead = api.runAgentCommand('databaseLayer.capabilities.get');

  assert.equal(direct.status, 200);
  assert.equal(direct.body.id, `${managementSurface.id}:capabilities`);
  assert.equal(direct.body.posture, 'agent_native');
  assert.equal(direct.body.api.basePath, '/api/substrate');
  assert.equal(direct.body.api.endpoints.length, managementSurface.operations.length);
  assert.ok(direct.body.api.endpoints.some((endpoint) => endpoint.path === '/api/substrate/performance'));
  assert.ok(direct.body.api.endpoints.some((endpoint) => endpoint.path === '/api/substrate/business/recommendations'));
  assert.ok(direct.body.api.endpoints.some((endpoint) => endpoint.path === '/api/substrate/contract/audit'));
  assert.ok(direct.body.api.endpoints.some((endpoint) => endpoint.path === '/api/substrate/atlas-sessions/{sessionId}/canvas-state'));
  assert.ok(direct.body.api.endpoints.some((endpoint) => endpoint.path === '/api/substrate/atlas-sessions/{sessionId}/viewport'));
  assert.ok(direct.body.api.endpoints.some((endpoint) => endpoint.path === '/api/substrate/client-overlays/{clientSlug}'));
  assert.ok(direct.body.api.endpoints.every((endpoint) => endpoint.method && endpoint.path));
  assert.equal(direct.body.mcp.resources, managementSurface.resources.length);
  assert.equal(direct.body.mcp.tools, managementSurface.operations.length);
  assert.ok(direct.body.mcp.sampleResourceUris.includes('substrate://contract/audit'));
  assert.ok(direct.body.mcp.sampleResourceUris.includes('substrate://canvas-state'));
  assert.ok(direct.body.mcp.sampleResourceUris.includes('substrate://atlas-sessions/create-something-internal-operating-topology/viewport'));
  assert.ok(direct.body.mcp.sampleResourceUris.includes('substrate://organization-review'));
  assert.ok(direct.body.mcp.sampleResourceUris.includes('substrate://business/recommendations'));
  assert.ok(direct.body.mcp.sampleResourceUris.includes('substrate://client-overlays'));
  assert.ok(direct.body.mcp.sampleTools.includes('database_layer_get_contract_audit'));
  assert.ok(direct.body.mcp.sampleTools.includes('database_layer_get_canvas_state'));
  assert.ok(direct.body.mcp.sampleTools.includes('database_layer_get_atlas_viewport'));
  assert.ok(direct.body.mcp.sampleTools.includes('database_layer_get_organization_review'));
  assert.ok(direct.body.mcp.sampleTools.includes('database_layer_get_business_recommendations'));
  assert.ok(direct.body.mcp.sampleTools.includes('database_layer_get_client_overlay'));
  assert.ok(direct.body.agent.commands.includes('databaseLayer.contract.audit'));
  assert.ok(direct.body.agent.commands.includes('databaseLayer.canvas.state'));
  assert.ok(direct.body.agent.commands.includes('databaseLayer.atlasSessions.viewport'));
  assert.ok(direct.body.agent.commands.includes('databaseLayer.organization.review'));
  assert.ok(direct.body.agent.commands.includes('databaseLayer.business.recommendations.get'));
  assert.ok(direct.body.agent.commands.includes('databaseLayer.clientOverlays.get'));
  assert.equal(direct.body.approval.requiredForWrites, true);
  assert.equal(direct.body.performance.baseline, performanceContract.baseline);
  assert.equal(direct.body.performance.fastPathCount, performanceContract.fastPath.length);

  assert.equal(resourceRead.status, 200);
  assert.equal(resourceRead.body.id, direct.body.id);
  assert.equal(toolCall.status, 200);
  assert.equal(toolCall.body.id, direct.body.id);
  assert.equal(agentRead.status, 200);
  assert.equal(agentRead.body.id, direct.body.id);
});

test('management API exposes an OpenAPI contract across API, MCP, and agents', () => {
  const direct = api.handle('GET', '/api/substrate/openapi.json');
  const resourceRead = api.readMcpResource('substrate://openapi');
  const toolCall = api.callMcpTool('database_layer_get_openapi');
  const agentRead = api.runAgentCommand('databaseLayer.openapi.get');

  assert.equal(direct.status, 200);
  assert.equal(direct.body.openapi, '3.1.0');
  assert.equal(direct.body.info.title, 'CREATE SOMETHING Substrate Database Layer API');
  assert.equal(direct.body.servers[0].url, '/api/substrate');
  assert.ok(direct.body.paths['/capabilities'].get);
  assert.ok(direct.body.paths['/contract/audit'].get);
  assert.ok(direct.body.paths['/topology/internal'].get);
  assert.ok(direct.body.paths['/atlas-sessions/{sessionId}'].get);
  assert.ok(direct.body.paths['/atlas-sessions/{sessionId}/canvas-state'].get);
  assert.ok(direct.body.paths['/atlas-sessions/{sessionId}/viewport'].get);
  assert.ok(direct.body.paths['/coverage/runtime-bindings/cloudflare'].get);
  assert.ok(direct.body.paths['/performance'].get);
  assert.ok(direct.body.paths['/business/recommendations'].get);
  assert.ok(direct.body.paths['/client-overlays'].get);
  assert.ok(direct.body.paths['/client-overlays/{clientSlug}'].get);
  assert.ok(direct.body.paths['/operating-slices/{sliceId}'].get);
  assert.ok(direct.body.paths['/operating-slices/{sliceId}/readiness'].get);
  assert.equal(
    direct.body.paths['/topology/internal'].get.operationId,
    'database_layer_get_topology'
  );
  assert.equal(
    direct.body.paths['/atlas-sessions/{sessionId}'].get.operationId,
    'database_layer_get_atlas_session'
  );
  assert.equal(
    direct.body.paths['/atlas-sessions/{sessionId}/canvas-state'].get.operationId,
    'database_layer_get_canvas_state'
  );
  assert.equal(
    direct.body.paths['/atlas-sessions/{sessionId}/viewport'].get.operationId,
    'database_layer_get_atlas_viewport'
  );
  assert.equal(
    direct.body.paths['/operating-slices/{sliceId}/promotion-proposals'].post['x-requires-approval'],
    true
  );
  assert.equal(
    direct.body.paths['/topology/internal/records/{recordId}'].get.operationId,
    'database_layer_get_topology_record'
  );
  assert.equal(
    direct.body.paths['/capabilities'].get['x-agent-command'],
    'databaseLayer.capabilities.get'
  );
  assert.equal(
    direct.body.paths['/contract/audit'].get.operationId,
    'database_layer_get_contract_audit'
  );
  assert.equal(
    direct.body.paths['/openapi.json'].get['x-mcp-tool'],
    'database_layer_get_openapi'
  );

  assert.equal(resourceRead.status, 200);
  assert.equal(resourceRead.body.openapi, direct.body.openapi);
  assert.equal(toolCall.status, 200);
  assert.equal(toolCall.body.info.title, direct.body.info.title);
  assert.equal(agentRead.status, 200);
  assert.equal(agentRead.body.paths['/openapi.json'].get.operationId, 'database_layer_get_openapi');
});

test('management API exposes business recommendations across API, MCP, and agents', () => {
  const direct = api.handle('GET', '/api/substrate/business/recommendations');
  const resourceRead = api.readMcpResource('substrate://business/recommendations');
  const toolCall = api.callMcpTool('database_layer_get_business_recommendations');
  const agentRead = api.runAgentCommand('databaseLayer.business.recommendations.get');

  assert.equal(direct.status, 200);
  assert.equal(direct.body.id, businessRecommendations.id);
  assert.equal(direct.body.summary.operationalizedLanes, 4);
  assert.deepEqual(
    direct.body.lanes.map((lane) => lane.sourceMoveId).sort(),
    [
      'attach_policy_to_slices',
      'promote_database_layer_as_product_surface',
      'review_worker_runtime_slice_first',
      'turn_client_overlays_into_repeatable_delivery'
    ]
  );
  assert.equal(resourceRead.status, 200);
  assert.equal(resourceRead.body.id, direct.body.id);
  assert.equal(toolCall.status, 200);
  assert.equal(toolCall.body.summary.clientDeliveryPackets, direct.body.summary.clientDeliveryPackets);
  assert.equal(agentRead.status, 200);
  assert.equal(agentRead.body.summary.policyGuideAttachments, direct.body.summary.policyGuideAttachments);
});

test('management API exposes a self-auditing contract report across API, MCP, and agents', () => {
  const direct = api.handle('GET', '/api/substrate/contract/audit');
  const resourceRead = api.readMcpResource('substrate://contract/audit');
  const toolCall = api.callMcpTool('database_layer_get_contract_audit');
  const agentRead = api.runAgentCommand('databaseLayer.contract.audit');

  assert.equal(direct.status, 200);
  assert.equal(direct.body.id, `${managementSurface.id}:contract-audit`);
  assert.equal(direct.body.status, 'pass');
  assert.equal(direct.body.summary.resources, managementSurface.resources.length);
  assert.equal(direct.body.summary.operations, managementSurface.operations.length);
  assert.equal(direct.body.summary.unmatchedResourceCount, 0);
  assert.equal(direct.body.summary.duplicateOperationPathCount, 0);
  assert.equal(direct.body.summary.ungatedWriteOperationCount, 0);
  assert.equal(direct.body.summary.readOperationCoverageCount, managementSurface.resources.length);
  assert.ok(
    direct.body.resourceCoverage.byOperation.find(
      (entry) => entry.operationId === 'database_layer_get_topology_record'
    ).resourceCount >= topology.nodes.length
  );
  assert.equal(direct.body.approval.writeOperationsApprovalGated, true);
  assert.ok(direct.body.endpoints.openapi.endsWith('/openapi.json'));

  assert.equal(resourceRead.status, 200);
  assert.equal(resourceRead.body.status, 'pass');
  assert.equal(toolCall.status, 200);
  assert.deepEqual(toolCall.body.summary, direct.body.summary);
  assert.equal(agentRead.status, 200);
  assert.deepEqual(agentRead.body.resourceCoverage.byOperation, direct.body.resourceCoverage.byOperation);
});

test('management API exposes bounded Atlas viewport reads across API, MCP, and agents', () => {
  const root = atlasSession.canvas.nodes.find((node) => node.atlasId === topology.rootNodeId);
  const viewportPath =
    `/api/substrate/atlas-sessions/${encodeURIComponent(atlasSession.id)}/viewport` +
    `?x=${root.x - 20}&y=${root.y - 20}&width=360&height=260&zoom=1&limit=20`;
  const direct = api.handle('GET', viewportPath);
  const resourceRead = api.readMcpResource('substrate://atlas-sessions/create-something-internal-operating-topology/viewport');
  const toolCall = api.callMcpTool('database_layer_get_atlas_viewport', {
    sessionId: atlasSession.id,
    x: String(root.x - 20),
    y: String(root.y - 20),
    width: '360',
    height: '260',
    zoom: '1',
    limit: '20'
  });
  const agentRead = api.runAgentCommand('databaseLayer.atlasSessions.viewport', {
    sessionId: atlasSession.id,
    x: String(root.x - 20),
    y: String(root.y - 20),
    width: '360',
    height: '260',
    zoom: '1',
    limit: '20'
  });

  assert.equal(direct.status, 200);
  assert.equal(direct.body.id, `${managementSurface.id}:atlas-viewport:${atlasSession.id}`);
  assert.equal(direct.body.sessionId, atlasSession.id);
  assert.equal(direct.body.summary.totalNodes, atlasSession.canvas.nodes.length);
  assert.equal(direct.body.summary.totalEdges, atlasSession.canvas.edges.length);
  assert.ok(direct.body.summary.visibleNodes > 0);
  assert.ok(direct.body.summary.visibleNodes <= 20);
  assert.ok(direct.body.summary.omittedNodes >= 0);
  assert.equal(direct.body.viewport.zoom, 1);
  assert.ok(direct.body.nodes.some((node) => node.id === root.id && node.atlasId === topology.rootNodeId));
  assert.ok(direct.body.nodes.every((node) => typeof node.x === 'number' && typeof node.y === 'number'));
  assert.ok(direct.body.edges.every((edge) =>
    direct.body.nodes.some((node) => node.id === edge.source) &&
    direct.body.nodes.some((node) => node.id === edge.target)
  ));
  assert.ok(['detail', 'compact', 'skeleton'].includes(direct.body.rendering.lod));
  assert.ok(direct.body.endpoints.fullSession.includes('/atlas-sessions/'));

  assert.equal(resourceRead.status, 200);
  assert.equal(resourceRead.body.summary.totalNodes, atlasSession.canvas.nodes.length);
  assert.equal(toolCall.status, 200);
  assert.deepEqual(toolCall.body.nodes, direct.body.nodes);
  assert.equal(agentRead.status, 200);
  assert.deepEqual(agentRead.body.viewport, direct.body.viewport);
});

test('management API exposes shared canvas state across API, MCP, and agents', () => {
  const root = atlasSession.canvas.nodes.find((node) => node.atlasId === topology.rootNodeId);
  const statePath =
    `/api/substrate/atlas-sessions/${encodeURIComponent(atlasSession.id)}/canvas-state` +
    `?x=${root.x - 20}&y=${root.y - 20}&width=720&height=360&zoom=1&limit=20&lens=story&selectedNodeId=${root.id}`;
  const direct = api.handle('GET', statePath);
  const canonical = api.handle('GET', '/api/substrate/canvas-state?limit=20');
  const resourceRead = api.readMcpResource('substrate://canvas-state');
  const toolCall = api.callMcpTool('database_layer_get_canvas_state', {
    sessionId: atlasSession.id,
    x: String(root.x - 20),
    y: String(root.y - 20),
    width: '720',
    height: '360',
    zoom: '1',
    limit: '20',
    lens: 'story',
    selectedNodeId: root.id
  });
  const agentRead = api.runAgentCommand('databaseLayer.canvas.state', {
    sessionId: atlasSession.id,
    x: String(root.x - 20),
    y: String(root.y - 20),
    width: '720',
    height: '360',
    zoom: '1',
    limit: '20',
    lens: 'story',
    selectedNodeId: root.id
  });

  assert.equal(direct.status, 200);
  assert.equal(direct.body.version, 'flow.shared-canvas-state.v1');
  assert.equal(direct.body.renderer, 'canvas-kernel');
  assert.equal(direct.body.source, 'atlas-session');
  assert.equal(direct.body.sessionId, atlasSession.id);
  assert.equal(direct.body.topologyId, topology.id);
  assert.equal(direct.body.atlasCanvasId, topology.atlasCanvasId);
  assert.equal(direct.body.storyStepId, atlasSession.story.activeStepId);
  assert.equal(direct.body.selectedNodeId, root.id);
  assert.equal(direct.body.lens, 'story');
  assert.equal(direct.body.counts.totalNodes, topology.nodes.length);
  assert.equal(direct.body.counts.totalEdges, topology.edges.length);
  assert.ok(direct.body.counts.visibleNodes > 0);
  assert.ok(direct.body.counts.visibleNodes <= 20);
  assert.equal(direct.body.visibleNodeIds.length, direct.body.nodes.length);
  assert.equal(direct.body.visibleEdgeIds.length, direct.body.edges.length);
  assert.ok(direct.body.nodes.some((node) => node.id === root.id && node.sourceRecordId === topology.rootNodeId));
  assert.ok(direct.body.joins.some((join) => join.atlasNodeId === root.id && join.topologyNodeId === topology.rootNodeId));
  assert.ok(direct.body.endpoints.canvasState.endsWith('/canvas-state'));
  assert.ok(direct.body.endpoints.atlasViewport.endsWith('/viewport'));

  assert.equal(canonical.status, 200);
  assert.equal(canonical.body.version, 'flow.shared-canvas-state.v1');
  assert.equal(resourceRead.status, 200);
  assert.equal(resourceRead.body.renderer, 'canvas-kernel');
  assert.equal(toolCall.status, 200);
  assert.deepEqual(toolCall.body.visibleNodeIds, direct.body.visibleNodeIds);
  assert.equal(agentRead.status, 200);
  assert.deepEqual(agentRead.body.viewport, direct.body.viewport);
});

test('management API exposes Substrate compute snapshot across API, MCP, and agents', () => {
  const root = topology.nodes.find((node) => node.id === topology.rootNodeId);
  const direct = api.handle(
    'GET',
    `/api/substrate/atlas-sessions/${encodeURIComponent(atlasSession.id)}/compute-snapshot?sourceNodeId=${encodeURIComponent(root.id)}&maxDepth=2&limit=12&scenario=remove-stripe`
  );
  const canonical = api.handle('GET', '/api/substrate/compute-snapshot?limit=12');
  const resourceRead = api.readMcpResource('substrate://compute-snapshot');
  const toolCall = api.callMcpTool('database_layer_get_compute_snapshot', {
    sessionId: atlasSession.id,
    sourceNodeId: root.id,
    maxDepth: '2',
    limit: '12',
    scenario: 'remove-stripe'
  });
  const agentRead = api.runAgentCommand('databaseLayer.compute.snapshot', {
    sessionId: atlasSession.id,
    sourceNodeId: root.id,
    maxDepth: '2',
    limit: '12',
    scenario: 'remove-stripe'
  });

  assert.equal(direct.status, 200);
  assert.equal(direct.body.version, 'flow.substrate-compute-snapshot.v1');
  assert.equal(direct.body.engine, 'cpu');
  assert.equal(direct.body.source, 'atlas-session');
  assert.equal(direct.body.sessionId, atlasSession.id);
  assert.equal(direct.body.topologyId, topology.id);
  assert.equal(direct.body.atlasCanvasId, topology.atlasCanvasId);
  assert.equal(direct.body.scenario.sourceNodeId, root.id);
  assert.equal(direct.body.scenario.maxDepth, 2);
  assert.equal(direct.body.counts.nodes, topology.nodes.length);
  assert.equal(direct.body.counts.edges, topology.edges.length);
  assert.equal(direct.body.buffers.nodeIds.length, topology.nodes.length);
  assert.equal(direct.body.buffers.edgeIds.length, topology.edges.length);
  assert.equal(direct.body.buffers.edgeSources.length, topology.edges.length);
  assert.equal(direct.body.buffers.edgeTargets.length, topology.edges.length);
  assert.ok(direct.body.outputs.impact.some((item) => item.nodeId === root.id && item.score === 1));
  assert.ok(direct.body.outputs.attention.length > 0);
  assert.ok(direct.body.outputs.bottlenecks.length > 0);
  assert.ok(direct.body.outputs.agentWorkQueue.length > 0);
  assert.ok(direct.body.endpoints.computeSnapshot.endsWith('/compute-snapshot'));
  assert.ok(direct.body.endpoints.canvasState.endsWith('/canvas-state'));

  assert.equal(canonical.status, 200);
  assert.equal(canonical.body.version, 'flow.substrate-compute-snapshot.v1');
  assert.equal(resourceRead.status, 200);
  assert.equal(resourceRead.body.version, 'flow.substrate-compute-snapshot.v1');
  assert.equal(toolCall.status, 200);
  assert.deepEqual(toolCall.body.outputs.impact, direct.body.outputs.impact);
  assert.equal(agentRead.status, 200);
  assert.deepEqual(agentRead.body.buffers.edgeSources, direct.body.buffers.edgeSources);
});

test('management API exposes Substrate health across API, MCP, and agents', () => {
  const direct = api.handle('GET', '/api/substrate/health');
  const resourceRead = api.readMcpResource('substrate://health');
  const toolCall = api.callMcpTool('database_layer_get_health');
  const agentRead = api.runAgentCommand('databaseLayer.health.get');

  assert.equal(direct.status, 200);
  assert.equal(direct.body.status, 'ok');
  assert.equal(direct.body.id, `${managementSurface.id}:health`);
  assert.equal(direct.body.runtime, 'substrate');
  assert.equal(direct.body.topology.nodes, topology.nodes.length);
  assert.equal(direct.body.topology.edges, topology.edges.length);
  assert.equal(direct.body.management.resources, managementSurface.resources.length);
  assert.equal(direct.body.management.operations, managementSurface.operations.length);
  assert.equal(
    direct.body.management.readOperations,
    managementSurface.operations.filter((operation) => operation.apiMethod === 'GET').length
  );
  assert.equal(direct.body.approval.writeOperationsApprovalGated, true);
  assert.equal(direct.body.performance.baseline, performanceContract.baseline);
  assert.equal(direct.body.cloudflare.cacheControl, 'public, max-age=15');
  assert.ok(direct.body.endpoints.capabilities.endsWith('/capabilities'));
  assert.ok(direct.body.endpoints.openapi.endsWith('/openapi.json'));

  assert.equal(resourceRead.status, 200);
  assert.equal(resourceRead.body.status, 'ok');
  assert.equal(toolCall.status, 200);
  assert.equal(toolCall.body.status, 'ok');
  assert.equal(agentRead.status, 200);
  assert.equal(agentRead.body.status, 'ok');
});

test('management API queries topology records across API, MCP, and agents', () => {
  const direct = api.handle('GET', '/api/substrate/query?q=wrangler&surface=worker&tier=Automation&limit=5');
  const resourceRead = api.readMcpResource('substrate://query');
  const toolCall = api.callMcpTool('database_layer_query_records', {
    q: 'wrangler',
    surface: 'worker',
    tier: 'Automation',
    limit: '5'
  });
  const agentRead = api.runAgentCommand('databaseLayer.query.records', {
    q: 'wrangler',
    surface: 'worker',
    tier: 'Automation',
    limit: '5'
  });

  assert.equal(direct.status, 200);
  assert.equal(direct.body.id, `${managementSurface.id}:query`);
  assert.equal(direct.body.filters.q, 'wrangler');
  assert.equal(direct.body.filters.surface, 'worker');
  assert.equal(direct.body.filters.tier, 'Automation');
  assert.equal(direct.body.limit, 5);
  assert.ok(direct.body.total > 0);
  assert.ok(direct.body.records.length > 0);
  assert.ok(direct.body.records.length <= 5);
  assert.ok(direct.body.records.every((record) => record.surface === 'worker'));
  assert.ok(direct.body.records.every((record) => record.tier === 'Automation'));
  assert.ok(
    direct.body.records.every((record) =>
      `${record.title} ${record.path} ${record.id}`.toLowerCase().includes('wrangler')
    )
  );

  assert.equal(resourceRead.status, 200);
  assert.equal(resourceRead.body.records.length, 25);
  assert.equal(toolCall.status, 200);
  assert.deepEqual(toolCall.body.records, direct.body.records);
  assert.equal(agentRead.status, 200);
  assert.deepEqual(agentRead.body.records, direct.body.records);
});

test('management API exposes a fast topology workbench snapshot across API, MCP, and agents', () => {
  const root = topology.nodes.find((node) => node.id === topology.rootNodeId);
  const direct = api.handle(
    'GET',
    `/api/substrate/workbench?q=wrangler&surface=worker&tier=Automation&limit=5&recordId=${encodeURIComponent(root.atlasNodeId)}`
  );
  const resourceRead = api.readMcpResource('substrate://workbench');
  const toolCall = api.callMcpTool('database_layer_get_workbench', {
    q: 'wrangler',
    surface: 'worker',
    tier: 'Automation',
    limit: '5',
    recordId: root.atlasNodeId
  });
  const agentRead = api.runAgentCommand('databaseLayer.workbench.get', {
    q: 'wrangler',
    surface: 'worker',
    tier: 'Automation',
    limit: '5',
    recordId: root.atlasNodeId
  });

  assert.equal(direct.status, 200);
  assert.equal(direct.body.id, `${managementSurface.id}:workbench`);
  assert.equal(direct.body.topology.nodes, topology.nodes.length);
  assert.equal(direct.body.query.records.length, 5);
  assert.equal(direct.body.query.records.every((record) => record.surface === 'worker'), true);
  assert.equal(direct.body.query.records.every((record) => record.tier === 'Automation'), true);
  assert.equal(direct.body.selectedContext.record.id, topology.rootNodeId);
  assert.equal(direct.body.selectedContext.atlas.node.id, root.atlasNodeId);
  assert.ok(direct.body.facets.surface.find((facet) => facet.value === 'worker').count > 0);
  assert.ok(direct.body.facets.tier.find((facet) => facet.value === 'Automation').count > 0);
  assert.ok(direct.body.facets.status.find((facet) => facet.value === 'mapped').count > 0);
  assert.ok(direct.body.endpoints.query.endsWith('/query'));
  assert.ok(direct.body.endpoints.selectedContext.endsWith('/context'));

  assert.equal(resourceRead.status, 200);
  assert.equal(resourceRead.body.id, direct.body.id);
  assert.equal(resourceRead.body.query.records.length, 25);
  assert.equal(toolCall.status, 200);
  assert.deepEqual(toolCall.body.query.records, direct.body.query.records);
  assert.equal(agentRead.status, 200);
  assert.deepEqual(agentRead.body.facets.surface, direct.body.facets.surface);
});

test('management API exposes workflow queue actions across API, MCP, and agents', () => {
  const direct = api.handle('GET', '/api/substrate/workflow/queue?state=wait&source=agent_config&limit=5');
  const resourceRead = api.readMcpResource('substrate://workflow/queue');
  const toolCall = api.callMcpTool('database_layer_get_workflow_queue', {
    state: 'wait',
    source: 'agent_config',
    limit: '5'
  });
  const agentRead = api.runAgentCommand('databaseLayer.workflow.queue', {
    state: 'wait',
    source: 'agent_config',
    limit: '5'
  });

  assert.equal(direct.status, 200);
  assert.equal(direct.body.id, `${managementSurface.id}:workflow-queue`);
  assert.equal(direct.body.filters.state, 'wait');
  assert.equal(direct.body.filters.source, 'agent_config');
  assert.equal(direct.body.actions.length, 5);
  assert.ok(direct.body.summary.totalActions > direct.body.actions.length);
  assert.ok(direct.body.summary.bySource.find((entry) => entry.value === 'agent_config').count >= 40);
  assert.ok(direct.body.summary.bySource.find((entry) => entry.value === 'runtime_binding').count >= 99);
  assert.ok(direct.body.summary.bySource.find((entry) => entry.value === 'operating_slice').count >= 22);
  assert.ok(direct.body.summary.byState.find((entry) => entry.value === 'wait').count > 0);
  assert.equal(direct.body.actions.every((action) => action.state === 'wait'), true);
  assert.equal(direct.body.actions.every((action) => action.sourceKind === 'agent_config'), true);
  assert.ok(direct.body.actions[0].recordContextApiPath.endsWith('/context'));
  assert.ok(direct.body.receipts.total >= direct.body.summary.totalActions);
  assert.ok(direct.body.receipts.recent.length > 0);
  assert.ok(direct.body.endpoints.workbench.endsWith('/workbench'));

  assert.equal(resourceRead.status, 200);
  assert.equal(resourceRead.body.actions.length, 25);
  assert.equal(toolCall.status, 200);
  assert.deepEqual(toolCall.body.actions, direct.body.actions);
  assert.equal(agentRead.status, 200);
  assert.deepEqual(agentRead.body.summary.bySource, direct.body.summary.bySource);
});

test('management API exposes receipt ledger proof across API, MCP, and agents', () => {
  const root = topology.nodes.find((node) => node.id === topology.rootNodeId);
  const direct = api.handle(
    'GET',
    `/api/substrate/receipts?recordId=${encodeURIComponent(root.atlasNodeId)}&type=proof&source=atlas&limit=5`
  );
  const resourceRead = api.readMcpResource('substrate://receipts');
  const toolCall = api.callMcpTool('database_layer_list_receipts', {
    recordId: root.atlasNodeId,
    type: 'proof',
    source: 'atlas',
    limit: '5'
  });
  const agentRead = api.runAgentCommand('databaseLayer.receipts.list', {
    recordId: root.atlasNodeId,
    type: 'proof',
    source: 'atlas',
    limit: '5'
  });

  assert.equal(direct.status, 200);
  assert.equal(direct.body.id, `${managementSurface.id}:receipts`);
  assert.equal(direct.body.filters.recordId, root.atlasNodeId);
  assert.equal(direct.body.filters.type, 'proof');
  assert.equal(direct.body.filters.source, 'atlas');
  assert.ok(direct.body.summary.totalReceipts >= topology.nodes.length);
  assert.equal(direct.body.summary.filteredReceipts, 1);
  assert.equal(direct.body.receipts.length, 1);
  assert.equal(direct.body.receipts[0].recordId, topology.rootNodeId);
  assert.equal(direct.body.receipts[0].type, 'proof');
  assert.equal(direct.body.receipts[0].sourceKind, 'atlas');
  assert.ok(direct.body.receipts[0].recordContextApiPath.endsWith('/context'));
  assert.ok(direct.body.summary.bySource.find((entry) => entry.value === 'runtime_binding').count >= 99);
  assert.ok(direct.body.summary.bySource.find((entry) => entry.value === 'agent_config').count >= 40);
  assert.ok(direct.body.summary.bySource.find((entry) => entry.value === 'atlas').count >= topology.nodes.length);
  assert.ok(direct.body.endpoints.workflowQueue.endsWith('/workflow/queue'));

  assert.equal(resourceRead.status, 200);
  assert.equal(resourceRead.body.receipts.length, 25);
  assert.equal(toolCall.status, 200);
  assert.deepEqual(toolCall.body.receipts, direct.body.receipts);
  assert.equal(agentRead.status, 200);
  assert.deepEqual(agentRead.body.summary.byType, direct.body.summary.byType);
});

test('management API lists operating slices through a Cloudflare-compatible request shape', () => {
  const response = api.handleRequest({
    method: 'GET',
    url: 'https://substrate.local/api/substrate/operating-slices'
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers['content-type'], 'application/json; charset=utf-8');
  assert.equal(response.body.slices.length, operatingSliceReview.slices.length);
  assert.equal(response.body.slices[0].title, 'Automation worker Atlas coverage');
  assert.equal(response.body.slices[0].productionStatus, 'approval_required');
});

test('management API reads slice detail and readiness by stable slug', () => {
  const first = api.listOperatingSlices()[0];
  const sliceResponse = api.handle('GET', first.apiPath);
  const readinessResponse = api.handle('GET', first.readinessApiPath);

  assert.equal(sliceResponse.status, 200);
  assert.equal(sliceResponse.body.id, operatingSliceReview.slices[0].id);
  assert.equal(sliceResponse.body.readiness.productionStatus, 'approval_required');

  assert.equal(readinessResponse.status, 200);
  assert.equal(readinessResponse.body.sliceId, operatingSliceReview.slices[0].id);
  assert.equal(readinessResponse.body.workerRuntime.runtimeConfigRecords, runtimeBindingCoverage.records.length);
});

test('management API serves Atlas session and runtime coverage resources as payloads', () => {
  const atlasResource = managementSurface.resources.find((resource) => resource.kind === 'atlas_session');
  const coverageResource = managementSurface.resources.find((resource) => resource.kind === 'coverage');

  const atlasDirect = api.handle('GET', atlasResource.apiPath);
  const atlasMcp = api.readMcpResource(atlasResource.mcpUri);
  const coverageDirect = api.handle('GET', coverageResource.apiPath);
  const coverageMcp = api.readMcpResource(coverageResource.mcpUri);

  assert.equal(atlasDirect.status, 200);
  assert.equal(atlasDirect.body.id, atlasSession.id);
  assert.equal(atlasMcp.status, 200);
  assert.equal(atlasMcp.body.id, atlasSession.id);
  assert.equal(coverageDirect.status, 200);
  assert.equal(coverageDirect.body.records.length, runtimeBindingCoverage.records.length);
  assert.equal(coverageMcp.status, 200);
  assert.equal(coverageMcp.body.records.length, runtimeBindingCoverage.records.length);
});

test('management API lazy-loads client overlay details across API, MCP, and agents', () => {
  const list = api.handle('GET', '/api/substrate/client-overlays');
  const outerfields = list.body.overlays.find((overlay) => overlay.clientSlug === 'outerfields');
  const detail = api.handle('GET', outerfields.apiPath);
  const byPackageRecord = api.handle(
    'GET',
    `/api/substrate/client-overlays/${encodeURIComponent(clientOverlayCoverage.overlays.find((overlay) => overlay.clientSlug === 'outerfields').packages[0].recordId)}`
  );
  const resource = managementSurface.resources.find(
    (candidate) => candidate.kind === 'client_overlay' && candidate.recordId === 'outerfields'
  );
  const resourceRead = api.readMcpResource(resource.mcpUri);
  const listTool = api.callMcpTool('database_layer_list_client_overlays');
  const detailTool = api.callMcpTool('database_layer_get_client_overlay', { clientSlug: 'outerfields' });
  const agentRead = api.runAgentCommand('databaseLayer.clientOverlays.get', { clientSlug: 'outerfields' });

  assert.equal(list.status, 200);
  assert.equal(list.body.overlays.length, clientOverlayCoverage.overlays.length);
  assert.equal(outerfields.packageCount, 3);
  assert.equal(detail.status, 200);
  assert.equal(detail.body.clientSlug, 'outerfields');
  assert.equal(detail.body.packages.length, 3);
  assert.ok(detail.body.packages.some((pkg) => pkg.workerConfigs.length > 0));
  assert.equal(byPackageRecord.status, 200);
  assert.equal(byPackageRecord.body.clientSlug, 'outerfields');
  assert.equal(resourceRead.status, 200);
  assert.equal(resourceRead.body.clientSlug, 'outerfields');
  assert.equal(listTool.status, 200);
  assert.equal(listTool.body.overlays.length, clientOverlayCoverage.overlays.length);
  assert.equal(detailTool.status, 200);
  assert.equal(detailTool.body.clientSlug, 'outerfields');
  assert.equal(agentRead.status, 200);
  assert.equal(agentRead.body.clientSlug, 'outerfields');
});

test('management API lists and reads topology records by stable endpoint key', () => {
  const recordsResponse = api.handle('GET', '/api/substrate/topology/internal/records');
  const root = recordsResponse.body.records.find((record) => record.id === topology.rootNodeId);
  const byApiPath = api.handle('GET', root.apiPath);
  const byAtlasNodeId = api.handle('GET', `/api/substrate/topology/internal/records/${root.atlasNodeId}`);

  assert.equal(recordsResponse.status, 200);
  assert.equal(recordsResponse.body.records.length, topology.nodes.length);
  assert.equal(root.agentCommand, 'databaseLayer.topology.records.get');

  assert.equal(byApiPath.status, 200);
  assert.equal(byApiPath.body.record.id, topology.rootNodeId);
  assert.equal(byApiPath.body.resource.apiPath, root.apiPath);
  assert.ok(Array.isArray(byApiPath.body.outgoingEdges));
  assert.ok(byApiPath.body.relatedRecordIds.length > 0);

  assert.equal(byAtlasNodeId.status, 200);
  assert.equal(byAtlasNodeId.body.id, topology.rootNodeId);
});

test('management API reads compact topology record context across API, MCP, and agents', () => {
  const root = api.listTopologyRecords().find((record) => record.id === topology.rootNodeId);
  const direct = api.handle('GET', `${root.apiPath}/context`);
  const toolCall = api.callMcpTool('database_layer_get_topology_record_context', {
    recordId: root.slug
  });
  const agentRead = api.runAgentCommand('databaseLayer.topology.records.context', {
    recordId: root.slug
  });

  assert.equal(direct.status, 200);
  assert.equal(direct.body.id, `${managementSurface.id}:record-context:${root.slug}`);
  assert.equal(direct.body.record.id, topology.rootNodeId);
  assert.equal(direct.body.resource.apiPath, root.apiPath);
  assert.equal(direct.body.atlas.node.id, root.atlasNodeId);
  assert.equal(direct.body.atlas.node.atlasId, topology.rootNodeId);
  assert.ok(direct.body.atlas.bindings.length > 0);
  assert.ok(direct.body.proof.receipts.length > 0);
  assert.ok(direct.body.topology.outgoingEdges.length > 0);
  assert.ok(direct.body.topology.relatedRecords.length > 0);
  assert.equal(direct.body.workflow.actions.length, 0);
  assert.ok(direct.body.endpoints.record.endsWith(root.slug));
  assert.ok(direct.body.endpoints.query.endsWith('/query'));
  assert.ok(direct.body.endpoints.atlasSession.includes('/atlas-sessions/'));

  assert.equal(toolCall.status, 200);
  assert.deepEqual(toolCall.body.record, direct.body.record);
  assert.equal(agentRead.status, 200);
  assert.deepEqual(agentRead.body.atlas.node, direct.body.atlas.node);
});

test('management API exposes topology diagnostics as Atlas business health', () => {
  const response = api.handle('GET', '/api/substrate/topology/internal/diagnostics');

  assert.equal(response.status, 200);
  assert.equal(response.body.id, topologyDiagnostics.id);
  assert.equal(response.body.summary.valueState, 'connected_map_with_review_signals');
  assert.equal(response.body.summary.hardGapCount, 0);
  assert.equal(response.body.summary.exactDuplicatePathCount, 0);
  assert.equal(response.body.summary.isolatedNodeCount, 0);
  assert.ok(
    response.body.signals.some(
      (signal) => signal.id === 'automation_database_balance' && signal.classification === 'review_signal'
    )
  );
});

test('management API exposes the Substrate performance contract across API, MCP, and agents', () => {
  const performanceResource = managementSurface.resources.find((resource) => resource.kind === 'performance');
  const direct = api.handle('GET', '/api/substrate/performance');
  const resourceRead = api.readMcpResource(performanceResource.mcpUri);
  const toolCall = api.callMcpTool('database_layer_get_performance_contract');
  const agentRead = api.runAgentCommand('databaseLayer.performance.get');

  assert.equal(direct.status, 200);
  assert.equal(direct.body.id, performanceContract.id);
  assert.equal(direct.body.summary.topologyRecords, topology.nodes.length);
  assert.equal(direct.body.summary.managementResources, managementSurface.resources.length);
  assert.ok(direct.body.budgets.some((budget) => budget.label === 'Record navigation'));
  assert.ok(direct.body.fastPath.some((item) => item.id === 'precomputed-management-surface'));

  assert.equal(resourceRead.status, 200);
  assert.equal(resourceRead.body.id, performanceContract.id);
  assert.equal(toolCall.status, 200);
  assert.equal(toolCall.body.id, performanceContract.id);
  assert.equal(agentRead.status, 200);
  assert.equal(agentRead.body.id, performanceContract.id);
});

test('management API exposes business organization review across API, MCP, and agents', () => {
  const organizationResource = managementSurface.resources.find(
    (resource) => resource.kind === 'organization_review'
  );
  const direct = api.handle('GET', '/api/substrate/organization-review');
  const resourceRead = api.readMcpResource(organizationResource.mcpUri);
  const toolCall = api.callMcpTool('database_layer_get_organization_review');
  const agentRead = api.runAgentCommand('databaseLayer.organization.review');

  assert.equal(direct.status, 200);
  assert.equal(direct.body.id, organizationReview.id);
  assert.equal(direct.body.valueState, 'valuable_with_review_signals');
  assert.equal(direct.body.summary.hardGaps, 0);
  assert.equal(direct.body.summary.reviewSignals, topologyDiagnostics.summary.reviewSignalCount);
  assert.ok(direct.body.findings.some((finding) => finding.id === 'automation_database_imbalance'));
  assert.ok(direct.body.findings.some((finding) => finding.id === 'worker_surface_concentration'));
  assert.ok(direct.body.recommendedMoves.some((move) => move.id === 'promote_database_layer_as_product_surface'));

  assert.equal(resourceRead.status, 200);
  assert.equal(resourceRead.body.id, organizationReview.id);
  assert.equal(toolCall.status, 200);
  assert.equal(toolCall.body.id, organizationReview.id);
  assert.equal(agentRead.status, 200);
  assert.equal(agentRead.body.id, organizationReview.id);
});

test('management API exposes MCP resources and tools from the same contract', () => {
  const resources = api.mcpResources();
  const tools = api.mcpTools();

  assert.equal(resources.length, managementSurface.resources.length);
  assert.equal(tools.length, managementSurface.operations.length);
  assert.ok(resources.some((resource) => resource.uri === 'substrate://topology/internal'));
  assert.ok(tools.some((tool) => tool.name === 'database_layer_list_operating_slices'));
  assert.ok(tools.some((tool) => tool.name === 'database_layer_get_topology_record'));
  assert.ok(tools.some((tool) => tool.name === 'database_layer_get_topology_diagnostics'));
  assert.ok(tools.some((tool) => tool.name === 'database_layer_get_topology'));
  assert.ok(tools.some((tool) => tool.name === 'database_layer_get_atlas_session'));
  assert.ok(tools.some((tool) => tool.name === 'database_layer_get_runtime_binding_coverage'));
  assert.ok(tools.some((tool) => tool.name === 'database_layer_get_operating_slice'));
  assert.ok(tools.some((tool) => tool.name === 'database_layer_get_performance_contract'));
  assert.ok(tools.some((tool) => tool.name === 'database_layer_get_organization_review'));
  assert.ok(
    tools
      .filter((tool) => !managementSurface.operations.find(
        (operation) => operation.mcpTool === tool.name && operation.apiMethod === 'GET'
      ))
      .every((tool) => tool.requiresApproval === true)
  );
});

test('management API reads MCP resources and calls read tools', () => {
  const first = api.listOperatingSlices()[0];
  const rootRecord = api.listTopologyRecords().find((record) => record.id === topology.rootNodeId);
  const recordResource = managementSurface.resources.find(
    (resource) => resource.kind === 'topology_record' && resource.recordId === topology.rootNodeId
  );
  const diagnosticsResource = managementSurface.resources.find(
    (resource) => resource.kind === 'diagnostics' && resource.recordId === topology.id
  );
  const topologyToolResponse = api.callMcpTool('database_layer_get_topology');
  const atlasToolResponse = api.callMcpTool('database_layer_get_atlas_session', {
    sessionId: topology.atlasCanvasId
  });
  const runtimeToolResponse = api.callMcpTool('database_layer_get_runtime_binding_coverage');
  const sliceToolResponse = api.callMcpTool('database_layer_get_operating_slice', {
    sliceId: first.slug
  });
  const readinessResource = managementSurface.resources.find(
    (resource) => resource.kind === 'readiness' && resource.apiPath === first.readinessApiPath
  );

  const recordResourceResponse = api.readMcpResource(recordResource.mcpUri);
  const diagnosticsResourceResponse = api.readMcpResource(diagnosticsResource.mcpUri);
  const recordToolResponse = api.callMcpTool('database_layer_get_topology_record', {
    recordId: rootRecord.slug
  });
  const diagnosticsToolResponse = api.callMcpTool('database_layer_get_topology_diagnostics');
  const resourceResponse = api.readMcpResource(readinessResource.mcpUri);
  const toolResponse = api.callMcpTool('database_layer_get_operating_slice_readiness', {
    sliceId: first.slug
  });

  assert.equal(recordResourceResponse.status, 200);
  assert.equal(recordResourceResponse.body.record.id, topology.rootNodeId);
  assert.equal(diagnosticsResourceResponse.status, 200);
  assert.equal(diagnosticsResourceResponse.body.summary.hardGapCount, 0);
  assert.equal(topologyToolResponse.status, 200);
  assert.equal(topologyToolResponse.body.summary.id, topology.id);
  assert.equal(atlasToolResponse.status, 200);
  assert.equal(atlasToolResponse.body.id, atlasSession.id);
  assert.equal(runtimeToolResponse.status, 200);
  assert.equal(runtimeToolResponse.body.records.length, runtimeBindingCoverage.records.length);
  assert.equal(sliceToolResponse.status, 200);
  assert.equal(sliceToolResponse.body.id, operatingSliceReview.slices[0].id);
  assert.equal(recordToolResponse.status, 200);
  assert.equal(recordToolResponse.body.record.id, topology.rootNodeId);
  assert.equal(diagnosticsToolResponse.status, 200);
  assert.equal(diagnosticsToolResponse.body.id, topologyDiagnostics.id);
  assert.equal(resourceResponse.status, 200);
  assert.equal(resourceResponse.body.sliceId, operatingSliceReview.slices[0].id);
  assert.equal(toolResponse.status, 200);
  assert.equal(toolResponse.body.productionStatus, 'approval_required');
});

test('management API serves MCP-style HTTP resource and tool routes', () => {
  const first = api.listOperatingSlices()[0];
  const rootRecord = api.listTopologyRecords().find((record) => record.id === topology.rootNodeId);
  const recordResource = managementSurface.resources.find(
    (resource) => resource.kind === 'topology_record' && resource.recordId === topology.rootNodeId
  );
  const resources = api.handle('GET', '/api/substrate/mcp/resources');
  const recordRead = api.handle(
    'GET',
    `/api/substrate/mcp/resources/${encodeURIComponent(recordResource.mcpUri)}`
  );
  const readinessResource = managementSurface.resources.find(
    (resource) => resource.kind === 'readiness' && resource.apiPath === first.readinessApiPath
  );
  const resourceRead = api.handle(
    'GET',
    `/api/substrate/mcp/resources/${encodeURIComponent(readinessResource.mcpUri)}`
  );
  const tools = api.handle('GET', '/api/substrate/mcp/tools');
  const toolCall = api.handle(
    'GET',
    `/api/substrate/mcp/tools/database_layer_get_operating_slice_readiness/call/${first.slug}`
  );
  const overlayToolCall = api.handle(
    'GET',
    '/api/substrate/mcp/tools/database_layer_get_client_overlay/call/outerfields'
  );
  const recordToolCall = api.handle(
    'GET',
    `/api/substrate/mcp/tools/database_layer_get_topology_record/call/${rootRecord.slug}`
  );

  assert.equal(resources.status, 200);
  assert.equal(resources.body.resources.length, managementSurface.resources.length);
  assert.equal(recordRead.status, 200);
  assert.equal(recordRead.body.record.id, topology.rootNodeId);
  assert.equal(resourceRead.status, 200);
  assert.equal(resourceRead.body.sliceId, operatingSliceReview.slices[0].id);
  assert.equal(tools.status, 200);
  assert.equal(tools.body.tools.length, managementSurface.operations.length);
  assert.equal(toolCall.status, 200);
  assert.equal(toolCall.body.productionStatus, 'approval_required');
  assert.equal(overlayToolCall.status, 200);
  assert.equal(overlayToolCall.body.clientSlug, 'outerfields');
  assert.equal(recordToolCall.status, 200);
  assert.equal(recordToolCall.body.record.id, topology.rootNodeId);
});

test('management API handles MCP JSON-RPC resource and tool requests', () => {
  const first = api.listOperatingSlices()[0];
  const recordResource = managementSurface.resources.find(
    (resource) => resource.kind === 'topology_record' && resource.recordId === topology.rootNodeId
  );
  const readinessResource = managementSurface.resources.find(
    (resource) => resource.kind === 'readiness' && resource.apiPath === first.readinessApiPath
  );
  const resources = api.handleMcpJsonRpc(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'resources/list' }));
  const resourceRead = api.handleMcpJsonRpc(
    JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'resources/read',
      params: { uri: recordResource.mcpUri }
    })
  );
  const tools = api.handleMcpJsonRpc(JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'tools/list' }));
  const toolCall = api.handleMcpJsonRpc(
    JSON.stringify({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'database_layer_get_operating_slice_readiness',
        arguments: { sliceId: first.slug }
      }
    })
  );
  const overlayToolCall = api.handleMcpJsonRpc(
    JSON.stringify({
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: {
        name: 'database_layer_get_client_overlay',
        arguments: { clientSlug: 'outerfields' }
      }
    })
  );
  const writeTool = api.handleMcpJsonRpc(
    JSON.stringify({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'database_layer_propose_operating_slice_promotion',
        arguments: { sliceId: first.slug }
      }
    })
  );

  assert.equal(resources.status, 200);
  assert.equal(resources.body.result.resources.length, managementSurface.resources.length);
  assert.equal(resourceRead.status, 200);
  assert.ok(resourceRead.body.result.contents[0].text.includes(topology.rootNodeId));
  assert.equal(tools.status, 200);
  assert.equal(tools.body.result.tools.length, managementSurface.operations.length);
  assert.equal(toolCall.status, 200);
  assert.ok(toolCall.body.result.content[0].text.includes('approval_required'));
  assert.equal(overlayToolCall.status, 200);
  assert.ok(overlayToolCall.body.result.content[0].text.includes('"clientSlug": "outerfields"'));
  assert.equal(writeTool.status, 403);
  assert.equal(writeTool.body.error.message, 'Approval required');
});

test('management API dispatches agent-native commands', () => {
  const first = api.listOperatingSlices()[0];
  const rootRecord = api.listTopologyRecords().find((record) => record.id === topology.rootNodeId);
  const topologyRecordResponse = api.runAgentCommand('databaseLayer.topology.records.get', {
    recordId: rootRecord.slug
  });
  const topologyDiagnosticsResponse = api.runAgentCommand('databaseLayer.topology.diagnostics');
  const clientOverlayResponse = api.runAgentCommand('databaseLayer.clientOverlays.get', {
    clientSlug: 'outerfields'
  });
  const listResponse = api.runAgentCommand('databaseLayer.operatingSlices.list');
  const detailResponse = api.runAgentCommand('databaseLayer.operatingSlices.get', {
    sliceId: first.slug
  });
  const writeResponse = api.runAgentCommand('databaseLayer.operatingSlices.proposePromotion', {
    sliceId: first.slug
  });

  assert.equal(topologyRecordResponse.status, 200);
  assert.equal(topologyRecordResponse.body.record.id, topology.rootNodeId);
  assert.equal(topologyDiagnosticsResponse.status, 200);
  assert.equal(topologyDiagnosticsResponse.body.summary.hardGapCount, 0);
  assert.equal(clientOverlayResponse.status, 200);
  assert.equal(clientOverlayResponse.body.clientSlug, 'outerfields');
  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.body.slices.length, operatingSliceReview.slices.length);
  assert.equal(detailResponse.status, 200);
  assert.equal(detailResponse.body.id, operatingSliceReview.slices[0].id);
  assert.equal(writeResponse.status, 403);
  assert.equal(writeResponse.body.error, 'approval_required');
});

test('management API refuses write-shaped operations until approval workflow exists', () => {
  const first = api.listOperatingSlices()[0];
  const response = api.handle('POST', `${first.apiPath}/promotion-proposals`);

  assert.equal(response.status, 403);
  assert.equal(response.body.error, 'approval_required');
  assert.match(response.body.message, /do not mutate Cloudflare/);
});

test('edge adapter serializes read responses with Cloudflare-compatible headers', () => {
  const response = edge.handleEdgeRequest({
    method: 'GET',
    url: 'https://substrate.local/api/substrate/operating-slices'
  });
  const body = JSON.parse(response.bodyText);

  assert.equal(response.status, 200);
  assert.equal(response.headers['content-type'], 'application/json; charset=utf-8');
  assert.equal(response.headers['access-control-allow-origin'], 'https://app-governance-dash.createsomething.agency');
  assert.equal(response.headers['cache-control'], 'public, max-age=15');
  assert.equal(body.slices.length, operatingSliceReview.slices.length);
});

test('edge adapter serializes MCP-style resource routes', () => {
  const first = api.listOperatingSlices()[0];
  const readinessResource = managementSurface.resources.find(
    (resource) => resource.kind === 'readiness' && resource.apiPath === first.readinessApiPath
  );
  const response = edge.handleEdgeRequest({
    method: 'GET',
    url: `https://substrate.local/api/substrate/mcp/resources/${encodeURIComponent(readinessResource.mcpUri)}`
  });
  const body = JSON.parse(response.bodyText);

  assert.equal(response.status, 200);
  assert.equal(body.sliceId, operatingSliceReview.slices[0].id);
});

test('edge adapter serializes MCP JSON-RPC requests', () => {
  const first = api.listOperatingSlices()[0];
  const response = edge.handleEdgeRequest({
    method: 'POST',
    url: 'https://substrate.local/api/substrate/mcp/rpc',
    bodyText: JSON.stringify({
      jsonrpc: '2.0',
      id: 'readiness',
      method: 'tools/call',
      params: {
        name: 'database_layer_get_operating_slice_readiness',
        arguments: { sliceId: first.slug }
      }
    })
  });
  const body = JSON.parse(response.bodyText);

  assert.equal(response.status, 200);
  assert.equal(body.id, 'readiness');
  assert.ok(body.result.content[0].text.includes('approval_required'));
});

test('edge adapter supports HEAD and OPTIONS without body churn', () => {
  const head = edge.handleEdgeRequest({
    method: 'HEAD',
    url: 'https://substrate.local/api/substrate/operating-slices'
  });
  const options = edge.handleEdgeRequest({
    method: 'OPTIONS',
    url: 'https://substrate.local/api/substrate/operating-slices'
  });

  assert.equal(head.status, 200);
  assert.equal(head.bodyText, '');
  assert.equal(options.status, 204);
  assert.equal(options.bodyText, '');
  assert.ok(options.headers['access-control-allow-methods'].includes('GET'));
});

test('edge adapter serializes approval-gated write responses without caching', () => {
  const first = api.listOperatingSlices()[0];
  const response = edge.handleEdgeRequest({
    method: 'POST',
    url: `https://substrate.local${first.apiPath}/promotion-proposals`
  });
  const body = JSON.parse(response.bodyText);

  assert.equal(response.status, 403);
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.equal(body.error, 'approval_required');
  assert.match(body.message, /do not mutate Cloudflare/);
});

test('Worker wrapper exposes a fetch handler over the same edge adapter', async () => {
  const response = await worker.fetch({
    method: 'GET',
    url: 'https://substrate.local/api/substrate/operating-slices'
  });
  const body = response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers['access-control-allow-origin'], 'https://app-governance-dash.createsomething.agency');
  assert.equal(body.slices.length, operatingSliceReview.slices.length);
});

test('Worker wrapper keeps write-shaped requests approval-gated', async () => {
  const first = api.listOperatingSlices()[0];
  const response = await worker.fetch({
    method: 'POST',
    url: `https://substrate.local${first.apiPath}/promotion-proposals`
  });
  const body = response.json();

  assert.equal(response.status, 403);
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.equal(body.error, 'approval_required');
});
