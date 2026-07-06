import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { enableTelemetry } from '@create-something/mcp-core';

import { healthCounts } from './src/db.js';
import { handleMigrationExport, handleMigrationImport } from './src/migration.js';
import { registerLoomTools } from './src/tools.js';
import type { Env } from './src/types.js';
import { jsonResponse } from './src/utils.js';

const SERVER_NAME = 'loom-mcp';
const SERVER_VERSION = '1.0.0';

function resolveTelemetryAccountId(env: Env): string {
  return env.LOOM_ACCOUNT_ID?.trim() || env.MCP_ACCOUNT_ID?.trim() || 'operator';
}

function parseBearerToken(request: Request): string | null {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7).trim();
}

function validateMcpAuth(request: Request, env: Env): Response | null {
  if (!env.LOOM_MCP_API_TOKEN) return null;

  const bearer = parseBearerToken(request);
  const xApiKey = request.headers.get('X-API-Key')?.trim() ?? null;
  if (bearer === env.LOOM_MCP_API_TOKEN || xApiKey === env.LOOM_MCP_API_TOKEN) {
    return null;
  }

  return jsonResponse(
    {
      error: 'Unauthorized',
      message: 'Valid Loom MCP API token required. Use Authorization: Bearer <token> or X-API-Key.',
    },
    401,
  );
}

function createServer(env: Env): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  if (env.TELEMETRY_DB) {
    enableTelemetry(server, env.TELEMETRY_DB, SERVER_NAME, () => resolveTelemetryAccountId(env), {
      publicKey: env.LANGFUSE_PUBLIC_KEY,
      secretKey: env.LANGFUSE_SECRET_KEY,
      projectName: env.LANGFUSE_PROJECT_NAME ?? SERVER_NAME,
      enabled: env.LANGFUSE_ENABLED ? env.LANGFUSE_ENABLED !== 'false' : true,
    });
  }

  registerLoomTools(server, env);
  return server;
}

function corsPreflightResponse(): Response {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-Migration-Signature, Accept',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return corsPreflightResponse();
    }

    if ((url.pathname === '/health' || url.pathname === '/') && request.method === 'GET') {
      try {
        const counts = await healthCounts(env.DB);
        return jsonResponse({
          status: 'ok',
          server: SERVER_NAME,
          version: SERVER_VERSION,
          timestamp: new Date().toISOString(),
          endpoints: {
            mcp: '/mcp',
            health: '/health',
            admin_export: '/admin/export',
            admin_migrate: '/admin/migrate',
          },
          auth: {
            mcp_bearer_required: Boolean(env.LOOM_MCP_API_TOKEN),
            admin_token_required: Boolean(env.MIGRATION_ADMIN_TOKEN),
            signed_payload_required: Boolean(env.MIGRATION_SIGNING_SECRET),
          },
          counts,
        });
      } catch (error) {
        return jsonResponse(
          {
            status: 'degraded',
            server: SERVER_NAME,
            version: SERVER_VERSION,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
          },
          503,
        );
      }
    }

    if (url.pathname === '/admin/export' && request.method === 'GET') {
      return handleMigrationExport(request, env);
    }

    if (url.pathname === '/admin/migrate' && request.method === 'POST') {
      return handleMigrationImport(request, env);
    }

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      const authError = validateMcpAuth(request, env);
      if (authError) return authError;

      const server = createServer(env);
      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });

      await server.connect(transport);
      return transport.handleRequest(request);
    }

    return jsonResponse({ error: 'Not found. Loom MCP endpoint is at /mcp' }, 404);
  },
};
