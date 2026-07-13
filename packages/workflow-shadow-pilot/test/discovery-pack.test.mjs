import assert from 'node:assert/strict';
import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { createWorkflowPilotDiscoveryPack } from '../dist/index.js';

const packageDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const repoRoot = path.resolve(packageDir, '../..');

test('builds a deterministic read-only discovery pack for every owning marketplace surface', async () => {
  const discoveryPack = await createWorkflowPilotDiscoveryPack({ repoRoot });

  assert.equal(discoveryPack.schemaVersion, 'workflow_shadow_discovery_pack.v0.1');
  assert.equal(discoveryPack.mode, 'shadow');
  assert.match(discoveryPack.policySha256, /^sha256:[0-9a-f]{64}$/);
  assert.deepEqual(
    discoveryPack.adapters.map((adapter) => adapter.id),
    ['atlas', 'intake', 'policy', 'review', 'substrate', 'validation'],
  );
  assert.equal(discoveryPack.sources.length, 6);

  for (const source of discoveryPack.sources) {
    assert.match(source.sha256, /^sha256:[0-9a-f]{64}$/);
    assert.equal(path.isAbsolute(source.relativePath), false);
  }

  for (const adapter of discoveryPack.adapters) {
    assert.equal(adapter.read, true);
    assert.equal(adapter.write, false);
    assert.equal(adapter.authority, 'observe_only');
    assert.deepEqual(adapter.permissions, ['read']);
    assert.match(adapter.evidence, /^[a-z0-9_]+$/);
    assert.match(adapter.receipt, /^[a-z0-9_]+$/);
    assert.match(adapter.escalation, /^[a-z0-9_]+$/);
  }
});

test('fails closed with an actionable diagnostic when a required source is unavailable', async () => {
  const emptyRepo = await mkdtemp(path.join(os.tmpdir(), 'workflow-shadow-empty-repo-'));

  try {
    const policyPath = 'packages/workflow-shadow-pilot/fixtures/marketplace/discovery-policy.json';
    await mkdir(path.dirname(path.join(emptyRepo, policyPath)), { recursive: true });
    await copyFile(path.join(repoRoot, policyPath), path.join(emptyRepo, policyPath));
    await assert.rejects(
      createWorkflowPilotDiscoveryPack({ repoRoot: emptyRepo }),
      (error) => {
        assert.equal(error.code, 'REQUIRED_SOURCE_UNAVAILABLE');
        assert.equal(error.sourceId, 'atlas');
        assert.equal(
          error.relativePath,
          'packages/database-layer/data/create-something-internal-operating-topology.atlas-session.json',
        );
        return true;
      },
    );
  } finally {
    await rm(emptyRepo, { recursive: true, force: true });
  }
});

test('fails closed when an owning source drifts from the versioned discovery policy', async () => {
  const baseline = await createWorkflowPilotDiscoveryPack({ repoRoot });
  const driftedRepo = await mkdtemp(path.join(os.tmpdir(), 'workflow-shadow-drifted-repo-'));

  try {
    for (const source of baseline.sources) {
      const destination = path.join(driftedRepo, source.relativePath);
      await mkdir(path.dirname(destination), { recursive: true });
      await copyFile(path.join(repoRoot, source.relativePath), destination);
    }

    const policyPath = 'packages/workflow-shadow-pilot/fixtures/marketplace/discovery-policy.json';
    await mkdir(path.dirname(path.join(driftedRepo, policyPath)), { recursive: true });
    await copyFile(path.join(repoRoot, policyPath), path.join(driftedRepo, policyPath));
    await writeFile(
      path.join(driftedRepo, 'apps/marketplace-template-submission-cloud/vendor/core/submission.ts'),
      'drifted intake contract\n',
      'utf8',
    );

    await assert.rejects(
      createWorkflowPilotDiscoveryPack({ repoRoot: driftedRepo }),
      (error) => {
        assert.equal(error.code, 'SOURCE_HASH_MISMATCH');
        assert.equal(error.sourceId, 'intake');
        assert.match(error.expectedSha256, /^sha256:[0-9a-f]{64}$/);
        assert.match(error.actualSha256, /^sha256:[0-9a-f]{64}$/);
        assert.notEqual(error.expectedSha256, error.actualSha256);
        return true;
      },
    );
  } finally {
    await rm(driftedRepo, { recursive: true, force: true });
  }
});
