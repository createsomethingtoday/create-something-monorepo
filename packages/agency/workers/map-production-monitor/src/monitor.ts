export type PersistedStatement = {
  query: string;
  values: unknown[];
};

export type MapSyntheticCheck = {
  id: string;
  ok: boolean;
  code?: string;
  durationMs: number;
};

export type MapSyntheticResult = {
  checks: MapSyntheticCheck[];
};

export type MapMonitorEnv = {
  DB: D1Database;
  BROWSER: Fetcher;
  MAP_MONITOR_SOURCE_SHA?: string;
  MAP_MONITOR_BASE_URL?: string;
  MAP_MONITOR_RECEIPT_RETENTION_DAYS?: string;
  CF_VERSION_METADATA?: {
    id?: string;
    tag?: string;
    timestamp?: string;
  };
};

export type MapMonitorReceipt = {
  schemaVersion: 1;
  receiptId: string;
  trigger: 'scheduled';
  scheduledAt: string;
  completedAt: string;
  sourceSha: string;
  workerVersion: string;
  baseUrl: string;
  status: 'passed' | 'failed';
  complete: true;
  customerDataUsed: false;
  agentMutationUsed: false;
  bookingSubmitted: false;
  checks: MapSyntheticCheck[];
};

export const REQUIRED_MAP_CHECK_IDS = Object.freeze(
  ['desktop', 'mobile'].flatMap((viewport) => [
    `${viewport}_route_and_responsive_render`,
    `${viewport}_starter_booking_context`,
    `${viewport}_edit_booking_context`,
    `${viewport}_restore_booking_context`,
    `${viewport}_reset_booking_context`,
    `${viewport}_mapping_agent_non_mutating_boundary`,
    `${viewport}_map_health`,
    `${viewport}_console_health`,
  ]),
);

const SOURCE_SHA_PATTERN = /^[0-9a-f]{40}$/i;
const DEFAULT_BASE_URL = 'https://createsomething.agency';
const REQUIRED_RETENTION_DAYS = 30;

export type ScheduledMapMonitorInput = {
  scheduledAt: string;
  env: MapMonitorEnv;
  executeSynthetic: (input: {
    browser: Fetcher;
    baseUrl: string;
  }) => Promise<MapSyntheticResult>;
  now?: () => Date;
};

function iso(value: Date): string {
  return value.toISOString();
}

function normalizedSourceSha(value: string | undefined): string | null {
  const sourceSha = value?.trim() ?? '';
  return SOURCE_SHA_PATTERN.test(sourceSha) ? sourceSha.toLowerCase() : null;
}

