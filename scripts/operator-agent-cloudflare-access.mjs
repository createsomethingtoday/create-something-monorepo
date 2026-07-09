#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

export const DEFAULTS = Object.freeze({
  hostname: 'operator-agent.createsomething.agency',
  tunnelName: 'create-something-operator-agent',
  origin: 'http://127.0.0.1:19932',
  sessionDuration: '12h',
  configPath: '.tmp/cloudflared/operator-agent.yml',
  infisicalEnv: 'prod',
  infisicalPath: '/operator-agent/local-gateway',
  infisicalIncludeImports: 'true',
  cloudflareSecretsPath: '/',
  accessAppName: 'CREATE SOMETHING Operator Agent Gateway',
  allowedEmail: 'micah@createsomething.io',
});

const COMMANDS = new Set([
  'check',
  'config',
  'preflight',
  'provision-access',
  'finalize',
  'store-token',
  'start',
  'status',
  'token-check',
]);
const REQUIRED_INFISICAL_SECRETS = ['OPERATOR_AGENT_GATEWAY_TOKEN', 'OPERATOR_AGENT_TUNNEL_TOKEN'];
export const CLOUDFLARE_ACCESS_TOKEN_NAMES = [
  'CLOUDFLARE_ACCESS_API_TOKEN',
  'CLOUDFLARE_ZERO_TRUST_API_TOKEN',
  'CLOUDFLARE_API_TOKEN',
];

export function selectCloudflareTokenName(secrets) {
  return CLOUDFLARE_ACCESS_TOKEN_NAMES.find((name) => Boolean(secrets?.[name])) ?? null;
}

export function provisionAccessNextActionsForCredentials(credentialsSummary, existing = null) {
  if (credentialsSummary?.canListApplications === false || credentialsSummary?.tokenName !== 'CLOUDFLARE_ACCESS_API_TOKEN') {
    return ['store CLOUDFLARE_ACCESS_API_TOKEN with Cloudflare Access Apps and Policies Write permission in Infisical'];
  }
  return existing
    ? ['run public preflight before routing DNS']
    : ['rerun with --apply to create the Access application, then run public preflight'];
}

export function tokenCheckNextActions(report) {
  const actions = [];
  if (report.credentials?.tokenProvided === false) {
    actions.push('provide CLOUDFLARE_ACCESS_API_TOKEN in the environment or Infisical root path before validating Access');
  }
  if (report.account?.ok === false) {
    actions.push('provide CLOUDFLARE_ACCOUNT_ID in the environment or Infisical root path before validating Access');
  }
  if (report.credentials?.tokenProvided && report.account?.ok && report.canListApplications === false) {
    actions.push('create or update CLOUDFLARE_ACCESS_API_TOKEN with Cloudflare Access Apps and Policies permission');
  }
  if (report.canListApplications === true) {
    if (report.credentials?.source !== 'infisical') {
      actions.push('store CLOUDFLARE_ACCESS_API_TOKEN in Infisical root path before public preflight');
    }
    actions.push('rerun pnpm operator-agent:access:preflight:public -- --json before routing DNS');
  }
  if (report.appExists === false && report.canListApplications === true) {
    actions.push('run pnpm operator-agent:access:provision before routing DNS');
  }
  return actions;
}

