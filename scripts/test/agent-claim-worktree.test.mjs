import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

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
