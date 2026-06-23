import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

const REPO_ROOT = resolve(new URL('../..', import.meta.url).pathname);
const SCRIPT_PATH = join(REPO_ROOT, 'scripts/hermes-agent-eval.mjs');

function runEval(args) {
  return spawnSync(process.execPath, [SCRIPT_PATH, '--json', ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8'
  });
}

function parseReport(result) {
  assert.equal(result.stdout.trim().startsWith('{'), true, result.stdout);
  return JSON.parse(result.stdout);
}

test('Hermes evaluation passes non-strict mode when Hermes is absent', () => {
  const result = runEval(['--command', '__missing_hermes_for_test__']);
  assert.equal(result.status, 0, result.stderr);

  const report = parseReport(result);
  assert.equal(report.passed, true);
  assert.equal(report.hermes_available, false);
  assert.equal(report.production_ready, false);
});

test('Hermes evaluation fails strict mode when Hermes is absent', () => {
  const result = runEval(['--strict', '--command', '__missing_hermes_for_test__']);
  assert.equal(result.status, 1);

  const report = parseReport(result);
  assert.equal(report.passed, false);
  assert.equal(report.hermes_available, false);
  assert.equal(report.production_ready, false);
});

test('Hermes evaluation accepts a working Hermes-compatible command', async (t) => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'hermes-eval-'));
  t.after(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  const fakeHermes = join(tempRoot, 'hermes');
  await writeFile(
    fakeHermes,
    `#!/usr/bin/env bash
set -euo pipefail
case "\${1:-}" in
  --version)
    echo "hermes 0.17.0"
    ;;
  --help)
    echo "Usage: hermes [options]"
    ;;
  *)
    echo "unexpected argument: \${1:-}" >&2
    exit 2
    ;;
esac
`,
    'utf8'
  );
  await chmod(fakeHermes, 0o755);

  const result = runEval(['--strict', '--command', fakeHermes]);
  assert.equal(result.status, 0, result.stderr);

  const report = parseReport(result);
  assert.equal(report.passed, true);
  assert.equal(report.hermes_available, true);
  assert.equal(report.production_ready, true);
  assert.equal(report.steps.some((entry) => entry.id === 'hermes-version'), true);
  assert.equal(report.steps.some((entry) => entry.id === 'hermes-help'), true);
});
