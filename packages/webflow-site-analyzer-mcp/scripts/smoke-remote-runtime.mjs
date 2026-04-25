#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const DEFAULT_TOKEN_ENV = 'WEBFLOW_SITE_ANALYZER_MCP_API_KEY';
const DEFAULT_INFISICAL_ENV = 'prod';
const DEFAULT_PUBLISHED_URL = 'https://athelas-template.webflow.io/';
const DEFAULT_SYNC_TIMEOUT_MS = 30_000;
const DEFAULT_SYNC_MAX_PAGES = 1;
const DEFAULT_SYNC_MAX_DEPTH = 0;
const DEFAULT_ASYNC_TIMEOUT_MS = 120_000;
const DEFAULT_ASYNC_MAX_PAGES = 3;
const DEFAULT_ASYNC_MAX_DEPTH = 1;
const DEFAULT_POLL_INTERVAL_MS = 5_000;
const DEFAULT_MAX_POLL_ATTEMPTS = 36;

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(scriptDir, '..');
const workspaceRoot = path.resolve(packageRoot, '..', '..');
const remoteRoot = path.join(packageRoot, 'workers', 'remote');
const wranglerConfigPath = path.join(remoteRoot, 'wrangler.jsonc');

function parseArgs(argv) {
  const args = {
    baseUrl: undefined,
    mcpUrl: undefined,
    publishedUrl: DEFAULT_PUBLISHED_URL,
    token: undefined,
    tokenEnv: DEFAULT_TOKEN_ENV,
    infisicalEnv: DEFAULT_INFISICAL_ENV,
    syncTimeoutMs: DEFAULT_SYNC_TIMEOUT_MS,
    syncMaxPages: DEFAULT_SYNC_MAX_PAGES,
    syncMaxDepth: DEFAULT_SYNC_MAX_DEPTH,
    asyncTimeoutMs: DEFAULT_ASYNC_TIMEOUT_MS,
    asyncMaxPages: DEFAULT_ASYNC_MAX_PAGES,
    asyncMaxDepth: DEFAULT_ASYNC_MAX_DEPTH,
    pollIntervalMs: DEFAULT_POLL_INTERVAL_MS,
    maxPollAttempts: DEFAULT_MAX_POLL_ATTEMPTS,
    checkSyncGuard: false,
    checkAsyncJob: false,
    skipReady: false,
    output: undefined,
    outputDir: undefined,
    json: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === '--') continue;

    if (arg === '--base-url' && next) {
      args.baseUrl = next;
      i += 1;
      continue;
    }
    if (arg === '--mcp-url' && next) {
      args.mcpUrl = next;
      i += 1;
      continue;
    }
    if (arg === '--published-url' && next) {
      args.publishedUrl = next;
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
    if (arg === '--sync-timeout-ms' && next) {
      args.syncTimeoutMs = Number.parseInt(next, 10);
      i += 1;
      continue;
    }
    if (arg === '--sync-max-pages' && next) {
      args.syncMaxPages = Number.parseInt(next, 10);
      i += 1;
      continue;
    }
    if (arg === '--sync-max-depth' && next) {
      args.syncMaxDepth = Number.parseInt(next, 10);
      i += 1;
      continue;
    }
    if (arg === '--async-timeout-ms' && next) {
      args.asyncTimeoutMs = Number.parseInt(next, 10);
      i += 1;
      continue;
    }
    if (arg === '--async-max-pages' && next) {
      args.asyncMaxPages = Number.parseInt(next, 10);
      i += 1;
      continue;
    }
    if (arg === '--async-max-depth' && next) {
      args.asyncMaxDepth = Number.parseInt(next, 10);
      i += 1;
      continue;
    }
    if (arg === '--poll-interval-ms' && next) {
      args.pollIntervalMs = Number.parseInt(next, 10);
      i += 1;
      continue;
    }
    if (arg === '--max-poll-attempts' && next) {
      args.maxPollAttempts = Number.parseInt(next, 10);
      i += 1;
      continue;
    }
    if (arg === '--output' && next) {
      args.output = next;
      i += 1;
      continue;
    }
    if (arg === '--output-dir' && next) {
      args.outputDir = next;
      i += 1;
      continue;
    }
    if (arg === '--check-sync-guard') {
      args.checkSyncGuard = true;
      continue;
    }
    if (arg === '--check-async-job') {
      args.checkAsyncJob = true;
      continue;
    }
    if (arg === '--skip-ready') {
      args.skipReady = true;
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
  node packages/webflow-site-analyzer-mcp/scripts/smoke-remote-runtime.mjs [options]

Options:
  --published-url <url>        Published URL to smoke against (default: ${DEFAULT_PUBLISHED_URL})
  --base-url <url>             Override remote worker base URL.
  --mcp-url <url>              Override MCP endpoint URL.
  --token <value>              Provide API token directly.
  --token-env <name>           Token env/Infisical secret name (default: ${DEFAULT_TOKEN_ENV})
  --infisical-env <name>       Infisical environment (default: ${DEFAULT_INFISICAL_ENV})
  --sync-timeout-ms <ms>       Timeout for bounded sync smoke (default: ${DEFAULT_SYNC_TIMEOUT_MS})
  --sync-max-pages <n>         Bounded sync crawlMaxPages (default: ${DEFAULT_SYNC_MAX_PAGES})
  --sync-max-depth <n>         Bounded sync crawlMaxDepth (default: ${DEFAULT_SYNC_MAX_DEPTH})
  --check-sync-guard           Also verify that a longer sync request fails fast with guidance.
  --check-async-job            Also verify async enqueue/get job flow and duration telemetry.
  --async-timeout-ms <ms>      Async review timeout argument (default: ${DEFAULT_ASYNC_TIMEOUT_MS})
  --async-max-pages <n>        Async review crawlMaxPages (default: ${DEFAULT_ASYNC_MAX_PAGES})
  --async-max-depth <n>        Async review crawlMaxDepth (default: ${DEFAULT_ASYNC_MAX_DEPTH})
  --poll-interval-ms <ms>      Async job poll interval (default: ${DEFAULT_POLL_INTERVAL_MS})
  --max-poll-attempts <n>      Async job max poll attempts (default: ${DEFAULT_MAX_POLL_ATTEMPTS})
  --output <path>              Write the JSON result to an explicit file path.
  --output-dir <path>          Write the JSON result to a timestamped file in this directory.
  --skip-ready                 Skip the pre-smoke readiness warm-up.
  --json                       Emit JSON summary.
`);
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
    mcpUrl: args.mcpUrl || new URL('/mcp', `${baseUrl}/`).toString(),
  };
}

function ensureAbsolutePath(targetPath) {
  return path.isAbsolute(targetPath) ? targetPath : path.resolve(workspaceRoot, targetPath);
}

function createTimestampSlug(isoString) {
  return isoString.replaceAll(':', '').replaceAll('.', '').replace('T', '-').replace('Z', 'Z');
}

function writeArtifact(result, args) {
  const explicitOutput = args.output?.trim();
  const outputDir = args.outputDir?.trim();
  const targetDir = outputDir ? ensureAbsolutePath(outputDir) : null;
  const targetPath = explicitOutput
    ? ensureAbsolutePath(explicitOutput)
    : targetDir
      ? path.join(targetDir, `remote-smoke-${createTimestampSlug(result.testedAt)}.json`)
      : null;

  if (!targetPath) {
    return null;
  }

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  return targetPath;
}

function resolveTokenFromEnv(tokenEnv) {
  const direct = process.env[tokenEnv]?.trim();
  if (direct) return { token: direct, source: `env:${tokenEnv}` };

  const fallback = process.env.MCP_API_KEY?.trim();
  if (fallback) return { token: fallback, source: 'env:MCP_API_KEY' };

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

function parseToolResponse(response) {
  const content = Array.isArray(response?.result?.content) ? response.result.content : [];
  const text = content
    .filter((part) => part?.type === 'text' && typeof part?.text === 'string')
    .map((part) => part.text)
    .join('\n');

  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  return {
    id: response?.id ?? null,
    isError: Boolean(response?.result?.isError),
    rawText: text,
    data: parsed,
  };
}

async function callTool(url, token, name, args, timeoutMs) {
  const payload = {
    jsonrpc: '2.0',
    id: `${name}-${Date.now()}`,
    method: 'tools/call',
    params: { name, arguments: args },
  };

  const response = await fetchJson(
    url,
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

  return parseToolResponse(response);
}

function runReadiness(args) {
  if (args.skipReady) {
    return {
      ready: false,
      skipped: true,
      reason: 'skip-ready flag set',
    };
  }

  const readyScript = path.join(scriptDir, 'ready-remote-runtime.mjs');
  const childArgs = [readyScript, '--json'];
  if (args.baseUrl) childArgs.push('--base-url', args.baseUrl);
  if (args.mcpUrl) childArgs.push('--mcp-url', args.mcpUrl);
  if (args.token) childArgs.push('--token', args.token);
  if (args.tokenEnv) childArgs.push('--token-env', args.tokenEnv);
  if (args.infisicalEnv) childArgs.push('--infisical-env', args.infisicalEnv);

  const result = spawnSync('node', childArgs, {
    cwd: workspaceRoot,
    encoding: 'utf8',
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || 'readiness script failed');
  }

  return JSON.parse(result.stdout);
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function pickSummary(report) {
  const summary = report?.summary ?? null;
  return summary
    ? {
        durationMs: report?.durationMs ?? null,
        overallScore: summary.overallScore ?? null,
        grade: summary.grade ?? null,
        crawledPages: summary.coverage?.crawledPages ?? null,
        coveragePercent: summary.coverage?.coveragePercent ?? null,
      }
    : null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const urls = buildUrls(args);
  const tokenInfo = resolveToken(args);
  if (!tokenInfo) {
    throw new Error('Unable to resolve WEBFLOW_SITE_ANALYZER_MCP_API_KEY from args, env, or Infisical.');
  }

  const startedAtMs = Date.now();
  const readiness = runReadiness(args);

  const boundedSync = await callTool(
    urls.mcpUrl,
    tokenInfo.token,
    'run_template_review',
    {
      publishedUrl: args.publishedUrl,
      designerMode: 'skip',
      includeManual: true,
      crawlMaxPages: args.syncMaxPages,
      crawlMaxDepth: args.syncMaxDepth,
      timeout: args.syncTimeoutMs,
    },
    Math.max(args.syncTimeoutMs + 30_000, 60_000)
  );

  if (boundedSync.isError || !boundedSync.data) {
    throw new Error(`Bounded sync smoke failed: ${boundedSync.rawText || 'unknown error'}`);
  }

  const result = {
    testedAt: new Date().toISOString(),
    elapsedMs: Date.now() - startedAtMs,
    urls,
    publishedUrl: args.publishedUrl,
    tokenSource: tokenInfo.source,
    readiness,
    boundedSync: pickSummary(boundedSync.data),
  };

  if (args.checkSyncGuard) {
    const syncGuard = await callTool(
      urls.mcpUrl,
      tokenInfo.token,
      'run_template_review',
      {
        publishedUrl: args.publishedUrl,
        designerMode: 'skip',
        includeManual: true,
        crawlMaxPages: args.asyncMaxPages,
        crawlMaxDepth: args.asyncMaxDepth,
        timeout: args.asyncTimeoutMs,
      },
      30_000
    );

    result.syncGuard = {
      isError: syncGuard.isError,
      matchedGuardMessage: syncGuard.rawText.includes('reserved for bounded smoke checks'),
      rawText: syncGuard.rawText,
    };

    if (!result.syncGuard.isError || !result.syncGuard.matchedGuardMessage) {
      throw new Error('Long sync guard did not return the expected remote bounded-smoke guidance.');
    }
  }

  if (args.checkAsyncJob) {
    const enqueue = await callTool(
      urls.mcpUrl,
      tokenInfo.token,
      'enqueue_template_review',
      {
        publishedUrl: args.publishedUrl,
        designerMode: 'skip',
        includeManual: true,
        crawlMaxPages: args.asyncMaxPages,
        crawlMaxDepth: args.asyncMaxDepth,
        timeout: args.asyncTimeoutMs,
      },
      30_000
    );

    const jobId = enqueue.data?.jobId;
    if (enqueue.isError || !jobId) {
      throw new Error(`Failed to enqueue async smoke review: ${enqueue.rawText || 'unknown error'}`);
    }

    let finalJob = null;
    for (let attempt = 1; attempt <= args.maxPollAttempts; attempt += 1) {
      const job = await callTool(
        urls.mcpUrl,
        tokenInfo.token,
        'get_template_review_job',
        { jobId },
        30_000
      );

      const data = job.data;
      if (job.isError || !data) {
        throw new Error(`Failed to fetch async smoke job ${jobId}: ${job.rawText || 'unknown error'}`);
      }

      if (data.status === 'succeeded' || data.status === 'failed' || data.status === 'canceled') {
        finalJob = data;
        break;
      }

      await sleep(args.pollIntervalMs);
    }

    if (!finalJob) {
      throw new Error(`Timed out waiting for async smoke job completion after ${args.maxPollAttempts} polls.`);
    }

    result.asyncJob = {
      jobId: finalJob.jobId,
      status: finalJob.status,
      durationMs: finalJob.durationMs ?? null,
      resultDurationMs: finalJob.result?.durationMs ?? null,
      progress: finalJob.progress ?? null,
    };

    if (finalJob.status !== 'succeeded') {
      throw new Error(`Async smoke job ${finalJob.jobId} ended with status ${finalJob.status}.`);
    }
  }

  const artifactPath = writeArtifact(result, args);
  if (artifactPath) {
    result.artifactPath = artifactPath;
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`[smoke-remote-runtime] completed in ${result.elapsedMs}ms`);
  console.log(`  published: ${result.publishedUrl}`);
  console.log(`  token: ${result.tokenSource}`);
  console.log(
    `  bounded sync: duration=${result.boundedSync?.durationMs} score=${result.boundedSync?.overallScore} grade=${result.boundedSync?.grade}`
  );
  if (result.syncGuard) {
    console.log(
      `  sync guard: isError=${result.syncGuard.isError} matched=${result.syncGuard.matchedGuardMessage}`
    );
  }
  if (result.asyncJob) {
    console.log(
      `  async: job=${result.asyncJob.jobId} status=${result.asyncJob.status} duration=${result.asyncJob.durationMs}`
    );
  }
  if (artifactPath) {
    console.log(`  artifact: ${artifactPath}`);
  }
}

main().catch((error) => {
  console.error(`[smoke-remote-runtime] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
