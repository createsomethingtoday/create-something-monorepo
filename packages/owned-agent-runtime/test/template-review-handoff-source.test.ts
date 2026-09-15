import assert from 'node:assert/strict';
import test from 'node:test';
import { AuthenticatedTemplateReviewHandoffSource } from '../src/template-review-handoff-source.js';

const parameters = { assetId: 'recAAAAAAAAAAAAAA', versionId: 'recBBBBBBBBBBBBBB' };

test('fixed authenticated source uses the SDK and extracts only the source envelope', async () => {
  const methods: string[] = [];
  const data = { schema: 'test-observation' };
  const request: typeof fetch = async (url, init) => {
    assert.equal(String(url), 'https://webflow-template-review-mcp.createsomething.workers.dev/mcp');
    assert.equal(init?.redirect, 'error');
    assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer test-token');
    assert.ok(init?.signal);
    if (init?.method === 'GET') return new Response(null, { status: 405 });
    const body = JSON.parse(String(init?.body));
    methods.push(body.method);
    if (body.method === 'notifications/initialized') return new Response(null, { status: 202 });
    if (body.method === 'tools/call') {
      assert.deepEqual(body.params, { name: 'template_review_observe_handoff', arguments: parameters });
    }
    return Response.json({ jsonrpc: '2.0', id: body.id, result: body.method === 'initialize' ? {
      protocolVersion: '2025-03-26', capabilities: { tools: {} }, serverInfo: { name: 'test-source', version: '1' }
    } : { content: [{ type: 'text', text: JSON.stringify({ ok: true, data }) }] } });
  };
  const source = new AuthenticatedTemplateReviewHandoffSource(async () => 'test-token', request);
  assert.deepEqual(await source.observe(parameters), data);
  assert.equal(methods.filter(method => method === 'tools/call').length, 1);
});

test('authentication failures do not retry or expose credentials', async () => {
  let calls = 0;
  const source = new AuthenticatedTemplateReviewHandoffSource(async () => 'secret-token', async () => {
    calls++;
    return new Response('private source failure', { status: 401 });
  });
  await assert.rejects(() => source.observe(parameters), { message: 'handoff_source_unavailable' });
  assert.equal(calls, 1);
});

test('invalid record IDs never reach credentials or transport', async () => {
  const source = new AuthenticatedTemplateReviewHandoffSource(async () => {
    assert.fail('must not request credentials');
  });
  await assert.rejects(() => source.observe({ ...parameters, assetId: 'invalid' }),
    { message: 'handoff_source_unavailable' });
});
