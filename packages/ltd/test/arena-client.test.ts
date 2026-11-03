import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ArenaClient } from '../src/lib/integrations/arena/client.ts';

test('reads every contents page when the upstream response omits pagination metadata', async (t) => {
  const blocks = Array.from({ length: 101 }, (_, index) => ({ id: index + 1, class: 'Image' }));
  const pages: number[] = [];
  t.mock.method(globalThis, 'fetch', async (input: string) => {
    const url = new URL(input);
    if (!url.pathname.endsWith('/contents'))
      return Response.json({ length: 101, updated_at: '2026-10-30' });
    const page = Number(url.searchParams.get('page'));
    pages.push(page);
    return Response.json({ contents: blocks.slice((page - 1) * 100, page * 100) });
  });
  const result = await new ArenaClient().getAllChannelBlocks('large-channel');
  assert.equal(result.length, 101);
  assert.deepEqual(pages, [1, 2]);
});

test('rejects an incomplete channel instead of presenting it as a successful snapshot', async (t) => {
  t.mock.method(globalThis, 'fetch', async (input: string) => {
    const url = new URL(input);
    return Response.json(
      url.pathname.endsWith('/contents')
        ? { contents: [{ id: 1 }] }
        : { length: 101, updated_at: '2026-10-30' }
    );
  });
  await assert.rejects(
    new ArenaClient().getAllChannelBlocks('incomplete'),
    /incomplete|duplicate/i
  );
});

test('rejects a channel changed while its snapshot was being fetched', async (t) => {
  let metadataReads = 0;
  t.mock.method(globalThis, 'fetch', async (input: string) => {
    const url = new URL(input);
    if (url.pathname.endsWith('/contents')) return Response.json({ contents: [{ id: 1 }] });
    return Response.json({ length: 1, updated_at: String(++metadataReads) });
  });
  await assert.rejects(new ArenaClient().getAllChannelBlocks('changing'), /changed/i);
});

for (const action of ['create', 'connect', 'update'] as const) {
  test(`${action} invalidates full-channel snapshots before the next read`, async (t) => {
    const values = new Map<string, string>();
    const cache = {
      get: async (key: string) => {
        const value = values.get(key);
        return value ? JSON.parse(value) : null;
      },
      put: async (key: string, value: string) => { values.set(key, value); },
      delete: async (key: string) => { values.delete(key); }
    } as KVNamespace;
    let blocks = [{ id: 1, class: 'Image' }];
    let generation = 1;
    t.mock.method(globalThis, 'fetch', async (input: string, options: RequestInit = {}) => {
      const url = new URL(input);
      if (options.method === 'POST' || options.method === 'PUT') {
        blocks = [...blocks, { id: 2, class: 'Image' }];
        generation++;
        return Response.json({ id: 2 });
      }
      return Response.json(url.pathname.endsWith('/contents')
        ? { contents: blocks }
        : { length: blocks.length, updated_at: String(generation) });
    });
    const client = new ArenaClient({ cache, accessToken: 'synthetic-test-token' });
    assert.equal((await client.getAllChannelBlocks('curated')).length, 1);
    assert.ok(values.has('arena:all-blocks:v2:curated'));
    if (action === 'create') await client.createBlock('curated', { source: 'https://example.test/image.jpg' });
    if (action === 'connect') await client.connectBlock('curated', 2);
    if (action === 'update') await client.updateChannel('curated', { title: 'Updated' });
    assert.equal((await client.getAllChannelBlocks('curated')).length, 2);
  });
}
