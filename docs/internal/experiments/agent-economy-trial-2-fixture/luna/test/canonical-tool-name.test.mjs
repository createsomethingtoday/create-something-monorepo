import test from 'node:test';
import assert from 'node:assert/strict';

import { canonicalToolName } from '../src/canonical-tool-name.mjs';

test('throws TypeError for non-string input', () => {
  for (const value of [undefined, null, 42, {}, ['tool']]) {
    assert.throws(() => canonicalToolName(value), TypeError);
  }
});

test('throws RangeError for empty and whitespace-only input', () => {
  assert.throws(() => canonicalToolName(''), RangeError);
  assert.throws(() => canonicalToolName(' \t\n\r '), RangeError);
});

test('trims surrounding whitespace and lowercases ASCII letters', () => {
  assert.equal(canonicalToolName('  SEND-Email  '), 'send-email');
});

test('collapses runs of spaces, underscores, and hyphens to one hyphen', () => {
  assert.equal(canonicalToolName('build   ___---  preview'), 'build-preview');
});

test('accepts digits after the first character', () => {
  assert.equal(canonicalToolName('release-2026'), 'release-2026');
});

test('rejects a leading digit', () => {
  assert.throws(() => canonicalToolName('7-tool'), RangeError);
});

test('rejects punctuation such as a slash', () => {
  assert.throws(() => canonicalToolName('build/api'), RangeError);
});

test('accepts exactly 48 output characters and rejects 49', () => {
  assert.equal(canonicalToolName('a'.repeat(48)), 'a'.repeat(48));
  assert.throws(() => canonicalToolName('a'.repeat(49)), RangeError);
});
