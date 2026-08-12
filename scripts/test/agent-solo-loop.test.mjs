import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

import {
  buildLaunchCommand,
  buildStarterPrompt,
  classifyStatus,
  decideHomeBasePosture,
  decideSoloPosture,
  parseArgs,
  parseDivergence
} from '../agent-solo-loop.mjs';

const scriptPath = fileURLToPath(new URL('../agent-solo-loop.mjs', import.meta.url));
const repoRoot = fileURLToPath(new URL('../../', import.meta.url));

function runCommand(command, args, cwd) {
  return spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_AUTHOR_EMAIL: 'test@example.com',
      GIT_AUTHOR_NAME: 'Test Operator',
      GIT_COMMITTER_EMAIL: 'test@example.com',
      GIT_COMMITTER_NAME: 'Test Operator'
    }
  });
}

function mustRun(command, args, cwd) {
  const result = runCommand(command, args, cwd);
  assert.equal(result.status, 0, `${command} ${args.join(' ')}\n${result.stdout}${result.stderr}`);
  return result;
}

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

test('parseArgs supports an explicit home-base verification mode', () => {
  const options = parseArgs([
    'node',
    'scripts/agent-solo-loop.mjs',
    '--home-base',
    '--json'
  ]);

  assert.equal(options.homeBase, true);
  assert.equal(options.json, true);
});

test('parseArgs supports starter prompt options', () => {
  const options = parseArgs([
    'node',
    'scripts/agent-solo-loop.mjs',
    '--task',
    'Fix the failing smoke'
  ]);

  assert.equal(options.task, 'Fix the failing smoke');
  assert.equal(options.starter, true);
});

