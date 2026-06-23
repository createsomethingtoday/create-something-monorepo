import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildLaunchCommand,
  buildStarterPrompt,
  classifyStatus,
  decideSoloPosture,
  parseArgs,
  parseDivergence
} from '../agent-solo-loop.mjs';

test('parseArgs supports solo-loop flags', () => {
  const options = parseArgs([
    'node',
    'scripts/agent-solo-loop.mjs',
    '--',
    '--json',
    '--check',
    '--strict'
  ]);

  assert.equal(options.json, true);
  assert.equal(options.check, true);
  assert.equal(options.strict, true);
});

test('parseArgs supports starter prompt options', () => {
  const options = parseArgs([
    'node',
    'scripts/agent-solo-loop.mjs',
    '--provider',
    'hermes',
    '--task',
    'Fix the failing smoke'
  ]);

  assert.equal(options.provider, 'hermes');
  assert.equal(options.task, 'Fix the failing smoke');
  assert.equal(options.starter, true);
});

test('parseArgs rejects unknown providers', () => {
  assert.throws(
    () => parseArgs(['node', 'scripts/agent-solo-loop.mjs', '--provider', 'unknown']),
    /Unknown provider: unknown/
  );
});

test('classifyStatus counts staged, unstaged, and untracked changes', () => {
  const status = classifyStatus(
    [' M docs/a.md', 'M  scripts/b.mjs', 'MM package.json', '?? notes.md'].join('\n')
  );

  assert.equal(status.clean, false);
  assert.equal(status.total, 4);
  assert.equal(status.staged, 2);
  assert.equal(status.unstaged, 2);
  assert.equal(status.untracked, 1);
});

test('parseDivergence reads ahead and behind counts', () => {
  assert.deepEqual(parseDivergence('## main...origin/main [ahead 2, behind 5]'), {
    ahead: 2,
    behind: 5
  });
  assert.deepEqual(parseDivergence('## main...origin/main'), { ahead: 0, behind: 0 });
});

test('decideSoloPosture allows dirty current-checkout work unless strict', () => {
  const status = classifyStatus(' M docs/a.md\n');
  const divergence = { ahead: 0, behind: 1 };

  const relaxed = decideSoloPosture({ status, divergence, strict: false });
  assert.equal(relaxed.ok, true);
  assert.equal(relaxed.warnings.length, 2);

  const strict = decideSoloPosture({ status, divergence, strict: true });
  assert.equal(strict.ok, false);
});

test('buildStarterPrompt encodes solo-loop production boundaries', () => {
  const prompt = buildStarterPrompt({
    task: 'Repair the agency SEO smoke',
    provider: 'hermes',
    branch: 'codex/CRE-778-agent-worktree',
    warnings: ['Checkout is behind upstream by 1 commit(s).']
  });

  assert.match(prompt, /Repair the agency SEO smoke/);
  assert.match(prompt, /Use Hermes as the implementation worker/);
  assert.match(prompt, /Do not mutate production/);
  assert.match(prompt, /branch, PR, merge, deploy, and rollback evidence/);
  assert.match(prompt, /Checkout is behind upstream by 1 commit/);
});

test('buildLaunchCommand returns inspectable provider launch shapes', () => {
  assert.equal(
    buildLaunchCommand({ provider: 'hermes', hermesCommand: 'hermes' }),
    "hermes --cli -z '<paste the starter prompt here>'"
  );
  assert.equal(
    buildLaunchCommand({ provider: 'codex' }),
    'codex # paste the starter prompt into the session'
  );
});
