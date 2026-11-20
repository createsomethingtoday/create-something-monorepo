import assert from 'node:assert/strict';
import { test } from 'node:test';
import { notionTestExports } from '../src/notion';

const env = { NOTION_API_KEY: 'synthetic-key', NOTION_DATABASE_ID: 'synthetic-db', NOTION_WRITE_MODE: 'api' } as any;
function limited(status = 429, seconds = '2') {
  return new Response(JSON.stringify({ code: status === 429 ? 'rate_limited' : 'service_overload', additional_data: { rate_limit_reason: 'public_api_request_rate_limit' } }),
    { status, headers: { 'Retry-After': seconds } });
}
test('real block reader honors Retry-After then returns the complete next-page receipt', async t => {
  const waits: number[] = []; let calls = 0;
  t.mock.method(globalThis, 'setTimeout', (resolve: () => void, delay: number) => { waits.push(delay); queueMicrotask(resolve); return 1; });
  t.mock.method(Math, 'random', () => 0);
  t.mock.method(globalThis, 'fetch', async (input: string) => {
    assert.match(String(input), /\/blocks\/parent\/children\?page_size=100&start_cursor=cursor/);
    return ++calls === 1 ? limited() : Response.json({ results: [{ id: 'last-part' }], has_more: false, next_cursor: null });
  });
  const response = await notionTestExports.createNotionTransport(env).listBlockChildren('parent', 'cursor');
  assert.deepEqual(response, { results: [{ id: 'last-part' }], has_more: false, next_cursor: null });
  assert.equal(calls, 2); assert.deepEqual(waits, [2000]);
});

for (const [status, code] of [[529, 'service_overload'], [429, 'rate_limited']] as const) {
  test(`database query POST is a read and retries ${status} without changing its filter`, async t => {
    const sent: string[] = []; const waits: number[] = [];
    t.mock.method(globalThis, 'setTimeout', (resolve: () => void, delay: number) => { waits.push(delay); queueMicrotask(resolve); return 1; });
    t.mock.method(Math, 'random', () => 0);
    t.mock.method(globalThis, 'fetch', async (_: unknown, init: RequestInit) => {
      assert.equal(init.method, 'POST'); sent.push(String(init.body));
      return sent.length === 1 ? limited(status) : Response.json({ results: [] });
    });
    await notionTestExports.createNotionTransport(env).queryDatabase({ property: 'Source URL', url: { equals: 'https://synthetic.invalid' } }, 100);
    assert.equal(sent.length, 2); assert.equal(sent[0], sent[1]); assert.deepEqual(waits, [2000]);
  });
}

test('repeated read throttles stop after three requests and respect each cooldown', async t => {
  let calls = 0; const waits: number[] = [];
  t.mock.method(Math, 'random', () => 0);
  t.mock.method(globalThis, 'setTimeout', (resolve: () => void, delay: number) => { waits.push(delay); queueMicrotask(resolve); return 1; });
  t.mock.method(globalThis, 'fetch', async () => { calls++; return limited(429, '43'); });
  await assert.rejects(notionTestExports.createNotionTransport(env).getPage('source'), /Notion API error \(429\)/);
  assert.equal(calls, 3); assert.deepEqual(waits, [43000, 43000]);
});

for (const seconds of ['121', '99999999999999999999999999999999999']) {
  test(`a long provider cooldown (${seconds}) is surfaced without an early retry`, async t => {
    let calls = 0;
    t.mock.method(globalThis, 'fetch', async () => { calls++; return limited(429, seconds); });
    await assert.rejects(notionTestExports.createNotionTransport(env).getPage('source'), /Notion API error \(429\)/);
    assert.equal(calls, 1);
  });
}

for (const seconds of [null, 'invalid', '-1', '1.5']) {
  test(`missing or malformed cooldown ${seconds} uses bounded backoff`, async t => {
    const waits: number[] = []; let calls = 0;
    t.mock.method(Math, 'random', () => 0);
    t.mock.method(globalThis, 'setTimeout', (resolve: () => void, delay: number) => { waits.push(delay); queueMicrotask(resolve); return 1; });
    t.mock.method(globalThis, 'fetch', async () => {
      if (++calls === 3) return Response.json({ id: 'source' });
      const response = limited();
      if (seconds === null) response.headers.delete('Retry-After'); else response.headers.set('Retry-After', seconds);
      return response;
    });
    await notionTestExports.createNotionTransport(env).getPage('source');
    assert.deepEqual(waits, [1000, 2000]);
  });
}

