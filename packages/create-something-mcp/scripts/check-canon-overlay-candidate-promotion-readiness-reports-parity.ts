#!/usr/bin/env tsx
import assert from 'node:assert/strict';
import { join } from 'node:path';

import {
  buildCanonOverlayCandidatePromotionPlans,
  buildCanonOverlayCandidatePromotionReadinessReports,
  buildCanonOverlayCandidateQueue,
  buildCanonOverlayCandidateReviewPackets,
  buildCanonOverlayIntakeInventory
} from '../../canon/src/lib/overlays/intake.js';
import {
  CANON_OVERLAY_CANDIDATE_PROMOTION_READINESS_REPORTS
} from '../src/content/generated/canon-overlay-candidate-promotion-readiness-reports.js';

const rootDir = join(import.meta.dirname, '..', '..', '..');
const canonInventory = await buildCanonOverlayIntakeInventory({
  rootDir,
  rootLabel: '<repo-root>'
});
const canonQueue = buildCanonOverlayCandidateQueue(canonInventory);
const canonPackets = buildCanonOverlayCandidateReviewPackets(canonQueue);
const canonPlans = buildCanonOverlayCandidatePromotionPlans(canonPackets);
const canonReports = buildCanonOverlayCandidatePromotionReadinessReports(canonPlans);

assert.deepEqual(
  CANON_OVERLAY_CANDIDATE_PROMOTION_READINESS_REPORTS,
  canonReports,
  'Generated MCP Canon overlay candidate promotion readiness reports must match @create-something/canon/overlays/intake'
);

assert.equal(
  CANON_OVERLAY_CANDIDATE_PROMOTION_READINESS_REPORTS.id,
  'canon-overlay-candidate-promotion-readiness-reports'
);
assert.equal(
  CANON_OVERLAY_CANDIDATE_PROMOTION_READINESS_REPORTS.sourceOfTruth,
  '@create-something/canon/overlays/intake'
);
assert.equal(
  CANON_OVERLAY_CANDIDATE_PROMOTION_READINESS_REPORTS.summary.total,
  CANON_OVERLAY_CANDIDATE_PROMOTION_READINESS_REPORTS.entries.length
);
assert.equal(
  CANON_OVERLAY_CANDIDATE_PROMOTION_READINESS_REPORTS.entries.every((entry) =>
    entry.readinessUri.endsWith('/readiness')
  ),
  true
);

console.log('Canon overlay candidate promotion readiness reports MCP parity passed.');
