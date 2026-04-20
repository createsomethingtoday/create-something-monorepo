import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildPublicJobSearchGroups,
  expandPublicJobSearchTerm,
  normalizePublicJobFtsQuery,
  tokenizePublicJobSearchTerms,
} from '../lib/search.js';

test('tokenizePublicJobSearchTerms extracts bounded searchable terms', () => {
  const tokens = tokenizePublicJobSearchTerms('  Travel nurse, ER / nights  ');
  assert.deepEqual(tokens, ['travel', 'nurse', 'er', 'nights']);
});

test('expandPublicJobSearchTerm adds nursing aliases', () => {
  const aliases = expandPublicJobSearchTerm('nurse');
  assert.deepEqual(aliases, ['nurse', 'nurses', 'nursing', 'rn', 'registered nurse', 'registered nurses']);
});

test('buildPublicJobSearchGroups rejects empty input', () => {
  assert.throws(() => buildPublicJobSearchGroups('   $$$   '));
});

test('normalizePublicJobFtsQuery builds AND/OR groups for nurse travel queries', () => {
  const normalized = normalizePublicJobFtsQuery('travel nurse');
  assert.equal(
    normalized,
    '(travel OR traveler OR travelers OR traveling OR travelling) AND (nurse OR nurses OR nursing OR rn OR "registered nurse" OR "registered nurses")',
  );
});

test('normalizePublicJobFtsQuery expands specialty aliases', () => {
  const normalized = normalizePublicJobFtsQuery('ER RN');
  assert.equal(
    normalized,
    '(er OR ed OR "emergency room" OR "emergency department") AND (rn OR "registered nurse" OR "registered nurses" OR nurse OR nurses OR nursing)',
  );
});
