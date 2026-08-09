/**
 * Cloudflare Worker entry point for the Webflow Site Analyzer MCP.
 *
 * Uses WebStandardStreamableHTTPServerTransport — the MCP SDK's native
 * Web Standard transport designed for Workers/Deno/Bun.  No Node.js bridge.
 */

import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import {
  configureAnalyzerRuntime,
  configureTemplateReviewJobDurableObject,
  createAnalyzerServer,
  getAnalyzerHealth,
} from './index.js';
import type { TemplateReviewJobDurableObjectNamespace } from './template-review-jobs.js';
import { isWorkerRequestAuthorized } from './worker-auth.js';

export { TemplateReviewJobDurableObject } from './template-review-job-durable-object.js';

interface Env {
  TEMPLATE_REVIEW_JOBS?: TemplateReviewJobDurableObjectNamespace;
  STEEL_API_KEY?: string;
  BROWSERLESS_API_KEY?: string;
  BROWSERLESS_TOKEN?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_BROWSER_RUN_API_TOKEN?: string;
  BROWSER_RUN_ENABLED?: string;
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

/**
 * Preserve only unrelated legacy classifier/telemetry environment access.
 * Browser and request-auth bindings flow through configureAnalyzerRuntime.
 */
function injectLegacyNonBrowserSecrets(env: Env): void {
  const keys: Array<
    | 'WEBFLOW_GROQ_API_KEY'
    | 'WEBFLOW_OPENAI_API_KEY'
    | 'LANGFUSE_PUBLIC_KEY'
    | 'LANGFUSE_SECRET_KEY'
    | 'LANGFUSE_HOST'
    | 'LANGFUSE_BASE_URL'
    | 'LANGFUSE_PROJECT_NAME'
    | 'ENVIRONMENT'
  > = [
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

function configureRuntime(env: Env): void {
  configureAnalyzerRuntime({
    runtime: 'worker',
    apiKey: env.WEBFLOW_SITE_ANALYZER_MCP_API_KEY,
    browserProvider: {
      cloudflareBrowserRunEnabled: env.BROWSER_RUN_ENABLED === 'true',
      cloudflareAccountId: env.CLOUDFLARE_ACCOUNT_ID,
      cloudflareBrowserRunApiToken: env.CLOUDFLARE_BROWSER_RUN_API_TOKEN,
      steelApiKey: env.STEEL_API_KEY,
      browserlessToken: env.BROWSERLESS_TOKEN ?? env.BROWSERLESS_API_KEY,
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    configureRuntime(env);
    injectLegacyNonBrowserSecrets(env);
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
      if (!isWorkerRequestAuthorized(request, env)) {
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
