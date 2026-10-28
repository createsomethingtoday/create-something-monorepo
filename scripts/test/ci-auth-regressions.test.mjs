import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const runner = fileURLToPath(new URL('../ci-auth-regressions.mjs', import.meta.url));
function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'ci-auth-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  function add(file) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), '// fixture test discovered at the process boundary\n');
  }
  add('packages/canon/src/lib/auth/session-auth-provider.test.ts');
  add('packages/io/test/session-public-boundary.test.ts');
  const bin = path.join(root, 'bin');
  mkdirSync(bin);
  writeFileSync(path.join(bin, 'pnpm'), `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.CI_AUTH_TEST_LOG, JSON.stringify(args) + '\\n');
if (args[1] === process.env.CI_AUTH_TEST_FAIL) process.exit(9);
`, { mode: 0o755 });
  const log = path.join(root, 'calls.jsonl');
  function run(failure = '', missingRunner = false) {
    writeFileSync(log, '');
    const result = spawnSync(process.execPath, [runner], { cwd: root, encoding: 'utf8', env: {
      ...process.env, PATH: missingRunner ? path.join(root, 'missing') : `${bin}:${process.env.PATH}`, CI_AUTH_TEST_LOG: log, CI_AUTH_TEST_FAIL: failure
    } });
    return { ...result, calls: readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line)) };
  }
  return { root, add, run };
}

test('discovers current and future Canon/IO session suites and invokes actual test runners', (t) => {
  const { add, run } = fixture(t);
  add('packages/canon/src/lib/auth/session-verification.test.ts');
  add('packages/io/test/session-boundary.test.ts');
  add('packages/io/test/identity-session-compatibility.test.ts');
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.calls, [
    ['--filter', '@create-something/canon', 'test', 'src/lib/auth/session-auth-provider.test.ts', 'src/lib/auth/session-verification.test.ts'],
    ['--filter', '@create-something/io', 'exec', 'vitest', 'run', 'test/identity-session-compatibility.test.ts', 'test/session-boundary.test.ts', 'test/session-public-boundary.test.ts']
  ]);
});

test('failure in either real runner fails the gate and both suites still execute', (t) => {
  const { run } = fixture(t);
  for (const pkg of ['@create-something/canon', '@create-something/io']) {
    const result = run(pkg);
    assert.equal(result.status, 1);
    assert.equal(result.calls.length, 2);
  }
});

test('missing executable, missing directory or empty suites fail closed', (t) => {
  const { root, run } = fixture(t);
  assert.equal(run('', true).status, 1);
  rmSync(path.join(root, 'packages/io/test/session-public-boundary.test.ts'));
  const empty = run();
  assert.equal(empty.status, 1);
  assert.equal(empty.calls.length, 0);
  rmSync(path.join(root, 'packages/io/test'), { recursive: true });
  assert.equal(run().status, 1);
});
