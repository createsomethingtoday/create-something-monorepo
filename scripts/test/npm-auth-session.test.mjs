import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  statSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
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

function run(args, env = {}, cwd = repoRoot, executable = scriptPath) {
  return spawnSync(process.execPath, [executable, ...args], {
    cwd,
    encoding: 'utf8',
    env: {
      HOME: tmpdir(),
      PATH: process.env.PATH,
      ...env
    }
  });
}

function initializeGitRepository(pathname) {
  mkdirSync(pathname, { recursive: true });
  const result = spawnSync('git', ['init', '--quiet'], { cwd: pathname, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
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
      ''
    ].join('\n')
  );
  writeExecutable(npmBin, '#!/bin/sh\nprintf \'%s\\n\' \'{"username":"micah-createsomething"}\'\n');

  const result = run([
    'status',
    '--json',
    '--verify',
    '--userconfig',
    userconfig,
    '--npm-bin',
    npmBin
  ]);

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

  const result = run([
    'status',
    '--json',
    '--verify',
    '--userconfig',
    userconfig,
    '--npm-bin',
    npmBin
  ]);

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

test('npm auth status keeps a saved credential when npm verification cannot reach the registry', () => {
  const fixture = mkdtempSync(path.join(tmpdir(), 'npm-auth-session-verification-error-'));
  const userconfig = path.join(fixture, '.npmrc');
  const npmBin = path.join(fixture, 'npm');
  const secret = 'npm_verification_error_secret_must_not_appear';

  writeFileSync(userconfig, `//registry.npmjs.org/:_authToken=${secret}\n`);
  writeExecutable(npmBin, "#!/bin/sh\nprintf '%s\\n' 'npm error code ENOTFOUND' >&2\nexit 1\n");

  const result = run([
    'status',
    '--json',
    '--verify',
    '--userconfig',
    userconfig,
    '--npm-bin',
    npmBin
  ]);

  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.doesNotMatch(result.stdout, new RegExp(secret));
  assert.doesNotMatch(result.stderr, new RegExp(secret));
  const report = JSON.parse(result.stdout);
  assert.equal(report.ok, false);
  assert.equal(report.credential.status, 'saved');
  assert.equal(report.identity.status, 'verification_error');
  assert.match(report.nextActions.join('\n'), /preserve.*credential/i);
  assert.doesNotMatch(report.nextActions.join('\n'), /replace the saved npm credential/i);
});

test('npm auth status keeps a saved credential when the configured npm binary cannot run', () => {
  const fixture = mkdtempSync(path.join(tmpdir(), 'npm-auth-session-npm-bin-error-'));
  const userconfig = path.join(fixture, '.npmrc');
  const missingNpmBin = path.join(fixture, 'missing-npm');
  const secret = 'npm_missing_bin_secret_must_not_appear';

  writeFileSync(userconfig, `//registry.npmjs.org/:_authToken=${secret}\n`);

  const result = run([
    'status',
    '--json',
    '--verify',
    '--userconfig',
    userconfig,
    '--npm-bin',
    missingNpmBin
  ]);

  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.doesNotMatch(result.stdout, new RegExp(secret));
  assert.doesNotMatch(result.stderr, new RegExp(secret));
  const report = JSON.parse(result.stdout);
  assert.equal(report.ok, false);
  assert.equal(report.credential.status, 'saved');
  assert.equal(report.identity.status, 'verification_error');
  assert.match(report.nextActions.join('\n'), /preserve.*credential/i);
});

test('npm auth refuses plaintext HTTP registries before a credential can be used', () => {
  const result = run(['status', '--json', '--registry', 'http://registry.example.test/']);

  assert.equal(result.status, 1, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.ok, false);
  assert.match(report.error, /HTTPS/i);
});

test('npm auth refuses registry URLs that embed credentials without echoing them', () => {
  const secret = 'registry_url_password_must_not_appear';
  const result = run([
    'status',
    '--json',
    '--registry',
    `https://operator:${secret}@registry.example.test/`
  ]);

  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.doesNotMatch(result.stdout, new RegExp(secret));
  assert.doesNotMatch(result.stderr, new RegExp(secret));
  const report = JSON.parse(result.stdout);
  assert.equal(report.ok, false);
  assert.match(report.error, /credential/i);
});

test('npm auth save atomically replaces a permissive user config with restricted permissions', () => {
  const fixture = mkdtempSync(path.join(tmpdir(), 'npm-auth-session-save-'));
  const userconfig = path.join(fixture, '.npmrc');
  const secret = 'npm_persisted_secret_must_not_appear';

  writeFileSync(userconfig, '@create-something:registry=https://registry.npmjs.org/\n');
  chmodSync(userconfig, 0o644);

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

test('npm auth save replaces every registry credential written with npmrc whitespace', () => {
  const fixture = mkdtempSync(path.join(tmpdir(), 'npm-auth-session-spaced-'));
  const userconfig = path.join(fixture, '.npmrc');
  const priorSecret = 'npm_old_spaced_secret_must_be_removed';
  const replacement = 'npm_replacement_secret_must_not_be_printed';

  writeFileSync(
    userconfig,
    [
      '@create-something:registry=https://registry.npmjs.org/',
      `//registry.npmjs.org/:_authToken = ${priorSecret}`,
      `  //registry.npmjs.org/:_authToken=${priorSecret}-duplicate`,
      ''
    ].join('\n')
  );

  const result = run(
    ['save', '--json', '--userconfig', userconfig, '--token-env', 'NPM_AUTH_SESSION_TEST_TOKEN'],
    { NPM_AUTH_SESSION_TEST_TOKEN: replacement }
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.doesNotMatch(result.stdout, new RegExp(priorSecret));
  assert.doesNotMatch(result.stdout, new RegExp(replacement));
  const config = readFileSync(userconfig, 'utf8');
  assert.doesNotMatch(config, new RegExp(priorSecret));
  assert.equal(
    config,
    '@create-something:registry=https://registry.npmjs.org/\n//registry.npmjs.org/:_authToken=npm_replacement_secret_must_not_be_printed\n'
  );
});

test('npm auth save rejects a config symlink whose target is inside the repository', () => {
  const fixture = mkdtempSync(path.join(tmpdir(), 'npm-auth-session-symlink-'));
  const repository = path.join(fixture, 'repository');
  const workingDirectory = path.join(repository, 'scripts');
  const userconfig = path.join(fixture, '.npmrc');
  const target = path.join(repository, '.npmrc');
  const secret = 'npm_symlink_secret_must_not_be_persisted';

  initializeGitRepository(repository);
  mkdirSync(workingDirectory);
  writeFileSync(target, 'keep=this-config-unchanged\n');
  symlinkSync(target, userconfig);

  const result = run(
    ['save', '--json', '--userconfig', userconfig, '--token-env', 'NPM_AUTH_SESSION_TEST_TOKEN'],
    { NPM_AUTH_SESSION_TEST_TOKEN: secret },
    workingDirectory
  );

  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.doesNotMatch(result.stdout, new RegExp(secret));
  assert.equal(readFileSync(target, 'utf8'), 'keep=this-config-unchanged\n');
  const report = JSON.parse(result.stdout);
  assert.match(report.error, /symbolic[- ]link|repository/i);
});

test('npm auth save rejects a config inside the repository when invoked from a subdirectory', () => {
  const fixture = mkdtempSync(path.join(tmpdir(), 'npm-auth-session-repository-'));
  const repository = path.join(fixture, 'repository');
  const workingDirectory = path.join(repository, 'scripts');
  const userconfig = path.join(repository, '.npmrc');
  const secret = 'npm_repository_secret_must_not_be_persisted';

  initializeGitRepository(repository);
  mkdirSync(workingDirectory);
  writeFileSync(userconfig, 'keep=this-config-unchanged\n');

  const result = run(
    ['save', '--json', '--userconfig', userconfig, '--token-env', 'NPM_AUTH_SESSION_TEST_TOKEN'],
    { NPM_AUTH_SESSION_TEST_TOKEN: secret },
    workingDirectory
  );

  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.doesNotMatch(result.stdout, new RegExp(secret));
  assert.equal(readFileSync(userconfig, 'utf8'), 'keep=this-config-unchanged\n');
  const report = JSON.parse(result.stdout);
  assert.match(report.error, /repository/i);
});

test('npm auth save rejects the script checkout when invoked from outside a Git repository', () => {
  const fixture = mkdtempSync(path.join(tmpdir(), 'npm-auth-session-external-'));
  const repository = path.join(fixture, 'repository');
  const scriptsDirectory = path.join(repository, 'scripts');
  const externalDirectory = path.join(fixture, 'external');
  const executable = path.join(scriptsDirectory, 'npm-auth-session.mjs');
  const userconfig = path.join(repository, '.npmrc');
  const secret = 'npm_external_secret_must_not_be_persisted';

  mkdirSync(scriptsDirectory, { recursive: true });
  mkdirSync(externalDirectory);
  writeFileSync(executable, readFileSync(scriptPath, 'utf8'));
  writeFileSync(userconfig, 'keep=this-config-unchanged\n');

  const result = run(
    ['save', '--json', '--userconfig', userconfig, '--token-env', 'NPM_AUTH_SESSION_TEST_TOKEN'],
    { NPM_AUTH_SESSION_TEST_TOKEN: secret },
    externalDirectory,
    executable
  );

  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.doesNotMatch(result.stdout, new RegExp(secret));
  assert.equal(readFileSync(userconfig, 'utf8'), 'keep=this-config-unchanged\n');
  const report = JSON.parse(result.stdout);
  assert.match(report.error, /repository/i);
});

test('npm auth save allows the default home config when the caller is not in a Git repository', () => {
  const home = mkdtempSync(path.join(tmpdir(), 'npm-auth-session-home-'));
  const secret = 'npm_home_secret_must_not_be_printed';

  const result = run(
    ['save', '--json', '--token-env', 'NPM_AUTH_SESSION_TEST_TOKEN'],
    { HOME: home, NPM_AUTH_SESSION_TEST_TOKEN: secret },
    home
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.doesNotMatch(result.stdout, new RegExp(secret));
  assert.equal(statSync(path.join(home, '.npmrc')).mode & 0o777, 0o600);
});

test('npm auth save rejects a config inside the target path Git worktree', () => {
  const fixture = mkdtempSync(path.join(tmpdir(), 'npm-auth-session-target-worktree-'));
  const targetRepository = path.join(fixture, 'target-repository');
  const externalDirectory = path.join(fixture, 'external');
  const userconfig = path.join(targetRepository, '.npmrc');
  const secret = 'npm_target_worktree_secret_must_not_be_persisted';

  initializeGitRepository(targetRepository);
  mkdirSync(externalDirectory);
  writeFileSync(userconfig, 'keep=this-config-unchanged\n');

  const result = run(
    ['save', '--json', '--userconfig', userconfig, '--token-env', 'NPM_AUTH_SESSION_TEST_TOKEN'],
    { NPM_AUTH_SESSION_TEST_TOKEN: secret },
    externalDirectory
  );

  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.doesNotMatch(result.stdout, new RegExp(secret));
  assert.equal(readFileSync(userconfig, 'utf8'), 'keep=this-config-unchanged\n');
  const report = JSON.parse(result.stdout);
  assert.match(report.error, /repository/i);
});

test('npm auth status rejects a credential config inside the target path Git worktree', () => {
  const fixture = mkdtempSync(path.join(tmpdir(), 'npm-auth-session-status-worktree-'));
  const targetRepository = path.join(fixture, 'target-repository');
  const externalDirectory = path.join(fixture, 'external');
  const userconfig = path.join(targetRepository, '.npmrc');
  const secret = 'npm_repository_status_secret_must_not_be_accepted';

  initializeGitRepository(targetRepository);
  mkdirSync(externalDirectory);
  writeFileSync(userconfig, `//registry.npmjs.org/:_authToken=${secret}\n`);

  const result = run(['status', '--json', '--userconfig', userconfig], {}, externalDirectory);

  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.doesNotMatch(result.stdout, new RegExp(secret));
  const report = JSON.parse(result.stdout);
  assert.equal(report.ok, false);
  assert.match(report.error, /repository/i);
});

test('package scripts expose saved npm auth status and save commands', () => {
  const packageJson = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  assert.equal(packageJson.scripts['npm:auth:status'], 'node scripts/npm-auth-session.mjs status');
  assert.equal(packageJson.scripts['npm:auth:save'], 'node scripts/npm-auth-session.mjs save');
});
