import { createServer, type ServerResponse } from 'node:http';

import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  createOfferHttpHandler,
  type FindOffersServiceResult,
  type OfferService,
  type WatchOffersInput
} from '@create-something/offer-resolution';

import { createOfferSavingsMcpServer } from './index.js';
import { OFFER_SAVINGS_WIDGET_HTML } from './widget.js';

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers':
    'Content-Type, Authorization, Accept, Mcp-Protocol-Version, Mcp-Session-Id',
  'access-control-expose-headers': 'Mcp-Session-Id'
} as const;

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    ...CORS_HEADERS,
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  response.end(`${JSON.stringify(body)}\n`);
}

export interface CreateOfferSavingsHttpServerOptions {
  service: OfferService;
  widgetHtml?: string;
  standalone?: {
    initialResult: FindOffersServiceResult;
    watchInput: WatchOffersInput;
  };
}

function standaloneHtml(options: CreateOfferSavingsHttpServerOptions): string {
  const html = options.widgetHtml ?? OFFER_SAVINGS_WIDGET_HTML;
  if (!options.standalone) return html;
  const payload = JSON.stringify(options.standalone).replaceAll('<', '\\u003c');
  return html.replace(
    '</head>',
    `<script>window.__OFFER_SAVINGS_STANDALONE__=${payload};</script></head>`
  );
}

export function createOfferSavingsHttpServer(options: CreateOfferSavingsHttpServerOptions) {
  const apiHandler = createOfferHttpHandler(options.service);

  return createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);

    if (request.method === 'OPTIONS') {
      response.writeHead(204, CORS_HEADERS);
      response.end();
      return;
    }

    if (request.method === 'GET' && url.pathname === '/health') {
      sendJson(response, 200, {
        ok: true,
        service: 'offer-savings-agent',
        schemaVersion: 'offer_service.v0.1',
        mcpEndpoint: '/mcp'
      });
      return;
    }

    if (request.method === 'GET' && url.pathname === '/widget') {
      response.writeHead(200, {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store'
      });
      response.end(standaloneHtml(options));
      return;
    }

    if (request.method === 'GET' && url.pathname === '/favicon.ico') {
      response.writeHead(204, { 'cache-control': 'public, max-age=86400' });
      response.end();
      return;
    }

    if (url.pathname.startsWith('/v1/')) {
      apiHandler(request, response);
      return;
    }

    if (url.pathname === '/mcp') {
      const server = createOfferSavingsMcpServer(options);
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true
      });
      response.on('close', () => {
        void transport.close();
        void server.close();
      });
      try {
        await server.connect(transport);
        await transport.handleRequest(request, response);
      } catch (error: unknown) {
        if (!response.headersSent) {
          sendJson(response, 500, {
            error: 'mcp_transport_error',
            message: error instanceof Error ? error.message : 'The MCP request failed.'
          });
        }
      }
      return;
    }

    sendJson(response, 404, {
      error: 'not_found',
      message: 'Use /mcp for MCP, /v1 for the HTTP API, or /health for readiness.'
    });
  });
}
