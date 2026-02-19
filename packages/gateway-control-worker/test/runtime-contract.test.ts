import test from 'node:test';
import assert from 'node:assert/strict';

import worker from '../src/index';

interface D1Database {
  prepare(query: string): NoopStatement;
}

class NoopStatement {
  bind(): NoopStatement { return this; }
  async first<T = unknown>(): Promise<T | null> { return null; }
  async all<T = unknown>(): Promise<{ results: T[] }> { return { results: [] }; }
  async run(): Promise<{ success: boolean }> { return { success: true }; }
}

class NoopDb {
  prepare(): NoopStatement {
    return new NoopStatement();
  }
}

test('runtime endpoint rejects missing bearer token', async () => {
  const env = {
    DB: new NoopDb() as unknown as D1Database,
    TELEMETRY_DB: new NoopDb() as unknown as D1Database,
  };

  const request = new Request('https://example.test/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-4.1-mini', messages: [] }),
  });

  const response = await worker.fetch(request, env as never);
  assert.equal(response.status, 401);
});

test('admin route rejects when operator token is missing', async () => {
  const env = {
    DB: new NoopDb() as unknown as D1Database,
  };

  const request = new Request('https://example.test/api/tenants', {
    method: 'GET',
  });

  const response = await worker.fetch(request, env as never);
  assert.equal(response.status, 401);
});

test('health endpoint returns capability map', async () => {
  const env = {
    DB: new NoopDb() as unknown as D1Database,
  };

  const response = await worker.fetch(new Request('https://example.test/health'), env as never);
  assert.equal(response.status, 200);
  const payload = await response.json() as { ok: boolean; endpoints: Record<string, unknown> };
  assert.equal(payload.ok, true);
  assert.ok(payload.endpoints.runtime);
  assert.ok(payload.endpoints.admin);
});

test('admin performance endpoint requires telemetry binding', async () => {
  const env = {
    DB: new NoopDb() as unknown as D1Database,
    OPERATOR_API_TOKEN: 'test-token',
  };

  const request = new Request('https://example.test/api/admin/performance', {
    method: 'GET',
    headers: { authorization: 'Bearer test-token' },
  });

  const response = await worker.fetch(request, env as never);
  assert.equal(response.status, 503);
});
