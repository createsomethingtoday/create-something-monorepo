#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { verifyAdjudicatedExports } from './ground-adoption-contract.mjs';
import { writeReceipt } from './ground-adoption-output.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixtureBytes = readFileSync(join(root, 'scripts/test/fixtures/ground-seeded-trial.json'));
const trial = JSON.parse(fixtureBytes);
const baseline = JSON.parse(readFileSync(join(root, 'docs/internal/ground-seeded-trial-baseline.v1.json')));
assert.equal(createHash('sha256').update(fixtureBytes).digest('hex'), baseline.fixture_sha256, 'Frozen trial changed; review a new baseline explicitly');
assert.deepEqual(trial.cases.map(seed => seed.id), baseline.cases.map(seed => seed.id));
const args = process.argv.slice(2);
for (let index = 0; index < args.length; index += 2) {
  assert(['--native-dir', '--package', '--output'].includes(args[index]), `Unknown argument: ${args[index]}`);
  assert(args[index + 1] && !args[index + 1].startsWith('--'), `${args[index]} requires a value`);
  assert.equal(args.indexOf(args[index]), index, `Duplicate argument: ${args[index]}`);
}
const value = flag => args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined;
const nativeDirectory = value('--native-dir');
const manifest = JSON.parse(readFileSync(join(root, 'packages/ground/npm/package.json')));
const packageSpec = value('--package') || `${manifest.name}@${manifest.version}`;
const temporary = mkdtempSync(join(tmpdir(), 'ground-seeded-'));
const results = [];
let build;

function run(binary, arguments_, cwd, input) {
  const command = nativeDirectory ? join(resolve(nativeDirectory), binary) : 'npm';
  const commandArgs = nativeDirectory ? arguments_ : ['exec', '--yes', `--package=${packageSpec}`, '--', binary, ...arguments_];
  const result = spawnSync(command, commandArgs, { cwd, input, encoding: 'utf8', timeout: 60000, maxBuffer: 16 * 1024 * 1024 });
  assert(!result.error && result.signal === null, `Process did not complete: ${result.error || result.signal}`);
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function mcp(name, arguments_, directory, db) {
  const input = [
    { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} },
    { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name, arguments: arguments_ } }
  ].map(JSON.stringify).join('\n') + '\n';
  const process = run('ground-mcp', ['--db', db], directory, input);
  assert.equal(process.status, 0, process.stderr);
  const messages = process.stdout.trim().split(/\r?\n/).map(JSON.parse);
  assert.equal(messages.find(item => item.id === 1)?.result?.serverInfo?.version, build.version, 'CLI/MCP version parity');
  const response = messages.find(item => item.id === 2);
  assert(response?.result, JSON.stringify(response));
  if (response.result.isError) return { error: response.result.content };
  return { data: JSON.parse(response.result.content.find(item => item.type === 'text').text) };
}

