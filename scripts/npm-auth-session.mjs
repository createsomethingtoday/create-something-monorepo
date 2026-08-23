#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  unlinkSync,
  writeFileSync
} from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEFAULTS = Object.freeze({
  command: 'status',
  registry: 'https://registry.npmjs.org/',
  npmBin: 'npm',
  tokenEnv: 'NPM_TOKEN'
});

const COMMANDS = new Set(['status', 'save']);
const SCRIPT_CHECKOUT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function normalizeRegistry(value) {
  const registry = new URL(value);
  if (registry.protocol !== 'https:') {
    throw new Error('registry must use HTTPS');
  }
  registry.hash = '';
  registry.search = '';
  if (!registry.pathname.endsWith('/')) registry.pathname = `${registry.pathname}/`;
  return registry.toString();
}

function authKeyForRegistry(registryValue) {
  const registry = new URL(registryValue);
  return `//${registry.host}${registry.pathname}:_authToken`;
}

function defaultUserconfig() {
  return process.env.NPM_CONFIG_USERCONFIG || join(homedir(), '.npmrc');
}

export function parseArgs(argv) {
  const options = { ...DEFAULTS };
  const args = [...argv];

  if (args[0] && COMMANDS.has(args[0])) options.command = args.shift();

  while (args.length > 0) {
    const arg = args.shift();
    if (arg === '--') continue;
    if (!arg?.startsWith('--')) throw new Error(`Unexpected argument: ${arg}`);
    if (arg === '--json' || arg === '--verify') {
      options[arg.slice(2)] = true;
      continue;
    }

    const option = arg.slice(2);
    const equalsIndex = option.indexOf('=');
    const rawKey = equalsIndex === -1 ? option : option.slice(0, equalsIndex);
    const inlineValue = equalsIndex === -1 ? undefined : option.slice(equalsIndex + 1);
    const key = rawKey.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    const value = inlineValue ?? args.shift();
    if (!value) throw new Error(`Missing value for --${rawKey}`);
    if (!['userconfig', 'registry', 'npmBin', 'tokenEnv'].includes(key)) {
      throw new Error(`Unsupported option: --${rawKey}`);
    }
    options[key] = value;
  }

  options.registry = normalizeRegistry(options.registry);
  options.userconfig = resolve(options.userconfig || defaultUserconfig());
  return options;
}

function readConfig(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

function savedCredential(config, registry) {
  const key = authKeyForRegistry(registry);
  const line = config.split(/\r?\n/).find((entry) => entry.trimStart().startsWith(`${key}=`));
  const value = line?.slice(line.indexOf('=') + 1).trim() ?? '';

  return {
    status: value ? 'saved' : 'missing',
    storage: value ? 'userconfig' : 'none',
    valuePrinted: false
  };
}

function captureNpmIdentity(options) {
  const result = spawnSync(
    options.npmBin,
    ['whoami', '--json', `--registry=${options.registry}`, `--userconfig=${options.userconfig}`],
    { encoding: 'utf8', env: process.env }
  );
  if (result.status !== 0) return { status: 'invalid' };

  try {
    const parsed = JSON.parse((result.stdout || '').trim());
    const username = typeof parsed === 'string' ? parsed : parsed?.username;
    return username
      ? { status: 'verified', username }
      : { status: 'verified', username: 'unknown' };
  } catch {
    return { status: 'verified', username: 'unknown' };
  }
}

function statusNextActions(report, verify) {
  if (report.credential.status === 'missing') {
    return [
      'create a least-privilege granular npm token with publish bypass disabled',
      'save it once with pnpm npm:auth:save, then run pnpm npm:auth:status -- --verify --json'
    ];
  }
  if (verify && report.identity.status === 'invalid') {
    return [
      'replace the saved npm credential with a current least-privilege granular token',
      'do not treat npm login, a browser success page, or a saved token line as a verified session'
    ];
  }
  if (!verify) {
    return ['run pnpm npm:auth:status -- --verify --json before relying on saved npm auth'];
  }
  return [
    'routine npm CLI commands can reuse saved auth until the credential expires or is revoked',
    'npm trust and other account-governance actions may still require interactive 2FA; keep their receipts separate'
  ];
}

export function npmAuthStatus(options) {
  const credential = savedCredential(readConfig(options.userconfig), options.registry);
  const identity =
    options.verify && credential.status === 'saved'
      ? captureNpmIdentity(options)
      : { status: 'not_checked' };
  const report = {
    schema: 'create-something.npm-auth-session.v1',
    mode: 'status',
    ok: credential.status === 'saved' && (!options.verify || identity.status === 'verified'),
    registry: options.registry,
    userconfig: {
      path: options.userconfig,
      status: existsSync(options.userconfig) ? 'present' : 'missing'
    },
    credential,
    identity
  };
  report.nextActions = statusNextActions(report, Boolean(options.verify));
  return report;
}

function isPathInside(path, candidateParent) {
  const relativePath = relative(resolve(candidateParent), resolve(path));
  return relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath));
}

