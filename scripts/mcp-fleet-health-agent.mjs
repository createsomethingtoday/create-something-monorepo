#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { resolve } from 'node:path';

const DEFAULT_REGISTRY_PATH = 'config/mcp-hub/registry.json';
const DEFAULT_FLEET_PATH = 'config/mcp-hub/fleet.json';
const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_CONCURRENCY = 4;
const DEFAULT_PROTOCOL_VERSION = '2025-11-25';
const STATUS_ORDER = ['healthy', 'degraded', 'unhealthy', 'unknown', 'skipped'];

function printUsage() {
  console.log(`Usage: pnpm mcp:fleet:health [options]

Reviews MCP fleet health by checking each selected HTTP MCP endpoint with:
  1. GET /health
  2. JSON-RPC initialize
  3. JSON-RPC tools/list

Options:
  --registry <path>       Registry path (default: ${DEFAULT_REGISTRY_PATH})
  --fleet <path>          Deployment fleet path (default: ${DEFAULT_FLEET_PATH})
  --source <name>         registry, fleet, or both (default: both)
  --scope <name>          first-party, catalog, or all (default: first-party)
  --server <name[,name]>  Probe only selected server(s); can be repeated
  --tag <tag[,tag]>       Probe servers matching any tag; can be repeated
  --include-dormant       Include dormant/prototype servers
  --limit <number>        Limit selected targets, useful for smoke checks
  --timeout-ms <number>   Per-request timeout (default: ${DEFAULT_TIMEOUT_MS})
  --concurrency <number>  Parallel probes (default: ${DEFAULT_CONCURRENCY})
  --strict-health         Require /health to pass before reporting healthy
  --infisical             Load missing env vars from Infisical before probing
  --infisical-env <slug>  Infisical environment (default: INFISICAL_ENV or prod)
  --infisical-path <path> Infisical path (default: INFISICAL_PATH or /)
  --infisical-project-id <id>
                          Infisical project ID (default: INFISICAL_PROJECT_ID)
  --json                  Emit JSON instead of markdown
  --include-skipped       Include skipped inventory entries in JSON output
  --dry-run               List selected targets without network calls
  --fail-on <statuses>    Comma-separated statuses that should exit non-zero
  --help                  Show this message

Scopes:
  first-party             HTTP MCPs excluding composio toolkit entries
  catalog                 HTTP MCPs included in the public catalog
  all                     All HTTP MCPs in the selected source set
`);
}

