import type { Env } from './types.js';

// ── Telemetry digest + alerts (spec: docs/TEMPLATE_AGENT_TELEMETRY_SPEC.md) ──
// Scheduled handler over the webflow_template_agent_abuse Analytics Engine
// dataset. Two crons: an hourly alert scan and a daily digest (15:00 UTC).
//
// Shadow mode: when SLACK_WEBHOOK_URL is unset, alerts and digests are logged
// (visible via `wrangler tail` / Workers observability) instead of posted.
// Nothing here reads request bodies or user content — the dataset's PII
// allowlist (see telemetry.ts) means there is none to leak.

const DATASET = 'webflow_template_agent_abuse';
const SQL_ENDPOINT = 'https://api.cloudflare.com/client/v4/accounts';

export const ALERT_SCAN_CRON = '5 * * * *';
export const DAILY_DIGEST_CRON = '0 15 * * *';

interface EventCounts {
  [type: string]: number;
}

interface WindowStats {
  counts: EventCounts;
  /** USD spent on settled turns in the window. */
  settledUsd: number;
  /** Denial counts by reason (blob2), e.g. { daily_budget: 51 }. */
  denialReasons: Record<string, number>;
}

export interface AlertFinding {
  rule: string;
  message: string;
  /** KV cooldown key suffix; one post per key per cooldown window. */
  dedupeKey: string;
  cooldownSeconds: number;
}

// ── Analytics Engine SQL ──────────────────────────────────────────────────────

