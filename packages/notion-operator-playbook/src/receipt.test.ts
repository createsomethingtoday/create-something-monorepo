import assert from 'node:assert/strict';
import test from 'node:test';
import worker from './index.js';
import { createLocalBuildReceipt } from './receipt.js';

test('local receipt states its proof level and mutation boundary', () => {
  const receipt = createLocalBuildReceipt({
    manifest: worker.manifest,
    packageVersion: '0.1.0',
    generatedAt: '2026-08-13T20:00:00.000Z'
  });
  assert.equal(receipt.proofLevel, 'local-build-only');
  assert.equal(receipt.externalMutations, false);
  assert.deepEqual(receipt.capabilityKeys, [
    'demoEvidenceSync',
    'inspectRunbookReadiness',
    'instantiateRunbook',
    'runbookEvidenceWebhook'
  ]);
});
