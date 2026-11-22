import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POST } from '../src/routes/api/contact-agent/+server';

function event(question: string, env: unknown = {}, ip = '192.0.2.1') {
  return { request: new Request('https://example.com/api/contact-agent', { method: 'POST', headers: { origin: 'https://example.com', 'content-type': 'application/json', 'cf-connecting-ip': ip }, body: JSON.stringify({ question }) }), url: new URL('https://example.com/api/contact-agent'), platform: { env } } as unknown as Parameters<typeof POST>[0];
}
test('rejects overlong questions before runtime use', async () => {
  assert.equal((await POST(event('x'.repeat(1001)))).status, 400);
});
test('fails visibly closed without runtime credentials', async () => {
  const response = await POST(event('What does membership cost?'));
  assert.equal(response.status, 503);
  assert.match(((await response.json()) as { error: string }).error, /unavailable/);
});
test('atomic budget denial prevents provider call', async () => {
  const response = await POST(event('What does membership cost?', { OPENAI_API_KEY: 'test', DB: { prepare() { return { bind() { return {}; } }; }, async batch() { return [{results: []},{results: []},{results: []}]; } } }));
  assert.equal(response.status, 429);
});
test('real provider request uses published catalog and returns editable draft', async () => {
  const original = globalThis.fetch;
  let reserved = 0;
  globalThis.fetch = async (url, init) => {
    assert.equal(url, 'https://api.openai.com/v1/chat/completions');
    const payload = JSON.parse(init!.body as string);
    assert.match(payload.messages[0].content, /focusedMonthlyUsd/);
    assert.equal(payload.messages[1].content, 'What does membership cost?');
    assert.equal(payload.max_tokens, 450);
    return Response.json({ choices: [{ message: { content: JSON.stringify({ answer: 'Membership starts at $900/month.', draft: 'I would like to discuss membership.' }) } }] });
  };
  try {
    const response = await POST(event('What does membership cost?', { OPENAI_API_KEY: 'test', DB: { prepare() { return { bind() { return {}; } }; }, async batch() { reserved = 2; return [{results: []},{results: [{calls: 1}]},{results: [{calls: 1}]}]; } } }));
    assert.equal(response.status, 200);
    assert.equal(reserved, 2);
    assert.equal(((await response.json()) as { draft: string }).draft, 'I would like to discuss membership.');
  } finally { globalThis.fetch = original; }
});

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { Miniflare } = createRequire(require.resolve('wrangler/package.json'))('miniflare');
test('workerd D1 handler enforces concurrent quotas without capped visitor starvation', async () => {
  const mf = new Miniflare({ modules: true, script: 'export default { fetch() { return new Response("fixture"); } }', compatibilityDate: '2025-11-15', d1Databases: ['DB'] });
  const original = globalThis.fetch;
  let providerCalls = 0;
  try {
    const DB: D1Database = await mf.getD1Database('DB');
    const migration = readFileSync(new URL('../migrations/0066_contact_agent_budget.sql', import.meta.url), 'utf8');
    for (const statement of migration.replace(/--[^\n]*/g, '').split(';').filter(s => s.trim())) await DB.prepare(statement).run();
    await DB.prepare("INSERT INTO contact_agent_budget VALUES ('2000-01-01','old',1)").run();
    globalThis.fetch = async () => { providerCalls++; return Response.json({ choices: [{ message: { content: JSON.stringify({ answer: 'Membership starts at $900/month.', draft: 'I would like to discuss membership.', offer: 'membership' }) } }] }); };
    const env = { DB, OPENAI_API_KEY: 'fixture-key' };
    const ask = (ip: string) => POST(event('What does membership cost?', env, ip));
    const burst = await Promise.all(Array.from({ length: 10 }, () => ask('192.0.2.1')));
    assert.equal(burst.filter(response => response.status === 200).length, 5);
    assert.equal(burst.filter(response => response.status === 429).length, 5);
    const denied = await Promise.all(Array.from({ length: 20 }, () => ask('192.0.2.1')));
    assert.ok(denied.every(response => response.status === 429));
    assert.equal((await DB.prepare("SELECT calls FROM contact_agent_budget WHERE visitor='global'").first<{calls: number}>())!.calls, 5);
    assert.equal((await ask('192.0.2.2')).status, 200);
    assert.equal(providerCalls, 6);
    assert.equal((await DB.prepare("SELECT COUNT(*) AS n FROM contact_agent_budget WHERE day < date('now')").first<{n: number}>())!.n, 0);
    const others = await Promise.all(Array.from({ length: 100 }, (_, i) => ask(`198.51.100.${i}`)));
    assert.equal(others.filter(response => response.status === 200).length, 94);
    assert.equal(providerCalls, 100);
    assert.equal((await ask('203.0.113.1')).status, 429);
  } finally { globalThis.fetch = original; await mf.dispose(); }
});
