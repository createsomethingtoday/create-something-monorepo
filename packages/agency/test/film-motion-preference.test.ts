import { test } from 'node:test';
import assert from 'node:assert/strict';
import { get } from 'svelte/store';
import { initializeFilmMotion, reducedFilmMotion, toggleFilmMotion } from '../src/lib/motion/filmPlayback';

test('motion follows OS until explicitly changed, and remembers the choice on reload', () => {
  const values = new Map<string, string>();
  let listener = () => {};
  const preference = { matches: false, addEventListener: (_: string, fn: () => void) => { listener = fn; }, removeEventListener: () => {} };
  Object.assign(globalThis, { matchMedia: () => preference, sessionStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) } });
  let cleanup = initializeFilmMotion();
  assert.equal(get(reducedFilmMotion), false);
  preference.matches = true; listener();
  assert.equal(get(reducedFilmMotion), true);
  toggleFilmMotion();
  assert.equal(get(reducedFilmMotion), false);
  listener(); assert.equal(get(reducedFilmMotion), false);
  cleanup(); cleanup = initializeFilmMotion();
  assert.equal(get(reducedFilmMotion), false);
  toggleFilmMotion(); cleanup(); cleanup = initializeFilmMotion();
  assert.equal(get(reducedFilmMotion), true);
  cleanup();
});
