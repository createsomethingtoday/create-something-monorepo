import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';

import {
  configureAnalyzerRuntime,
  configureTemplateReviewJobDurableObject,
  createAnalyzerServer,
  getAnalyzerHealth,
} from '../src/index.js';
import type { TemplateReviewJobDurableObjectNamespace } from '../src/template-review-jobs.js';
import { getWorkerApiKey, isWorkerRequestAuthorized } from '../src/worker-auth.js';

export { TemplateReviewJobDurableObject } from '../src/template-review-job-durable-object.js';

interface Env {
  TEMPLATE_REVIEW_JOBS?: TemplateReviewJobDurableObjectNamespace;
  WEBFLOW_SITE_ANALYZER_MCP_API_KEY?: string;
  MCP_API_KEY?: string;
  STEEL_API_KEY?: string;
  BROWSERLESS_API_KEY?: string;
  BROWSERLESS_TOKEN?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_BROWSER_RUN_API_TOKEN?: string;
  BROWSER_RUN_ENABLED?: string;
  WEBFLOW_TEMPLATE_REVIEW_MAX_CONCURRENT_JOBS?: string;
  WEBFLOW_TEMPLATE_REVIEW_MAX_QUEUE_SIZE?: string;
  LANGFUSE_PUBLIC_KEY?: string;
  LANGFUSE_SECRET_KEY?: string;
  LANGFUSE_PROJECT_NAME?: string;
  LANGFUSE_BASE_URL?: string;
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Mcp-Session-Id, X-Requested-With, X-API-Key',
};

function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body, null, 2), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      ...(init.headers ?? {}),
    },
  });
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

function parseOptionalPositiveInt(value: string | undefined): number | undefined {
  const parsed = value ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function configureRuntime(env: Env): void {
  configureAnalyzerRuntime({
    runtime: 'worker',
    apiKey: getWorkerApiKey(env) ?? undefined,
    browserProvider: {
      cloudflareBrowserRunEnabled: env.BROWSER_RUN_ENABLED !== 'false',
      cloudflareAccountId: env.CLOUDFLARE_ACCOUNT_ID,
      cloudflareBrowserRunApiToken: env.CLOUDFLARE_BROWSER_RUN_API_TOKEN,
      steelApiKey: env.STEEL_API_KEY,
      browserlessToken: env.BROWSERLESS_TOKEN ?? env.BROWSERLESS_API_KEY,
    },
    templateReviewMaxConcurrentJobs: parseOptionalPositiveInt(
      env.WEBFLOW_TEMPLATE_REVIEW_MAX_CONCURRENT_JOBS,
    ),
    templateReviewMaxQueueSize: parseOptionalPositiveInt(
      env.WEBFLOW_TEMPLATE_REVIEW_MAX_QUEUE_SIZE,
    ),
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    configureRuntime(env);
    configureTemplateReviewJobDurableObject(env.TEMPLATE_REVIEW_JOBS);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      return json({
        ...getAnalyzerHealth(),
        transport: 'streamable-http',
        endpoint: '/mcp',
      });
    }

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      if (!isWorkerRequestAuthorized(request, env)) {
        return json(
          { error: 'Unauthorized. Provide Authorization: Bearer <WEBFLOW_SITE_ANALYZER_MCP_API_KEY>.' },
          { status: 401 },
        );
      }

      try {
        const server = createAnalyzerServer();
        const transport = new WebStandardStreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
          enableJsonResponse: true,
        });

        await server.connect(transport);
        return withCors(await transport.handleRequest(request));
      } catch (error) {
        return json(
          {
            error: error instanceof Error ? error.message : String(error),
          },
          { status: 500 },
        );
      }
    }

    return json({ error: 'Not found. MCP endpoint is /mcp.' }, { status: 404 });
  },
};
