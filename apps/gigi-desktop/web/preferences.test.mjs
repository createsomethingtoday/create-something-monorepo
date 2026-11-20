import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults, normalizePreferences, readPreferences, writePreferences, importPreferences, exportPreferences, applyPreferences } from './preferences.mjs';

function memoryStorage() {
  const values = new Map();
  return { values, getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
}

test('a complete visual configuration survives export, import and workspace restart', () => {
  const storage = memoryStorage();
  const value = { ...defaults, version: 1, theme: 'paper', density: 'compact', startPage: 'tasks', collectionView: 'cards', scheduleView: 'all' };
  assert.deepEqual(writePreferences(storage, 'band', importPreferences(exportPreferences(value))), value);
  assert.deepEqual(readPreferences(storage, 'band'), value);
  assert.deepEqual(readPreferences(storage, 'solo'), defaults);
  writePreferences(storage, 'solo', { theme: 'midnight' });
  assert.equal(readPreferences(storage, 'band').theme, 'paper');
  assert.equal(readPreferences(storage, 'solo').theme, 'midnight');
});

test('missing, corrupt and unsupported saved configurations recover to defaults', () => {
  const storage = memoryStorage();
  writePreferences(storage, 'test', defaults);
  const key = [...storage.values.keys()][0];
  for (const raw of ['broken', 'null', '[]', '{"version":2,"theme":"paper"}', '{"theme":"paper","density":"tiny"}']) {
    storage.setItem(key, raw);
    assert.deepEqual(readPreferences(storage, 'test'), defaults);
  }
  assert.deepEqual(readPreferences({ getItem() { throw new Error('blocked'); } }, 'test'), defaults);
  assert.deepEqual(readPreferences(null, 'test'), defaults);
  assert.deepEqual(readPreferences(storage, ''), defaults);
});

test('imports validate the entire document before applying any setting', () => {
  for (const text of ['null', '[]', 'true', '"paper"', '{', '{"version":3}', '{"theme":"custom"}', '{"density":"tiny"}', '{"startPage":"settings"}', '{"collectionView":"html"}', '{"scheduleView":"today"}', '{"token":"secret"}', '{"css":"body{}"}', '{"__proto__":{"theme":"paper"}}', '{"constructor":{}}', '{"theme":"paper","density":"bad"}', ' '.repeat(16385)]) {
    assert.throws(() => importPreferences(text), /configuration/i, text.slice(0, 60));
  }
  assert.throws(() => importPreferences('{"theme":"' + 'é'.repeat(8192) + '"}'), /configuration/i);
  assert.deepEqual(importPreferences('{"version":1,"theme":"paper"}'), { ...defaults, theme: 'paper' });
});

test('normalization strips unknown data and replaces unsafe values without mutation', () => {
  const input = { theme: 'paper', density: 'tiny', libraryOpen: 'false', css: 'bad', token: 'secret' };
  const normalized = normalizePreferences(input);
  assert.deepEqual(normalized, { ...defaults, theme: 'paper' });
  assert.equal(input.css, 'bad');
  assert.deepEqual(normalizePreferences(Object.create({ theme: 'paper' })), defaults);
  assert.deepEqual(normalizePreferences({ version: 7, theme: 'paper' }), defaults);
  assert.doesNotMatch(exportPreferences(input), /secret|css|tiny/);
});

test('write failures and missing workspace IDs fail explicitly', () => {
  assert.throws(() => writePreferences(memoryStorage(), '', defaults), /workspace/i);
  assert.throws(() => writePreferences(null, 'test', defaults), /save/i);
  assert.throws(() => writePreferences({ setItem() { throw new Error('quota'); } }, 'test', defaults), /save/i);
});

test('applying preferences uses only validated theme and density attributes', () => {
  const document = { documentElement: { dataset: {} } };
  applyPreferences({ theme: 'paper', density: 'compact', css: 'bad' }, document);
  assert.deepEqual(document.documentElement.dataset, { theme: 'paper', density: 'compact', collectionView: 'list', chatWidth: 'standard', chatTextSize: 'standard', chatDensity: 'comfortable' });
  applyPreferences({ theme: '<script>', density: 'tiny' }, document);
  assert.deepEqual(document.documentElement.dataset, { theme: 'studio', density: 'comfortable', collectionView: 'list', chatWidth: 'standard', chatTextSize: 'standard', chatDensity: 'comfortable' });
  assert.doesNotThrow(() => applyPreferences(defaults, {}));
});

// Frozen reader from the 0.2.18 rollback source, rather than a permissive mock.
const rollback = await import('../scripts/fixtures/preferences-0218.mjs');
test('saving chat extensions keeps the rollback reader compatible, including re-upgrade', () => {
  const storage = memoryStorage();
  const legacy = { ...rollback.defaults, theme: 'midnight', density: 'compact', startPage: 'tasks', collectionView: 'cards', scheduleView: 'all' };
  rollback.writePreferences(storage, 'band', legacy);
  assert.deepEqual(readPreferences(storage, 'band'), { ...defaults, ...legacy });
  const extended = { ...legacy, chatWidth: 'wide', chatTextSize: 'larger', chatDensity: 'compact' };
  writePreferences(storage, 'band', extended);
  assert.deepEqual(rollback.readPreferences(storage, 'band'), legacy);
  assert.deepEqual(readPreferences(storage, 'band'), extended);
  rollback.writePreferences(storage, 'band', { ...legacy, theme: 'paper' });
  assert.deepEqual(readPreferences(storage, 'band'), { ...extended, theme: 'paper' });
  assert.deepEqual(readPreferences(storage, 'solo'), defaults);
});

test('chat extension corruption cannot erase core preferences or inject core fields', () => {
  const storage = memoryStorage();
  const value = { ...defaults, theme: 'paper', startPage: 'tasks' };
  writePreferences(storage, 'band', value);
  for (const text of ['broken', 'null', '{"version":3}', '{"chatWidth":"huge"}', '{"theme":"midnight"}', '{"token":"secret"}']) {
    storage.setItem('gigi:chat-preferences:v1:band', text);
    assert.deepEqual(readPreferences(storage, 'band'), value);
  }
});
test('combined candidate storage migrates only when explicitly saved and reset keeps rollback compatibility', () => {
  const storage = memoryStorage();
  const value = { ...defaults, theme: 'midnight', chatWidth: 'wide' };
  storage.setItem('gigi:preferences:v1:band', JSON.stringify(value));
  assert.deepEqual(readPreferences(storage, 'band'), value);
  assert.equal(storage.values.size, 1, 'read must not rewrite local storage');
  writePreferences(storage, 'band', readPreferences(storage, 'band'));
  assert.equal(rollback.readPreferences(storage, 'band').theme, 'midnight');
  writePreferences(storage, 'band', defaults);
  assert.deepEqual(readPreferences(storage, 'band'), defaults);
  assert.deepEqual(rollback.readPreferences(storage, 'band'), rollback.defaults);
});
test('failed extension writes restore the previous core and chat entries', () => {
  const storage = memoryStorage();
  const value = { ...defaults, theme: 'paper', chatWidth: 'wide' };
  writePreferences(storage, 'band', value);
  const before = [...storage.values]; const set = storage.setItem;
  storage.setItem = (key, text) => { if (key.includes('chat-preferences') && text.includes('larger')) throw Error('quota'); set(key, text); };
  assert.throws(() => writePreferences(storage, 'band', { ...value, theme: 'midnight', chatTextSize: 'larger' }), /save/i);
  assert.deepEqual([...storage.values], before);
  assert.deepEqual(readPreferences(storage, 'band'), value);
});

test('default copied configuration imports in the advertised rollback build', () => {
  const value = { ...defaults, theme: 'midnight', density: 'compact', startPage: 'tasks', collectionView: 'cards', scheduleView: 'all', chatWidth: 'wide', chatTextSize: 'larger', chatDensity: 'compact' };
  const exported = exportPreferences(value);
  assert.deepEqual(rollback.importPreferences(exported), { ...rollback.defaults, theme: 'midnight', density: 'compact', startPage: 'tasks', collectionView: 'cards', scheduleView: 'all' });
  assert.equal(JSON.parse(exported).version, 1);
  assert.doesNotMatch(exported, /chatWidth|chatTextSize|chatDensity/);
});

test('explicit chat-inclusive configuration uses its own version and roundtrips all choices', () => {
  const value = { ...defaults, theme: 'paper', chatWidth: 'wide', chatTextSize: 'larger', chatDensity: 'compact' };
  const exported = exportPreferences(value, { includeChat: true });
  assert.equal(JSON.parse(exported).version, 2);
  assert.deepEqual(importPreferences(exported), value);
  assert.throws(() => rollback.importPreferences(exported), /version/);
});

test('chat-inclusive imports retain strict validation and do not change on-device schema', () => {
  const storage = memoryStorage();
  const full = exportPreferences({ ...defaults, theme: 'paper', chatWidth: 'wide' }, { includeChat: true });
  writePreferences(storage, 'band', importPreferences(full));
  assert.equal(rollback.readPreferences(storage, 'band').theme, 'paper');
  assert.equal(JSON.parse(storage.getItem('gigi:preferences:v1:band')).version, 1);
  assert.equal(JSON.parse(storage.getItem('gigi:chat-preferences:v1:band')).version, 1);
  for (const text of ['{"version":2,"token":"secret"}', '{"version":2,"chatWidth":"huge"}', '{"version":3,"theme":"paper"}']) assert.throws(() => importPreferences(text), /configuration/i);
});
