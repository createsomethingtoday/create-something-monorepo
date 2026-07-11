import { describe, expect, it, vi } from 'vitest';

import { createTemplateAgentWorker } from '../src/index.js';
import type { Env } from '../src/types.js';

function testEnv(): Env {
  return {
    ANTHROPIC_API_KEY: 'test-key',
    SEARCH_API_BASE: 'https://search.test',
    ALLOWED_ORIGINS: 'https://webflow.com',
    ENVIRONMENT: 'test',
  };
}

function testContext(): ExecutionContext {
  return {
    passThroughOnException() {},
    waitUntil() {},
  } as ExecutionContext;
}

function trackedContext(): ExecutionContext & { pending: Promise<unknown>[] } {
  const pending: Promise<unknown>[] = [];
  return {
    pending,
    passThroughOnException() {},
    waitUntil(promise) {
      pending.push(promise);
    },
  } as ExecutionContext & { pending: Promise<unknown>[] };
}

function securityDependencies(runTurn = vi.fn(async () => undefined)) {
  return {
    runAgentTurn: runTurn,
    verifyTurnstile: vi.fn(async () => ({ success: true as const })),
    issueSession: vi.fn(async () => ({ token: 'signed-session', expiresIn: 900 })),
    verifySession: vi.fn(async (_env: Env, token: string) =>
      token === 'signed-session' ? { sessionId: 'session-1', expiresAt: Date.now() + 900_000 } : null,
    ),
    issueContext: vi.fn(async () => 'signed-context'),
    verifyContext: vi.fn(async (_env: Env, token: string) =>
      token === 'signed-context' ? { known_templates: [] } : null,
    ),
    rateLimit: vi.fn(async () => true),
    reserveTurn: vi.fn(async () => ({ allowed: true as const, leaseId: 'lease-1' })),
    settleTurn: vi.fn(async () => undefined),
    recordEvent: vi.fn(),
  };
}

