#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { mkdirSync, openSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import { dirname } from 'node:path';
import process from 'node:process';

export const DEFAULTS = Object.freeze({
  infisicalEnv: 'prod',
  infisicalPath: '/operator-agent/local-gateway',
  gatewayPidPath: '.tmp/operator-agent-gateway.pid',
  gatewayLogPath: '.tmp/operator-agent-gateway.log',
  tunnelPidPath: '.tmp/operator-agent-tunnel.pid',
  tunnelLogPath: '.tmp/operator-agent-tunnel.log',
  gatewayHealthUrl: 'http://127.0.0.1:19932/health',
});

export const REQUIRED_GATEWAY_MODES = Object.freeze([
  'readiness',
  'profiles',
  'policy',
  'scout',
  'batch-eval',
  'pattern-review',
  'model-probe',
  'model-benchmark',
  'memory-proposal',
]);

export const FORBIDDEN_GATEWAY_MODES = Object.freeze(['patch', 'revise']);

const COMMANDS = new Set([
  'status',
  'start',
  'stop',
  'start-gateway',
  'stop-gateway',
  'start-tunnel',
  'stop-tunnel',
]);

export function parseArgs(argv) {
  const options = { command: 'status', json: false, ...DEFAULTS };
  const args = [...argv];
  if (args[0] && COMMANDS.has(args[0])) options.command = args.shift();

  while (args.length > 0) {
    const arg = args.shift();
    if (arg === '--') continue;
    if (arg === '--json') {
      options.json = true;
      continue;
    }
    if (!arg?.startsWith('--')) throw new Error(`Unexpected argument: ${arg}`);
    const option = arg.slice(2);
    const equalsIndex = option.indexOf('=');
    const rawKey = equalsIndex === -1 ? option : option.slice(0, equalsIndex);
    const inlineValue = equalsIndex === -1 ? undefined : option.slice(equalsIndex + 1);
    const key = rawKey.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    const value = inlineValue ?? args.shift();
    if (!value) throw new Error(`Missing value for --${rawKey}`);
    if (
      ![
        'infisicalEnv',
        'infisicalPath',
        'gatewayPidPath',
        'gatewayLogPath',
        'tunnelPidPath',
        'tunnelLogPath',
        'gatewayHealthUrl',
      ].includes(key)
    ) {
      throw new Error(`Unsupported option: --${rawKey}`);
    }
    options[key] = value;
  }

  return options;
}

export function serviceDefinitions(options) {
  const infisicalPrefix = [
    'infisical',
    'run',
    `--env=${options.infisicalEnv}`,
    `--path=${options.infisicalPath}`,
    '--include-imports=true',
    '--',
  ];
  return {
    gateway: {
      pidPath: options.gatewayPidPath,
      logPath: options.gatewayLogPath,
      command: [...infisicalPrefix, 'node', 'scripts/operator-agent-gateway.mjs'],
      healthUrl: options.gatewayHealthUrl,
      gatewayModePolicy: {
        required: REQUIRED_GATEWAY_MODES,
        forbidden: FORBIDDEN_GATEWAY_MODES,
      },
    },
    tunnel: {
      pidPath: options.tunnelPidPath,
      logPath: options.tunnelLogPath,
      command: [...infisicalPrefix, 'node', 'scripts/operator-agent-cloudflare-access.mjs', 'start'],
      healthUrl: null,
    },
  };
}

function readPid(pidPath) {
  try {
    const pid = Number(readFileSync(pidPath, 'utf8').trim());
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isPidRunning(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function checkHealth(url) {
  if (!url) return null;
  return new Promise((resolve) => {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      resolve({ ok: false, error: 'invalid health URL' });
      return;
    }
    const client = parsed.protocol === 'https:' ? https : http;
    const request = client.get(parsed, { timeout: 1000 }, (response) => {
      let text = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        text += chunk;
      });
      response.on('end', () => {
        let body = null;
        try {
          body = JSON.parse(text);
        } catch {}
        resolve({ ok: response.statusCode >= 200 && response.statusCode < 300, status: response.statusCode, body });
      });
    });
    request.on('timeout', () => {
      request.destroy(new Error('health check timed out'));
    });
    request.on('error', (error) => {
      resolve({ ok: false, error: error instanceof Error ? error.message : String(error) });
    });
  });
}

