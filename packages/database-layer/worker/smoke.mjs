import assert from 'node:assert/strict';

import worker from './index.mjs';

const readResponse = await worker.fetch(
  new Request('https://database-layer.local/api/substrate/operating-slices', {
    method: 'GET'
  })
);
assert.equal(readResponse.status, 200);
assert.equal(
  readResponse.headers.get('access-control-allow-origin'),
  'https://app-governance-dash.createsomething.agency'
);
const readBody = await readResponse.json();
assert.equal(readBody.slices.length, 22);

const first = readBody.slices[0];
const writeResponse = await worker.fetch(
  new Request(`https://database-layer.local${first.apiPath}/promotion-proposals`, {
    method: 'POST'
  })
);
assert.equal(writeResponse.status, 403);
assert.equal(writeResponse.headers.get('cache-control'), 'no-store');
const writeBody = await writeResponse.json();
assert.equal(writeBody.error, 'approval_required');

const resourcesResponse = await worker.fetch(
  new Request('https://database-layer.local/api/substrate/mcp/resources', {
    method: 'GET'
  })
);
assert.equal(resourcesResponse.status, 200);
const resourcesBody = await resourcesResponse.json();
assert.equal(resourcesBody.resources.length, 503);

const healthResponse = await worker.fetch(
  new Request('https://database-layer.local/api/substrate/health', {
    method: 'GET'
  })
);
assert.equal(healthResponse.status, 200);
const healthBody = await healthResponse.json();
assert.equal(healthBody.status, 'ok');
assert.equal(healthBody.management.resources, 503);
assert.equal(healthBody.management.operations, 26);
assert.equal(healthBody.approval.writeOperationsApprovalGated, true);

const capabilitiesResponse = await worker.fetch(
  new Request('https://database-layer.local/api/substrate/capabilities', {
    method: 'GET'
  })
);
assert.equal(capabilitiesResponse.status, 200);
const capabilitiesBody = await capabilitiesResponse.json();
assert.equal(capabilitiesBody.api.endpoints.length, 26);
assert.equal(capabilitiesBody.mcp.resources, 503);
assert.ok(capabilitiesBody.agent.commands.includes('databaseLayer.capabilities.get'));
assert.ok(capabilitiesBody.agent.commands.includes('databaseLayer.contract.audit'));
assert.ok(capabilitiesBody.agent.commands.includes('databaseLayer.workbench.get'));
assert.ok(capabilitiesBody.agent.commands.includes('databaseLayer.workflow.queue'));
assert.ok(capabilitiesBody.agent.commands.includes('databaseLayer.receipts.list'));
assert.ok(capabilitiesBody.agent.commands.includes('databaseLayer.topology.get'));
assert.ok(capabilitiesBody.agent.commands.includes('databaseLayer.atlasSessions.get'));
assert.ok(capabilitiesBody.agent.commands.includes('databaseLayer.atlasSessions.viewport'));
assert.ok(capabilitiesBody.agent.commands.includes('databaseLayer.coverage.runtimeBindings'));
assert.ok(capabilitiesBody.agent.commands.includes('databaseLayer.topology.records.context'));

const contractAuditResponse = await worker.fetch(
  new Request('https://database-layer.local/api/substrate/contract/audit', {
    method: 'GET'
  })
);
assert.equal(contractAuditResponse.status, 200);
const contractAuditBody = await contractAuditResponse.json();
assert.equal(contractAuditBody.status, 'pass');
assert.equal(contractAuditBody.summary.resources, 503);
assert.equal(contractAuditBody.summary.operations, 26);
assert.equal(contractAuditBody.summary.unmatchedResourceCount, 0);
assert.equal(contractAuditBody.summary.duplicateOperationPathCount, 0);
assert.equal(contractAuditBody.summary.ungatedWriteOperationCount, 0);

