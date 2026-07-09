#!/usr/bin/env node

import { existsSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(SCRIPT_DIR, '../../..');
const ATLAS_HOME = path.join(
  os.homedir(),
  'Library',
  'Application Support',
  'CREATE SOMETHING',
  'Atlas Studio'
);
const PORTAL_PATH = path.join(
  WORKSPACE_ROOT,
  'packages',
  'interaction-atlas-mcp',
  'dist',
  'studio',
  'portal.js'
);

function printHelp() {
  console.log(`CREATE SOMETHING Atlas Studio browser portal

Usage:
  pnpm atlas:portal [--client "Client"] [--workflow "Workflow"] [--owner "Name"]
  pnpm atlas:portal --session SESSION_ID
  pnpm atlas:portal --restart
  pnpm atlas:portal --status
  pnpm atlas:portal --stop

This is the Codex-friendly launcher: it starts or reuses a detached local Atlas Studio
server, stores sessions in app data, and prints the URL to open in the Codex browser pane.

Data:
  ${ATLAS_HOME}
`);
}

function parseArgs(argv) {
  const flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (item === '--') continue;
    if (item === '--help' || item === '-h') {
      flags.help = true;
      continue;
    }
    if (!item?.startsWith('--')) continue;

    const key = item.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      flags[key] = true;
      continue;
    }

    flags[key] = next;
    index += 1;
  }
  return flags;
}

function stringFlag(flags, key, fallback = '') {
  const value = flags[key];
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function boolFlag(flags, key) {
  return flags[key] === true || flags[key] === 'true';
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

function ensureBuilt() {
  if (existsSync(PORTAL_PATH)) return;

  const build = spawnSync('pnpm', ['--filter', '@create-something/interaction-atlas-mcp', 'build'], {
    cwd: WORKSPACE_ROOT,
    env: packageManagerEnv(),
    stdio: 'inherit'
  });

  if (build.status !== 0) {
    process.exit(build.status ?? 1);
  }
}

function printReady(runtime, json = false) {
  if (json) {
    console.log(JSON.stringify(runtime, null, 2));
    return;
  }

  console.log('Atlas Studio browser portal ready');
  console.log(`URL: ${runtime.sessionUrl}`);
  console.log(`Session: ${runtime.sessionId}`);
  console.log(`Runtime: ${path.join(ATLAS_HOME, 'runtime.json')}`);
  console.log(`Log: ${path.join(ATLAS_HOME, 'server.log')}`);
  console.log(
    `Agent write example: pnpm atlas:desktop:studio observe --session ${runtime.sessionId} --suggest --text "client says..."`
  );
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));

  if (flags.help) {
    printHelp();
    return;
  }

  ensureBuilt();
  const portal = await import(pathToFileURL(PORTAL_PATH).href);

  if (boolFlag(flags, 'status')) {
    console.log(JSON.stringify(portal.getAtlasBrowserPortalStatus(), null, 2));
    return;
  }

  if (boolFlag(flags, 'stop')) {
    const result = portal.stopAtlasBrowserPortal();
    console.log(result.stopped ? 'Atlas Studio browser portal stopped' : 'No active Atlas Studio portal');
    return;
  }

  const runtime = await portal.startAtlasBrowserPortal({
    sessionId: stringFlag(flags, 'session') || undefined,
    client: stringFlag(flags, 'client') || undefined,
    workflow: stringFlag(flags, 'workflow') || undefined,
    owner: stringFlag(flags, 'owner') || undefined,
    restart: boolFlag(flags, 'restart'),
    cwd: WORKSPACE_ROOT
  });
  printReady(runtime, boolFlag(flags, 'json'));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
