import test from 'node:test';
import assert from 'node:assert/strict';

import { extractJobState, normalizeUsStateFilter } from '../lib/state.js';

test('normalizeUsStateFilter expands abbreviations and preserves canonical names', () => {
  assert.equal(normalizeUsStateFilter('pa'), 'Pennsylvania');
  assert.equal(normalizeUsStateFilter('TX'), 'Texas');
  assert.equal(normalizeUsStateFilter('north carolina'), 'North Carolina');
});

test('extractJobState prefers payload location area state', () => {
  const state = extractJobState({
    rawPayload: JSON.stringify({
      location: {
        area: ['US', 'California', 'Los Angeles County'],
      },
    }),
    location: 'Los Angeles, CA',
  });

  assert.equal(state, 'California');
});

test('extractJobState falls back to location abbreviation parsing', () => {
  const state = extractJobState({
    rawPayload: JSON.stringify({
      url: 'https://example.com/job',
    }),
    location: 'Prosper, TX',
  });

  assert.equal(state, 'Texas');
});
