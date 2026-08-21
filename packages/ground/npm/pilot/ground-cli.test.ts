import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { dirname, join, parse, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';
import test from 'node:test';

const execFileAsync = promisify(execFile);

function findWorkspaceRoot(start: string): string {
  let current = resolve(start);
  const root = parse(current).root;
  while (current !== root) {
    if (existsSync(join(current, 'pnpm-workspace.yaml'))) return current;
    current = dirname(current);
  }
  throw new Error(`Unable to find workspace root from ${start}`);
}

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
    const { stdout } = await execFileAsync(
      binaryPath,
      ['--db', '.ground/registry.db', 'analyze', fixtureDirectory, '--checks', 'duplicates'],
      { cwd: consumerDirectory }
    );

    const analysis = JSON.parse(stdout);
    assert.equal(analysis.summary.total_issues, 1);
    assert.equal(existsSync(join(consumerDirectory, '.ground/registry.db')), true);
  } finally {
    await rm(consumerDirectory, { recursive: true, force: true });
  }
});