export function validateGatewayHealth(body, policy = { required: REQUIRED_GATEWAY_MODES, forbidden: FORBIDDEN_GATEWAY_MODES }) {
  const exposedModes = Array.isArray(body?.exposedModes) ? body.exposedModes : [];
  const missingModes = policy.required.filter((mode) => !exposedModes.includes(mode));
  const exposedForbiddenModes = policy.forbidden.filter((mode) => exposedModes.includes(mode));
  const writeModesExposed = body?.writeModesExposed === true;
  const blockers = [];
  if (missingModes.length > 0) blockers.push(`gateway is missing exposed modes: ${missingModes.join(', ')}`);
  if (exposedForbiddenModes.length > 0) blockers.push(`gateway exposes forbidden write modes: ${exposedForbiddenModes.join(', ')}`);
  if (writeModesExposed) blockers.push('gateway reports writeModesExposed=true');
  return {
    ok: blockers.length === 0,
    requiredModes: policy.required,
    forbiddenModes: policy.forbidden,
    exposedModes,
    missingModes,
    exposedForbiddenModes,
    writeModesExposed,
    blockers,
  };
}

async function serviceStatus(service) {
  const pid = readPid(service.pidPath);
  const health = await checkHealth(service.healthUrl);
  const gatewayPosture = service.gatewayModePolicy && health?.body ? validateGatewayHealth(health.body, service.gatewayModePolicy) : null;
  const effectiveHealth = gatewayPosture
    ? {
        ...health,
        ok: Boolean(health?.ok && gatewayPosture.ok),
        gatewayPosture,
      }
    : health;
  return {
    pid,
    running: isPidRunning(pid),
    pidPath: service.pidPath,
    logPath: service.logPath,
    health: effectiveHealth,
  };
}

function serviceReady(status, service) {
  if (!status.running) return false;
  if (!service.healthUrl) return true;
  return status.health?.ok === true;
}

async function waitForServiceStatus(service, { attempts = 20, delayMs = 150 } = {}) {
  let latest = await serviceStatus(service);
  for (let attempt = 0; attempt < attempts && !serviceReady(latest, service); attempt += 1) {
    await sleep(delayMs);
    latest = await serviceStatus(service);
  }
  return latest;
}

async function startService(name, service) {
  const current = await serviceStatus(service);
  if (current.running && serviceReady(current, service)) return { name, started: false, restarted: false, status: current };
  const restarted = current.running;
  if (restarted) await stopService(name, service);

  mkdirSync(dirname(service.pidPath), { recursive: true });
  mkdirSync(dirname(service.logPath), { recursive: true });
  const logFd = openSync(service.logPath, 'a');
  const child = spawn(service.command[0], service.command.slice(1), {
    cwd: process.cwd(),
    detached: true,
    stdio: ['ignore', logFd, logFd],
    env: { ...process.env, NO_COLOR: '1' },
  });
  child.unref();
  writeFileSync(service.pidPath, `${child.pid}\n`);
  return { name, started: true, restarted, status: await waitForServiceStatus(service) };
}

async function stopService(name, service) {
  const pid = readPid(service.pidPath);
  if (!pid || !isPidRunning(pid)) {
    try {
      unlinkSync(service.pidPath);
    } catch {}
    return { name, stopped: false, status: await serviceStatus(service) };
  }

  process.kill(pid, 'SIGTERM');
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await sleep(100);
    if (!isPidRunning(pid)) break;
  }
  if (isPidRunning(pid)) process.kill(pid, 'SIGKILL');
  try {
    unlinkSync(service.pidPath);
  } catch {}
  return { name, stopped: true, status: await serviceStatus(service) };
}

async function statusReport(services) {
  return {
    generatedAt: new Date().toISOString(),
    gateway: await serviceStatus(services.gateway),
    tunnel: await serviceStatus(services.tunnel),
  };
}

function print(report, asJson) {
  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  if (report.generatedAt) {
    console.log('# operator-agent-runtime');
    console.log(`Gateway: ${report.gateway.running ? 'running' : 'stopped'}${report.gateway.pid ? ` (${report.gateway.pid})` : ''}`);
    console.log(`Gateway health: ${report.gateway.health?.ok ? 'ok' : 'blocked'}`);
    console.log(`Tunnel: ${report.tunnel.running ? 'running' : 'stopped'}${report.tunnel.pid ? ` (${report.tunnel.pid})` : ''}`);
    return;
  }
  console.log(JSON.stringify(report, null, 2));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const services = serviceDefinitions(options);
  let report;
  if (options.command === 'status') report = await statusReport(services);
  else if (options.command === 'start-gateway') report = await startService('gateway', services.gateway);
  else if (options.command === 'stop-gateway') report = await stopService('gateway', services.gateway);
  else if (options.command === 'start-tunnel') report = await startService('tunnel', services.tunnel);
  else if (options.command === 'stop-tunnel') report = await stopService('tunnel', services.tunnel);
  else if (options.command === 'start') {
    report = {
      gateway: await startService('gateway', services.gateway),
      tunnel: await startService('tunnel', services.tunnel),
    };
  } else if (options.command === 'stop') {
    report = {
      tunnel: await stopService('tunnel', services.tunnel),
      gateway: await stopService('gateway', services.gateway),
    };
  }
  print(report, options.json);
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
