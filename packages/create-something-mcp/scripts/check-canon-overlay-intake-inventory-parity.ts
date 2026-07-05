#!/usr/bin/env tsx
import assert from 'node:assert/strict';
import { join } from 'node:path';

import { buildCanonOverlayIntakeInventory } from '../../canon/src/lib/overlays/intake.js';
import { CANON_OVERLAY_INTAKE_INVENTORY } from '../src/content/generated/canon-overlay-intake-inventory.js';

const rootDir = join(import.meta.dirname, '..', '..', '..');
const canonInventory = await buildCanonOverlayIntakeInventory({
  rootDir,
  rootLabel: '<repo-root>'
});

assert.deepEqual(
  CANON_OVERLAY_INTAKE_INVENTORY,
  canonInventory,
  'Generated MCP Canon overlay intake inventory must match @create-something/canon/overlays/intake'
);

assert.equal(CANON_OVERLAY_INTAKE_INVENTORY.id, 'canon-overlay-intake-inventory');
assert.equal(CANON_OVERLAY_INTAKE_INVENTORY.sourceOfTruth, '@create-something/canon/overlays/intake');
assert.equal(CANON_OVERLAY_INTAKE_INVENTORY.summary.total, CANON_OVERLAY_INTAKE_INVENTORY.entries.length);

console.log('Canon overlay intake inventory MCP parity passed.');
