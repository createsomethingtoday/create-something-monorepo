import assert from 'node:assert/strict';
import test from 'node:test';

import {
  deploymentArgs,
  hasRequiredMonitorTables,
  parseArgs,
  serializeAlertSecrets
} from '../scripts/deploy.mjs';

const SHA = 'C'.repeat(40);

test('deployment accepts only a bounded dry-run option', () => {
  assert.deepEqual(parseArgs([]), { dryRun: false });
  assert.deepEqual(parseArgs(['--dry-run']), { dryRun: true });
  assert.throws(() => parseArgs(['--commit-dirty']), /Only --dry-run/);
});

test('deployment always injects an exact normalized source SHA and version-scoped alert secret file', () => {
  assert.deepEqual(deploymentArgs(SHA, true, '/private/tmp/map-monitor-secrets.env'), [
    'deploy',
    '--config',
    'wrangler.toml',
    '--var',
    `MAP_MONITOR_SOURCE_SHA:${SHA.toLowerCase()}`,
    '--message',
    `map-production-monitor ${SHA.toLowerCase()}`,
    '--secrets-file',
    '/private/tmp/map-monitor-secrets.env',
    '--dry-run'
  ]);
  assert.throws(() => deploymentArgs('short', false), /40-character Git SHA/);
});

test('deployment accepts only a non-empty single-line alert credential without rendering its value', () => {
  assert.equal(serializeAlertSecrets('re_live_value'), 'RESEND_API_KEY=re_live_value\n');
  assert.throws(() => serializeAlertSecrets(''), /RESEND_API_KEY/);
  assert.throws(() => serializeAlertSecrets('one\ntwo'), /single line/);
});

test('deployment refuses to proceed unless both remote Map D1 tables exist', () => {
  assert.equal(
    hasRequiredMonitorTables([
      {
        success: true,
        results: [
          { name: 'map_production_monitor_receipts' },
          { name: 'map_production_monitor_alerts' },
        ],
      },
    ]),
    true
  );
  assert.equal(hasRequiredMonitorTables([{ success: true, results: [{ name: 'map_production_monitor_receipts' }] }]), false);
  assert.equal(hasRequiredMonitorTables([{ success: true, results: [{ name: 'map_production_monitor_alerts' }] }]), false);
  assert.equal(hasRequiredMonitorTables([{ success: false, results: [{ name: 'map_production_monitor_receipts' }] }]), false);
});
