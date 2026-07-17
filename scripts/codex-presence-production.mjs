#!/usr/bin/env node

import { randomBytes } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const root = resolve(dirname(scriptPath), '..');
const runtimeDir = resolve(root, '.tmp/codex-presence-production');
const runtimePath = resolve(runtimeDir, 'runtime.json');
const logPath = resolve(runtimeDir, 'presence.log');
const launchLabel = 'agency.createsomething.codex-presence';
const publicOrigin = 'https://codex-g2.createsomething.agency';
const localOrigin = 'http://127.0.0.1:19931';
const staticDir = resolve(root, 'apps/even-codex-presence/dist');
const packagePath = resolve(root, 'apps/even-codex-presence/even-codex-presence.ehpk');
const infisicalBinary = existsSync('/opt/homebrew/bin/infisical')
  ? '/opt/homebrew/bin/infisical'
  : 'infisical';
const command = process.argv[2] || 'status';

if (!new Set(['start', 'status', 'stop', 'qr', 'daemon']).has(command)) {
  throw new Error('Usage: codex-presence-production.mjs <start|status|stop|qr>');
}

if (command === 'start') await start();
if (command === 'status') await status();
if (command === 'stop') await stop();
if (command === 'qr') await qr();
if (command === 'daemon') await daemon();

async function start() {
  if (await health()) {
    throw new Error(`Codex Presence is already running on ${localOrigin}.`);
  }
  if (jobLoaded()) removeJob();
  if (!existsSync(resolve(staticDir, 'index.html'))) {
    throw new Error(
      'Build the Even client before starting production (`pnpm --filter @create-something/even-codex-presence build`).'
    );
  }

  mkdirSync(runtimeDir, { recursive: true, mode: 0o700 });
  const secretName =
    process.env.CODEX_PRESENCE_OPENAI_SECRET_NAME?.trim() || 'WEBFLOW_OPENAI_API_KEY';
  const pairingToken = randomBytes(32).toString('base64url');
  const installUrl = `${publicOrigin}/?service=${encodeURIComponent(publicOrigin)}&token=${encodeURIComponent(pairingToken)}`;

  const runtime = {
    version: 2,
    startedAt: new Date().toISOString(),
    localOrigin,
    publicOrigin,
    staticDir,
    packagePath,
    secretName,
    pairingToken,
    installUrl
  };
  writePrivateJson(runtimePath, runtime);
  writeFileSync(logPath, '', { flag: 'a', mode: 0o600 });
  chmodSync(logPath, 0o600);

  const submitted = spawnSync(
    'launchctl',
    [
      'submit',
      '-l',
      launchLabel,
      '-o',
      logPath,
      '-e',
      logPath,
      '--',
      process.execPath,
      scriptPath,
      'daemon'
    ],
    { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' }
  );
  if (submitted.status !== 0) {
    rmSync(runtimePath, { force: true });
    throw new Error('Could not register Codex Presence with the macOS user launch service.');
  }

  if (!(await waitForHealth())) {
    removeJob();
    rmSync(runtimePath, { force: true });
    throw new Error(`Codex Presence did not become healthy. Inspect ${logPath}.`);
  }
  console.log(`Codex Presence production origin is healthy at ${localOrigin}.`);
  console.log(`Private runtime receipt: ${runtimePath}`);
}

async function status() {
  const registered = jobLoaded();
  const healthy = registered && (await health());
  console.log(`Launch service: ${registered ? 'registered' : 'stopped'}`);
  console.log(`Health: ${healthy ? 'healthy' : 'unavailable'}`);
  console.log(`Local origin: ${localOrigin}`);
  console.log(`Public origin: ${publicOrigin}`);
  console.log(`Runtime receipt: ${runtimePath}`);
  process.exitCode = healthy ? 0 : 1;
}

async function stop() {
  if (!jobLoaded() && !(await health())) {
    rmSync(runtimePath, { force: true });
    console.log('Codex Presence is already stopped.');
    return;
  }
  removeJob();
  for (let attempt = 0; attempt < 20 && (await health()); attempt += 1) {
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  rmSync(runtimePath, { force: true });
  console.log('Codex Presence production process stopped and its pairing receipt was removed.');
}

async function qr() {
  const runtime = readRuntime();
  if (!runtime || !(await health()))
    throw new Error('Start Codex Presence before opening its install QR.');
  const result = spawnSync(
    'pnpm',
    [
      '--filter',
      '@create-something/even-codex-presence',
      'exec',
      'evenhub',
      'qr',
      '--url',
      runtime.installUrl,
      '--external'
    ],
    { cwd: root, stdio: 'ignore' }
  );
  if (result.status !== 0) throw new Error('Even Hub could not open the install QR.');
}

async function daemon() {
  const runtime = readRuntime();
  if (!runtime?.pairingToken || !runtime?.secretName) {
    throw new Error('The private Codex Presence runtime receipt is missing or invalid.');
  }
  const apiKey = loadInfisicalSecret(runtime.secretName);
  const child = spawn(
    resolve(root, 'node_modules/.bin/tsx'),
    [resolve(root, 'packages/codex-presence/src/cli.ts')],
    {
      cwd: root,
      env: {
        ...process.env,
        PATH: `${dirname(process.execPath)}:/opt/homebrew/bin:/usr/bin:/bin`,
        OPENAI_API_KEY: apiKey,
        CODEX_PRESENCE_TOKEN: runtime.pairingToken,
        CODEX_PRESENCE_PORT: '19931',
        CODEX_PRESENCE_ORIGIN: publicOrigin,
        CODEX_PRESENCE_STATIC_DIR: staticDir
      },
      stdio: 'inherit'
    }
  );
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => child.kill(signal));
  }
  process.exitCode = await new Promise((resolveExit) => {
    child.once('exit', (code) => resolveExit(code ?? 1));
  });
}

function loadInfisicalSecret(secretName) {
  const environment = process.env.CODEX_PRESENCE_INFISICAL_ENV?.trim() || 'prod';
  const secretPath = process.env.CODEX_PRESENCE_INFISICAL_PATH?.trim() || '/';
  const result = spawnSync(
    infisicalBinary,
    [
      'secrets',
      'get',
      secretName,
      `--env=${environment}`,
      `--path=${secretPath}`,
      '--include-imports=true',
      '--plain',
      '--silent'
    ],
    { cwd: root, encoding: 'utf8', env: process.env, stdio: ['ignore', 'pipe', 'pipe'] }
  );
  if (result.status !== 0) throw new Error(`Could not load Infisical secret ${secretName}.`);
  const value = result.stdout.trim();
  if (!value || value.includes('\n'))
    throw new Error(`Infisical secret ${secretName} did not contain one value.`);
  return value;
}

function readRuntime() {
  try {
    return JSON.parse(readFileSync(runtimePath, 'utf8'));
  } catch {
    return null;
  }
}

function writePrivateJson(path, value) {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  chmodSync(path, 0o600);
}

function jobLoaded() {
  return (
    spawnSync('launchctl', ['print', `gui/${process.getuid()}/${launchLabel}`], { stdio: 'ignore' })
      .status === 0
  );
}

function removeJob() {
  spawnSync('launchctl', ['remove', launchLabel], { stdio: 'ignore' });
}

async function health() {
  try {
    const response = await fetch(`${localOrigin}/v1/health`, {
      signal: AbortSignal.timeout(1_000)
    });
    const value = await response.json();
    return response.ok && value?.ok === true && value?.service === 'codex-presence';
  } catch {
    return false;
  }
}

async function waitForHealth() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (await health()) return true;
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }
  return false;
}
