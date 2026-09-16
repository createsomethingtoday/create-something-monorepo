import assert from 'node:assert/strict';
import test from 'node:test';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { AirtableClient } from '../src/airtable.js';
import { registerTools } from '../src/tools.js';

test('MCP boundary rejects extra correlation fields before reading source', async () => {
  let reads = 0;
  const server = new McpServer({ name: 'handoff-test', version: '1' });
  registerTools(
    server,
    () =>
      ({
        getAssetById: async () => {
          reads++;
          return null;
        },
        getVersionById: async () => {
          reads++;
          return null;
        }
      }) as unknown as AirtableClient,
    undefined,
    {},
    { allowWrites: false, allowedToolNames: new Set(['template_review_observe_handoff']) }
  );
  const client = new Client({ name: 'test', version: '1' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    const result = await client.callTool({
      name: 'template_review_observe_handoff',
      arguments: {
        assetId: 'recAAAAAAAAAAAAAA',
        versionId: 'recBBBBBBBBBBBBBB',
        email: 'extra@example.com'
      }
    });
    assert.equal(result.isError, true);
    assert.equal(reads, 0);
    const valid = await client.callTool({
      name: 'template_review_observe_handoff',
      arguments: { assetId: 'recAAAAAAAAAAAAAA', versionId: 'recBBBBBBBBBBBBBB' }
    });
    assert.notEqual(valid.isError, true);
    assert.equal(reads, 2);
  } finally {
    await client.close();
    await server.close();
  }
});
