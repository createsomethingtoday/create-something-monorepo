#!/usr/bin/env tsx
import assert from 'node:assert/strict';
import { join } from 'node:path';

import {
  buildCanonOverlayCandidatePromotionPlans,
  buildCanonOverlayCandidateQueue,
  buildCanonOverlayCandidateReviewPackets,
  buildCanonOverlayIntakeInventory
} from '../../canon/src/lib/overlays/intake.js';
import {
  CANON_OVERLAY_CANDIDATE_PROMOTION_PLANS
} from '../src/content/generated/canon-overlay-candidate-promotion-plans.js';

const rootDir = join(import.meta.dirname, '..', '..', '..');
const canonInventory = await buildCanonOverlayIntakeInventory({
  rootDir,
  rootLabel: '<repo-root>'
});
const canonQueue = buildCanonOverlayCandidateQueue(canonInventory);
const canonPackets = buildCanonOverlayCandidateReviewPackets(canonQueue);
const canonPlans = buildCanonOverlayCandidatePromotionPlans(canonPackets);

assert.deepEqual(
  CANON_OVERLAY_CANDIDATE_PROMOTION_PLANS,
  canonPlans,
  'Generated MCP Canon overlay candidate promotion plans must match @create-something/canon/overlays/intake'
);

assert.equal(CANON_OVERLAY_CANDIDATE_PROMOTION_PLANS.id, 'canon-overlay-candidate-promotion-plans');
assert.equal(
  CANON_OVERLAY_CANDIDATE_PROMOTION_PLANS.sourceOfTruth,
  '@create-something/canon/overlays/intake'
);
assert.equal(
  CANON_OVERLAY_CANDIDATE_PROMOTION_PLANS.summary.total,
  CANON_OVERLAY_CANDIDATE_PROMOTION_PLANS.entries.length
);
assert.equal(
  CANON_OVERLAY_CANDIDATE_PROMOTION_PLANS.entries.every((entry) =>
    entry.planUri.endsWith('/promotion-plan')
  ),
  true
);

console.log('Canon overlay candidate promotion plans MCP parity passed.');
