/**
 * Cloudflare Worker entry point for the Webflow Site Analyzer MCP.
 *
 * Adapts the existing MCP server to run as a Cloudflare Worker with:
 * - StreamableHTTPServerTransport for MCP protocol
 * - Bearer token auth from Worker secrets
 * - Health endpoint at /
 * - MCP endpoint at /mcp
 *
 * Requires: nodejs_compat_v2, usage_model = "unbound"
 */

import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createAnalyzerServer, getAnalyzerHealth, shutdownAnalyzerServer } from './index.js';

interface Env {
  STEEL_API_KEY?: string;
  WEBFLOW_SITE_ANALYZER_MCP_API_KEY?: string;
  WEBFLOW_OPENAI_API_KEY?: string;
  BRAINTRUST_API_KEY?: string;
  BRAINTRUST_PROJECT_ID?: string;
  ENVIRONMENT?: string;
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Mcp-Session-Id, X-Requested-With, X-API-Key',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
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
  const keys: (keyof Env)[] = [
    'STEEL_API_KEY',
    'WEBFLOW_SITE_ANALYZER_MCP_API_KEY',
    'WEBFLOW_OPENAI_API_KEY',
    'BRAINTRUST_API_KEY',
    'BRAINTRUST_PROJECT_ID',
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
    // Inject secrets on every request (Workers are stateless)
    injectEnvSecrets(env);

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

    // MCP endpoint
    if (url.pathname === '/mcp') {
      if (!isAuthorized(request, env)) {
        return jsonResponse(
          { error: 'Unauthorized. Provide Authorization: Bearer <token>.' },
          401
        );
      }

      try {
        const server = createAnalyzerServer();
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
          enableJsonResponse: true,
        });

        // Convert Worker Request/Response to the transport's expected format.
        // StreamableHTTPServerTransport expects Node IncomingMessage/ServerResponse,
        // but with nodejs_compat_v2 we can bridge via a passthrough approach.
        const nodeReq = toNodeRequest(request);
        const { nodeRes, getResponse } = createNodeResponse();

        await server.connect(transport);
        await transport.handleRequest(nodeReq, nodeRes);

        return getResponse();
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

// =============================================================================
// Bridge: Worker Request/Response ↔ Node IncomingMessage/ServerResponse
// =============================================================================

import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import { Readable } from 'node:stream';

function toNodeRequest(request: Request): IncomingMessage {
  const url = new URL(request.url);
  const socket = new Socket();
  const req = new IncomingMessage(socket);

  req.method = request.method;
  req.url = url.pathname + url.search;
  req.headers = {};

  for (const [key, value] of request.headers.entries()) {
    req.headers[key.toLowerCase()] = value;
  }

  // Push the body if present
  if (request.body) {
    const reader = request.body.getReader();
    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            req.push(null);
            break;
          }
          req.push(Buffer.from(value));
        }
      } catch {
        req.push(null);
      }
    })();
  } else {
    req.push(null);
  }

  return req;
}

function createNodeResponse(): {
  nodeRes: ServerResponse;
  getResponse: () => Response;
} {
  const socket = new Socket();
  const req = new IncomingMessage(socket);
  const nodeRes = new ServerResponse(req);

  const chunks: Buffer[] = [];
  let statusCode = 200;
  let headers: Record<string, string> = {};

  // Capture writeHead
  const originalWriteHead = nodeRes.writeHead.bind(nodeRes);
  nodeRes.writeHead = function (code: number, headersOrReason?: any, maybeHeaders?: any) {
    statusCode = code;
    const h = typeof headersOrReason === 'object' ? headersOrReason : maybeHeaders;
    if (h) {
      for (const [key, value] of Object.entries(h)) {
        headers[key.toLowerCase()] = String(value);
      }
    }
    return originalWriteHead(code, headersOrReason, maybeHeaders);
  } as any;

  // Capture write/end
  const originalWrite = nodeRes.write.bind(nodeRes);
  nodeRes.write = function (chunk: any, ...args: any[]) {
    if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    return originalWrite(chunk, ...args);
  } as any;

  const originalEnd = nodeRes.end.bind(nodeRes);
  nodeRes.end = function (chunk?: any, ...args: any[]) {
    if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    return originalEnd(chunk, ...args);
  } as any;

  const getResponse = (): Response => {
    const body = Buffer.concat(chunks);
    return new Response(body, {
      status: statusCode,
      headers: { ...CORS_HEADERS, ...headers },
    });
  };

  return { nodeRes, getResponse };
}