try {
  const version = run('ground', ['--version'], temporary);
  assert.equal(version.status, 0);
  const doctor = run('ground', ['--db', join(temporary, 'doctor.db'), 'doctor', temporary, '--json'], temporary);
  assert.equal(doctor.status, 0, doctor.stderr);
  const provenance = JSON.parse(doctor.stdout);
  assert.equal(provenance.verification_status, 'PASS');
  build = provenance.build;
  assert.equal(version.stdout.trim(), `ground ${build.version}`);
  assert.match(build.source_sha, /^[a-f0-9]{40}$/);
  let published = null;
  if (!nativeDirectory) {
    assert.equal(packageSpec, `${manifest.name}@${build.version}`, 'Use an exact published version');
    const registry = spawnSync('npm', ['view', packageSpec, 'gitHead', 'dist.integrity', '--json'], { encoding: 'utf8', timeout: 30000 });
    assert.equal(registry.status, 0, registry.stderr);
    published = JSON.parse(registry.stdout);
    assert.equal(build.source_sha, published.gitHead, 'Published package/native source mismatch');
    assert.match(published['dist.integrity'], /^sha512-/);
  }
  for (const seed of trial.cases) {
    const directory = join(temporary, seed.id);
    mkdirSync(directory);
    for (const [path, content] of Object.entries(seed.files)) {
      const destination = join(directory, path);
      mkdirSync(dirname(destination), { recursive: true });
      writeFileSync(destination, content);
    }
    const db = join(temporary, `${seed.id}.db`);
    const result = { id: seed.id, layer: ['compiler', 'api-contract'].includes(seed.mode) ? 'repository-companion' : 'native-cli-and-mcp' };
    try {
      if (seed.mode === 'exports') {
        const module = join(directory, seed.module);
        result.cli = run('ground', ['--db', db, 'find', 'dead-exports', module, '--scope', directory], directory);
        result.mcp = mcp('ground_find_dead_exports', { module_path: module, search_scope: directory }, directory, db);
        if (seed.expected_error) {
          assert.notEqual(result.cli.status, 0, 'Malformed source must not produce CLI success');
          assert(result.mcp.error, 'Malformed source must produce an MCP error, not findings from incomplete parsing');
        } else {
          assert(!result.mcp.error, JSON.stringify(result.mcp));
          const detected = result.mcp.data.dead_exports.map(item => item.name).sort();
          assert.deepEqual(detected, [...seed.expected_dead].sort());
          assert.equal(result.cli.status, detected.length ? 1 : 0);
          const cliNames = [...result.cli.stdout.matchAll(/^\s*\d+\. '([^']+)' \(line /gm)].map(match => match[1]).sort();
          assert.deepEqual(cliNames, detected, 'CLI/MCP candidate parity');
        }
      } else if (seed.mode === 'analyze') {
        result.cli = run('ground', ['--db', db, 'analyze', directory, '--checks', seed.checks.join(','), '--timeout-ms', '15000'], directory);
        result.mcp = mcp('ground_analyze', { directory, checks: seed.checks, timeout_ms: 15000 }, directory, db);
        if (seed.expected_incomplete && result.cli.status !== 0 && result.mcp.error) {
          for (const [path, content] of Object.entries(seed.files)) assert.equal(readFileSync(join(directory, path), 'utf8'), content, 'Ground altered trial source');
          result.passed = true;
          results.push(result);
          process.stderr.write(`PASS ${seed.id}\n`);
          continue;
        }
        assert.equal(result.cli.status, 0, result.cli.stderr);
        assert(!result.mcp.error, JSON.stringify(result.mcp));
        const cli = JSON.parse(result.cli.stdout);
        const remote = result.mcp.data;
        for (const check of seed.checks) {
          assert.deepEqual(cli.coverage[check], remote.coverage[check], 'CLI/MCP coverage parity');
          if (seed.expected_incomplete) {
            assert(!['PASS', 'NOT_APPLICABLE'].includes(cli.coverage[check].status), 'Malformed source must not appear clean or empty');
            assert.equal(cli.coverage[check].scan_complete, false, 'Malformed source must not claim complete coverage');
          }
          else assert.equal(cli.coverage[check].status, seed.expected_status);
        }
        if (seed.expected_function) {
          for (const data of [cli, remote]) assert(data.findings.duplicates.some(item => item.function === seed.expected_function && item.safe_to_auto_fix === false));
        }
        if (seed.expected_entry) {
          for (const data of [cli, remote]) assert(data.coverage.orphans.entry_point_evidence.some(item => item.relative_path === seed.expected_entry));
        }
      } else if (seed.mode === 'compiler') {
        const program = ts.createProgram([join(directory, 'src/index.ts')], { noEmit: true, module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext, skipLibCheck: true });
        result.diagnostic_codes = ts.getPreEmitDiagnostics(program).map(item => item.code);
        assert(result.diagnostic_codes.includes(seed.expected_code), 'Compiler must reject broken import');
      } else if (seed.mode === 'api-contract') {
        const module = 'packages/mcp-core/src/server.ts';
        const symbols = ['createScopedServer', 'jsonContent'];
        assert.throws(() => verifyAdjudicatedExports({
          modules: [{ module, total_exports: 2, dead_exports: symbols.map(name => ({ name })) }],
          adjudication: { inventory: [{ module, total_exports: 2 }], modules: [{ module, symbols, export_kinds: Object.fromEntries(symbols.map(name => [name, 'value'])) }] },
          packageExports: { '.': { types: './dist/index.d.ts', default: './dist/index.js' } },
          publicIndex: seed.files['src/index.ts']
        }), /Public export kind changed/);
      } else throw Error(`Unknown case mode: ${seed.mode}`);
      result.passed = true;
    } catch (error) {
      result.passed = false;
      result.failure = error.message;
    }
    for (const [path, content] of Object.entries(seed.files)) {
      assert.equal(readFileSync(join(directory, path), 'utf8'), content, 'Ground altered trial source');
    }
    results.push(result);
    process.stderr.write(`${result.passed ? 'PASS' : 'FAIL'} ${seed.id}${result.failure ? ': ' + result.failure : ''}\n`);
  }
  const receipt = { schema_version: 'ground-seeded-trial-receipt.v1', fixture_sha256: createHash('sha256').update(fixtureBytes).digest('hex'), execution: nativeDirectory ? 'local-native' : 'published-npm', package: nativeDirectory ? null : packageSpec, build, published, cli_version: version.stdout.trim(), cases: results, ready: results.length === trial.cases.length && results.every(item => item.passed) };
  if (value('--output')) writeReceipt(root, value('--output'), JSON.stringify(receipt, null, 2) + '\n');
  process.stdout.write(JSON.stringify({ ...receipt, cases: results.map(({ id, layer, passed, failure }) => ({ id, layer, passed, failure })) }, null, 2) + '\n');
  process.exitCode = receipt.ready ? 0 : 1;
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
