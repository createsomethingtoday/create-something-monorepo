import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { runDiscovery } from '../workflow-discovery/loop.mjs';
import { runInternalValidation } from './runtime.mjs';
import { publishInternalRun } from './publish.mjs';
test('verified actual run and full catalog reconcile before persistence; corrupt derived evidence blocks publication', async () => {
  const root = await mkdtemp(join(tmpdir(), 'operations-publish-'));
  try {
    const catalogRoot = join(root, 'catalog'),
      runtimeOut = join(root, 'runtime');
    await runDiscovery({ repoRoot: resolve('.'), outDir: catalogRoot });
    await runInternalValidation({ outDir: runtimeOut });
    const args = {
      catalogRoot,
      runtimeOut,
      trustedKeyPath: runtimeOut + '.trusted-public.pem',
      sourceCommit: 'a'.repeat(40),
      runUrl: 'https://github.com/createsomethingtoday/create-something-monorepo/actions/runs/123'
    };
    const result = await publishInternalRun(args);
    assert.equal(result.persisted, false);
    assert.ok(result.lifecycle.entries.length > 64);
    assert.equal(result.lifecycle.entries.filter((x) => x.status === 'registered').length, 1);
    assert.equal(result.run.status, 'passed');
    let saves = 0;
    const saved = await publishInternalRun({
      ...args,
      persist: true,
      load: async () => ({ ledger: null, sha: null, runs: [] }),
      save: async ({ ledger, runs }) => {
        saves++;
        assert.equal(ledger.entries.length, result.lifecycle.entries.length);
        assert.equal(runs.length, 1);
        return { branch: 'test-only', sha: 'b'.repeat(40) };
      }
    });
    assert.equal(saved.persisted, true);
    assert.equal(saves, 1);
    await writeFile(join(runtimeOut, 'explanation.json'), 'corrupt');
    await assert.rejects(
      publishInternalRun({
        ...args,
        persist: true,
        load: async () => ({ ledger: null, sha: null, runs: [] }),
        save: async () => {
          saves++;
        }
      })
    );
    assert.equal(saves, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
