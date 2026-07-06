import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import { enableTelemetry } from '@create-something/mcp-core';
import {
  DEFAULT_RAPIDAPI_HOST,
  DEFAULT_TIMEOUT_MS,
  getSpotifyProviderStatus,
  listSpotifyToolNames,
  registerSpotifyTools,
  SERVER_NAME,
  SERVER_VERSION,
  type SpotifyProviderConfig,
} from '../src/index.js';

interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  TELEMETRY_DB?: D1Database;
  LANGFUSE_PUBLIC_KEY?: string;
  LANGFUSE_SECRET_KEY?: string;
  LANGFUSE_PROJECT_NAME?: string;
  MCP_API_KEY?: string;
  SPOTIFY_MCP_API_KEY?: string;
  MCP_ACCOUNT_ID?: string;
  RAPIDAPI_KEY?: string;
  SPOTIFY_RAPIDAPI_KEY?: string;
  SPOTIFY_RAPIDAPI_HOST?: string;
  SPOTIFY_RAPIDAPI_BASE_URL?: string;
  SPOTIFY_RAPIDAPI_TIMEOUT_MS?: string;
  SPOTIFY_RAPIDAPI_MAX_RESPONSE_BYTES?: string;
}

const DEFAULT_LANGFUSE_PROJECT_NAME = 'CREATE SOMETHING';
const DEFAULT_ACCOUNT_ID = 'spotify-agent';
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-API-Key, X-MCP-Account-ID, X-Account-ID',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function resolveLangfuseProjectName(env: Env): string {
  const configured = env.LANGFUSE_PROJECT_NAME?.trim();
  return configured && configured.length > 0 ? configured : DEFAULT_LANGFUSE_PROJECT_NAME;
}

function parsePositiveInt(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function resolveProviderConfig(env: Env): SpotifyProviderConfig {
  return {
    apiKey: env.SPOTIFY_RAPIDAPI_KEY?.trim() || env.RAPIDAPI_KEY?.trim(),
    host: env.SPOTIFY_RAPIDAPI_HOST?.trim() || DEFAULT_RAPIDAPI_HOST,
    baseUrl: env.SPOTIFY_RAPIDAPI_BASE_URL?.trim(),
    timeoutMs: parsePositiveInt(env.SPOTIFY_RAPIDAPI_TIMEOUT_MS) ?? DEFAULT_TIMEOUT_MS,
    maxResponseBytes: parsePositiveInt(env.SPOTIFY_RAPIDAPI_MAX_RESPONSE_BYTES),
  };
}

function resolveMcpApiKey(env: Env): string | null {
  return env.SPOTIFY_MCP_API_KEY?.trim() || env.MCP_API_KEY?.trim() || null;
}

function extractProvidedApiKey(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }

  const apiKeyHeader = request.headers.get('X-API-Key');
  return apiKeyHeader?.trim() || null;
}

async function digestToken(value: string): Promise<Uint8Array> {
  const bytes = new TextEncoder().encode(value);
  return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
}

async function constantTimeTokenEqual(a: string, b: string): Promise<boolean> {
  const [left, right] = await Promise.all([digestToken(a), digestToken(b)]);
  let diff = left.length ^ right.length;
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}

async function validateApiKey(request: Request, env: Env): Promise<Response | null> {
  const configured = resolveMcpApiKey(env);
  if (!configured) {
    return jsonResponse(
      {
        error: 'ServerMisconfigured',
        message: 'SPOTIFY_MCP_API_KEY or MCP_API_KEY is not configured for this deployment.',
      },
      500,
    );
  }

  const provided = extractProvidedApiKey(request);
  if (!provided || !(await constantTimeTokenEqual(provided, configured))) {
    return jsonResponse(
      {
        error: 'Unauthorized',
        message: 'Valid API key required. Use Authorization: Bearer <token> or X-API-Key.',
      },
      401,
    );
  }

  return null;
}

function getAccountIdFromRequest(request: Request, env: Env): string {
  return (
    request.headers.get('X-MCP-Account-ID')?.trim() ||
    request.headers.get('X-Account-ID')?.trim() ||
    request.headers.get('X-CS-Account-ID')?.trim() ||
    env.MCP_ACCOUNT_ID?.trim() ||
    DEFAULT_ACCOUNT_ID
  );
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}

export class SpotifyMcp extends McpAgent<Env> {
  server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  private currentAccountId = DEFAULT_ACCOUNT_ID;

  override async fetch(request: Request): Promise<Response> {
    this.currentAccountId = getAccountIdFromRequest(request, this.env);
    return super.fetch(request);
  }

  async init() {
    enableTelemetry(this.server, this.env.TELEMETRY_DB, SERVER_NAME, () => this.currentAccountId, {
      publicKey: this.env.LANGFUSE_PUBLIC_KEY,
      secretKey: this.env.LANGFUSE_SECRET_KEY,
      projectName: resolveLangfuseProjectName(this.env),
    });

    registerSpotifyTools(this.server, {
      getProviderConfig: () => resolveProviderConfig(this.env),
    });
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      const authError = await validateApiKey(request, env);
      if (authError) return authError;
      return SpotifyMcp.serve('/mcp').fetch(request, env, ctx);
    }

    if (url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
      const authError = await validateApiKey(request, env);
      if (authError) return authError;
      return SpotifyMcp.serve('/sse').fetch(request, env, ctx);
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      return jsonResponse({
        name: SERVER_NAME,
        version: SERVER_VERSION,
        description: 'Governed Spotify MCP wrapper over RapidAPI with CREATE SOMETHING telemetry.',
        endpoints: {
          mcp: '/mcp',
          sse: '/sse',
        },
        auth: {
          configured: Boolean(resolveMcpApiKey(env)),
          transport: 'Authorization: Bearer <SPOTIFY_MCP_API_KEY> or X-API-Key',
        },
        provider: getSpotifyProviderStatus(resolveProviderConfig(env)),
        telemetry: {
          d1_configured: Boolean(env.TELEMETRY_DB),
          langfuse_configured: Boolean(env.LANGFUSE_PUBLIC_KEY && env.LANGFUSE_SECRET_KEY),
          langfuse_project_name: resolveLangfuseProjectName(env),
          langfuse_keys_configured: Boolean(env.LANGFUSE_PUBLIC_KEY && env.LANGFUSE_SECRET_KEY),
        },
        tools: listSpotifyToolNames(),
      });
    }

    return jsonResponse({ error: 'NotFound' }, 404);
  },
};
