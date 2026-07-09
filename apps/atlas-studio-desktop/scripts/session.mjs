#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(SCRIPT_DIR, '../../..');

function printHelp() {
  console.log(`CREATE SOMETHING Atlas Studio Desktop

Usage:
  pnpm atlas:desktop:session

This launches the Tauri desktop app from the repo root. The app starts the local Atlas Studio
server internally and stores sessions in:
  ~/Library/Application Support/CREATE SOMETHING/Atlas Studio

For agent or terminal mutations against the desktop app data, use:
  pnpm atlas:desktop:studio observe --session SESSION_ID --suggest --text "client says..."
`);
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  printHelp();
  process.exit(0);
}

function packageManagerEnv() {
  const nvmVersionsDir = path.join(os.homedir(), '.nvm', 'versions', 'node');
  const nvmBinDirs = existsSync(nvmVersionsDir)
    ? readdirSync(nvmVersionsDir)
        .map((version) => path.join(nvmVersionsDir, version, 'bin'))
        .filter((binDir) => existsSync(path.join(binDir, 'pnpm')))
        .sort()
        .reverse()
    : [];
  const pathPrefix = [...nvmBinDirs, '/opt/homebrew/bin', '/usr/local/bin'].filter(Boolean);

  return {
    ...process.env,
    PATH: [...pathPrefix, process.env.PATH || ''].join(':')
  };
}

const child = spawn('pnpm', ['--filter', '@create-something/atlas-studio-desktop', 'dev'], {
  cwd: WORKSPACE_ROOT,
  env: packageManagerEnv(),
  stdio: 'inherit'
});

child.once('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

child.once('error', (error) => {
  console.error(error.message);
  process.exit(1);
});