function normalizedBaseUrl(value: string | undefined): string | null {
  try {
    const parsed = new URL(value?.trim() || DEFAULT_BASE_URL);
    if (parsed.protocol !== 'https:' || parsed.pathname !== '/' || parsed.search || parsed.hash) {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

function normalizedRetentionDays(value: string | undefined): number | null {
  return value?.trim() === String(REQUIRED_RETENTION_DAYS) ? REQUIRED_RETENTION_DAYS : null;
}

function normalizedWorkerVersion(value: string | undefined): string | null {
  const version = value?.trim() ?? '';
  return version.length > 0 && version.length <= 256 ? version : null;
}

function sanitizeCheck(check: MapSyntheticCheck): MapSyntheticCheck {
  return {
    id: /^[a-z0-9_]{1,96}$/.test(check.id) ? check.id : 'invalid_check_id',
    ok: check.ok === true,
    ...(typeof check.code === 'string' && /^[A-Z0-9_]{1,96}$/.test(check.code)
      ? { code: check.code }
      : {}),
    durationMs: Number.isFinite(check.durationMs) && check.durationMs >= 0
      ? Math.round(check.durationMs)
      : 0,
  };
}

function validateChecks(checks: MapSyntheticCheck[]): MapSyntheticCheck[] {
  const present = new Set(checks.filter((check) => check.ok).map((check) => check.id));
  const missing = REQUIRED_MAP_CHECK_IDS.filter((id) => !present.has(id));
  if (missing.length === 0) return checks;
  return [
    ...checks,
    {
      id: 'synthetic_completeness',
      ok: false,
      code: 'REQUIRED_CHECK_MISSING',
      durationMs: 0,
    },
  ];
}

function receiptId(scheduledAt: string, sourceSha: string): string {
  return `map-${scheduledAt.replace(/[^0-9]/g, '').slice(0, 14)}-${sourceSha.slice(0, 12)}`;
}

async function persistReceipt(
  database: D1Database,
  receipt: MapMonitorReceipt,
  retentionDays: number,
  now: Date,
): Promise<void> {
  const cutoff = new Date(now.valueOf() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
  const statements = [
    database.prepare('DELETE FROM map_production_monitor_receipts WHERE completed_at < ?').bind(cutoff),
    database
      .prepare(
        `INSERT OR IGNORE INTO map_production_monitor_receipts (
          receipt_id, schema_version, trigger, scheduled_at, completed_at, source_sha, worker_version,
          base_url, status, complete, customer_data_used, agent_mutation_used, booking_submitted,
          checks_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        receipt.receiptId,
        receipt.schemaVersion,
        receipt.trigger,
        receipt.scheduledAt,
        receipt.completedAt,
        receipt.sourceSha,
        receipt.workerVersion,
        receipt.baseUrl,
        receipt.status,
        receipt.complete ? 1 : 0,
        receipt.customerDataUsed ? 1 : 0,
        receipt.agentMutationUsed ? 1 : 0,
        receipt.bookingSubmitted ? 1 : 0,
        JSON.stringify(receipt.checks),
      ),
  ];
  await database.batch(statements);
}

function failureCheck(id: string, code: string): MapSyntheticCheck {
  return { id, ok: false, code, durationMs: 0 };
}

export async function runScheduledMapMonitor(
  input: ScheduledMapMonitorInput,
): Promise<MapMonitorReceipt> {
  const now = input.now ?? (() => new Date());
  const checkedAt = now();
  const scheduled = new Date(input.scheduledAt);
  if (Number.isNaN(scheduled.valueOf())) {
    throw new Error('Map monitor requires a valid scheduled timestamp');
  }

  const sourceSha = normalizedSourceSha(input.env.MAP_MONITOR_SOURCE_SHA);
  const baseUrl = normalizedBaseUrl(input.env.MAP_MONITOR_BASE_URL);
  const retentionDays = normalizedRetentionDays(input.env.MAP_MONITOR_RECEIPT_RETENTION_DAYS);
  const workerVersion = normalizedWorkerVersion(input.env.CF_VERSION_METADATA?.id);
  const provisionalSourceSha = sourceSha ?? '0'.repeat(40);
  let checks: MapSyntheticCheck[] = [];

  if (!sourceSha) checks.push(failureCheck('source_sha', 'SOURCE_SHA_INVALID'));
  if (!baseUrl) checks.push(failureCheck('base_url', 'BASE_URL_INVALID'));
  if (!retentionDays) checks.push(failureCheck('receipt_retention', 'RETENTION_INVALID'));
  if (!workerVersion) checks.push(failureCheck('worker_version', 'WORKER_VERSION_MISSING'));

  if (checks.length === 0) {
    try {
      const result = await input.executeSynthetic({ browser: input.env.BROWSER, baseUrl: baseUrl! });
      checks = validateChecks(result.checks.map(sanitizeCheck));
    } catch {
      checks = [failureCheck('browser_execution', 'BROWSER_EXECUTION_FAILED')];
    }
  }

  const receipt: MapMonitorReceipt = {
    schemaVersion: 1,
    receiptId: receiptId(iso(scheduled), provisionalSourceSha),
    trigger: 'scheduled',
    scheduledAt: iso(scheduled),
    completedAt: iso(checkedAt),
    sourceSha: provisionalSourceSha,
    workerVersion: workerVersion ?? '',
    baseUrl: baseUrl ?? DEFAULT_BASE_URL,
    status: checks.every((check) => check.ok) ? 'passed' : 'failed',
    complete: true,
    customerDataUsed: false,
    agentMutationUsed: false,
    bookingSubmitted: false,
    checks,
  };

  await persistReceipt(input.env.DB, receipt, retentionDays ?? REQUIRED_RETENTION_DAYS, checkedAt);
  if (receipt.status !== 'passed') {
    throw new Error(`Map production monitor failed: ${receipt.receiptId}`);
  }
  return receipt;
}
