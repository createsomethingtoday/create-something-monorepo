#!/usr/bin/env node

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const REPO_ROOT = process.cwd();
const STAGES = ['typecheck', 'lint', 'test'];
const SCOPES = ['active', 'fleet', 'all'];
const PREFLIGHT_BUILD_PACKAGES = [
  '@create-something/mcp-core',
  '@create-something/composio-bridge',
  '@create-something/observability',
  '@create-something/playbook-mcp'
];
const PREFLIGHT_STAGES = new Set(['typecheck', 'lint', 'test']);

// Source of truth aligned with docs/MCP_FLEET_REGISTRY.md.
const FLEET_REGISTRY = {
  active: [
    'packages/halfdozen-dm-mcp',
    'packages/halfdozen-notion-mcp',
    'packages/halfdozen-gmail-sync',
    'packages/halfdozen-zoom-sync',
    'packages/half-dozen-youtube-sync',
    'packages/halfdozen-blondish-sync-mcp',
    'packages/halfdozen-agent-analyzer-telemetry-mcp/worker',
    'packages/halfdozen-telemetry-mcp/worker',
    'packages/schedule-mcp',
    'packages/substrate-mcp',
    'packages/create-something-mcp',
    'packages/three-tier-framework-mcp',
    'packages/playbook-mcp',
    'packages/agency/clients/outerfields/mcp-remote',
    'packages/cs-telemetry-mcp/worker'
  ],
  dormant: ['packages/gmail-notion-mcp', 'packages/notion-sync-mcp'],
  local: ['packages/quickbooks-notion-mcp', 'packages/agency/clients/outerfields/mcp-server']
};

function normalizePath(relPath) {
  return relPath.split(path.sep).join('/').replace(/^\.\//, '');
}

function parseArgs(argv) {
  const args = [...argv];
  let stage = 'all';
  let scope = (process.env.MCP_GATE_SCOPE ?? 'active').trim().toLowerCase();

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === '--') {
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      console.log(
        'Usage: node scripts/mcp-quality-gate.mjs [all|typecheck|lint|test] [--scope=active|fleet|all]'
      );
      process.exit(0);
    }

    if (arg === '--scope') {
      const value = args[i + 1];
      if (!value) {
        console.error('Missing value after --scope');
        process.exit(2);
      }
      scope = value.trim().toLowerCase();
      i += 1;
      continue;
    }

    if (arg.startsWith('--scope=')) {
      scope = arg.split('=', 2)[1].trim().toLowerCase();
      continue;
    }

    if (arg === 'all' || STAGES.includes(arg)) {
      stage = arg;
      continue;
    }

    console.error(`Unknown argument: ${arg}`);
    process.exit(2);
  }

  if (stage !== 'all' && !STAGES.includes(stage)) {
    console.error(`Invalid stage "${stage}". Expected one of: all, ${STAGES.join(', ')}`);
    process.exit(2);
  }

  if (!SCOPES.includes(scope)) {
    console.error(`Invalid scope "${scope}". Expected one of: ${SCOPES.join(', ')}`);
    process.exit(2);
  }

  return { stage, scope };
}

function walkPackageFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (
      entry.name === 'node_modules' ||
      entry.name === '.git' ||
      entry.name === '.wrangler' ||
      entry.name === 'dist' ||
      entry.name === 'build' ||
      entry.name === 'target' ||
      entry.name === '.svelte-kit'
    ) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkPackageFiles(fullPath, out);
      continue;
    }

    if (entry.isFile() && entry.name === 'package.json') {
      out.push(fullPath);
    }
  }

  return out;
}

function run(command, args, cwd, label) {
  const printable = `${command} ${args.join(' ')}`;
  console.log(`\n[${label}] ${printable}`);
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    env: process.env
  });
  return result.status ?? 1;
}

function runPreflightBuilds(stagesToRun) {
  if (!stagesToRun.some((stage) => PREFLIGHT_STAGES.has(stage))) return;

  console.log('\n=== MCP PREFLIGHT BUILDS ===');
  console.log(`Building shared workspace dependencies: ${PREFLIGHT_BUILD_PACKAGES.join(', ')}`);

  for (const pkg of PREFLIGHT_BUILD_PACKAGES) {
    const status = run('pnpm', ['--filter', pkg, 'run', 'build'], REPO_ROOT, `preflight | ${pkg}`);

    if (status !== 0) {
      console.error(`Preflight build failed for ${pkg}.`);
      process.exit(status);
    }
  }
}