function parseArgs(argv) {
  const options = {
    registryPath: DEFAULT_REGISTRY_PATH,
    fleetPath: DEFAULT_FLEET_PATH,
    source: 'both',
    scope: 'first-party',
    servers: [],
    tags: [],
    includeDormant: false,
    limit: undefined,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    concurrency: DEFAULT_CONCURRENCY,
    strictHealth: false,
    infisical: false,
    infisicalEnv: process.env.INFISICAL_ENV || 'prod',
    infisicalPath: process.env.INFISICAL_PATH || '/',
    infisicalProjectId: process.env.INFISICAL_PROJECT_ID || '',
    infisicalIncludeImports: process.env.INFISICAL_INCLUDE_IMPORTS || 'true',
    json: false,
    includeSkipped: false,
    dryRun: false,
    failOn: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }

    if (arg === '--registry' && next) {
      options.registryPath = next;
      index += 1;
      continue;
    }

    if (arg === '--fleet' && next) {
      options.fleetPath = next;
      index += 1;
      continue;
    }

    if (arg === '--source' && next) {
      const source = next.trim().toLowerCase();
      if (!['registry', 'fleet', 'both'].includes(source)) {
        throw new Error(`Invalid --source value: ${next}`);
      }
      options.source = source;
      index += 1;
      continue;
    }

    if (arg === '--scope' && next) {
      const scope = next.trim().toLowerCase();
      if (!['first-party', 'catalog', 'all'].includes(scope)) {
        throw new Error(`Invalid --scope value: ${next}`);
      }
      options.scope = scope;
      index += 1;
      continue;
    }

    if (arg === '--server' && next) {
      options.servers.push(...parseCsv(next));
      index += 1;
      continue;
    }

    if (arg === '--tag' && next) {
      options.tags.push(...parseCsv(next));
      index += 1;
      continue;
    }

    if (arg === '--include-dormant') {
      options.includeDormant = true;
      continue;
    }

    if (arg === '--limit' && next) {
      options.limit = parsePositiveInteger(next, '--limit');
      index += 1;
      continue;
    }

    if (arg === '--timeout-ms' && next) {
      options.timeoutMs = parsePositiveInteger(next, '--timeout-ms');
      index += 1;
      continue;
    }

    if (arg === '--concurrency' && next) {
      options.concurrency = parsePositiveInteger(next, '--concurrency');
      index += 1;
      continue;
    }

    if (arg === '--strict-health') {
      options.strictHealth = true;
      continue;
    }

    if (arg === '--infisical') {
      options.infisical = true;
      continue;
    }

    if (arg === '--infisical-env' && next) {
      options.infisicalEnv = next;
      index += 1;
      continue;
    }

    if (arg === '--infisical-path' && next) {
      options.infisicalPath = next;
      index += 1;
      continue;
    }

    if (arg === '--infisical-project-id' && next) {
      options.infisicalProjectId = next;
      index += 1;
      continue;
    }

    if (arg === '--infisical-include-imports' && next) {
      options.infisicalIncludeImports = next;
      index += 1;
      continue;
    }

    if (arg === '--json') {
      options.json = true;
      continue;
    }

    if (arg === '--include-skipped') {
      options.includeSkipped = true;
      continue;
    }

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--fail-on' && next) {
      options.failOn = parseCsv(next).map((status) => status.toLowerCase());
      for (const status of options.failOn) {
        if (!STATUS_ORDER.includes(status)) {
          throw new Error(`Invalid --fail-on status: ${status}`);
        }
      }
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function loadInfisicalSecrets(options, infisicalPath = options.infisicalPath) {
  const args = [
    'export',
    '--format=json',
    `--env=${options.infisicalEnv}`,
    `--path=${infisicalPath}`,
    `--include-imports=${options.infisicalIncludeImports}`,
  ];

  if (options.infisicalProjectId) {
    args.push(`--projectId=${options.infisicalProjectId}`);
  }

  let raw;
  try {
    raw = execFileSync('infisical', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 20 * 1024 * 1024,
    });
  } catch (error) {
    const stderr = error && typeof error === 'object' && 'stderr' in error ? String(error.stderr) : '';
    throw new Error(`Infisical export failed${stderr ? `: ${stderr.trim()}` : ''}`);
  }

  const payload = JSON.parse(raw);
  const entries = Array.isArray(payload)
    ? payload
        .filter((item) => item && typeof item.key === 'string')
        .map((item) => [item.key, item.value])
    : Object.entries(payload);

  const secrets = {};
  let loaded = 0;
  let preserved = 0;
  for (const [key, value] of entries) {
    if (process.env[key] !== undefined) {
      preserved += 1;
    }
    if (value === undefined || value === null) {
      continue;
    }
    secrets[key] = String(value);
    loaded += 1;
  }

  return {
    enabled: true,
    env: options.infisicalEnv,
    path: infisicalPath,
    includeImports: options.infisicalIncludeImports,
    secrets,
    loaded,
    preserved,
  };
}

function createSecretResolver(options, targets) {
  if (!options.infisical) {
    return {
      summary: { enabled: false },
      get(_target, name) {
        return process.env[name];
      },
    };
  }

  const pathSet = new Set([options.infisicalPath]);
  for (const target of targets) {
    if (target.infisicalPath) {
      pathSet.add(target.infisicalPath);
    }
  }

  const byPath = new Map();
  const pathSummaries = [];
  for (const path of pathSet) {
    const loaded = loadInfisicalSecrets(options, path);
    byPath.set(path, loaded.secrets);
    pathSummaries.push({
      path: loaded.path,
      loaded: loaded.loaded,
      preserved: loaded.preserved,
    });
  }

  return {
    summary: {
      enabled: true,
      env: options.infisicalEnv,
      includeImports: options.infisicalIncludeImports,
      paths: pathSummaries,
    },
    get(target, name) {
      if (process.env[name] !== undefined) {
        return process.env[name];
      }
      if (target.infisicalPath && byPath.get(target.infisicalPath)?.[name] !== undefined) {
        return byPath.get(target.infisicalPath)[name];
      }
      return byPath.get(options.infisicalPath)?.[name];
    },
  };
}

