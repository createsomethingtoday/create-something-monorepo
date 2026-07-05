#!/usr/bin/env tsx
import assert from 'node:assert/strict';

import { getCanonOverlayCatalog } from '../../canon/src/lib/overlays/index.js';
import { CANON_OVERLAY_CATALOG } from '../src/content/generated/canon-overlay-catalog.js';

assert.deepEqual(
  CANON_OVERLAY_CATALOG,
  getCanonOverlayCatalog(),
  'Generated MCP Canon overlay catalog must match @create-something/canon/overlays'
);

assert.equal(CANON_OVERLAY_CATALOG.templates.length, 1);
assert.equal(CANON_OVERLAY_CATALOG.templates[0]?.review.status, 'ready');
assert.deepEqual(CANON_OVERLAY_CATALOG.templates[0]?.manifest.targetModalities, [
  'web',
  'chat',
  'app',
  'voice',
  'glasses'
]);

console.log('Canon overlay catalog MCP parity passed.');
