import test from 'node:test';
import assert from 'node:assert/strict';

import { canonicalToolName } from '../src/canonical-tool-name.mjs';

test('rejects non-string input', () => {
  for (const value of [undefined, null, 42, {}, []]) {
    assert.throws(() => canonicalToolName(value), TypeError);
  }
});

test('rejects empty and whitespace-only input', () => {
  assert.throws(() => canonicalToolName(''), RangeError);
  assert.throws(() => canonicalToolName(' \t\n '), RangeError);
});

test('trims surrounding whitespace and lowercases ASCII letters', () => {
  assert.equal(canonicalToolName('  FETCHUsers  '), 'fetchusers');
});

test('collapses runs of spaces, underscores, and hyphens to one hyphen', () => {
  assert.equal(canonicalToolName('Fetch  __-- User'), 'fetch-user');
});

test('accepts digits after the first character', () => {
  assert.equal(canonicalToolName('tool2'), 'tool2');
});

test('rejects a leading digit', () => {
  assert.throws(() => canonicalToolName('2tool'), RangeError);
});

test('rejects punctuation', () => {
  assert.throws(() => canonicalToolName('tool/name'), RangeError);
});

test('accepts exactly 48 output characters and rejects 49', () => {
  const fortyEight = `a${'b'.repeat(47)}`;
  const fortyNine = `a${'b'.repeat(48)}`;

  assert.equal(canonicalToolName(fortyEight), fortyEight);
  assert.throws(() => canonicalToolName(fortyNine), RangeError);
});