function hasAnyWranglerConfig(pkgDir) {
  return (
    existsSync(path.join(pkgDir, 'wrangler.toml')) ||
    existsSync(path.join(pkgDir, 'wrangler.system-studio.toml')) ||
    existsSync(path.join(pkgDir, 'wrangler.base.toml'))
  );
}

function hasTypeScriptSource(pkgDir) {
  return (
    existsSync(path.join(pkgDir, 'index.ts')) ||
    existsSync(path.join(pkgDir, 'src')) ||
    existsSync(path.join(pkgDir, 'worker'))
  );
}

function getWorkspacePackageDirs() {
  const result = spawnSync('pnpm', ['-r', 'list', '--depth', '-1', '--json'], {
    cwd: REPO_ROOT,
    env: process.env,
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    console.error(
      'Warning: failed to query pnpm workspace membership; falling back to lockfile-based manager detection.'
    );
    return new Set();
  }

  let list;
  try {
    list = JSON.parse(result.stdout || '[]');
  } catch {
    console.error(
      'Warning: failed to parse pnpm workspace membership; falling back to lockfile-based manager detection.'
    );
    return new Set();
  }

  const dirs = new Set();
  for (const item of list) {
    if (!item || typeof item.path !== 'string') continue;
    const relPath = normalizePath(path.relative(REPO_ROOT, item.path));
    if (!relPath) continue;
    dirs.add(relPath);
  }

  return dirs;
}

function getPackageManager(pkgDir, workspaceDirs, deps = {}) {
  const relDir = normalizePath(path.relative(REPO_ROOT, pkgDir));

  if (workspaceDirs.has(relDir)) {
    return 'pnpm';
  }

  // `workspace:*` ranges cannot be installed with npm. Force pnpm for any
  // package that references workspace-local dependencies.
  for (const version of Object.values(deps)) {
    if (typeof version === 'string' && version.startsWith('workspace:')) {
      return 'pnpm';
    }
  }

  if (existsSync(path.join(pkgDir, 'package-lock.json'))) {
    return 'npm';
  }

  if (existsSync(path.join(pkgDir, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }

  return 'pnpm';
}

function parsePackage(pkgFile, workspaceDirs) {
  const relFile = normalizePath(path.relative(REPO_ROOT, pkgFile));

  let json;
  try {
    json = JSON.parse(readFileSync(pkgFile, 'utf8'));
  } catch (err) {
    console.error(`Failed to parse ${relFile}: ${String(err)}`);
    process.exit(1);
  }

  const pkgDir = path.dirname(pkgFile);
  const relDir = normalizePath(path.relative(REPO_ROOT, pkgDir));
  const deps = {
    ...(json.dependencies ?? {}),
    ...(json.devDependencies ?? {}),
    ...(json.peerDependencies ?? {})
  };
  const manager = getPackageManager(pkgDir, workspaceDirs, deps);

  return {
    name: json.name ?? relDir,
    relDir,
    dir: pkgDir,
    scripts: json.scripts ?? {},
    manager,
    isWorker: relDir.endsWith('/worker'),
    deps
  };
}

function getCuratedPackageFiles(scope) {
  const curatedRoots =
    scope === 'active'
      ? [...FLEET_REGISTRY.active]
      : [...FLEET_REGISTRY.active, ...FLEET_REGISTRY.dormant, ...FLEET_REGISTRY.local];

  const packageFiles = [];
  const missing = [];
  const seen = new Set();

  const addPackageFile = (pkgFile) => {
    const rel = normalizePath(path.relative(REPO_ROOT, pkgFile));
    if (seen.has(rel)) return;
    seen.add(rel);
    packageFiles.push(pkgFile);
  };

  for (const relRoot of curatedRoots) {
    const rootDir = path.join(REPO_ROOT, relRoot);
    const rootPkg = path.join(rootDir, 'package.json');

    if (!existsSync(rootPkg)) {
      missing.push(`${relRoot}/package.json`);
      continue;
    }

    addPackageFile(rootPkg);

    const workerPkg = path.join(rootDir, 'worker', 'package.json');
    if (existsSync(workerPkg)) {
      addPackageFile(workerPkg);
    }
  }

  if (missing.length > 0) {
    console.error('Curated MCP package list references missing package.json files:');
    for (const rel of missing) {
      console.error(`- ${rel}`);
    }
    process.exit(1);
  }

  return packageFiles;
}

function discoverHeuristicPackageFiles() {
  const packageFiles = walkPackageFiles(path.join(REPO_ROOT, 'packages'));
  const discovered = [];

  for (const pkgFile of packageFiles) {
    const relFile = normalizePath(path.relative(REPO_ROOT, pkgFile));

    if (
      relFile.includes('/ground/npm/') ||
      relFile.includes('/loom/npm/') ||
      relFile.includes('/scaffold/')
    ) {
      continue;
    }

    let json;
    try {
      json = JSON.parse(readFileSync(pkgFile, 'utf8'));
    } catch (err) {
      console.error(`Failed to parse ${relFile}: ${String(err)}`);
      process.exit(1);
    }

    const deps = {
      ...(json.dependencies ?? {}),
      ...(json.devDependencies ?? {}),
      ...(json.peerDependencies ?? {})
    };

    const pkgName = json.name ?? '';
    const isWorker = relFile.endsWith('/worker/package.json');
    const hasSdk = typeof deps['@modelcontextprotocol/sdk'] === 'string';
    const hasMcpCore = typeof deps['@create-something/mcp-core'] === 'string';
    const hasAgents = typeof deps.agents === 'string';

    const isMcpByName = pkgName.includes('mcp');
    const isMcpByPath = relFile.includes('/mcp-') || relFile.includes('/mcp/');
    const isMcpSync =
      pkgName.includes('halfdozen-gmail-sync') ||
      pkgName.includes('halfdozen-zoom-sync') ||
      pkgName.includes('half-dozen-youtube-sync');

    const include =
      isMcpByName || isMcpByPath || isMcpSync || (isWorker && (hasSdk || hasMcpCore || hasAgents));

    if (!include) continue;
    discovered.push(pkgFile);
  }

  discovered.sort((a, b) => a.localeCompare(b));
  return discovered;
}

function discoverMcpPackages(scope, workspaceDirs) {
  const packageFiles =
    scope === 'all' ? discoverHeuristicPackageFiles() : getCuratedPackageFiles(scope);

  const discovered = packageFiles.map((pkgFile) => parsePackage(pkgFile, workspaceDirs));
  discovered.sort((a, b) => a.relDir.localeCompare(b.relDir));
  return discovered;
}

function ensureDepsForNpmPackage(pkg) {
  if (pkg.manager !== 'npm') return 0;
  if (existsSync(path.join(pkg.dir, 'node_modules'))) return 0;

  // CI-safe install for standalone npm-managed MCP folders.
  return run('npm', ['ci', '--ignore-scripts'], pkg.dir, `${pkg.relDir} | deps`);
}

function pnpmExecTsc(pkg, stage) {
  if (pkg.manager === 'npm') {
    return run('npm', ['exec', '--', 'tsc', '--noEmit'], pkg.dir, `${pkg.relDir} | ${stage}`);
  }
  return run('pnpm', ['exec', 'tsc', '--noEmit'], pkg.dir, `${pkg.relDir} | ${stage}`);
}

function runScript(pkg, stage, scriptName) {
  if (pkg.manager === 'npm') {
    return run('npm', ['run', scriptName], pkg.dir, `${pkg.relDir} | ${stage}`);
  }
  return run('pnpm', ['run', scriptName], pkg.dir, `${pkg.relDir} | ${stage}`);
}

function runWranglerDryRun(pkg, stage) {
  if (pkg.manager === 'npm') {
    return run(
      'npm',
      ['exec', '--', 'wrangler', 'deploy', '--dry-run', '--config', 'wrangler.toml'],
      pkg.dir,
      `${pkg.relDir} | ${stage}`
    );
  }
  return run(
    'pnpm',
    ['exec', 'wrangler', 'deploy', '--dry-run', '--config', 'wrangler.toml'],
    pkg.dir,
    `${pkg.relDir} | ${stage}`
  );
}

function lintSmoke(pkg) {
  const issues = [];

  if (!pkg.name || typeof pkg.name !== 'string') {
    issues.push('missing package name');
  }

  if (pkg.isWorker && !hasAnyWranglerConfig(pkg.dir)) {
    issues.push('worker package missing wrangler config');
  }

  const hasTsconfig = existsSync(path.join(pkg.dir, 'tsconfig.json'));
  const hasWrangler = hasAnyWranglerConfig(pkg.dir);
  const hasTypecheckScript = typeof pkg.scripts.typecheck === 'string';
  const hasBuildScript = typeof pkg.scripts.build === 'string';

  if (
    hasTypeScriptSource(pkg.dir) &&
    !hasTsconfig &&
    !hasWrangler &&
    !hasTypecheckScript &&
    !hasBuildScript
  ) {
    issues.push(
      'typescript source found without tsconfig, wrangler config, or typecheck/build script'
    );
  }

  if (!pkg.isWorker && !existsSync(path.join(pkg.dir, 'README.md'))) {
    issues.push('missing README.md');
  }

  if (issues.length > 0) {
    console.error(`\n[${pkg.relDir} | lint] ${issues.join('; ')}`);
    return 1;
  }

  console.log(`\n[${pkg.relDir} | lint] structural lint passed`);
  return 0;
}

function runStageForPackage(pkg, stage) {
  if (stage === 'typecheck') {
    if (pkg.scripts.typecheck) return runScript(pkg, stage, 'typecheck');
    if (existsSync(path.join(pkg.dir, 'tsconfig.json'))) return pnpmExecTsc(pkg, stage);
    if (hasAnyWranglerConfig(pkg.dir)) return runWranglerDryRun(pkg, stage);
    console.error(`\n[${pkg.relDir} | ${stage}] no typecheck strategy`);
    return 1;
  }

  if (stage === 'lint') {
    if (pkg.scripts.lint) return runScript(pkg, stage, 'lint');
    return lintSmoke(pkg);
  }

  // test stage
  if (pkg.scripts['test:smoke']) return runScript(pkg, stage, 'test:smoke');
  if (pkg.scripts.build) return runScript(pkg, stage, 'build');
  if (pkg.scripts.typecheck) return runScript(pkg, stage, 'typecheck');
  if (existsSync(path.join(pkg.dir, 'tsconfig.json'))) return pnpmExecTsc(pkg, stage);
  if (hasAnyWranglerConfig(pkg.dir)) return runWranglerDryRun(pkg, stage);
  console.error(`\n[${pkg.relDir} | ${stage}] no test strategy`);
  return 1;
}

const { stage: requestedStage, scope: requestedScope } = parseArgs(process.argv.slice(2));
const workspaceDirs = getWorkspacePackageDirs();
const packages = discoverMcpPackages(requestedScope, workspaceDirs);

if (packages.length === 0) {
  console.error(`No MCP packages discovered for scope "${requestedScope}".`);
  process.exit(1);
}

console.log(`Discovered ${packages.length} MCP packages/workers (scope: ${requestedScope}).`);
for (const pkg of packages) {
  console.log(`- ${pkg.relDir} (${pkg.manager})`);
}

for (const pkg of packages) {
  const status = ensureDepsForNpmPackage(pkg);
  if (status !== 0) process.exit(status);
}

const stagesToRun = requestedStage === 'all' ? STAGES : [requestedStage];
let failures = 0;

runPreflightBuilds(stagesToRun);

for (const stage of stagesToRun) {
  console.log(`\n=== MCP ${stage.toUpperCase()} ===`);
  for (const pkg of packages) {
    const status = runStageForPackage(pkg, stage);
    if (status !== 0) failures += 1;
  }
}

if (failures > 0) {
  console.error(`\nMCP quality gate failed with ${failures} failing check(s).`);
  process.exit(1);
}

console.log('\nMCP quality gate passed.');
