#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const DEFAULT_HEALTH_TIMEOUT_MS = 90_000;
const DEFAULT_PROVIDER_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_POLL_MS = 5_000;
const DEFAULT_INFISICAL_ENV = 'prod';
const DEFAULT_TOKEN_ENV = 'WEBFLOW_SITE_ANALYZER_MCP_API_KEY';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(scriptDir, '..');
const workspaceRoot = path.resolve(packageRoot, '..', '..');
const remoteRoot = path.join(packageRoot, 'workers', 'remote');
const wranglerConfigPath = path.join(remoteRoot, 'wrangler.jsonc');

function parseArgs(argv) {
  const args = {
    baseUrl: undefined,
    healthUrl: undefined,
    mcpUrl: undefined,
    token: undefined,
    tokenEnv: DEFAULT_TOKEN_ENV,
    infisicalEnv: DEFAULT_INFISICAL_ENV,
    healthTimeoutMs: DEFAULT_HEALTH_TIMEOUT_MS,
    providerTimeoutMs: DEFAULT_PROVIDER_TIMEOUT_MS,
    maxAttempts: DEFAULT_MAX_ATTEMPTS,
    pollMs: DEFAULT_POLL_MS,
    skipProviderCheck: false,
    json: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === '--') {
      continue;
    }

    if (arg === '--base-url' && next) {
      args.baseUrl = next;
      i += 1;
      continue;
    }
    if (arg === '--health-url' && next) {
      args.healthUrl = next;
      i += 1;
      continue;
    }
    if (arg === '--mcp-url' && next) {
      args.mcpUrl = next;
      i += 1;
      continue;
    }
    if (arg === '--token' && next) {
      args.token = next;
      i += 1;
      continue;
    }
    if (arg === '--token-env' && next) {
      args.tokenEnv = next;
      i += 1;
      continue;
    }
    if (arg === '--infisical-env' && next) {
      args.infisicalEnv = next;
      i += 1;
      continue;
    }
    if (arg === '--health-timeout-ms' && next) {
      args.healthTimeoutMs = Number.parseInt(next, 10);
      i += 1;
      continue;
    }
    if (arg === '--provider-timeout-ms' && next) {
      args.providerTimeoutMs = Number.parseInt(next, 10);
      i += 1;
      continue;
    }
    if (arg === '--max-attempts' && next) {
      args.maxAttempts = Number.parseInt(next, 10);
      i += 1;
      continue;
    }
    if (arg === '--poll-ms' && next) {
      args.pollMs = Number.parseInt(next, 10);
      i += 1;
      continue;
    }
    if (arg === '--skip-provider-check') {
      args.skipProviderCheck = true;
      continue;
    }
    if (arg === '--json') {
      args.json = true;
      continue;
    }
    if (arg === '--help') {
      printUsage();
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function printUsage() {
  console.log(`Usage:
  node packages/webflow-site-analyzer-mcp/scripts/ready-remote-runtime.mjs [options]

Options:
  --base-url <url>              Override remote worker base URL.
  --health-url <url>            Override health endpoint URL.
  --mcp-url <url>               Override MCP endpoint URL.
  --token <value>               Provide API token directly.
  --token-env <name>            Token env/Infisical secret name (default: ${DEFAULT_TOKEN_ENV}).
  --infisical-env <name>        Infisical environment to query (default: ${DEFAULT_INFISICAL_ENV}).
  --health-timeout-ms <ms>      Per-request timeout for health checks.
  --provider-timeout-ms <ms>    Per-request timeout for provider-status check.
  --max-attempts <n>            Health-check retry attempts.
  --poll-ms <ms>                Delay between health retries.
  --skip-provider-check         Skip authenticated MCP validation.
  --json                        Emit a single JSON summary object.
`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseConfigName() {
  const raw = fs.readFileSync(wranglerConfigPath, 'utf8');
  const parsed = JSON.parse(raw);
  if (!parsed?.name || typeof parsed.name !== 'string') {
    throw new Error(`Unable to read worker name from ${wranglerConfigPath}`);
  }
  return parsed.name;
}

function buildUrls(args) {
  const baseUrl = args.baseUrl || `https://${parseConfigName()}.createsomething.workers.dev`;
  return {
    baseUrl,
    healthUrl: args.healthUrl || new URL('/health', `${baseUrl}/`).toString(),
    mcpUrl: args.mcpUrl || new URL('/mcp', `${baseUrl}/`).toString(),
  };
}

function resolveTokenFromEnv(tokenEnv) {
  const direct = process.env[tokenEnv]?.trim();
  if (direct) {
    return { token: direct, source: `env:${tokenEnv}` };
  }

  const fallback = process.env.MCP_API_KEY?.trim();
  if (fallback) {
    return { token: fallback, source: 'env:MCP_API_KEY' };
  }

  return null;
}

function resolveTokenFromInfisical(tokenEnv, infisicalEnv) {
  if (!fs.existsSync(path.join(workspaceRoot, '.infisical.json'))) {
    return null;
  }

  const candidateNames = tokenEnv === 'MCP_API_KEY'
    ? ['MCP_API_KEY', DEFAULT_TOKEN_ENV]
    : [tokenEnv, 'MCP_API_KEY'];

  for (const secretName of candidateNames) {
    const result = spawnSync(
      'infisical',
      ['secrets', 'get', secretName, '--plain', '--env', infisicalEnv],
      {
        cwd: workspaceRoot,
        encoding: 'utf8',
        env: process.env,
      }
    );

    if (result.status === 0) {
      const token = result.stdout.trim();
      if (token) {
        return { token, source: `infisical:${secretName}@${infisicalEnv}` };
      }
    }
  }

  return null;
}

function resolveToken(args) {
  if (args.token?.trim()) {
    return { token: args.token.trim(), source: 'arg:token' };
  }

  return (
    resolveTokenFromEnv(args.tokenEnv)
    || resolveTokenFromInfisical(args.tokenEnv, args.infisicalEnv)
    || null
  );
}

async function fetchJson(url, init, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${text.slice(0, 400)}`);
    }
    return JSON.parse(text);
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForHealth(healthUrl, maxAttempts, pollMs, timeoutMs) {
  const startedAtMs = Date.now();
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const health = await fetchJson(healthUrl, {}, timeoutMs);
      return {
        attempt,
        elapsedMs: Date.now() - startedAtMs,
        payload: health,
      };
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        console.error(
          `[ready-remote-runtime] health attempt ${attempt}/${maxAttempts} failed: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        await sleep(pollMs);
      }
    }
  }

  throw new Error(
    `Remote analyzer health check failed after ${maxAttempts} attempts: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}

async function getProviderStatus(mcpUrl, token, timeoutMs) {
  const payload = {
    jsonrpc: '2.0',
    id: 'remote-readiness-provider-status',
    method: 'tools/call',
    params: {
      name: 'get_provider_status',
      arguments: {},
    },
  };

  const response = await fetchJson(
    mcpUrl,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify(payload),
    },
    timeoutMs
  );

  const text = response?.result?.content?.find?.((item) => item?.type === 'text')?.text;
  if (!text) {
    throw new Error('get_provider_status returned no text payload');
  }

  return JSON.parse(text);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const urls = buildUrls(args);
  const startedAtMs = Date.now();

  const health = await waitForHealth(
    urls.healthUrl,
    args.maxAttempts,
    args.pollMs,
    args.healthTimeoutMs
  );

  if (health.payload?.templateReview?.browserAutomationSupported !== true) {
    throw new Error('Remote analyzer health reports browser-backed template review is unsupported.');
  }

  const tokenInfo = args.skipProviderCheck ? null : resolveToken(args);
  let providerCheck;

  if (args.skipProviderCheck) {
    providerCheck = {
      checked: false,
      skipped: true,
      reason: 'skip-provider-check flag set',
    };
  } else if (!tokenInfo) {
    providerCheck = {
      checked: false,
      skipped: true,
      reason: 'no API token available for get_provider_status',
    };
  } else {
    const providerStartedAtMs = Date.now();
    const providerStatus = await getProviderStatus(
      urls.mcpUrl,
      tokenInfo.token,
      args.providerTimeoutMs
    );

    if (providerStatus.isHealthy !== true) {
      throw new Error(`Provider status reported unhealthy active provider: ${providerStatus.provider}`);
    }

    providerCheck = {
      checked: true,
      skipped: false,
      elapsedMs: Date.now() - providerStartedAtMs,
      tokenSource: tokenInfo.source,
      provider: providerStatus.provider,
      isHealthy: providerStatus.isHealthy,
      mode: providerStatus.mode,
    };
  }

  const result = {
    ready: true,
    elapsedMs: Date.now() - startedAtMs,
    urls,
    health: {
      attempt: health.attempt,
      elapsedMs: health.elapsedMs,
      transport: health.payload.transport,
      browserAutomationSupported: health.payload?.templateReview?.browserAutomationSupported ?? null,
      authConfigured: health.payload?.auth?.configured ?? null,
    },
    providerCheck,
  };

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`[ready-remote-runtime] remote analyzer ready in ${result.elapsedMs}ms`);
  console.log(`  health: ${urls.healthUrl} (${health.elapsedMs}ms, attempt ${health.attempt})`);
  if (providerCheck.checked) {
    console.log(
      `  provider: ${providerCheck.provider} healthy=${providerCheck.isHealthy} (${providerCheck.elapsedMs}ms, ${providerCheck.tokenSource})`
    );
  } else {
    console.log(`  provider: skipped (${providerCheck.reason})`);
  }
}

main().catch((error) => {
  console.error(`[ready-remote-runtime] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
