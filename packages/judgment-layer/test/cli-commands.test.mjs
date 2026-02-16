import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const CLI = join(HERE, '..', 'dist', 'cli.js');

function runCli(args, cwd) {
  const res = spawnSync(process.execPath, [CLI, ...args], {
    cwd,
    encoding: 'utf-8',
  });
  return {
    code: res.status ?? -1,
    stdout: res.stdout ?? '',
    stderr: res.stderr ?? '',
  };
}

test('cs-judge init scaffolds .judgment policy packs', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'cs-judge-'));
  try {
    const r = runCli(['init', '--cwd', cwd], cwd);
    assert.equal(r.code, 0, r.stderr);

    assert.ok(existsSync(join(cwd, '.judgment', 'README.md')));
    assert.ok(existsSync(join(cwd, '.judgment', 'checks.toml')));
    assert.ok(existsSync(join(cwd, '.judgment', 'policies', 'safe.toml')));
    assert.ok(existsSync(join(cwd, '.judgment', 'policies', 'standard.toml')));
    assert.ok(existsSync(join(cwd, '.judgment', 'policies', 'power.toml')));
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test('cs-judge policies lists available policy ids', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'cs-judge-'));
  try {
    runCli(['init', '--cwd', cwd], cwd);
    const r = runCli(['policies', '--cwd', cwd], cwd);
    assert.equal(r.code, 0, r.stderr);

    // Project policies override builtins, so output should show "(project:...)" sources.
    assert.match(r.stdout, /\bsafe\b/);
    assert.match(r.stdout, /\bstandard\b/);
    assert.match(r.stdout, /\bpower\b/);
    assert.match(r.stdout, /\(project:/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test('cs-judge andon tails the Andon JSONL log', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'cs-judge-'));
  try {
    const dir = join(cwd, '.judgment');
    mkdirSync(dir, { recursive: true });
    const path = join(dir, 'andon.jsonl');
    writeFileSync(
      path,
      [
        JSON.stringify({
          id: 'a1',
          createdAt: '2026-01-01T00:00:00.000Z',
          policyId: 'safe',
          kind: 'commandExecution',
          threadId: 'thr',
          turnId: 'turn',
          itemId: 'item',
          summary: 'first',
          details: {},
        }),
        JSON.stringify({
          id: 'a2',
          createdAt: '2026-01-01T00:00:01.000Z',
          policyId: 'safe',
          kind: 'commandExecution',
          threadId: 'thr',
          turnId: 'turn',
          itemId: 'item',
          summary: 'second',
          details: {},
          decision: 'decline',
        }),
        '',
      ].join('\n'),
      'utf-8'
    );

    const r = runCli(['andon', '--cwd', cwd, '--tail', '1'], cwd);
    assert.equal(r.code, 0, r.stderr);
    assert.match(r.stdout, /second/);
    assert.doesNotMatch(r.stdout, /first/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
