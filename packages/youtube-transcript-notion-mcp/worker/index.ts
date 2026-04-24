import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import { enableTelemetry } from '@create-something/mcp-core';

import {
  createRuntimeDependencies,
  registerPrompts,
  registerResources,
  registerTools,
  resolveRuntimeConfig,
  SERVER_NAME,
  SERVER_VERSION,
} from '../src/index.js';
import {
  resolveBraintrustProjectName,
  type PackageEnv,
} from '../src/config.js';

interface Env extends PackageEnv {
  MCP_OBJECT: DurableObjectNamespace;
  TELEMETRY_DB?: D1Database;
}

export class YouTubeTranscriptNotionMCP extends McpAgent<Env> {
  server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  async init() {
    if (this.env.TELEMETRY_DB) {
      enableTelemetry(this.server, this.env.TELEMETRY_DB as any, SERVER_NAME, undefined, {
        apiKey: this.env.BRAINTRUST_API_KEY,
        projectName: resolveBraintrustProjectName(this.env),
        projectId: this.env.BRAINTRUST_PROJECT_ID,
      });
    }

    const runtime = createRuntimeDependencies(this.env);
    registerResources(this.server, runtime);
    registerTools(this.server, runtime);
    registerPrompts(this.server);
  }
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, content-type, mcp-protocol-version, mcp-session-id',
  'Access-Control-Expose-Headers': 'mcp-session-id',
  'Access-Control-Max-Age': '86400',
};

function preflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function isAuthorized(request: Request, env: Env): boolean {
  if (!env.MCP_BEARER_TOKEN?.trim()) {
    return true;
  }

  const authorization = request.headers.get('authorization');
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] === env.MCP_BEARER_TOKEN;
}

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: 'Unauthorized' }, null, 2), {
    status: 401,
    headers: {
      'Content-Type': 'application/json',
      'WWW-Authenticate': 'Bearer realm="mcp"',
      ...CORS_HEADERS,
    },
  });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const runtimeConfig = resolveRuntimeConfig(env);

    if (request.method === 'OPTIONS') {
      return preflight();
    }

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      if (!isAuthorized(request, env)) {
        return unauthorized();
      }
      return withCors(
        await YouTubeTranscriptNotionMCP.serve('/mcp').fetch(request, env, ctx),
      );
    }

    if (url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
      if (!isAuthorized(request, env)) {
        return unauthorized();
      }
      return withCors(
        await YouTubeTranscriptNotionMCP.serve('/sse').fetch(request, env, ctx),
      );
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      const runtime = createRuntimeDependencies(env);
      return json({
        name: SERVER_NAME,
        version: SERVER_VERSION,
        displayName: runtimeConfig.displayName,
        description: runtimeConfig.description,
        directProviderMode: runtimeConfig.directProviderMode,
        endpoints: {
          mcp: '/mcp',
          sse: '/sse',
        },
        capabilities: {
          supadataConfigured: Boolean(env.SUPADATA_API_KEY),
          directTranscript: true,
          browserFallbackConfigured: Boolean(env.STEEL_API_KEY),
          notionConfigured: Boolean(env.NOTION_API_KEY),
          defaultDatabaseConfigured: Boolean(runtimeConfig.defaultDatabaseId),
          bearerProtectionEnabled: runtimeConfig.security.bearerProtectionEnabled,
        },
        security: runtime.serverInfo.security,
        transcript: runtime.transcriptService.getStatus(),
        notion: runtime.notionService.getStatus(),
        configWarnings: runtimeConfig.configWarnings,
      });
    }

    return json({ error: 'Not found' }, 404);
  },
};
