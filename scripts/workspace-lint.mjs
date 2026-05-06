#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
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
  let allowMissing = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === '--') {
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      console.log('Usage: node scripts/workspace-lint.mjs [--package <name-path-or-alias>] [--fix] [--allow-missing]');
      process.exit(0);
    }

    if (arg === '--allow-missing') {
      allowMissing = true;
      continue;
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

  return { requestedPackages, fix, allowMissing };
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

  const workspaceDirs = [];
  for (const item of list) {
    if (!item || typeof item.path !== 'string') continue;
    if (item.path === REPO_ROOT) continue;
    workspaceDirs.push(item.path);
  }

  workspaceDirs.sort((a, b) => a.localeCompare(b));
  return workspaceDirs;
}

function buildSelectors(name, relDir) {
  const selectors = new Set([relDir]);
  const relWithoutPackages = relDir.startsWith('packages/') ? relDir.slice('packages/'.length) : relDir;
  selectors.add(relWithoutPackages);
  selectors.add(path.posix.basename(relDir));

  if (typeof name === 'string' && name.length > 0) {
    selectors.add(name);
    selectors.add(name.replace(/^@[^/]+\//, ''));
  }

  return selectors;
}

function getPackages() {
  const workspaceDirs = getWorkspacePackageDirs();
  const packages = [];

  for (const dir of workspaceDirs) {
    const pkgFile = path.join(dir, 'package.json');
    let json;
    try {
      json = JSON.parse(readFileSync(pkgFile, 'utf8'));
    } catch (err) {
      console.error(`Failed to parse ${normalizePath(path.relative(REPO_ROOT, pkgFile))}: ${String(err)}`);
      process.exit(1);
    }

    const relDir = normalizePath(path.relative(REPO_ROOT, dir));
    const name = json.name ?? '';

    packages.push({
      name,
      relDir,
      dir,
      scripts: json.scripts ?? {},
      selectors: buildSelectors(name, relDir),
    });
  }

  packages.sort((a, b) => a.relDir.localeCompare(b.relDir));
  return packages;
}

function normalizePackageRequest(request) {
  if (!request) return '';
  const resolved = path.isAbsolute(request)
    ? path.relative(REPO_ROOT, request)
    : request;
  return normalizePath(resolved).replace(/\/package\.json$/, '');
}

function resolvePackageSelector(packages, request) {
  const normalized = normalizePackageRequest(request);
  const exactMatches = packages.filter(
    (pkg) => pkg.name === request || pkg.relDir === normalized
  );

  if (exactMatches.length === 1) {
    return { kind: 'match', package: exactMatches[0] };
  }

  if (exactMatches.length > 1) {
    return { kind: 'ambiguous', request, matches: exactMatches };
  }

  const aliasMatches = packages.filter((pkg) => pkg.selectors.has(normalized));
  if (aliasMatches.length === 1) {
    return { kind: 'match', package: aliasMatches[0] };
  }

  if (aliasMatches.length > 1) {
    return { kind: 'ambiguous', request, matches: aliasMatches };
  }

  return { kind: 'missing', request };
}

function selectPackages(packages, requestedPackages) {
  if (requestedPackages.length === 0) return packages;

  const selected = [];
  const missing = [];
  const ambiguous = [];

  for (const request of requestedPackages) {
    const result = resolvePackageSelector(packages, request);
    if (result.kind === 'missing') {
      missing.push(request);
      continue;
    }

    if (result.kind === 'ambiguous') {
      ambiguous.push(
        `${request} -> ${result.matches.map((pkg) => pkg.relDir).join(', ')}`
      );
      continue;
    }

    if (!selected.includes(result.package)) {
      selected.push(result.package);
    }
  }

  if (missing.length > 0) {
    console.error(`Unknown workspace package selector(s): ${missing.join(', ')}`);
  }

  if (ambiguous.length > 0) {
    console.error(`Ambiguous workspace package selector(s): ${ambiguous.join(' | ')}`);
  }

  if (missing.length > 0 || ambiguous.length > 0) {
    process.exit(1);
  }

  return selected;
}

function runPackageLint(pkg, { allowMissing, fix }) {
  if (typeof pkg.scripts.lint === 'string') {
    const args = ['run', 'lint'];
    if (fix) {
      args.push('--', '--fix');
    }
    return {
      mode: 'script',
      status: run('pnpm', args, pkg.dir, `${pkg.relDir} | lint`),
    };
  }

  if (hasSourceFiles(pkg.dir)) {
    const message = `\n[${pkg.relDir} | lint] missing lint script; add one to ${pkg.relDir}/package.json`;
    if (allowMissing) {
      console.log(`${message} (allowed)`);
      return {
        mode: 'missing-lint',
        status: 0,
      };
    }

    console.error(message);
    return {
      mode: 'missing-lint',
      status: 1,
    };
  }

  console.log(`\n[${pkg.relDir} | lint] skipped (no lint script and no source files)`);
  return {
    mode: 'skipped',
    status: 0,
  };
}

const { requestedPackages, fix, allowMissing } = parseArgs(process.argv.slice(2));
const allPackages = getPackages();
const packages = selectPackages(allPackages, requestedPackages);

if (packages.length === 0) {
  console.error('No workspace packages selected for lint.');
  process.exit(1);
}

console.log(`Workspace lint target count: ${packages.length}`);
if (allowMissing) {
  console.log('Workspace lint will allow packages that have source files but no lint script.');
}

let failures = 0;
let scriptCount = 0;
let skippedCount = 0;
let missingLintCount = 0;

for (const pkg of packages) {
  const result = runPackageLint(pkg, { allowMissing, fix });
  if (result.mode === 'script') {
    scriptCount += 1;
  } else if (result.mode === 'missing-lint') {
    missingLintCount += 1;
  } else {
    skippedCount += 1;
  }

  if (result.status !== 0) {
    failures += 1;
  }
}

if (failures > 0) {
  const missingLintSummary =
    missingLintCount > 0 ? ` (${missingLintCount} package(s) missing lint scripts)` : '';
  console.error(`\nWorkspace lint failed with ${failures} failing package(s)${missingLintSummary}.`);
  process.exit(1);
}

const allowedMissingSummary =
  allowMissing && missingLintCount > 0 ? `, ${missingLintCount} missing lint script(s) allowed` : '';
console.log(`\nWorkspace lint passed (${scriptCount} explicit lint, ${skippedCount} skipped without source files${allowedMissingSummary}).`);
