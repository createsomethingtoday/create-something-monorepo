import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const script = path.resolve('.agents/skills/canon-work/scripts/workspace-check.mjs');
function fixture(t) {
  const directory = mkdtempSync(path.join(tmpdir(), "canon workspace ' "));
  t.after(() => rmSync(directory, {recursive: true, force: true}));
  const git = (...args) => {
    const result = spawnSync('git', ['-C', directory, ...args], {encoding: 'utf8'});
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  git('init');
  git('config', 'user.email', 'fixture@example.test');
  git('config', 'user.name', 'Fixture');
  writeFileSync(path.join(directory, 'package.json'), JSON.stringify({scripts:
    Object.fromEntries(Array.from({length: 100}, (_, i) => [`test:candidate-${i}`, 'exit 99']))}));
  git('add', '.');
  git('commit', '-m', 'fixture');
  const check = (...args) => spawnSync(process.execPath, [script, directory, ...args], {encoding: 'utf8'});
  return {directory, git, check};
}

test('human summary stays bounded while JSON retains every unexecuted candidate', t => {
  const {check, git} = fixture(t);
  const result = check();
  assert.equal(result.status, 0);
  assert.ok(result.stdout.length < 1000, result.stdout);
  assert.doesNotMatch(result.stdout, /candidate-99/);
  assert.match(result.stdout, /100 candidates/);
  assert.match(result.stdout, /Details: node .+ --json/);
  assert.match(result.stdout, /Checks: not run/);
  assert.match(result.stdout, /untracked entries/);
  assert.ok(result.stdout.includes(git('rev-parse', '--short', 'HEAD')));
  assert.ok(!result.stdout.includes(git('rev-parse', 'HEAD')));
  assert.equal(JSON.parse(check('--json').stdout).validationCandidates.length, 100);
});

test('next command follows clean, detached, diverged and dirty checkout conditions', t => {
  const {directory, git, check} = fixture(t);
  assert.match(check().stdout, /Next \(read-only\): git -C .* log -1 --oneline/);
  git('checkout', '--detach');
  assert.match(check().stdout, /Next \(read-only\): git -C .* log -1 --decorate --oneline/);
  git('checkout', '-b', 'working');
  git('branch', 'upstream-fixture');
  git('branch', '--set-upstream-to=upstream-fixture');
  writeFileSync(path.join(directory, 'local'), 'local');
  git('add', 'local');
  git('commit', '-m', 'local');
  git('checkout', 'upstream-fixture');
  writeFileSync(path.join(directory, 'upstream'), 'upstream');
  git('add', 'upstream');
  git('commit', '-m', 'upstream');
  git('checkout', 'working');
  assert.match(check().stdout, /diverged/);
  assert.match(check().stdout, /1 ahead, 1 behind/);
  assert.match(check().stdout, /log --oneline --left-right HEAD\.\.\.@\{upstream\}/);
  writeFileSync(path.join(directory, 'untracked'), 'preserve');
  const dirty = check();
  assert.match(dirty.stdout, /Tracked changes: 0; untracked entries: 1/);
  assert.match(dirty.stdout, /Next \(read-only\): git -C .* status --short/);
  // Execute the suggested command exactly as printed; no prose stripping.
  const command = dirty.stdout.split('\n').find(line => line.startsWith('Next (read-only): ')).slice('Next (read-only): '.length);
  const executed = spawnSync('/bin/sh', ['-c', command], {encoding: 'utf8'});
  assert.equal(executed.status, 0, executed.stderr);
  assert.match(executed.stdout, /\?\? untracked/);
});

test('missing target exits one with an actionable error and JSON compatibility', t => {
  const {directory} = fixture(t);
  const result = spawnSync(process.execPath, [script, path.join(directory, 'missing'), '--json'], {encoding: 'utf8'});
  assert.equal(result.status, 1);
  const data = JSON.parse(result.stdout);
  assert.match(data.finding, /ENOENT/);
  assert.deepEqual(data.validationCandidates, []);
  assert.match(data.nextStep, /existing Git directory/);
});

test('hidden untracked work remains visible in the inventory and suggested command', t => {
  const {directory, git, check} = fixture(t);
  git('config', 'status.showUntrackedFiles', 'no');
  writeFileSync(path.join(directory, 'operator-work.txt'), 'preserve this work');
  const config = readFileSync(path.join(directory, '.git/config'), 'utf8');
  const before = git('status', '--porcelain=v1', '--untracked-files=normal');
  assert.equal(git('status', '--porcelain=v1'), '');

  const result = check('--json');
  assert.equal(result.status, 0, result.stderr);
  const data = JSON.parse(result.stdout);
  assert.equal(data.finding, 'dirty checkout');
  assert.equal(data.untracked, 1);
  assert.deepEqual(data.changes, [{status: '??', path: 'operator-work.txt'}]);
  assert.match(check().stdout, /Tracked changes: 0; untracked entries: 1/);
  const next = spawnSync('/bin/sh', ['-c', data.nextCommand], {encoding: 'utf8'});
  assert.equal(next.status, 0, next.stderr);
  assert.match(next.stdout, /\?\? operator-work\.txt/);
  assert.equal(readFileSync(path.join(directory, '.git/config'), 'utf8'), config);
  assert.equal(readFileSync(path.join(directory, 'operator-work.txt'), 'utf8'), 'preserve this work');
  assert.equal(git('status', '--porcelain=v1', '--untracked-files=normal'), before);
});

for (const mode of ['no', 'all']) {
  test(`global untracked display mode ${mode} does not change normal entry inventory`, t => {
    const {directory, git} = fixture(t);
    const globalConfig = path.join(directory, '.git', 'fixture-global-config');
    const config = `[status]\nshowUntrackedFiles = ${mode}\n`;
    writeFileSync(globalConfig, config);
    const env = {...process.env, GIT_CONFIG_GLOBAL: globalConfig};
    mkdirSync(path.join(directory, 'operator-drafts'));
    writeFileSync(path.join(directory, 'operator-drafts', 'one.txt'), 'one');
    writeFileSync(path.join(directory, 'operator-drafts', 'two.txt'), 'two');
    writeFileSync(path.join(directory, 'operator-work.txt'), 'preserve');
    const before = git('status', '--porcelain=v1', '--untracked-files=normal');
    const run = (...args) => spawnSync(process.execPath, [script, ...args], {cwd: directory, env, encoding: 'utf8'});
    const result = run('--json');
    assert.equal(result.status, 0, result.stderr);
    const data = JSON.parse(result.stdout);
    assert.equal(data.finding, 'dirty checkout');
    assert.equal(data.untracked, 2);
    assert.deepEqual(data.changes, [
      {status: '??', path: 'operator-drafts/'},
      {status: '??', path: 'operator-work.txt'},
    ]);
    assert.match(run().stdout, /Tracked changes: 0; untracked entries: 2/);
    const next = spawnSync('/bin/sh', ['-c', data.nextCommand], {cwd: directory, env, encoding: 'utf8'});
    assert.equal(next.status, 0, next.stderr);
    assert.equal(next.stdout.trim(), before);
    assert.equal(readFileSync(globalConfig, 'utf8'), config);
    assert.equal(git('status', '--porcelain=v1', '--untracked-files=normal'), before);
  });
}

test('default checkout puts a directly usable next action before the long identity receipt', t => {
  const {directory} = fixture(t);
  writeFileSync(path.join(directory, 'untracked'), 'preserve');
  const run = (...args) => spawnSync(process.execPath, [script, ...args], {cwd: directory, encoding: 'utf8'});
  const data = JSON.parse(run('--json').stdout);
  const human = run().stdout;
  assert.equal(data.nextCommand, 'git status --short --untracked-files=normal');
  assert.ok(human.indexOf(data.nextCommand) < human.indexOf(data.root));
  assert.ok(data.detailsCommand.endsWith(' --json'));
  const detail = spawnSync('/bin/sh', ['-c', data.detailsCommand], {cwd: directory, encoding: 'utf8'});
  assert.equal(detail.status, 0, detail.stderr);
  assert.equal(JSON.parse(detail.stdout).root, data.root);
  assert.ok(human.includes(data.detailsCommand));
});
