import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const gate = fileURLToPath(new URL('../mcp-quality-gate.mjs', import.meta.url));
const source = readFileSync(gate, 'utf8');
const active = [...source.match(/active: \[([\s\S]*?)\]/)[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
const prerequisites = ['mcp-core', 'composio-bridge', 'observability', 'playbook-mcp'];

function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'mcp-gate-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const rel of active) {
    mkdirSync(path.join(root, rel), { recursive: true });
    writeFileSync(path.join(root, rel, 'package.json'), JSON.stringify({
      name: `fixture:${rel}`, scripts: { typecheck: 'fixture', lint: 'fixture', 'test:smoke': 'fixture' }
    }));
  }
  const bin = path.join(root, 'bin');
  mkdirSync(bin);
  writeFileSync(path.join(bin, 'pnpm'), `#!${process.execPath}
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
if (args[0] === '-r') {
  console.log(JSON.stringify(${JSON.stringify(active)}.map(rel => ({ path: path.join(process.env.MCP_TEST_ROOT, rel) }))));
} else {
  const call = args[0] === '--filter' ? ['preflight', args[1], args.at(-1)] : [path.relative(process.env.MCP_TEST_ROOT, process.cwd()), args.at(-1)];
  fs.appendFileSync(process.env.MCP_TEST_LOG, JSON.stringify(call) + '\\n');
  if (process.env.MCP_TEST_FAIL === call.at(-1)) process.exit(7);
}
`, { mode: 0o755 });
  const log = path.join(root, 'calls.jsonl');
  function run(stage, failure = '') {
    writeFileSync(log, '');
    const result = spawnSync(process.execPath, [gate, stage], {
      cwd: root, encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, MCP_GATE_SCOPE: 'active', MCP_TEST_ROOT: root, MCP_TEST_LOG: log, MCP_TEST_FAIL: failure }
    });
    return { ...result, calls: readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line)) };
  }
  return { run };
}

test('all-stage gate preserves every package/stage assertion with one prerequisite build', (t) => {
  const { run } = fixture(t);
  const before = ['typecheck', 'lint', 'test'].map((stage) => run(stage));
  before.forEach((result) => assert.equal(result.status, 0, result.stderr));
  const after = run('all');
  assert.equal(after.status, 0, after.stderr);
  const assertions = (calls) => calls.filter((call) => call[0] !== 'preflight');
  assert.deepEqual(assertions(after.calls), before.flatMap((result) => assertions(result.calls)));
  assert.equal(assertions(after.calls).length, active.length * 3);
  const builds = after.calls.filter((call) => call[0] === 'preflight');
  assert.deepEqual(builds.map((call) => call[1]), prerequisites.map((name) => `@create-something/${name}`));
  assert.equal(before.flatMap((result) => result.calls).filter((call) => call[0] === 'preflight').length, 12);
});

test('each stage failure remains nonzero and does not hide the other assertions', (t) => {
  const { run } = fixture(t);
  for (const stage of ['typecheck', 'lint', 'test:smoke']) {
    const result = run('all', stage);
    assert.equal(result.status, 1, result.stdout);
    assert.equal(result.calls.filter((call) => call[0] !== 'preflight').length, active.length * 3);
  }
});

test('failed prerequisites stop before package assertions', (t) => {
  const result = fixture(t).run('all', 'build');
  assert.equal(result.status, 7);
  assert.equal(result.calls.length, 1);
  assert.equal(result.calls[0][0], 'preflight');
});