test('parseArgs rejects provider selection', () => {
  assert.throws(
    () => parseArgs(['node', 'scripts/agent-solo-loop.mjs', '--provider', 'unknown']),
    /Unknown argument: --provider/
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

test('decideHomeBasePosture requires clean exact main tracking origin/main', () => {
  const clean = classifyStatus('');
  const exact = decideHomeBasePosture({
    status: clean,
    divergence: { ahead: 0, behind: 0 },
    branch: 'main',
    upstream: 'origin/main',
    head: 'abc123',
    originMain: 'abc123'
  });

  assert.equal(exact.ok, true);
  assert.deepEqual(exact.reasons, []);

  const unsafeCases = [
    {
      name: 'dirty',
      input: { status: classifyStatus(' M docs/a.md\n') },
      reason: /changed file/
    },
    { name: 'non-main', input: { branch: 'codex/CRE-1272' }, reason: /branch main/ },
    { name: 'wrong upstream', input: { upstream: 'origin/dev' }, reason: /origin\/main/ },
    {
      name: 'diverged',
      input: { divergence: { ahead: 1, behind: 2 } },
      reason: /ahead 1.*behind 2/
    },
    { name: 'sha mismatch', input: { head: 'abc123', originMain: 'def456' }, reason: /does not equal/ }
  ];

  for (const unsafeCase of unsafeCases) {
    const posture = decideHomeBasePosture({
      status: clean,
      divergence: { ahead: 0, behind: 0 },
      branch: 'main',
      upstream: 'origin/main',
      head: 'abc123',
      originMain: 'abc123',
      ...unsafeCase.input
    });
    assert.equal(posture.ok, false, unsafeCase.name);
    assert.match(posture.reasons.join(' '), unsafeCase.reason, unsafeCase.name);
  }
});

test('home-base CLI passes exact main and fails dirty or non-main checkouts', (t) => {
  const fixture = mkdtempSync(join(tmpdir(), 'agent-home-base-'));
  const remote = join(fixture, 'remote.git');
  const repo = join(fixture, 'repo');
  t.after(() => rmSync(fixture, { recursive: true, force: true }));

  mkdirSync(remote);
  mustRun('git', ['init', '--bare'], remote);
  mkdirSync(repo);
  mustRun('git', ['init', '-b', 'main'], repo);
  mustRun('git', ['config', 'core.hooksPath', '/dev/null'], repo);

  for (const relativePath of [
    'AGENTS.md',
    'docs/guides/SOLO_OPERATOR_AGENT_LOOP.md',
    'docs/guides/CODING_AGENT_HARNESS_PATTERN.md',
    'docs/guides/GIT_LIGHT_AGENT_DELIVERY_WORKFLOW.md',
    'package.json'
  ]) {
    const absolutePath = join(repo, relativePath);
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, relativePath === 'package.json' ? '{}\n' : `${relativePath}\n`);
  }

  mustRun('git', ['add', '.'], repo);
  mustRun('git', ['commit', '-m', 'fixture baseline'], repo);
  mustRun('git', ['remote', 'add', 'origin', remote], repo);
  mustRun('git', ['push', '-u', 'origin', 'main'], repo);

  const exact = runCommand('node', [scriptPath, '--home-base', '--json'], repo);
  assert.equal(exact.status, 0, exact.stderr || exact.stdout);
  assert.equal(JSON.parse(exact.stdout).mode, 'main-home-base');

  writeFileSync(join(repo, 'AGENTS.md'), 'dirty\n');
  const dirty = runCommand('node', [scriptPath, '--home-base', '--json'], repo);
  assert.equal(dirty.status, 1, dirty.stderr || dirty.stdout);
  assert.match(JSON.parse(dirty.stdout).posture.reasons.join(' '), /changed file/);

  mustRun('git', ['restore', 'AGENTS.md'], repo);
  mustRun('git', ['switch', '-c', 'feature/test'], repo);
  const nonMain = runCommand('node', [scriptPath, '--home-base', '--json'], repo);
  assert.equal(nonMain.status, 1, nonMain.stderr || nonMain.stdout);
  assert.match(JSON.parse(nonMain.stdout).posture.reasons.join(' '), /branch main/);
});

test('repo contract exposes home-base verification and worktree disposition closeout', () => {
  const packageJson = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
  const soloLoop = readFileSync(join(repoRoot, 'scripts/agent-solo-loop.mjs'), 'utf8');
  const agents = readFileSync(join(repoRoot, 'AGENTS.md'), 'utf8');
  const soloGuide = readFileSync(
    join(repoRoot, 'docs/guides/SOLO_OPERATOR_AGENT_LOOP.md'),
    'utf8'
  );
  const harnessGuide = readFileSync(
    join(repoRoot, 'docs/guides/CODING_AGENT_HARNESS_PATTERN.md'),
    'utf8'
  );

  assert.equal(
    packageJson.scripts['agent:home-base'],
    'node scripts/agent-solo-loop.mjs --home-base'
  );
  assert.equal(packageJson.scripts['ground:review'], 'node scripts/ground-review.mjs');
  assert.match(soloLoop, /Run advisory Ground changed-code review/);
  assert.match(soloLoop, /scripts\/ground-review\.mjs/);
  assert.match(agents, /pnpm agent:home-base/);
  assert.match(soloGuide, /clean `main`.*exact `origin\/main`/s);
  assert.match(harnessGuide, /Worktree disposition:/);
  assert.match(harnessGuide, /removed.*preserved.*retained/s);
});

test('buildStarterPrompt encodes solo-loop production boundaries', () => {
  const prompt = buildStarterPrompt({
    task: 'Repair the agency SEO smoke',
    branch: 'codex/CRE-778-agent-worktree',
    warnings: ['Checkout is behind upstream by 1 commit(s).']
  });

  assert.match(prompt, /Repair the agency SEO smoke/);
  assert.match(prompt, /Use Codex as the implementation worker/);
  assert.match(prompt, /Do not mutate production/);
  assert.match(prompt, /branch, PR, merge, deploy, and rollback evidence/);
  assert.match(prompt, /Checkout is behind upstream by 1 commit/);
});

test('buildLaunchCommand returns inspectable provider launch shapes', () => {
  assert.equal(buildLaunchCommand(), 'codex # paste the starter prompt into the session');
});
