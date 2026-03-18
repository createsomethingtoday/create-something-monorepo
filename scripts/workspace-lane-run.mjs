#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const REPO_ROOT = process.cwd();
const LANE_CONFIG_PATH = path.join(REPO_ROOT, 'config', 'workspace-lanes.json');

function normalizePath(value) {
  return value.split(path.sep).join('/').replace(/^\.\//, '');
}

function printUsage() {
  console.log(
    [
      'Usage: node scripts/workspace-lane-run.mjs <lane[,lane...]> [script] [--dry-run] [--parallel] [-- <script args>]',
      '',
      'Examples:',
      '  node scripts/workspace-lane-run.mjs platform',
      '  node scripts/workspace-lane-run.mjs services build',
      '  node scripts/workspace-lane-run.mjs product,services dev --parallel',
      '  node scripts/workspace-lane-run.mjs product check -- --fail-on-warnings'
    ].join('\n')
  );
}

function parseArgs(argv) {
  const args = [...argv];
  const passthroughIndex = args.indexOf('--');
  const passthrough = passthroughIndex === -1 ? [] : args.slice(passthroughIndex + 1);
  const baseArgs = passthroughIndex === -1 ? args : args.slice(0, passthroughIndex);

  let dryRun = false;
  let parallel = false;
  const positional = [];

  for (const arg of baseArgs) {
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }

    if (arg === '--parallel') {
      parallel = true;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }

    if (arg.startsWith('-')) {
      console.error(`Unknown argument: ${arg}`);
      printUsage();
      process.exit(2);
    }

    positional.push(arg);
  }

  const [laneName, scriptName] = positional;
  if (!laneName) {
    printUsage();
    process.exit(2);
  }

  return { laneName, scriptName, dryRun, parallel, passthrough };
}

function loadLaneConfig() {
  try {
    const json = JSON.parse(readFileSync(LANE_CONFIG_PATH, 'utf8'));
    if (!json || typeof json !== 'object' || typeof json.lanes !== 'object') {
      throw new Error('Expected a top-level "lanes" object.');
    }
    return json;
  } catch (error) {
    console.error(
      `Failed to load ${normalizePath(path.relative(REPO_ROOT, LANE_CONFIG_PATH))}: ${String(error)}`
    );
    process.exit(1);
  }
}

function globToRegex(pattern) {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped.replace(/\*/g, '[^/]*')}$`);
}

function getWorkspacePackages() {
  const result = spawnSync('pnpm', ['-r', 'list', '--depth', '-1', '--json'], {
    cwd: REPO_ROOT,
    env: process.env,
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    console.error('Failed to query pnpm workspace membership.');
    process.exit(result.status ?? 1);
  }

  let items;
  try {
    items = JSON.parse(result.stdout || '[]');
  } catch (error) {
    console.error(`Failed to parse pnpm workspace membership: ${String(error)}`);
    process.exit(1);
  }

  const packages = [];
  for (const item of items) {
    if (!item || typeof item.path !== 'string') continue;
    if (item.path === REPO_ROOT) continue;

    const relDir = normalizePath(path.relative(REPO_ROOT, item.path));
    const pkgJsonPath = path.join(item.path, 'package.json');

    try {
      const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
      packages.push({
        dir: item.path,
        relDir,
        name: typeof pkgJson.name === 'string' ? pkgJson.name : relDir,
        scripts:
          typeof pkgJson.scripts === 'object' && pkgJson.scripts !== null ? pkgJson.scripts : {}
      });
    } catch (error) {
      console.error(
        `Failed to read ${normalizePath(path.relative(REPO_ROOT, pkgJsonPath))}: ${String(error)}`
      );
      process.exit(1);
    }
  }

  packages.sort((a, b) => a.relDir.localeCompare(b.relDir));
  return packages;
}

function resolveLanePackages(laneName, patterns, packages) {
  const matched = new Map();
  const unmatchedPatterns = [];

  for (const pattern of patterns) {
    const regex = globToRegex(pattern);
    const matches = packages.filter((pkg) => regex.test(pkg.relDir));

    if (matches.length === 0) {
      unmatchedPatterns.push(pattern);
      continue;
    }

    for (const pkg of matches) {
      matched.set(pkg.relDir, pkg);
    }
  }

  const selected = [...matched.values()].sort((a, b) => a.relDir.localeCompare(b.relDir));
  if (selected.length === 0) {
    console.error(`Lane "${laneName}" resolved to zero workspace packages.`);
    process.exit(1);
  }

  return { selected, unmatchedPatterns };
}

function printLaneSummary(label, packages, scriptName) {
  console.log(`Lane "${label}" packages (${packages.length}):`);
  for (const pkg of packages) {
    const marker = scriptName && typeof pkg.scripts[scriptName] !== 'string' ? ' (no script)' : '';
    console.log(`- ${pkg.relDir}${marker}`);
  }
}

function main() {
  const { laneName, scriptName, dryRun, parallel, passthrough } = parseArgs(process.argv.slice(2));
  const config = loadLaneConfig();
  const laneNames = [
    ...new Set(
      laneName
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean)
    )
  ];

  if (laneNames.length === 0) {
    printUsage();
    process.exit(2);
  }

  const workspacePackages = getWorkspacePackages();
  const selectedMap = new Map();
  const unmatchedPatterns = [];

  for (const name of laneNames) {
    const patterns = config.lanes[name];
    if (!Array.isArray(patterns)) {
      console.error(
        `Unknown lane "${name}". Known lanes: ${Object.keys(config.lanes).sort().join(', ')}`
      );
      process.exit(1);
    }

    const { selected, unmatchedPatterns: laneUnmatched } = resolveLanePackages(
      name,
      patterns,
      workspacePackages
    );

    for (const pkg of selected) {
      selectedMap.set(pkg.relDir, pkg);
    }

    unmatchedPatterns.push(...laneUnmatched.map((pattern) => `${name}:${pattern}`));
  }

  const selected = [...selectedMap.values()].sort((a, b) => a.relDir.localeCompare(b.relDir));
  const laneLabel = laneNames.join(',');

  if (unmatchedPatterns.length > 0) {
    console.warn(
      `Warning: lane "${laneLabel}" has unmatched patterns: ${unmatchedPatterns.join(', ')}`
    );
  }

  if (!scriptName) {
    printLaneSummary(laneLabel, selected);
    return;
  }

  const runnable = selected.filter((pkg) => typeof pkg.scripts[scriptName] === 'string');
  const skipped = selected.filter((pkg) => typeof pkg.scripts[scriptName] !== 'string');

  printLaneSummary(laneLabel, selected, scriptName);

  if (skipped.length > 0) {
    console.log(`\nSkipping ${skipped.length} package(s) without "${scriptName}".`);
  }

  if (runnable.length === 0) {
    console.log(`No packages in lane "${laneLabel}" define "${scriptName}".`);
    return;
  }

  const args = ['--recursive'];
  if (parallel) {
    args.push('--parallel', '--stream');
  }
  for (const pkg of runnable) {
    args.push('--filter', pkg.name);
  }
  args.push('--if-present', 'run', scriptName);
  if (passthrough.length > 0) {
    args.push('--', ...passthrough);
  }

  const printable = `pnpm ${args.join(' ')}`;
  console.log(`\n[${laneLabel}] ${printable}`);

  if (dryRun) {
    return;
  }

  const result = spawnSync('pnpm', args, {
    cwd: REPO_ROOT,
    env: process.env,
    stdio: 'inherit'
  });

  process.exit(result.status ?? 1);
}

main();
