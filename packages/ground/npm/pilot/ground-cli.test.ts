import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';
import test from 'node:test';
import { findWorkspaceRoot } from './workspace-root.ts';

const execFileAsync = promisify(execFile);

const workspace = findWorkspaceRoot(process.cwd());
const binaryPath =
  process.env.GROUND_BINARY ?? resolve(workspace, 'packages/ground/target/release/ground');
const fixtureDirectory = resolve(
  workspace,
  'packages/ground/npm/pilot/fixtures/duplicate-analysis'
);

test('native CLI creates its default registry parent in a fresh consumer directory', async () => {
  const consumerDirectory = await mkdtemp(join(tmpdir(), 'ground-cli-consumer-'));
  try {
    let stdout = '';
    await assert.rejects(execFileAsync(
      binaryPath,
      ['--db', '.ground/registry.db', 'analyze', fixtureDirectory, '--checks', 'duplicates'],
      { cwd: consumerDirectory }
    ), (error: unknown) => {
      const result = error as { code: number; stdout: string };
      assert.equal(result.code, 1);
      stdout = result.stdout;
      return true;
    });

    const analysis = JSON.parse(stdout);
    assert.equal(analysis.outcome, 'FINDINGS');
    assert.equal(analysis.summary.total_issues, 1);
    assert.equal(existsSync(join(consumerDirectory, '.ground/registry.db')), true);
  } finally {
    await rm(consumerDirectory, { recursive: true, force: true });
  }
});