const queryResponse = await worker.fetch(
  new Request('https://database-layer.local/api/substrate/query?q=wrangler&surface=worker&tier=Automation&limit=5', {
    method: 'GET'
  })
);
assert.equal(queryResponse.status, 200);
const queryBody = await queryResponse.json();
assert.equal(queryBody.limit, 5);
assert.ok(queryBody.total > 0);
assert.ok(queryBody.records.length > 0);
assert.ok(queryBody.records.length <= 5);
assert.ok(queryBody.records.every((record) => record.surface === 'worker'));
assert.ok(queryBody.records.every((record) => record.tier === 'Automation'));

const openApiResponse = await worker.fetch(
  new Request('https://database-layer.local/api/substrate/openapi.json', {
    method: 'GET'
  })
);
assert.equal(openApiResponse.status, 200);
const openApiBody = await openApiResponse.json();
assert.equal(openApiBody.openapi, '3.1.0');
assert.ok(openApiBody.paths['/capabilities'].get);
assert.ok(openApiBody.paths['/contract/audit'].get);
assert.ok(openApiBody.paths['/openapi.json'].get);
assert.ok(openApiBody.paths['/workbench'].get);
assert.ok(openApiBody.paths['/workflow/queue'].get);
assert.ok(openApiBody.paths['/receipts'].get);
assert.ok(openApiBody.paths['/receipts'].post);
assert.ok(openApiBody.paths['/topology/internal'].get);
assert.ok(openApiBody.paths['/atlas-sessions/{sessionId}'].get);
assert.ok(openApiBody.paths['/atlas-sessions/{sessionId}/viewport'].get);
assert.ok(openApiBody.paths['/coverage/runtime-bindings/cloudflare'].get);
assert.ok(openApiBody.paths['/operating-slices/{sliceId}'].get);
assert.ok(openApiBody.paths['/topology/internal/records/{recordId}/context'].get);

const diagnosticsResponse = await worker.fetch(
  new Request('https://database-layer.local/api/substrate/topology/internal/diagnostics', {
    method: 'GET'
  })
);
assert.equal(diagnosticsResponse.status, 200);
const diagnosticsBody = await diagnosticsResponse.json();
assert.equal(diagnosticsBody.summary.valueState, 'connected_map_with_review_signals');
assert.equal(diagnosticsBody.summary.hardGapCount, 0);

const performanceResponse = await worker.fetch(
  new Request('https://database-layer.local/api/substrate/performance', {
    method: 'GET'
  })
);
assert.equal(performanceResponse.status, 200);
const performanceBody = await performanceResponse.json();
assert.equal(performanceBody.runtime, 'substrate');
assert.equal(performanceBody.summary.topologyRecords, 439);
assert.equal(performanceBody.budgets.length, 5);
assert.ok(performanceBody.fastPath.some((item) => item.id === 'precomputed-management-surface'));
assert.ok(performanceBody.fastPath.some((item) => item.id === 'bounded-atlas-viewport'));

const organizationReviewResponse = await worker.fetch(
  new Request('https://database-layer.local/api/substrate/organization-review', {
    method: 'GET'
  })
);
assert.equal(organizationReviewResponse.status, 200);
const organizationReviewBody = await organizationReviewResponse.json();
assert.equal(organizationReviewBody.valueState, 'valuable_with_review_signals');
assert.ok(organizationReviewBody.findings.some((finding) => finding.id === 'automation_database_imbalance'));

const topologyRecordsResponse = await worker.fetch(
  new Request('https://database-layer.local/api/substrate/topology/internal/records', {
    method: 'GET'
  })
);
assert.equal(topologyRecordsResponse.status, 200);
const topologyRecordsBody = await topologyRecordsResponse.json();
assert.equal(topologyRecordsBody.records.length, 439);

const rootRecord = topologyRecordsBody.records.find(
  (record) => record.id === 'substrate:create-something:root'
);
const topologyRecordResponse = await worker.fetch(
  new Request(`https://database-layer.local${rootRecord.apiPath}`, {
    method: 'GET'
  })
);
assert.equal(topologyRecordResponse.status, 200);
const topologyRecordBody = await topologyRecordResponse.json();
assert.equal(topologyRecordBody.record.id, 'substrate:create-something:root');

