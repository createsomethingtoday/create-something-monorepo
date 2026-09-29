import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import generated from '../src/lib/server/foundation/catalog.generated.json';
import { FoundationError, getFoundationLesson, searchFoundation, sections, type FoundationCatalog, type FoundationEntry } from '../src/lib/server/foundation/core';
import { handleMcp, lessonSchema, searchSchema } from '../src/lib/server/foundation/service';
import { EXPIRE_SQL, RATE_SQL, readBoundedJson } from '../src/lib/server/foundation/guard';
import { handle } from '../src/hooks.server';

const catalog = generated as FoundationCatalog;
async function load(entry: FoundationEntry) {
  const [corpus, group, lesson] = entry.id.split('/');
  return readFile(new URL(corpus === 'original' ? `../src/lib/content/lessons/${group}/${lesson}.md` : `../src/lib/content/reference/phases/${group}/${lesson}/en.md`, import.meta.url), 'utf8');
}

const relevance: [string, string[]][] = [
  ['agent loop', ['original/governed-agent-engineering/build-the-loop','reference/14-agent-engineering/01-the-agent-loop']],
  ['memory', ['original/governed-agent-engineering/give-it-memory-and-tools','reference/14-agent-engineering/07-memory-virtual-context-memgpt']],
  ['tools', ['original/governed-agent-engineering/give-it-memory-and-tools','reference/14-agent-engineering/06-tool-use-and-function-calling']],
  ['evaluation', ['reference/11-llm-engineering/10-evaluation','reference/14-agent-engineering/30-eval-driven-agent-development']],
  ['permissions approvals', ['original/governed-agent-engineering/govern-the-boundary']]
];

