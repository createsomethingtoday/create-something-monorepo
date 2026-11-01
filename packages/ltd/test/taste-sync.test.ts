import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTasteDb } from './helpers/taste-db';
import { syncArenaChannel } from '../src/lib/taste/provenance';
import type { ArenaBlock } from '../src/lib/integrations/arena/types';

function block(id: number, title = `Reference ${id}`): ArenaBlock {
  return {
    id,
    title,
    generated_title: title,
    class: 'Image',
    base_class: 'Block',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
    state: 'available',
    comment_count: 0,
    user: {
      id: 1,
      slug: 'curator',
      username: 'curator',
      first_name: '',
      last_name: '',
      full_name: 'Curator',
      avatar: '',
      avatar_image: { thumb: '', display: '' }
    },
    image: {
      filename: 'reference.jpg',
      content_type: 'image/jpeg',
      updated_at: '2026-10-01T00:00:00Z',
      thumb: { url: 'https://example.com/thumb.jpg' },
      square: { url: 'https://example.com/square.jpg' },
      display: { url: 'https://example.com/image.jpg' },
      large: { url: 'https://example.com/large.jpg' },
      original: { url: 'https://example.com/original.jpg' }
    }
  };
}

test('successful import preserves actual many-to-many channels and completion time', async () => {
  const { db, sqlite } = createTasteDb();
  const client = { getAllChannelBlocks: async () => [block(1)] };
  const first = await syncArenaChannel(db, client, 'canon-minimalism', 'arena-taste');
  assert.deepEqual(first.errors, []);
  assert.equal(first.examplesCreated, 1);
  const second = await syncArenaChannel(db, client, 'interfaces-motion', 'arena-taste');
  assert.deepEqual(second.errors, []);
  assert.equal(second.examplesUpdated, 1);
  const rows = sqlite
    .prepare(
      'SELECT reference_id, channel_slug, source_url FROM taste_reference_channels ORDER BY channel_slug'
    )
    .all();
  assert.deepEqual(
    rows.map((row) => ({ ...row })),
    [
      {
        reference_id: 'arena-1',
        channel_slug: 'canon-minimalism',
        source_url: 'https://www.are.na/block/1'
      },
      {
        reference_id: 'arena-1',
        channel_slug: 'interfaces-motion',
        source_url: 'https://www.are.na/block/1'
      }
    ]
  );
  const checkpoint = sqlite
    .prepare('SELECT last_successful_sync_at FROM taste_sync_state WHERE channel_slug=?')
    .get('interfaces-motion');
  assert.ok(Number(checkpoint?.last_successful_sync_at) > Date.parse('2026-01-01') / 1000);
  sqlite.close();
});

test('upstream failure leaves prior references, memberships, and checkpoints intact', async () => {
  const { db, sqlite } = createTasteDb();
  await syncArenaChannel(
    db,
    { getAllChannelBlocks: async () => [block(1)] },
    'canon-minimalism',
    'arena-taste'
  );
  const before = sqlite.prepare('SELECT * FROM taste_sync_state').all();
  const result = await syncArenaChannel(
    db,
    {
      getAllChannelBlocks: async () => {
        throw new Error('subscription or access unavailable');
      }
    },
    'canon-minimalism',
    'arena-taste'
  );
  assert.equal(result.errors.length, 1);
  assert.deepEqual(sqlite.prepare('SELECT * FROM taste_sync_state').all(), before);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM taste_reference_channels').get()?.n, 1);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM examples').get()?.n, 1);
  sqlite.close();
});

test('failed database import rolls back records and retains the old channel snapshot', async () => {
  const { db, sqlite } = createTasteDb();
  await syncArenaChannel(
    db,
    { getAllChannelBlocks: async () => [block(1, 'Original')] },
    'canon-minimalism',
    'arena-taste'
  );
  const checkpoint = sqlite.prepare('SELECT * FROM taste_sync_state').all();
  sqlite.exec(
    "CREATE TRIGGER fail_second BEFORE INSERT ON examples WHEN NEW.id='arena-2' BEGIN SELECT RAISE(ABORT,'fixture rejects reference'); END"
  );
  const result = await syncArenaChannel(
    db,
    { getAllChannelBlocks: async () => [block(1, 'Changed'), block(2)] },
    'canon-minimalism',
    'arena-taste'
  );
  assert.ok(result.errors.length > 0);
  assert.equal(result.examplesCreated + result.examplesUpdated, 0);
  assert.equal(
    sqlite.prepare('SELECT title FROM examples WHERE id=?').get('arena-1')?.title,
    'Original'
  );
  assert.deepEqual(sqlite.prepare('SELECT * FROM taste_sync_state').all(), checkpoint);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM taste_reference_channels').get()?.n, 1);
  sqlite.close();
});

