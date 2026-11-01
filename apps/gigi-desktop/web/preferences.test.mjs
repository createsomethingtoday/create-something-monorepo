import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults, normalizePreferences, readPreferences, writePreferences, importPreferences, exportPreferences, applyPreferences } from './preferences.mjs';

function memoryStorage() {
  const values = new Map();
  return { values, getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test('a complete visual configuration survives export, import and workspace restart', () => {
  const storage = memoryStorage();
  const value = { version: 1, theme: 'paper', density: 'compact', startPage: 'tasks', collectionView: 'cards', scheduleView: 'all' };
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
  for (const text of ['null', '[]', 'true', '"paper"', '{', '{"version":2}', '{"theme":"custom"}', '{"density":"tiny"}', '{"startPage":"settings"}', '{"collectionView":"html"}', '{"scheduleView":"today"}', '{"token":"secret"}', '{"css":"body{}"}', '{"__proto__":{"theme":"paper"}}', '{"constructor":{}}', '{"theme":"paper","density":"bad"}', ' '.repeat(16385)]) {
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
  assert.deepEqual(document.documentElement.dataset, { theme: 'paper', density: 'compact', collectionView: 'list' });
  applyPreferences({ theme: '<script>', density: 'tiny' }, document);
  assert.deepEqual(document.documentElement.dataset, { theme: 'studio', density: 'comfortable', collectionView: 'list' });
  assert.doesNotThrow(() => applyPreferences(defaults, {}));
});
