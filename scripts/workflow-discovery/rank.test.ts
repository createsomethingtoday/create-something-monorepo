import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { rankInternalValidators } from './rank.js';
const scripts = {
  'ontology:check': 'node scripts/ontology.mjs check',
  'agent-commercial:contract:check': 'node scripts/verify-agent-commercial-contract.mjs',
  'business-thread:contract:check': 'node scripts/verify-business-digital-thread-contract.mjs'
};
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'workflow-rank-')),
    repo = join(root, 'repo');
  await mkdir(join(repo, 'packages/database-layer/scripts'), { recursive: true });
  await writeFile(join(repo, 'packages/database-layer/package.json'), JSON.stringify({ scripts }));
  for (const name of [
    'ontology.mjs',
    'verify-agent-commercial-contract.mjs',
    'verify-business-digital-thread-contract.mjs'
  ])
    await writeFile(join(repo, 'packages/database-layer/scripts', name), '// canonical validator');
  return { root, repo, out: join(root, 'private') };
}
test('actual bounded shortlist is advisory and persists exact hashes and validated provider choice', async () => {
  const f = await fixture();
  try {
    let calls = 0;
    const result = await rankInternalValidators({
      repoRoot: f.repo,
      outDir: f.out,
      selector: {
        provider: 'jev',
        model: 'jev-1.13.0',
        version: 'test',
        async select(request, signal) {
          calls++;
          assert.equal(request.candidates.length, 4);
          assert.equal(request.fallbackId, 'defer');
          assert.ok(!signal.aborted);
          return { choice: 'ontology-check' };
        }
      }
    });
    assert.equal(calls, 1);
    assert.equal(result.receipt.selectedId, 'ontology-check');
    assert.equal(result.receipt.authority, 'advisory_only');
    assert.equal(result.inspectedSources.length, 4);
    assert.equal(result.liveProviderVerified, false);
    assert.equal(
      JSON.parse(await readFile(join(f.out, 'ranking.json'), 'utf8')).requestHash,
      result.receipt.requestHash
    );
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});
test('invalid provider choice falls back; changed source clears selection; never retries', async () => {
  for (const change of [false, true]) {
    const f = await fixture();
    try {
      let calls = 0;
      const result = await rankInternalValidators({
        repoRoot: f.repo,
        outDir: f.out,
        selector: {
          provider: 'jev',
          model: 'jev-1.13.0',
          version: 'test',
          async select() {
            calls++;
            if (change)
              await writeFile(
                join(f.repo, 'packages/database-layer/scripts/ontology.mjs'),
                '// changed'
              );
            return { choice: change ? 'ontology-check' : 'invented' };
          }
        }
      });
      assert.equal(calls, 1);
      assert.equal(result.receipt.selectedId, change ? null : 'defer');
      assert.equal(result.receipt.reason, change ? 'state_changed' : 'invalid_response');
    } finally {
      await rm(f.root, { recursive: true, force: true });
    }
  }
});
test('output and contract violations hold before provider use', async () => {
  const f = await fixture();
  try {
    let calls = 0;
    const selector = {
      provider: 'jev',
      model: 'jev-1.13.0',
      version: 'test',
      async select() {
        calls++;
        return { choice: null };
      }
    };
    await assert.rejects(
      rankInternalValidators({ repoRoot: f.repo, outDir: join(f.repo, '..private'), selector }),
      /ranking/
    );
    await writeFile(
      join(f.repo, 'packages/database-layer/package.json'),
      JSON.stringify({ scripts: { ...scripts, 'ontology:check': 'curl bad' } })
    );
    await assert.rejects(
      rankInternalValidators({ repoRoot: f.repo, outDir: f.out, selector }),
      /ranking/
    );
    assert.equal(calls, 0);
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});