function parseCsv(value) {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function parsePositiveInteger(value, label) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`Invalid ${label} value: ${value}`);
  }
  return parsed;
}

function loadRegistry(path) {
  const absolutePath = resolve(process.cwd(), path);
  const registry = JSON.parse(readFileSync(absolutePath, 'utf8'));
  if (registry.version !== 1 || !registry.servers || typeof registry.servers !== 'object') {
    throw new Error(`Invalid MCP registry: ${path}`);
  }
  return registry;
}

function loadFleet(path) {
  const absolutePath = resolve(process.cwd(), path);
  const fleet = JSON.parse(readFileSync(absolutePath, 'utf8'));
  if (fleet.version !== 1 || !fleet.deployments || typeof fleet.deployments !== 'object') {
    throw new Error(`Invalid MCP fleet: ${path}`);
  }
  return fleet;
}

function buildRegistryCandidates(registry) {
  return Object.entries(registry.servers).map(([name, server]) => {
    const tags = Array.isArray(server.tags) ? server.tags : [];
    return {
      source: 'registry',
      name,
      url: server.url,
      description: server.description ?? '',
      tags,
      lifecycle: inferRegistryLifecycle(server),
      catalogIncluded: server.catalog?.include === true,
      catalogExposureMode: server.catalog_exposure_mode ?? null,
      estimatedToolCount: server.estimated_tool_count ?? null,
      transport: server.transport,
      infisicalPath: server.infisical_path ?? null,
      server,
    };
  });
}

function buildFleetCandidates(fleet) {
  return Object.entries(fleet.deployments).map(([name, deployment]) => {
    const tags = [
      'fleet',
      deployment.type,
      deployment.account,
      deployment.client,
      deployment.tenant,
    ].filter(Boolean);
    const auth = deployment.auth ?? {};
    return {
      source: 'fleet',
      name,
      url: deployment.url,
      description: deployment.product ?? '',
      tags,
      lifecycle: inferFleetLifecycle(deployment),
      deploymentStatus: deployment.status,
      catalogIncluded: false,
      catalogExposureMode: null,
      estimatedToolCount: null,
      transport: 'http',
      infisicalPath: auth.infisical_path ?? null,
      server: {
        transport: 'http',
        url: deployment.url,
        bearer_token_env_var: auth.bearer_token_env_var,
        description: deployment.product,
        tags,
      },
    };
  });
}

function selectTargets(candidates, options) {
  const requestedServers = new Set(options.servers);
  const requestedTags = new Set(options.tags);
  const selected = [];
  const skipped = [];

  for (const candidate of candidates) {
    const reasons = [];

    if (candidate.transport !== 'http') {
      reasons.push('non_http_transport');
    }

    if (!options.includeDormant && candidate.lifecycle === 'dormant') {
      reasons.push('dormant');
    }

    if (requestedServers.size > 0 && !requestedServers.has(candidate.name)) {
      reasons.push('not_requested_server');
    }

    if (requestedTags.size > 0 && !candidate.tags.some((tag) => requestedTags.has(tag))) {
      reasons.push('tag_mismatch');
    }

    if (requestedServers.size === 0) {
      if (options.scope === 'first-party' && candidate.tags.includes('composio')) {
        reasons.push('scope_excludes_composio');
      }
      if (options.scope === 'catalog' && candidate.catalogIncluded !== true) {
        reasons.push('scope_excludes_non_catalog');
      }
    }

    if (reasons.length > 0) {
      skipped.push({ source: candidate.source, name: candidate.name, reasons });
      continue;
    }

    selected.push(candidate);
  }

  if (requestedServers.size > 0) {
    const knownServers = new Set(candidates.map((candidate) => candidate.name));
    for (const requested of requestedServers) {
      if (!knownServers.has(requested)) {
        throw new Error(`Unknown MCP target in selected source(s): ${requested}`);
      }
    }
  }

  return {
    targets: options.limit ? selected.slice(0, options.limit) : selected,
    skipped,
  };
}

function inferRegistryLifecycle(server) {
  if (server.lifecycle) {
    return server.lifecycle;
  }
  const tags = Array.isArray(server.tags) ? server.tags : [];
  if (tags.includes('dormant') || tags.includes('prototype')) {
    return 'dormant';
  }
  if (tags.includes('local')) {
    return 'local';
  }
  return 'active';
}

