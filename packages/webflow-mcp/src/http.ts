#!/usr/bin/env node

import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from 'node:http';

import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

import { createWebflowMcpServer } from './index.js';

const DEFAULT_PORT = 8790;
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Mcp-Session-Id, X-Requested-With, X-API-Key',
};
const API_KEY_ENV_VARS = [
  'WEBFLOW_LOCAL_MCP_API_KEY',
  'WEBFLOW_MCP_API_KEY',
  'WEBFLOW_SITE_ANALYZER_MCP_API_KEY',
  'MCP_API_KEY',
] as const;

function parsePort(value: string | undefined): number {
  if (!value) return DEFAULT_PORT;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PORT;
}

function getApiKeys(): string[] {
  return [
    ...new Set(
      API_KEY_ENV_VARS.map((name) => process.env[name]?.trim()).filter(
        (value): value is string => Boolean(value),
      ),
    ),
  ];
}

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    ...CORS_HEADERS,
  });
  res.end(JSON.stringify(body, null, 2));
}

function parseBearerToken(request: IncomingMessage): string | null {
  const authorization = request.headers.authorization;
  if (!authorization) return null;
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? null;
}

function isAuthorized(request: IncomingMessage): boolean {
  const configuredTokens = getApiKeys();
  if (configuredTokens.length === 0) return true;

  const requestUrl = new URL(request.url ?? '/', 'http://localhost');
  const queryToken = requestUrl.searchParams.get('token')?.trim() ?? null;
  const headerToken =
    parseBearerToken(request) ??
    (Array.isArray(request.headers['x-api-key'])
      ? request.headers['x-api-key'][0]?.trim() ?? null
      : request.headers['x-api-key']?.trim() ?? null);

  return Boolean(
    (headerToken && configuredTokens.includes(headerToken)) || (queryToken && configuredTokens.includes(queryToken)),
  );
}

async function handleMcp(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (!isAuthorized(request)) {
    json(response, 401, {
      error: 'Unauthorized. Provide Authorization: Bearer <WEBFLOW_MCP_API_KEY>.',
    });
    return;
  }

  const server = createWebflowMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  response.on('close', () => {
    transport.close().catch(() => {});
  });

  await server.connect(transport);
  await transport.handleRequest(request, response);
}

async function main(): Promise<void> {
  const port = parsePort(process.env.PORT);
  const httpServer = createHttpServer(async (request, response) => {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);

    if (request.method === 'OPTIONS') {
      response.writeHead(204, CORS_HEADERS);
      response.end();
      return;
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      json(response, 200, {
        ok: true,
        name: 'webflow-mcp',
        transport: 'streamable-http',
        endpoint: '/mcp',
        auth: {
          configured: getApiKeys().length > 0,
          header: 'Authorization: Bearer <WEBFLOW_MCP_API_KEY>',
        },
      });
      return;
    }

    if (url.pathname === '/mcp') {
      try {
        await handleMcp(request, response);
      } catch (error) {
        json(response, 500, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    json(response, 404, { error: 'Not found. MCP endpoint is /mcp.' });
  });

  const closeAndExit = async (exitCode: number): Promise<void> => {
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
    process.exit(exitCode);
  };

  process.on('SIGINT', () => {
    closeAndExit(0).catch(() => process.exit(1));
  });

  process.on('SIGTERM', () => {
    closeAndExit(0).catch(() => process.exit(1));
  });

  httpServer.listen(port, () => {
    console.error(`Webflow MCP server running on Streamable HTTP :${port}/mcp`);
  });
}

main().catch((error) => {
  console.error('[webflow-mcp:http] fatal error:', error);
  process.exit(1);
});