test('successful empty channel removes that membership while retaining other channels and records', async () => {
  const { db, sqlite } = createTasteDb();
  await syncArenaChannel(
    db,
    { getAllChannelBlocks: async () => [block(1)] },
    'canon-minimalism',
    'arena-taste'
  );
  await syncArenaChannel(
    db,
    { getAllChannelBlocks: async () => [block(1)] },
    'interfaces-motion',
    'arena-taste'
  );
  await syncArenaChannel(
    db,
    { getAllChannelBlocks: async () => [] },
    'canon-minimalism',
    'arena-taste'
  );
  const rows = sqlite.prepare('SELECT channel_slug FROM taste_reference_channels').all();
  assert.deepEqual(
    rows.map((row) => row.channel_slug),
    ['interfaces-motion']
  );
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM examples').get()?.n, 1);
  sqlite.close();
});

test('canonical motion channel fetches the actual source slug and stores stable provenance', async () => {
  const { db, sqlite } = createTasteDb();
  const requested: string[] = [];
  await syncArenaChannel(
    db,
    {
      getAllChannelBlocks: async (slug) => {
        requested.push(slug);
        return [block(1)];
      }
    },
    'motion-language',
    'arena-taste'
  );
  assert.deepEqual(requested, ['motion-language-4hbfmugttwe']);
  assert.equal(
    sqlite.prepare('SELECT channel_slug FROM taste_reference_channels').get()?.channel_slug,
    'motion-language'
  );
  sqlite.close();
});

test('resource failure rolls back earlier example writes in the same channel batch', async () => {
  const { db, sqlite } = createTasteDb();
  await syncArenaChannel(
    db,
    { getAllChannelBlocks: async () => [block(1, 'Original')] },
    'canon-minimalism',
    'arena-taste'
  );
  const checkpoint = sqlite.prepare('SELECT * FROM taste_sync_state').all();
  sqlite.exec(
    "CREATE TRIGGER fail_resource BEFORE INSERT ON resources BEGIN SELECT RAISE(ABORT,'fixture rejects resource'); END"
  );
  const link = {
    ...block(2),
    class: 'Link' as const,
    source: { url: 'https://example.com/reference' }
  };
  const result = await syncArenaChannel(
    db,
    { getAllChannelBlocks: async () => [block(1, 'Changed'), link] },
    'canon-minimalism',
    'arena-taste'
  );
  assert.ok(result.errors.length > 0);
  assert.equal(
    sqlite.prepare('SELECT title FROM examples WHERE id=?').get('arena-1')?.title,
    'Original'
  );
  assert.deepEqual(sqlite.prepare('SELECT * FROM taste_sync_state').all(), checkpoint);
  assert.equal(
    result.examplesCreated +
      result.examplesUpdated +
      result.resourcesCreated +
      result.resourcesUpdated,
    0
  );
  sqlite.close();
});

test('resources receive source attribution and non-TASTE imports do not claim TASTE freshness', async () => {
  const { db, sqlite } = createTasteDb();
  const link = {
    ...block(2),
    class: 'Link' as const,
    source: { url: 'https://example.com/reference' }
  };
  const result = await syncArenaChannel(
    db,
    { getAllChannelBlocks: async () => [link] },
    'examples-swiss-design',
    'arena-taste'
  );
  assert.equal(result.resourcesCreated, 1);
  assert.equal(
    sqlite.prepare('SELECT source_url FROM taste_reference_channels').get()?.source_url,
    'https://www.are.na/block/2'
  );
  sqlite.exec("INSERT INTO masters(id,slug,name) VALUES('custom','custom','Custom')");
  const customResult = await syncArenaChannel(
    db,
    { getAllChannelBlocks: async () => [block(3)] },
    'custom-channel',
    'custom'
  );
  assert.deepEqual(customResult.errors, []);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM taste_reference_channels').get()?.n, 1);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM taste_sync_state').get()?.n, 1);
  sqlite.close();
});