async function aeQuery(env: Env, sql: string, fetcher: typeof fetch): Promise<Array<Record<string, string>>> {
  const accountId = env.CF_ACCOUNT_ID ?? '9645bd52e640b8a4f40a3a55ff1dd75a';
  const response = await fetcher(`${SQL_ENDPOINT}/${accountId}/analytics_engine/sql`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.CF_ANALYTICS_API_TOKEN ?? ''}` },
    body: `${sql} FORMAT JSON`,
  });
  if (!response.ok) {
    throw new Error(`Analytics Engine SQL failed: ${response.status}`);
  }
  const payload = (await response.json()) as { data?: Array<Record<string, string>> };
  return payload.data ?? [];
}

export async function fetchWindowStats(env: Env, hours: number, fetcher: typeof fetch): Promise<WindowStats> {
  // AE SQL quirks (verified against the live dataset): every projection needs
  // an explicit alias, and counts must be weighted by _sample_interval.
  const rows = await aeQuery(
    env,
    `SELECT blob1 AS type, blob2 AS reason, SUM(_sample_interval) AS n, SUM(double1 * _sample_interval) AS micro_usd FROM ${DATASET} WHERE timestamp > NOW() - INTERVAL '${hours}' HOUR GROUP BY type, reason`,
    fetcher,
  );

  const stats: WindowStats = { counts: {}, settledUsd: 0, denialReasons: {} };
  for (const row of rows) {
    const type = row.type ?? '';
    const n = Number(row.n ?? 0);
    stats.counts[type] = (stats.counts[type] ?? 0) + n;
    if (type === 'turn_settled') stats.settledUsd += Number(row.micro_usd ?? 0) / 1e6;
    if (type === 'turn_denied' && row.reason) {
      stats.denialReasons[row.reason] = (stats.denialReasons[row.reason] ?? 0) + n;
    }
  }
  return stats;
}

// ── Alert rules (A1–A5; thresholds calibrated in the spec) ───────────────────

export function evaluateAlerts(last24h: WindowStats, last6h: WindowStats, last1h: WindowStats, env: Env): AlertFinding[] {
  const findings: AlertFinding[] = [];
  const dailyBudgetUsd = Number(env.DAILY_BUDGET_MICRO_USD ?? '40000000') / 1e6;

  const turns24 = (last24h.counts.turn_settled ?? 0) + (last24h.counts.turn_failed ?? 0);
  if (turns24 === 0) {
    findings.push({
      rule: 'A1 zero-traffic',
      message: 'No agent turns in the trailing 24h — chat down, removed from page, or session mint broken.',
      dedupeKey: 'a1',
      cooldownSeconds: 24 * 3600,
    });
  }

  const settled6 = last6h.counts.turn_settled ?? 0;
  const failed6 = last6h.counts.turn_failed ?? 0;
  const total6 = settled6 + failed6;
  if (total6 >= 5 && failed6 / total6 > 0.2) {
    findings.push({
      rule: 'A2 error-rate',
      message: `Turn failure rate ${Math.round((failed6 / total6) * 100)}% over 6h (${failed6}/${total6}).`,
      dedupeKey: 'a2',
      cooldownSeconds: 6 * 3600,
    });
  }

  for (const [reason, count] of Object.entries(last1h.denialReasons)) {
    if (count > 0) {
      findings.push({
        rule: 'A3 turn-denials',
        message: `${count} turn(s) denied in the last hour (reason: ${reason}) — users are being refused.`,
        dedupeKey: `a3:${reason}`,
        cooldownSeconds: 6 * 3600,
      });
    }
  }

  if (last24h.settledUsd > dailyBudgetUsd * 0.8) {
    findings.push({
      rule: 'A4 spend',
      message: `Trailing-24h spend $${last24h.settledUsd.toFixed(2)} exceeds 80% of the $${dailyBudgetUsd.toFixed(0)}/day budget.`,
      dedupeKey: 'a4',
      cooldownSeconds: 24 * 3600,
    });
  }

  const rejected1h = last1h.counts.session_rejected ?? 0;
  if (rejected1h > 50) {
    findings.push({
      rule: 'A5 session-rejections',
      message: `${rejected1h} session rejections in the last hour — bot pressure or Turnstile misconfiguration.`,
      dedupeKey: 'a5',
      cooldownSeconds: 6 * 3600,
    });
  }

  return findings;
}

// ── Digest ────────────────────────────────────────────────────────────────────

export function buildDigest(last24h: WindowStats, prev7dDailyAvg: WindowStats, env: Env): string {
  const dailyBudgetUsd = Number(env.DAILY_BUDGET_MICRO_USD ?? '40000000') / 1e6;
  const turns = last24h.counts.turn_settled ?? 0;
  const failed = last24h.counts.turn_failed ?? 0;
  const denied = Object.values(last24h.denialReasons).reduce((a, b) => a + b, 0);
  const avgTurns = (prev7dDailyAvg.counts.turn_settled ?? 0) / 7;
  const delta = avgTurns > 0 ? Math.round(((turns - avgTurns) / avgTurns) * 100) : 0;
  const errorRate = turns + failed > 0 ? ((failed / (turns + failed)) * 100).toFixed(1) : '0.0';

  const lines = [
    `*Template Chat* — trailing 24h (vs 7-day avg)`,
    `Turns: ${turns} (${delta >= 0 ? '+' : ''}${delta}%) · Sessions minted: ${last24h.counts.session_minted ?? 0} · Denied: ${denied}${denied > 0 ? ` (${Object.entries(last24h.denialReasons).map(([r, n]) => `${r}: ${n}`).join(', ')})` : ''}`,
    `Errors: ${failed} (${errorRate}%)`,
    `Spend: $${last24h.settledUsd.toFixed(2)} of $${dailyBudgetUsd.toFixed(0)}`,
    `⚠ Client-side Amplitude tracking degraded since 2026-07-21 — server-side numbers above are authoritative.`,
  ];
  return lines.join('\n');
}

// ── Delivery ──────────────────────────────────────────────────────────────────

async function deliver(env: Env, text: string, fetcher: typeof fetch): Promise<void> {
  if (!env.SLACK_WEBHOOK_URL) {
    // Shadow mode: observable via `wrangler tail` and Workers Logs.
    console.log(`[telemetry shadow] ${text}`);
    return;
  }
  await fetcher(env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
}

async function underCooldown(env: Env, key: string): Promise<boolean> {
  const value = await env.ALERT_STATE?.get(`alert:${key}`);
  return typeof value === 'string';
}

async function markFired(env: Env, key: string, ttlSeconds: number): Promise<void> {
  // KV minimum TTL is 60s.
  await env.ALERT_STATE?.put(`alert:${key}`, new Date().toISOString(), { expirationTtl: Math.max(60, ttlSeconds) });
}

// ── Read-only summary (for the Slack digest routine) ─────────────────────────
// Aggregate numbers only — same PII posture as the dataset itself. Consumed by
// the scheduled Claude routine that posts the daily digest to Slack, which
// cannot hold Cloudflare credentials of its own.

export interface TelemetrySummary {
  generated_at: string;
  window_24h: {
    turns_settled: number;
    turns_failed: number;
    turns_denied: Record<string, number>;
    sessions_minted: number;
    sessions_rejected: number;
    spend_usd: number;
  };
  window_7d: {
    turns_settled: number;
    turns_failed: number;
    spend_usd: number;
  };
  daily_budget_usd: number;
}

export async function buildSummary(env: Env, now: Date, fetcher: typeof fetch): Promise<TelemetrySummary> {
  const [last24h, last7d] = await Promise.all([
    fetchWindowStats(env, 24, fetcher),
    fetchWindowStats(env, 7 * 24, fetcher),
  ]);
  return {
    generated_at: now.toISOString(),
    window_24h: {
      turns_settled: last24h.counts.turn_settled ?? 0,
      turns_failed: last24h.counts.turn_failed ?? 0,
      turns_denied: last24h.denialReasons,
      sessions_minted: last24h.counts.session_minted ?? 0,
      sessions_rejected: last24h.counts.session_rejected ?? 0,
      spend_usd: Number(last24h.settledUsd.toFixed(4)),
    },
    window_7d: {
      turns_settled: last7d.counts.turn_settled ?? 0,
      turns_failed: last7d.counts.turn_failed ?? 0,
      spend_usd: Number(last7d.settledUsd.toFixed(4)),
    },
    daily_budget_usd: Number(env.DAILY_BUDGET_MICRO_USD ?? '40000000') / 1e6,
  };
}

// Constant-time comparison so the read key can't be probed byte-by-byte.
export function keysEqual(a: string, b: string): boolean {
  if (a.length !== b.length || a.length === 0) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ── Scheduled entry point ─────────────────────────────────────────────────────

export async function runScheduled(event: ScheduledController, env: Env, fetcher: typeof fetch = fetch): Promise<void> {
  if (!env.CF_ANALYTICS_API_TOKEN) {
    console.log('[telemetry] CF_ANALYTICS_API_TOKEN not configured; skipping scheduled telemetry.');
    return;
  }

  if (event.cron === DAILY_DIGEST_CRON) {
    const [last24h, last7d] = await Promise.all([
      fetchWindowStats(env, 24, fetcher),
      fetchWindowStats(env, 7 * 24, fetcher),
    ]);
    await deliver(env, buildDigest(last24h, last7d, env), fetcher);
    return;
  }

  // Default (hourly) — alert scan.
  const [last24h, last6h, last1h] = await Promise.all([
    fetchWindowStats(env, 24, fetcher),
    fetchWindowStats(env, 6, fetcher),
    fetchWindowStats(env, 1, fetcher),
  ]);
  for (const finding of evaluateAlerts(last24h, last6h, last1h, env)) {
    if (await underCooldown(env, finding.dedupeKey)) continue;
    await deliver(env, `:rotating_light: *${finding.rule}* — ${finding.message}`, fetcher);
    await markFired(env, finding.dedupeKey, finding.cooldownSeconds);
  }
}
