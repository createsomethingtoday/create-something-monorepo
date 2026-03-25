#!/usr/bin/env node

import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from 'node:http';

import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

import {
  WEBFLOW_ORIGINALITY_SERVER_NAME,
  createWebflowMcpServer,
} from './server.js';

const DEFAULT_PORT = 8789;
const PRIMARY_API_TOKEN_ENV_VAR = 'WEBFLOW_ORIGINALITY_MCP_API_TOKEN';
const LEGACY_API_TOKEN_ENV_VAR = 'WEBFLOW_LOCAL_MCP_API_TOKEN';
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Mcp-Session-Id, X-Requested-With, X-API-Key',
};

function getApiKey(): string | null {
  const value =
    process.env[PRIMARY_API_TOKEN_ENV_VAR]?.trim() ??
    process.env[LEGACY_API_TOKEN_ENV_VAR]?.trim() ??
    process.env.MCP_API_KEY?.trim() ??
    '';
  return value ? value : null;
}

function parsePort(value: string | undefined): number {
  if (!value) return DEFAULT_PORT;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PORT;
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
  const configuredToken = getApiKey();
  if (!configuredToken) return true;

  const requestUrl = new URL(request.url ?? '/', 'http://localhost');
  const queryToken = requestUrl.searchParams.get('token')?.trim() ?? null;
  const headerToken =
    parseBearerToken(request) ??
    (Array.isArray(request.headers['x-api-key'])
      ? request.headers['x-api-key'][0]?.trim() ?? null
      : request.headers['x-api-key']?.trim() ?? null);

  return headerToken === configuredToken || queryToken === configuredToken;
}

async function handleMcp(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (!isAuthorized(request)) {
    json(response, 401, {
      error: `Unauthorized. Provide Authorization: Bearer <${PRIMARY_API_TOKEN_ENV_VAR}>.`,
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
        name: WEBFLOW_ORIGINALITY_SERVER_NAME,
        transport: 'streamable-http',
        endpoint: '/mcp',
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

  httpServer.listen(port, () => {
    console.error(`${WEBFLOW_ORIGINALITY_SERVER_NAME} server running on Streamable HTTP :${port}/mcp`);
  });
}

main().catch((error) => {
  console.error(`[${WEBFLOW_ORIGINALITY_SERVER_NAME}:http] fatal error:`, error);
  process.exit(1);
});
