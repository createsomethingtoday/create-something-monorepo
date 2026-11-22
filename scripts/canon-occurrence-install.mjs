#!/usr/bin/env node
// Prepare durable private snapshots; activation requires explicit --activate.
import {
  cpSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  realpathSync,
  existsSync,
  rmSync
} from 'node:fs';
import { resolve, join, dirname, basename } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { launchdPlist } from './canon-occurrence-runner.mjs';
const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function copyPackage(name, from, target, seen = new Set()) {
  if (seen.has(name)) return;
  seen.add(name);
  const req = createRequire(join(from, 'package.json'));
  let entry;
  try {
    entry = req.resolve(`${name}/package.json`);
  } catch {
    entry = req.resolve(name);
  }
  let root = dirname(realpathSync(entry));
  while (
    !existsSync(join(root, 'package.json')) ||
    JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).name !== name
  ) {
    const parent = dirname(root);
    if (parent === root) throw Error(`Package root unavailable: ${name}`);
    root = parent;
  }
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const destination = join(target, 'node_modules', name);
  mkdirSync(dirname(destination), { recursive: true, mode: 0o700 });
  cpSync(root, destination, {
    recursive: true,
    dereference: true,
    filter: (path) => basename(path) !== 'node_modules'
  });
  for (const dep of Object.keys(pkg.dependencies ?? {})) copyPackage(dep, root, target, seen);
}
export function prepare({ configPath, destination, root = sourceRoot, copyDependencies = true }) {
  destination = resolve(destination);
  configPath = resolve(configPath);
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  if (!/^[A-Za-z0-9_-]+$/.test(config.occurrenceId)) throw Error('Safe occurrenceId required');
  if (existsSync(destination)) throw Error('Snapshot destination must not exist');
  mkdirSync(destination, { recursive: true, mode: 0o700 });
  const runtime = join(destination, 'runtime');
  mkdirSync(runtime, { mode: 0o700 });
  for (const relative of [
    'scripts',
    'apps/create-something-scheduler/scripts',
    'apps/create-something-scheduler/docs'
  ]) {
    const folder = join(root, relative);
    if (!existsSync(folder)) continue;
    for (const name of readdirSync(folder).filter(
      (name) => name.startsWith('canon-') && !name.includes('.test.')
    )) {
      const out = join(runtime, relative, name);
      mkdirSync(dirname(out), { recursive: true, mode: 0o700 });
      cpSync(join(folder, name), out, { recursive: true, dereference: true });
    }
  }
  const font = 'packages/agency/static/fonts/agency-geist-latin.woff2';
  mkdirSync(dirname(join(runtime, font)), { recursive: true, mode: 0o700 });
  cpSync(join(root, font), join(runtime, font));
  if (copyDependencies)
    copyPackage('puppeteer-core', join(root, 'apps/create-something-scheduler'), runtime);
  const remap = (value) =>
    typeof value === 'string' && value.startsWith(root + '/')
      ? join(runtime, value.slice(root.length + 1))
      : value;
  for (const key of ['verifyCommand', 'joinCommand', 'postcallCommand']) {
    if (!Array.isArray(config[key])) throw Error(`${key} required`);
    config[key] = config[key].map(remap);
  }
  const installedConfig = join(destination, 'config.json');
  writeFileSync(installedConfig, JSON.stringify(config, null, 2) + '\n', { mode: 0o600 });
  const plists = [];
  for (const stage of ['join', 'postcall']) {
    const path = join(
      destination,
      `com.createsomething.canon.${config.occurrenceId}.${stage}.plist`
    );
    writeFileSync(
      path,
      launchdPlist({
        configPath: installedConfig,
        runnerPath: join(runtime, 'scripts/canon-occurrence-runner.mjs'),
        nodePath: process.execPath,
        stage,
        config
      }),
      { mode: 0o600 }
    );
    plists.push(path);
  }
  const receipt = {
    occurrenceId: config.occurrenceId,
    preparedAt: new Date().toISOString(),
    configPath: installedConfig,
    plists,
    runtime,
    humanStartsCapture: true
  };
  writeFileSync(join(destination, 'installation.json'), JSON.stringify(receipt, null, 2) + '\n', {
    mode: 0o600
  });
  return receipt;
}
export function activate(
  receipt,
  { agentsDirectory = join(homedir(), 'Library/LaunchAgents'), execute = spawnSync } = {}
) {
  mkdirSync(agentsDirectory, { recursive: true });
  for (const path of receipt.plists)
    if (existsSync(join(agentsDirectory, basename(path))))
      throw Error('Existing launch agent; inspect before replacing');
  const copied = [],
    attempted = [];
  try {
    for (const path of receipt.plists) {
      const target = join(agentsDirectory, basename(path));
      copied.push(target);
      cpSync(path, target);
      attempted.push(target);
      const result = execute('/bin/launchctl', ['bootstrap', `gui/${process.getuid()}`, target], {
        encoding: 'utf8'
      });
      if (result.error || result.status !== 0)
        throw Error(`launchctl bootstrap failed for ${basename(path)}`);
    }
  } catch (error) {
    const rollbackErrors = [];
    for (const target of attempted.reverse()) {
      try {
        const result = execute('/bin/launchctl', ['bootout', `gui/${process.getuid()}`, target], {
          encoding: 'utf8'
        });
        if (result.error) rollbackErrors.push(basename(target));
      } catch {
        rollbackErrors.push(basename(target));
      }
    }
    for (const target of copied) rmSync(target, { force: true });
    if (rollbackErrors.length)
      throw Error(`${error.message}; inspect rollback for ${rollbackErrors.join(', ')}`);
    throw error;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const [configPath, destination, ...flags] = process.argv.slice(2);
    if (!configPath || !destination)
      throw Error('Usage: canon-occurrence-install.mjs CONFIG DESTINATION [--activate]');
    const receipt = prepare({ configPath, destination });
    if (flags.includes('--activate')) activate(receipt);
    console.log(JSON.stringify({ ...receipt, activated: flags.includes('--activate') }));
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