const topologyRecordContextResponse = await worker.fetch(
  new Request(`https://database-layer.local${rootRecord.apiPath}/context`, {
    method: 'GET'
  })
);
assert.equal(topologyRecordContextResponse.status, 200);
const topologyRecordContextBody = await topologyRecordContextResponse.json();
assert.equal(topologyRecordContextBody.record.id, 'substrate:create-something:root');
assert.equal(topologyRecordContextBody.atlas.node.id, rootRecord.atlasNodeId);
assert.ok(topologyRecordContextBody.proof.receipts.length > 0);
assert.ok(topologyRecordContextBody.topology.relatedRecords.length > 0);

const atlasViewportResponse = await worker.fetch(
  new Request(
    'https://database-layer.local/api/substrate/atlas-sessions/create-something-internal-operating-topology/viewport?x=0&y=0&width=500&height=400&zoom=1&limit=25',
    { method: 'GET' }
  )
);
assert.equal(atlasViewportResponse.status, 200);
const atlasViewportBody = await atlasViewportResponse.json();
assert.equal(atlasViewportBody.summary.totalNodes, 439);
assert.ok(atlasViewportBody.summary.visibleNodes > 0);
assert.ok(atlasViewportBody.summary.visibleNodes <= 25);
assert.ok(atlasViewportBody.nodes.some((node) => node.id === rootRecord.atlasNodeId));

const workbenchResponse = await worker.fetch(
  new Request(
    `https://database-layer.local/api/substrate/workbench?q=wrangler&surface=worker&tier=Automation&limit=5&recordId=${rootRecord.atlasNodeId}`,
    { method: 'GET' }
  )
);
assert.equal(workbenchResponse.status, 200);
const workbenchBody = await workbenchResponse.json();
assert.equal(workbenchBody.query.records.length, 5);
assert.equal(workbenchBody.selectedContext.record.id, 'substrate:create-something:root');
assert.ok(workbenchBody.facets.surface.find((facet) => facet.value === 'worker').count > 0);

const workflowQueueResponse = await worker.fetch(
  new Request('https://database-layer.local/api/substrate/workflow/queue?state=wait&source=agent_config&limit=5', {
    method: 'GET'
  })
);
assert.equal(workflowQueueResponse.status, 200);
const workflowQueueBody = await workflowQueueResponse.json();
assert.equal(workflowQueueBody.actions.length, 5);
assert.ok(workflowQueueBody.summary.totalActions > workflowQueueBody.actions.length);
assert.ok(workflowQueueBody.summary.bySource.find((entry) => entry.value === 'agent_config').count >= 40);
assert.ok(workflowQueueBody.summary.bySource.find((entry) => entry.value === 'runtime_binding').count >= 99);

const workflowQueueToolResponse = await worker.fetch(
  new Request('https://database-layer.local/api/substrate/mcp/tools/database_layer_get_workflow_queue/call', {
    method: 'GET'
  })
);
assert.equal(workflowQueueToolResponse.status, 200);
const workflowQueueToolBody = await workflowQueueToolResponse.json();
assert.equal(workflowQueueToolBody.actions.length, 25);

const topologyToolResponse = await worker.fetch(
  new Request('https://database-layer.local/api/substrate/mcp/tools/database_layer_get_topology/call', {
    method: 'GET'
  })
);
assert.equal(topologyToolResponse.status, 200);
const topologyToolBody = await topologyToolResponse.json();
assert.equal(topologyToolBody.summary.id, 'substrate:create-something:topology:internal');
assert.equal(topologyToolBody.summary.nodes, 439);

const receiptsResponse = await worker.fetch(
  new Request(
    `https://database-layer.local/api/substrate/receipts?recordId=${rootRecord.atlasNodeId}&type=proof&source=atlas&limit=5`,
    { method: 'GET' }
  )
);
assert.equal(receiptsResponse.status, 200);
const receiptsBody = await receiptsResponse.json();
assert.equal(receiptsBody.summary.filteredReceipts, 1);
assert.equal(receiptsBody.receipts.length, 1);
assert.equal(receiptsBody.receipts[0].recordId, 'substrate:create-something:root');
assert.equal(receiptsBody.receipts[0].sourceKind, 'atlas');
assert.equal(receiptsBody.receipts[0].type, 'proof');
assert.ok(receiptsBody.summary.bySource.find((entry) => entry.value === 'runtime_binding').count >= 99);