describe('webflow-template-agent worker abuse boundaries', () => {
  it('hides every production route from direct-origin requests', async () => {
    const worker = createTemplateAgentWorker(securityDependencies());
    const env = { ...testEnv(), ENVIRONMENT: 'production', AGENT_PROXY_SECRET: 'proxy-only' };

    for (const path of ['/health', '/api/templates/agent/session', '/api/templates/agent/chat']) {
      const response = await worker.fetch(
        new Request(`https://agent.test${path}`, { method: path === '/health' ? 'GET' : 'POST' }),
        env,
        testContext(),
      );
      expect(response.status).toBe(404);
    }
  });

  it('rejects request bodies over 64 KiB before invoking the agent', async () => {
    const runTurn = vi.fn(async () => undefined);
    const worker = createTemplateAgentWorker(securityDependencies(runTurn));
    const oversized = JSON.stringify({ messages: [{ role: 'user', content: 'x'.repeat(66_000) }] });

    const response = await worker.fetch(
      new Request('https://agent.test/api/templates/agent/chat', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: 'Bearer signed-session',
          origin: 'https://webflow.com',
        },
        body: oversized,
      }),
      testEnv(),
      testContext(),
    );

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: 'Request body is too large.' });
    expect(runTurn).not.toHaveBeenCalled();
  });

  it('rejects malformed JSON before invoking the agent', async () => {
    const runTurn = vi.fn(async () => undefined);
    const worker = createTemplateAgentWorker(securityDependencies(runTurn));
    const response = await worker.fetch(
      new Request('https://agent.test/api/templates/agent/chat', {
        method: 'POST',
        headers: {
          authorization: 'Bearer signed-session',
          'content-type': 'application/json',
          origin: 'https://webflow.com',
        },
        body: '{"messages":',
      }),
      testEnv(),
      testContext(),
    );

    expect(response.status).toBe(400);
    expect(runTurn).not.toHaveBeenCalled();
  });

  it.each([
    {
      label: 'more than 20 messages',
      messages: Array.from({ length: 21 }, (_, index) => ({
        role: index % 2 === 0 ? 'user' : 'assistant',
        content: `message ${index}`,
      })),
    },
    {
      label: 'a message over 4,000 characters',
      messages: [{ role: 'user', content: 'x'.repeat(4_001) }],
    },
    {
      label: 'more than 40,000 total characters',
      messages: Array.from({ length: 11 }, (_, index) => ({
        role: index % 2 === 0 ? 'user' : 'assistant',
        content: 'x'.repeat(4_000),
      })),
    },
  ])('rejects $label before invoking the agent', async ({ messages }) => {
    const runTurn = vi.fn(async () => undefined);
    const worker = createTemplateAgentWorker(securityDependencies(runTurn));

    const response = await worker.fetch(
      new Request('https://agent.test/api/templates/agent/chat', {
        method: 'POST',
        headers: {
          authorization: 'Bearer signed-session',
          'content-type': 'application/json',
          origin: 'https://webflow.com',
        },
        body: JSON.stringify({ messages }),
      }),
      testEnv(),
      testContext(),
    );

    expect(response.status).toBe(400);
    expect(runTurn).not.toHaveBeenCalled();
  });

  it('mints a short-lived session only after server-side Turnstile verification', async () => {
    const dependencies = securityDependencies();
    const worker = createTemplateAgentWorker(dependencies);

    const response = await worker.fetch(
      new Request('https://agent.test/api/templates/agent/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'https://webflow.com' },
        body: JSON.stringify({ turnstile_token: 'challenge-token' }),
      }),
      testEnv(),
      testContext(),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ session_token: 'signed-session', expires_in: 900 });
    expect(dependencies.verifyTurnstile).toHaveBeenCalledWith(
      expect.anything(),
      'challenge-token',
      expect.objectContaining({ origin: 'https://webflow.com' }),
    );
  });

  it('rejects a replayed Turnstile challenge without minting another session', async () => {
    const dependencies = securityDependencies();
    dependencies.verifyTurnstile
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: false, reason: 'Bot verification failed.' });
    const worker = createTemplateAgentWorker(dependencies);
    const request = () =>
      new Request('https://agent.test/api/templates/agent/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'https://webflow.com' },
        body: JSON.stringify({ turnstile_token: 'single-use-challenge' }),
      });

    expect((await worker.fetch(request(), testEnv(), testContext())).status).toBe(201);
    expect((await worker.fetch(request(), testEnv(), testContext())).status).toBe(403);
    expect(dependencies.issueSession).toHaveBeenCalledOnce();
    expect(dependencies.runAgentTurn).not.toHaveBeenCalled();
  });

  it.each([
    { label: 'missing', token: null },
    { label: 'invalid', token: 'forged-session' },
  ])('rejects a $label session before invoking the agent', async ({ token }) => {
    const runTurn = vi.fn(async () => undefined);
    const dependencies = securityDependencies(runTurn);
    const worker = createTemplateAgentWorker(dependencies);
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      origin: 'https://webflow.com',
    };
    if (token) headers.authorization = `Bearer ${token}`;

    const response = await worker.fetch(
      new Request('https://agent.test/api/templates/agent/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Find a documentation template' }] }),
      }),
      testEnv(),
      testContext(),
    );

    expect(response.status).toBe(401);
    expect(runTurn).not.toHaveBeenCalled();
  });

  it('allows a valid session to reach the agent runner', async () => {
    const runTurn = vi.fn(async (_env, _messages, emit) => emit({ type: 'done' }));
    const dependencies = securityDependencies(runTurn);
    const worker = createTemplateAgentWorker(dependencies);

    const response = await worker.fetch(
      new Request('https://agent.test/api/templates/agent/chat', {
        method: 'POST',
        headers: {
          authorization: 'Bearer signed-session',
          'content-type': 'application/json',
          origin: 'https://webflow.com',
        },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Find a documentation template' }] }),
      }),
      testEnv(),
      testContext(),
    );

    expect(response.status).toBe(200);
    expect(runTurn).toHaveBeenCalledOnce();
  });

  it('settles actual model usage after a successful turn', async () => {
    const runTurn = vi.fn(async (_env, _messages, emit) => {
      emit({ type: 'done' });
      return { inputTokens: 100, outputTokens: 10, cacheCreationInputTokens: 20, cacheReadInputTokens: 50 };
    });
    const dependencies = securityDependencies(runTurn);
    const worker = createTemplateAgentWorker(dependencies);
    const ctx = trackedContext();

    const response = await worker.fetch(
      new Request('https://agent.test/api/templates/agent/chat', {
        method: 'POST',
        headers: {
          authorization: 'Bearer signed-session',
          'content-type': 'application/json',
          origin: 'https://webflow.com',
        },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Find a documentation template' }] }),
      }),
      testEnv(),
      ctx,
    );
    await response.text();
    await Promise.all(ctx.pending);

    expect(dependencies.settleTurn).toHaveBeenCalledWith(testEnv(), {
      leaseId: 'lease-1',
      actualCostMicroUsd: 2_700,
    });
  });

  it('settles the full reservation after a failed model stream so concurrency cannot leak', async () => {
    const runTurn = vi.fn(async () => {
      throw new Error('upstream failed');
    });
    const dependencies = securityDependencies(runTurn);
    dependencies.reserveTurn.mockResolvedValue({
      allowed: true as const,
      leaseId: 'failed-lease',
      reservedMicroUsd: 2_000_000,
    });
    const worker = createTemplateAgentWorker(dependencies);
    const ctx = trackedContext();
    const response = await worker.fetch(
      new Request('https://agent.test/api/templates/agent/chat', {
        method: 'POST',
        headers: {
          authorization: 'Bearer signed-session',
          'content-type': 'application/json',
          origin: 'https://webflow.com',
        },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Find a template' }] }),
      }),
      testEnv(),
      ctx,
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('unexpected error');
    await Promise.all(ctx.pending);

    expect(dependencies.settleTurn).toHaveBeenCalledWith(testEnv(), {
      leaseId: 'failed-lease',
      actualCostMicroUsd: 2_000_000,
    });
  });

  it('rejects a tampered continuity token before invoking the agent', async () => {
    const runTurn = vi.fn(async () => undefined);
    const dependencies = securityDependencies(runTurn);
    const worker = createTemplateAgentWorker(dependencies);

    const response = await worker.fetch(
      new Request('https://agent.test/api/templates/agent/chat', {
        method: 'POST',
        headers: {
          authorization: 'Bearer signed-session',
          'content-type': 'application/json',
          origin: 'https://webflow.com',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Compare those templates' }],
          context: { context_token: 'forged-context', surface: 'compact' },
        }),
      }),
      testEnv(),
      testContext(),
    );

    expect(response.status).toBe(400);
    expect(runTurn).not.toHaveBeenCalled();
  });

  it('replaces server context with a signed token before streaming it to the client', async () => {
    const runTurn = vi.fn(async (_env, _messages, emit) => {
      emit({ type: 'context', payload: { known_templates: [] } });
      emit({ type: 'done' });
      return { inputTokens: 0, outputTokens: 0, cacheCreationInputTokens: 0, cacheReadInputTokens: 0 };
    });
    const dependencies = securityDependencies(runTurn);
    const worker = createTemplateAgentWorker(dependencies);
    const ctx = trackedContext();

    const response = await worker.fetch(
      new Request('https://agent.test/api/templates/agent/chat', {
        method: 'POST',
        headers: {
          authorization: 'Bearer signed-session',
          'content-type': 'application/json',
          origin: 'https://webflow.com',
        },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Find a template' }] }),
      }),
      testEnv(),
      ctx,
    );
    const body = await response.text();
    await Promise.all(ctx.pending);

    expect(body).toContain('"context_token":"signed-context"');
    expect(body).not.toContain('known_templates');
  });

  it('rejects a rate-limited session before reserving budget or invoking the agent', async () => {
    const runTurn = vi.fn(async () => undefined);
    const dependencies = securityDependencies(runTurn);
    dependencies.rateLimit.mockResolvedValue(false);
    const worker = createTemplateAgentWorker(dependencies);

    const response = await worker.fetch(
      new Request('https://agent.test/api/templates/agent/chat', {
        method: 'POST',
        headers: {
          authorization: 'Bearer signed-session',
          'content-type': 'application/json',
          origin: 'https://webflow.com',
        },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Find a documentation template' }] }),
      }),
      testEnv(),
      testContext(),
    );

    expect(response.status).toBe(429);
    expect(dependencies.reserveTurn).not.toHaveBeenCalled();
    expect(runTurn).not.toHaveBeenCalled();
  });

  it.each([
    { reason: 'turn_limit', status: 429 },
    { reason: 'concurrency_limit', status: 429 },
    { reason: 'daily_budget', status: 503 },
  ])('rejects $reason before invoking the agent', async ({ reason, status }) => {
    const runTurn = vi.fn(async () => undefined);
    const dependencies = securityDependencies(runTurn);
    dependencies.reserveTurn.mockResolvedValue({ allowed: false as const, reason, status });
    const worker = createTemplateAgentWorker(dependencies);

    const response = await worker.fetch(
      new Request('https://agent.test/api/templates/agent/chat', {
        method: 'POST',
        headers: {
          authorization: 'Bearer signed-session',
          'content-type': 'application/json',
          origin: 'https://webflow.com',
        },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Find a documentation template' }] }),
      }),
      testEnv(),
      testContext(),
    );

    expect(response.status).toBe(status);
    expect(runTurn).not.toHaveBeenCalled();
  });
});
