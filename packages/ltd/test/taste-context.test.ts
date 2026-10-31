import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTasteDb } from './helpers/taste-db.ts';
import {
  fetchTasteContext,
  fetchReferencesWithContext,
  fetchReferenceById
} from '../src/lib/taste/context.ts';

function fixture() {
  const state = createTasteDb();
  state.sqlite.exec(`
  INSERT INTO examples(id,master_id,title,image_url,created_at) VALUES
   ('arena-layout','arena-taste','Architecture','https://example.test/architecture.jpg',200),
   ('arena-motion','arena-taste','Transition','https://example.test/transition.gif',100),
   ('arena-legacy','arena-taste','Unattributed legacy image','https://example.test/legacy.jpg',300);
  INSERT INTO taste_reference_channels VALUES
   ('arena-layout','canon-minimalism','https://www.are.na/block/1',500),
   ('arena-motion','motion-language','https://www.are.na/block/2',600),
   ('arena-motion','motion-minimal-simple','https://www.are.na/block/2',600);
 `);
  return state;
}

test('intent retrieval selects actual channel members and never relabels unrelated images', async () => {
  const { db, sqlite } = fixture();
  try {
    const motion = await fetchReferencesWithContext(db, { intent: 'motion', limit: 3 });
    assert.deepEqual(
      motion.map((reference) => reference.id),
      ['arena-motion']
    );
    assert.equal(motion[0].channel, 'motion-language');
    assert.equal(motion[0].imageUrl, 'https://example.test/transition.gif');
    const layout = await fetchReferencesWithContext(db, { intent: 'layout', limit: 3 });
    assert.deepEqual(
      layout.map((reference) => reference.id),
      ['arena-layout']
    );
  } finally {
    sqlite.close();
  }
});

test('legacy references have unknown provenance and metadata is not presented as image inspection', async () => {
  const { db, sqlite } = fixture();
  try {
    const refs = await fetchReferencesWithContext(db, { limit: 3 });
    const legacy = refs.find((reference) => reference.id === 'arena-legacy')!;
    assert.equal(legacy.channel, null);
    assert.deepEqual(legacy.principles, []);
    assert.equal(legacy.visual.composition, undefined);
    const reference = await fetchReferenceById(db, 'arena-motion');
    assert.equal(reference?.channel, 'motion-language');
  } finally {
    sqlite.close();
  }
});

test('sync freshness remains unknown until a real successful-sync checkpoint exists', async () => {
  const { db, sqlite } = fixture();
  try {
    assert.equal((await fetchTasteContext(db)).stats.lastSync, null);
    sqlite.exec("INSERT INTO taste_sync_state VALUES('canon-minimalism',1000)");
    assert.equal((await fetchTasteContext(db)).stats.lastSync, '1970-01-01T00:16:40.000Z');
  } finally {
    sqlite.close();
  }
});

test('invalid internal limits remain bounded instead of reaching SQLite as NaN', async () => {
 const { db, sqlite } = fixture();
 try {
  assert.equal((await fetchReferencesWithContext(db, { limit: Number.NaN })).length, 3);
  assert.equal((await fetchReferencesWithContext(db, { limit: -1 })).length, 1);
 } finally { sqlite.close(); }
});
