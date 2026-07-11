import assert from 'node:assert/strict';
import test from 'node:test';

import { reviewerCaseCap } from '../src/reviewer-sampling.js';

test('reviewer cap never rounds above the configured maximum share', () => {
  assert.equal(reviewerCaseCap(8, 0.35), 2);
  assert.equal(reviewerCaseCap(50, 0.35), 17);
  assert.equal(reviewerCaseCap(1, 0.35), 1);
});
