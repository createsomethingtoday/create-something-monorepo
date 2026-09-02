import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import { enableTelemetry } from '@create-something/mcp-core';
import {
  DEFAULT_AGENCY_BASE_URL,
  isAcceptedHealthcareBearer,
  registerAbundanceHealthcareTools,
  SERVER_NAME,
  SERVER_VERSION,
} from '../src/index.js';

interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  TELEMETRY_DB?: D1Database;
  LANGFUSE_PUBLIC_KEY?: string;
  LANGFUSE_SECRET_KEY?: string;
  LANGFUSE_PROJECT_NAME?: string;
  MCP_ACCOUNT_ID?: string;
  ABUNDANCE_MCP_BEARER_TOKEN?: string;
  ABUNDANCE_HEALTHCARE_MCP_API_KEY?: string;
  MCP_API_KEY?: string;
  AGENCY_INTERNAL_API_KEY?: string;
  AGENCY_BASE_URL?: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-API-Key, X-MCP-Account-ID, X-Account-ID',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export class AbundanceHealthcareMCP extends McpAgent<Env> {
  server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  private currentAccountId = 'abundance-healthcare-agent';

  override async fetch(request: Request): Promise<Response> {
    this.currentAccountId = request.headers.get('X-MCP-Account-ID')?.trim()
      || request.headers.get('X-Account-ID')?.trim()
      || this.env.MCP_ACCOUNT_ID?.trim()
      || 'abundance-healthcare-agent';
    return super.fetch(request);
  }

  async init() {
    enableTelemetry(this.server, this.env.TELEMETRY_DB, SERVER_NAME, () => this.currentAccountId, {
      publicKey: this.env.LANGFUSE_PUBLIC_KEY,
      secretKey: this.env.LANGFUSE_SECRET_KEY,
      projectName: this.env.LANGFUSE_PROJECT_NAME?.trim() || 'CREATE SOMETHING',
    });
    registerAbundanceHealthcareTools(this.server, {
      agencyApiKey: this.env.AGENCY_INTERNAL_API_KEY,
      agencyBaseUrl: this.env.AGENCY_BASE_URL?.trim() || DEFAULT_AGENCY_BASE_URL,
    });
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
    if (url.pathname === '/health') return jsonResponse({ ok: true, service: SERVER_NAME, version: SERVER_VERSION });
    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/') || url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
      const authError = await validateApiKey(request, env);
      if (authError) return authError;
      return AbundanceHealthcareMCP.serve(url.pathname.startsWith('/sse') ? '/sse' : '/mcp').fetch(request, env, ctx);
    }
    return jsonResponse({ error: 'NotFound', endpoints: ['/health', '/mcp'] }, 404);
  },
};

export async function validateApiKey(
  request: Request,
  env: Pick<Env, 'ABUNDANCE_MCP_BEARER_TOKEN' | 'ABUNDANCE_HEALTHCARE_MCP_API_KEY' | 'MCP_API_KEY'>,
): Promise<Response | null> {
  const configured = [
    env.ABUNDANCE_MCP_BEARER_TOKEN,
    env.ABUNDANCE_HEALTHCARE_MCP_API_KEY,
    env.MCP_API_KEY,
  ].map((value) => value?.trim()).filter((value): value is string => Boolean(value));
  if (configured.length === 0) return jsonResponse({ error: 'ServerMisconfigured', message: 'Healthcare MCP bearer token is not configured.' }, 500);
  const auth = request.headers.get('Authorization');
  const provided = auth?.toLowerCase().startsWith('bearer ')
    ? auth.slice(7).trim()
    : request.headers.get('X-API-Key')?.trim();
  if (!(await isAcceptedHealthcareBearer(provided, configured))) {
    return jsonResponse({ error: 'Unauthorized', message: 'Valid API key required.' }, 401);
  }
  return null;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}