const readinessResource = resourcesBody.resources.find((resource) =>
  resource.uri.endsWith(`${first.slug}/readiness`)
);
const mcpReadResponse = await worker.fetch(
  new Request(
    `https://database-layer.local/api/substrate/mcp/resources/${encodeURIComponent(readinessResource.uri)}`,
    { method: 'GET' }
  )
);
assert.equal(mcpReadResponse.status, 200);
const mcpReadBody = await mcpReadResponse.json();
assert.equal(mcpReadBody.productionStatus, 'approval_required');

const rpcResponse = await worker.fetch(
  new Request('https://database-layer.local/api/substrate/mcp/rpc', {
    method: 'POST',
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'readiness',
      method: 'tools/call',
      params: {
        name: 'database_layer_get_operating_slice_readiness',
        arguments: { sliceId: first.slug }
      }
    })
  })
);
assert.equal(rpcResponse.status, 200);
const rpcBody = await rpcResponse.json();
assert.equal(rpcBody.id, 'readiness');
assert.ok(rpcBody.result.content[0].text.includes('approval_required'));

const contextToolResponse = await worker.fetch(
  new Request(
    `https://database-layer.local/api/substrate/mcp/tools/database_layer_get_topology_record_context/call/${rootRecord.slug}`,
    { method: 'GET' }
  )
);
assert.equal(contextToolResponse.status, 200);
const contextToolBody = await contextToolResponse.json();
assert.equal(contextToolBody.record.id, 'substrate:create-something:root');

console.log(
  JSON.stringify(
    {
      readStatus: readResponse.status,
      sliceCount: readBody.slices.length,
      writeStatus: writeResponse.status,
      writeError: writeBody.error,
      mcpResources: resourcesBody.resources.length,
      healthStatus: healthResponse.status,
      substrateStatus: healthBody.status,
      capabilitiesStatus: capabilitiesResponse.status,
      capabilityEndpoints: capabilitiesBody.api.endpoints.length,
      contractAuditStatus: contractAuditResponse.status,
      contractAudit: contractAuditBody.status,
      queryStatus: queryResponse.status,
      queryRecords: queryBody.records.length,
      workbenchStatus: workbenchResponse.status,
      workbenchRecords: workbenchBody.query.records.length,
      workflowQueueStatus: workflowQueueResponse.status,
      workflowQueueActions: workflowQueueBody.actions.length,
      receiptsStatus: receiptsResponse.status,
      receiptCount: receiptsBody.receipts.length,
      receiptTotal: receiptsBody.summary.totalReceipts,
      openApiStatus: openApiResponse.status,
      openApiPaths: Object.keys(openApiBody.paths).length,
      diagnosticsStatus: diagnosticsResponse.status,
      diagnosticsValueState: diagnosticsBody.summary.valueState,
      performanceStatus: performanceResponse.status,
      performanceBudgets: performanceBody.budgets.length,
      organizationReviewStatus: organizationReviewResponse.status,
      organizationValueState: organizationReviewBody.valueState,
      topologyRecords: topologyRecordsBody.records.length,
      topologyRecordStatus: topologyRecordResponse.status,
      topologyRecordContextStatus: topologyRecordContextResponse.status,
      topologyRecordContextRelated: topologyRecordContextBody.topology.relatedRecords.length,
      atlasViewportStatus: atlasViewportResponse.status,
      atlasViewportNodes: atlasViewportBody.summary.visibleNodes,
      mcpReadStatus: mcpReadResponse.status,
      contextToolStatus: contextToolResponse.status,
      workflowQueueToolStatus: workflowQueueToolResponse.status,
      topologyToolStatus: topologyToolResponse.status,
      rpcStatus: rpcResponse.status
    },
    null,
    2
  )
);