function inferFleetLifecycle(deployment) {
  if (deployment.status === 'deployed' || deployment.status === 'maintenance') {
    return 'active';
  }
  return 'dormant';
}

function resolveAuthHeaders(target, secretResolver) {
  const server = target.server;
  const headers = {};
  const missingEnvVars = [];

  Object.assign(headers, server.headers ?? {});
  Object.assign(headers, server.http_headers ?? {});

  for (const [header, envVar] of Object.entries(server.env_http_headers ?? {})) {
    const value = secretResolver.get(target, envVar);
    if (value) {
      headers[header] = value;
    } else {
      missingEnvVars.push(envVar);
    }
  }

  if (server.bearer_token_env_var) {
    const value = secretResolver.get(target, server.bearer_token_env_var);
    if (value) {
      headers.Authorization = value.toLowerCase().startsWith('bearer ') ? value : `Bearer ${value}`;
    } else {
      missingEnvVars.push(server.bearer_token_env_var);
    }
  }

  return {
    headers,
    missingEnvVars: [...new Set(missingEnvVars)],
  };
}

async function probeServer(target, options, secretResolver) {
  const startedAt = Date.now();
  const auth = resolveAuthHeaders(target, secretResolver);
  const health = await probeHealth(target.url, auth.headers, options.timeoutMs);

  if (auth.missingEnvVars.length > 0) {
    return finalizeReport({
      target,
      status: 'unknown',
      reason: `missing_auth_env:${auth.missingEnvVars.join(',')}`,
      auth,
      health,
      initialize: null,
      toolsList: null,
      elapsedMs: Date.now() - startedAt,
    });
  }

  const initialize = await callRpc({
    url: target.url,
    headers: auth.headers,
    id: `${target.name}:initialize`,
    method: 'initialize',
    params: {
      protocolVersion: DEFAULT_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: {
        name: 'mcp-fleet-health-agent',
        version: '1.0.0',
      },
    },
    timeoutMs: options.timeoutMs,
  });

  if (!initialize.ok) {
    return finalizeReport({
      target,
      status: classifyRpcFailure(initialize),
      reason: `initialize_failed:${initialize.error}`,
      auth,
      health,
      initialize,
      toolsList: null,
      elapsedMs: Date.now() - startedAt,
    });
  }

  await sendInitializedNotification({
    url: target.url,
    headers: auth.headers,
    sessionId: initialize.sessionId,
    timeoutMs: options.timeoutMs,
  });

  const toolsList = await callRpc({
    url: target.url,
    headers: auth.headers,
    sessionId: initialize.sessionId,
    id: `${target.name}:tools-list`,
    method: 'tools/list',
    params: {},
    timeoutMs: options.timeoutMs,
  });

  if (!toolsList.ok) {
    return finalizeReport({
      target,
      status: classifyRpcFailure(toolsList),
      reason: `tools_list_failed:${toolsList.error}`,
      auth,
      health,
      initialize,
      toolsList,
      elapsedMs: Date.now() - startedAt,
    });
  }

  const tools = Array.isArray(toolsList.result?.tools) ? toolsList.result.tools : [];
  const status = tools.length > 0 && (health.ok || !options.strictHealth) ? 'healthy' : 'degraded';
  const reason =
    tools.length === 0
      ? 'tools_list_empty'
      : health.ok
        ? 'tools_accessible'
        : 'tools_accessible_health_unavailable';

  return finalizeReport({
    target,
    status,
    reason,
    auth,
    health,
    initialize,
    toolsList,
    elapsedMs: Date.now() - startedAt,
  });
}