function canonicalPathForWrite(path) {
  let existingAncestor = resolve(path);
  const missingSegments = [];

  while (!existsSync(existingAncestor)) {
    const parent = dirname(existingAncestor);
    if (parent === existingAncestor) return resolve(path);
    missingSegments.unshift(basename(existingAncestor));
    existingAncestor = parent;
  }

  return resolve(realpathSync(existingAncestor), ...missingSegments);
}

function repositoryRoots() {
  const roots = new Set([
    canonicalPathForWrite(SCRIPT_CHECKOUT_ROOT),
    canonicalPathForWrite(process.cwd())
  ]);
  const result = spawnSync('git', ['rev-parse', '--show-toplevel'], {
    cwd: process.cwd(),
    encoding: 'utf8'
  });
  if (result.status === 0 && result.stdout.trim()) {
    roots.add(canonicalPathForWrite(result.stdout.trim()));
  }
  return [...roots];
}

function safeUserconfigPath(userconfig) {
  const configuredPath = resolve(userconfig);
  const canonicalPath = canonicalPathForWrite(configuredPath);

  if (existsSync(configuredPath) && lstatSync(configuredPath).isSymbolicLink()) {
    throw new Error('refusing to save npm credentials through a symbolic-link config');
  }
  if (repositoryRoots().some((root) => isPathInside(canonicalPath, root))) {
    throw new Error('refusing to save npm credentials inside the repository');
  }

  return canonicalPath;
}

function writeSavedCredential(options, token) {
  const userconfig = safeUserconfigPath(options.userconfig);

  const key = authKeyForRegistry(options.registry);
  const existingLines = readConfig(userconfig).split(/\r?\n/);
  const preserved = existingLines.filter((line) => !line.trimStart().startsWith(`${key}=`));
  while (preserved.at(-1) === '') preserved.pop();
  preserved.push(`${key}=${token}`);

  const directory = dirname(userconfig);
  const temporary = join(directory, `.${basename(userconfig)}.${process.pid}.${Date.now()}.tmp`);
  mkdirSync(directory, { recursive: true, mode: 0o700 });

  try {
    writeFileSync(temporary, `${preserved.join('\n')}\n`, { flag: 'wx', mode: 0o600 });
    chmodSync(temporary, 0o600);
    renameSync(temporary, userconfig);
  } catch (error) {
    if (existsSync(temporary)) unlinkSync(temporary);
    throw error;
  }
}

export function saveNpmAuth(options, env = process.env) {
  const token = env[options.tokenEnv];
  if (!token) {
    throw new Error(`a token must be provided through ${options.tokenEnv} in the environment`);
  }

  writeSavedCredential(options, token);
  return {
    schema: 'create-something.npm-auth-session.v1',
    mode: 'save',
    ok: true,
    registry: options.registry,
    userconfig: { path: options.userconfig, status: 'present' },
    credential: { status: 'saved', storage: 'userconfig', valuePrinted: false },
    nextActions: ['run pnpm npm:auth:status -- --verify --json to verify the saved credential']
  };
}

function formatReport(report, json) {
  if (json) return JSON.stringify(report);
  return [
    `npm auth: ${report.ok ? 'ready' : 'not ready'}`,
    `registry: ${report.registry}`,
    `credential: ${report.credential?.status ?? 'unknown'}`,
    `identity: ${report.identity?.status ?? 'not_checked'}`,
    ...report.nextActions.map((action) => `next: ${action}`)
  ].join('\n');
}

function safeFailure(options, error) {
  return {
    schema: 'create-something.npm-auth-session.v1',
    mode: options?.command ?? 'status',
    ok: false,
    credential: { status: 'unknown', valuePrinted: false },
    error: error instanceof Error ? error.message : 'npm auth session failed',
    nextActions: [
      'correct the saved-auth configuration without placing credentials in the repository'
    ]
  };
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
    const report = options.command === 'save' ? saveNpmAuth(options) : npmAuthStatus(options);
    process.stdout.write(`${formatReport(report, options.json)}\n`);
    process.exitCode = report.ok ? 0 : 1;
  } catch (error) {
    const report = safeFailure(options, error);
    process.stdout.write(
      `${formatReport(report, Boolean(options?.json || process.argv.includes('--json')))}\n`
    );
    process.exitCode = 1;
  }
}

main();
