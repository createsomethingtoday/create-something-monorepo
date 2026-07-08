import assert from 'node:assert/strict';

import worker from './index.mjs';
import { databaseLayerWorkerState } from './generated-state.mjs';

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
assert.equal(resourcesBody.resources.length, databaseLayerWorkerState.managementSurface.resources.length);

const diagnosticsResponse = await worker.fetch(
  new Request('https://database-layer.local/api/substrate/topology/internal/diagnostics', {
    method: 'GET'
  })
);
assert.equal(diagnosticsResponse.status, 200);
const diagnosticsBody = await diagnosticsResponse.json();
assert.equal(diagnosticsBody.summary.valueState, 'connected_map_with_review_signals');
assert.equal(diagnosticsBody.summary.hardGapCount, 0);

const topologyRecordsResponse = await worker.fetch(
  new Request('https://database-layer.local/api/substrate/topology/internal/records', {
    method: 'GET'
  })
);
assert.equal(topologyRecordsResponse.status, 200);
const topologyRecordsBody = await topologyRecordsResponse.json();
assert.equal(topologyRecordsBody.records.length, databaseLayerWorkerState.topology.nodes.length);

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

console.log(
  JSON.stringify(
    {
      readStatus: readResponse.status,
      sliceCount: readBody.slices.length,
      writeStatus: writeResponse.status,
      writeError: writeBody.error,
      mcpResources: resourcesBody.resources.length,
      diagnosticsStatus: diagnosticsResponse.status,
      diagnosticsValueState: diagnosticsBody.summary.valueState,
      topologyRecords: topologyRecordsBody.records.length,
      topologyRecordStatus: topologyRecordResponse.status,
      mcpReadStatus: mcpReadResponse.status,
      rpcStatus: rpcResponse.status
    },
    null,
    2
  )
);