async function probeHealth(mcpUrl, authHeaders, timeoutMs) {
  const healthUrl = deriveHealthUrl(mcpUrl);
  const response = await timedFetch(
    healthUrl,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...authHeaders,
      },
    },
    timeoutMs,
  );

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      url: healthUrl,
      httpStatus: response.httpStatus ?? null,
      error: response.error ?? response.bodyExcerpt ?? null,
      bodyExcerpt: response.bodyExcerpt ?? null,
    };
  }

  if (response.httpStatus === 404 || response.httpStatus === 405) {
    return {
      ok: false,
      status: 'unavailable',
      url: healthUrl,
      httpStatus: response.httpStatus,
      error: response.bodyExcerpt ?? `HTTP ${response.httpStatus}`,
      bodyExcerpt: response.bodyExcerpt ?? null,
    };
  }

  return {
    ok: response.httpStatus >= 200 && response.httpStatus < 300,
    status: response.httpStatus >= 200 && response.httpStatus < 300 ? 'ok' : 'failed',
    url: healthUrl,
    httpStatus: response.httpStatus,
    error: response.httpStatus >= 200 && response.httpStatus < 300 ? null : response.bodyExcerpt,
    bodyExcerpt: response.bodyExcerpt ?? null,
  };
}

function deriveHealthUrl(mcpUrl) {
  const url = new URL(mcpUrl);
  if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
    url.pathname = '/health';
    url.search = '';
    return url.toString();
  }
  url.pathname = url.pathname.replace(/\/mcp\/?$/, '/health');
  url.search = '';
  return url.toString();
}

async function callRpc({ url, headers, sessionId, id, method, params, timeoutMs }) {
  const response = await timedFetch(
    url,
    {
      method: 'POST',
      headers: buildMcpHeaders(headers, sessionId),
      body: JSON.stringify({
        jsonrpc: '2.0',
        id,
        method,
        params,
      }),
    },
    timeoutMs,
  );

  if (!response.ok) {
    return {
      ok: false,
      httpStatus: response.httpStatus ?? null,
      sessionId: response.sessionId ?? sessionId ?? null,
      error: response.error ?? response.bodyExcerpt ?? 'request_failed',
      result: null,
    };
  }

  if (response.httpStatus < 200 || response.httpStatus >= 300) {
    return {
      ok: false,
      httpStatus: response.httpStatus,
      sessionId: response.sessionId ?? sessionId ?? null,
      error: response.bodyExcerpt ?? `HTTP ${response.httpStatus}`,
      result: null,
    };
  }

  const payload = parseRpcPayload(response.body);
  if (!payload) {
    return {
      ok: false,
      httpStatus: response.httpStatus,
      sessionId: response.sessionId ?? sessionId ?? null,
      error: 'empty_or_unparseable_rpc_response',
      result: null,
    };
  }

  if (payload.error) {
    return {
      ok: false,
      httpStatus: response.httpStatus,
      sessionId: response.sessionId ?? sessionId ?? null,
      error: `${payload.error.code ?? 'rpc_error'}:${payload.error.message ?? 'unknown_error'}`,
      result: null,
    };
  }

  return {
    ok: true,
    httpStatus: response.httpStatus,
    sessionId: response.sessionId ?? sessionId ?? null,
    error: null,
    result: payload.result ?? null,
  };
}

async function sendInitializedNotification({ url, headers, sessionId, timeoutMs }) {
  await timedFetch(
    url,
    {
      method: 'POST',
      headers: buildMcpHeaders(headers, sessionId),
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'notifications/initialized',
      }),
    },
    timeoutMs,
  ).catch(() => null);
}

function buildMcpHeaders(authHeaders, sessionId) {
  const headers = {
    Accept: 'application/json, text/event-stream',
    'Content-Type': 'application/json',
    'MCP-Protocol-Version': DEFAULT_PROTOCOL_VERSION,
    ...authHeaders,
  };

  if (sessionId) {
    headers['Mcp-Session-Id'] = sessionId;
  }

  return headers;
}

async function timedFetch(url, init, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    const text = await response.text();
    return {
      ok: true,
      httpStatus: response.status,
      sessionId: response.headers.get('mcp-session-id') ?? response.headers.get('Mcp-Session-Id'),
      body: text,
      bodyExcerpt: excerpt(text),
    };
  } catch (error) {
    const cause = error instanceof Error && error.cause instanceof Error ? `: ${error.cause.message}` : '';
    return {
      ok: false,
      httpStatus: null,
      sessionId: null,
      body: null,
      bodyExcerpt: null,
      error: error instanceof Error ? `${error.message}${cause}` : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function parseRpcPayload(body) {
  const trimmed = body.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? (parsed[0] ?? null) : parsed;
  } catch {
    return parseSsePayload(trimmed);
  }
}

function parseSsePayload(body) {
  const payloads = [];
  let dataLines = [];

  for (const line of body.split(/\r?\n/)) {
    if (line.trim() === '') {
      flushSsePayload(payloads, dataLines);
      dataLines = [];
      continue;
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice('data:'.length).trimStart());
    }
  }

  flushSsePayload(payloads, dataLines);
  return payloads.find((payload) => payload && (payload.result || payload.error)) ?? null;
}

