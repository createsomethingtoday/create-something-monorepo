import test from 'node:test';
import assert from 'node:assert/strict';

import { canonicalToolName } from '../src/canonical-tool-name.mjs';

test('requires a non-empty string tool name', () => {
  assert.throws(() => canonicalToolName(null), TypeError);
  assert.throws(() => canonicalToolName(''), RangeError);
  assert.throws(() => canonicalToolName(' \t\n '), RangeError);
});

test('trims, lowercases ASCII letters, and collapses separators', () => {
  assert.equal(
    canonicalToolName('  Deploy__Production  -- Report  '),
    'deploy-production-report',
  );
});

test('allows digits after the first character', () => {
  assert.equal(canonicalToolName('v2-build-2026'), 'v2-build-2026');
});

test('rejects invalid leading characters and punctuation', () => {
  assert.throws(() => canonicalToolName('2fast'), RangeError);
  assert.throws(() => canonicalToolName('deploy/production'), RangeError);
});

test('accepts 48 characters and rejects 49', () => {
  assert.equal(canonicalToolName(`a${'b'.repeat(47)}`), `a${'b'.repeat(47)}`);
  assert.throws(() => canonicalToolName(`a${'b'.repeat(48)}`), RangeError);
});
