import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  buildDefaults,
  formatClaimBody,
  normalizeBranchName,
  normalizeIssueIdentifier,
  parseArgs,
} from '../agent-claim-worktree.mjs';

test('parseArgs supports claim-worktree options', () => {
  const options = parseArgs([
    'node',
    'scripts/agent-claim-worktree.mjs',
    '--issue',
    'CRE-726',
    '--base',
    'origin/main',
    '--root',
    '/tmp/worktrees',
    '--bootstrap',
    '--reuse-branch',
    '--json',
  ]);

  assert.equal(options.issue, 'CRE-726');
  assert.equal(options.base, 'origin/main');
  assert.equal(options.root, '/tmp/worktrees');
  assert.equal(options.bootstrap, true);
  assert.equal(options.reuseBranch, true);
  assert.equal(options.json, true);
});

test('buildDefaults creates deterministic branch and worktree values', () => {
  const defaults = buildDefaults({ issue: 'cre-726', root: '/tmp/cs-worktrees' });

  assert.equal(defaults.issue, 'CRE-726');
  assert.equal(defaults.branch, 'codex/CRE-726-agent-worktree');
  assert.equal(defaults.worktree, path.resolve('/tmp/cs-worktrees/cre-726-agent-worktree'));
  assert.equal(defaults.base, 'origin/main');
  assert.equal(defaults.fetch, true);
  assert.equal(defaults.bootstrap, false);
});

test('buildDefaults falls back to os tmpdir when no root is provided', () => {
  const defaults = buildDefaults({ issue: 'CRE-1' });
  assert.equal(defaults.worktree, path.join(os.tmpdir(), 'cre-1-agent-worktree'));
});

test('buildDefaults honors AGENT_WORKTREE_ROOT for non-temp agent worktrees', (t) => {
  const previousRoot = process.env.AGENT_WORKTREE_ROOT;
  process.env.AGENT_WORKTREE_ROOT = '/Users/example/Code/create-something-worktrees';
  t.after(() => {
    if (previousRoot === undefined) delete process.env.AGENT_WORKTREE_ROOT;
    else process.env.AGENT_WORKTREE_ROOT = previousRoot;
  });

  const defaults = buildDefaults({ issue: 'CRE-776' });
  assert.equal(
    defaults.worktree,
    path.resolve('/Users/example/Code/create-something-worktrees/cre-776-agent-worktree'),
  );
});

test('issue and branch normalization reject unsafe values', () => {
  assert.throws(() => normalizeIssueIdentifier('724'), /Issue must look like/);
  assert.throws(() => normalizeBranchName('../main'), /Unsafe branch name/);
  assert.throws(() => normalizeBranchName('codex/bad..branch'), /Unsafe branch name/);
});

test('formatClaimBody records the handoff fields agents need', () => {
  const body = formatClaimBody({
    issue: 'CRE-726',
    branch: 'codex/CRE-726-agent-worktree',
    worktree: '/tmp/cre-726-agent-worktree',
    base: 'origin/main',
    baseSha: 'abc123',
    branchExisted: false,
    bootstrap: false,
    createdAt: '2026-06-20T00:00:00.000Z',
  });

  assert.match(body, /Agent workspace claim:/);
  assert.match(body, /Issue: CRE-726/);
  assert.match(body, /Branch: `codex\/CRE-726-agent-worktree`/);
  assert.match(body, /Worktree: `\/tmp\/cre-726-agent-worktree`/);
  assert.match(body, /Base SHA: `abc123`/);
  assert.match(body, /origin\/main/);
});

function fixture(t) {
  const dir = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'claim-existing-')));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const repo = path.join(dir, 'repo');
  const worktree = path.join(dir, 'T3 checkout');
  mkdirSync(path.join(repo, 'scripts/linear'), { recursive: true });
  const git = (args, cwd = repo) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git(['init', '-b', 'main']);
  git(['config', 'user.name', 'Fixture']);
  git(['config', 'user.email', 'fixture@example.test']);
  writeFileSync(path.join(repo, 'README.md'), 'fixture\n');
  git(['add', 'README.md']);
  git(['commit', '-m', 'initial']);
  const baseSha = git(['rev-parse', 'HEAD']);
  git(['update-ref', 'refs/remotes/origin/main', baseSha]);
  git(['worktree', 'add', '-b', 't3/existing', worktree]);
  writeFileSync(path.join(worktree, 'change.txt'), 'committed change\n');
  git(['add', 'change.txt'], worktree);
  git(['commit', '-m', 'worktree change'], worktree);
  writeFileSync(path.join(worktree, 'operator.txt'), 'preserve me\n');
  const script = path.join(repo, 'scripts/agent-claim-worktree.mjs');
  copyFileSync(fileURLToPath(new URL('../agent-claim-worktree.mjs', import.meta.url)), script);
  const linearLog = path.join(repo, 'linear-calls.jsonl');
  writeFileSync(path.join(repo, 'scripts/linear/remote.mjs'), `import { appendFileSync } from 'node:fs';\nappendFileSync(${JSON.stringify(linearLog)}, JSON.stringify(process.argv.slice(2)) + '\\n');\n`);
  const invoke = (...args) => spawnSync(process.execPath, [script, '--register-existing', '--issue', 'CRE-2364', '--worktree', worktree, ...args], { cwd: dir, encoding: 'utf8' });
  return { dir, repo, worktree, baseSha, git, invoke, linearLog, script };
}