function flushSsePayload(payloads, dataLines) {
  if (dataLines.length === 0) {
    return;
  }

  const data = dataLines.join('\n').trim();
  if (!data || data === '[DONE]') {
    return;
  }

  try {
    payloads.push(JSON.parse(data));
  } catch {
    // Ignore non-JSON SSE events; the caller will report an unparseable response.
  }
}

function classifyRpcFailure(result) {
  const error = String(result.error ?? '').toLowerCase();
  if (result.httpStatus === 401 || result.httpStatus === 403 || error.includes('unauthorized')) {
    return 'unknown';
  }
  return 'unhealthy';
}

function finalizeReport({ target, status, reason, auth, health, initialize, toolsList, elapsedMs }) {
  const tools = Array.isArray(toolsList?.result?.tools) ? toolsList.result.tools : [];
  return {
    source: target.source,
    name: target.name,
    description: target.description,
    url: target.url,
    healthUrl: deriveHealthUrl(target.url),
    tags: target.tags,
    lifecycle: target.lifecycle,
    deploymentStatus: target.deploymentStatus ?? null,
    infisicalPath: target.infisicalPath ?? null,
    catalogExposureMode: target.catalogExposureMode,
    estimatedToolCount: target.estimatedToolCount,
    status,
    reason,
    elapsedMs,
    auth: {
      configured: Object.keys(auth.headers).some((header) => header.toLowerCase() === 'authorization'),
      missingEnvVars: auth.missingEnvVars,
    },
    health,
    initialize: summarizeRpcResult(initialize),
    tools: {
      ok: Boolean(toolsList?.ok),
      httpStatus: toolsList?.httpStatus ?? null,
      count: tools.length,
      names: tools.map((tool) => tool.name).filter(Boolean).sort(),
      error: toolsList?.error ?? null,
    },
    recommendation: recommend(status, reason),
  };
}

function summarizeRpcResult(result) {
  if (!result) {
    return null;
  }
  return {
    ok: result.ok,
    httpStatus: result.httpStatus ?? null,
    error: result.error ?? null,
    serverInfo: result.result?.serverInfo ?? null,
    protocolVersion: result.result?.protocolVersion ?? null,
  };
}

function recommend(status, reason) {
  if (status === 'healthy') {
    return 'No action required.';
  }
  if (reason.startsWith('missing_auth_env:')) {
    return `Set ${reason.slice('missing_auth_env:'.length)} before probing this MCP.`;
  }
  if (reason.startsWith('initialize_failed:')) {
    return 'Check MCP route, auth, worker availability, and initialize handler compatibility.';
  }
  if (reason.startsWith('tools_list_failed:')) {
    return 'Check tool registration and MCP tools/list handler after a successful initialize.';
  }
  if (reason === 'tools_list_empty') {
    return 'Confirm this MCP is expected to expose tools; if so, inspect server tool registration.';
  }
  if (reason === 'tools_accessible_health_unavailable') {
    return 'Tools are discoverable, but the health endpoint is unavailable; add or restore /health.';
  }
  return 'Inspect server logs and recent deploys.';
}

async function runWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runOne() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await worker(items[currentIndex]);
    }
  }

  const runners = Array.from({ length: Math.min(concurrency, items.length) }, () => runOne());
  await Promise.all(runners);
  return results;
}

function buildSummary(reports) {
  const counts = Object.fromEntries(STATUS_ORDER.map((status) => [status, 0]));
  for (const report of reports) {
    counts[report.status] = (counts[report.status] ?? 0) + 1;
  }

  return {
    total: reports.length,
    counts,
    healthy: counts.healthy,
    needsAttention: reports.filter((report) => report.status !== 'healthy'),
  };
}

