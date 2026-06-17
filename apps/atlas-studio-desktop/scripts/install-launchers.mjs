#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { chmod, cp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(SCRIPT_DIR, '../../..');
const DEFAULT_APP_NAME = 'Atlas Studio';
const DEFAULT_COMMAND_NAME = 'atlas-studio';

function printHelp() {
  console.log(`CREATE SOMETHING Atlas Studio launcher installer

Usage:
  pnpm atlas:desktop:install-launchers [--app-name "Atlas Studio"] [--command-name atlas-studio]

Installs:
  ~/Applications/Atlas Studio.app
  ~/.local/bin/atlas-studio
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

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: WORKSPACE_ROOT,
    encoding: 'utf8',
    stdio: 'pipe'
  });

  if (result.status !== 0) {
    const detail = result.stderr?.trim() || result.stdout?.trim() || `exit ${result.status}`;
    throw new Error(`${command} ${args.join(' ')} failed: ${detail}`);
  }
}

async function installCommandShim(binPath, appPath) {
  await mkdir(path.dirname(binPath), { recursive: true });
  await writeFile(binPath, `#!/bin/sh\nexec /usr/bin/open ${shellQuote(appPath)}\n`, 'utf8');
  await chmod(binPath, 0o755);
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  if (flags.help) {
    printHelp();
    return;
  }

  const home = os.homedir();
  const appName = stringFlag(flags, 'app-name', DEFAULT_APP_NAME);
  const commandName = stringFlag(flags, 'command-name', DEFAULT_COMMAND_NAME);
  const dryRun = flags['dry-run'] === true || flags['dry-run'] === 'true';
  const appPath = path.join(home, 'Applications', `${appName}.app`);
  const binPath = path.join(home, '.local/bin', commandName);
  const builtAppPath = path.join(
    WORKSPACE_ROOT,
    'apps',
    'atlas-studio-desktop',
    'src-tauri',
    'target',
    'debug',
    'bundle',
    'macos',
    'Atlas Studio.app'
  );

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          workspaceRoot: WORKSPACE_ROOT,
          builtAppPath,
          appPath,
          binPath,
          terminalCommand: commandName
        },
        null,
        2
      )
    );
    return;
  }

  run('pnpm', ['--filter', '@create-something/interaction-atlas-mcp', 'build']);
  run('pnpm', [
    '--filter',
    '@create-something/atlas-studio-desktop',
    'exec',
    'tauri',
    'build',
    '--debug',
    '--bundles',
    'app',
    '--no-sign'
  ]);

  await mkdir(path.dirname(appPath), { recursive: true });
  await rm(appPath, { force: true, recursive: true });
  await cp(builtAppPath, appPath, { recursive: true });
  await installCommandShim(binPath, appPath);

  console.log(`Installed ${appPath}`);
  console.log(`Installed ${binPath}`);
  console.log(`Terminal command: ${commandName}`);
  console.log('If the command is not found, add ~/.local/bin to your PATH.');
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
