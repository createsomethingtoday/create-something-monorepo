import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'lint-foundation.mjs');

function run(...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8'
  });
}

test('plans only supported changed source files and keeps unsupported paths out of scope', () => {
  const result = run(
    '--files',
    [
      'packages/mcp-core/src/index.ts',
      'packages/webflow-components/src/index.ts',
      'packages/io/src/routes/+page.svelte',
      'packages/io/src/app.css',
      'packages/calm-operator-stopwatch-firmware/src/main.cpp',
      'packages/io/test/footer-handoff.test.ts',
      'packages/io/.svelte-kit/generated/root.svelte'
    ].join(','),
    '--dry-run',
    '--format',
    'json'
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  assert.deepEqual(payload.lintFiles, [
    'packages/io/src/routes/+page.svelte',
    'packages/mcp-core/src/index.ts',
    'packages/webflow-components/src/index.ts'
  ]);
  assert.deepEqual(payload.cssFiles, ['packages/io/src/app.css']);
  assert.deepEqual(payload.skippedFiles, [
    'packages/calm-operator-stopwatch-firmware/src/main.cpp',
    'packages/io/.svelte-kit/generated/root.svelte',
    'packages/io/test/footer-handoff.test.ts'
  ]);
  assert.equal(payload.warningOnly, true);
});

test('requires a base ref when changed-file mode is used', () => {
  const result = run('--changed-from', '--dry-run');

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--changed-from requires a git ref/i);
});

test('reports standalone Canon CSS token findings without failing the command', (t) => {
  const fixture = 'packages/io/src/lib/styles/lint-foundation-fixture.css';
  const fixturePath = path.join(REPO_ROOT, fixture);
  writeFileSync(fixturePath, '.fixture { color: #fff; border-radius: 12px; }\n');
  t.after(() => rmSync(fixturePath, { force: true }));

  const result = run('--files', fixture);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /\[canon-css-token\].*hardcoded value #fff/);
  assert.match(result.stdout, /\[canon-css-token\].*hardcoded value 12px/);
});
