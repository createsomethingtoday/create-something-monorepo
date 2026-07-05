#!/usr/bin/env tsx
import assert from 'node:assert/strict';
import { join } from 'node:path';

import {
  buildCanonOverlayCandidateQueue,
  buildCanonOverlayIntakeInventory
} from '../../canon/src/lib/overlays/intake.js';
import { CANON_OVERLAY_CANDIDATE_QUEUE } from '../src/content/generated/canon-overlay-candidate-queue.js';

const rootDir = join(import.meta.dirname, '..', '..', '..');
const canonInventory = await buildCanonOverlayIntakeInventory({
  rootDir,
  rootLabel: '<repo-root>'
});
const canonQueue = buildCanonOverlayCandidateQueue(canonInventory);

assert.deepEqual(
  CANON_OVERLAY_CANDIDATE_QUEUE,
  canonQueue,
  'Generated MCP Canon overlay candidate queue must match @create-something/canon/overlays/intake'
);

assert.equal(CANON_OVERLAY_CANDIDATE_QUEUE.id, 'canon-overlay-candidate-queue');
assert.equal(CANON_OVERLAY_CANDIDATE_QUEUE.sourceOfTruth, '@create-something/canon/overlays/intake');
assert.equal(CANON_OVERLAY_CANDIDATE_QUEUE.summary.total, CANON_OVERLAY_CANDIDATE_QUEUE.entries.length);

console.log('Canon overlay candidate queue MCP parity passed.');
