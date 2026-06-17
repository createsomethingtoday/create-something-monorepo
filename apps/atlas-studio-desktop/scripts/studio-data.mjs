#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(SCRIPT_DIR, '../../..');
const ATLAS_HOME = path.join(
  os.homedir(),
  'Library',
  'Application Support',
  'CREATE SOMETHING',
  'Atlas Studio'
);
const CLI_PATH = path.join(
  WORKSPACE_ROOT,
  'packages',
  'interaction-atlas-mcp',
  'dist',
  'studio',
  'cli.js'
);

function printHelp() {
  console.log(`CREATE SOMETHING Atlas Studio app-data CLI

Usage:
  pnpm atlas:desktop:studio <atlas-studio-command> [...flags]

Examples:
  pnpm atlas:desktop:studio list
  pnpm atlas:desktop:studio observe --session SESSION_ID --suggest --text "client says approval is required"
  pnpm atlas:desktop:studio export --session SESSION_ID

Data:
  ${ATLAS_HOME}
`);
}

const args = process.argv.slice(2).filter((arg) => arg !== '--');
if (!args.length || args.includes('--help') || args.includes('-h')) {
  printHelp();
  process.exit(0);
}

if (!existsSync(CLI_PATH)) {
  const build = spawnSync('pnpm', ['--filter', '@create-something/interaction-atlas-mcp', 'build'], {
    cwd: WORKSPACE_ROOT,
    env: process.env,
    stdio: 'inherit'
  });

  if (build.status !== 0) {
    process.exit(build.status ?? 1);
  }
}

const child = spawn('node', [CLI_PATH, ...args], {
  cwd: WORKSPACE_ROOT,
  env: {
    ...process.env,
    CREATE_SOMETHING_ATLAS_HOME: ATLAS_HOME
  },
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
