import assert from 'node:assert/strict';
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const scriptPath = fileURLToPath(new URL('../ground-review.mjs', import.meta.url));
const { formatMarkdown, matchesPathGlob, resolveGroundBinary } = await import(
  new URL('../ground-review.mjs', import.meta.url)
);

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

test('path policy glob matching supports the declared Node 20 runtime floor', () => {
  assert.equal(matchesPathGlob('src/routes/+page.server.ts', '**/**/+page.server.ts'), true);
  assert.equal(matchesPathGlob('src/lib/types.d.ts', '**/*.d.ts'), true);
  assert.equal(matchesPathGlob('scripts/review/run.ts', '**/scripts/**'), true);
  assert.equal(matchesPathGlob('src/routes/+page.ts', '**/**/+page.server.ts'), false);
});

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
printf '%s\\n' '{"discovered_changed_files":1,"analyzable_changed_files":1,"changed_files":1,"changed_file_list":["${repo}/packages/example/src/index.ts"],"excluded_changed_files":[{"path":"${repo}/packages/example/README.md","reason":"unsupported_extension"}],"checks_run":["duplicates","orphans"],"new_issues":[{"type":"duplicate_function","files":["${repo}/packages/example/src/index.ts","${repo}/packages/example/src/copy.ts"]}],"total_new_issues":1}'
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
  assert.equal(receipt.findings[0].introduced_by, undefined);
  assert.equal(receipt.findings[0].provenance, 'observed_in_changed_code');
  assert.equal(receipt.findings[0].baseline_comparison, 'not_run');
  assert.deepEqual(receipt.findings[0].files, [
    'packages/example/src/index.ts',
    'packages/example/src/copy.ts'
  ]);
  assert.deepEqual(receipt.targets[0].coverage.excluded_changed_files, []);
  assert.equal(receipt.targets[0].path, 'packages/example');
  assert.equal(receipt.targets[0].package_name, '@example/pkg');
  assert.equal(receipt.status, 'findings');
  assert.deepEqual(receipt.coverage.checks.orphans, {
    status: 'completed',
    analyzable_changed_files: 0,
    analyzed_changed_files: [],
    excluded_changed_files: [
      {
        path: 'packages/example/src/index.ts',
        reason: 'existing_file_not_checked_for_orphans'
      }
    ]
  });
  const markdown = formatMarkdown(receipt);
  assert.match(markdown, /## Findings/);
  assert.match(markdown, /duplicate_function in packages\/example/);
  assert.match(markdown, /packages\/example\/src\/copy\.ts/);
});

