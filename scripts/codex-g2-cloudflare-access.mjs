#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export const DEFAULTS = Object.freeze({
  hostname: 'codex-g2.createsomething.agency',
  tunnelName: 'create-something-codex-g2',
  origin: 'http://127.0.0.1:19931',
  protocol: 'http2',
  sessionDuration: '12h',
  configPath: '.tmp/cloudflared/codex-g2.yml'
});

const COMMANDS = new Set(['check', 'config', 'start', 'status']);

export function parseArgs(argv) {
  const result = { command: 'check', ...DEFAULTS };
  const args = [...argv];

  if (args[0] && COMMANDS.has(args[0])) {
    result.command = args.shift();
  }

  while (args.length > 0) {
    const arg = args.shift();
    if (!arg?.startsWith('--')) {
      throw new Error(`Unexpected argument: ${arg}`);
    }

    const option = arg.slice(2);
    const equalsIndex = option.indexOf('=');
    const rawKey = equalsIndex === -1 ? option : option.slice(0, equalsIndex);
    const inlineValue = equalsIndex === -1 ? undefined : option.slice(equalsIndex + 1);
    const key = rawKey.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    const value = inlineValue ?? args.shift();
    if (!value) {
      throw new Error(`Missing value for --${rawKey}`);
    }

    if (!['hostname', 'tunnelName', 'origin', 'sessionDuration', 'configPath'].includes(key)) {
      throw new Error(`Unsupported option: --${rawKey}`);
    }
    result[key] = value;
  }

  return result;
}

export function validateConfig(options) {
  const errors = [];

  if (!/^[a-z0-9][a-z0-9.-]+[a-z0-9]$/.test(options.hostname) || options.hostname.includes('..')) {
    errors.push('hostname must be a DNS hostname without a protocol or path');
  }

  if (!/^[a-z0-9][a-z0-9._-]+[a-z0-9]$/i.test(options.tunnelName)) {
    errors.push('tunnelName must be a named Cloudflare tunnel identifier');
  }

  let parsedOrigin;
  try {
    parsedOrigin = new URL(options.origin);
  } catch {
    errors.push('origin must be a valid http:// or https:// URL');
  }

  if (parsedOrigin) {
    const localHosts = new Set(['127.0.0.1', 'localhost', '[::1]']);
    if (!['http:', 'https:'].includes(parsedOrigin.protocol)) {
      errors.push('origin must use http or https');
    }
    if (!localHosts.has(parsedOrigin.hostname)) {
      errors.push('origin must stay bound to 127.0.0.1, localhost, or ::1');
    }
  }

  if (!/^([1-9]|1[0-9]|2[0-4])h$/.test(options.sessionDuration)) {
    errors.push('sessionDuration must be an hour value between 1h and 24h');
  }

  if (options.sessionDuration !== '12h') {
    errors.push('G2 all-day access policy must use the approved 12h session duration');
  }

  return errors;
}

export function buildTunnelConfig(options) {
  return [
    `tunnel: ${options.tunnelName}`,
    `protocol: ${options.protocol}`,
    '',
    'ingress:',
    `  - hostname: ${options.hostname}`,
    `    service: ${options.origin}`,
    '    originRequest:',
    '      connectTimeout: 10s',
    '      noHappyEyeballs: true',
    '  - service: http_status:404',
    ''
  ].join('\n');
}

export function accessSummary(options) {
  return [
    `Hostname: ${options.hostname}`,
    `Tunnel: ${options.tunnelName}`,
    `Tunnel transport: ${options.protocol}`,
    `Origin: ${options.origin}`,
    `Cloudflare Access session duration: ${options.sessionDuration}`,
    'Cloudflare Access allow policy: micah@createsomething.io only',
    'Cloudflare Access posture: deny by default, no bypass rule'
  ];
}

function hasCommand(command) {
  return spawnSync('sh', ['-lc', `command -v ${command}`], { stdio: 'ignore' }).status === 0;
}

function runCloudflared(args) {
  return spawnSync('cloudflared', args, { stdio: 'inherit' }).status ?? 1;
}

function writeConfig(options) {
  const target = resolve(process.cwd(), options.configPath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, buildTunnelConfig(options));
  return target;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const errors = validateConfig(options);
  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`codex:g2:access: ${error}`);
    }
    process.exit(1);
  }

  if (options.command === 'check') {
    console.log(accessSummary(options).join('\n'));
    if (!hasCommand('cloudflared')) {
      console.warn('cloudflared is not installed; install it before starting the tunnel replica.');
    }
    return;
  }

  if (options.command === 'config') {
    const target = writeConfig(options);
    console.log(`Wrote ${target}`);
    return;
  }

  if (!hasCommand('cloudflared')) {
    console.error('cloudflared is required. Install it with `brew install cloudflared` on macOS.');
    process.exit(1);
  }

  if (options.command === 'status') {
    process.exit(runCloudflared(['tunnel', 'info', options.tunnelName]));
  }

  const token = process.env.CLOUDFLARED_TUNNEL_TOKEN || process.env.CLOUDFLARE_TUNNEL_TOKEN;
  if (token) {
    process.exit(runCloudflared(['tunnel', '--no-autoupdate', 'run', '--token', token]));
  }

  const configPath = writeConfig(options);
  process.exit(runCloudflared(['tunnel', '--config', configPath, 'run', options.tunnelName]));
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main();
}
