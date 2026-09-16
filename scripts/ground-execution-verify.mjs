#!/usr/bin/env node
// Exercise the real CLI/MCP worker controls. This supplements the frozen trial.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { writeReceipt } from './ground-adoption-output.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i += 2) {
  assert(['--native-dir', '--package', '--output'].includes(args[i]), `Unknown flag ${args[i]}`);
  assert(args[i + 1] && !args[i + 1].startsWith('--'), `Missing value for ${args[i]}`);
  assert.equal(args.indexOf(args[i]), i, 'Duplicate flag');
}
const value = flag => args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined;
const native = value('--native-dir');
const manifest = JSON.parse(readFileSync(join(root, 'packages/ground/npm/package.json')));
const spec = value('--package') || `${manifest.name}@${manifest.version}`;
const temporary = mkdtempSync(join(tmpdir(), 'ground-execution-'));
const directory = join(temporary, 'source');
mkdirSync(directory);
const receipt = { schema_version: 'ground-execution-receipt.v1', execution: native ? 'local-native' : 'published-npm', package: native ? null : spec, ready: false, checks: [] };
const run = (binary, argv, input) => {
  const result = spawnSync(native ? join(resolve(native), binary) : 'npm', native ? argv : ['exec', '--yes', `--package=${spec}`, '--', binary, ...argv], { cwd: temporary, input, encoding: 'utf8', timeout: 60000, maxBuffer: 16 * 1024 * 1024 });
  assert(!result.error && result.signal === null, `Process did not finish: ${result.error || result.signal}`);
  return result;
};
const cli = (workers, timeout = 120000) => {
  const result = run('ground', ['--db', join(temporary, 'cli.db'), 'analyze', directory, '--checks', 'duplicates', '--workers', String(workers), '--timeout-ms', String(timeout)]);
  return JSON.parse(result.stdout);
};
const mcp = (workers, timeout = 120000) => {
  const input = [{ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }, { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'ground_analyze', arguments: { directory, checks: ['duplicates'], workers, timeout_ms: timeout } } }].map(JSON.stringify).join('\n') + '\n';
  const result = run('ground-mcp', ['--db', join(temporary, 'mcp.db')], input);
  assert.equal(result.status, 0, result.stderr);
  const messages = result.stdout.trim().split(/\r?\n/).map(JSON.parse);
  assert.equal(messages.find(m => m.id === 1).result.serverInfo.version, receipt.build.version);
  const response = messages.find(m => m.id === 2).result;
  return response.isError ? { error: response.content } : JSON.parse(response.content.find(c => c.type === 'text').text);
};
const stable = data => ({ coverage: data.coverage, findings: data.findings, verification_status: data.verification_status });
try {
  const build = run('ground', ['build-info', '--json']);
  assert.equal(build.status, 0, build.stderr);
  receipt.build = JSON.parse(build.stdout);
  assert.equal(receipt.build.version, manifest.version);
  if (!native) {
    const meta = spawnSync('npm', ['view', spec, 'version', 'gitHead', 'dist.integrity', '--json'], { encoding: 'utf8', timeout: 60000 });
    assert.equal(meta.status, 0, meta.stderr);
    receipt.published = JSON.parse(meta.stdout);
    assert.equal(receipt.published.version, receipt.build.version);
    assert.equal(receipt.published.gitHead, receipt.build.source_sha);
    assert.match(receipt.published['dist.integrity'], /^sha512-/);
  }
  const source = 'export function sharedCalculation(input: number) {\n const adjusted = input + 7;\n const doubled = adjusted * 2;\n const result = doubled - 3;\n return result;\n}\n';
  receipt.fixture_sha256 = createHash('sha256').update(source).digest('hex');
  for (let i = 0; i < 8; i++) writeFileSync(join(directory, `${i}.ts`), source);
  const serial = cli(1);
  assert.equal(serial.coverage.duplicates.scan_complete, true);
  assert(serial.findings.duplicates.length > 0, 'Positive control must detect duplicates');
  for (const result of [cli(4), mcp(1), mcp(4)]) assert.deepEqual(stable(result), stable(serial));
  receipt.checks.push({ name: 'serial-parallel-cli-mcp-parity', passed: true, findings: serial.findings.duplicates.length });
  for (let i = 0; i < 8; i++) writeFileSync(join(directory, `${i}.ts`), source.replace('sharedCalculation', `uniqueCalculation${i}`));
  for (const result of [cli(4), mcp(4)]) {
    assert.equal(result.coverage.duplicates.scan_complete, true);
    assert.equal(result.findings.duplicates.length, 0, 'Edits must invalidate old findings');
  }
  receipt.checks.push({ name: 'fresh-source-after-edit', passed: true });
  for (const result of [cli(4, 0), mcp(4, 0)]) assert.equal(result.coverage.duplicates.status, 'TIMEOUT');
  receipt.checks.push({ name: 'deadline-fails-closed', passed: true });
  assert(mcp(5).error);
  const invalid = run('ground', ['analyze', directory, '--workers', '5']);
  assert.notEqual(invalid.status, 0);
  receipt.checks.push({ name: 'invalid-worker-limit-rejected', passed: true });
  writeFileSync(join(directory, '0.ts'), 'export function broken( {');
  for (const result of [cli(4), mcp(4)]) {
    assert.equal(result.coverage.duplicates.scan_complete, false);
    assert(!['PASS', 'NOT_APPLICABLE'].includes(result.coverage.duplicates.status));
  }
  receipt.checks.push({ name: 'malformed-source-fails-closed', passed: true });
  receipt.ready = true;
} catch (error) {
  receipt.failure = error.stack;
  process.exitCode = 1;
} finally {
  if (value('--output')) writeReceipt(root, value('--output'), JSON.stringify(receipt, null, 2) + '\n');
  process.stdout.write(JSON.stringify(receipt, null, 2) + '\n');
  rmSync(temporary, { recursive: true, force: true });
}
