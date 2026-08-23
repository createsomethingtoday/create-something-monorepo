import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  linkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
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

function writePrivateConfig(filePath, source) {
  writeFileSync(filePath, source, { mode: 0o600 });
  chmodSync(filePath, 0o600);
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

  writePrivateConfig(
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

test('npm auth status does not report a saved credential ready until it is verified', () => {
  const fixture = mkdtempSync(path.join(tmpdir(), 'npm-auth-session-unverified-'));
  const userconfig = path.join(fixture, '.npmrc');
  const secret = 'npm_unverified_status_secret_must_not_appear';

  writePrivateConfig(userconfig, `//registry.npmjs.org/:_authToken=${secret}\n`);

  const result = run(['status', '--json', '--userconfig', userconfig]);

  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.doesNotMatch(result.stdout, new RegExp(secret));
  const report = JSON.parse(result.stdout);
  assert.equal(report.ok, false);
  assert.equal(report.credential.status, 'saved');
  assert.equal(report.identity.status, 'not_checked');
  assert.match(report.nextActions.join('\n'), /--verify/);
});

test('npm auth status honors a lowercase npm config userconfig override', () => {
  const fixture = mkdtempSync(path.join(tmpdir(), 'npm-auth-session-lowercase-userconfig-'));
  const home = path.join(fixture, 'home');
  const userconfig = path.join(fixture, 'custom.npmrc');
  const npmBin = path.join(fixture, 'npm');
  const secret = 'npm_lowercase_userconfig_secret_must_not_appear';

  mkdirSync(home);
  writePrivateConfig(userconfig, `//registry.npmjs.org/:_authToken=${secret}\n`);
  writeExecutable(npmBin, '#!/bin/sh\nprintf \'%s\\n\' \'{"username":"micah-createsomething"}\'\n');

  const result = run(['status', '--json', '--verify', '--npm-bin', npmBin], {
    HOME: home,
    npm_config_userconfig: userconfig
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.doesNotMatch(result.stdout, new RegExp(secret));
  const report = JSON.parse(result.stdout);
  assert.equal(report.userconfig.path, realpathSync(userconfig));
  assert.deepEqual(report.identity, { status: 'verified', username: 'micah-createsomething' });
});

test('npm auth status rejects a credential file that is readable by other users', () => {
  const fixture = mkdtempSync(path.join(tmpdir(), 'npm-auth-session-permissions-'));
  const userconfig = path.join(fixture, '.npmrc');
  const secret = 'npm_permissive_config_secret_must_not_appear';

  writePrivateConfig(userconfig, `//registry.npmjs.org/:_authToken=${secret}\n`);
  chmodSync(userconfig, 0o644);

  const result = run(['status', '--json', '--userconfig', userconfig]);

  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.doesNotMatch(result.stdout, new RegExp(secret));
  const report = JSON.parse(result.stdout);
  assert.equal(report.ok, false);
  assert.match(report.error, /permission|readable/i);
});

test('npm auth status rejects a credential config hard-linked into a Git worktree', () => {
  const fixture = mkdtempSync(path.join(tmpdir(), 'npm-auth-session-hard-link-'));
  const externalDirectory = path.join(fixture, 'external');
  const repository = path.join(fixture, 'repository');
  const userconfig = path.join(externalDirectory, '.npmrc');
  const repositoryConfig = path.join(repository, '.npmrc');
  const npmBin = path.join(fixture, 'npm');
  const secret = 'npm_hard_link_secret_must_not_appear';

  mkdirSync(externalDirectory);
  initializeGitRepository(repository);
  writePrivateConfig(userconfig, `//registry.npmjs.org/:_authToken=${secret}\n`);
  linkSync(userconfig, repositoryConfig);
  writeExecutable(npmBin, '#!/bin/sh\nprintf \'%s\\n\' \'{"username":"micah-createsomething"}\'\n');

  const result = run(
    ['status', '--verify', '--json', '--userconfig', userconfig, '--npm-bin', npmBin],
    {},
    externalDirectory
  );

  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.doesNotMatch(result.stdout, new RegExp(secret));
  assert.doesNotMatch(result.stderr, new RegExp(secret));
  const report = JSON.parse(result.stdout);
  assert.equal(report.ok, false);
  assert.match(report.error, /multiply linked|link/i);
});

test('npm auth status reports a missing credential from a non-secret permissive config', () => {
  const fixture = mkdtempSync(path.join(tmpdir(), 'npm-auth-session-permissive-missing-'));
  const userconfig = path.join(fixture, '.npmrc');

  writeFileSync(userconfig, '@create-something:registry=https://registry.npmjs.org/\n');
  chmodSync(userconfig, 0o644);

  const result = run(['status', '--json', '--userconfig', userconfig]);

  assert.equal(result.status, 1, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.credential.status, 'missing');
  assert.equal(report.userconfig.status, 'present');
  assert.equal(report.error, undefined);
  assert.match(report.nextActions.join('\n'), /save it once/i);
});

test('npm auth status rejects an environment-dependent credential entry', () => {
  const fixture = mkdtempSync(path.join(tmpdir(), 'npm-auth-session-interpolated-token-'));
  const userconfig = path.join(fixture, '.npmrc');
  const npmBin = path.join(fixture, 'npm');
  const secret = 'npm_environment_token_must_not_appear';

  writePrivateConfig(userconfig, '//registry.npmjs.org/:_authToken=${NPM_TOKEN}\n');
  writeExecutable(npmBin, '#!/bin/sh\nprintf \'%s\\n\' \'{"username":"micah-createsomething"}\'\n');

  const result = run(
    ['status', '--json', '--verify', '--userconfig', userconfig, '--npm-bin', npmBin],
    { NPM_TOKEN: secret }
  );

  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.doesNotMatch(result.stdout, new RegExp(secret));
  assert.doesNotMatch(result.stderr, new RegExp(secret));
  const report = JSON.parse(result.stdout);
  assert.equal(report.ok, false);
  assert.match(report.error, /environment|interpolated/i);
});

test('npm auth status removes inherited credential config without dropping private registry transport settings', () => {
  const fixture = mkdtempSync(path.join(tmpdir(), 'npm-auth-session-config-override-'));
  const userconfig = path.join(fixture, '.npmrc');
  const npmBin = path.join(fixture, 'npm');
  const savedSecret = 'npm_saved_config_secret_must_not_appear';
  const overrideSecret = 'npm_environment_override_secret_must_not_appear';
  const transport = {
    npm_config_cafile: '/private-ca.pem',
    npm_config_certfile: '/client-cert.pem',
    npm_config_keyfile: '/client-key.pem',
    npm_config_https_proxy: 'https://proxy.example.test:8443'
  };

  writePrivateConfig(userconfig, `//registry.npmjs.org/:_authToken=${savedSecret}\n`);
  writeExecutable(
    npmBin,
    "#!/bin/sh\nif env | grep -q '^npm_config_//registry.npmjs.org/:_authToken='; then\n  printf '%s\\n' 'npm error environment auth override loaded' >&2\n  exit 1\nfi\nif [ \"$npm_config_cafile\" != '/private-ca.pem' ] || [ \"$npm_config_certfile\" != '/client-cert.pem' ] || [ \"$npm_config_keyfile\" != '/client-key.pem' ] || [ \"$npm_config_https_proxy\" != 'https://proxy.example.test:8443' ]; then\n  printf '%s\\n' 'npm error private registry transport settings missing' >&2\n  exit 1\nfi\nprintf '%s\\n' '{\"username\":\"micah-createsomething\"}'\n"
  );

  const result = run(
    ['status', '--json', '--verify', '--userconfig', userconfig, '--npm-bin', npmBin],
    { ...transport, 'npm_config_//registry.npmjs.org/:_authToken': overrideSecret }
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.doesNotMatch(result.stdout, new RegExp(savedSecret));
  assert.doesNotMatch(result.stdout, new RegExp(overrideSecret));
  const report = JSON.parse(result.stdout);
  assert.deepEqual(report.identity, { status: 'verified', username: 'micah-createsomething' });
});

test('npm auth status names an invalid saved credential without replaying registry output', () => {
  const fixture = mkdtempSync(path.join(tmpdir(), 'npm-auth-session-invalid-'));
  const userconfig = path.join(fixture, '.npmrc');
  const npmBin = path.join(fixture, 'npm');
  const secret = 'npm_invalid_secret_must_not_appear';

  writePrivateConfig(userconfig, `//registry.npmjs.org/:_authToken=${secret}\n`);
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

test('npm auth status verifies from outside an ambient project npmrc', () => {
  const fixture = mkdtempSync(path.join(tmpdir(), 'npm-auth-session-isolated-cwd-'));
  const project = path.join(fixture, 'project');
  const userconfig = path.join(fixture, 'saved.npmrc');
  const npmBin = path.join(fixture, 'npm');
  const secret = 'npm_isolated_cwd_secret_must_not_appear';

  initializeGitRepository(project);
  writeFileSync(
    path.join(project, '.npmrc'),
    '//registry.npmjs.org/:_authToken=ambient-project-token\n'
  );
  writePrivateConfig(userconfig, `//registry.npmjs.org/:_authToken=${secret}\n`);
  writeExecutable(
    npmBin,
    "#!/bin/sh\nif [ -f \"$PWD/.npmrc\" ]; then\n  printf '%s\\n' 'npm error ambient project config loaded' >&2\n  exit 1\nfi\nprintf '%s\\n' '{\"username\":\"micah-createsomething\"}'\n"
  );

  const result = run(
    ['status', '--json', '--verify', '--userconfig', userconfig, '--npm-bin', npmBin],
    {},
    project
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.doesNotMatch(result.stdout, new RegExp(secret));
  const report = JSON.parse(result.stdout);
  assert.deepEqual(report.identity, { status: 'verified', username: 'micah-createsomething' });
});

test('npm auth status keeps a saved credential when npm verification cannot reach the registry', () => {
  const fixture = mkdtempSync(path.join(tmpdir(), 'npm-auth-session-verification-error-'));
  const userconfig = path.join(fixture, '.npmrc');
  const npmBin = path.join(fixture, 'npm');
  const secret = 'npm_verification_error_secret_must_not_appear';

  writePrivateConfig(userconfig, `//registry.npmjs.org/:_authToken=${secret}\n`);
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

for (const failureCode of ['E503', 'CERT_HAS_EXPIRED']) {
  test(`npm auth status preserves a saved credential on ${failureCode} verification failures`, () => {
    const fixture = mkdtempSync(path.join(tmpdir(), 'npm-auth-session-transport-error-'));
    const userconfig = path.join(fixture, '.npmrc');
    const npmBin = path.join(fixture, 'npm');
    const secret = `npm_${failureCode.toLowerCase()}_secret_must_not_appear`;

    writePrivateConfig(userconfig, `//registry.npmjs.org/:_authToken=${secret}\n`);
    writeExecutable(
      npmBin,
      `#!/bin/sh\nprintf '%s\\n' 'npm error code ${failureCode}' >&2\nexit 1\n`
    );

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
    const report = JSON.parse(result.stdout);
    assert.equal(report.credential.status, 'saved');
    assert.equal(report.identity.status, 'verification_error');
    assert.match(report.nextActions.join('\n'), /preserve.*credential/i);
  });
}

test('npm auth status keeps a saved credential when the configured npm binary cannot run', () => {
  const fixture = mkdtempSync(path.join(tmpdir(), 'npm-auth-session-npm-bin-error-'));
  const userconfig = path.join(fixture, '.npmrc');
  const missingNpmBin = path.join(fixture, 'missing-npm');
  const secret = 'npm_missing_bin_secret_must_not_appear';

  writePrivateConfig(userconfig, `//registry.npmjs.org/:_authToken=${secret}\n`);

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

for (const output of ['', 'not-json', '{}']) {
  test(`npm auth status rejects an unusable whoami response: ${JSON.stringify(output)}`, () => {
    const fixture = mkdtempSync(path.join(tmpdir(), 'npm-auth-session-whoami-output-'));
    const userconfig = path.join(fixture, '.npmrc');
    const npmBin = path.join(fixture, 'npm');
    const secret = 'npm_unusable_whoami_secret_must_not_appear';

    writePrivateConfig(userconfig, `//registry.npmjs.org/:_authToken=${secret}\n`);
    writeExecutable(npmBin, `#!/bin/sh\nprintf '%s' '${output}'\n`);

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
    const report = JSON.parse(result.stdout);
    assert.equal(report.credential.status, 'saved');
    assert.equal(report.identity.status, 'verification_error');
    assert.match(report.nextActions.join('\n'), /preserve.*credential/i);
  });
}

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

test('npm auth rejects an unexpected positional argument without echoing it', () => {
  const secret = 'npm_positional_secret_must_not_appear';
  const result = run(['save', '--json', secret]);

  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.doesNotMatch(result.stdout, new RegExp(secret));
  assert.doesNotMatch(result.stderr, new RegExp(secret));
  const report = JSON.parse(result.stdout);
  assert.equal(report.ok, false);
  assert.match(report.error, /unexpected positional/i);
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

test('npm auth save rejects a config hard-linked into a Git worktree before rotating it', () => {
  const fixture = mkdtempSync(path.join(tmpdir(), 'npm-auth-session-save-hard-link-'));
  const externalDirectory = path.join(fixture, 'external');
  const repository = path.join(fixture, 'repository');
  const userconfig = path.join(externalDirectory, '.npmrc');
  const repositoryConfig = path.join(repository, '.npmrc');
  const priorSecret = 'npm_hard_linked_prior_secret_must_not_remain';
  const replacement = 'npm_hard_linked_replacement_must_not_be_saved';

  mkdirSync(externalDirectory);
  initializeGitRepository(repository);
  writePrivateConfig(userconfig, `//registry.npmjs.org/:_authToken=${priorSecret}\n`);
  linkSync(userconfig, repositoryConfig);

  const result = run(
    ['save', '--json', '--userconfig', userconfig, '--token-env', 'NPM_AUTH_SESSION_TEST_TOKEN'],
    { NPM_AUTH_SESSION_TEST_TOKEN: replacement },
    externalDirectory
  );

  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.doesNotMatch(result.stdout, new RegExp(priorSecret));
  assert.doesNotMatch(result.stdout, new RegExp(replacement));
  assert.doesNotMatch(result.stderr, new RegExp(priorSecret));
  assert.doesNotMatch(result.stderr, new RegExp(replacement));
  assert.equal(
    readFileSync(userconfig, 'utf8'),
    `//registry.npmjs.org/:_authToken=${priorSecret}\n`
  );
  assert.equal(
    readFileSync(repositoryConfig, 'utf8'),
    `//registry.npmjs.org/:_authToken=${priorSecret}\n`
  );
  const report = JSON.parse(result.stdout);
  assert.equal(report.ok, false);
  assert.match(report.error, /multiply linked|link/i);
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

test('npm auth save ignores inherited Git repository redirects when protecting a target worktree', () => {
  const fixture = mkdtempSync(path.join(tmpdir(), 'npm-auth-session-git-redirect-'));
  const targetRepository = path.join(fixture, 'target-repository');
  const redirectRepository = path.join(fixture, 'redirect-repository');
  const externalDirectory = path.join(fixture, 'external');
  const userconfig = path.join(targetRepository, '.npmrc');
  const secret = 'npm_git_redirect_secret_must_not_be_persisted';

  initializeGitRepository(targetRepository);
  initializeGitRepository(redirectRepository);
  mkdirSync(externalDirectory);
  writeFileSync(userconfig, 'keep=this-config-unchanged\n');

  const result = run(
    ['save', '--json', '--userconfig', userconfig, '--token-env', 'NPM_AUTH_SESSION_TEST_TOKEN'],
    {
      GIT_DIR: path.join(redirectRepository, '.git'),
      GIT_WORK_TREE: redirectRepository,
      NPM_AUTH_SESSION_TEST_TOKEN: secret
    },
    externalDirectory
  );

  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.doesNotMatch(result.stdout, new RegExp(secret));
  assert.equal(readFileSync(userconfig, 'utf8'), 'keep=this-config-unchanged\n');
  const report = JSON.parse(result.stdout);
  assert.match(report.error, /repository/i);
});

test('npm auth save fails closed when Git repository discovery is unavailable', () => {
  const fixture = mkdtempSync(path.join(tmpdir(), 'npm-auth-session-no-git-'));
  const userconfig = path.join(fixture, '.npmrc');
  const secret = 'npm_no_git_secret_must_not_be_persisted';

  writeFileSync(userconfig, 'keep=this-config-unchanged\n');

  const result = run(
    ['save', '--json', '--userconfig', userconfig, '--token-env', 'NPM_AUTH_SESSION_TEST_TOKEN'],
    { NPM_AUTH_SESSION_TEST_TOKEN: secret, PATH: '' },
    fixture
  );

  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.doesNotMatch(result.stdout, new RegExp(secret));
  assert.equal(readFileSync(userconfig, 'utf8'), 'keep=this-config-unchanged\n');
  const report = JSON.parse(result.stdout);
  assert.match(report.error, /Git|repository/i);
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
