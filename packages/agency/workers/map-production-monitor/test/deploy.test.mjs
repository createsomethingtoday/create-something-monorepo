import assert from 'node:assert/strict';
import test from 'node:test';

import { deploymentArgs, hasReceiptTable, parseArgs } from '../scripts/deploy.mjs';

const SHA = 'C'.repeat(40);

test('deployment accepts only a bounded dry-run option', () => {
  assert.deepEqual(parseArgs([]), { dryRun: false });
  assert.deepEqual(parseArgs(['--dry-run']), { dryRun: true });
  assert.throws(() => parseArgs(['--commit-dirty']), /Only --dry-run/);
});

test('deployment always injects an exact normalized source SHA', () => {
  assert.deepEqual(deploymentArgs(SHA, true), [
    'deploy',
    '--config',
    'wrangler.toml',
    '--var',
    `MAP_MONITOR_SOURCE_SHA:${SHA.toLowerCase()}`,
    '--message',
    `map-production-monitor ${SHA.toLowerCase()}`,
    '--dry-run'
  ]);
  assert.throws(() => deploymentArgs('short', false), /40-character Git SHA/);
});

test('deployment refuses to proceed without the remote D1 receipt table', () => {
  assert.equal(
    hasReceiptTable([{ success: true, results: [{ name: 'map_production_monitor_receipts' }] }]),
    true
  );
  assert.equal(hasReceiptTable([{ success: true, results: [] }]), false);
  assert.equal(hasReceiptTable([{ success: false, results: [{ name: 'map_production_monitor_receipts' }] }]), false);
});
