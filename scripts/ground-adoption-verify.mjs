#!/usr/bin/env node

// Exercise the published package against real repository policy and source.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(root, 'packages/ground/npm/package.json'), 'utf8'));
const packageSpec = `${manifest.name}@${manifest.version}`;
const temporary = mkdtempSync(join(tmpdir(), 'ground-adoption-'));
const database = join(temporary, 'registry.db');
const core = join(root, 'packages/mcp-core');
const ground = join(root, 'packages/ground');

function command(binary, args, input) {
  const override = binary === 'ground' ? process.env.GROUND_BINARY : process.env.GROUND_MCP_BINARY;
  const result = spawnSync(override || 'npm', override ? args : [
    'exec', '--yes', `--package=${packageSpec}`, '--', binary, ...args
  ], { cwd: root, input, encoding: 'utf8', timeout: 120_000, maxBuffer: 16 * 1024 * 1024 });
  assert.equal(result.status, 0, `${binary} failed: ${result.error || result.stderr}`);
  return result;
}

function cli(args) {
  return command('ground', ['--db', database, ...args]);
}

function parse(result) {
  return JSON.parse(result.stdout);
}

function checkCore(result) {
  assert.equal(result.coverage.duplicates.status, 'PASS');
  assert.equal(result.coverage.orphans.status, 'PASS');
  assert.equal(result.coverage.orphans.scan_complete, true);
  assert.equal(result.coverage.orphans.error_count, 0);
  assert.equal(result.coverage.dead_exports.status, 'NOT_APPLICABLE');
  assert.equal(result.coverage.dead_exports.reason, 'batch_requires_explicit_module');
  assert.equal(result.summary.total_issues, 0, JSON.stringify(result.findings));
  assert(result.coverage.orphans.entry_point_evidence.some(entry =>
    entry.relative_path === 'eslint.evidence.config.mjs' &&
    entry.entry_point_type === 'Ground manual entry point'
  ), 'the loaded ESLint config must have explicit entry-point evidence');
}

function checkGround(result) {
  assert.equal(result.coverage.duplicates.status, 'FAIL');
  assert.equal(result.coverage.duplicates.files_checked, result.coverage.duplicates.files_discovered);
  assert.equal(result.findings.duplicates.length, 1, 'only the deliberate detector fixture should remain');
  const finding = result.findings.duplicates[0];
  assert.equal(finding.function, 'normalizeCustomerId');
  assert.deepEqual(finding.files.map(file => relative(ground, file).replaceAll('\\', '/')).sort(), [
    'npm/pilot/fixtures/duplicate-analysis/customer-a.ts',
    'npm/pilot/fixtures/duplicate-analysis/customer-b.ts'
  ]);
  assert.equal(finding.safe_to_auto_fix, false);
  assert.equal(finding.fix.target, null);
}

function sourceModules(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = join(directory, entry.name);
    return entry.isDirectory() ? sourceModules(file) : entry.name.endsWith('.ts') ? [file] : [];
  }).sort();
}

