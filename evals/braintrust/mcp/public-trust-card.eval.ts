import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { Eval, type Score } from 'braintrust';

type PublicTrustInput = {
  serverId: string;
};

type PublicTrustOutput = {
  registryFound: boolean;
  catalogIncluded: boolean;
  requiresAuth: boolean | null;
  exposureMode: string | null;
  endpoint: string | null;
  initializeStatus: number | null;
  initializeOk: boolean;
  initializedStatus: number | null;
  toolsListStatus: number | null;
  toolsListOk: boolean;
  unauthorizedObserved: boolean;
  serverInfoName: string | null;
  toolCount: number | null;
  durationMs: number;
  leakedSecretMarker: boolean;
  error?: string;
};

type RegistryServer = {
  transport?: string;
  url?: string;
  bearer_token_env_var?: string;
  http_headers?: Record<string, string>;
  env_http_headers?: Record<string, string>;
  catalog_exposure_mode?: string;
  catalog?: {
    include?: boolean;
    slug?: string;
    requiresAuth?: boolean;
  };
};

type Registry = {
  servers?: Record<string, RegistryServer>;
};

type JsonRecord = Record<string, unknown>;

const ROOT = process.cwd();
const REGISTRY_PATH = resolve(ROOT, 'config/mcp-hub/registry.json');
const DEFAULT_SERVER_IDS = ['create-something', 'three-tier-framework', 'playbook'];
const SERVER_IDS = readCsvEnv('PUBLIC_MCP_TRUST_CARD_SERVERS', DEFAULT_SERVER_IDS);
const TIMEOUT_MS = readPositiveIntEnv('PUBLIC_MCP_TRUST_CARD_TIMEOUT_MS', 20_000);
const LATENCY_BUDGET_MS = readPositiveIntEnv('PUBLIC_MCP_TRUST_CARD_LATENCY_BUDGET_MS', 15_000);

const registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8')) as Registry;

const CASES = SERVER_IDS.map((serverId) => ({
  input: { serverId },
  metadata: {
    suite: 'mcp-public-trust-cards',
    eval: 'public_mcp_trust_card',
    serverId,
  },
}));

function registryPublicMetadataScore(output: PublicTrustOutput): Score {
  return {
    name: 'registry_public_metadata',
    score:
      output.registryFound &&
      output.catalogIncluded &&
      output.requiresAuth === false &&
      output.exposureMode === 'direct'
        ? 1
        : 0,
    metadata: {
      registryFound: output.registryFound,
      catalogIncluded: output.catalogIncluded,
      requiresAuth: output.requiresAuth,
      exposureMode: output.exposureMode,
      endpoint: output.endpoint,
    },
  };
}

function initializeScore(output: PublicTrustOutput): Score {
  return {
    name: 'mcp_initialize_ok',
    score: output.initializeOk ? 1 : 0,
    metadata: {
      status: output.initializeStatus,
      serverInfoName: output.serverInfoName,
      error: output.error,
    },
  };
}

function toolsListScore(output: PublicTrustOutput): Score {
  return {
    name: 'mcp_tools_list_ok',
    score: output.toolsListOk && typeof output.toolCount === 'number' ? 1 : 0,
    metadata: {
      status: output.toolsListStatus,
      toolCount: output.toolCount,
      error: output.error,
    },
  };
}

function noAuthScore(output: PublicTrustOutput): Score {
  return {
    name: 'no_auth_required',
    score: !output.unauthorizedObserved && output.initializeOk && output.toolsListOk ? 1 : 0,
    metadata: {
      unauthorizedObserved: output.unauthorizedObserved,
      initializeStatus: output.initializeStatus,
      toolsListStatus: output.toolsListStatus,
    },
  };
}

function noSecretMarkerScore(output: PublicTrustOutput): Score {
  return {
    name: 'no_secret_markers',
    score: output.leakedSecretMarker ? 0 : 1,
    metadata: { leakedSecretMarker: output.leakedSecretMarker },
  };
}

function latencyScore(output: PublicTrustOutput): Score {
  return {
    name: 'latency_budget',
    score: output.durationMs <= LATENCY_BUDGET_MS ? 1 : output.durationMs <= LATENCY_BUDGET_MS * 2 ? 0.5 : 0,
    metadata: {
      durationMs: output.durationMs,
      thresholdMs: LATENCY_BUDGET_MS,
    },
  };
}

void Eval<PublicTrustInput, PublicTrustOutput>('create-something-mcp-fleet', {
  experimentName: 'public_mcp_trust_cards',
  maxConcurrency: 1,
  data: CASES,
  task: async (input) => probePublicTrustCard(input.serverId),
  scores: [
    ({ output }) => registryPublicMetadataScore(output),
    ({ output }) => initializeScore(output),
    ({ output }) => toolsListScore(output),
    ({ output }) => noAuthScore(output),
    ({ output }) => noSecretMarkerScore(output),
    ({ output }) => latencyScore(output),
  ],
});