test('CLI registers a T3-created worktree without changing git or operator files', (t) => {
  const f = fixture(t);
  const before = f.git(['worktree', 'list', '--porcelain']);
  const result = f.invoke('--json');
  assert.equal(result.status, 0, result.stderr);
  const receipt = JSON.parse(result.stdout);
  assert.equal(receipt.branch, 't3/existing');
  assert.equal(receipt.worktree, f.worktree);
  assert.equal(receipt.baseSha, f.baseSha);
  assert.equal(receipt.headSha, f.git(['rev-parse', 'HEAD'], f.worktree));
  assert.equal(receipt.fetch, false);
  assert.equal(f.git(['worktree', 'list', '--porcelain']), before);
  assert.equal(readFileSync(path.join(f.worktree, 'operator.txt'), 'utf8'), 'preserve me\n');
  const calls = readFileSync(f.linearLog, 'utf8').trim().split('\n').map(JSON.parse);
  assert.deepEqual(calls[0], ['claim', '--issue', 'CRE-2364']);
  assert.equal(calls[1][0], 'comment');
  assert.match(calls[1].at(-1), /registered existing/);
  assert.equal(receipt.plan.some((item) => item.command === 'git' && ['fetch', 'checkout', 'reset', 'add'].includes(item.args[0])), false);
});

test('registration dry-run validates the real checkout and performs no Linear writes', (t) => {
  const f = fixture(t);
  const result = f.invoke('--dry-run');
  assert.equal(result.status, 0, result.stderr);
  const receipt = JSON.parse(result.stdout);
  assert.equal(receipt.baseSha, f.baseSha);
  assert.equal(receipt.branch, 't3/existing');
  assert.equal(existsSync(f.linearLog), false);
  assert.equal(receipt.plan.filter((item) => item.command === process.execPath).length, 2);
});

test('registration records the common ancestor when the base ref has advanced', (t) => {
  const f = fixture(t);
  writeFileSync(path.join(f.repo, 'upstream.txt'), 'upstream\n');
  f.git(['add', 'upstream.txt']);
  f.git(['commit', '-m', 'upstream change']);
  const baseTipSha = f.git(['rev-parse', 'HEAD']);
  f.git(['update-ref', 'refs/remotes/origin/main', baseTipSha]);
  const result = f.invoke('--dry-run');
  assert.equal(result.status, 0, result.stderr);
  const receipt = JSON.parse(result.stdout);
  assert.equal(receipt.baseSha, f.baseSha);
  assert.equal(receipt.baseTipSha, baseTipSha);
});

test('invalid registrations fail before claiming Linear, including in dry-run', async (t) => {
  for (const dryRun of [false, true]) {
    for (const kind of ['branch mismatch', 'detached', 'primary', 'subdirectory', 'foreign', 'copied pointer', 'missing base']) {
      await t.test(`${kind}${dryRun ? ' dry-run' : ''}`, (t) => {
        const f = fixture(t);
        let args = dryRun ? ['--dry-run'] : [];
        let pattern;
        if (kind === 'branch mismatch') {
          args.push('--branch', 't3/other');
          pattern = /branch mismatch/;
        } else if (kind === 'detached') {
          f.git(['checkout', '--detach'], f.worktree);
          pattern = /HEAD is detached/;
        } else if (kind === 'primary') {
          args.push('--worktree', f.repo);
          pattern = /not the primary checkout/;
        } else if (kind === 'subdirectory') {
          const subdir = path.join(f.worktree, 'subdir');
          mkdirSync(subdir);
          args.push('--worktree', subdir);
          pattern = /checkout root/;
        } else if (kind === 'foreign') {
          const other = path.join(f.dir, 'other');
          mkdirSync(other);
          f.git(['init'], other);
          args.push('--worktree', other);
          pattern = /another repository/;
        } else if (kind === 'copied pointer') {
          const copy = path.join(f.dir, 'copy');
          mkdirSync(copy);
          copyFileSync(path.join(f.worktree, '.git'), path.join(copy, '.git'));
          args.push('--worktree', copy);
          pattern = /not the registered linked worktree/;
        } else {
          args.push('--base', 'origin/missing');
          pattern = /origin\/missing/;
        }
        const result = f.invoke(...args);
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, pattern);
        assert.equal(existsSync(f.linearLog), false);
      });
    }
  }
});

test('register-existing requires an explicit path and refuses create-only options', () => {
  assert.throws(() => buildDefaults({ issue: 'CRE-1', registerExisting: true }), /requires --worktree/);
  for (const option of ['bootstrap', 'reuseBranch']) {
    assert.throws(() => buildDefaults({ issue: 'CRE-1', registerExisting: true, worktree: '/tmp/example', [option]: true }), /cannot be combined/);
  }
});

test('legacy CLI creation still creates a new linked worktree and records it', (t) => {
  const f = fixture(t);
  const target = path.join(f.dir, 'new-checkout');
  const result = spawnSync(process.execPath, [f.script, '--issue', 'CRE-2364', '--worktree', target, '--no-fetch', '--json'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(f.git(['branch', '--show-current'], target), 'codex/CRE-2364-agent-worktree');
  assert.equal(JSON.parse(result.stdout).baseSha, f.baseSha);
  assert.equal(readFileSync(f.linearLog, 'utf8').trim().split('\n').length, 2);
});
