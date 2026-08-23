import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const ROOT = new URL('../..', import.meta.url);

test('Codex and Deep Agents comparison dry-run exposes one shared, no-write task pack', () => {
  const result = spawnSync(
    'node',
    ['scripts/codex-deepagents-comparison.mjs', '--dry-run', '--json'],
    {
      cwd: ROOT,
      encoding: 'utf8'
    }
  );

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.suite, 'codex-deepagents-runtime-comparison');
  assert.equal(report.mode, 'dry-run');
  assert.deepEqual(report.runtimes, ['codex', 'deepagents']);
  assert.equal(report.noWrite, true);
  assert.deepEqual(
    report.cases.map((entry) => entry.id),
    ['evidence-gathering', 'approval-boundary', 'unknown-state-recovery']
  );
});