export function parseArgs(argv) {
  const result = { command: 'check', ...DEFAULTS };
  const args = [...argv];

  if (args[0] && COMMANDS.has(args[0])) {
    result.command = args.shift();
  }

  while (args.length > 0) {
    const arg = args.shift();
    if (arg === '--') continue;
    if (!arg?.startsWith('--')) throw new Error(`Unexpected argument: ${arg}`);
    if (arg === '--json') {
      result.json = true;
      continue;
    }
    if (arg === '--public') {
      result.public = true;
      continue;
    }
    if (arg === '--apply') {
      result.apply = true;
      continue;
    }

    const option = arg.slice(2);
    const equalsIndex = option.indexOf('=');
    const rawKey = equalsIndex === -1 ? option : option.slice(0, equalsIndex);
    const inlineValue = equalsIndex === -1 ? undefined : option.slice(equalsIndex + 1);
    const key = rawKey.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    const value = inlineValue ?? args.shift();
    if (!value) throw new Error(`Missing value for --${rawKey}`);

    if (
      ![
        'hostname',
        'tunnelName',
        'origin',
        'sessionDuration',
        'configPath',
        'infisicalEnv',
        'infisicalPath',
        'infisicalIncludeImports',
        'cloudflareSecretsPath',
        'accessAppName',
        'allowedEmail',
      ].includes(key)
    ) {
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
    if (!['http:', 'https:'].includes(parsedOrigin.protocol)) errors.push('origin must use http or https');
    if (!localHosts.has(parsedOrigin.hostname)) {
      errors.push('origin must stay bound to 127.0.0.1, localhost, or ::1');
    }
  }

  if (!/^([1-9]|1[0-9]|2[0-4])h$/.test(options.sessionDuration)) {
    errors.push('sessionDuration must be an hour value between 1h and 24h');
  }
  if (options.sessionDuration !== '12h') {
    errors.push('operator-agent Cloudflare Access policy must use the approved 12h session duration');
  }

  return errors;
}

export function buildTunnelConfig(options) {
  return [
    `tunnel: ${options.tunnelName}`,
    '',
    'ingress:',
    `  - hostname: ${options.hostname}`,
    `    service: ${options.origin}`,
    '    originRequest:',
    '      connectTimeout: 10s',
    '      noHappyEyeballs: true',
    '  - service: http_status:404',
    '',
  ].join('\n');
}

export function accessSummary(options) {
  return [
    `Hostname: ${options.hostname}`,
    `Tunnel: ${options.tunnelName}`,
    `Origin: ${options.origin}`,
    `Cloudflare Access session duration: ${options.sessionDuration}`,
    'Cloudflare Access allow policy: micah@createsomething.io only',
    'Origin process: pnpm operator-agent:gateway',
    'Gateway posture: bearer token for run endpoint; no write modes exposed',
  ];
}

export function buildAccessAppPayload(options) {
  return {
    name: options.accessAppName,
    domain: options.hostname,
    type: 'self_hosted',
    session_duration: options.sessionDuration,
    allowed_idps: [],
    auto_redirect_to_identity: false,
    policies: [
      {
        name: 'Allow operator identity',
        decision: 'allow',
        precedence: 1,
        include: [{ email: { email: options.allowedEmail } }],
      },
    ],
  };
}

function hasCommand(command) {
  return spawnSync('sh', ['-lc', `command -v ${command}`], { stdio: 'ignore' }).status === 0;
}

function capture(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 5,
    env: options.env ?? process.env,
  });
  return {
    ok: result.status === 0,
    exitCode: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function captureRepoPnpm(args, options = {}) {
  if (hasCommand('corepack')) {
    const result = capture('corepack', ['pnpm', ...args], options);
    if (result.ok) return result;
    if (!hasCommand('pnpm')) return result;
  }
  return capture('pnpm', args, options);
}

function summarizeError(result) {
  return (result.stderr || result.stdout || 'No output.').trim().split(/\r?\n/).slice(-3).join('\n');
}

export function parseInfisicalSecretNames(stdout) {
  const parsed = JSON.parse(stdout || '{}');
  if (Array.isArray(parsed)) {
    return parsed
      .map((entry) => entry?.key ?? entry?.secretKey ?? entry?.name)
      .filter((name) => typeof name === 'string' && name.length > 0);
  }
  if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.secrets)) return parseInfisicalSecretNames(JSON.stringify(parsed.secrets));
    return Object.keys(parsed);
  }
  return [];
}

