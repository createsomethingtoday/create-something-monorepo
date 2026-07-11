import type { AgentUsage, Env } from './types.js';
import type { SessionClaims } from './security.js';

const DEFAULT_MAX_SESSION_TURNS = 20;
const DEFAULT_MAX_CONCURRENT_TURNS = 8;
const DEFAULT_DAILY_BUDGET_MICRO_USD = 25_000_000;
const DEFAULT_RESERVATION_MICRO_USD = 2_000_000;
const LEASE_TTL_MS = 2 * 60 * 1000;

export type GuardDenyReason = 'turn_limit' | 'concurrency_limit' | 'daily_budget' | 'guard_unavailable';

export type GuardDecision =
  | { allowed: true; leaseId: string; reservedMicroUsd?: number }
  | { allowed: false; reason: GuardDenyReason; status: 429 | 503 };

interface GuardLease {
  expiresAt: number;
  id: string;
  reservedMicroUsd: number;
  sessionId: string;
}

interface DailyGuardState {
  day: string;
  leases: GuardLease[];
  sessions: Record<string, SessionGuardState>;
  spentMicroUsd: number;
}

interface SessionGuardState {
  expiresAt: number;
  turns: number;
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function currentDay(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

function guardStub(env: Env): DurableObjectStub | null {
  if (!env.AGENT_GUARD) return null;
  return env.AGENT_GUARD.get(env.AGENT_GUARD.idFromName('global'));
}

export async function rateLimitSession(env: Env, session: SessionClaims): Promise<boolean> {
  if (!env.AGENT_RATE_LIMITER) return env.ENVIRONMENT !== 'production';
  const result = await env.AGENT_RATE_LIMITER.limit({ key: session.sessionId });
  return result.success;
}

export async function reserveTurn(env: Env, session: SessionClaims): Promise<GuardDecision> {
  const stub = guardStub(env);
  if (!stub) {
    return env.ENVIRONMENT === 'production'
      ? { allowed: false, reason: 'guard_unavailable', status: 503 }
      : { allowed: true, leaseId: `test-${crypto.randomUUID()}` };
  }
  const response = await stub.fetch('https://guard.internal/reserve', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sessionId: session.sessionId, sessionExpiresAt: session.expiresAt }),
  });
  return (await response.json()) as GuardDecision;
}

export async function settleTurn(
  env: Env,
  settlement: { leaseId: string; actualCostMicroUsd: number },
): Promise<void> {
  const stub = guardStub(env);
  if (!stub || settlement.leaseId.startsWith('test-')) return;
  await stub.fetch('https://guard.internal/settle', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(settlement),
  });
}

function positiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function usageCostMicroUsd(env: Env, usage: AgentUsage): number {
  const inputRate = positiveNumber(env.INPUT_USD_PER_MILLION_TOKENS, 15);
  const outputRate = positiveNumber(env.OUTPUT_USD_PER_MILLION_TOKENS, 75);
  const cacheWriteRate = positiveNumber(env.CACHE_WRITE_USD_PER_MILLION_TOKENS, inputRate * 1.25);
  const cacheReadRate = positiveNumber(env.CACHE_READ_USD_PER_MILLION_TOKENS, inputRate * 0.1);
  return Math.max(
    0,
    Math.round(
      usage.inputTokens * inputRate +
        usage.outputTokens * outputRate +
        usage.cacheCreationInputTokens * cacheWriteRate +
        usage.cacheReadInputTokens * cacheReadRate,
    ),
  );
}

export class TemplateAgentAbuseGuard {
  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Env,
  ) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.method !== 'POST') return Response.json({ error: 'Method not allowed.' }, { status: 405 });

    if (url.pathname === '/reserve') {
      const body = (await request.json()) as { sessionId?: unknown; sessionExpiresAt?: unknown };
      if (typeof body.sessionId !== 'string' || typeof body.sessionExpiresAt !== 'number') {
        return Response.json({ allowed: false, reason: 'guard_unavailable', status: 503 } satisfies GuardDecision);
      }
      return Response.json(await this.reserve(body.sessionId, body.sessionExpiresAt));
    }

    if (url.pathname === '/settle') {
      const body = (await request.json()) as { leaseId?: unknown; actualCostMicroUsd?: unknown };
      if (typeof body.leaseId !== 'string' || typeof body.actualCostMicroUsd !== 'number') {
        return Response.json({ settled: false }, { status: 400 });
      }
      await this.settle(body.leaseId, Math.max(0, Math.round(body.actualCostMicroUsd)));
      return Response.json({ settled: true });
    }

    return Response.json({ error: 'Not found.' }, { status: 404 });
  }

  private async reserve(sessionId: string, sessionExpiresAt: number): Promise<GuardDecision> {
    const now = Date.now();
    const day = currentDay(now);
    const maxTurns = positiveInteger(this.env.MAX_SESSION_TURNS, DEFAULT_MAX_SESSION_TURNS);
    const maxConcurrent = positiveInteger(this.env.MAX_CONCURRENT_TURNS, DEFAULT_MAX_CONCURRENT_TURNS);
    const dailyBudget = positiveInteger(this.env.DAILY_BUDGET_MICRO_USD, DEFAULT_DAILY_BUDGET_MICRO_USD);
    const reservation = positiveInteger(this.env.TURN_RESERVATION_MICRO_USD, DEFAULT_RESERVATION_MICRO_USD);

    return this.state.storage.transaction(async (transaction) => {
      const storedDaily = await transaction.get<DailyGuardState>('daily');
      const daily: DailyGuardState =
        storedDaily?.day === day ? storedDaily : { day, leases: [], sessions: {}, spentMicroUsd: 0 };
      daily.leases = daily.leases.filter((lease) => lease.expiresAt > now);
      daily.sessions = Object.fromEntries(
        Object.entries(daily.sessions ?? {}).filter(([, session]) => session.expiresAt > now),
      );

      const session = daily.sessions[sessionId] ?? {
        expiresAt: sessionExpiresAt,
        turns: 0,
      };
      if (session.turns >= maxTurns) return { allowed: false, reason: 'turn_limit', status: 429 };
      if (daily.leases.length >= maxConcurrent) {
        return { allowed: false, reason: 'concurrency_limit', status: 429 };
      }
      const reserved = daily.leases.reduce((total, lease) => total + lease.reservedMicroUsd, 0);
      if (daily.spentMicroUsd + reserved + reservation > dailyBudget) {
        return { allowed: false, reason: 'daily_budget', status: 503 };
      }

      const lease: GuardLease = {
        expiresAt: now + LEASE_TTL_MS,
        id: crypto.randomUUID(),
        reservedMicroUsd: reservation,
        sessionId,
      };
      daily.leases.push(lease);
      session.turns += 1;
      session.expiresAt = sessionExpiresAt;
      daily.sessions[sessionId] = session;
      await transaction.put('daily', daily);
      return { allowed: true, leaseId: lease.id, reservedMicroUsd: reservation };
    });
  }

  private async settle(leaseId: string, actualCostMicroUsd: number): Promise<void> {
    await this.state.storage.transaction(async (transaction) => {
      const daily = await transaction.get<DailyGuardState>('daily');
      if (!daily) return;
      const leaseIndex = daily.leases.findIndex((lease) => lease.id === leaseId);
      if (leaseIndex < 0) return;
      daily.leases.splice(leaseIndex, 1);
      daily.spentMicroUsd += actualCostMicroUsd;
      await transaction.put('daily', daily);
    });
  }
}
