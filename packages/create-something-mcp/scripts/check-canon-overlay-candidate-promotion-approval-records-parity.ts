#!/usr/bin/env tsx
import assert from 'node:assert/strict';
import { join } from 'node:path';

import {
  buildCanonOverlayCandidatePromotionApprovalRecords,
  buildCanonOverlayCandidatePromotionPlans,
  buildCanonOverlayCandidatePromotionReadinessReports,
  buildCanonOverlayCandidateQueue,
  buildCanonOverlayCandidateReviewPackets,
  buildCanonOverlayIntakeInventory
} from '../../canon/src/lib/overlays/intake.js';
import {
  CANON_OVERLAY_CANDIDATE_PROMOTION_APPROVAL_RECORDS
} from '../src/content/generated/canon-overlay-candidate-promotion-approval-records.js';

const rootDir = join(import.meta.dirname, '..', '..', '..');
const canonInventory = await buildCanonOverlayIntakeInventory({
  rootDir,
  rootLabel: '<repo-root>'
});
const canonQueue = buildCanonOverlayCandidateQueue(canonInventory);
const canonPackets = buildCanonOverlayCandidateReviewPackets(canonQueue);
const canonPlans = buildCanonOverlayCandidatePromotionPlans(canonPackets);
const canonReports = buildCanonOverlayCandidatePromotionReadinessReports(canonPlans);
const canonApprovalRecords = buildCanonOverlayCandidatePromotionApprovalRecords(canonReports);

assert.deepEqual(
  CANON_OVERLAY_CANDIDATE_PROMOTION_APPROVAL_RECORDS,
  canonApprovalRecords,
  'Generated MCP Canon overlay candidate promotion approval records must match @create-something/canon/overlays/intake'
);

assert.equal(
  CANON_OVERLAY_CANDIDATE_PROMOTION_APPROVAL_RECORDS.id,
  'canon-overlay-candidate-promotion-approval-records'
);
assert.equal(
  CANON_OVERLAY_CANDIDATE_PROMOTION_APPROVAL_RECORDS.sourceOfTruth,
  '@create-something/canon/overlays/intake'
);
assert.equal(
  CANON_OVERLAY_CANDIDATE_PROMOTION_APPROVAL_RECORDS.summary.total,
  CANON_OVERLAY_CANDIDATE_PROMOTION_APPROVAL_RECORDS.entries.length
);
assert.equal(
  CANON_OVERLAY_CANDIDATE_PROMOTION_APPROVAL_RECORDS.entries.every((entry) =>
    entry.approvalUri.endsWith('/approval-record')
  ),
  true
);

console.log('Canon overlay candidate promotion approval records MCP parity passed.');
