/**
 * Hub-runtime rate limiting for proxied downstream tool calls.
 *
 * Extracted from `src/index.ts`. The bucket map is module-level state by
 * design: a single hub process serves a single tenant lane, so the buckets
 * live for the lifetime of the process. If the hub ever runs multi-tenant
 * inside one process, lift this into an injectable `RateLimiter` class.
 */

import { parseCsvList, parsePositiveInt } from './util/json.js';

export type RateLimitScope = 'account' | 'account_server' | 'account_server_tool';

export type RateLimitPolicy = {
  enabled: boolean;
  maxCalls: number;
  windowMs: number;
  windowSeconds: number;
  scope: RateLimitScope;
  exemptServers: Set<string>;
};

export type RateLimitDecision = {
  allowed: boolean;
  key: string;
  remaining: number;
  resetAt: string;
  scope: RateLimitScope;
  maxCalls: number;
  windowSeconds: number;
};

export type RateLimitRouteShape = {
  serverName: string;
  downstreamToolName: string;
};

const rateLimitBuckets = new Map<string, { windowStartMs: number; count: number; lastSeenMs: number }>();
let rateLimitSweepCounter = 0;

export function resolveRateLimitPolicy(env: NodeJS.ProcessEnv): RateLimitPolicy {
  const maxCalls = parsePositiveInt(env.HUB_RATE_LIMIT_MAX_CALLS_PER_WINDOW, 0);
  const windowSeconds = parsePositiveInt(env.HUB_RATE_LIMIT_WINDOW_SECONDS, 60);
  const scope = parseRateLimitScope(env.HUB_RATE_LIMIT_SCOPE);
  const exemptServers = new Set(parseCsvList(env.HUB_RATE_LIMIT_EXEMPT_SERVERS));

  const enabled = maxCalls > 0;
  return {
    enabled,
    maxCalls,
    windowMs: windowSeconds * 1000,
    windowSeconds,
    scope,
    exemptServers,
  };
}

export function applyRateLimit(
  policy: RateLimitPolicy,
  accountId: string,
  route: RateLimitRouteShape,
): RateLimitDecision {
  if (!policy.enabled || policy.exemptServers.has(route.serverName)) {
    return {
      allowed: true,
      key: 'disabled',
      remaining: Number.MAX_SAFE_INTEGER,
      resetAt: new Date(Date.now()).toISOString(),
      scope: policy.scope,
      maxCalls: policy.maxCalls,
      windowSeconds: policy.windowSeconds,
    };
  }

  const now = Date.now();
  const key = buildRateLimitKey(policy.scope, accountId, route);
  const current = rateLimitBuckets.get(key);
  const windowStartMs = current ? current.windowStartMs : now;
  const windowExpired = now >= windowStartMs + policy.windowMs;

  const bucket = !current || windowExpired
    ? { windowStartMs: now, count: 0, lastSeenMs: now }
    : current;

  if (bucket.count >= policy.maxCalls) {
    bucket.lastSeenMs = now;
    rateLimitBuckets.set(key, bucket);
    maybeSweepRateLimitBuckets(now, policy.windowMs);
    return {
      allowed: false,
      key,
      remaining: 0,
      resetAt: new Date(bucket.windowStartMs + policy.windowMs).toISOString(),
      scope: policy.scope,
      maxCalls: policy.maxCalls,
      windowSeconds: policy.windowSeconds,
    };
  }

  bucket.count += 1;
  bucket.lastSeenMs = now;
  rateLimitBuckets.set(key, bucket);
  maybeSweepRateLimitBuckets(now, policy.windowMs);

  return {
    allowed: true,
    key,
    remaining: Math.max(0, policy.maxCalls - bucket.count),
    resetAt: new Date(bucket.windowStartMs + policy.windowMs).toISOString(),
    scope: policy.scope,
    maxCalls: policy.maxCalls,
    windowSeconds: policy.windowSeconds,
  };
}

export function activeRateLimitBucketCount(): number {
  return rateLimitBuckets.size;
}

/**
 * Test-only: clear all rate-limit buckets. Not part of the public hub API.
 */
export function __resetRateLimitBucketsForTests(): void {
  rateLimitBuckets.clear();
  rateLimitSweepCounter = 0;
}

function parseRateLimitScope(raw: string | undefined): RateLimitScope {
  const normalized = (raw ?? '').trim().toLowerCase();
  if (normalized === 'account_server') return 'account_server';
  if (normalized === 'account_server_tool') return 'account_server_tool';
  return 'account';
}

function buildRateLimitKey(
  scope: RateLimitScope,
  accountId: string,
  route: RateLimitRouteShape,
): string {
  if (scope === 'account_server_tool') {
    return `${accountId}::${route.serverName}::${route.downstreamToolName}`;
  }
  if (scope === 'account_server') {
    return `${accountId}::${route.serverName}`;
  }
  return accountId;
}

function maybeSweepRateLimitBuckets(nowMs: number, windowMs: number): void {
  rateLimitSweepCounter += 1;
  if (rateLimitSweepCounter % 100 !== 0) return;

  const staleBefore = nowMs - Math.max(windowMs * 2, 120_000);
  for (const [key, bucket] of rateLimitBuckets.entries()) {
    if (bucket.lastSeenMs < staleBefore) {
      rateLimitBuckets.delete(key);
    }
  }
}
