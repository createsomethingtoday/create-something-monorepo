import assert from 'node:assert/strict';
import test from 'node:test';
import { cp, mkdtemp, readFile, rm, writeFile, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateKeyPairSync } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  createWorkflowRuntimeRun,
  parseWorkflowRuntimeManifest,
  planWorkflowRuntimeStep,
  reduceWorkflowRuntimeRun,
  verifyWorkflowRuntimeRun
} from '@createsomething/workflow-runtime';

const { verifyCommitProof } = await import(
  new URL('../scripts/github-commit-proof.mjs', import.meta.url).href
);
const fixture = new URL('./fixtures/github-commit-proof', import.meta.url);

test('retained authenticated read proof reopens without replaying the source and rejects tampering', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'github-proof-test-'));
  try {
    const out = join(scratch, 'proof');
    await cp(fixture, out, { recursive: true });
    const key = join(out, 'trusted-public.pem');
    const before = await readFile(join(out, 'checkpoint.json'), 'utf8');
    const first = await verifyCommitProof(out, key);
    assert.equal(first.nextDisposition, 'wait');
    assert.equal(first.readDispatches, 2);
    assert.equal(first.identityReadDispatches, 1);
    assert.equal(first.commitReadDispatches, 1);
    assert.equal(first.restartNetworkCalls, 0);
    assert.deepEqual(await verifyCommitProof(out, key), first);
    assert.equal(await readFile(join(out, 'checkpoint.json'), 'utf8'), before);
    for (const [file, mutate] of [
      [
        'observation.json',
        (value: any) => {
          value.observation.response.sha = '0'.repeat(40);
        }
      ],
      [
        'policy.json',
        (value: any) => {
          value.readOnly = false;
        }
      ],
      [
        'checkpoint.json',
        (value: any) => {
          value.receipts[1].receiptSha256 = 'sha256:' + '0'.repeat(64);
        }
      ]
    ] as const) {
      const path = join(out, file);
      const saved = await readFile(path, 'utf8');
      const changed = JSON.parse(saved);
      mutate(changed);
      await writeFile(path, JSON.stringify(changed));
      await assert.rejects(() => verifyCommitProof(out, key));
      await writeFile(path, saved);
    }
    const wrongKey = join(scratch, 'wrong.pem');
    await writeFile(
      wrongKey,
      generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'pem' })
    );
    await assert.rejects(() => verifyCommitProof(out, wrongKey));
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

test('reopening with another compiler release cannot relabel the retained proof', async () => {
  const consumer = await mkdtemp(join(tmpdir(), 'github-proof-version-'));
  try {
    await writeFile(
      join(consumer, 'package.json'),
      JSON.stringify({
        name: '@createsomething/workflow-compiler',
        type: 'module',
        exports: './index.mjs'
      })
    );
    const entry = new URL('../../workflow-compiler/dist/index.js', import.meta.url).href;
    await writeFile(
      join(consumer, 'index.mjs'),
      `export * from ${JSON.stringify(entry)}; export const WORKFLOW_COMPILER_PACKAGE_VERSION = '0.6.0';`
    );
    const result = spawnSync(
      process.execPath,
      [
        fileURLToPath(new URL('../scripts/github-commit-proof.mjs', import.meta.url)),
        'verify',
        fileURLToPath(fixture),
        fileURLToPath(new URL('./fixtures/github-commit-proof/trusted-public.pem', import.meta.url))
      ],
      { encoding: 'utf8', env: { ...process.env, WORKFLOW_COMPILER_CONSUMER_DIR: consumer } }
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Compiler release does not match checkpoint registration/);
  } finally {
    await rm(consumer, { recursive: true, force: true });
  }
});

test('valid receipt chains cannot substitute the signed contract or terminal activation', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'github-proof-registration-'));
  try {
    await cp(fixture, scratch, { recursive: true });
    const original = JSON.parse(await readFile(join(scratch, 'checkpoint.json'), 'utf8'));
    const manifest = parseWorkflowRuntimeManifest(
      JSON.parse(await readFile(join(scratch, 'artifact/runtime-manifest.json'), 'utf8'))
    );
    for (const mutation of ['contract', 'activation'] as const) {
      let run = await createWorkflowRuntimeRun(manifest, {
        runId: original.id,
        activation: {
          ...original.activation,
          ...(mutation === 'activation' ? { id: 'other-activation' } : {})
        },
        registration: {
          ...original.registration,
          ...(mutation === 'contract' ? { contractSha256: 'sha256:' + '0'.repeat(64) } : {})
        },
        artifactManifestSha256: original.artifactManifestSha256,
        runtimeManifestSha256: original.runtimeManifestSha256,
        clock: original.receipts[0].createdAt
      });
      const intent = original.receipts.find((r: any) => r.eventType === 'effect_intent');
      const success = original.receipts.find((r: any) => r.eventType === 'step_succeeded');
      const wait = original.receipts.find((r: any) => r.eventType === 'wait_created');
      const pass = await planWorkflowRuntimeStep(manifest, run);
      assert.equal(pass.type, 'pass');
      if (pass.type !== 'pass') throw new Error('Expected read capability');
      run = await reduceWorkflowRuntimeRun(manifest, run, {
        type: 'effect_intent',
        stepId: 'observe',
        attemptId: intent.attemptId,
        capability: pass.capability,
        observedAt: intent.createdAt
      });
      run = await reduceWorkflowRuntimeRun(manifest, run, {
        type: 'step_succeeded',
        stepId: 'observe',
        attemptId: success.attemptId,
        verifier: success.verifier,
        observedAt: success.createdAt
      });
      const approval = await planWorkflowRuntimeStep(manifest, run);
      if (approval.type !== 'wait') throw new Error('Expected approval boundary');
      run = await reduceWorkflowRuntimeRun(manifest, run, {
        type: 'wait_created',
        stepId: 'review',
        approval: approval.approval,
        observedAt: wait.createdAt
      });
      await verifyWorkflowRuntimeRun(manifest, run);
      await writeFile(join(scratch, 'checkpoint.json'), JSON.stringify(run));
      await assert.rejects(
        () => verifyCommitProof(scratch, join(scratch, 'trusted-public.pem')),
        /does not match signed workflow|Terminal activation does not match policy/
      );
    }
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

test('direct verification executes from paths containing spaces', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'github proof path '));
  try {
    const script = join(scratch, 'commit proof.mjs');
    await cp(new URL('../scripts/github-commit-proof.mjs', import.meta.url), script);
    await symlink(
      fileURLToPath(new URL('../node_modules', import.meta.url)),
      join(scratch, 'node_modules')
    );
    const result = spawnSync(
      process.execPath,
      [
        script,
        'verify',
        fileURLToPath(fixture),
        fileURLToPath(new URL('./fixtures/github-commit-proof/trusted-public.pem', import.meta.url))
      ],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          WORKFLOW_COMPILER_CONSUMER_DIR: fileURLToPath(
            new URL('../../workflow-compiler', import.meta.url)
          )
        }
      }
    );
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).ok, true);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});
