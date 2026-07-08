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
const runtimeBindingCoverage = JSON.parse(
  fs.readFileSync(path.join(packageRoot, 'data', 'create-something-runtime-binding-coverage.json'), 'utf8')
);
const topologyDiagnostics = JSON.parse(
  fs.readFileSync(path.join(packageRoot, 'data', 'create-something-topology-diagnostics.json'), 'utf8')
);

const managementApiState = {
  managementSurface,
  operatingSliceReview,
  operatingSliceReadiness,
  topology,
  atlasSession,
  runtimeBindingCoverage,
  topologyDiagnostics
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
  assert.equal(summary.resources, 48 + topology.nodes.length);
  assert.equal(summary.operations, 8);
  assert.equal(summary.readOperations, 5);
  assert.equal(summary.approvalGatedWriteOperations, 3);
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

test('management API exposes MCP resources and tools from the same contract', () => {
  const resources = api.mcpResources();
  const tools = api.mcpTools();

  assert.equal(resources.length, managementSurface.resources.length);
  assert.equal(tools.length, managementSurface.operations.length);
  assert.ok(resources.some((resource) => resource.uri === 'substrate://topology/internal'));
  assert.ok(tools.some((tool) => tool.name === 'database_layer_list_operating_slices'));
  assert.ok(tools.some((tool) => tool.name === 'database_layer_get_topology_record'));
  assert.ok(tools.some((tool) => tool.name === 'database_layer_get_topology_diagnostics'));
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
