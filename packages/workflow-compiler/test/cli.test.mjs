import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const packageRoot = new URL('..', import.meta.url);
const fixturePath = new URL('../fixtures/marketplace/workflow.json', import.meta.url);

test('the public CLI writes a deterministic linked artifact inventory', async () => {
  const first = await mkdtemp(join(tmpdir(), 'workflow-compiler-first-'));
  const second = await mkdtemp(join(tmpdir(), 'workflow-compiler-second-'));

  try {
    for (const outDir of [first, second]) {
      const result = spawnSync(
        process.execPath,
        [
          'dist/cli.js',
          'compile',
          '--workflow',
          fixturePath.pathname,
          '--out',
          outDir,
        ],
        { cwd: packageRoot, encoding: 'utf8' },
      );
      assert.equal(result.status, 0, result.stderr || result.stdout);
    }

    const expectedFiles = [
      'agent-contracts.json',
      'approval-surfaces.json',
      'compiled-workflow.json',
      'decision-inventory.json',
      'evaluation-manifest.json',
      'event-schemas.json',
      'governed-interaction.json',
      'manifest.json',
      'object-schemas.json',
      'runtime-targets.json',
      'tool-contracts.json',
      'workflow-map.json',
    ];
    assert.deepEqual((await readdir(first)).sort(), expectedFiles);
    assert.deepEqual((await readdir(second)).sort(), expectedFiles);

    for (const file of expectedFiles) {
      assert.equal(await readFile(join(first, file), 'utf8'), await readFile(join(second, file), 'utf8'));
    }

    const manifest = JSON.parse(await readFile(join(first, 'manifest.json'), 'utf8'));
    assert.equal(manifest.schemaVersion, 'workflow_artifact_manifest.v0.1');
    assert.equal(manifest.files.length, 11);
    assert.ok(manifest.files.every((entry) => /^sha256:[a-f0-9]{64}$/.test(entry.hash)));
  } finally {
    await rm(first, { recursive: true, force: true });
    await rm(second, { recursive: true, force: true });
  }
});
