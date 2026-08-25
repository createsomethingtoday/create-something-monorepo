import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  compileWorkflowDefinition,
  createWorkflowRuntimeManifest,
  verifyWorkflowArtifactBundle,
  writeCompiledWorkflowArtifacts
} from '../../workflow-compiler/dist/index.js';
import {
  createWorkflowRuntimeRun,
  parseWorkflowRuntimeManifest,
  planWorkflowRuntimeStep
} from '../dist/index.js';

const fixtureUrl = new URL(
  '../../workflow-compiler/fixtures/marketplace/workflow.json',
  import.meta.url
);
const sha256 = (value) => `sha256:${createHash('sha256').update(value).digest('hex')}`;

test('the runtime admits a serialized manifest only after the compiler inventory and signer verify', async () => {
  const definition = JSON.parse(await readFile(fixtureUrl, 'utf8'));
  definition.schemaVersion = 'workflow_definition.v0.3';
  const bundle = compileWorkflowDefinition(definition);
  const runtimeManifest = createWorkflowRuntimeManifest(bundle, {
    schemaVersion: 'workflow_runtime_manifest_input.v0.1',
    target: 'create-something/control-runtime.v1',
    approvalExpiresAt: '2026-08-26T00:00:00.000Z',
    steps: [
      { id: 'validate', actionId: 'run_published_validation', dependsOn: [] },
      { id: 'approve', actionId: 'approve_template', dependsOn: ['validate'] }
    ]
  });
  const root = await mkdtemp(join(tmpdir(), 'runtime-compiler-fixture-'));
  const output = join(root, 'artifact');
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  try {
    await writeCompiledWorkflowArtifacts(
      bundle,
      output,
      undefined,
      { privateKey, keyId: 'runtime-fixture' },
      runtimeManifest
    );
    const inventory = await verifyWorkflowArtifactBundle(output, { publicKey });
    assert.equal(inventory.attestation.status, 'verified');
    const serializedRuntimeManifest = await readFile(join(output, 'runtime-manifest.json'));
    const parsed = parseWorkflowRuntimeManifest(
      JSON.parse(serializedRuntimeManifest.toString('utf8'))
    );
    const run = await createWorkflowRuntimeRun(parsed, {
      runId: 'compiler-fixture-run',
      activation: { id: 'fixture-activation', version: 1, policySha256: sha256('policy') },
      artifactManifestSha256: inventory.manifestHash,
      runtimeManifestSha256: sha256(serializedRuntimeManifest),
      clock: '2026-08-25T00:00:00.000Z'
    });
    assert.deepEqual(await planWorkflowRuntimeStep(parsed, run), {
      type: 'pass',
      stepId: 'validate',
      capability: runtimeManifest.steps[0].capability,
      evidenceDigest: runtimeManifest.steps[0].evidenceDigest
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
