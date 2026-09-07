#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { writeReceipt } from './ground-adoption-output.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opts = {};
for (let i = 0; i < argv.length; i++) {
  const flag = argv[i];
  assert(['--native-dir', '--package', '--output', '--baseline'].includes(flag));
  if (flag === '--baseline') {
    opts.baseline = true;
  } else {
    assert(argv[i + 1] && !argv[i + 1].startsWith('--'));
    opts[flag.slice(2)] = argv[++i];
  }
}
const manifest = JSON.parse(readFileSync(join(root, 'packages/ground/npm/package.json')));
const spec = opts.package || `${manifest.name}@${manifest.version}`;
const bytes = readFileSync(join(root, 'scripts/test/fixtures/ground-incremental.json'));
const fixture = JSON.parse(bytes);
const frozen = JSON.parse(
  readFileSync(join(root, 'docs/internal/ground-incremental-baseline.v1.json'))
);
assert.equal(
  createHash('sha256').update(bytes).digest('hex'),
  frozen.fixture_sha256,
  'Frozen incremental fixture changed'
);
assert.deepEqual(
  fixture.steps.map((s) => s.id),
  frozen.cases.map((s) => s.id)
);
const temp = mkdtempSync(join(tmpdir(), 'ground-incremental-'));
const directory = join(temp, 'repo');
mkdirSync(directory);
const source = (p, text) => {
  mkdirSync(dirname(join(directory, p)), { recursive: true });
  writeFileSync(join(directory, p), text);
};
for (const [p, text] of Object.entries(fixture.initial)) source(p, text);
function command(binary, args) {
  return opts['native-dir']
    ? [join(resolve(opts['native-dir']), binary), args]
    : ['npm', ['exec', '--yes', `--package=${spec}`, '--', binary, ...args]];
}
// Sample resident bytes after the response; this is not peak RSS or cache payload.
function residentBytes(pid) {
  if (process.platform === 'win32') return null;
  const p = spawnSync('ps', ['-ax', '-o', 'pid=,ppid=,rss=,comm='], { encoding: 'utf8' });
  if (p.status !== 0) return null;
  const rows = p.stdout
    .trim()
    .split('\n')
    .map((line) => line.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+(.+)$/))
    .filter(Boolean);
  const descendants = new Set([pid]);
  for (let i = 0; i < rows.length; i++)
    for (const r of rows) if (descendants.has(Number(r[2]))) descendants.add(Number(r[1]));
  const native = rows.find((r) => descendants.has(Number(r[1])) && r[4].endsWith('ground-mcp'));
  return native ? Number(native[3]) * 1024 : null;
}
const sessions = new Set();
let next = 0;
async function session(disabled = false) {
  const [bin, args] = command('ground-mcp', [
    '--db',
    join(temp, `db-${next++}.sqlite`),
    ...(!opts.baseline && disabled ? ['--no-cache'] : [])
  ]);
  const child = spawn(bin, args, { cwd: directory, stdio: ['pipe', 'pipe', 'pipe'] });
  sessions.add(child);
  let buffer = '',
    id = 0;
  const waiting = new Map();
  let stderr = '';
  child.stderr.on('data', (b) => {
    stderr = (stderr + b.toString()).slice(-8000);
  });
  const fail = (e) => {
    for (const q of waiting.values()) {
      clearTimeout(q.timer);
      q.reject(e);
    }
    waiting.clear();
  };
  child.on('error', fail);
  child.on('exit', (code) => {
    sessions.delete(child);
    fail(Error(`MCP exited ${code}: ${stderr}`));
  });
  child.stdout.on('data', (b) => {
    buffer += b;
    for (;;) {
      const newline = buffer.indexOf('\n');
      if (newline < 0) break;
      const line = buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);
      try {
        const m = JSON.parse(line);
        const q = waiting.get(m.id);
        if (q) {
          waiting.delete(m.id);
          clearTimeout(q.timer);
          q.resolve(m);
        }
      } catch (e) {
        fail(e);
      }
    }
  });
  const rpc = (method, params) =>
    new Promise((resolve, reject) => {
      const key = ++id;
      const timer = setTimeout(() => {
        waiting.delete(key);
        reject(Error(`MCP timeout: ${stderr}`));
        child.kill();
      }, 120000);
      waiting.set(key, { resolve, reject, timer });
      child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: key, method, params }) + '\n');
    });
  const initialized = await rpc('initialize', {});
  return {
    version: initialized.result.serverInfo.version,
    async query(module, scope) {
      const t = performance.now();
      const m = await rpc('tools/call', {
        name: 'ground_find_dead_exports',
        arguments: { module_path: module, search_scope: scope }
      });
      assert(m.result, JSON.stringify(m));
      return {
        ms: performance.now() - t,
        error: !!m.result.isError,
        data: m.result.isError
          ? null
          : JSON.parse(m.result.content.find((c) => c.type === 'text').text),
        rss_bytes: residentBytes(child.pid),
        cache: m.result._meta?.ground_cache
      };
    },
    close() {
      child.stdin.end();
    }
  };
}
function truth(r) {
  return r.error
    ? { error: true }
    : {
        error: false,
        dead: r.data.dead_exports.map((e) => e.name).sort(),
        total: r.data.total_exports
      };
}
const receipt = {
  schema_version: 'ground-incremental-receipt.v1',
  execution: opts['native-dir'] ? 'local-native' : 'published-npm',
  package: opts['native-dir'] ? null : spec,
  baseline: !!opts.baseline,
  fixture_sha256: createHash('sha256').update(bytes).digest('hex'),
  cases: [],
  real_queries: [],
  ready: false
};
try {
  const [bin, args] = command('ground', ['build-info', '--json']);
  const p = spawnSync(bin, args, { cwd: directory, encoding: 'utf8', timeout: 120000 });
  assert.equal(p.status, 0, p.stderr);
  receipt.build = JSON.parse(p.stdout);
  if (!opts['native-dir']) {
    const meta = spawnSync(
      'npm',
      ['view', spec, 'version', 'gitHead', 'dist.integrity', '--json'],
      { encoding: 'utf8', timeout: 60000 }
    );
    assert.equal(meta.status, 0, meta.stderr);
    receipt.published = JSON.parse(meta.stdout);
    assert.equal(receipt.published.version, receipt.build.version);
    assert.equal(receipt.published.gitHead, receipt.build.source_sha);
    assert.match(receipt.published['dist.integrity'], /^sha512-/);
  }
  if (!opts.baseline) {
    const results = ['--cache', '--no-cache'].map((flag) => {
      const [bin, args] = command('ground', [
        flag,
        'find',
        'dead-exports',
        join(directory, fixture.module),
        '--scope',
        join(directory, fixture.scope)
      ]);
      const result = spawnSync(bin, args, { encoding: 'utf8', cwd: directory, timeout: 120000 });
      assert.equal(result.status, 1, result.stderr);
      assert(result.stdout.includes("'other'"), 'CLI must detect known dead export');
      return result.stdout;
    });
    assert.equal(results[0], results[1], 'CLI cached/fresh parity');
    receipt.cli_parity = true;
  }

  const warm = await session();
  assert.equal(warm.version, receipt.build.version);
  let previous;
  for (const step of fixture.steps) {
    for (const p of step.delete || []) rmSync(join(directory, p));
    for (const [p, text] of Object.entries(step.write || {})) source(p, text);
    const module = join(directory, fixture.module),
      scope = join(directory, fixture.scope);
    const reused = await warm.query(module, scope);
    const fresh = await session(true);
    const oracle = await fresh.query(module, scope);
    fresh.close();
    assert.deepEqual(truth(reused), truth(oracle), `${step.id}: fresh parity`);
    assert.equal(reused.error, !!step.error, `${step.id}: error truth`);
    if (!step.error) assert.deepEqual(truth(reused).dead, step.dead, step.id);
    if (!opts.baseline) {
      assert.equal(reused.cache.enabled, true);
      assert.equal(oracle.cache.enabled, false);
      assert.equal(oracle.cache.entries, 0);
      assert(reused.cache.payload_bytes <= reused.cache.max_payload_bytes);
      assert(reused.cache.entries <= reused.cache.max_entries);
      if (step.id === 'warm' || step.id === 'warm-after-invalidation')
        assert(reused.cache.graph_hits > previous.graph_hits, 'Unchanged graph should be reused');
      previous = reused.cache;
    }
    receipt.cases.push({
      id: step.id,
      passed: true,
      warm_ms: reused.ms,
      fresh_ms: oracle.ms,
      cache: reused.cache
    });
  }
  // Separate root with identical names must not inherit another scope's graph.
  const isolated = join(temp, 'worktree');
  mkdirSync(isolated);
  writeFileSync(join(isolated, 'lib.ts'), 'export const first = 1;');
  let isolatedResult = await warm.query(join(isolated, 'lib.ts'), isolated);
  assert.deepEqual(truth(isolatedResult).dead, ['first']);
  if (!opts.baseline)
    assert.equal(
      isolatedResult.cache.graph_hits,
      previous.graph_hits,
      'Separate root must build its own graph'
    );
  receipt.cases.push({ id: 'worktree-isolation', passed: true, cache: isolatedResult.cache });
  writeFileSync(
    join(isolated, 'package.json'),
    JSON.stringify({ name: '@test/api', exports: './lib.ts' })
  );
  writeFileSync(join(isolated, 'else.ts'), 'export const first = 2;');
  writeFileSync(join(isolated, 'use.ts'), "import { first } from '@test/api';");
  assert.deepEqual(truth(await warm.query(join(isolated, 'lib.ts'), isolated)).dead, []);
  writeFileSync(
    join(isolated, 'package.json'),
    JSON.stringify({ name: '@test/api', exports: './else.ts' })
  );
  assert.deepEqual(truth(await warm.query(join(isolated, 'lib.ts'), isolated)).dead, ['first']);
  receipt.cases.push({ id: 'package-export-map-change', passed: true });
  warm.close();
  const restarted = await session();
  const restartResult = await restarted.query(join(isolated, 'lib.ts'), isolated);
  assert.deepEqual(truth(restartResult).dead, ['first']);
  if (!opts.baseline) assert.equal(restartResult.cache.graph_hits, 0);
  restarted.close();
  receipt.cases.push({ id: 'restart-with-empty-derived-state', passed: true });
  const live = await session();
  const scope = join(root, 'packages/mcp-core/src');
  for (let repeat = 0; repeat < 3; repeat++) {
    const fresh = await session(true);
    for (const name of ['server.ts', 'auth.ts']) {
      const module = join(scope, name);
      const a = await live.query(module, scope),
        b = await fresh.query(module, scope);
      assert.deepEqual(truth(a), truth(b));
      assert(!a.error);
      receipt.real_queries.push({
        repeat,
        module: `packages/mcp-core/src/${name}`,
        warm_ms: a.ms,
        fresh_ms: b.ms,
        warm_rss_bytes: a.rss_bytes,
        fresh_rss_bytes: b.rss_bytes,
        cache: a.cache
      });
    }
    fresh.close();
  }
  live.close();
  for (const [scopeRelative, moduleRelative] of [
    ['packages/agency/src', 'lib/community/monitors/types.ts'],
    ['packages/webflow-template-search/src', 'db.ts']
  ]) {
    const persistent = await session();
    const scope = join(root, scopeRelative);
    for (let repeat = 0; repeat < 3; repeat++) {
      const fresh = await session(true);
      const a = await persistent.query(join(scope, moduleRelative), scope),
        b = await fresh.query(join(scope, moduleRelative), scope);
      assert.deepEqual(truth(a), truth(b));
      assert(!a.error);
      receipt.real_queries.push({
        repeat,
        module: `${scopeRelative}/${moduleRelative}`,
        warm_ms: a.ms,
        fresh_ms: b.ms,
        warm_rss_bytes: a.rss_bytes,
        fresh_rss_bytes: b.rss_bytes,
        cache: a.cache
      });
      fresh.close();
    }
    persistent.close();
  }
  if (!opts.baseline) {
    const repeated = receipt.real_queries.filter((r) => r.repeat > 0);
    assert(
      repeated.every((r) => r.cache.graph_hits > 0),
      'Real repeated queries must reuse validated graphs'
    );
  }
  receipt.ready = true;
} catch (e) {
  receipt.failure = e.stack;
  process.exitCode = 1;
} finally {
  for (const c of sessions) c.kill();
  if (opts.output) writeReceipt(root, opts.output, JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify(receipt, null, 2));
  rmSync(temp, { recursive: true, force: true });
}
