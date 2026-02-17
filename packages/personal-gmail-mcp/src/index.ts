#!/usr/bin/env node

import { config } from 'dotenv';
import { resolve } from 'node:path';
config({ path: resolve(import.meta.dirname, '../.env') });

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer as createHttpServer } from 'node:http';

import { createMcpServer } from './server.js';
import { GmailOAuth } from './gmail/oauth.js';

const command = process.argv[2];

if (command === 'auth') {
  const oauth = new GmailOAuth();
  oauth.runAuthFlow()
    .then(() => {
      // eslint-disable-next-line no-console
      console.error('[personal-gmail-mcp] Gmail authorized successfully');
      process.exit(0);
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error('[personal-gmail-mcp] Auth failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
} else {
  startServer().catch((error) => {
    // eslint-disable-next-line no-console
    console.error('[personal-gmail-mcp] Server error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

async function startServer(): Promise<void> {
  const transport = (process.env.TRANSPORT || 'stdio').trim().toLowerCase();
  if (transport === 'http') {
    await runHTTP();
    return;
  }
  await runStdio();
}

async function runStdio(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // eslint-disable-next-line no-console
  console.error('[personal-gmail-mcp] running on stdio');
}

async function runHTTP(): Promise<void> {
  const port = parseInt(process.env.PORT || '3850', 10);

  const httpServer = createHttpServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://localhost:${port}`);

    // CORS (local dev)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key, Accept');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        server: 'personal-gmail-mcp',
        transport: 'streamable-http',
        endpoint: '/mcp',
      }));
      return;
    }

    if (url.pathname === '/mcp') {
      // Create a new server instance per request (matches SDK expectations in HTTP mode)
      const server = createMcpServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // stateless
        enableJsonResponse: true,
      });

      res.on('close', () => transport.close());
      await server.connect(transport);
      await transport.handleRequest(req, res);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found. MCP endpoint is at /mcp' }));
  });

  httpServer.listen(port, () => {
    // eslint-disable-next-line no-console
    console.error(`[personal-gmail-mcp] running on Streamable HTTP :${port} (endpoint: /mcp)`);
  });

  process.on('SIGINT', () => {
    httpServer.close();
    process.exit(0);
  });
}

