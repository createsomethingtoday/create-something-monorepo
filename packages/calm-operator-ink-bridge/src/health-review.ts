import { isPoorHealth } from './brief.js';
import type { HealthReviewItem, HealthReviewReport, StoredHealthSnapshot } from './types.js';

export const DEFAULT_HEALTH_STALE_AFTER_MS = 12 * 60 * 60 * 1000;

function compact(value: string, max: number): string {
  const trimmed = value.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= max) return trimmed;
  if (max <= 1) return trimmed.slice(0, max);
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function itemScore(item: HealthReviewItem): number {
  return item.severity + (item.stale ? 35 : 0) + (item.poor ? 25 : 0);
}

export function buildHealthReviewReport(input: {
  health: StoredHealthSnapshot[];
  now?: number;
  staleAfterMs?: number;
}): HealthReviewReport {
  const now = input.now ?? Date.now();
  const staleAfterMs =
    typeof input.staleAfterMs === 'number' && Number.isFinite(input.staleAfterMs) && input.staleAfterMs > 0
      ? Math.round(input.staleAfterMs)
      : DEFAULT_HEALTH_STALE_AFTER_MS;

  const items = input.health
    .map((snapshot): HealthReviewItem => {
      const updatedAt = snapshot.updated_at || snapshot.observed_at || now;
      const ageMs = Math.max(0, now - updatedAt);
      const stale = ageMs > staleAfterMs;
      const poor = isPoorHealth(snapshot);

      return {
        id: snapshot.id,
        source: snapshot.source,
        component: snapshot.component,
        status: snapshot.status,
        summary: snapshot.summary,
        detail: snapshot.detail,
        severity: snapshot.severity,
        observed_at: snapshot.observed_at,
        updated_at: snapshot.updated_at,
        age_ms: ageMs,
        stale,
        poor
      };
    })
    .sort((left, right) => {
      const score = itemScore(right) - itemScore(left);
      if (score !== 0) return score;
      return right.updated_at - left.updated_at;
    });

  const poorCount = items.filter((item) => item.poor).length;
  const staleCount = items.filter((item) => item.stale).length;
  const needsAttention = poorCount + staleCount > 0;
  const checked = items.length;
  const healthyCount = checked - new Set(items.filter((item) => item.poor || item.stale).map((item) => item.id)).size;
  const topItems = items.filter((item) => item.poor || item.stale).slice(0, 3);
  const detail = topItems
    .map((item) => `${item.component}: ${item.stale ? 'stale' : item.status} - ${item.summary}`)
    .join('\n');

  if (needsAttention) {
    return {
      ok: true,
      state: 'health_attention',
      generated_at: new Date(now).toISOString(),
      checked,
      healthy_count: Math.max(0, healthyCount),
      poor_count: poorCount,
      stale_count: staleCount,
      stale_after_ms: staleAfterMs,
      headline: 'HEALTH ATTENTION',
      summary: compact(`${poorCount} poor, ${staleCount} stale health checks`, 80),
      detail: compact(detail || 'Health checks need attention.', 240),
      action: 'Review agent/MCP health source',
      urgent: items.some((item) => item.severity >= 80 || item.stale),
      items
    };
  }

  return {
    ok: true,
    state: 'clear',
    generated_at: new Date(now).toISOString(),
    checked,
    healthy_count: checked,
    poor_count: 0,
    stale_count: 0,
    stale_after_ms: staleAfterMs,
    headline: 'HEALTH CLEAR',
    summary: checked === 0 ? 'No health snapshots yet.' : `${checked} health checks clear`,
    detail: checked === 0 ? 'Post the first agent or MCP health snapshot.' : 'No poor or stale health checks.',
    action: 'No operator action',
    urgent: false,
    items
  };
}
