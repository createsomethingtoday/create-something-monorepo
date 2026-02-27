import type { D1Database } from '@create-something/mcp-core';
import type { AtlasEntityType } from './versions.js';

export interface JudgmentEngineEvent {
  id: string;
  correlation_id: string;
  account_id: string;
  entity_type: AtlasEntityType;
  entity_id: string;
  tool_name: string;
  rollout_mode: string;
  canary_percent: number;
  sampled_polar: number;
  mismatch: number;
  evaluation_path: string;
  fallback_used: number;
  legacy_decision: string;
  polar_decision: string;
  final_decision: string;
  latency_ms: number;
  created_at: number;
}

export interface JudgmentEngineMetricsSummary {
  total24h: number;
  fallbackRate: number;
  mismatchRate: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  byFinalDecision: Record<string, number>;
}

function nowEpochSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function eventId(accountId: string, entityType: AtlasEntityType, entityId: string, toolName: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `eng_${accountId}_${entityType}_${entityId}_${toolName}_${Date.now()}_${rand}`.replace(/[^a-zA-Z0-9_\-]/g, '_');
}

export async function recordEngineEvent(
  db: D1Database | undefined,
  input: Omit<JudgmentEngineEvent, 'id' | 'created_at'>,
): Promise<void> {
  if (!db) return;
  const createdAt = nowEpochSeconds();
  const id = eventId(input.account_id, input.entity_type, input.entity_id, input.tool_name);

  try {
    await db
      .prepare(
        `INSERT INTO judgment_engine_events
         (id, correlation_id, account_id, entity_type, entity_id, tool_name, rollout_mode, canary_percent, sampled_polar, mismatch, evaluation_path, fallback_used, legacy_decision, polar_decision, final_decision, latency_ms, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        input.correlation_id,
        input.account_id,
        input.entity_type,
        input.entity_id,
        input.tool_name,
        input.rollout_mode,
        input.canary_percent,
        input.sampled_polar,
        input.mismatch,
        input.evaluation_path,
        input.fallback_used,
        input.legacy_decision,
        input.polar_decision,
        input.final_decision,
        input.latency_ms,
        createdAt,
      )
      .run();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/correlation_id/i.test(message)) {
      throw error;
    }

    // Backward compatibility for DBs where migration has not run yet.
    await db
      .prepare(
        `INSERT INTO judgment_engine_events
         (id, account_id, entity_type, entity_id, tool_name, rollout_mode, canary_percent, sampled_polar, mismatch, evaluation_path, fallback_used, legacy_decision, polar_decision, final_decision, latency_ms, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        input.account_id,
        input.entity_type,
        input.entity_id,
        input.tool_name,
        input.rollout_mode,
        input.canary_percent,
        input.sampled_polar,
        input.mismatch,
        input.evaluation_path,
        input.fallback_used,
        input.legacy_decision,
        input.polar_decision,
        input.final_decision,
        input.latency_ms,
        createdAt,
      )
      .run();
  }
}

export async function getEngineMetricsSummary(
  db: D1Database | undefined,
  input: {
    accountId: string;
    entityType?: AtlasEntityType;
    entityId?: string;
    windowSeconds?: number;
  },
): Promise<JudgmentEngineMetricsSummary> {
  const empty: JudgmentEngineMetricsSummary = {
    total24h: 0,
    fallbackRate: 0,
    mismatchRate: 0,
    p50LatencyMs: 0,
    p95LatencyMs: 0,
    byFinalDecision: { allow: 0, require_human_review: 0, block: 0 },
  };

  if (!db) return empty;

  const cutoff = nowEpochSeconds() - (input.windowSeconds ?? 24 * 60 * 60);
  const hasScope = Boolean(input.entityType && input.entityId);
  const where = hasScope
    ? 'account_id = ? AND entity_type = ? AND entity_id = ? AND created_at >= ?'
    : 'account_id = ? AND created_at >= ?';
  const bindings = hasScope
    ? [input.accountId, input.entityType as AtlasEntityType, input.entityId as string, cutoff]
    : [input.accountId, cutoff];

  const countsRow = await db
    .prepare(
      `SELECT
         COUNT(*) AS total,
         COALESCE(SUM(fallback_used), 0) AS fallback_total,
         COALESCE(SUM(mismatch), 0) AS mismatch_total
       FROM judgment_engine_events
       WHERE ${where}`,
    )
    .bind(...bindings)
    .first<{ total: number | string | null; fallback_total: number | string | null; mismatch_total: number | string | null }>();

  const total = toNumber(countsRow?.total);
  if (total === 0) return empty;

  const latencies = await db
    .prepare(
      `SELECT latency_ms
       FROM judgment_engine_events
       WHERE ${where}
       ORDER BY latency_ms ASC`,
    )
    .bind(...bindings)
    .all<{ latency_ms: number | string | null }>();

  const sorted = latencies.results.map((row) => toNumber(row.latency_ms)).sort((a, b) => a - b);
  const p50 = sorted[Math.floor((sorted.length - 1) * 0.5)] ?? 0;
  const p95 = sorted[Math.floor((sorted.length - 1) * 0.95)] ?? 0;

  const byDecision = await db
    .prepare(
      `SELECT final_decision AS key, COUNT(*) AS count
       FROM judgment_engine_events
       WHERE ${where}
       GROUP BY final_decision`,
    )
    .bind(...bindings)
    .all<{ key: string | null; count: number | string | null }>();

  const byFinalDecision = { allow: 0, require_human_review: 0, block: 0 };
  for (const row of byDecision.results) {
    const key = row.key ?? 'unknown';
    if (key in byFinalDecision) {
      byFinalDecision[key as keyof typeof byFinalDecision] = toNumber(row.count);
    }
  }

  return {
    total24h: total,
    fallbackRate: toNumber(countsRow?.fallback_total) / total,
    mismatchRate: toNumber(countsRow?.mismatch_total) / total,
    p50LatencyMs: p50,
    p95LatencyMs: p95,
    byFinalDecision,
  };
}