function buildSkippedSummary(skipped) {
  const reasons = {};
  for (const item of skipped) {
    for (const reason of item.reasons) {
      reasons[reason] = (reasons[reason] ?? 0) + 1;
    }
  }
  return {
    total: skipped.length,
    reasons,
  };
}

function renderMarkdown({ options, reports, skipped, dryRun, infisical }) {
  const summary = buildSummary(reports);
  const lines = [
    '# MCP Fleet Health Review',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Scope: ${options.scope}${dryRun ? ' (dry run)' : ''}`,
    `Infisical: ${
      infisical?.enabled
        ? `loaded ${infisical.paths.reduce((sum, item) => sum + item.loaded, 0)} secret values from ${infisical.paths.length} path(s)`
        : 'not used'
    }`,
    `Targets: ${summary.total}`,
    `Summary: ${STATUS_ORDER.map((status) => `${status} ${summary.counts[status]}`).join(' / ')}`,
    '',
    '| Source | Server | Status | Tools | Health | MCP | Auth | Notes |',
    '|---|---|---:|---:|---|---|---|---|',
  ];

  for (const report of reports) {
    lines.push(
      `| ${[
        md(report.source),
        md(report.name),
        report.status,
        String(report.tools.count),
        formatHealth(report),
        formatMcp(report),
        report.auth.missingEnvVars.length > 0 ? `missing ${md(report.auth.missingEnvVars.join(','))}` : 'ok',
        md(report.reason),
      ].join(' | ')} |`,
    );
  }

  if (summary.needsAttention.length > 0 && !dryRun) {
    lines.push('', '## Attention');
    for (const report of summary.needsAttention) {
      lines.push(`- ${report.name}: ${report.recommendation}`);
    }
  }

  if (skipped.length > 0) {
    lines.push('', `Skipped inventory entries: ${skipped.length}`);
  }

  return `${lines.join('\n')}\n`;
}

function formatHealth(report) {
  if (!report.health) {
    return 'not checked';
  }
  if (report.health.ok) {
    return `${report.health.httpStatus} ok`;
  }
  if (report.health.status === 'unavailable') {
    return `${report.health.httpStatus} unavailable`;
  }
  return report.health.httpStatus ? `${report.health.httpStatus} failed` : 'failed';
}

function formatMcp(report) {
  if (report.initialize?.ok && report.tools.ok) {
    return 'initialize+tools/list ok';
  }
  if (report.initialize?.ok) {
    return 'initialize ok';
  }
  if (report.initialize) {
    return 'initialize failed';
  }
  return 'not checked';
}

function md(value) {
  return String(value).replace(/\|/g, '\\|');
}

function excerpt(value) {
  if (!value) {
    return '';
  }
  return value.replace(/\s+/g, ' ').trim().slice(0, 300);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const candidates = [];
  if (options.source === 'registry' || options.source === 'both') {
    candidates.push(...buildRegistryCandidates(loadRegistry(options.registryPath)));
  }
  if (options.source === 'fleet' || options.source === 'both') {
    candidates.push(...buildFleetCandidates(loadFleet(options.fleetPath)));
  }

  const { targets, skipped } = selectTargets(candidates, options);
  const secretResolver = createSecretResolver(options, targets);
  const infisical = secretResolver.summary;

  if (targets.length === 0) {
    throw new Error('No MCP targets selected.');
  }

  const reports = options.dryRun
    ? targets.map((target) =>
        finalizeReport({
          target,
          status: 'skipped',
          reason: 'dry_run',
          auth: resolveAuthHeaders(target, secretResolver),
          health: null,
          initialize: null,
          toolsList: null,
          elapsedMs: 0,
        }),
      )
    : await runWithConcurrency(targets, options.concurrency, (target) => probeServer(target, options, secretResolver));

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          scope: options.scope,
          dryRun: options.dryRun,
          infisical,
          summary: buildSummary(reports),
          skippedSummary: buildSkippedSummary(skipped),
          reports,
          ...(options.includeSkipped ? { skipped } : {}),
        },
        null,
        2,
      ),
    );
  } else {
    process.stdout.write(renderMarkdown({ options, reports, skipped, dryRun: options.dryRun, infisical }));
  }

  if (options.failOn.length > 0 && reports.some((report) => options.failOn.includes(report.status))) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`MCP fleet health review failed: ${message}`);
  process.exitCode = 1;
});