for (const response of [
  () => Response.json({ code: 'rate_limited', additional_data: { rate_limit_reason: 'public_api_request_blocked' } }, { status: 429 }),
  () => new Response('upstream unknown', { status: 429 }),
  () => Response.json({ code: 'service_unavailable' }, { status: 503 }),
  () => Response.json({ code: 'unauthorized' }, { status: 401 }),
  () => Response.json(null, { status: 429 }),
]) {
  test('blocked, permanent, ambiguous and unrecognized reads are not retried', async t => {
    let calls = 0;
    t.mock.method(globalThis, 'fetch', async () => { calls++; return response(); });
    await assert.rejects(notionTestExports.createNotionTransport(env).getPage('source'));
    assert.equal(calls, 1);
  });
}

test('transport uncertainty propagates without retry', async t => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; throw Error('socket lost'); });
  await assert.rejects(notionTestExports.createNotionTransport(env).getPage('source'), /socket lost/);
  assert.equal(calls, 1);
});

for (const operation of ['createPage', 'createChildPage', 'updatePage', 'appendBlocks', 'updateBlock', 'archiveBlock']) {
  test(`mutation ${operation} is never replayed, including an explicit 429`, async t => {
    let calls = 0;
    t.mock.method(globalThis, 'fetch', async () => { calls++; return limited(); });
    const transport = notionTestExports.createNotionTransport(env) as any;
    const args: Record<string, unknown[]> = {
      createPage: [{}], createChildPage: ['source', 'title', []], updatePage: ['source', {}],
      appendBlocks: ['source', []], updateBlock: ['source', { type: 'paragraph', paragraph: {} }], archiveBlock: ['source'],
    };
    await assert.rejects(transport[operation](...args[operation]!)); assert.equal(calls, 1);
  });
}

test('actual artifact writer completes a committed append after throttled readback without sending it twice', async t => {
  const { ensureArtifact, textBlock } = await import('../src/indexed-transcript');
  const transport = notionTestExports.createNotionTransport(env);
  const children = new Map<string, any[]>([['archive', []]]); let appends = 0; let throttled = false;
  t.mock.method(Math, 'random', () => 0);
  t.mock.method(globalThis, 'setTimeout', (resolve: () => void) => { queueMicrotask(resolve); return 1; });
  t.mock.method(globalThis, 'fetch', async (input: string, init: RequestInit) => {
    const parent = new URL(String(input)).pathname.split('/')[3]!;
    if (init.method === 'PATCH') {
      appends++;
      const block = JSON.parse(String(init.body)).children[0];
      children.set('receipt', block.toggle.children.map((b: any, i: number) => ({ ...b, id: `chunk-${i}` })));
      delete block.toggle.children;
      children.get(parent)!.push({ ...block, id: 'receipt', has_children: true });
      return Response.json({ results: [] });
    }
    if (parent === 'archive' && appends === 1 && !throttled) { throttled = true; return limited(429, '1'); }
    return Response.json({ results: children.get(parent), has_more: false, next_cursor: null });
  });
  const reserved = new Set<string>();
  const journal = { async assertOwner() {}, async reserve(key: string) { if (reserved.has(key)) return false; reserved.add(key); return true; } };
  const provider = { list: async (parent: string) => (await transport.listBlockChildren(parent)).results as any[],
    append: (parent: string, blocks: any[]) => transport.appendBlocks(parent, blocks) };
  const artifact = { key: 'part:1', title: 'Part 0001/1', chunks: ['00:00\nSpeaker: full source'] };
  const id = await ensureArtifact(provider, journal, 'archive', 'version', artifact);
  assert.equal(id, 'receipt'); assert.equal(appends, 1); assert.equal(throttled, true); assert.equal(reserved.size, 1);
  assert.equal(await ensureArtifact(provider, journal, 'archive', 'version', artifact), id);
  assert.equal(appends, 1); // Repeat uses the positive receipt; no reservation reset.
});
