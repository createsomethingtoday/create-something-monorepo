import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
const cli = resolve('scripts/workflow-discovery/cli.mjs');
const invoke = (args) =>
  execFileSync(process.execPath, [cli, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
test('CLI runs actual compiler, verifies output, and holds tampering without source writes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'discovery-cli-'));
  try {
    const repo = join(root, 'repo'),
      out = join(root, 'output');
    await mkdir(repo);
    const source = JSON.stringify({
      name: 'test-package',
      scripts: { build: 'PRIVATE_DO_NOT_RUN', test: 'PRIVATE_DO_NOT_RUN' }
    });
    await writeFile(join(repo, 'package.json'), source);
    const run = JSON.parse(invoke(['run', '--repo', repo, '--out', out]));
    assert.equal(run.status, 'generated');
    assert.equal(run.coverage.emitted, 1);
    assert.equal(JSON.parse(invoke(['verify', '--out', out])).valid, true);
    await writeFile(join(out, run.generation, 'catalog.json'), 'corrupt');
    assert.throws(
      () => invoke(['verify', '--out', out]),
      (error) => error.status === 1 && JSON.parse(error.stdout).valid === false
    );
    assert.equal(JSON.parse(invoke(['run', '--repo', repo, '--out', out])).status, 'repaired');
    assert.equal(await readFile(join(repo, 'package.json'), 'utf8'), source);
    assert.throws(
      () => invoke(['collect-history', '--repo', repo, '--out', join(repo, 'private.json')]),
      (error) =>
        error.status === 1 &&
        JSON.parse(error.stderr).code === 'history_output_must_remain_outside_repository'
    );
    assert.throws(
      () => invoke(['run', '--out', out, '--unknown', 'x']),
      (error) => error.status === 1
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('verification and history validation work in a checkout with no compiler build', async () => {
  const root = await mkdtemp(join(tmpdir(), 'discovery-no-compiler-'));
  try {
    const repo = join(root, 'repo'),
      out = join(root, 'output');
    await mkdir(repo);
    await writeFile(
      join(repo, 'package.json'),
      JSON.stringify({ name: 'test', scripts: { build: 'never', test: 'never' } })
    );
    invoke(['run', '--repo', repo, '--out', out]);
    const scripts = join(repo, 'scripts', 'workflow-discovery');
    await mkdir(scripts, { recursive: true });
    await cp(resolve('scripts/workflow-discovery'), scripts, { recursive: true });
    const standalone = (args) =>
      execFileSync(process.execPath, [join(scripts, 'cli.mjs'), ...args], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
      });
    assert.equal(JSON.parse(standalone(['verify', '--out', out])).valid, true);
    assert.throws(
      () => standalone(['collect-history', '--repo', repo, '--out', join(repo, 'private.json')]),
      (error) =>
        error.status === 1 &&
        JSON.parse(error.stderr).code === 'history_output_must_remain_outside_repository'
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('private history rejects dot-dot-prefixed parents inside the repository before CTX', async () => {
  const root = await mkdtemp(join(tmpdir(), 'discovery-history-boundary-'));
  try {
    const repo = join(root, 'repo');
    await mkdir(join(repo, '..private'), { recursive: true });
    assert.throws(
      () =>
        execFileSync(
          process.execPath,
          [
            cli,
            'collect-history',
            '--repo',
            repo,
            '--out',
            join(repo, '..private', 'history.json')
          ],
          { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, PATH: '' } }
        ),
      (error) =>
        error.status === 1 &&
        JSON.parse(error.stderr).code === 'history_output_must_remain_outside_repository'
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
