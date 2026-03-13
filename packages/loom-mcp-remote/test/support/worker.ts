import { createHmac } from 'node:crypto';
import { once } from 'node:events';
import http from 'node:http';

import worker from '../../index.js';
import type { Env } from '../../src/types.js';
import { createTestD1 } from './d1.js';

export interface TestEnvOptions {
  loomToken?: string;
  migrationToken?: string;
  signingSecret?: string;
  notionToken?: string;
  repoId?: string;
}

export function createTestEnv(options: TestEnvOptions = {}) {
  const db = createTestD1();
  const env: Env = {
    DB: db as unknown as D1Database,
    LOOM_MCP_API_TOKEN: options.loomToken ?? 'loom-token',
    MIGRATION_ADMIN_TOKEN: options.migrationToken ?? 'migration-token',
    MIGRATION_SIGNING_SECRET: options.signingSecret ?? 'signing-secret',
    LOOM_NOTION_TOKEN: options.notionToken,
    LOOM_REPO_ID: options.repoId,
  };

  return { db, env };
}

export async function callWorker(request: Request, env: Env): Promise<Response> {
  return worker.fetch(request, env);
}

export function signedHeaders(body: string, env: Env): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${env.MIGRATION_ADMIN_TOKEN ?? ''}`,
    'Content-Type': 'application/json',
  };

  if (env.MIGRATION_SIGNING_SECRET) {
    headers['X-Migration-Signature'] = createHmac('sha256', env.MIGRATION_SIGNING_SECRET).update(body).digest('hex');
  }

  return headers;
}

export async function mcpCall(env: Env, name: string, args: Record<string, unknown> = {}): Promise<any> {
  const response = await callWorker(
    new Request('https://loom.test/mcp', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.LOOM_MCP_API_TOKEN ?? ''}`,
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: `${name}-1`,
        method: 'tools/call',
        params: {
          name,
          arguments: args,
        },
      }),
    }),
    env,
  );

  const payload = (await response.json()) as {
    result?: {
      isError?: boolean;
      content?: Array<{ text?: string }>;
    };
  };
  const result = payload?.result;
  if (result?.isError) {
    throw new Error(result?.content?.[0]?.text ?? JSON.stringify(result));
  }
  const text = result?.content?.[0]?.text;
  return text ? JSON.parse(text) : result;
}

export async function startWorkerServer(env: Env) {
  const server = http.createServer(async (req, res) => {
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }

      const request = new Request(`http://127.0.0.1${req.url ?? '/'}`, {
        method: req.method,
        headers: req.headers as Record<string, string>,
        body: req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks),
      });

      const response = await callWorker(request, env);
      res.statusCode = response.status;
      response.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });
      const body = Buffer.from(await response.arrayBuffer());
      res.end(body);
    } catch (error) {
      res.statusCode = 500;
      res.end(error instanceof Error ? error.message : String(error));
    }
  });

  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to start test HTTP server');
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: async () => {
      server.close();
      await once(server, 'close');
    },
  };
}
