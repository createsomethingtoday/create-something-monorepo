import assert from 'node:assert/strict';
import test from 'node:test';

import { handleRequest } from '../index.ts';
import { extractSseDataPayloads, parseTransportResponse } from '../src/bridge.ts';

function makeSseResponse(payloads: unknown[], init?: ResponseInit & { sessionId?: string }): Response {
  const body = payloads
    .map((payload) => `event: message\ndata: ${JSON.stringify(payload)}\n\n`)
    .join('');

  const headers = new Headers(init?.headers);
  headers.set('content-type', 'text/event-stream');
  if (init?.sessionId) {
    headers.set('mcp-session-id', init.sessionId);
  }

  return new Response(body, {
    status: init?.status ?? 200,
    statusText: init?.statusText,
    headers,
  });
}

test('extractSseDataPayloads preserves message boundaries', () => {
  const payloads = extractSseDataPayloads(
    ['event: ping', 'data: keepalive', '', 'event: message', 'data: {"jsonrpc":"2.0"}', ''].join('\n'),
  );

  assert.deepEqual(payloads, ['keepalive', '{"jsonrpc":"2.0"}']);
});

test('parseTransportResponse unwraps the last JSON payload from SSE', async () => {
  const response = makeSseResponse(
    [
      { ignore: true },
      { jsonrpc: '2.0', id: 'tool-1', result: { count: 3 } },
    ],
    { sessionId: 'ms_upstream' },
  );

  const parsed = await parseTransportResponse(response);
  assert.equal(parsed.sessionId, 'ms_upstream');
  assert.deepEqual(parsed.body, {
    jsonrpc: '2.0',
    id: 'tool-1',
    result: { count: 3 },
  });
});

test('handleRequest re-initializes upstream per tool call, unwraps SSE, and cleans up the session', async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{
    method: string;
    url: string;
    headers: Record<string, string>;
    body: unknown;
  }> = [];

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = input instanceof Request ? input : new Request(String(input), init);
    const bodyText =
      request.method === 'DELETE' || request.method === 'GET' || request.method === 'HEAD'
        ? ''
        : await request.text();
    const parsedBody = bodyText.length > 0 ? JSON.parse(bodyText) : null;

    calls.push({
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers.entries()),
      body: parsedBody,
    });

    if (request.method === 'POST' && calls.length === 1) {
      return makeSseResponse(
        [
          {
            jsonrpc: '2.0',
            id: 'bridge-initialize',
            result: {
              protocolVersion: '2025-03-26',
              capabilities: {},
              serverInfo: { name: 'abundance-jobs', version: '1.0.0' },
            },
          },
        ],
        { sessionId: 'ms_upstream' },
      );
    }

    if (request.method === 'POST' && calls.length === 2) {
      return new Response(null, { status: 202 });
    }

    if (request.method === 'POST' && calls.length === 3) {
      return makeSseResponse([
        {
          jsonrpc: '2.0',
          id: 'tool-1',
          result: {
            content: [{ type: 'text', text: 'Found 12 jobs in New York.' }],
          },
        },
      ]);
    }

    if (request.method === 'DELETE' && calls.length === 4) {
      return new Response(null, { status: 204 });
    }

    throw new Error(`Unexpected upstream request #${calls.length}: ${request.method} ${request.url}`);
  };

  try {
    const response = await handleRequest(
      new Request('https://bridge.example/mcp', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': 'bridge-key',
          'mcp-protocol-version': '2025-03-26',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'tool-1',
          method: 'tools/call',
          params: {
            name: 'list_public_jobs',
            arguments: {
              state: 'NY',
              limit: 25,
            },
          },
        }),
      }),
      {
        UPSTREAM_MCP_URL: 'https://upstream.example/mcp',
        UPSTREAM_BEARER_TOKEN: 'upstream-secret',
        UPSTREAM_HEADERS_JSON: '{"x-mcp-account-id":"acct_abundance"}',
        BRIDGE_API_KEY: 'bridge-key',
      },
    );

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8');

    const body = (await response.json()) as {
      jsonrpc: string;
      id: string;
      result: {
        content: Array<{ type: string; text: string }>;
      };
    };
    assert.equal(body.jsonrpc, '2.0');
    assert.equal(body.id, 'tool-1');
    assert.equal(body.result.content[0]?.text, 'Found 12 jobs in New York.');

    assert.equal(calls.length, 4);

    assert.equal(calls[0].method, 'POST');
    assert.equal((calls[0].body as { method: string }).method, 'initialize');
    assert.equal(calls[0].headers.authorization, 'Bearer upstream-secret');
    assert.equal(calls[0].headers['x-mcp-account-id'], 'acct_abundance');
    assert.equal(calls[0].headers.accept, 'application/json, text/event-stream');

    assert.equal((calls[1].body as { method: string }).method, 'notifications/initialized');
    assert.equal(calls[1].headers['mcp-session-id'], 'ms_upstream');

    assert.equal((calls[2].body as { method: string }).method, 'tools/call');
    assert.equal(calls[2].headers['mcp-session-id'], 'ms_upstream');
    assert.equal(calls[2].headers.authorization, 'Bearer upstream-secret');
    assert.equal(calls[2].headers['x-mcp-account-id'], 'acct_abundance');

    assert.equal(calls[3].method, 'DELETE');
    assert.equal(calls[3].headers['mcp-session-id'], 'ms_upstream');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
