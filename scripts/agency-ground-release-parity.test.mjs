import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { verifyGroundReleaseParity } from './agency-ground-release-parity.mjs';

function fixture(t) {
  const cwd = mkdtempSync(join(tmpdir(), 'ground-parity-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
  git('init', '-q'); git('config', 'user.name', 'Parity Test'); git('config', 'user.email', 'test@example.com');
  const write = (file, text) => { const target = join(cwd, file); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, text); };
  const commit = () => { git('add', '.'); git('commit', '-qm', 'fixture'); return git('rev-parse', 'HEAD'); };
  write('packages/ground/npm/package.json', '{"files":["bin","install.js","README.md"]}');
  const release = commit();
  return { cwd, git, write, commit, release };
}

test('exact release and repository-only pilot/doc edits pass', t => {
  const f = fixture(t);
  assert.deepEqual(verifyGroundReleaseParity(f.release, f.release, f.cwd), []);
  f.write('packages/ground/README.md', 'Repository documentation');
  f.write('packages/ground/npm/pilot/workspace-root.ts', 'test helper');
  assert.equal(verifyGroundReleaseParity(f.release, f.commit(), f.cwd).length, 2);
});

for (const file of ['src/lib.rs', 'Cargo.toml', 'Cargo.lock', 'build.rs', 'npm/bin/ground.js', 'npm/install.js', 'npm/README.md', 'npm/package.json', 'tests/ga_calibration.rs', 'unknown-source']) {
  test(`unreleased ${file} blocks promotion`, t => {
    const f = fixture(t); f.write(`packages/ground/${file}`, 'changed');
    assert.throws(() => verifyGroundReleaseParity(f.release, f.commit(), f.cwd), /Unreleased Ground source/);
  });
}

test('moving shipped code into pilot cannot hide its deletion', t => {
  const f = fixture(t); f.write('packages/ground/src/lib.rs', 'source'); const release = f.commit();
  mkdirSync(join(f.cwd, 'packages/ground/npm/pilot'), { recursive: true });
  f.git('mv', 'packages/ground/src/lib.rs', 'packages/ground/npm/pilot/lib.rs');
  assert.throws(() => verifyGroundReleaseParity(release, f.commit(), f.cwd), /Unreleased Ground source/);
});

test('source must descend from the release', t => {
  const f = fixture(t); f.write('other', 'next'); const newer = f.commit();
  assert.throws(() => verifyGroundReleaseParity(newer, f.release, f.cwd));
});
