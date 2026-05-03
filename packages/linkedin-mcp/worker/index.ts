import { enableTelemetry } from '@create-something/mcp-core';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import {
  DEFAULT_RAPIDAPI_HOST,
  DEFAULT_TIMEOUT_MS,
  getLinkedInProviderStatus,
  listLinkedInToolNames,
  registerLinkedInTools,
  SERVER_NAME,
  SERVER_VERSION,
  type LinkedInProviderConfig
} from '../src/index.js';

interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  TELEMETRY_DB?: D1Database;
  BRAINTRUST_API_KEY?: string;
  BRAINTRUST_PROJECT_NAME?: string;
  BRAINTRUST_PROJECT_ID?: string;
  MCP_API_KEY?: string;
  LINKEDIN_MCP_API_KEY?: string;
  MCP_ACCOUNT_ID?: string;
  RAPIDAPI_KEY?: string;
  LINKEDIN_RAPIDAPI_KEY?: string;
  LINKEDIN_RAPIDAPI_HOST?: string;
  LINKEDIN_RAPIDAPI_BASE_URL?: string;
  LINKEDIN_RAPIDAPI_TIMEOUT_MS?: string;
  LINKEDIN_RAPIDAPI_MAX_RESPONSE_BYTES?: string;
}

const DEFAULT_BRAINTRUST_PROJECT_NAME = 'CREATE SOMETHING';
const DEFAULT_ACCOUNT_ID = 'linkedin-agent';
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'Authorization, Content-Type, X-API-Key, X-MCP-Account-ID, X-Account-ID',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

function resolveBraintrustProjectName(env: Env): string {
  const configured = env.BRAINTRUST_PROJECT_NAME?.trim();
  return configured && configured.length > 0 ? configured : DEFAULT_BRAINTRUST_PROJECT_NAME;
}

function parsePositiveInt(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function resolveProviderConfig(env: Env): LinkedInProviderConfig {
  return {
    apiKey: env.LINKEDIN_RAPIDAPI_KEY?.trim() || env.RAPIDAPI_KEY?.trim(),
    host: env.LINKEDIN_RAPIDAPI_HOST?.trim() || DEFAULT_RAPIDAPI_HOST,
    baseUrl: env.LINKEDIN_RAPIDAPI_BASE_URL?.trim(),
    timeoutMs: parsePositiveInt(env.LINKEDIN_RAPIDAPI_TIMEOUT_MS) ?? DEFAULT_TIMEOUT_MS,
    maxResponseBytes: parsePositiveInt(env.LINKEDIN_RAPIDAPI_MAX_RESPONSE_BYTES)
  };
}

function resolveMcpApiKey(env: Env): string | null {
  return env.LINKEDIN_MCP_API_KEY?.trim() || env.MCP_API_KEY?.trim() || null;
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
        message: 'LINKEDIN_MCP_API_KEY or MCP_API_KEY is not configured for this deployment.'
      },
      500
    );
  }

  const provided = extractProvidedApiKey(request);
  if (!provided || !(await constantTimeTokenEqual(provided, configured))) {
    return jsonResponse(
      {
        error: 'Unauthorized',
        message: 'Valid API key required. Use Authorization: Bearer <token> or X-API-Key.'
      },
      401
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
      ...CORS_HEADERS
    }
  });
}

export class LinkedInMcp extends McpAgent<Env> {
  server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION
  });

  private currentAccountId = DEFAULT_ACCOUNT_ID;

  override async fetch(request: Request): Promise<Response> {
    this.currentAccountId = getAccountIdFromRequest(request, this.env);
    return super.fetch(request);
  }

  async init() {
    enableTelemetry(this.server, this.env.TELEMETRY_DB, SERVER_NAME, () => this.currentAccountId, {
      apiKey: this.env.BRAINTRUST_API_KEY,
      projectName: resolveBraintrustProjectName(this.env),
      projectId: this.env.BRAINTRUST_PROJECT_ID
    });

    registerLinkedInTools(this.server, {
      getProviderConfig: () => resolveProviderConfig(this.env)
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
      return LinkedInMcp.serve('/mcp').fetch(request, env, ctx);
    }

    if (url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
      const authError = await validateApiKey(request, env);
      if (authError) return authError;
      return LinkedInMcp.serve('/sse').fetch(request, env, ctx);
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      return jsonResponse({
        name: SERVER_NAME,
        version: SERVER_VERSION,
        description:
          'Governed LinkedIn Data API MCP wrapper over RapidAPI with CREATE SOMETHING telemetry.',
        endpoints: {
          mcp: '/mcp',
          sse: '/sse'
        },
        auth: {
          configured: Boolean(resolveMcpApiKey(env)),
          transport: 'Authorization: Bearer <LINKEDIN_MCP_API_KEY> or X-API-Key'
        },
        provider: getLinkedInProviderStatus(resolveProviderConfig(env)),
        telemetry: {
          d1_configured: Boolean(env.TELEMETRY_DB),
          braintrust_configured: Boolean(env.BRAINTRUST_API_KEY),
          braintrust_project_name: resolveBraintrustProjectName(env),
          braintrust_project_id_configured: Boolean(env.BRAINTRUST_PROJECT_ID)
        },
        tools: listLinkedInToolNames()
      });
    }

    return jsonResponse({ error: 'NotFound' }, 404);
  }
};