function checkInfisicalSecrets(options) {
  if (!hasCommand('infisical')) {
    return {
      ok: false,
      env: options.infisicalEnv,
      path: options.infisicalPath,
      required: REQUIRED_INFISICAL_SECRETS,
      present: [],
      missing: REQUIRED_INFISICAL_SECRETS,
      error: 'infisical CLI is not installed',
    };
  }

  const result = capture('infisical', [
    'export',
    '--format=json',
    `--env=${options.infisicalEnv}`,
    `--path=${options.infisicalPath}`,
    `--include-imports=${options.infisicalIncludeImports}`,
  ]);
  if (!result.ok) {
    return {
      ok: false,
      env: options.infisicalEnv,
      path: options.infisicalPath,
      required: REQUIRED_INFISICAL_SECRETS,
      present: [],
      missing: REQUIRED_INFISICAL_SECRETS,
      error: summarizeError(result),
    };
  }

  let present = [];
  try {
    present = parseInfisicalSecretNames(result.stdout);
  } catch (error) {
    return {
      ok: false,
      env: options.infisicalEnv,
      path: options.infisicalPath,
      required: REQUIRED_INFISICAL_SECRETS,
      present: [],
      missing: REQUIRED_INFISICAL_SECRETS,
      error: `unable to parse Infisical export: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  const missing = REQUIRED_INFISICAL_SECRETS.filter((secret) => !present.includes(secret));
  return {
    ok: missing.length === 0,
    env: options.infisicalEnv,
    path: options.infisicalPath,
    required: REQUIRED_INFISICAL_SECRETS,
    present: REQUIRED_INFISICAL_SECRETS.filter((secret) => present.includes(secret)),
    missing,
  };
}

function checkTunnel(options) {
  if (!hasCommand('cloudflared')) {
    return { ok: false, tunnelName: options.tunnelName, error: 'cloudflared CLI is not installed' };
  }
  const result = capture('cloudflared', ['tunnel', 'list']);
  if (!result.ok) {
    return { ok: false, tunnelName: options.tunnelName, error: summarizeError(result) };
  }
  const exists = result.stdout.split(/\r?\n/).some((line) => line.includes(options.tunnelName));
  return {
    ok: exists,
    tunnelName: options.tunnelName,
    error: exists ? undefined : `Cloudflare tunnel ${options.tunnelName} was not found`,
  };
}

function checkWrangler() {
  if (!hasCommand('wrangler') && !hasCommand('pnpm') && !hasCommand('corepack')) {
    return { ok: false, error: 'wrangler or pnpm is not available' };
  }
  const result = hasCommand('corepack') || hasCommand('pnpm')
    ? captureRepoPnpm(['exec', 'wrangler', 'whoami'])
    : capture('wrangler', ['whoami']);
  return {
    ok: result.ok,
    error: result.ok ? undefined : summarizeError(result),
  };
}

function checkGatewayOrigin(options) {
  let parsed;
  try {
    parsed = new URL(options.origin);
  } catch {
    return { ok: false, origin: options.origin, error: 'origin is not a valid URL' };
  }
  const result = capture('curl', ['-fsS', '--max-time', '2', `${parsed.origin}/health`]);
  if (!result.ok) {
    return {
      ok: false,
      origin: options.origin,
      running: false,
      error: 'gateway health is not reachable locally; start with pnpm operator-agent:runtime:start-gateway',
    };
  }
  return { ok: true, origin: options.origin, running: true };
}

function checkCloudflareAccessApi(options) {
  if (!hasCommand('infisical')) {
    return { ok: false, error: 'infisical CLI is required to inspect Cloudflare Access API credentials' };
  }
  const script = `
const tokenNames = ['CLOUDFLARE_ACCESS_API_TOKEN', 'CLOUDFLARE_ZERO_TRUST_API_TOKEN', 'CLOUDFLARE_API_TOKEN'];
const tokenName = tokenNames.find((name) => process.env[name]);
const token = tokenName ? process.env[tokenName] : '';
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const hostname = process.env.OPERATOR_AGENT_ACCESS_HOSTNAME;
if (!token || !accountId) {
  console.log(JSON.stringify({ ok: false, tokenName: tokenName || null, error: 'missing Cloudflare Access API token or CLOUDFLARE_ACCOUNT_ID' }));
  process.exit(0);
}
const endpoints = [
  'https://api.cloudflare.com/client/v4/accounts/' + accountId + '/access/apps',
  'https://api.cloudflare.com/client/v4/accounts/' + accountId + '/zero_trust/access/applications',
];
const attempts = [];
for (const endpoint of endpoints) {
  const response = await fetch(endpoint, { headers: { authorization: 'Bearer ' + token } });
  const json = await response.json().catch(() => null);
  const apps = Array.isArray(json?.result) ? json.result : [];
  attempts.push({
    endpoint: endpoint.replace(accountId, '<account>'),
    status: response.status,
    success: Boolean(json?.success),
    errors: Array.isArray(json?.errors) ? json.errors.map((error) => ({ code: error.code, message: error.message })) : [],
    matchingApps: apps
      .filter((app) => app?.domain === hostname || app?.name === 'CREATE SOMETHING Operator Agent Gateway')
      .map((app) => ({ id: app.id, name: app.name, domain: app.domain, type: app.type })),
  });
}
const usable = attempts.find((attempt) => attempt.success);
const matchingApps = attempts.flatMap((attempt) => attempt.matchingApps || []);
console.log(JSON.stringify({
  ok: Boolean(usable && matchingApps.length > 0),
  tokenName,
  usingDedicatedAccessToken: tokenName === 'CLOUDFLARE_ACCESS_API_TOKEN',
  canListApplications: Boolean(usable),
  appExists: matchingApps.length > 0,
  matchingApps,
  attempts,
}));
`;
  const result = capture('infisical', [
    'run',
    `--env=${options.infisicalEnv}`,
    `--path=${options.cloudflareSecretsPath}`,
    `--include-imports=${options.infisicalIncludeImports}`,
    '--',
    'node',
    '--input-type=module',
    '-e',
    script,
  ], {
    env: {
      ...process.env,
      OPERATOR_AGENT_ACCESS_HOSTNAME: options.hostname,
    },
  });
  if (!result.ok) {
    return { ok: false, error: summarizeError(result) };
  }
  try {
    const parsed = JSON.parse(result.stdout.trim().split(/\r?\n/).at(-1) || '{}');
    return parsed;
  } catch (error) {
    return {
      ok: false,
      error: `unable to parse Cloudflare Access API check: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function checkPublicHostname(options) {
  const result = capture('cloudflared', ['tunnel', 'route', 'dns', '--help']);
  if (!result.ok) return { ok: false, hostname: options.hostname, error: 'cloudflared route command is unavailable' };
  const lookup = capture('sh', ['-lc', `dig +short ${options.hostname} || true`]);
  const records = lookup.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const routed = records.length > 0;
  return {
    ok: routed,
    hostname: options.hostname,
    records,
    error: routed ? undefined : `${options.hostname} does not resolve yet`,
  };
}

function parseInfisicalSecretMap(stdout) {
  const parsed = JSON.parse(stdout || '{}');
  if (Array.isArray(parsed)) {
    return Object.fromEntries(
      parsed
        .map((entry) => [entry?.key ?? entry?.secretKey ?? entry?.name, entry?.value ?? entry?.secretValue])
        .filter(([key, value]) => typeof key === 'string' && typeof value === 'string')
    );
  }
  if (parsed && typeof parsed === 'object') return parsed;
  return {};
}

function loadCloudflareAccountId(options, env = process.env) {
  if (env.CLOUDFLARE_ACCOUNT_ID) return { ok: true, source: 'env', accountId: env.CLOUDFLARE_ACCOUNT_ID };
  if (!hasCommand('infisical')) {
    return {
      ok: false,
      source: null,
      error: 'CLOUDFLARE_ACCOUNT_ID is not set and infisical CLI is not available',
    };
  }
  const result = capture('infisical', [
    'export',
    '--format=json',
    `--env=${options.infisicalEnv}`,
    `--path=${options.cloudflareSecretsPath}`,
    `--include-imports=${options.infisicalIncludeImports}`,
  ], {
    env,
  });
  if (!result.ok) {
    return { ok: false, source: 'infisical', error: summarizeError(result) };
  }
  try {
    const secrets = parseInfisicalSecretMap(result.stdout);
    if (secrets.CLOUDFLARE_ACCOUNT_ID) return { ok: true, source: 'infisical', accountId: secrets.CLOUDFLARE_ACCOUNT_ID };
    return { ok: false, source: 'infisical', error: 'CLOUDFLARE_ACCOUNT_ID is missing from Infisical root path' };
  } catch (error) {
    return {
      ok: false,
      source: 'infisical',
      error: `unable to parse Cloudflare account id: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function loadCloudflareAccessToken(options, env = process.env) {
  if (env.CLOUDFLARE_ACCESS_API_TOKEN) {
    return {
      ok: true,
      source: 'env',
      tokenName: 'CLOUDFLARE_ACCESS_API_TOKEN',
      token: env.CLOUDFLARE_ACCESS_API_TOKEN,
    };
  }
  if (!hasCommand('infisical')) {
    return {
      ok: false,
      source: null,
      tokenName: 'CLOUDFLARE_ACCESS_API_TOKEN',
      error: 'CLOUDFLARE_ACCESS_API_TOKEN is not set and infisical CLI is not available',
    };
  }
  const result = capture('infisical', [
    'export',
    '--format=json',
    `--env=${options.infisicalEnv}`,
    `--path=${options.cloudflareSecretsPath}`,
    `--include-imports=${options.infisicalIncludeImports}`,
  ], {
    env,
  });
  if (!result.ok) {
    return { ok: false, source: 'infisical', tokenName: 'CLOUDFLARE_ACCESS_API_TOKEN', error: summarizeError(result) };
  }
  try {
    const secrets = parseInfisicalSecretMap(result.stdout);
    if (secrets.CLOUDFLARE_ACCESS_API_TOKEN) {
      return {
        ok: true,
        source: 'infisical',
        tokenName: 'CLOUDFLARE_ACCESS_API_TOKEN',
        token: secrets.CLOUDFLARE_ACCESS_API_TOKEN,
      };
    }
    return {
      ok: false,
      source: 'infisical',
      tokenName: 'CLOUDFLARE_ACCESS_API_TOKEN',
      error: 'CLOUDFLARE_ACCESS_API_TOKEN is missing from Infisical root path',
    };
  } catch (error) {
    return {
      ok: false,
      source: 'infisical',
      tokenName: 'CLOUDFLARE_ACCESS_API_TOKEN',
      error: `unable to parse Cloudflare Access token: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function loadCloudflareCredentials(options) {
  const result = capture('infisical', [
    'export',
    '--format=json',
    `--env=${options.infisicalEnv}`,
    `--path=${options.cloudflareSecretsPath}`,
    `--include-imports=${options.infisicalIncludeImports}`,
  ]);
  if (!result.ok) return { ok: false, error: summarizeError(result) };
  try {
    const secrets = parseInfisicalSecretMap(result.stdout);
    const tokenName = selectCloudflareTokenName(secrets);
    const token = tokenName ? secrets[tokenName] : '';
    const accountId = secrets.CLOUDFLARE_ACCOUNT_ID;
    if (!token || !accountId) return { ok: false, error: 'missing Cloudflare token or account id in Infisical' };
    return { ok: true, token, tokenName, accountId };
  } catch (error) {
    return {
      ok: false,
      error: `unable to parse Cloudflare credentials: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function cloudflareRequest(credentials, method, endpoint, body) {
  const response = await fetch(`https://api.cloudflare.com/client/v4${endpoint}`, {
    method,
    headers: {
      authorization: `Bearer ${credentials.token}`,
      'content-type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await response.json().catch(() => null);
  return {
    ok: response.ok && Boolean(json?.success),
    status: response.status,
    result: json?.result,
    errors: Array.isArray(json?.errors) ? json.errors.map((error) => ({ code: error.code, message: error.message })) : [],
  };
}

export async function tokenCheck(options, env = process.env) {
  const tokenCredential = loadCloudflareAccessToken(options, env);
  const account = loadCloudflareAccountId(options, env);
  const accountSummary = { ok: account.ok, source: account.source, error: account.error };
  const baseReport = {
    generatedAt: new Date().toISOString(),
    mode: 'token-check',
    ok: false,
    hostname: options.hostname,
    accessAppName: options.accessAppName,
    credentials: {
      tokenName: 'CLOUDFLARE_ACCESS_API_TOKEN',
      tokenProvided: tokenCredential.ok,
      source: tokenCredential.source,
      usingEnvironmentToken: tokenCredential.source === 'env',
      tokenValuePrinted: false,
      error: tokenCredential.ok ? undefined : tokenCredential.error,
    },
    account: accountSummary,
    canListApplications: false,
    appExists: false,
    matchingApps: [],
    attempts: [],
  };

  if (!tokenCredential.ok || !account.ok) {
    return {
      ...baseReport,
      nextActions: tokenCheckNextActions(baseReport),
    };
  }

  const accountId = account.accountId;
  const credentials = { token: tokenCredential.token, tokenName: 'CLOUDFLARE_ACCESS_API_TOKEN', accountId };
  const endpoint = `/accounts/${accountId}/access/apps`;
  const list = await cloudflareRequest(credentials, 'GET', endpoint);
  const apps = Array.isArray(list.result) ? list.result : [];
  const matchingApps = apps
    .filter((app) => app?.domain === options.hostname || app?.name === options.accessAppName)
    .map((app) => ({ id: app.id, name: app.name, domain: app.domain, type: app.type }));
  const report = {
    ...baseReport,
    ok: list.ok,
    canListApplications: list.ok,
    appExists: matchingApps.length > 0,
    matchingApps,
    attempts: [
      {
        endpoint: endpoint.replace(accountId, '<account>'),
        status: list.status,
        success: list.ok,
        errors: list.errors,
      },
    ],
  };
  return {
    ...report,
    nextActions: tokenCheckNextActions(report),
  };
}

function envWithoutAccessToken(env) {
  const next = { ...env };
  delete next.CLOUDFLARE_ACCESS_API_TOKEN;
  return next;
}

export async function storeAccessToken(options, env = process.env) {
  const token = env.CLOUDFLARE_ACCESS_API_TOKEN;
  const baseReport = {
    generatedAt: new Date().toISOString(),
    mode: 'store-token',
    ok: false,
    tokenValuePrinted: false,
    infisical: {
      env: options.infisicalEnv,
      path: options.cloudflareSecretsPath,
      secretName: 'CLOUDFLARE_ACCESS_API_TOKEN',
    },
    nextActions: [],
  };

  if (!token) {
    return {
      ...baseReport,
      error: 'CLOUDFLARE_ACCESS_API_TOKEN must be provided in the environment; it is not accepted as a CLI argument',
      nextActions: ['export CLOUDFLARE_ACCESS_API_TOKEN in the shell, then rerun pnpm operator-agent:access:store-token -- --json'],
    };
  }

  if (!hasCommand('infisical')) {
    return {
      ...baseReport,
      error: 'infisical CLI is not installed',
      nextActions: ['install or authenticate Infisical before storing CLOUDFLARE_ACCESS_API_TOKEN'],
    };
  }

  const tempDir = mkdtempSync(join(tmpdir(), 'operator-agent-access-token-'));
  const envFile = join(tempDir, '.env');
  try {
    writeFileSync(envFile, `CLOUDFLARE_ACCESS_API_TOKEN=${token.replace(/\n/g, '')}\n`, { mode: 0o600 });
    chmodSync(envFile, 0o600);
    const setResult = capture('infisical', [
      'secrets',
      'set',
      `--env=${options.infisicalEnv}`,
      `--path=${options.cloudflareSecretsPath}`,
      '--type=shared',
      '--file',
      envFile,
      '--output=json',
    ], {
      env,
    });
    if (!setResult.ok) {
      return {
        ...baseReport,
        error: summarizeError(setResult),
        nextActions: ['inspect Infisical authentication or permissions, then rerun store-token'],
      };
    }

    const postStoreTokenCheck = await tokenCheck(options, envWithoutAccessToken(env));
    const ok = Boolean(postStoreTokenCheck.ok && postStoreTokenCheck.canListApplications);
    return {
      ...baseReport,
      ok,
      stored: true,
      tokenCheck: {
        ok: postStoreTokenCheck.ok,
        tokenProvided: postStoreTokenCheck.credentials?.tokenProvided,
        source: postStoreTokenCheck.credentials?.source,
        canListApplications: postStoreTokenCheck.canListApplications,
        appExists: postStoreTokenCheck.appExists,
        nextActions: postStoreTokenCheck.nextActions,
      },
      nextActions: ok
        ? ['run pnpm operator-agent:access:finalize -- --json']
        : postStoreTokenCheck.nextActions,
    };
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

export async function provisionAccess(options) {
  const payload = buildAccessAppPayload(options);
  const dryRun = !options.apply;
  const credentials = loadCloudflareCredentials(options);
  const plan = {
    application: {
      name: payload.name,
      domain: payload.domain,
      type: payload.type,
      sessionDuration: payload.session_duration,
      policy: {
        decision: payload.policies[0].decision,
        includeEmail: options.allowedEmail,
      },
    },
    dns: {
      hostname: options.hostname,
      tunnelName: options.tunnelName,
      action: 'route after Access application exists',
    },
  };

  if (!credentials.ok) {
    return {
      generatedAt: new Date().toISOString(),
      mode: 'provision-access',
      ok: false,
      dryRun,
      plan,
      credentials: { ok: false, error: credentials.error },
      actions: [],
      nextActions: ['store CLOUDFLARE_ACCESS_API_TOKEN with Cloudflare Access Apps and Policies Write permission in Infisical'],
    };
  }

  const list = await cloudflareRequest(credentials, 'GET', `/accounts/${credentials.accountId}/access/apps`);
  const existingApps = Array.isArray(list.result) ? list.result : [];
  const existing = existingApps.find((app) => app?.domain === options.hostname || app?.name === options.accessAppName);
  const credentialsSummary = {
    ok: list.ok,
    tokenName: credentials.tokenName,
    usingDedicatedAccessToken: credentials.tokenName === 'CLOUDFLARE_ACCESS_API_TOKEN',
    canListApplications: list.ok,
    listStatus: list.status,
    errors: list.errors,
  };

  if (!list.ok) {
    return {
      generatedAt: new Date().toISOString(),
      mode: 'provision-access',
      ok: false,
      dryRun,
      plan,
      credentials: credentialsSummary,
      actions: [],
      nextActions: provisionAccessNextActionsForCredentials(credentialsSummary),
    };
  }

  if (dryRun) {
    return {
      generatedAt: new Date().toISOString(),
      mode: 'provision-access',
      ok: true,
      dryRun,
      plan,
      credentials: credentialsSummary,
      existingApp: existing ? { id: existing.id, name: existing.name, domain: existing.domain, type: existing.type } : null,
      actions: existing ? ['Access application already exists; no create call needed'] : ['would create Access application with allow policy'],
      nextActions: provisionAccessNextActionsForCredentials(credentialsSummary, existing),
    };
  }

  let create = null;
  if (!existing) {
    create = await cloudflareRequest(credentials, 'POST', `/accounts/${credentials.accountId}/access/apps`, payload);
    if (!create.ok) {
      return {
        generatedAt: new Date().toISOString(),
        mode: 'provision-access',
        ok: false,
        dryRun,
        plan,
        credentials: credentialsSummary,
        actions: ['attempted Access application create'],
        create: { ok: false, status: create.status, errors: create.errors },
        nextActions: ['inspect Cloudflare Access API errors before routing DNS'],
      };
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    mode: 'provision-access',
    ok: true,
    dryRun,
    plan,
    credentials: credentialsSummary,
    existingApp: existing ? { id: existing.id, name: existing.name, domain: existing.domain, type: existing.type } : null,
    create: create
      ? {
          ok: true,
          id: create.result?.id,
          name: create.result?.name,
          domain: create.result?.domain,
          type: create.result?.type,
        }
      : null,
    actions: existing ? ['Access application already exists'] : ['created Access application with allow policy'],
    nextActions: ['run public preflight before routing DNS'],
  };
}

function runDoctorAudit() {
  const result = capture(process.execPath, ['scripts/operator-agent-doctor.mjs', '--public', '--json']);
  let report = null;
  try {
    report = JSON.parse(result.stdout || '{}');
  } catch {}
  return {
    ok: result.ok && Boolean(report),
    exitCode: result.exitCode,
    report,
    error: result.ok ? undefined : summarizeError(result),
  };
}

function summarizeFinalizeStep(id, report) {
  return {
    id,
    ok: Boolean(report?.ok),
    mode: report?.mode ?? id,
    nextActions: report?.nextActions ?? [],
  };
}

export async function finalizeAccess(options, env = process.env) {
  const dryRun = !options.apply;
  const steps = [];
  const token = await tokenCheck(options, env);
  steps.push({
    ...summarizeFinalizeStep('token-check', token),
    tokenProvided: token.credentials?.tokenProvided,
    tokenSource: token.credentials?.source,
    accountOk: token.account?.ok,
    canListApplications: token.canListApplications,
    appExists: token.appExists,
  });

  if (!token.ok) {
    return {
      generatedAt: new Date().toISOString(),
      mode: 'finalize-access',
      ok: false,
      dryRun,
      stoppedAt: 'token-check',
      steps,
      reports: { token },
      nextActions: token.nextActions,
    };
  }

  const provision = await provisionAccess(options);
  steps.push({
    ...summarizeFinalizeStep('provision-access', provision),
    dryRun: provision.dryRun,
    existingApp: Boolean(provision.existingApp),
    createdApp: Boolean(provision.create?.ok),
  });

  if (!provision.ok) {
    return {
      generatedAt: new Date().toISOString(),
      mode: 'finalize-access',
      ok: false,
      dryRun,
      stoppedAt: 'provision-access',
      steps,
      reports: { token, provision },
      nextActions: provision.nextActions,
    };
  }

  if (provision.dryRun && !provision.existingApp) {
    return {
      generatedAt: new Date().toISOString(),
      mode: 'finalize-access',
      ok: false,
      dryRun,
      stoppedAt: 'apply-required',
      steps,
      reports: { token, provision },
      nextActions: ['rerun pnpm operator-agent:access:finalize -- --apply --json to create the Access application, then rerun without --apply for proof'],
    };
  }

  const publicPreflight = preflight({ ...options, public: true });
  steps.push({
    ...summarizeFinalizeStep('public-preflight', publicPreflight),
    hostname: publicPreflight.hostname,
  });

  const doctor = runDoctorAudit();
  const completionVerdict = doctor.report?.summary?.completionVerdict ?? null;
  steps.push({
    id: 'doctor-audit',
    ok: Boolean(doctor.ok && completionVerdict === 'complete'),
    mode: doctor.report?.mode ?? 'doctor',
    completionVerdict,
    localReady: doctor.report?.localReady ?? null,
    publicReady: doctor.report?.publicReady ?? null,
    nextActions: doctor.report?.nextActions ?? [],
  });

  const ok = Boolean(publicPreflight.ok && doctor.ok && completionVerdict === 'complete');
  return {
    generatedAt: new Date().toISOString(),
    mode: 'finalize-access',
    ok,
    dryRun,
    stoppedAt: ok ? null : publicPreflight.ok ? 'doctor-audit' : 'public-preflight',
    steps,
    reports: {
      token,
      provision,
      publicPreflight,
      doctor: doctor.report
        ? {
            ok: doctor.report.ok,
            localReady: doctor.report.localReady,
            publicReady: doctor.report.publicReady,
            summary: doctor.report.summary,
            publicBlockers: doctor.report.publicBlockers,
            nextActions: doctor.report.nextActions,
          }
        : { ok: false, error: doctor.error },
    },
    nextActions: ok
      ? ['public operator-agent access is verified; keep patch/revise and direct memory write-back local-only']
      : [...new Set([...(publicPreflight.nextActions ?? []), ...(doctor.report?.nextActions ?? [])])],
  };
}

export function preflightNextActions(checks) {
  const actions = [];
  if (checks.config?.ok === false) actions.push('fix invalid operator-agent access config options');
  if (checks.commands?.cloudflared?.ok === false) actions.push('install cloudflared before tunnel setup');
  if (checks.commands?.infisical?.ok === false) actions.push('install infisical before secret-backed startup');
  if (checks.wrangler?.ok === false) actions.push('restore Wrangler authentication before managing Cloudflare Access resources');
  if (checks.tunnel?.ok === false) actions.push(`create Cloudflare tunnel ${checks.tunnel.tunnelName}`);
  if (checks.infisical?.ok === false) {
    actions.push('store or restore OPERATOR_AGENT_* secrets in Infisical at the configured env/path');
  }
  if (checks.gateway?.ok === false) actions.push('start the local gateway with pnpm operator-agent:runtime:start-gateway');
  if (checks.cloudflareAccess?.ok === false) {
    if (checks.cloudflareAccess.tokenName !== 'CLOUDFLARE_ACCESS_API_TOKEN' || checks.cloudflareAccess.canListApplications === false) {
      actions.push(
        'store CLOUDFLARE_ACCESS_API_TOKEN with Cloudflare Access Apps and Policies permission in Infisical before routing DNS'
      );
    } else {
      actions.push('create Cloudflare Access self-hosted app and allow policy before routing public DNS');
    }
  }
  if (checks.publicHostname?.ok === false) actions.push('route public hostname to the tunnel only after Cloudflare Access is verified');
  return actions;
}

export function preflight(options) {
  const configErrors = validateConfig(options);
  const checks = {
    config: { ok: configErrors.length === 0, errors: configErrors },
    commands: {
      cloudflared: { ok: hasCommand('cloudflared') },
      infisical: { ok: hasCommand('infisical') },
    },
    wrangler: checkWrangler(),
    tunnel: checkTunnel(options),
    infisical: checkInfisicalSecrets(options),
    gateway: checkGatewayOrigin(options),
  };
  if (options.public) {
    checks.cloudflareAccess = checkCloudflareAccessApi(options);
    checks.publicHostname = checkPublicHostname(options);
  }
  const ok = Object.values(checks).every((check) => {
    if ('ok' in check) return check.ok;
    return Object.values(check).every((nested) => nested.ok);
  });
  return {
    ok,
    generatedAt: new Date().toISOString(),
    hostname: options.hostname,
    tunnelName: options.tunnelName,
    origin: options.origin,
    infisical: {
      env: options.infisicalEnv,
      path: options.infisicalPath,
      requiredSecrets: REQUIRED_INFISICAL_SECRETS,
    },
    checks,
    nextActions: ok
      ? ['start tunnel with pnpm operator-agent:runtime:start-tunnel when public access is needed']
      : preflightNextActions(checks),
  };
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

function printReport(report, asJson) {
  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  console.log(`# operator-agent Cloudflare ${report.mode ?? 'preflight'}`);
  console.log(`Result: ${report.ok ? 'passed' : 'blocked'}`);
  if (report.dryRun !== undefined) console.log(`Dry run: ${report.dryRun ? 'yes' : 'no'}`);
  if (report.plan?.application) {
    console.log(`Application: ${report.plan.application.name}`);
    console.log(`Domain: ${report.plan.application.domain}`);
  }
  if (!report.checks) {
    if (report.nextActions?.length) {
      console.log('\nNext actions:');
      for (const action of report.nextActions) console.log(`- ${action}`);
    }
    return;
  }
  console.log(`Hostname: ${report.hostname}`);
  console.log(`Tunnel: ${report.tunnelName}`);
  console.log(`Origin: ${report.origin}`);
  for (const [name, check] of Object.entries(report.checks)) {
    if ('ok' in check) {
      console.log(`- ${name}: ${check.ok ? 'ok' : 'blocked'}`);
      if (check.error) console.log(`  ${check.error}`);
      if (check.missing?.length) console.log(`  missing: ${check.missing.join(', ')}`);
    } else {
      const nestedOk = Object.values(check).every((nested) => nested.ok);
      console.log(`- ${name}: ${nestedOk ? 'ok' : 'blocked'}`);
    }
  }
  if (!report.ok) {
    console.log('\nNext actions:');
    for (const action of report.nextActions) console.log(`- ${action}`);
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const errors = validateConfig(options);
  if (errors.length > 0) {
    for (const error of errors) console.error(`operator-agent:access: ${error}`);
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

  if (options.command === 'preflight') {
    const report = preflight(options);
    printReport({ mode: 'preflight', ...report }, options.json);
    process.exit(report.ok ? 0 : 1);
  }

  if (options.command === 'provision-access') {
    provisionAccess(options)
      .then((report) => {
        printReport(report, options.json);
        process.exit(report.ok ? 0 : 1);
      })
      .catch((error) => {
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      });
    return;
  }

  if (options.command === 'finalize') {
    finalizeAccess(options)
      .then((report) => {
        printReport(report, options.json);
        process.exit(report.ok ? 0 : 1);
      })
      .catch((error) => {
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      });
    return;
  }

  if (options.command === 'store-token') {
    storeAccessToken(options)
      .then((report) => {
        printReport(report, options.json);
        process.exit(report.ok ? 0 : 1);
      })
      .catch((error) => {
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      });
    return;
  }

  if (options.command === 'token-check') {
    tokenCheck(options)
      .then((report) => {
        printReport(report, options.json);
        process.exit(report.ok ? 0 : 1);
      })
      .catch((error) => {
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      });
    return;
  }

  if (!hasCommand('cloudflared')) {
    console.error('cloudflared is required. Install it with `brew install cloudflared` on macOS.');
    process.exit(1);
  }

  if (options.command === 'status') {
    process.exit(runCloudflared(['tunnel', 'info', options.tunnelName]));
  }

  const token = process.env.OPERATOR_AGENT_TUNNEL_TOKEN || process.env.CLOUDFLARED_TUNNEL_TOKEN;
  if (token) {
    process.exit(runCloudflared(['tunnel', '--no-autoupdate', 'run', '--token', token]));
  }

  const configPath = writeConfig(options);
  process.exit(runCloudflared(['tunnel', '--config', configPath, 'run', options.tunnelName]));
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main();
}
