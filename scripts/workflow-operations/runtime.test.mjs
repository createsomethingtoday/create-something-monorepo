import test from 'node:test';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, mkdir, copyFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  runInternalValidation,
  verifyInternalValidation,
  explainInternalValidation,
  repairInternalEvidence
} from './runtime.mjs';
const repo = resolve('.');
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'internal-runtime-'));
  return { root, out: join(root, 'run') };
}
test('signed registered run persists intent before fixed invocation, binds source and verifies restart', async () => {
  const f = await fixture();
  let dispatches = 0;
  try {
    const receipt = await runInternalValidation({
      repoRoot: repo,
      outDir: f.out,
      execute: async (command, args, options) => {
        dispatches++;
        assert.equal(command, process.execPath);
        assert.deepEqual(args, ['packages/database-layer/scripts/ontology.mjs', 'check']);
        assert.equal(options.cwd, await import('node:fs/promises').then((x) => x.realpath(repo)));
        assert.equal(options.shell, false);
        const checkpoint = JSON.parse(await readFile(join(f.out, 'checkpoint.json'), 'utf8'));
        assert.equal(checkpoint.payload.run.receipts.at(-1).eventType, 'effect_intent');
        return {
          status: 0,
          signal: null,
          errorCode: null,
          stdout: 'PRIVATE_stdout',
          stderr: 'PRIVATE_stderr'
        };
      }
    });
    assert.equal(receipt.status, 'completed');
    assert.equal(dispatches, 1);
    const verified = await verifyInternalValidation({
      outDir: f.out,
      trustedKeyPath: f.out + '.trusted-public.pem'
    });
    assert.equal(verified.verified, true);
    assert.equal(verified.status, 'completed');
    assert.equal(JSON.stringify(verified).includes('PRIVATE'), false);
    assert.equal(
      (await readFile(join(f.out, 'observation.json'), 'utf8')).includes('PRIVATE'),
      false
    );
    await assert.rejects(
      runInternalValidation({
        repoRoot: repo,
        outDir: f.out,
        execute: async () => {
          dispatches++;
        }
      })
    );
    assert.equal(dispatches, 1);
    const explanation = await explainInternalValidation({
      outDir: f.out,
      trustedKeyPath: f.out + '.trusted-public.pem',
      scope: {
        accountId: 'create-something',
        tenantId: 'internal-actions',
        workspaceId: 'create-something-monorepo'
      }
    });
    assert.equal(explanation.reason, 'completed');
    assert.equal(explanation.executionOwner, 'create-something-engineering');
    await assert.rejects(
      explainInternalValidation({
        outDir: f.out,
        trustedKeyPath: f.out + '.trusted-public.pem',
        scope: {
          accountId: 'other',
          tenantId: 'internal-actions',
          workspaceId: 'create-something-monorepo'
        }
      }),
      /scope/
    );
    await writeFile(join(f.out, 'graph.json'), 'tampered');
    await assert.rejects(
      verifyInternalValidation({ outDir: f.out, trustedKeyPath: f.out + '.trusted-public.pem' })
    );
    assert.equal(
      (
        await repairInternalEvidence({
          outDir: f.out,
          trustedKeyPath: f.out + '.trusted-public.pem'
        })
      ).repairAttempts,
      1
    );
    assert.equal(
      (
        await verifyInternalValidation({
          outDir: f.out,
          trustedKeyPath: f.out + '.trusted-public.pem'
        })
      ).verified,
      true
    );
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});
for (const [name, result, status, reason] of [
  [
    'nonzero',
    { status: 1, signal: null, errorCode: null, stdout: '', stderr: 'private' },
    'failed',
    'validation_failed'
  ],
  [
    'timeout',
    { status: null, signal: 'SIGTERM', errorCode: 'ETIMEDOUT', stdout: '', stderr: '' },
    'running',
    'effect_reconciliation_required'
  ]
])
  test(`${name} holds without a retry`, async () => {
    const f = await fixture();
    let count = 0;
    try {
      const r = await runInternalValidation({
        repoRoot: repo,
        outDir: f.out,
        execute: async () => {
          count++;
          return result;
        }
      });
      assert.equal(r.status, status);
      assert.equal(r.reason, reason);
      assert.equal(count, 1);
      const v = await verifyInternalValidation({
        outDir: f.out,
        trustedKeyPath: f.out + '.trusted-public.pem'
      });
      assert.equal(v.verified, true);
      assert.equal(v.reason, reason);
      const stale = await explainInternalValidation({
        outDir: f.out,
        trustedKeyPath: f.out + '.trusted-public.pem',
        scope: {
          accountId: 'create-something',
          tenantId: 'internal-actions',
          workspaceId: 'create-something-monorepo'
        },
        asOf: new Date(Date.now() + 7200000).toISOString()
      });
      assert.equal(stale.freshness, 'stale');
    } finally {
      await rm(f.root, { recursive: true, force: true });
    }
  });
test('signed checkpoint tampering is rejected before derived repair', async () => {
  const f = await fixture();
  try {
    await runInternalValidation({
      repoRoot: repo,
      outDir: f.out,
      execute: async () => ({ status: 0, signal: null, errorCode: null, stdout: '', stderr: '' })
    });
    const p = join(f.out, 'checkpoint.json');
    const value = JSON.parse(await readFile(p, 'utf8'));
    value.payload.run.status = 'failed';
    await writeFile(p, JSON.stringify(value));
    await assert.rejects(
      repairInternalEvidence({ outDir: f.out, trustedKeyPath: f.out + '.trusted-public.pem' })
    );
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});
test('real fixed validation executes successfully with source-bound receipts', async () => {
  const f = await fixture();
  try {
    const r = await runInternalValidation({ repoRoot: repo, outDir: f.out });
    assert.equal(r.status, 'completed');
    assert.equal(r.commandDispatches, 1);
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});

test('changed pinned source is rejected before output allocation or invocation', async () => {
  const f = await fixture();
  const fake = join(f.root, 'repo');
  let called = 0;
  try {
    const r = JSON.parse(await readFile('scripts/workflow-operations/registration.json', 'utf8'));
    for (const source of r.sourceFiles) {
      const target = join(fake, source.path);
      await mkdir((await import('node:path')).dirname(target), { recursive: true });
      await copyFile(join(repo, source.path), target);
    }
    await writeFile(join(fake, r.argv[0]), 'throw new Error("never execute changed source")');
    await assert.rejects(
      runInternalValidation({
        repoRoot: fake,
        outDir: f.out,
        execute: async () => {
          called++;
        }
      }),
      /runtime_source_hash_mismatch/
    );
    assert.equal(called, 0);
    await assert.rejects(
      readFile(join(f.out, 'checkpoint.json')),
      (error) => error.code === 'ENOENT'
    );
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});

test('separate CLI process verifies retained run without repeating command', async () => {
  const f = await fixture();
  try {
    const result = await runInternalValidation({ repoRoot: repo, outDir: f.out });
    const { spawnSync } = await import('node:child_process');
    const child = spawnSync(
      process.execPath,
      [
        resolve('scripts/workflow-operations/runtime.mjs'),
        'verify',
        '--out',
        f.out,
        '--trusted-key',
        result.trustedKeyPath
      ],
      { encoding: 'utf8', timeout: 10000 }
    );
    assert.equal(child.status, 0, child.stderr);
    assert.equal(JSON.parse(child.stdout).status, 'completed');
    const signedRegistration = JSON.parse(await readFile(join(f.out, 'registration.json'), 'utf8'));
    signedRegistration.payload.argv.push('export');
    await writeFile(join(f.out, 'registration.json'), JSON.stringify(signedRegistration));
    await assert.rejects(
      verifyInternalValidation({ outDir: f.out, trustedKeyPath: result.trustedKeyPath }),
      /runtime_signature_mismatch/
    );
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});

test('CLI reconciliation repairs missing derived evidence without redispatching', async () => {
  const f = await mkdtemp(join(tmpdir(), 'internal-runtime-reconcile-'));
  try {
    const out = join(f, 'runtime');
    await runInternalValidation({ outDir: out });
    const before = await readFile(join(out, 'checkpoint.json'), 'utf8');
    await rm(join(out, 'explanation.json'));
    const result = spawnSync(
      process.execPath,
      [
        resolve('scripts/workflow-operations/runtime.mjs'),
        'reconcile',
        '--out',
        out,
        '--trusted-key',
        out + '.trusted-public.pem'
      ],
      { encoding: 'utf8' }
    );
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).repairAttempts, 1);
    assert.equal(JSON.parse(result.stdout).commandDispatches, 0);
    assert.equal(await readFile(join(out, 'checkpoint.json'), 'utf8'), before);
  } finally {
    await rm(f, { recursive: true, force: true });
  }
});