try {
  const doctor = parse(cli(['doctor', root, '--json']));
  assert.equal(doctor.verification_status, 'PASS');
  assert.equal(doctor.build.version, manifest.version);
  assert.match(doctor.build.source_sha, /^[a-f0-9]{40}$/);
  assert.match(doctor.policy.sha256, /^[a-f0-9]{64}$/);
  assert(doctor.workspace.packages > 0 && doctor.workspace.dependencies > 0);
  const registry = spawnSync('npm', ['view', packageSpec, 'gitHead', 'dist.integrity', '--json'],
    { encoding: 'utf8', timeout: 30_000 });
  assert.equal(registry.status, 0, registry.error?.message || registry.stderr);
  const published = JSON.parse(registry.stdout);
  assert.equal(doctor.build.source_sha, published.gitHead, 'binary must match the exact published source');
  assert.match(published['dist.integrity'], /^sha512-/);
  const coreDoctor = parse(cli(['doctor', core, '--json']));
  assert.equal(coreDoctor.verification_status, 'PASS');
  assert.equal(coreDoctor.policy.source, join(core, '.ground.yml'));
  const revision = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' });
  const worktree = spawnSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' });
  assert.equal(revision.status, 0);
  assert.equal(worktree.status, 0);

  const coreCommand = cli(['analyze', core, '--checks', 'duplicates,orphans,dead_exports', '--timeout-ms', '15000']);
  // In 0.4.0 extends merges arrays. Avoid silently changing the repository threshold.
  assert.match(coreCommand.stderr, /threshold=85%/);
  const coreAnalysis = parse(coreCommand);
  checkCore(coreAnalysis);
  const groundAnalysis = parse(cli(['analyze', ground, '--checks', 'duplicates', '--timeout-ms', '15000']));
  checkGround(groundAnalysis);

  const modules = sourceModules(join(core, 'src'));
  assert(modules.length > 0);
  const calls = [
    { name: 'ground_analyze', arguments: { directory: core, checks: ['duplicates', 'orphans', 'dead_exports'], timeout_ms: 15000 } },
    { name: 'ground_analyze', arguments: { directory: ground, checks: ['duplicates'], timeout_ms: 15000 } },
    ...modules.map(module_path => ({ name: 'ground_find_dead_exports', arguments: { module_path, search_scope: core } }))
  ];
  const input = [
    { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} },
    ...calls.map((params, index) => ({ jsonrpc: '2.0', id: index + 2, method: 'tools/call', params }))
  ].map(message => JSON.stringify(message)).join('\n') + '\n';
  const responses = command('ground-mcp', ['--db', database], input).stdout.trim().split(/\r?\n/).map(JSON.parse);
  assert.equal(responses.find(response => response.id === 1)?.result?.serverInfo?.version, manifest.version);
  const results = calls.map((call, index) => {
    const response = responses.find(item => item.id === index + 2);
    assert(response && !response.error && !response.result?.isError, JSON.stringify(response));
    return JSON.parse(response.result.content.find(item => item.type === 'text').text);
  });
  checkCore(results[0]);
  checkGround(results[1]);
  const deadExports = results.slice(2).map((result, index) => {
    assert.equal(resolve(result.module_path), modules[index]);
    assert.equal(resolve(result.search_scope), core);
    assert.equal(result.dead_export_count, result.dead_exports.length);
    assert.equal(typeof result.total_exports, 'number');
    return { module: relative(root, modules[index]), total_exports: result.total_exports,
      dead_exports: result.dead_exports.map(item => ({ name: item.name, line: item.line })) };
  });
  const adjudication = JSON.parse(readFileSync(join(root, 'docs/internal/ground-adoption-adjudication.v1.json'), 'utf8'));
  const publicIndex = readFileSync(join(core, 'src/index.ts'), 'utf8');
  const coreManifest = JSON.parse(readFileSync(join(core, 'package.json'), 'utf8'));
  assert.equal(coreManifest.exports['.'].default, './dist/index.js');
  const publicExports = new Map();
  for (const match of publicIndex.matchAll(/export\s+(?:type\s+)?\{([^}]+)\}\s+from\s+['"]\.\/([^'"]+)\.js['"]/g)) {
    publicExports.set('packages/mcp-core/src/' + match[2] + '.ts',
      [...(publicExports.get('packages/mcp-core/src/' + match[2] + '.ts') || []),
        ...match[1].split(',').map(name => name.trim()).filter(Boolean)]);
  }
  for (const module of deadExports) {
    const reviewed = adjudication.dead_exports.modules.find(item => item.module === module.module);
    for (const item of module.dead_exports) {
      assert(reviewed?.symbols.includes(item.name), 'Unreviewed dead-export finding: ' + module.module + ':' + item.name);
      assert(publicExports.get(module.module)?.includes(item.name), 'Retained symbol is no longer in the reviewed public API: ' + item.name);
    }
  }
  const receipt = {
    schema_version: 'ground-adoption-receipt.v1', package: packageSpec,
    checkout: { source_sha: revision.stdout.trim(), dirty: worktree.stdout.trim().length > 0 },
    published: { source_sha: published.gitHead, integrity: published['dist.integrity'] },
    build: doctor.build, policy_sha256: doctor.policy.sha256, workspace: doctor.workspace,
    package_policy_sha256: coreDoctor.policy.sha256,
    core: { coverage: coreAnalysis.coverage, summary: coreAnalysis.summary },
    ground: { coverage: groundAnalysis.coverage, summary: groundAnalysis.summary,
      disposition: 'retain intentional normalizeCustomerId detector fixture' },
    mcp: { initialized: true, analyzed_packages: 2, explicit_modules_checked: modules.length },
    dead_exports: { scope: 'packages/mcp-core only; public API and external consumers require separate adjudication', modules: deadExports },
    adjudication: { issue: adjudication.issue, public_api_candidates_retained: deadExports.reduce((sum, item) => sum + item.dead_exports.length, 0) },
    ready: true
  };
  const outputIndex = process.argv.indexOf('--output');
  if (outputIndex >= 0) {
    assert(process.argv[outputIndex + 1], '--output requires a path');
    writeFileSync(resolve(process.argv[outputIndex + 1]), JSON.stringify(receipt, null, 2) + '\n');
  }
  process.stdout.write(JSON.stringify(receipt, null, 2) + '\n');
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
