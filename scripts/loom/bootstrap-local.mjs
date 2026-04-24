#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const INSTALLER = path.join(ROOT, 'packages', 'loom', 'npm', 'install.js');
const BIN_DIR = path.join(ROOT, 'packages', 'loom', 'npm', 'bin');
const MANIFEST_PATH = path.join(ROOT, 'packages', 'loom', 'Cargo.toml');
const TARGET_DIR = path.join(ROOT, 'packages', 'loom', 'target');
const IS_WINDOWS = process.platform === 'win32';
const LM_FILENAME = IS_WINDOWS ? 'lm.exe' : 'lm';
const MCP_FILENAME = IS_WINDOWS ? 'loom-mcp.exe' : 'loom-mcp';
const CARGO_FILENAME = IS_WINDOWS ? 'cargo.exe' : 'cargo';

function usage() {
  console.log(`Usage:
  pnpm loom:local:bootstrap
  node scripts/loom/bootstrap-local.mjs

Downloads the prebuilt Loom binary into the repo-owned cache at:
  ${BIN_DIR}

If the prebuilt release asset is unavailable, falls back to a local source build when Rust is present.
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

function runPrebuiltInstaller() {
  return spawnSync(process.execPath, [INSTALLER], {
    cwd: ROOT,
    stdio: 'inherit',
    env: {
      ...process.env,
      LOOM_MCP_FORCE_BINARY_INSTALL: '1',
      LOOM_MCP_BIN_DIR: BIN_DIR,
    },
  });
}

function buildFromSource() {
  const cargo = findOnPath(CARGO_FILENAME);
  if (!cargo || !fs.existsSync(MANIFEST_PATH)) {
    return false;
  }

  console.log('');
  console.log('Falling back to a local source build via cargo...');

  const result = spawnSync(
    cargo,
    [
      'build',
      '--release',
      '--manifest-path',
      MANIFEST_PATH,
      '--target-dir',
      TARGET_DIR,
      '--bin',
      'lm',
      '--bin',
      'loom-mcp',
    ],
    {
      cwd: ROOT,
      stdio: 'inherit',
      env: process.env,
    },
  );

  if (result.error || (result.status ?? 1) !== 0) {
    return false;
  }

  for (const filename of [LM_FILENAME, MCP_FILENAME]) {
    const source = path.join(TARGET_DIR, 'release', filename);
    const destination = path.join(BIN_DIR, filename);
    if (fs.existsSync(source)) {
      fs.copyFileSync(source, destination);
      if (!IS_WINDOWS) {
        fs.chmodSync(destination, 0o755);
      }
    }
  }

  return true;
}

function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    usage();
    process.exit(0);
  }

  if (!fs.existsSync(INSTALLER)) {
    console.error(`Loom bootstrap installer not found: ${INSTALLER}`);
    process.exit(1);
  }

  fs.mkdirSync(BIN_DIR, { recursive: true });

  const result = runPrebuiltInstaller();

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  const lmPath = path.join(BIN_DIR, LM_FILENAME);
  if ((result.status ?? 1) !== 0 || !fs.existsSync(lmPath)) {
    const built = buildFromSource();
    if (!built || !fs.existsSync(lmPath)) {
      process.exit(result.status ?? 1);
    }
  }

  console.log('');
  console.log(`Repo-local Loom installed: ${lmPath}`);
  console.log('You can now run `pnpm loom:local ready` without a global `lm` or Rust toolchain.');
}

main();
