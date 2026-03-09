#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const REPO_ROOT = process.cwd();

function normalizePath(relPath) {
  return relPath.split(path.sep).join('/').replace(/^\.\//, '');
}

function parseArgs(argv) {
  const args = [...argv];
  const requestedPackages = [];
  let fix = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === '--') {
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      console.log('Usage: node scripts/workspace-lint.mjs [--package <name-or-path>] [--fix]');
      process.exit(0);
    }

    if (arg === '--fix') {
      fix = true;
      continue;
    }

    if (arg === '--package') {
      const value = args[i + 1];
      if (!value) {
        console.error('Missing value after --package');
        process.exit(2);
      }
      requestedPackages.push(value);
      i += 1;
      continue;
    }

    if (arg.startsWith('--package=')) {
      requestedPackages.push(arg.split('=', 2)[1]);
      continue;
    }

    console.error(`Unknown argument: ${arg}`);
    process.exit(2);
  }

  return { requestedPackages, fix };
}

function run(command, args, cwd, label) {
  const printable = `${command} ${args.join(' ')}`;
  console.log(`\n[${label}] ${printable}`);
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    env: process.env,
  });
  return result.status ?? 1;
}

function hasAnyWranglerConfig(pkgDir) {
  return (
    existsSync(path.join(pkgDir, 'wrangler.toml')) ||
    existsSync(path.join(pkgDir, 'wrangler.base.toml')) ||
    existsSync(path.join(pkgDir, 'wrangler.system-studio.toml'))
  );
}

function hasSourceFiles(pkgDir) {
  return (
    existsSync(path.join(pkgDir, 'src')) ||
    existsSync(path.join(pkgDir, 'worker')) ||
    existsSync(path.join(pkgDir, 'index.ts')) ||
    existsSync(path.join(pkgDir, 'index.js')) ||
    existsSync(path.join(pkgDir, 'vite.config.ts')) ||
    existsSync(path.join(pkgDir, 'vite.config.js')) ||
    existsSync(path.join(pkgDir, 'svelte.config.js'))
  );
}

function hasFallbackValidation(pkg) {
  return (
    typeof pkg.scripts.check === 'string' ||
    typeof pkg.scripts.typecheck === 'string' ||
    typeof pkg.scripts.build === 'string' ||
    typeof pkg.scripts.test === 'string' ||
    typeof pkg.scripts.package === 'string' ||
    existsSync(path.join(pkg.dir, 'tsconfig.json')) ||
    hasAnyWranglerConfig(pkg.dir)
  );
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

function getWorkspacePackageDirs() {
  const result = spawnSync('pnpm', ['-r', 'list', '--depth', '-1', '--json'], {
    cwd: REPO_ROOT,
    env: process.env,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    console.error('Failed to query pnpm workspace membership.');
    process.exit(result.status ?? 1);
  }

  let list;
  try {
    list = JSON.parse(result.stdout || '[]');
  } catch (err) {
    console.error(`Failed to parse pnpm workspace membership: ${String(err)}`);
    process.exit(1);
  }

  const workspaceDirs = new Set();
  for (const item of list) {
    if (!item || typeof item.path !== 'string') continue;
    if (item.path === REPO_ROOT) continue;
    workspaceDirs.add(item.path);
  }

  return workspaceDirs;
}

function getPackages() {
  const workspaceDirs = getWorkspacePackageDirs();
  const pkgFiles = walkPackageFiles(path.join(REPO_ROOT, 'packages'));
  const packages = [];

  for (const pkgFile of pkgFiles) {
    let json;
    try {
      json = JSON.parse(readFileSync(pkgFile, 'utf8'));
    } catch (err) {
      console.error(`Failed to parse ${normalizePath(path.relative(REPO_ROOT, pkgFile))}: ${String(err)}`);
      process.exit(1);
    }

    const dir = path.dirname(pkgFile);
    const relDir = normalizePath(path.relative(REPO_ROOT, dir));

    packages.push({
      name: json.name ?? '',
      relDir,
      dir,
      scripts: json.scripts ?? {},
      isWorker: relDir.includes('/worker'),
      isWorkspace: workspaceDirs.has(dir),
    });
  }

  packages.sort((a, b) => a.relDir.localeCompare(b.relDir));
  return packages;
}

function normalizePackageRequest(request) {
  if (!request) return '';
  if (path.isAbsolute(request)) {
    return normalizePath(path.relative(REPO_ROOT, request));
  }
  return normalizePath(request);
}

function selectPackages(packages, requestedPackages) {
  if (requestedPackages.length === 0) return packages;

  const selected = [];
  const missing = [];

  for (const request of requestedPackages) {
    const normalized = normalizePackageRequest(request);
    const matches = packages.filter(
      (pkg) => pkg.name === request || pkg.relDir === normalized
    );

    if (matches.length === 0) {
      missing.push(request);
      continue;
    }

    for (const pkg of matches) {
      if (!selected.includes(pkg)) selected.push(pkg);
    }
  }

  if (missing.length > 0) {
    console.error(`Unknown workspace package selector(s): ${missing.join(', ')}`);
    process.exit(1);
  }

  return selected;
}

function lintSmoke(pkg) {
  const issues = [];

  if (!pkg.name || typeof pkg.name !== 'string') {
    issues.push('missing package name');
  }

  if (hasSourceFiles(pkg.dir) && !hasFallbackValidation(pkg)) {
    issues.push('source package missing fallback validation path (check/typecheck/build/test/package, tsconfig, or wrangler config)');
  }

  if (issues.length > 0) {
    console.error(`\n[${pkg.relDir} | lint] ${issues.join('; ')}`);
    return 1;
  }

  console.log(`\n[${pkg.relDir} | lint] structural lint passed`);
  return 0;
}

function runPackageLint(pkg, fix) {
  if (pkg.isWorkspace && typeof pkg.scripts.lint === 'string') {
    const args = ['run', 'lint'];
    if (fix) {
      args.push('--', '--fix');
    }
    return {
      mode: 'script',
      status: run('pnpm', args, pkg.dir, `${pkg.relDir} | lint`),
    };
  }

  return {
    mode: 'smoke',
    status: lintSmoke(pkg),
  };
}

const { requestedPackages, fix } = parseArgs(process.argv.slice(2));
const allPackages = getPackages();
const packages = selectPackages(allPackages, requestedPackages);

if (packages.length === 0) {
  console.error('No workspace packages selected for lint.');
  process.exit(1);
}

console.log(`Workspace lint target count: ${packages.length}`);

let failures = 0;
let scriptCount = 0;
let smokeCount = 0;

for (const pkg of packages) {
  const result = runPackageLint(pkg, fix);
  if (result.mode === 'script') {
    scriptCount += 1;
  } else {
    smokeCount += 1;
  }

  if (result.status !== 0) {
    failures += 1;
  }
}

if (failures > 0) {
  console.error(`\nWorkspace lint failed with ${failures} failing package(s).`);
  process.exit(1);
}

console.log(`\nWorkspace lint passed (${scriptCount} explicit lint, ${smokeCount} structural fallback).`);
