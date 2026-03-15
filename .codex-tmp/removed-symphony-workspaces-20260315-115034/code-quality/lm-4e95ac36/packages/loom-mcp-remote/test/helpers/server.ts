import { createHmac } from 'node:crypto';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import worker from '../../index.js';
import type { Env } from '../../src/types.js';

export function signPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

export async function callMcpTool(
  env: Env,
  tool: string,
  args: Record<string, unknown> = {},
): Promise<any> {
  const response = await worker.fetch(
    new Request('http://loom.test/mcp', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.LOOM_MCP_API_TOKEN ?? ''}`,
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: `tool-${tool}`,
        method: 'tools/call',
        params: {
          name: tool,
          arguments: args,
        },
      }),
    }),
    env,
  );

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`MCP request failed (${response.status}): ${text}`);
  }

  const json = JSON.parse(text);
  const result = json?.result;
  if (result?.isError === true) {
    const message = result?.content?.[0]?.text ?? JSON.stringify(result);
    throw new Error(message);
  }

  return JSON.parse(result.content[0].text);
}

export async function startWorkerServer(env: Env): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  const server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const body = Buffer.concat(chunks);
    const address = server.address() as AddressInfo;
    const request = new Request(new URL(req.url ?? '/', `http://127.0.0.1:${address.port}`), {
      method: req.method,
      headers: req.headers as Record<string, string>,
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
    });

    const response = await worker.fetch(request, env);
    res.statusCode = response.status;
    res.setHeader('Connection', 'close');
    for (const [key, value] of response.headers.entries()) {
      res.setHeader(key, value);
    }
    const responseBody = Buffer.from(await response.arrayBuffer());
    res.end(responseBody);
  });
  server.keepAliveTimeout = 1;
  server.maxRequestsPerSocket = 1;

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address() as AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: async () => {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    },
  };
}
