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