test('public inventory, content hashes and provenance cover exactly the published corpus', async () => {
  assert.equal(catalog.entries.length, 540);
  assert.equal(catalog.entries.filter(x => x.corpus === 'reference').length, 523);
  assert.equal(new Set(catalog.entries.map(x => x.id)).size, 540);
  for (const entry of catalog.entries) {
    assert.equal(createHash('sha256').update(await load(entry)).digest('hex'), entry.contentHash);
    assert.match(entry.url, /^https:\/\/learn.createsomething.space\/(paths|reference)\//);
    if (entry.corpus === 'reference') { assert.ok(entry.sourceUrl.includes(entry.revision)); assert.ok(entry.licenseUrl); }
  }
});
test('five onboarding concepts return a relevant result in the top five', () => {
  for (const [query, accepted] of relevance) {
    const result = searchFoundation(catalog, query);
    assert.ok(result.results.some(x => accepted.includes(x.id)), `${query}: ${result.results.map(x => x.id).join(', ')}`);
    assert.deepEqual(result, searchFoundation(catalog, query));
    assert.ok(result.results.length <= 5);
    assert.ok(result.results.every(x => !('terms' in x) && !('content' in x)));
  }
  assert.deepEqual(searchFoundation(catalog, 'zxqvnonexistenttopic').results, []);
});
test('strict request contracts and allowlist reject traversal, URLs and unbounded inputs', async () => {
  assert.throws(() => searchFoundation(catalog, 'x'.repeat(201)), FoundationError);
  assert.throws(() => searchFoundation(catalog, 'memory', 11), FoundationError);
  assert.equal(searchSchema.safeParse({ query: 'memory', privateContext: 'client data' }).success, false);
  assert.equal(lessonSchema.safeParse({ id: 'x', maxChars: 12001 }).success, false);
  for (const id of ['../../secrets', 'https://example.com', 'original/private/runbook']) {
    await assert.rejects(getFoundationLesson(catalog, () => { throw new Error('Must not load'); }, { id }), /Lesson not found/);
  }
});
test('sections ignore fenced headings, disambiguate repeated headings, and include child sections', () => {
  const text = '# Lesson\n\n## Same\nA\n~~~py\n# hidden\n~~~\n### Child\nB\n## Same\nC';
  const headings = sections(text);
  assert.deepEqual(headings.map(x => x.id), ['lesson', 'same', 'child', 'same-2']);
  assert.ok(text.slice(headings[1].start, headings[1].end).includes('Child'));
  assert.ok(!text.slice(headings[1].start, headings[1].end).endsWith('C'));
});
test('bounded Unicode continuation reconstructs content and rejects a changed revision', async () => {
  const entry = catalog.entries[0];
  const text = '# Intro\n' + '🍃é'.repeat(800);
  let result = await getFoundationLesson(catalog, async () => text, { id: entry.id, maxChars: 500 });
  let reconstructed = result.content;
  assert.equal(Array.from(result.content).length, 500);
  assert.ok(result.pagination.truncated);
  while (result.pagination.next) {
    result = await getFoundationLesson(catalog, async () => text, result.pagination.next);
    reconstructed += result.content;
  }
  assert.equal(reconstructed, text);
  await assert.rejects(getFoundationLesson(catalog, load, { id: entry.id, revision: '0'.repeat(64) }), /revision changed/);
  await assert.rejects(getFoundationLesson(catalog, load, { id: entry.id, section: 'missing' }), /Section not found/);
});
test('all real section IDs are unique and each bounded fetch stays within the response budget', async () => {
  for (const entry of catalog.entries) {
    const result = await getFoundationLesson(catalog, load, { id: entry.id, maxChars: 12000 });
    assert.equal(new Set(result.sections.map(x => x.id)).size, result.sections.length);
    assert.ok(Array.from(result.content).length <= 12000);
    assert.ok(Buffer.byteLength(JSON.stringify(result)) < 80000, entry.id);
  }
});
test('streamed request byte cap applies without Content-Length', async () => {
  const request = new Request('https://example.com', { method: 'POST', body: 'x'.repeat(8193) });
  assert.equal(request.headers.get('content-length'), null);
  await assert.rejects(readBoundedJson(request), /exceeds/);
  assert.deepEqual(await readBoundedJson(new Request('https://example.com', { method: 'POST', body: '{"ok":true}' })), { ok: true });
});
test('foundation routes do not process bearer tokens or refresh cookies', async () => {
  const cases: Record<string, string>[] = [{}, { authorization: 'Bearer invalid' }, { cookie: 'cs_access_token=expired; cs_refresh_token=secret' }];
  for (const headers of cases) {
    const event = {
      url: new URL('https://learn.createsomething.space/api/foundation/search?query=memory'),
      request: new Request('https://learn.createsomething.space/api/foundation/search', { headers }),
      get cookies() { throw new Error('Foundation must not read cookies'); },
      get locals() { throw new Error('Foundation must not read user state'); },
      get platform() { throw new Error('Auth hook must not access learner DB'); }
    };
    const response = await handle({ event: event as never, resolve: async () => new Response('public') });
    assert.equal(await response.text(), 'public');
    assert.equal(response.headers.get('set-cookie'), null);
  }
});
test('quota SQL increments atomically, saturates, resets per window, and removes expired counters', async () => {
  const db = new DatabaseSync(':memory:');
  db.exec(await readFile(new URL('../migrations/0007_foundation_rate_limits.sql', import.meta.url), 'utf8'));
  const increment = db.prepare(RATE_SQL);
  const hits = Array.from({ length: 100 }, () => (increment.get('test', 10) as { hits: number }).hits);
  assert.equal(hits.filter(x => x <= 60).length, 60);
  assert.equal(hits[99], 61);
  assert.equal((increment.get('test', 11) as { hits: number }).hits, 1);
  db.prepare(EXPIRE_SQL).run(11);
  assert.equal((db.prepare('SELECT COUNT(*) AS count FROM foundation_rate_limits').get() as { count: number }).count, 1);
  db.close();
});
test('real MCP SDK negotiates stateless transport and exposes exactly two read-only tools', async () => {
  const client = new Client({ name: 'foundation-contract-test', version: '1.0.0' });
  const transport = new StreamableHTTPClientTransport(new URL('https://example.com/mcp'), { fetch: async (url, init) => {
    const request = new Request(url, init);
    const body = request.method === 'POST' ? await request.clone().json() : undefined;
    return handleMcp(request, body, catalog, load);
  }});
  await client.connect(transport);
  try {
    const listed = await client.listTools();
    assert.deepEqual(listed.tools.map(x => x.name).sort(), ['get_foundation_lesson', 'search_foundation']);
    assert.ok(listed.tools.every(x => x.annotations?.readOnlyHint && !x.annotations?.destructiveHint));
    const found = await client.callTool({ name: 'search_foundation', arguments: { query: 'agent loop', limit: 1 } });
    const result = found.structuredContent as { results: FoundationEntry[] };
    const fetched = await client.callTool({ name: 'get_foundation_lesson', arguments: { id: result.results[0].id, maxChars: 500 } });
    assert.equal(fetched.isError, undefined);
    assert.ok(JSON.stringify(fetched.structuredContent).includes('Educational reference'));
    const invalid = await client.callTool({ name: 'learn_complete', arguments: {} });
    assert.equal(invalid.isError, true);
  } finally { await client.close(); }
});

 test('MCP rejects batches before content loading', async () => {
  const body = Array.from({ length: 46 }, (_, id) => ({ jsonrpc: '2.0', id, method: 'tools/call', params: { name: 'get_foundation_lesson', arguments: { id: 'reference/11-llm-engineering/09-function-calling', maxChars: 12000 } } }));
  const request = new Request('https://learn.createsomething.space/api/foundation/mcp', { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' }, body: JSON.stringify(body) });
  const response = await handleMcp(request, await readBoundedJson(request), catalog, async () => { assert.fail('Batch must never load content'); });
  assert.equal(response.status, 400);
  assert.match(await response.text(), /batches are not supported/);
});
test('section IDs reserve emitted numeric suffixes in both orders', () => {
  for (const markdown of ['# Lesson\n## Same\nA\n## Same\nB\n## Same-2\nC', '# Lesson\n## Same-2\nA\n## Same\nB\n## Same\nC']) {
    const ids = sections(markdown).map(x => x.id);
    assert.equal(new Set(ids).size, 4);
  }
});
