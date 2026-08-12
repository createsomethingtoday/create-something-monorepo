import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const scriptPath = fileURLToPath(new URL('../ground-review.mjs', import.meta.url));

function run(command, args, cwd, env = {}) {
  return spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_AUTHOR_EMAIL: 'ground@example.test',
      GIT_AUTHOR_NAME: 'Ground Review',
      GIT_COMMITTER_EMAIL: 'ground@example.test',
      GIT_COMMITTER_NAME: 'Ground Review',
      ...env
    }
  });
}

function mustRun(command, args, cwd, env) {
  const result = run(command, args, cwd, env);
  assert.equal(result.status, 0, `${command} ${args.join(' ')}\n${result.stdout}${result.stderr}`);
  return result;
}

function writeFixtureFile(root, relativePath, contents) {
  const absolutePath = join(root, relativePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, contents);
  return absolutePath;
}

test('CLI emits an advisory JSON receipt for a changed package', (t) => {
  const repo = mkdtempSync(join(tmpdir(), 'ground-review-'));
  const binaryDir = mkdtempSync(join(tmpdir(), 'ground-review-binary-'));
  t.after(() => {
    rmSync(repo, { recursive: true, force: true });
    rmSync(binaryDir, { recursive: true, force: true });
  });

  mustRun('git', ['init', '-b', 'main'], repo);
  mustRun('git', ['config', 'core.hooksPath', '/dev/null'], repo);
  writeFixtureFile(repo, 'packages/example/package.json', '{"name":"@example/pkg"}\n');
  writeFixtureFile(repo, 'packages/example/src/index.ts', 'export const value = 1;\n');
  writeFixtureFile(repo, 'README.md', 'baseline\n');
  mustRun('git', ['add', '.'], repo);
  mustRun('git', ['commit', '-m', 'baseline'], repo);

  writeFixtureFile(repo, 'packages/example/src/index.ts', 'export const value = 2;\n');
  const fakeGround = writeFixtureFile(
    binaryDir,
    'fake-ground',
    `#!/bin/sh
printf '%s\\n' '{"discovered_changed_files":1,"analyzable_changed_files":1,"changed_files":1,"changed_file_list":["packages/example/src/index.ts"],"excluded_changed_files":[],"checks_run":["duplicates","orphans"],"new_issues":[{"type":"duplicate","path":"packages/example/src/index.ts"}],"total_new_issues":1}'
`
  );
  chmodSync(fakeGround, 0o755);

  const result = run(process.execPath, [scriptPath, '--base', 'HEAD', '--format', 'json'], repo, {
    GROUND_BINARY: fakeGround
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const receipt = JSON.parse(result.stdout);
  assert.equal(receipt.schema_version, 'ground-review-receipt.v1');
  assert.equal(receipt.mode, 'advisory');
  assert.equal(receipt.base, 'HEAD');
  assert.deepEqual(receipt.changed_files, ['packages/example/src/index.ts']);
  assert.equal(receipt.coverage.discovered_changed_files, 1);
  assert.equal(receipt.coverage.analyzable_changed_files, 1);
  assert.equal(receipt.findings.length, 1);
  assert.equal(receipt.targets[0].path, 'packages/example');
  assert.equal(receipt.targets[0].package_name, '@example/pkg');
  assert.equal(receipt.status, 'findings');
});

test('CLI makes zero analyzable coverage explicit without requiring Ground', (t) => {
  const repo = mkdtempSync(join(tmpdir(), 'ground-review-docs-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));

  mustRun('git', ['init', '-b', 'main'], repo);
  mustRun('git', ['config', 'core.hooksPath', '/dev/null'], repo);
  writeFixtureFile(repo, 'README.md', 'baseline\n');
  mustRun('git', ['add', '.'], repo);
  mustRun('git', ['commit', '-m', 'baseline'], repo);
  writeFixtureFile(repo, 'README.md', 'changed\n');

  const result = run(process.execPath, [scriptPath, '--base', 'HEAD', '--format', 'json'], repo, {
    GROUND_BINARY: join(repo, 'missing-ground')
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const receipt = JSON.parse(result.stdout);
  assert.equal(receipt.status, 'no_analyzable_files');
  assert.equal(receipt.coverage.discovered_changed_files, 1);
  assert.equal(receipt.coverage.analyzable_changed_files, 0);
  assert.deepEqual(receipt.targets, []);
  assert.deepEqual(receipt.coverage.excluded_changed_files, [
    { path: 'README.md', reason: 'unsupported_extension' }
  ]);
});

test('CLI excludes upstream-only changes when the worktree is behind its base ref', (t) => {
  const repo = mkdtempSync(join(tmpdir(), 'ground-review-behind-'));
  const binaryDir = mkdtempSync(join(tmpdir(), 'ground-review-behind-binary-'));
  t.after(() => {
    rmSync(repo, { recursive: true, force: true });
    rmSync(binaryDir, { recursive: true, force: true });
  });

  mustRun('git', ['init', '-b', 'main'], repo);
  mustRun('git', ['config', 'core.hooksPath', '/dev/null'], repo);
  writeFixtureFile(repo, 'packages/example/package.json', '{"name":"@example/pkg"}\n');
  writeFixtureFile(repo, 'packages/example/src/index.ts', 'export const value = 1;\n');
  writeFixtureFile(repo, 'README.md', 'baseline\n');
  mustRun('git', ['add', '.'], repo);
  mustRun('git', ['commit', '-m', 'baseline'], repo);
  mustRun('git', ['branch', 'topic'], repo);
  writeFixtureFile(repo, 'README.md', 'upstream only change\n');
  mustRun('git', ['add', '.'], repo);
  mustRun('git', ['commit', '-m', 'advance main'], repo);
  mustRun('git', ['switch', 'topic'], repo);
  writeFixtureFile(repo, 'packages/example/src/index.ts', 'export const value = 2;\n');

  const fakeGround = writeFixtureFile(
    binaryDir,
    'fake-ground',
    `#!/bin/sh
printf '%s\\n' '{"discovered_changed_files":1,"analyzable_changed_files":1,"changed_files":1,"changed_file_list":["packages/example/src/index.ts"],"excluded_changed_files":[],"checks_run":["duplicates","orphans"],"new_issues":[],"total_new_issues":0}'
`
  );
  chmodSync(fakeGround, 0o755);

  const result = run(process.execPath, [scriptPath, '--base', 'main', '--format', 'json'], repo, {
    GROUND_BINARY: fakeGround
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const receipt = JSON.parse(result.stdout);
  assert.deepEqual(receipt.changed_files, ['packages/example/src/index.ts']);
  assert.doesNotMatch(JSON.stringify(receipt), /README\.md/);
});
