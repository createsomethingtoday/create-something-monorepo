import assert from 'node:assert/strict';
import test from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createAbundanceHealthcareServer } from '../src/index.ts';

test('tracking is advertised for all four providers and a disconnected ledger leaves spend unknown', async () => {
  let requests = 0;
  const server = createAbundanceHealthcareServer({ exaApiKey: 'fixture', agencyApiKey: 'fixture', fetchFn: async () => { requests++; throw new Error('unexpected network'); } });
  const client = new Client({name:'readiness-test',version:'1'});
  const [a,b] = InMemoryTransport.createLinkedPair();
  await server.connect(a); await client.connect(b);
  try {
    const tools = await client.listTools();
    assert.ok(tools.tools.some(t => t.name === 'get_enrichment_readiness'));
    for (const provider of ['pdl','clay','exa','apify']) {
      const response = await client.callTool({name:'get_enrichment_readiness',arguments:{provider}});
      const result = response.structuredContent as Record<string, any>;
      assert.equal(result.ready, false);
      assert.equal(result.provider, provider);
      assert.equal(result.budget,undefined);
      assert.equal(result.spend.confirmed_usd,null);
      assert.equal(result.spend.history_complete,false);
      assert.equal(result.cost.estimated_usd,null);
      assert.ok(result.blocking_reasons.length >= 1);
    }
    assert.equal(requests, 4);
  } finally { await client.close(); await server.close(); }
});
