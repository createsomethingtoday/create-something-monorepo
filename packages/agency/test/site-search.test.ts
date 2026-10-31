import assert from 'node:assert/strict';
import test from 'node:test';
import routes from '../src/lib/data/searchRoutes.json';
import { findResults, searchCatalog, validateSearch } from '../src/lib/site-search/catalog.ts';
import { createSearchController, type SearchState } from '../src/lib/site-search/controller.ts';
import { registerSearchTools, type SiteDocument, type SiteTool } from '../src/lib/site-search/webmcp.ts';

// All modelContext objects below are fixtures. These tests do not establish
// discovery, permissions, annotations, or execution acceptance in a real host.
const settled = () => new Promise<void>((resolve) => setImmediate(resolve));
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}
function fixtureDocument(registerTool?: (tool: SiteTool, options: { signal: AbortSignal }) => void | Promise<void>, iframe = false): SiteDocument {
  const view: { top?: unknown } = {};
  view.top = iframe ? {} : view;
  return { defaultView: view, modelContext: registerTool ? { registerTool } : undefined } as unknown as SiteDocument;
}

test('catalog includes only canonical public Agency routes and usable local IDs', () => {
  const allowed = new Set(routes.map((route) => route.path));
  assert.ok(searchCatalog.length > 4);
  assert.equal(new Set(searchCatalog.map((entry) => entry.id)).size, searchCatalog.length);
  for (const entry of searchCatalog) {
    assert.ok(allowed.has(entry.id), entry.id);
    assert.equal(entry.url, `https://createsomething.agency${entry.id}`);
    assert.doesNotMatch(entry.id, /^\/(?:api|account|admin|auth|clients|delivery|dify|mcp-access|prospects|work)(?:\/|$)/);
    assert.doesNotMatch(entry.id, /^\/map\//);
    assert.ok(entry.title && entry.description && entry.excerpt);
  }
});

test('search arguments trim queries and reject unknown, malformed, or oversized input', () => {
  assert.deepEqual(validateSearch({ query: '  MCP  ' }), { query: 'MCP', category: 'all' });
  assert.deepEqual(validateSearch({ query: '', category: 'guides' }), { query: '', category: 'guides' });
  for (const value of [null, [], 'query', {}, { query: 1 }, { query: 'x'.repeat(161) }, { query: '', category: 'private' }, { query: '', url: '/account' }]) {
    assert.throws(() => validateSearch(value));
  }
  assert.equal(validateSearch({ query: 'x'.repeat(160) }).query.length, 160);
});

test('empty queries browse by category; repeated queries are stable; no matches stay empty', () => {
  assert.deepEqual(findResults('', 'all'), searchCatalog);
  for (const category of ['guides', 'overview'] as const) {
    const results = findResults('   ', category);
    assert.ok(results.length);
    assert.ok(results.every((entry) => entry.category === category));
  }
  assert.deepEqual(findResults('MCP', 'guides'), findResults('mcp', 'guides'));
  assert.ok(findResults('MCP', 'guides').length);
  assert.deepEqual(findResults('zzzx-unmatched-search-zzzx', 'all'), []);
});

test('overlapping searches cannot publish stale results or return stale success', async () => {
  const waits: ReturnType<typeof deferred>[] = [];
  const frames: SearchState[] = [];
  const controller = createSearchController((state) => frames.push(state), () => {
    const wait = deferred(); waits.push(wait); return wait.promise;
  });
  const older = controller.search({ query: 'support' }, 'agent');
  const newer = controller.search({ query: 'MCP', category: 'guides' }, 'human');
  waits[0].resolve();
  assert.deepEqual(await older, { status: 'superseded' });
  waits[1].resolve();
  await settled();
  waits[2].resolve();
  const result = await newer;
  assert.equal(result.status, 'ready');
  assert.equal(controller.snapshot().query, 'MCP');
  assert.equal(controller.snapshot().source, 'human');
  assert.ok(controller.snapshot().results.length);
  assert.ok(frames.filter((frame) => frame.status === 'ready' && frame.revision > 0).every((frame) => frame.query === 'MCP'));
});

test('abort, explicit cancellation, and disposal prevent pending search completion', async () => {
  for (const mode of ['abort', 'cancel', 'dispose'] as const) {
    const firstPaint = deferred();
    let paints = 0;
    const controller = createSearchController(() => {}, () => ++paints === 1 ? firstPaint.promise : Promise.resolve());
    const signal = new AbortController();
    const pending = controller.search({ query: 'MCP' }, 'agent', signal.signal);
    if (mode === 'abort') signal.abort();
    else controller[mode]();
    firstPaint.resolve();
    assert.equal((await pending).status, mode === 'abort' ? 'cancelled' : 'superseded');
    assert.deepEqual(controller.snapshot().results, []);
  }
  const controller = createSearchController(() => {}, async () => {});
  const before = controller.snapshot();
  const aborted = new AbortController(); aborted.abort();
  assert.deepEqual(await controller.search({ query: 'MCP' }, 'agent', aborted.signal), { status: 'cancelled' });
  assert.deepEqual(controller.snapshot(), before);
  controller.dispose();
  assert.deepEqual(await controller.search({ query: '' }, 'agent'), { status: 'cancelled' });
  await assert.rejects(controller.select('/services', 'agent'), /closed/);
});

test('selection accepts only completed current results and clears on a new search', async () => {
  const controller = createSearchController(() => {}, async () => {});
  await assert.rejects(controller.select('/mcp-access', 'agent'), /current completed search/);
  await controller.select('/services', 'human');
  assert.equal(controller.snapshot().selectedId, '/services');
  await controller.search({ query: 'zzzx-unmatched-search-zzzx' }, 'agent');
  assert.equal(controller.snapshot().selectedId, null);
  assert.deepEqual(controller.snapshot().results, []);
  await assert.rejects(controller.select('/services', 'agent'), /current completed search/);
  const pending = controller.search({ query: '' }, 'human');
  await assert.rejects(controller.select('/services', 'agent'), /current completed search/);
  await pending;
  await controller.select('/services', 'agent');
  await controller.select(null, 'history');
  assert.equal(controller.snapshot().selectedId, null);
  assert.equal(controller.snapshot().source, 'history');
});

test('abort during the final render does not report a successful tool result', async () => {
  const finalPaint = deferred();
  let paints = 0;
  const controller = createSearchController(() => {}, () => ++paints === 2 ? finalPaint.promise : Promise.resolve());
  const abort = new AbortController();
  const pending = controller.search({ query: 'MCP' }, 'agent', abort.signal);
  await settled();
  abort.abort();
  finalPaint.resolve();
  assert.equal((await pending).status, 'cancelled');
});

test('fixture registration is top-level only and absent APIs preserve fallback', () => {
  const operations = { search: async () => ({}), read: () => ({}), select: async () => ({}) };
  for (const doc of [fixtureDocument(), fixtureDocument(() => { assert.fail('iframe registration'); }, true)]) {
    const statuses: string[] = [];
    const cleanup = registerSearchTools(doc, operations, (status) => statuses.push(status));
    assert.deepEqual(statuses, ['unavailable']);
    cleanup();
  }
});

test('fixture registration failure aborts previously registered tools and stops registration', async () => {
  const signals: AbortSignal[] = [];
  const statuses: string[] = [];
  registerSearchTools(fixtureDocument(async (_tool, options) => {
    signals.push(options.signal);
    if (signals.length === 2) throw new Error('fixture rejection');
  }), { search: async () => ({}), read: () => ({}), select: async () => ({}) }, (status) => statuses.push(status));
  await settled();
  assert.equal(signals.length, 2);
  assert.ok(signals.every((signal) => signal.aborted));
  assert.deepEqual(statuses, ['failed']);
});

test('fixture tools delegate shared operations, validate selection, propagate abort, and clean up', async () => {
  const registered: SiteTool[] = [];
  const signals: AbortSignal[] = [];
  const statuses: string[] = [];
  const calls: unknown[] = [];
  const cleanup = registerSearchTools(fixtureDocument((tool, options) => { registered.push(tool); signals.push(options.signal); }), {
    search: async (args, signal) => { calls.push([args, signal]); return { status: 'ready' }; },
    read: () => ({ query: 'MCP' }),
    select: async (id) => { calls.push(id); return { selectedId: id }; }
  }, (status) => statuses.push(status));
  await settled();
  assert.deepEqual(statuses, ['available']);
  assert.deepEqual(registered.map((tool) => tool.name), ['search_agency', 'read_agency_search', 'select_agency_result']);
  const [search, read, select] = registered;
  const abort = new AbortController();
  await search.execute({ query: 'MCP' }, { signal: abort.signal });
  assert.deepEqual(calls[0], [{ query: 'MCP' }, abort.signal]);
  assert.deepEqual(await read.execute({}), { query: 'MCP' });
  for (const input of [null, [], {}, { id: 1 }, { id: '/services', extra: true }]) await assert.rejects(select.execute(input));
  assert.deepEqual(await select.execute({ id: '/services' }), { selectedId: '/services' });
  abort.abort();
  assert.deepEqual(await select.execute({ id: '/services' }, { signal: abort.signal }), { status: 'cancelled' });
  cleanup();
  assert.ok(signals.every((signal) => signal.aborted));
  assert.deepEqual(await select.execute({ id: '/services' }), { status: 'cancelled' });
});
