#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const IS_WINDOWS = process.platform === 'win32';
const LM_FILENAME = IS_WINDOWS ? 'lm.exe' : 'lm';
const CARGO_FILENAME = IS_WINDOWS ? 'cargo.exe' : 'cargo';
const MANIFEST_PATH = path.join(ROOT, 'packages', 'loom', 'Cargo.toml');
const BOOTSTRAP_BINARY_PATH = path.join(ROOT, 'packages', 'loom', 'npm', 'bin', LM_FILENAME);

function usage() {
  console.log(`Usage:
  pnpm loom:local <lm args...>
  pnpm loom:local -- <lm args...>
  node scripts/loom/local.mjs <lm args...>

Examples:
  pnpm loom:local ready
  pnpm loom:local show lm-12345678
  pnpm loom:local init
`);
}

function isExecutable(filePath) {
  if (!filePath) {
    return false;
  }

  try {
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function findOnPath(filename) {
  const pathEntries = (process.env.PATH ?? '')
    .split(path.delimiter)
    .filter(Boolean);

  for (const entry of pathEntries) {
    const candidate = path.join(entry, filename);
    if (isExecutable(candidate)) {
      return candidate;
    }
  }

  return null;
}

function resolveLaunchCommand() {
  const envLm = process.env.LM_BIN;
  if (isExecutable(envLm)) {
    return { command: envLm, args: [] };
  }

  if (isExecutable(BOOTSTRAP_BINARY_PATH)) {
    return { command: BOOTSTRAP_BINARY_PATH, args: [] };
  }

  const repoReleaseBinary = path.join(ROOT, 'packages', 'loom', 'target', 'release', LM_FILENAME);
  if (isExecutable(repoReleaseBinary)) {
    return { command: repoReleaseBinary, args: [] };
  }

  const workspaceReleaseBinary = path.join(ROOT, 'target', 'release', LM_FILENAME);
  if (isExecutable(workspaceReleaseBinary)) {
    return { command: workspaceReleaseBinary, args: [] };
  }

  const pathLm = findOnPath(LM_FILENAME);
  if (pathLm) {
    return { command: pathLm, args: [] };
  }

  const cargo = findOnPath(CARGO_FILENAME);
  if (cargo && fs.existsSync(MANIFEST_PATH)) {
    return {
      command: cargo,
      args: ['run', '--quiet', '--manifest-path', MANIFEST_PATH, '--bin', 'lm', '--'],
    };
  }

  return null;
}

function main() {
  const args = process.argv.slice(2);
  const normalizedArgs = args[0] === '--' ? args.slice(1) : args;
  const forcedLocalArgs =
    normalizedArgs.includes('--local') || normalizedArgs.includes('--remote')
      ? normalizedArgs
      : ['--local', ...normalizedArgs];

  if (normalizedArgs.length === 0) {
    usage();
    process.exit(1);
  }

  const launch = resolveLaunchCommand();
  if (!launch) {
    console.error('Local Loom is unavailable in this environment.');
    console.error('Run `pnpm loom:local:bootstrap` to install a repo-local binary, or use `pnpm loom:remote ...` for shared coordination.');
    process.exit(1);
  }

  const result = spawnSync(launch.command, [...launch.args, ...forcedLocalArgs], {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env,
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  process.exit(result.status ?? 1);
}

main();
