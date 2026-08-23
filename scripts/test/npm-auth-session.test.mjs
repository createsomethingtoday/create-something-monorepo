import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const scriptPath = path.join(repoRoot, 'scripts/npm-auth-session.mjs');

function writeExecutable(filePath, source) {
  writeFileSync(filePath, source);
  chmodSync(filePath, 0o755);
}

function run(args, env = {}) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      HOME: tmpdir(),
      PATH: process.env.PATH,
      ...env,
    },
  });
}

test('npm auth status verifies a saved credential without printing its value', () => {
  const fixture = mkdtempSync(path.join(tmpdir(), 'npm-auth-session-status-'));
  const userconfig = path.join(fixture, '.npmrc');
  const npmBin = path.join(fixture, 'npm');
  const secret = 'npm_secret_must_not_appear';

  writeFileSync(
    userconfig,
    [
      '@create-something:registry=https://registry.npmjs.org/',
      `//registry.npmjs.org/:_authToken=${secret}`,
      '',
    ].join('\n')
  );
  writeExecutable(npmBin, "#!/bin/sh\nprintf '%s\\n' '{\"username\":\"micah-createsomething\"}'\n");

  const result = run(['status', '--json', '--verify', '--userconfig', userconfig, '--npm-bin', npmBin]);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.doesNotMatch(result.stdout, new RegExp(secret));
  assert.doesNotMatch(result.stderr, new RegExp(secret));
  const report = JSON.parse(result.stdout);
  assert.equal(report.ok, true);
  assert.equal(report.credential.status, 'saved');
  assert.equal(report.credential.valuePrinted, false);
  assert.deepEqual(report.identity, { status: 'verified', username: 'micah-createsomething' });
});

test('npm auth status names an invalid saved credential without replaying registry output', () => {
  const fixture = mkdtempSync(path.join(tmpdir(), 'npm-auth-session-invalid-'));
  const userconfig = path.join(fixture, '.npmrc');
  const npmBin = path.join(fixture, 'npm');
  const secret = 'npm_invalid_secret_must_not_appear';

  writeFileSync(userconfig, `//registry.npmjs.org/:_authToken=${secret}\n`);
  writeExecutable(npmBin, "#!/bin/sh\nprintf '%s\\n' 'npm error 401 Unauthorized' >&2\nexit 1\n");

  const result = run(['status', '--json', '--verify', '--userconfig', userconfig, '--npm-bin', npmBin]);

  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.doesNotMatch(result.stdout, new RegExp(secret));
  assert.doesNotMatch(result.stderr, new RegExp(secret));
  assert.doesNotMatch(result.stdout, /401 Unauthorized/);
  const report = JSON.parse(result.stdout);
  assert.equal(report.ok, false);
  assert.equal(report.credential.status, 'saved');
  assert.equal(report.identity.status, 'invalid');
  assert.match(report.nextActions.join('\n'), /replace the saved npm credential/i);
});

test('npm auth save writes a user config with restricted permissions and redacted output', () => {
  const fixture = mkdtempSync(path.join(tmpdir(), 'npm-auth-session-save-'));
  const userconfig = path.join(fixture, '.npmrc');
  const secret = 'npm_persisted_secret_must_not_appear';

  writeFileSync(userconfig, '@create-something:registry=https://registry.npmjs.org/\n');

  const result = run(
    ['save', '--json', '--userconfig', userconfig, '--token-env', 'NPM_AUTH_SESSION_TEST_TOKEN'],
    { NPM_AUTH_SESSION_TEST_TOKEN: secret }
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.doesNotMatch(result.stdout, new RegExp(secret));
  assert.doesNotMatch(result.stderr, new RegExp(secret));
  const report = JSON.parse(result.stdout);
  assert.equal(report.ok, true);
  assert.equal(report.credential.status, 'saved');
  assert.equal(report.credential.valuePrinted, false);
  assert.equal(statSync(userconfig).mode & 0o777, 0o600);
  assert.equal(
    readFileSync(userconfig, 'utf8'),
    '@create-something:registry=https://registry.npmjs.org/\n//registry.npmjs.org/:_authToken=npm_persisted_secret_must_not_appear\n'
  );
});

test('package scripts expose saved npm auth status and save commands', () => {
  const packageJson = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  assert.equal(packageJson.scripts['npm:auth:status'], 'node scripts/npm-auth-session.mjs status');
  assert.equal(packageJson.scripts['npm:auth:save'], 'node scripts/npm-auth-session.mjs save');
});