async function probePublicTrustCard(serverId: string): Promise<PublicTrustOutput> {
  const startedAt = Date.now();
  const server = registry.servers?.[serverId];
  const endpoint = server?.transport === 'http' && server.url ? server.url : null;
  const base: PublicTrustOutput = {
    registryFound: Boolean(server),
    catalogIncluded: server?.catalog?.include === true,
    requiresAuth: typeof server?.catalog?.requiresAuth === 'boolean' ? server.catalog.requiresAuth : null,
    exposureMode: server?.catalog_exposure_mode ?? null,
    endpoint,
    initializeStatus: null,
    initializeOk: false,
    initializedStatus: null,
    toolsListStatus: null,
    toolsListOk: false,
    unauthorizedObserved: false,
    serverInfoName: null,
    toolCount: null,
    durationMs: 0,
    leakedSecretMarker: false,
  };

  if (!server || !endpoint) {
    return {
      ...base,
      durationMs: Date.now() - startedAt,
      error: `Missing public HTTP registry endpoint for ${serverId}.`,
    };
  }

  if (server.bearer_token_env_var || hasKeys(server.http_headers) || hasKeys(server.env_http_headers)) {
    return {
      ...base,
      durationMs: Date.now() - startedAt,
      error: `Registry server ${serverId} has auth headers configured.`,
    };
  }

  try {
    const initialize = await mcpPost(endpoint, {
      jsonrpc: '2.0',
      id: `${serverId}-initialize`,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: {
          name: 'create-something-public-trust-card-eval',
          version: '1.0.0',
        },
      },
    });

    const sessionId = initialize.response.headers.get('mcp-session-id') ?? undefined;
    const initializePayload = parseMcpPayload(initialize.text);
    const serverInfo = getRecord(getRecord(initializePayload, 'result'), 'serverInfo');

    let initializedStatus: number | null = null;
    let toolsListStatus: number | null = null;
    let toolsListOk = false;
    let toolCount: number | null = null;
    let toolsText = '';

    if (sessionId) {
      const initialized = await mcpPost(
        endpoint,
        { jsonrpc: '2.0', method: 'notifications/initialized', params: {} },
        sessionId,
      );
      initializedStatus = initialized.response.status;

      const tools = await mcpPost(
        endpoint,
        {
          jsonrpc: '2.0',
          id: `${serverId}-tools-list`,
          method: 'tools/list',
          params: {},
        },
        sessionId,
      );
      toolsListStatus = tools.response.status;
      toolsText = tools.text;
      const toolsPayload = parseMcpPayload(tools.text);
      const toolList = getRecord(toolsPayload, 'result')?.tools;
      toolCount = Array.isArray(toolList) ? toolList.length : null;
      toolsListOk = tools.response.ok && Array.isArray(toolList);
    }

    const responseText = `${initialize.text}\n${toolsText}`;
    return {
      ...base,
      initializeStatus: initialize.response.status,
      initializeOk: initialize.response.ok && typeof serverInfo?.name === 'string',
      initializedStatus,
      toolsListStatus,
      toolsListOk,
      unauthorizedObserved: [initialize.response.status, initializedStatus, toolsListStatus].some(
        (status) => status === 401 || status === 403,
      ),
      serverInfoName: typeof serverInfo?.name === 'string' ? serverInfo.name : null,
      toolCount,
      durationMs: Date.now() - startedAt,
      leakedSecretMarker: containsSecretMarker(responseText),
    };
  } catch (error) {
    return {
      ...base,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function mcpPost(endpoint: string, body: unknown, sessionId?: string): Promise<{ response: Response; text: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const headers: Record<string, string> = {
      Accept: 'application/json, text/event-stream',
      'Content-Type': 'application/json',
    };
    if (sessionId) headers['Mcp-Session-Id'] = sessionId;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    return { response, text: await response.text() };
  } finally {
    clearTimeout(timeout);
  }
}

function parseMcpPayload(text: string): JsonRecord | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    // Continue below: streamable HTTP responses commonly come back as SSE.
  }

  const data = trimmed
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.replace(/^data:\s?/, ''))
    .join('\n')
    .trim();

  if (!data || data === '[DONE]') return null;

  try {
    const parsed = JSON.parse(data) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function getRecord(record: JsonRecord | null, key: string): JsonRecord | null {
  const value = record?.[key];
  return isRecord(value) ? value : null;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasKeys(value: Record<string, string> | undefined): boolean {
  return Boolean(value && Object.keys(value).length > 0);
}

function containsSecretMarker(text: string): boolean {
  return /\b(app-[A-Za-z0-9_-]{12,}|sk-[A-Za-z0-9_-]{12,}|secret_[A-Za-z0-9_-]{12,}|bearer\s+[A-Za-z0-9._-]{20,})/i.test(
    text,
  );
}

function readCsvEnv(name: string, fallback: string[]): string[] {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const values = raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return values.length > 0 ? values : fallback;
}

function readPositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