test('CLI attributes orphan coverage only to files absent from the base revision', (t) => {
  const repo = mkdtempSync(join(tmpdir(), 'ground-review-orphan-coverage-'));
  const binaryDir = mkdtempSync(join(tmpdir(), 'ground-review-orphan-coverage-binary-'));
  t.after(() => {
    rmSync(repo, { recursive: true, force: true });
    rmSync(binaryDir, { recursive: true, force: true });
  });

  mustRun('git', ['init', '-b', 'main'], repo);
  mustRun('git', ['config', 'core.hooksPath', '/dev/null'], repo);
  writeFixtureFile(repo, 'packages/example/package.json', '{"name":"@example/pkg"}\n');
  writeFixtureFile(repo, 'packages/example/src/existing.ts', 'export const existing = 1;\n');
  mustRun('git', ['add', '.'], repo);
  mustRun('git', ['commit', '-m', 'baseline'], repo);
  writeFixtureFile(repo, 'packages/example/src/existing.ts', 'export const existing = 2;\n');
  writeFixtureFile(repo, 'packages/example/src/new.ts', 'export const added = 1;\n');

  const fakeGround = writeFixtureFile(
    binaryDir,
    'fake-ground',
    `#!/bin/sh
printf '%s\\n' '{"changed_file_list":["packages/example/src/existing.ts","packages/example/src/new.ts"],"excluded_changed_files":[],"new_issues":[]}'
`
  );
  chmodSync(fakeGround, 0o755);

  const result = run(process.execPath, [scriptPath, '--base', 'HEAD', '--format', 'json'], repo, {
    GROUND_BINARY: fakeGround
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const receipt = JSON.parse(result.stdout);
  assert.deepEqual(receipt.coverage.checks.duplicates.analyzed_changed_files, [
    'packages/example/src/existing.ts',
    'packages/example/src/new.ts'
  ]);
  assert.deepEqual(receipt.coverage.checks.orphans, {
    status: 'completed',
    analyzable_changed_files: 1,
    analyzed_changed_files: ['packages/example/src/new.ts'],
    excluded_changed_files: [
      {
        path: 'packages/example/src/existing.ts',
        reason: 'existing_file_not_checked_for_orphans'
      }
    ]
  });
});

test('CLI discovers staged content hidden by a base-matching worktree copy', (t) => {
  const repo = mkdtempSync(join(tmpdir(), 'ground-review-index-worktree-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));

  mustRun('git', ['init', '-b', 'main'], repo);
  mustRun('git', ['config', 'core.hooksPath', '/dev/null'], repo);
  writeFixtureFile(repo, 'packages/example/package.json', '{"name":"@example/pkg"}\n');
  writeFixtureFile(repo, 'packages/example/src/index.ts', 'export const value = 1;\n');
  mustRun('git', ['add', '.'], repo);
  mustRun('git', ['commit', '-m', 'baseline'], repo);
  writeFixtureFile(repo, 'packages/example/src/index.ts', 'export const value = 2;\n');
  mustRun('git', ['add', 'packages/example/src/index.ts'], repo);
  writeFixtureFile(repo, 'packages/example/src/index.ts', 'export const value = 1;\n');

  const result = run(process.execPath, [scriptPath, '--base', 'HEAD', '--format', 'json'], repo, {
    GROUND_BINARY: join(repo, 'missing-ground')
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const receipt = JSON.parse(result.stdout);
  assert.deepEqual(receipt.changed_files, ['packages/example/src/index.ts']);
  assert.deepEqual(receipt.targets, []);
  assert.deepEqual(receipt.coverage.excluded_changed_files, [
    { path: 'packages/example/src/index.ts', reason: 'index_worktree_mismatch' }
  ]);
  assert.equal(receipt.status, 'no_analyzable_files');
});

test('CLI does not mistake committed branch changes for staged content', (t) => {
  const repo = mkdtempSync(join(tmpdir(), 'ground-review-committed-worktree-'));
  const binaryDir = mkdtempSync(join(tmpdir(), 'ground-review-committed-worktree-binary-'));
  t.after(() => {
    rmSync(repo, { recursive: true, force: true });
    rmSync(binaryDir, { recursive: true, force: true });
  });

  mustRun('git', ['init', '-b', 'main'], repo);
  mustRun('git', ['config', 'core.hooksPath', '/dev/null'], repo);
  writeFixtureFile(repo, 'packages/example/package.json', '{"name":"@example/pkg"}\n');
  writeFixtureFile(repo, 'packages/example/src/index.ts', 'export const value = 1;\n');
  mustRun('git', ['add', '.'], repo);
  mustRun('git', ['commit', '-m', 'baseline'], repo);
  writeFixtureFile(repo, 'packages/example/src/index.ts', 'export const value = 2;\n');
  mustRun('git', ['add', 'packages/example/src/index.ts'], repo);
  mustRun('git', ['commit', '-m', 'branch change'], repo);
  writeFixtureFile(repo, 'packages/example/src/index.ts', 'export const value = 3;\n');

  const fakeGround = writeFixtureFile(
    binaryDir,
    'fake-ground',
    `#!/bin/sh
printf '%s\\n' '{"changed_file_list":["packages/example/src/index.ts"],"excluded_changed_files":[],"new_issues":[]}'
`
  );
  chmodSync(fakeGround, 0o755);

  const result = run(process.execPath, [scriptPath, '--base', 'HEAD~1', '--format', 'json'], repo, {
    GROUND_BINARY: fakeGround
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const receipt = JSON.parse(result.stdout);
  assert.deepEqual(receipt.coverage.checks.duplicates.analyzed_changed_files, [
    'packages/example/src/index.ts'
  ]);
  assert.deepEqual(receipt.coverage.excluded_changed_files, []);
});

test('CLI honors extended Ground path policy in orphan coverage and findings', (t) => {
  const repo = mkdtempSync(join(tmpdir(), 'ground-review-policy-'));
  const binaryDir = mkdtempSync(join(tmpdir(), 'ground-review-policy-binary-'));
  t.after(() => {
    rmSync(repo, { recursive: true, force: true });
    rmSync(binaryDir, { recursive: true, force: true });
  });

  mustRun('git', ['init', '-b', 'main'], repo);
  mustRun('git', ['config', 'core.hooksPath', '/dev/null'], repo);
  writeFixtureFile(repo, '.ground.yml', 'extends:\n  - .ground/framework.yml\n');
  writeFixtureFile(
    repo,
    '.ground/framework.yml',
    'ignore:\n  paths:\n    - "**/**/+page.server.ts"\n'
  );
  writeFixtureFile(repo, 'packages/example/package.json', '{"name":"@example/pkg"}\n');
  mustRun('git', ['add', '.'], repo);
  mustRun('git', ['commit', '-m', 'baseline'], repo);
  writeFixtureFile(
    repo,
    'packages/example/src/routes/+page.server.ts',
    'export const load = () => ({ ok: true });\n'
  );

  const fakeGround = writeFixtureFile(
    binaryDir,
    'fake-ground',
    `#!/bin/sh
printf '%s\\n' '{"changed_file_list":["packages/example/src/routes/+page.server.ts"],"excluded_changed_files":[],"new_issues":[{"type":"orphan_module","path":"packages/example/src/routes/+page.server.ts","introduced_by":"current_branch","is_new_file":true}]}'
`
  );
  chmodSync(fakeGround, 0o755);

  const result = run(process.execPath, [scriptPath, '--base', 'HEAD', '--format', 'json'], repo, {
    GROUND_BINARY: fakeGround
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const receipt = JSON.parse(result.stdout);
  assert.equal(receipt.coverage.checks.duplicates.analyzable_changed_files, 1);
  assert.deepEqual(receipt.coverage.checks.orphans, {
    status: 'completed',
    analyzable_changed_files: 0,
    analyzed_changed_files: [],
    excluded_changed_files: [
      {
        path: 'packages/example/src/routes/+page.server.ts',
        reason: 'ground_policy_exclusion'
      }
    ]
  });
  assert.deepEqual(receipt.findings, []);
  assert.equal(receipt.status, 'clear');
});

test('CLI preserves mode-only source changes as explicit exclusions', (t) => {
  const repo = mkdtempSync(join(tmpdir(), 'ground-review-mode-only-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));

  mustRun('git', ['init', '-b', 'main'], repo);
  mustRun('git', ['config', 'core.hooksPath', '/dev/null'], repo);
  writeFixtureFile(repo, 'packages/example/package.json', '{"name":"@example/pkg"}\n');
  const source = writeFixtureFile(
    repo,
    'packages/example/src/index.ts',
    'export const value = 1;\n'
  );
  mustRun('git', ['add', '.'], repo);
  mustRun('git', ['commit', '-m', 'baseline'], repo);
  chmodSync(source, 0o755);

  const result = run(process.execPath, [scriptPath, '--base', 'HEAD', '--format', 'json'], repo, {
    GROUND_BINARY: join(repo, 'missing-ground')
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const receipt = JSON.parse(result.stdout);
  assert.deepEqual(receipt.changed_files, ['packages/example/src/index.ts']);
  assert.deepEqual(receipt.targets, []);
  assert.deepEqual(receipt.coverage.excluded_changed_files, [
    { path: 'packages/example/src/index.ts', reason: 'mode_only_change' }
  ]);
  assert.deepEqual(receipt.coverage.checks.duplicates.excluded_changed_files, [
    { path: 'packages/example/src/index.ts', reason: 'mode_only_change' }
  ]);
  assert.deepEqual(receipt.coverage.checks.orphans.excluded_changed_files, [
    { path: 'packages/example/src/index.ts', reason: 'mode_only_change' }
  ]);
  assert.equal(receipt.status, 'no_analyzable_files');
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

test('Markdown receipts escape control characters in evidence paths', () => {
  const markdown = formatMarkdown({
    mode: 'advisory',
    base: 'HEAD',
    status: 'findings',
    coverage: {
      discovered_changed_files: 1,
      analyzable_changed_files: 0,
      excluded_changed_files: [{ path: 'packages/example/src/line\n# injected.ts', reason: 'x' }]
    },
    targets: [],
    findings: [
      {
        type: 'test',
        target: 'packages/example',
        path: 'packages/example/src/tab\t.ts',
        files: ['packages/example/src/line\n.ts']
      }
    ]
  });

  assert.match(markdown, /line\\n# injected\.ts/);
  assert.match(markdown, /tab\\t\.ts/);
  assert.doesNotMatch(markdown, /\n# injected\.ts/);
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

test('CLI collapses nested package changes into one non-overlapping target', (t) => {
  const repo = mkdtempSync(join(tmpdir(), 'ground-review-nested-'));
  const binaryDir = mkdtempSync(join(tmpdir(), 'ground-review-nested-binary-'));
  t.after(() => {
    rmSync(repo, { recursive: true, force: true });
    rmSync(binaryDir, { recursive: true, force: true });
  });

  mustRun('git', ['init', '-b', 'main'], repo);
  mustRun('git', ['config', 'core.hooksPath', '/dev/null'], repo);
  writeFixtureFile(repo, 'packages/parent/package.json', '{"name":"@example/parent"}\n');
  writeFixtureFile(repo, 'packages/parent/src/index.ts', 'export const parent = 1;\n');
  writeFixtureFile(repo, 'packages/parent/worker/package.json', '{"name":"@example/worker"}\n');
  writeFixtureFile(repo, 'packages/parent/worker/src/index.ts', 'export const worker = 1;\n');
  mustRun('git', ['add', '.'], repo);
  mustRun('git', ['commit', '-m', 'baseline'], repo);
  writeFixtureFile(repo, 'packages/parent/src/index.ts', 'export const parent = 2;\n');
  writeFixtureFile(repo, 'packages/parent/worker/src/index.ts', 'export const worker = 2;\n');

  const fakeGround = writeFixtureFile(
    binaryDir,
    'fake-ground',
    `#!/bin/sh
printf '%s\\n' '{"discovered_changed_files":2,"analyzable_changed_files":2,"changed_files":2,"changed_file_list":["packages/parent/src/index.ts","packages/parent/worker/src/index.ts"],"excluded_changed_files":[],"checks_run":["duplicates","orphans"],"new_issues":[],"total_new_issues":0}'
`
  );
  chmodSync(fakeGround, 0o755);

  const result = run(process.execPath, [scriptPath, '--base', 'HEAD', '--format', 'json'], repo, {
    GROUND_BINARY: fakeGround
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const receipt = JSON.parse(result.stdout);
  assert.deepEqual(
    receipt.targets.map((target) => target.path),
    ['packages/parent']
  );
  assert.equal(receipt.targets[0].coverage.discovered_changed_files, 2);
  assert.equal(receipt.coverage.analyzable_changed_files, 2);
});

test('CLI preserves a deleted source file as an explicit coverage exclusion', (t) => {
  const repo = mkdtempSync(join(tmpdir(), 'ground-review-deleted-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));

  mustRun('git', ['init', '-b', 'main'], repo);
  mustRun('git', ['config', 'core.hooksPath', '/dev/null'], repo);
  writeFixtureFile(repo, 'packages/example/package.json', '{"name":"@example/pkg"}\n');
  const source = writeFixtureFile(
    repo,
    'packages/example/src/index.ts',
    'export const value = 1;\n'
  );
  mustRun('git', ['add', '.'], repo);
  mustRun('git', ['commit', '-m', 'baseline'], repo);
  rmSync(source);

  const result = run(process.execPath, [scriptPath, '--base', 'HEAD', '--format', 'json'], repo, {
    GROUND_BINARY: join(repo, 'missing-ground')
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const receipt = JSON.parse(result.stdout);
  assert.deepEqual(receipt.changed_files, ['packages/example/src/index.ts']);
  assert.deepEqual(receipt.targets, []);
  assert.deepEqual(receipt.coverage.excluded_changed_files, [
    { path: 'packages/example/src/index.ts', reason: 'deleted_file' }
  ]);
});

test('repository npm binary is only selected on its compatible development platform', (t) => {
  const repo = mkdtempSync(join(tmpdir(), 'ground-review-platform-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  const npmGround = writeFixtureFile(repo, 'packages/ground/npm/bin/ground.js', '#!/bin/sh\n');
  const npmNativeGround = writeFixtureFile(
    repo,
    'packages/ground/npm/bin/native/ground',
    '#!/bin/sh\n'
  );
  chmodSync(npmGround, 0o755);
  chmodSync(npmNativeGround, 0o755);

  assert.equal(resolveGroundBinary(repo, 'linux', 'x64'), 'ground');
  assert.equal(resolveGroundBinary(repo, 'darwin', 'arm64'), npmGround);
});

test('repository npm wrapper is not selected before its native release asset exists', (t) => {
  const repo = mkdtempSync(join(tmpdir(), 'ground-review-wrapper-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  const npmGround = writeFixtureFile(repo, 'packages/ground/npm/bin/ground.js', '#!/bin/sh\n');
  chmodSync(npmGround, 0o755);

  assert.equal(resolveGroundBinary(repo, 'darwin', 'arm64'), 'ground');
});

test('CLI reconciles cross-target exclusions against analyzed coverage', (t) => {
  const repo = mkdtempSync(join(tmpdir(), 'ground-review-reconcile-'));
  const binaryDir = mkdtempSync(join(tmpdir(), 'ground-review-reconcile-binary-'));
  t.after(() => {
    rmSync(repo, { recursive: true, force: true });
    rmSync(binaryDir, { recursive: true, force: true });
  });

  mustRun('git', ['init', '-b', 'main'], repo);
  mustRun('git', ['config', 'core.hooksPath', '/dev/null'], repo);
  writeFixtureFile(repo, 'packages/one/package.json', '{"name":"@example/one"}\n');
  writeFixtureFile(repo, 'packages/one/src/index.ts', 'export const one = 1;\n');
  writeFixtureFile(repo, 'packages/two/package.json', '{"name":"@example/two"}\n');
  writeFixtureFile(repo, 'packages/two/src/index.ts', 'export const two = 1;\n');
  writeFixtureFile(repo, 'README.md', 'baseline\n');
  mustRun('git', ['add', '.'], repo);
  mustRun('git', ['commit', '-m', 'baseline'], repo);
  writeFixtureFile(repo, 'packages/one/src/index.ts', 'export const one = 2;\n');
  writeFixtureFile(repo, 'packages/two/src/index.ts', 'export const two = 2;\n');
  writeFixtureFile(repo, 'README.md', 'changed\n');

  const fakeGround = writeFixtureFile(
    binaryDir,
    'fake-ground',
    `#!/bin/sh
if [ "$2" = "packages/one" ]; then
  analyzed="packages/one/src/index.ts"
else
  analyzed="packages/two/src/index.ts"
fi
printf '{"discovered_changed_files":3,"analyzable_changed_files":1,"changed_file_list":["%s"],"excluded_changed_files":[{"path":"packages/one/src/index.ts","reason":"outside_analysis_root"},{"path":"packages/two/src/index.ts","reason":"outside_analysis_root"},{"path":"README.md","reason":"outside_analysis_root"}],"new_issues":[]}\\n' "$analyzed"
`
  );
  chmodSync(fakeGround, 0o755);

  const result = run(process.execPath, [scriptPath, '--base', 'HEAD', '--format', 'json'], repo, {
    GROUND_BINARY: fakeGround
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const receipt = JSON.parse(result.stdout);
  assert.deepEqual(receipt.coverage.excluded_changed_files, [
    { path: 'README.md', reason: 'unsupported_extension' }
  ]);
  assert.deepEqual(
    receipt.targets.map((target) => target.coverage.excluded_changed_files),
    [[], []]
  );
  assert.deepEqual(
    receipt.targets.map((target) => target.coverage.discovered_changed_files),
    [1, 1]
  );
  assert.deepEqual(
    receipt.targets.map((target) => target.coverage.analyzed_changed_files),
    [['packages/one/src/index.ts'], ['packages/two/src/index.ts']]
  );
  assert.equal(receipt.coverage.analyzable_changed_files, 2);
});

test('CLI excludes deleted paths from analyzed coverage in a mixed package change', (t) => {
  const repo = mkdtempSync(join(tmpdir(), 'ground-review-mixed-delete-'));
  const binaryDir = mkdtempSync(join(tmpdir(), 'ground-review-mixed-delete-binary-'));
  t.after(() => {
    rmSync(repo, { recursive: true, force: true });
    rmSync(binaryDir, { recursive: true, force: true });
  });

  mustRun('git', ['init', '-b', 'main'], repo);
  mustRun('git', ['config', 'core.hooksPath', '/dev/null'], repo);
  writeFixtureFile(repo, 'packages/example/package.json', '{"name":"@example/pkg"}\n');
  writeFixtureFile(repo, 'packages/example/src/live.ts', 'export const live = 1;\n');
  const deleted = writeFixtureFile(
    repo,
    'packages/example/src/deleted.ts',
    'export const gone = 1;\n'
  );
  mustRun('git', ['add', '.'], repo);
  mustRun('git', ['commit', '-m', 'baseline'], repo);
  writeFixtureFile(repo, 'packages/example/src/live.ts', 'export const live = 2;\n');
  rmSync(deleted);

  const fakeGround = writeFixtureFile(
    binaryDir,
    'fake-ground',
    `#!/bin/sh
printf '%s\\n' '{"discovered_changed_files":2,"analyzable_changed_files":2,"changed_file_list":["packages/example/src/live.ts","packages/example/src/deleted.ts"],"excluded_changed_files":[{"path":"packages/example/src/deleted.ts","reason":"ignored_by_config"}],"new_issues":[]}'
`
  );
  chmodSync(fakeGround, 0o755);

  const result = run(process.execPath, [scriptPath, '--base', 'HEAD', '--format', 'json'], repo, {
    GROUND_BINARY: fakeGround
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const receipt = JSON.parse(result.stdout);
  assert.equal(receipt.coverage.analyzable_changed_files, 1);
  assert.deepEqual(receipt.targets[0].coverage.analyzed_changed_files, [
    'packages/example/src/live.ts'
  ]);
  assert.deepEqual(receipt.coverage.excluded_changed_files, [
    { path: 'packages/example/src/deleted.ts', reason: 'deleted_file' }
  ]);
  assert.deepEqual(receipt.targets[0].coverage.excluded_changed_files, [
    { path: 'packages/example/src/deleted.ts', reason: 'deleted_file' }
  ]);
  assert.deepEqual(receipt.coverage.checks.duplicates.excluded_changed_files, [
    { path: 'packages/example/src/deleted.ts', reason: 'deleted_file' }
  ]);
  assert.deepEqual(receipt.coverage.checks.orphans.excluded_changed_files, [
    {
      path: 'packages/example/src/live.ts',
      reason: 'existing_file_not_checked_for_orphans'
    },
    { path: 'packages/example/src/deleted.ts', reason: 'deleted_file' }
  ]);
  assert.equal(
    receipt.coverage.analyzable_changed_files + receipt.coverage.excluded_changed_files.length,
    receipt.coverage.discovered_changed_files
  );
  assert.equal(receipt.targets[0].coverage.discovered_changed_files, 2);
});

test('CLI includes tracked file type changes in discovery', (t) => {
  const repo = mkdtempSync(join(tmpdir(), 'ground-review-type-change-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));

  mustRun('git', ['init', '-b', 'main'], repo);
  mustRun('git', ['config', 'core.hooksPath', '/dev/null'], repo);
  const source = writeFixtureFile(repo, 'review.ts', 'export const value = 1;\n');
  writeFixtureFile(repo, 'README.md', 'target\n');
  mustRun('git', ['add', '.'], repo);
  mustRun('git', ['commit', '-m', 'baseline'], repo);
  rmSync(source);
  symlinkSync('README.md', source);

  const result = run(process.execPath, [scriptPath, '--base', 'HEAD', '--format', 'json'], repo, {
    GROUND_BINARY: join(repo, 'missing-ground')
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const receipt = JSON.parse(result.stdout);
  assert.deepEqual(receipt.changed_files, ['review.ts']);
  assert.deepEqual(receipt.coverage.excluded_changed_files, [
    { path: 'review.ts', reason: 'outside_package_source' }
  ]);
});

test('CLI preserves a package symlink path when Ground reports an absolute file', (t) => {
  const repo = mkdtempSync(join(tmpdir(), 'ground-review-symlink-path-'));
  const binaryDir = mkdtempSync(join(tmpdir(), 'ground-review-symlink-path-binary-'));
  t.after(() => {
    rmSync(repo, { recursive: true, force: true });
    rmSync(binaryDir, { recursive: true, force: true });
  });

  mustRun('git', ['init', '-b', 'main'], repo);
  mustRun('git', ['config', 'core.hooksPath', '/dev/null'], repo);
  writeFixtureFile(repo, 'packages/example/package.json', '{"name":"@example/pkg"}\n');
  const source = writeFixtureFile(
    repo,
    'packages/example/src/link.ts',
    'export const value = 1;\n'
  );
  writeFixtureFile(repo, 'README.md', 'target\n');
  mustRun('git', ['add', '.'], repo);
  mustRun('git', ['commit', '-m', 'baseline'], repo);
  rmSync(source);
  symlinkSync('../../../README.md', source);

  const fakeGround = writeFixtureFile(
    binaryDir,
    'fake-ground',
    `#!/bin/sh
printf '%s\\n' '{"discovered_changed_files":1,"analyzable_changed_files":1,"changed_file_list":["${source}"],"excluded_changed_files":[],"new_issues":[]}'
`
  );
  chmodSync(fakeGround, 0o755);

  const result = run(process.execPath, [scriptPath, '--base', 'HEAD', '--format', 'json'], repo, {
    GROUND_BINARY: fakeGround
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const receipt = JSON.parse(result.stdout);
  assert.deepEqual(receipt.targets[0].coverage.analyzed_changed_files, [
    'packages/example/src/link.ts'
  ]);
});

test('CLI excludes an unresolved package source conflict from analyzed coverage', (t) => {
  const repo = mkdtempSync(join(tmpdir(), 'ground-review-unmerged-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));

  mustRun('git', ['init', '-b', 'main'], repo);
  mustRun('git', ['config', 'core.hooksPath', '/dev/null'], repo);
  writeFixtureFile(repo, 'packages/example/package.json', '{"name":"@example/pkg"}\n');
  writeFixtureFile(repo, 'packages/example/src/index.ts', 'export const value = 1;\n');
  mustRun('git', ['add', '.'], repo);
  mustRun('git', ['commit', '-m', 'baseline'], repo);
  mustRun('git', ['switch', '-c', 'other'], repo);
  writeFixtureFile(repo, 'packages/example/src/index.ts', 'export const value = 2;\n');
  mustRun('git', ['add', '.'], repo);
  mustRun('git', ['commit', '-m', 'other change'], repo);
  mustRun('git', ['switch', 'main'], repo);
  writeFixtureFile(repo, 'packages/example/src/index.ts', 'export const value = 3;\n');
  mustRun('git', ['add', '.'], repo);
  mustRun('git', ['commit', '-m', 'main change'], repo);
  const merge = run('git', ['merge', 'other'], repo);
  assert.notEqual(merge.status, 0);

  const result = run(process.execPath, [scriptPath, '--base', 'HEAD^', '--format', 'json'], repo, {
    GROUND_BINARY: join(repo, 'missing-ground')
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const receipt = JSON.parse(result.stdout);
  assert.deepEqual(receipt.changed_files, ['packages/example/src/index.ts']);
  assert.deepEqual(receipt.targets, []);
  assert.deepEqual(receipt.coverage.excluded_changed_files, [
    { path: 'packages/example/src/index.ts', reason: 'unmerged_file' }
  ]);
});

test('CLI analyzes a live replacement after a staged deletion at the same path', (t) => {
  const repo = mkdtempSync(join(tmpdir(), 'ground-review-recreated-'));
  const binaryDir = mkdtempSync(join(tmpdir(), 'ground-review-recreated-binary-'));
  t.after(() => {
    rmSync(repo, { recursive: true, force: true });
    rmSync(binaryDir, { recursive: true, force: true });
  });

  mustRun('git', ['init', '-b', 'main'], repo);
  mustRun('git', ['config', 'core.hooksPath', '/dev/null'], repo);
  writeFixtureFile(repo, 'packages/example/package.json', '{"name":"@example/pkg"}\n');
  const source = writeFixtureFile(
    repo,
    'packages/example/src/index.ts',
    'export const value = 1;\n'
  );
  mustRun('git', ['add', '.'], repo);
  mustRun('git', ['commit', '-m', 'baseline'], repo);
  rmSync(source);
  mustRun('git', ['add', 'packages/example/src/index.ts'], repo);
  writeFixtureFile(repo, 'packages/example/src/index.ts', 'export const value = 2;\n');

  const fakeGround = writeFixtureFile(
    binaryDir,
    'fake-ground',
    `#!/bin/sh
printf '%s\\n' '{"discovered_changed_files":1,"analyzable_changed_files":2,"changed_file_list":["packages/example/src/index.ts","packages/example/src/index.ts"],"excluded_changed_files":[],"new_issues":[]}'
`
  );
  chmodSync(fakeGround, 0o755);

  const result = run(process.execPath, [scriptPath, '--base', 'HEAD', '--format', 'json'], repo, {
    GROUND_BINARY: fakeGround
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const receipt = JSON.parse(result.stdout);
  assert.equal(receipt.coverage.analyzable_changed_files, 1);
  assert.deepEqual(receipt.targets[0].coverage.analyzed_changed_files, [
    'packages/example/src/index.ts'
  ]);
  assert.deepEqual(receipt.coverage.excluded_changed_files, []);
});

test('CLI preserves Unicode Git paths when Ground cannot round-trip them', (t) => {
  const repo = mkdtempSync(join(tmpdir(), 'ground-review-unicode-'));
  const binaryDir = mkdtempSync(join(tmpdir(), 'ground-review-unicode-binary-'));
  t.after(() => {
    rmSync(repo, { recursive: true, force: true });
    rmSync(binaryDir, { recursive: true, force: true });
  });

  mustRun('git', ['init', '-b', 'main'], repo);
  mustRun('git', ['config', 'core.hooksPath', '/dev/null'], repo);
  writeFixtureFile(repo, 'packages/example/package.json', '{"name":"@example/pkg"}\n');
  writeFixtureFile(repo, 'packages/example/src/café.ts', 'export const value = 1;\n');
  mustRun('git', ['add', '.'], repo);
  mustRun('git', ['commit', '-m', 'baseline'], repo);
  writeFixtureFile(repo, 'packages/example/src/café.ts', 'export const value = 2;\n');

  const fakeGround = writeFixtureFile(
    binaryDir,
    'fake-ground',
    `#!/bin/sh
printf '%s\\n' '{"discovered_changed_files":1,"analyzable_changed_files":0,"changed_file_list":[],"excluded_changed_files":[],"new_issues":[]}'
`
  );
  chmodSync(fakeGround, 0o755);

  const result = run(process.execPath, [scriptPath, '--base', 'HEAD', '--format', 'json'], repo, {
    GROUND_BINARY: fakeGround
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const receipt = JSON.parse(result.stdout);
  assert.deepEqual(receipt.changed_files, ['packages/example/src/café.ts']);
  assert.deepEqual(receipt.targets[0].coverage.analyzed_changed_files, []);
  assert.equal(receipt.coverage.analyzable_changed_files, 0);
  assert.deepEqual(receipt.coverage.excluded_changed_files, [
    { path: 'packages/example/src/café.ts', reason: 'ground_path_mismatch' }
  ]);
  assert.deepEqual(receipt.targets[0].coverage.excluded_changed_files, [
    { path: 'packages/example/src/café.ts', reason: 'ground_path_mismatch' }
  ]);
  assert.equal(receipt.status, 'no_analyzable_files');
});

test('CLI preserves unsupported Unicode paths when Ground cannot round-trip them', (t) => {
  const repo = mkdtempSync(join(tmpdir(), 'ground-review-unsupported-unicode-'));
  const binaryDir = mkdtempSync(join(tmpdir(), 'ground-review-unsupported-unicode-binary-'));
  t.after(() => {
    rmSync(repo, { recursive: true, force: true });
    rmSync(binaryDir, { recursive: true, force: true });
  });

  mustRun('git', ['init', '-b', 'main'], repo);
  mustRun('git', ['config', 'core.hooksPath', '/dev/null'], repo);
  writeFixtureFile(repo, 'packages/example/package.json', '{"name":"@example/pkg"}\n');
  writeFixtureFile(repo, 'packages/example/src/index.ts', 'export const value = 1;\n');
  writeFixtureFile(repo, 'packages/example/src/café.svelte', '<p>one</p>\n');
  mustRun('git', ['add', '.'], repo);
  mustRun('git', ['commit', '-m', 'baseline'], repo);
  writeFixtureFile(repo, 'packages/example/src/index.ts', 'export const value = 2;\n');
  writeFixtureFile(repo, 'packages/example/src/café.svelte', '<p>two</p>\n');

  const fakeGround = writeFixtureFile(
    binaryDir,
    'fake-ground',
    `#!/bin/sh
printf '%s\\n' '{"discovered_changed_files":2,"analyzable_changed_files":1,"changed_file_list":["packages/example/src/index.ts"],"excluded_changed_files":[],"new_issues":[]}'
`
  );
  chmodSync(fakeGround, 0o755);

  const result = run(process.execPath, [scriptPath, '--base', 'HEAD', '--format', 'json'], repo, {
    GROUND_BINARY: fakeGround
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const receipt = JSON.parse(result.stdout);
  assert.equal(receipt.coverage.analyzable_changed_files, 1);
  assert.deepEqual(receipt.coverage.excluded_changed_files, [
    { path: 'packages/example/src/café.svelte', reason: 'unsupported_extension' }
  ]);
});

test('CLI preserves both sides of a cross-package rename', (t) => {
  const repo = mkdtempSync(join(tmpdir(), 'ground-review-rename-'));
  const binaryDir = mkdtempSync(join(tmpdir(), 'ground-review-rename-binary-'));
  t.after(() => {
    rmSync(repo, { recursive: true, force: true });
    rmSync(binaryDir, { recursive: true, force: true });
  });

  mustRun('git', ['init', '-b', 'main'], repo);
  mustRun('git', ['config', 'core.hooksPath', '/dev/null'], repo);
  writeFixtureFile(repo, 'packages/one/package.json', '{"name":"@example/one"}\n');
  const source = writeFixtureFile(repo, 'packages/one/src/value.ts', 'export const value = 1;\n');
  writeFixtureFile(repo, 'packages/two/package.json', '{"name":"@example/two"}\n');
  mkdirSync(join(repo, 'packages/two/src'), { recursive: true });
  mustRun('git', ['add', '.'], repo);
  mustRun('git', ['commit', '-m', 'baseline'], repo);
  const destination = join(repo, 'packages/two/src/value.ts');
  renameSync(source, destination);

  const fakeGround = writeFixtureFile(
    binaryDir,
    'fake-ground',
    `#!/bin/sh
printf '%s\\n' '{"discovered_changed_files":2,"analyzable_changed_files":1,"changed_file_list":["packages/two/src/value.ts"],"excluded_changed_files":[],"new_issues":[]}'
`
  );
  chmodSync(fakeGround, 0o755);

  const result = run(process.execPath, [scriptPath, '--base', 'HEAD', '--format', 'json'], repo, {
    GROUND_BINARY: fakeGround
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const receipt = JSON.parse(result.stdout);
  assert.deepEqual(receipt.changed_files, [
    'packages/one/src/value.ts',
    'packages/two/src/value.ts'
  ]);
  assert.deepEqual(receipt.targets[0].coverage.analyzed_changed_files, [
    'packages/two/src/value.ts'
  ]);
  assert.deepEqual(receipt.coverage.excluded_changed_files, [
    { path: 'packages/one/src/value.ts', reason: 'deleted_file' }
  ]);
});

test('CLI excludes a dangling package source symlink as unreadable', (t) => {
  const repo = mkdtempSync(join(tmpdir(), 'ground-review-dangling-'));
  const binaryDir = mkdtempSync(join(tmpdir(), 'ground-review-dangling-binary-'));
  t.after(() => {
    rmSync(repo, { recursive: true, force: true });
    rmSync(binaryDir, { recursive: true, force: true });
  });

  mustRun('git', ['init', '-b', 'main'], repo);
  mustRun('git', ['config', 'core.hooksPath', '/dev/null'], repo);
  writeFixtureFile(repo, 'packages/example/package.json', '{"name":"@example/pkg"}\n');
  const source = writeFixtureFile(
    repo,
    'packages/example/src/link.ts',
    'export const value = 1;\n'
  );
  mustRun('git', ['add', '.'], repo);
  mustRun('git', ['commit', '-m', 'baseline'], repo);
  rmSync(source);
  symlinkSync('missing.ts', source);

  const result = run(process.execPath, [scriptPath, '--base', 'HEAD', '--format', 'json'], repo, {
    GROUND_BINARY: join(repo, 'missing-ground')
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const receipt = JSON.parse(result.stdout);
  assert.deepEqual(receipt.changed_files, ['packages/example/src/link.ts']);
  assert.deepEqual(receipt.targets, []);
  assert.deepEqual(receipt.coverage.excluded_changed_files, [
    { path: 'packages/example/src/link.ts', reason: 'unreadable_file' }
  ]);
  assert.equal(receipt.status, 'no_analyzable_files');
});

test('CLI excludes a package source path replaced by a directory', (t) => {
  const repo = mkdtempSync(join(tmpdir(), 'ground-review-directory-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));

  mustRun('git', ['init', '-b', 'main'], repo);
  mustRun('git', ['config', 'core.hooksPath', '/dev/null'], repo);
  writeFixtureFile(repo, 'packages/example/package.json', '{"name":"@example/pkg"}\n');
  const source = writeFixtureFile(
    repo,
    'packages/example/src/value.ts',
    'export const value = 1;\n'
  );
  mustRun('git', ['add', '.'], repo);
  mustRun('git', ['commit', '-m', 'baseline'], repo);
  rmSync(source);
  mkdirSync(source);
  writeFixtureFile(repo, 'packages/example/src/value.ts/nested.txt', 'replacement\n');

  const result = run(process.execPath, [scriptPath, '--base', 'HEAD', '--format', 'json'], repo, {
    GROUND_BINARY: join(repo, 'missing-ground')
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const receipt = JSON.parse(result.stdout);
  assert.deepEqual(receipt.changed_files, [
    'packages/example/src/value.ts',
    'packages/example/src/value.ts/nested.txt'
  ]);
  assert.deepEqual(receipt.targets, []);
  assert.deepEqual(receipt.coverage.excluded_changed_files, [
    { path: 'packages/example/src/value.ts', reason: 'unreadable_file' },
    { path: 'packages/example/src/value.ts/nested.txt', reason: 'unsupported_extension' }
  ]);
});

test('CLI excludes generated TypeScript from calibration coverage', (t) => {
  const repo = mkdtempSync(join(tmpdir(), 'ground-review-generated-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));

  mustRun('git', ['init', '-b', 'main'], repo);
  mustRun('git', ['config', 'core.hooksPath', '/dev/null'], repo);
  writeFixtureFile(repo, 'packages/example/package.json', '{"name":"@example/pkg"}\n');
  writeFixtureFile(repo, 'packages/example/src/catalog.generated.ts', 'export const value = 1;\n');
  mustRun('git', ['add', '.'], repo);
  mustRun('git', ['commit', '-m', 'baseline'], repo);
  writeFixtureFile(repo, 'packages/example/src/catalog.generated.ts', 'export const value = 2;\n');

  const result = run(process.execPath, [scriptPath, '--base', 'HEAD', '--format', 'json'], repo, {
    GROUND_BINARY: join(repo, 'missing-ground')
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const receipt = JSON.parse(result.stdout);
  assert.deepEqual(receipt.targets, []);
  assert.deepEqual(receipt.coverage.excluded_changed_files, [
    { path: 'packages/example/src/catalog.generated.ts', reason: 'generated_file' }
  ]);
  assert.deepEqual(receipt.coverage.checks.duplicates.excluded_changed_files, [
    { path: 'packages/example/src/catalog.generated.ts', reason: 'generated_file' }
  ]);
  assert.deepEqual(receipt.coverage.checks.orphans.excluded_changed_files, [
    { path: 'packages/example/src/catalog.generated.ts', reason: 'generated_file' }
  ]);
});

test('CLI drops findings sourced only from excluded generated files', (t) => {
  const repo = mkdtempSync(join(tmpdir(), 'ground-review-generated-finding-'));
  const binaryDir = mkdtempSync(join(tmpdir(), 'ground-review-generated-finding-binary-'));
  t.after(() => {
    rmSync(repo, { recursive: true, force: true });
    rmSync(binaryDir, { recursive: true, force: true });
  });

  mustRun('git', ['init', '-b', 'main'], repo);
  mustRun('git', ['config', 'core.hooksPath', '/dev/null'], repo);
  writeFixtureFile(repo, 'packages/example/package.json', '{"name":"@example/pkg"}\n');
  writeFixtureFile(repo, 'packages/example/src/index.ts', 'export const value = 1;\n');
  writeFixtureFile(
    repo,
    'packages/example/src/catalog.generated.ts',
    'export const catalog = 1;\n'
  );
  mustRun('git', ['add', '.'], repo);
  mustRun('git', ['commit', '-m', 'baseline'], repo);
  writeFixtureFile(repo, 'packages/example/src/index.ts', 'export const value = 2;\n');
  writeFixtureFile(
    repo,
    'packages/example/src/catalog.generated.ts',
    'export const catalog = 2;\n'
  );

  const fakeGround = writeFixtureFile(
    binaryDir,
    'fake-ground',
    `#!/bin/sh
printf '%s\\n' '{"discovered_changed_files":2,"analyzable_changed_files":2,"changed_file_list":["packages/example/src/index.ts","packages/example/src/catalog.generated.ts"],"excluded_changed_files":[],"new_issues":[{"type":"orphan_module","path":"packages/example/src/catalog.generated.ts"}]}'
`
  );
  chmodSync(fakeGround, 0o755);

  const result = run(process.execPath, [scriptPath, '--base', 'HEAD', '--format', 'json'], repo, {
    GROUND_BINARY: fakeGround
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const receipt = JSON.parse(result.stdout);
  assert.deepEqual(receipt.targets[0].coverage.analyzed_changed_files, [
    'packages/example/src/index.ts'
  ]);
  assert.deepEqual(receipt.coverage.excluded_changed_files, [
    { path: 'packages/example/src/catalog.generated.ts', reason: 'generated_file' }
  ]);
  assert.deepEqual(receipt.targets[0].coverage.checks.duplicates.excluded_changed_files, [
    { path: 'packages/example/src/catalog.generated.ts', reason: 'generated_file' }
  ]);
  assert.deepEqual(receipt.targets[0].coverage.checks.orphans.excluded_changed_files, [
    {
      path: 'packages/example/src/index.ts',
      reason: 'existing_file_not_checked_for_orphans'
    },
    { path: 'packages/example/src/catalog.generated.ts', reason: 'generated_file' }
  ]);
  assert.deepEqual(receipt.coverage.checks.duplicates.excluded_changed_files, [
    { path: 'packages/example/src/catalog.generated.ts', reason: 'generated_file' }
  ]);
  assert.deepEqual(receipt.findings, []);
  assert.equal(receipt.status, 'clear');
});

test('CLI accepts per-file completion evidence beyond the former Ground scan cap', (t) => {
  const repo = mkdtempSync(join(tmpdir(), 'ground-review-scan-cap-'));
  const binaryDir = mkdtempSync(join(tmpdir(), 'ground-review-scan-cap-binary-'));
  t.after(() => {
    rmSync(repo, { recursive: true, force: true });
    rmSync(binaryDir, { recursive: true, force: true });
  });

  mustRun('git', ['init', '-b', 'main'], repo);
  mustRun('git', ['config', 'core.hooksPath', '/dev/null'], repo);
  writeFixtureFile(repo, 'packages/example/package.json', '{"name":"@example/pkg"}\n');
  for (let index = 0; index <= 500; index += 1) {
    writeFixtureFile(
      repo,
      `packages/example/src/file-${String(index).padStart(3, '0')}.ts`,
      `export const value${index} = ${index};\n`
    );
  }
  mustRun('git', ['add', '.'], repo);
  mustRun('git', ['commit', '-m', 'baseline'], repo);
  writeFixtureFile(repo, 'packages/example/src/file-500.ts', 'export const value500 = 501;\n');

  const fakeGround = writeFixtureFile(
    binaryDir,
    'fake-ground',
    `#!/bin/sh
printf '%s\\n' '{"changed_file_list":["packages/example/src/file-500.ts"],"excluded_changed_files":[],"check_coverage":{"duplicates":{"status":"completed","analyzed_changed_files":["packages/example/src/file-500.ts"],"excluded_changed_files":[]},"orphans":{"status":"completed","analyzed_changed_files":[],"excluded_changed_files":[{"path":"packages/example/src/file-500.ts","reason":"existing_file_not_checked_for_orphans"}]}},"new_issues":[]}'
`
  );
  chmodSync(fakeGround, 0o755);

  const result = run(process.execPath, [scriptPath, '--base', 'HEAD', '--format', 'json'], repo, {
    GROUND_BINARY: fakeGround
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const receipt = JSON.parse(result.stdout);
  assert.equal(receipt.coverage.analyzable_changed_files, 1);
  assert.deepEqual(receipt.targets[0].coverage.analyzed_changed_files, [
    'packages/example/src/file-500.ts'
  ]);
  assert.deepEqual(receipt.coverage.excluded_changed_files, []);
  assert.equal(receipt.status, 'clear');

  writeFixtureFile(
    binaryDir,
    'fake-ground',
    `#!/bin/sh
printf '%s\\n' '{"changed_file_list":["packages/example/src/file-500.ts"],"excluded_changed_files":[],"new_issues":[]}'
`
  );
  chmodSync(fakeGround, 0o755);
  const legacyResult = run(
    process.execPath,
    [scriptPath, '--base', 'HEAD', '--format', 'json'],
    repo,
    { GROUND_BINARY: fakeGround }
  );
  assert.equal(legacyResult.status, 0, legacyResult.stderr || legacyResult.stdout);
  const legacyReceipt = JSON.parse(legacyResult.stdout);
  assert.equal(legacyReceipt.coverage.analyzable_changed_files, 0);
  assert.deepEqual(legacyReceipt.coverage.excluded_changed_files, [
    {
      path: 'packages/example/src/file-500.ts',
      reason: 'ground_completion_evidence_missing'
    }
  ]);
});

test('CLI preserves partial Ground completion status in the review receipt', (t) => {
  const repo = mkdtempSync(join(tmpdir(), 'ground-review-partial-completion-'));
  const binaryDir = mkdtempSync(join(tmpdir(), 'ground-review-partial-completion-binary-'));
  t.after(() => {
    rmSync(repo, { recursive: true, force: true });
    rmSync(binaryDir, { recursive: true, force: true });
  });

  mustRun('git', ['init', '-b', 'main'], repo);
  mustRun('git', ['config', 'core.hooksPath', '/dev/null'], repo);
  writeFixtureFile(repo, 'packages/example/package.json', '{"name":"@example/pkg"}\n');
  writeFixtureFile(repo, 'packages/example/src/value.ts', 'export const value = 1;\n');
  mustRun('git', ['add', '.'], repo);
  mustRun('git', ['commit', '-m', 'baseline'], repo);
  writeFixtureFile(repo, 'packages/example/src/value.ts', 'export const value = 2;\n');

  const fakeGround = writeFixtureFile(
    binaryDir,
    'fake-ground',
    `#!/bin/sh
printf '%s\\n' '{"changed_file_list":["packages/example/src/value.ts"],"excluded_changed_files":[],"check_coverage":{"duplicates":{"status":"partial","analyzed_changed_files":["packages/example/src/value.ts"],"excluded_changed_files":[]},"orphans":{"status":"completed","analyzed_changed_files":[],"excluded_changed_files":[{"path":"packages/example/src/value.ts","reason":"existing_file_not_checked_for_orphans"}]}},"new_issues":[]}'
`
  );
  chmodSync(fakeGround, 0o755);

  const result = run(process.execPath, [scriptPath, '--base', 'HEAD', '--format', 'json'], repo, {
    GROUND_BINARY: fakeGround
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const receipt = JSON.parse(result.stdout);
  assert.equal(receipt.coverage.checks.duplicates.status, 'partial');
  assert.deepEqual(receipt.coverage.checks.duplicates.analyzed_changed_files, [
    'packages/example/src/value.ts'
  ]);
  assert.equal(receipt.status, 'partial');
  assert.match(formatMarkdown(receipt), /Duplicate-check status: partial/);
});

test('CLI preserves Ground orphan per-file failure evidence', (t) => {
  const repo = mkdtempSync(join(tmpdir(), 'ground-review-orphan-partial-'));
  const binaryDir = mkdtempSync(join(tmpdir(), 'ground-review-orphan-partial-binary-'));
  t.after(() => {
    rmSync(repo, { recursive: true, force: true });
    rmSync(binaryDir, { recursive: true, force: true });
  });

  mustRun('git', ['init', '-b', 'main'], repo);
  mustRun('git', ['config', 'core.hooksPath', '/dev/null'], repo);
  writeFixtureFile(repo, 'packages/example/package.json', '{"name":"@example/pkg"}\n');
  mustRun('git', ['add', '.'], repo);
  mustRun('git', ['commit', '-m', 'baseline'], repo);
  writeFixtureFile(repo, 'packages/example/src/new.ts', 'export const value = 1;\n');

  const fakeGround = writeFixtureFile(
    binaryDir,
    'fake-ground',
    `#!/bin/sh
printf '%s\\n' '{"changed_file_list":["packages/example/src/new.ts"],"excluded_changed_files":[],"check_coverage":{"duplicates":{"status":"completed","analyzed_changed_files":["packages/example/src/new.ts"],"excluded_changed_files":[]},"orphans":{"status":"partial","analyzed_changed_files":[],"excluded_changed_files":[{"path":"packages/example/src/new.ts","reason":"orphan_analysis_failed"}]}},"new_issues":[]}'
`
  );
  chmodSync(fakeGround, 0o755);

  const result = run(process.execPath, [scriptPath, '--base', 'HEAD', '--format', 'json'], repo, {
    GROUND_BINARY: fakeGround
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const receipt = JSON.parse(result.stdout);
  assert.equal(receipt.coverage.checks.orphans.status, 'partial');
  assert.deepEqual(receipt.coverage.checks.orphans.analyzed_changed_files, []);
  assert.deepEqual(receipt.coverage.checks.orphans.excluded_changed_files, [
    { path: 'packages/example/src/new.ts', reason: 'orphan_analysis_failed' }
  ]);
  assert.equal(receipt.status, 'partial');
});

test('CLI accepts bounded completion evidence with a symlinked directory alias', (t) => {
  const repo = mkdtempSync(join(tmpdir(), 'ground-review-symlink-directory-'));
  const binaryDir = mkdtempSync(join(tmpdir(), 'ground-review-symlink-directory-binary-'));
  t.after(() => {
    rmSync(repo, { recursive: true, force: true });
    rmSync(binaryDir, { recursive: true, force: true });
  });

  mustRun('git', ['init', '-b', 'main'], repo);
  mustRun('git', ['config', 'core.hooksPath', '/dev/null'], repo);
  writeFixtureFile(repo, 'packages/example/package.json', '{"name":"@example/pkg"}\n');
  writeFixtureFile(repo, 'packages/example/src/value.ts', 'export const value = 1;\n');
  symlinkSync('src', join(repo, 'packages/example/alias'));
  mustRun('git', ['add', '.'], repo);
  mustRun('git', ['commit', '-m', 'baseline'], repo);
  writeFixtureFile(repo, 'packages/example/src/value.ts', 'export const value = 2;\n');

  const fakeGround = writeFixtureFile(
    binaryDir,
    'fake-ground',
    `#!/bin/sh
printf '%s\\n' '{"changed_file_list":["packages/example/src/value.ts"],"excluded_changed_files":[],"check_coverage":{"duplicates":{"status":"completed","analyzed_changed_files":["packages/example/src/value.ts"],"excluded_changed_files":[]},"orphans":{"status":"completed","analyzed_changed_files":[],"excluded_changed_files":[{"path":"packages/example/src/value.ts","reason":"existing_file_not_checked_for_orphans"}]}},"new_issues":[]}'
`
  );
  chmodSync(fakeGround, 0o755);

  const result = run(process.execPath, [scriptPath, '--base', 'HEAD', '--format', 'json'], repo, {
    GROUND_BINARY: fakeGround
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const receipt = JSON.parse(result.stdout);
  assert.equal(receipt.coverage.analyzable_changed_files, 1);
  assert.deepEqual(receipt.coverage.excluded_changed_files, []);
});
