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

test('single-reference responses preserve same-master related examples and resources', async () => {
 const { db, sqlite } = fixture();
 try {
  sqlite.exec(`
   INSERT INTO masters(id,slug,name) VALUES('other','other','Other');
   INSERT INTO examples(id,master_id,title,created_at) VALUES('foreign','other','Foreign',999);
   INSERT INTO resources(id,master_id,title,created_at) VALUES
    ('resource-first','arena-taste','First',100),
    ('resource-related','arena-taste','Related',200),
    ('resource-foreign','other','Foreign',999);
  `);
  const example = await fetchReferenceById(db, 'arena-motion');
  assert.deepEqual(example?.relatedIds, ['arena-legacy', 'arena-layout']);
  assert.equal(example?.channel, 'motion-language');
  const resource = await fetchReferenceById(db, 'resource-first');
  assert.deepEqual(resource?.relatedIds, ['resource-related']);
  assert.equal(resource?.channel, null);
 } finally { sqlite.close(); }
});

test('minimalism retrieval includes references exclusive to the configured Clean and Minimalism channels', async () => {
 const { db, sqlite } = fixture();
 try {
  sqlite.exec(`
   INSERT INTO examples(id,master_id,title,created_at) VALUES
    ('arena-clean-only','arena-taste','Clean reference',400),
    ('arena-minimalism-only','arena-taste','Minimalism reference',500);
   INSERT INTO taste_reference_channels VALUES
    ('arena-clean-only','clean-mymjklzsah4','https://www.are.na/block/3',600),
    ('arena-minimalism-only','minimalism-cpx4fblmr3i','https://www.are.na/block/4',600);
  `);
  const references = await fetchReferencesWithContext(db, { intent: 'minimalism', limit: 10 });
  const clean = references.find(reference => reference.id === 'arena-clean-only');
  const minimalism = references.find(reference => reference.id === 'arena-minimalism-only');
  assert.equal(clean?.channel, 'clean-mymjklzsah4');
  assert.equal(minimalism?.channel, 'minimalism-cpx4fblmr3i');
  assert.deepEqual(clean?.channels, ['clean-mymjklzsah4']);
  assert.deepEqual(minimalism?.channels, ['minimalism-cpx4fblmr3i']);
  const motion = await fetchReferencesWithContext(db, { intent: 'motion', limit: 10 });
  assert.ok(motion.every(reference => !reference.id.endsWith('-only')));
 } finally { sqlite.close(); }
});
