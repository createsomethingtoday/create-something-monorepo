import { describe, expect, it } from 'vitest';

import { TemplateAgentAbuseGuard, usageCostMicroUsd } from '../src/abuse.js';
import type { Env } from '../src/types.js';

function env(overrides: Partial<Env> = {}): Env {
  return {
    ANTHROPIC_API_KEY: 'test-key',
    SEARCH_API_BASE: 'https://search.test',
    ENVIRONMENT: 'test',
    ...overrides,
  };
}

function fakeState(): DurableObjectState {
  const data = new Map<string, unknown>();
  let transactionTail: Promise<unknown> = Promise.resolve();
  const transaction = {
    get: async <T>(key: string) => data.get(key) as T | undefined,
    put: async (key: string, value: unknown) => {
      data.set(key, structuredClone(value));
    },
  };
  return {
    storage: {
      transaction: <T>(callback: (txn: typeof transaction) => Promise<T>) => {
        const result = transactionTail.then(() => callback(transaction));
        transactionTail = result.then(
          () => undefined,
          () => undefined,
        );
        return result;
      },
    },
  } as unknown as DurableObjectState;
}

async function reserve(guard: TemplateAgentAbuseGuard, sessionId: string) {
  const response = await guard.fetch(
    new Request('https://guard.test/reserve', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId, sessionExpiresAt: Date.now() + 900_000 }),
    }),
  );
  return (await response.json()) as {
    allowed: boolean;
    leaseId?: string;
    reason?: string;
    reservedMicroUsd?: number;
    status?: number;
  };
}

async function settle(guard: TemplateAgentAbuseGuard, leaseId: string, actualCostMicroUsd = 0) {
  return guard.fetch(
    new Request('https://guard.test/settle', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ leaseId, actualCostMicroUsd }),
    }),
  );
}

describe('TemplateAgentAbuseGuard', () => {
  it('enforces and releases the global concurrency envelope', async () => {
    const guard = new TemplateAgentAbuseGuard(fakeState(), env({ MAX_CONCURRENT_TURNS: '1' }));
    const first = await reserve(guard, 'session-a');
    expect(first).toMatchObject({ allowed: true, reservedMicroUsd: 2_000_000 });

    expect(await reserve(guard, 'session-b')).toMatchObject({
      allowed: false,
      reason: 'concurrency_limit',
      status: 429,
    });

    await settle(guard, first.leaseId!);
    expect(await reserve(guard, 'session-b')).toMatchObject({ allowed: true });
  });

  it('atomically admits only one of two simultaneous reservations at the concurrency ceiling', async () => {
    const guard = new TemplateAgentAbuseGuard(fakeState(), env({ MAX_CONCURRENT_TURNS: '1' }));
    const decisions = await Promise.all([reserve(guard, 'session-a'), reserve(guard, 'session-b')]);

    expect(decisions.filter((decision) => decision.allowed)).toHaveLength(1);
    expect(decisions.filter((decision) => !decision.allowed)).toEqual([
      expect.objectContaining({ reason: 'concurrency_limit', status: 429 }),
    ]);
  });

  it('enforces the session turn ceiling after settled turns', async () => {
    const guard = new TemplateAgentAbuseGuard(fakeState(), env({ MAX_SESSION_TURNS: '2' }));
    const first = await reserve(guard, 'session-a');
    await settle(guard, first.leaseId!);
    const second = await reserve(guard, 'session-a');
    await settle(guard, second.leaseId!);

    expect(await reserve(guard, 'session-a')).toMatchObject({
      allowed: false,
      reason: 'turn_limit',
      status: 429,
    });
  });

  it('denies a reservation that would cross the settled daily dollar budget', async () => {
    const guard = new TemplateAgentAbuseGuard(
      fakeState(),
      env({ DAILY_BUDGET_MICRO_USD: '3000000', TURN_RESERVATION_MICRO_USD: '2000000' }),
    );
    const first = await reserve(guard, 'session-a');
    await settle(guard, first.leaseId!, 2_000_000);

    expect(await reserve(guard, 'session-b')).toMatchObject({
      allowed: false,
      reason: 'daily_budget',
      status: 503,
    });
  });

  it('prices input, output, cache writes, and cache reads in microdollars', () => {
    expect(
      usageCostMicroUsd(env(), {
        inputTokens: 100,
        outputTokens: 10,
        cacheCreationInputTokens: 20,
        cacheReadInputTokens: 50,
      }),
    ).toBe(2_700);
  });
});
