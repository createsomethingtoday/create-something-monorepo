/**
 * Cloudflare Worker entry point for the Webflow Site Analyzer MCP.
 *
 * Uses WebStandardStreamableHTTPServerTransport — the MCP SDK's native
 * Web Standard transport designed for Workers/Deno/Bun.  No Node.js bridge.
 */

import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import {
  configureTemplateReviewJobDurableObject,
  createAnalyzerServer,
  getAnalyzerHealth,
} from './index.js';
import type { TemplateReviewJobDurableObjectNamespace } from './template-review-jobs.js';

export { TemplateReviewJobDurableObject } from './template-review-job-durable-object.js';

interface Env {
  TEMPLATE_REVIEW_JOBS?: TemplateReviewJobDurableObjectNamespace;
  STEEL_API_KEY?: string;
  WEBFLOW_SITE_ANALYZER_MCP_API_KEY?: string;
  WEBFLOW_GROQ_API_KEY?: string;
  WEBFLOW_OPENAI_API_KEY?: string;
  LANGFUSE_PUBLIC_KEY?: string;
  LANGFUSE_SECRET_KEY?: string;
  LANGFUSE_HOST?: string;
  LANGFUSE_BASE_URL?: string;
  LANGFUSE_PROJECT_NAME?: string;
  ENVIRONMENT?: string;
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Mcp-Session-Id, X-Requested-With, X-API-Key',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function isAuthorized(request: Request, env: Env): boolean {
  const configuredToken = env.WEBFLOW_SITE_ANALYZER_MCP_API_KEY?.trim();
  if (!configuredToken) return true;

  const url = new URL(request.url);
  const queryToken = url.searchParams.get('token')?.trim() ?? null;
  const authorization = request.headers.get('Authorization');
  const bearerMatch = authorization?.match(/^Bearer\s+(.+)$/i);
  const headerToken = bearerMatch?.[1]?.trim()
    ?? request.headers.get('X-API-Key')?.trim()
    ?? null;

  return headerToken === configuredToken || queryToken === configuredToken;
}

/**
 * Inject Worker secrets into process.env so existing code that reads
 * process.env.STEEL_API_KEY etc. continues to work unchanged.
 */
function injectEnvSecrets(env: Env): void {
  const keys: Array<Exclude<keyof Env, 'TEMPLATE_REVIEW_JOBS'>> = [
    'STEEL_API_KEY',
    'WEBFLOW_SITE_ANALYZER_MCP_API_KEY',
    'WEBFLOW_GROQ_API_KEY',
    'WEBFLOW_OPENAI_API_KEY',
    'LANGFUSE_PUBLIC_KEY',
    'LANGFUSE_SECRET_KEY',
    'LANGFUSE_HOST',
    'LANGFUSE_BASE_URL',
    'LANGFUSE_PROJECT_NAME',
    'ENVIRONMENT',
  ];
  for (const key of keys) {
    if (env[key]) {
      process.env[key] = env[key];
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    injectEnvSecrets(env);
    configureTemplateReviewJobDurableObject(env.TEMPLATE_REVIEW_JOBS);

    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Health check
    if (url.pathname === '/' || url.pathname === '/health') {
      return jsonResponse({
        ...getAnalyzerHealth(),
        transport: 'streamable-http',
        endpoint: '/mcp',
        runtime: 'cloudflare-worker',
      });
    }

    // MCP endpoint — use Web Standard transport directly
    if (url.pathname === '/mcp') {
      if (!isAuthorized(request, env)) {
        return jsonResponse(
          { error: 'Unauthorized. Provide Authorization: Bearer <token>.' },
          401
        );
      }

      try {
        const server = createAnalyzerServer();
        const transport = new WebStandardStreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
          enableJsonResponse: true,
        });

        await server.connect(transport);
        return await transport.handleRequest(request);
      } catch (error) {
        return jsonResponse(
          { error: error instanceof Error ? error.message : String(error) },
          500
        );
      }
    }

    return jsonResponse({ error: 'Not found. MCP endpoint is /mcp.' }, 404);
  },
};
