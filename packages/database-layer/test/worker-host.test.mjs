import assert from 'node:assert/strict';
import test from 'node:test';

import { databaseLayerWorkerState } from '../worker/generated-state.mjs';
import worker from '../worker/index.mjs';

test('database-layer Worker host serves operating slices through fetch', async () => {
  const response = await worker.fetch(
    new Request('https://database-layer.local/api/substrate/operating-slices', {
      method: 'GET'
    })
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8');
  assert.equal(
    response.headers.get('access-control-allow-origin'),
    'https://app-governance-dash.createsomething.agency'
  );
  assert.equal(body.slices.length, 22);
  assert.equal(body.slices[0].title, 'Automation worker Atlas coverage');
});

test('database-layer Worker host keeps write-shaped requests approval-gated', async () => {
  const read = await worker.fetch(
    new Request('https://database-layer.local/api/substrate/operating-slices', {
      method: 'GET'
    })
  );
  const first = (await read.json()).slices[0];
  const response = await worker.fetch(
    new Request(`https://database-layer.local${first.apiPath}/promotion-proposals`, {
      method: 'POST'
    })
  );
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(body.error, 'approval_required');
});

test('database-layer Worker host serves MCP-style resources and tool calls', async () => {
  const list = await worker.fetch(
    new Request('https://database-layer.local/api/substrate/operating-slices', {
      method: 'GET'
    })
  );
  const first = (await list.json()).slices[0];
  const resourceList = await worker.fetch(
    new Request('https://database-layer.local/api/substrate/mcp/resources', {
      method: 'GET'
    })
  );
  const resources = await resourceList.json();
  const readinessResource = resources.resources.find(
    (resource) => resource.uri.endsWith(`${first.slug}/readiness`)
  );
  const resourceRead = await worker.fetch(
    new Request(
      `https://database-layer.local/api/substrate/mcp/resources/${encodeURIComponent(readinessResource.uri)}`,
      { method: 'GET' }
    )
  );
  const toolCall = await worker.fetch(
    new Request(
      `https://database-layer.local/api/substrate/mcp/tools/database_layer_get_operating_slice_readiness/call/${first.slug}`,
      { method: 'GET' }
    )
  );

  assert.equal(resourceList.status, 200);
  assert.equal(resources.resources.length, databaseLayerWorkerState.managementSurface.resources.length);
  assert.equal(resourceRead.status, 200);
  assert.equal((await resourceRead.json()).productionStatus, 'approval_required');
  assert.equal(toolCall.status, 200);
  assert.equal((await toolCall.json()).productionStatus, 'approval_required');
});

test('database-layer Worker host serves MCP JSON-RPC read calls', async () => {
  const list = await worker.fetch(
    new Request('https://database-layer.local/api/substrate/operating-slices', {
      method: 'GET'
    })
  );
  const first = (await list.json()).slices[0];
  const toolCall = await worker.fetch(
    new Request('https://database-layer.local/api/substrate/mcp/rpc', {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'tool-call',
        method: 'tools/call',
        params: {
          name: 'database_layer_get_operating_slice_readiness',
          arguments: { sliceId: first.slug }
        }
      })
    })
  );
  const writeTool = await worker.fetch(
    new Request('https://database-layer.local/api/substrate/mcp/rpc', {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'write-tool',
        method: 'tools/call',
        params: {
          name: 'database_layer_propose_operating_slice_promotion',
          arguments: { sliceId: first.slug }
        }
      })
    })
  );

  const toolBody = await toolCall.json();
  const writeBody = await writeTool.json();
  assert.equal(toolCall.status, 200);
  assert.ok(toolBody.result.content[0].text.includes('approval_required'));
  assert.equal(writeTool.status, 403);
  assert.equal(writeBody.error.message, 'Approval required');
});
