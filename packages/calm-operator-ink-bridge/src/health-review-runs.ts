import type {
  HealthReviewReport,
  HealthReviewRunStatus,
  HealthReviewRunTrigger,
  StoredHealthReviewRun
} from './types.js';

type RowValue = ArrayBuffer | string | number | null;

export const DEFAULT_HEALTH_REVIEW_RUN_LIMIT = 20;
export const MAX_HEALTH_REVIEW_RUN_LIMIT = 100;

export function normalizeHealthReviewRunLimit(value: string | number | null | undefined): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_HEALTH_REVIEW_RUN_LIMIT;
  return Math.max(1, Math.min(MAX_HEALTH_REVIEW_RUN_LIMIT, Math.round(parsed)));
}

function compactError(value: string | undefined): string {
  const trimmed = value?.replace(/\s+/g, ' ').trim() ?? '';
  if (trimmed.length <= 500) return trimmed;
  return trimmed.slice(0, 500).trimEnd();
}

function parseRecordJson(value: unknown): Record<string, unknown> {
  try {
    const parsed = JSON.parse(String(value ?? '{}')) as unknown;
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function parseReportJson(value: unknown): HealthReviewReport | null {
  try {
    const parsed = JSON.parse(String(value ?? 'null')) as unknown;
    return typeof parsed === 'object' && parsed !== null ? (parsed as HealthReviewReport) : null;
  } catch {
    return null;
  }
}

export function buildHealthReviewRunRecord(input: {
  id?: string;
  trigger?: HealthReviewRunTrigger;
  status: HealthReviewRunStatus;
  startedAt: number;
  finishedAt?: number;
  collectedCount?: number;
  report?: HealthReviewReport | null;
  error?: string;
  payload?: Record<string, unknown>;
}): StoredHealthReviewRun {
  const finishedAt = input.finishedAt ?? Date.now();
  const report = input.report ?? null;
  const trigger = input.trigger?.trim() || 'unknown';
  const error = compactError(input.error);

  return {
    id: input.id ?? crypto.randomUUID(),
    trigger,
    status: input.status,
    ok: input.status === 'completed' && !error,
    state: report?.state ?? (input.status === 'failed' ? 'failed' : 'clear'),
    collected_count: Math.max(0, Math.round(input.collectedCount ?? 0)),
    checked: report?.checked ?? 0,
    healthy_count: report?.healthy_count ?? 0,
    poor_count: report?.poor_count ?? 0,
    stale_count: report?.stale_count ?? 0,
    urgent: report?.urgent ?? false,
    started_at: input.startedAt,
    finished_at: finishedAt,
    duration_ms: Math.max(0, finishedAt - input.startedAt),
    error,
    report,
    payload: input.payload ?? {}
  };
}

export function rowHealthReviewRun(row: Record<string, RowValue>): StoredHealthReviewRun {
  return {
    id: String(row.id ?? ''),
    trigger: String(row.trigger ?? 'unknown'),
    status: row.status === 'failed' ? 'failed' : 'completed',
    ok: Boolean(Number(row.ok ?? 0)),
    state: String(row.state ?? 'failed'),
    collected_count: Number(row.collected_count ?? 0),
    checked: Number(row.checked ?? 0),
    healthy_count: Number(row.healthy_count ?? 0),
    poor_count: Number(row.poor_count ?? 0),
    stale_count: Number(row.stale_count ?? 0),
    urgent: Boolean(Number(row.urgent ?? 0)),
    started_at: Number(row.started_at ?? 0),
    finished_at: Number(row.finished_at ?? 0),
    duration_ms: Number(row.duration_ms ?? 0),
    error: String(row.error ?? ''),
    report: parseReportJson(row.report_json),
    payload: parseRecordJson(row.payload_json)
  };
}
