#!/usr/bin/env tsx
import assert from 'node:assert/strict';
import { join } from 'node:path';

import {
  buildCanonOverlayCandidateQueue,
  buildCanonOverlayCandidateReviewPackets,
  buildCanonOverlayIntakeInventory
} from '../../canon/src/lib/overlays/intake.js';
import {
  CANON_OVERLAY_CANDIDATE_REVIEW_PACKETS
} from '../src/content/generated/canon-overlay-candidate-review-packets.js';

const rootDir = join(import.meta.dirname, '..', '..', '..');
const canonInventory = await buildCanonOverlayIntakeInventory({
  rootDir,
  rootLabel: '<repo-root>'
});
const canonQueue = buildCanonOverlayCandidateQueue(canonInventory);
const canonPackets = buildCanonOverlayCandidateReviewPackets(canonQueue);

assert.deepEqual(
  CANON_OVERLAY_CANDIDATE_REVIEW_PACKETS,
  canonPackets,
  'Generated MCP Canon overlay candidate review packets must match @create-something/canon/overlays/intake'
);

assert.equal(CANON_OVERLAY_CANDIDATE_REVIEW_PACKETS.id, 'canon-overlay-candidate-review-packets');
assert.equal(
  CANON_OVERLAY_CANDIDATE_REVIEW_PACKETS.sourceOfTruth,
  '@create-something/canon/overlays/intake'
);
assert.equal(
  CANON_OVERLAY_CANDIDATE_REVIEW_PACKETS.summary.total,
  CANON_OVERLAY_CANDIDATE_REVIEW_PACKETS.entries.length
);
assert.equal(
  CANON_OVERLAY_CANDIDATE_REVIEW_PACKETS.entries.every((entry) =>
    entry.handoffUri.endsWith('/handoff')
  ),
  true
);

console.log('Canon overlay candidate review packets MCP parity passed.');
