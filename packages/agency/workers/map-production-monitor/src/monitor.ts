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
  RESEND_API_KEY?: string;
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

export type MapOperatorEscalation = {
  alertId: string;
  consecutiveFailures: number;
  failureStreakStartedAt: string;
  thresholdReceiptId: string;
  sourceSha: string;
  severity: 'SEV-2' | 'SEV-3';
  failedCheckCodes: string[];
  notificationRevision: number;
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
const OPERATOR_ESCALATION_THRESHOLD = 2;
const OPERATOR_ESCALATION_LEASE_MS = 10 * 60 * 1000;
const OPERATOR_ALERT_EMAIL = 'micah@createsomething.io';
const OPERATOR_ALERT_FROM = 'CREATE SOMETHING Ops <notifications@createsomething.io>';
const RESEND_EMAIL_API_URL = 'https://api.resend.com/emails';

export type ScheduledMapMonitorInput = {
  scheduledAt: string;
  env: MapMonitorEnv;
  executeSynthetic: (input: {
    browser: Fetcher;
    baseUrl: string;
  }) => Promise<MapSyntheticResult>;
  notifyOperator?: (escalation: MapOperatorEscalation) => Promise<void>;
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
  plan: EscalationPlan,
): Promise<void> {
  const cutoff = new Date(now.valueOf() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
  const statements = [
    database.prepare('DELETE FROM map_production_monitor_receipts WHERE completed_at < ?').bind(cutoff),
    database
      .prepare(
        `DELETE FROM map_production_monitor_alerts
         WHERE delivery_status = 'delivered' AND streak_resolved_at IS NOT NULL
           AND streak_resolved_at < ?`,
      )
      .bind(cutoff),
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
  if (receipt.status === 'passed') {
    statements.push(
      database
        .prepare(
          `UPDATE map_production_monitor_alerts
           SET streak_resolved_at = ?
           WHERE streak_resolved_at IS NULL
             AND EXISTS (
               SELECT 1 FROM map_production_monitor_receipts
               WHERE receipt_id = ? AND trigger = ? AND scheduled_at = ?
                 AND status = ? AND source_sha = ? AND checks_json = ?
             )`,
        )
        .bind(
          receipt.completedAt,
          receipt.receiptId,
          receipt.trigger,
          receipt.scheduledAt,
          receipt.status,
          receipt.sourceSha,
          JSON.stringify(receipt.checks),
        ),
    );
  }
  if (plan?.kind === 'create') {
    const { escalation } = plan;
    statements.push(
      database
        .prepare(
          `INSERT OR IGNORE INTO map_production_monitor_alerts (
            alert_id, schema_version, failure_streak_started_at, threshold_receipt_id, source_sha,
            severity, failed_check_codes_json, created_at, delivery_status, delivery_attempts,
            delivery_lease_expires_at, delivery_claim_token, notification_revision, streak_resolved_at,
            delivered_at, last_delivery_error_code
          ) SELECT ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, NULL, NULL, ?, NULL, NULL, NULL
            WHERE EXISTS (
              SELECT 1 FROM map_production_monitor_receipts
              WHERE receipt_id = ? AND trigger = ? AND scheduled_at = ?
                AND status = ? AND source_sha = ? AND checks_json = ?
            )`,
        )
        .bind(
          escalation.alertId,
          1,
          escalation.failureStreakStartedAt,
          escalation.thresholdReceiptId,
          escalation.sourceSha,
          escalation.severity,
          JSON.stringify(escalation.failedCheckCodes),
          now.toISOString(),
          escalation.notificationRevision,
          receipt.receiptId,
          receipt.trigger,
          receipt.scheduledAt,
          receipt.status,
          receipt.sourceSha,
          JSON.stringify(receipt.checks),
        ),
    );
  }
  if (plan?.kind === 'update') {
    const { escalation, resetDelivery } = plan;
    statements.push(
      database
        .prepare(
          resetDelivery
            ? `UPDATE map_production_monitor_alerts
               SET source_sha = ?, severity = ?, failed_check_codes_json = ?, notification_revision = ?,
                   delivery_status = 'pending', delivery_lease_expires_at = NULL,
                   delivery_claim_token = NULL, delivered_at = NULL, last_delivery_error_code = NULL
               WHERE alert_id = ? AND streak_resolved_at IS NULL
                 AND EXISTS (
                   SELECT 1 FROM map_production_monitor_receipts
                   WHERE receipt_id = ? AND trigger = ? AND scheduled_at = ?
                     AND status = ? AND source_sha = ? AND checks_json = ?
                 )`
            : `UPDATE map_production_monitor_alerts
               SET source_sha = ?, severity = ?, failed_check_codes_json = ?
               WHERE alert_id = ? AND streak_resolved_at IS NULL
                 AND EXISTS (
                   SELECT 1 FROM map_production_monitor_receipts
                   WHERE receipt_id = ? AND trigger = ? AND scheduled_at = ?
                     AND status = ? AND source_sha = ? AND checks_json = ?
                 )`,
        )
        .bind(
          escalation.sourceSha,
          escalation.severity,
          JSON.stringify(escalation.failedCheckCodes),
          ...(resetDelivery
            ? [escalation.notificationRevision, escalation.alertId]
            : [escalation.alertId]),
          receipt.receiptId,
          receipt.trigger,
          receipt.scheduledAt,
          receipt.status,
          receipt.sourceSha,
          JSON.stringify(receipt.checks),
        ),
    );
  }
  await database.batch(statements);
}

type FailureStreakRow = {
  receipt_id: string;
  scheduled_at: string;
  checks_json: string;
};

type StoredReceiptRow = {
  schema_version: number;
  receipt_id: string;
  trigger: string;
  scheduled_at: string;
  completed_at: string;
  source_sha: string;
  worker_version: string;
  base_url: string;
  status: 'passed' | 'failed';
  complete: number;
  customer_data_used: number;
  agent_mutation_used: number;
  booking_submitted: number;
  checks_json: string;
};

type PendingEscalationRow = {
  alert_id: string;
  failure_streak_started_at: string;
  threshold_receipt_id: string;
  source_sha: string;
  severity: 'SEV-2' | 'SEV-3';
  failed_check_codes_json: string;
  notification_revision: number;
};

type ActiveEscalationRow = PendingEscalationRow & {
  delivery_status: 'pending' | 'delivering' | 'delivered';
};

type EscalationPlan =
  | { kind: 'create'; escalation: MapOperatorEscalation }
  | { kind: 'update'; escalation: MapOperatorEscalation; resetDelivery: boolean }
  | null;

function checksForFailure(row: FailureStreakRow): MapSyntheticCheck[] {
  try {
    const parsed = JSON.parse(row.checks_json);
    if (!Array.isArray(parsed)) throw new Error('checks JSON must be an array');
    return parsed.map((check) =>
      sanitizeCheck({
        id: typeof check?.id === 'string' ? check.id : 'invalid_check_id',
        ok: check?.ok === true,
        ...(typeof check?.code === 'string' ? { code: check.code } : {}),
        durationMs: typeof check?.durationMs === 'number' ? check.durationMs : 0,
      }),
    );
  } catch {
    return [failureCheck('stored_receipt', 'STORED_RECEIPT_INVALID')];
  }
}

function failedCheckCodesForFailures(failures: FailureStreakRow[]): string[] {
  return [
    ...new Set(
      failures.flatMap((failure) =>
        checksForFailure(failure)
          .filter((check) => !check.ok)
          .map((check) => check.code)
          .filter((code): code is string => typeof code === 'string'),
      ),
    ),
  ];
}

function severityForFailures(failures: FailureStreakRow[]): 'SEV-2' | 'SEV-3' {
  return failures.some((failure) =>
    checksForFailure(failure).some(
      (check) =>
        !check.ok &&
        (check.id.includes('booking_context') || check.code === 'STORED_RECEIPT_INVALID'),
    ),
  )
    ? 'SEV-2'
    : 'SEV-3';
}

function receiptFromStoredRow(row: StoredReceiptRow): MapMonitorReceipt {
  const sourceSha = normalizedSourceSha(row.source_sha);
  const baseUrl = normalizedBaseUrl(row.base_url);
  const workerVersion = normalizedWorkerVersion(row.worker_version);
  let checks: MapSyntheticCheck[];
  try {
    const parsed = JSON.parse(row.checks_json);
    if (!Array.isArray(parsed)) throw new Error('checks JSON must be an array');
    checks = parsed.map((check) =>
      sanitizeCheck({
        id: typeof check?.id === 'string' ? check.id : 'invalid_check_id',
        ok: check?.ok === true,
        ...(typeof check?.code === 'string' ? { code: check.code } : {}),
        durationMs: typeof check?.durationMs === 'number' ? check.durationMs : 0,
      }),
    );
  } catch {
    throw new Error('Map monitor stored receipt is invalid');
  }
  if (
    row.schema_version !== 1 ||
    row.trigger !== 'scheduled' ||
    !sourceSha ||
    !baseUrl ||
    !workerVersion ||
    (row.status !== 'passed' && row.status !== 'failed') ||
    row.complete !== 1 ||
    row.customer_data_used !== 0 ||
    row.agent_mutation_used !== 0 ||
    row.booking_submitted !== 0 ||
    Number.isNaN(new Date(row.scheduled_at).valueOf()) ||
    Number.isNaN(new Date(row.completed_at).valueOf()) ||
    (row.status === 'passed' && !checks.every((check) => check.ok))
  ) {
    throw new Error('Map monitor stored receipt is invalid');
  }
  return {
    schemaVersion: 1,
    receiptId: row.receipt_id,
    trigger: 'scheduled',
    scheduledAt: row.scheduled_at,
    completedAt: row.completed_at,
    sourceSha,
    workerVersion,
    baseUrl,
    status: row.status,
    complete: true,
    customerDataUsed: false,
    agentMutationUsed: false,
    bookingSubmitted: false,
    checks,
  };
}

async function findStoredReceipt(
  database: D1Database,
  scheduledAt: string,
): Promise<MapMonitorReceipt | null> {
  const result = await database
    .prepare(
      `SELECT schema_version, receipt_id, trigger, scheduled_at, completed_at, source_sha,
              worker_version, base_url, status, complete, customer_data_used,
              agent_mutation_used, booking_submitted, checks_json
       FROM map_production_monitor_receipts
       WHERE trigger = 'scheduled' AND scheduled_at = ?
       LIMIT 1`,
    )
    .bind(scheduledAt)
    .all<StoredReceiptRow>();
  const row = result.results?.[0];
  return row ? receiptFromStoredRow(row) : null;
}

async function findFailureStreak(
  database: D1Database,
): Promise<FailureStreakRow[]> {
  const result = await database
    .prepare(
      `WITH latest_passing_receipt AS (
        SELECT scheduled_at
        FROM map_production_monitor_receipts
        WHERE trigger = 'scheduled' AND status = 'passed'
        ORDER BY scheduled_at DESC
        LIMIT 1
      )
      SELECT receipt_id, scheduled_at, checks_json
      FROM map_production_monitor_receipts
      WHERE trigger = 'scheduled'
        AND status = 'failed'
        AND scheduled_at > COALESCE((SELECT scheduled_at FROM latest_passing_receipt), '')
      ORDER BY scheduled_at ASC`,
    )
    .bind()
    .all<FailureStreakRow>();
  const failures = result.results ?? [];
  return failures;
}

function escalationFor(
  receipt: MapMonitorReceipt,
  failures: FailureStreakRow[],
): MapOperatorEscalation {
  const first = failures[0];
  const thresholdReceipt = failures[OPERATOR_ESCALATION_THRESHOLD - 1];
  return {
    alertId: `map-monitor-escalation-${first.receipt_id}`,
    consecutiveFailures: OPERATOR_ESCALATION_THRESHOLD,
    failureStreakStartedAt: first.scheduled_at,
    thresholdReceiptId: thresholdReceipt.receipt_id,
    sourceSha: receipt.sourceSha,
    severity: severityForFailures(failures),
    failedCheckCodes: failedCheckCodesForFailures(failures),
    notificationRevision: 1,
  };
}

export function buildOperatorEscalationEmail(escalation: MapOperatorEscalation): {
  subject: string;
  text: string;
} {
  const subject = `[CREATE SOMETHING] ${escalation.severity} Map monitor escalation`;
  const text = [
    subject,
    '',
    `CRE-1289 requires operator escalation after ${escalation.consecutiveFailures} consecutive scheduled failures.`,
    `Failure streak began: ${escalation.failureStreakStartedAt}`,
    `Threshold receipt: ${escalation.thresholdReceiptId}`,
    `Source SHA: ${escalation.sourceSha}`,
    `Sanitized failed check codes: ${escalation.failedCheckCodes.join(', ') || 'none'}`,
    '',
    'Read the sanitized D1 receipt before beginning incident response.'
  ].join('\n');
  return { subject, text };
}

async function deliverOperatorEscalation(
  env: MapMonitorEnv,
  escalation: MapOperatorEscalation,
): Promise<void> {
  const apiKey = env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('Map operator alert delivery is unavailable: RESEND_API_KEY is missing');
  }
  const email = buildOperatorEscalationEmail(escalation);
  const response = await fetch(RESEND_EMAIL_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `${escalation.alertId}-r${escalation.notificationRevision}`,
    },
    body: JSON.stringify({
      from: OPERATOR_ALERT_FROM,
      to: [OPERATOR_ALERT_EMAIL],
      subject: email.subject,
      text: email.text,
      tags: [
        { name: 'surface', value: 'map-production-monitor' },
        { name: 'linear_issue', value: 'CRE-1289' },
        { name: 'severity', value: escalation.severity },
      ],
    }),
  });
  if (!response.ok) {
    throw new Error(`Map operator alert delivery failed with HTTP ${response.status}`);
  }
}

function failureRowForReceipt(receipt: MapMonitorReceipt): FailureStreakRow {
  return {
    receipt_id: receipt.receiptId,
    scheduled_at: receipt.scheduledAt,
    checks_json: JSON.stringify(receipt.checks),
  };
}

async function prepareOperatorEscalation(
  database: D1Database,
  receipt: MapMonitorReceipt,
): Promise<EscalationPlan> {
  const failures = [...(await findFailureStreak(database)), failureRowForReceipt(receipt)];
  const active = await findActiveEscalation(database);
  if (!active) {
    return failures.length >= OPERATOR_ESCALATION_THRESHOLD
      ? { kind: 'create', escalation: escalationFor(receipt, failures) }
      : null;
  }

  const existingCodes = failedCheckCodesFromJson(active.failed_check_codes_json);
  const failedCheckCodes = [...new Set([...existingCodes, ...failedCheckCodesForFailures(failures)])];
  const severity = active.severity === 'SEV-2' || severityForFailures(failures) === 'SEV-2'
    ? 'SEV-2'
    : 'SEV-3';
  const resetDelivery = severity === 'SEV-2' && active.severity !== 'SEV-2';
  const notificationRevision = active.notification_revision + (resetDelivery ? 1 : 0);
  const changed =
    active.source_sha !== receipt.sourceSha ||
    active.severity !== severity ||
    active.failed_check_codes_json !== JSON.stringify(failedCheckCodes) ||
    resetDelivery;
  if (!changed) return null;
  return {
    kind: 'update',
    resetDelivery,
    escalation: {
      alertId: active.alert_id,
      consecutiveFailures: OPERATOR_ESCALATION_THRESHOLD,
      failureStreakStartedAt: active.failure_streak_started_at,
      thresholdReceiptId: active.threshold_receipt_id,
      sourceSha: receipt.sourceSha,
      severity,
      failedCheckCodes,
      notificationRevision,
    },
  };
}

async function findActiveEscalation(database: D1Database): Promise<ActiveEscalationRow | null> {
  const result = await database
    .prepare(
      `SELECT alert_id, failure_streak_started_at, threshold_receipt_id, source_sha, severity,
              failed_check_codes_json, delivery_status, notification_revision
       FROM map_production_monitor_alerts
       WHERE streak_resolved_at IS NULL
       ORDER BY created_at ASC
       LIMIT 1`,
    )
    .bind()
    .all<ActiveEscalationRow>();
  return result.results?.[0] ?? null;
}

function failedCheckCodesFromJson(value: string): string[] {
  let failedCheckCodes: string[] = [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      failedCheckCodes = parsed.filter(
        (code): code is string => typeof code === 'string' && /^[A-Z0-9_]{1,96}$/.test(code),
      );
    }
  } catch {
    failedCheckCodes = ['STORED_ALERT_INVALID'];
  }
  return failedCheckCodes;
}

function escalationFromPending(row: PendingEscalationRow): MapOperatorEscalation {
  return {
    alertId: row.alert_id,
    consecutiveFailures: OPERATOR_ESCALATION_THRESHOLD,
    failureStreakStartedAt: row.failure_streak_started_at,
    thresholdReceiptId: row.threshold_receipt_id,
    sourceSha: row.source_sha,
    severity: row.severity,
    failedCheckCodes: failedCheckCodesFromJson(row.failed_check_codes_json),
    notificationRevision: row.notification_revision,
  };
}

async function deliverPendingOperatorEscalations(
  database: D1Database,
  now: Date,
  notifyOperator: (escalation: MapOperatorEscalation) => Promise<void>,
): Promise<void> {
  const reclaimAt = now.toISOString();
  const result = await database
    .prepare(
      `SELECT alert_id, failure_streak_started_at, threshold_receipt_id, source_sha,
              severity, failed_check_codes_json, notification_revision
       FROM map_production_monitor_alerts
       WHERE delivery_status = 'pending'
          OR (
            delivery_status = 'delivering'
            AND (delivery_lease_expires_at IS NULL OR delivery_lease_expires_at <= ?)
          )
       ORDER BY created_at ASC`,
    )
    .bind(reclaimAt)
    .all<PendingEscalationRow>();
  const pending = result.results ?? [];

  for (const row of pending) {
    const escalation = escalationFromPending(row);
    const claimToken = crypto.randomUUID();
    const leaseExpiresAt = new Date(now.valueOf() + OPERATOR_ESCALATION_LEASE_MS).toISOString();

    const claim = await database
      .prepare(
        `UPDATE map_production_monitor_alerts
        SET delivery_status = 'delivering', delivery_attempts = delivery_attempts + 1,
            delivery_claim_token = ?, delivery_lease_expires_at = ?, last_delivery_error_code = NULL
        WHERE alert_id = ?
          AND (
            delivery_status = 'pending'
            OR (
              delivery_status = 'delivering'
              AND (delivery_lease_expires_at IS NULL OR delivery_lease_expires_at <= ?)
            )
          )`,
      )
      .bind(claimToken, leaseExpiresAt, escalation.alertId, reclaimAt)
      .run();
    if (claim.meta.changes !== 1) continue;

    try {
      await notifyOperator(escalation);
    } catch {
      const released = await database
        .prepare(
          `UPDATE map_production_monitor_alerts
          SET delivery_status = 'pending', delivery_lease_expires_at = NULL,
              delivery_claim_token = NULL, last_delivery_error_code = 'EMAIL_DELIVERY_FAILED'
          WHERE alert_id = ? AND delivery_status = 'delivering' AND delivery_claim_token = ?`,
        )
        .bind(escalation.alertId, claimToken)
        .run();
      if (released.meta.changes !== 1) return;
      throw new Error('Map operator escalation delivery failed');
    }

    const delivered = await database
      .prepare(
        `UPDATE map_production_monitor_alerts
        SET delivery_status = 'delivered', delivered_at = ?, delivery_lease_expires_at = NULL,
            delivery_claim_token = NULL, last_delivery_error_code = NULL
        WHERE alert_id = ? AND delivery_status = 'delivering' AND delivery_claim_token = ?`,
      )
      .bind(now.toISOString(), escalation.alertId, claimToken)
      .run();
    if (delivered.meta.changes !== 1) return;
  }
}

function failureCheck(id: string, code: string): MapSyntheticCheck {
  return { id, ok: false, code, durationMs: 0 };
}

export async function runScheduledMapMonitor(
  input: ScheduledMapMonitorInput,
): Promise<MapMonitorReceipt> {
  const now = input.now ?? (() => new Date());
  const scheduled = new Date(input.scheduledAt);
  if (Number.isNaN(scheduled.valueOf())) {
    throw new Error('Map monitor requires a valid scheduled timestamp');
  }
  const scheduledAt = iso(scheduled);
  const existingReceipt = await findStoredReceipt(input.env.DB, scheduledAt);
  if (existingReceipt) {
    const observedAt = now();
    await deliverPendingOperatorEscalations(
      input.env.DB,
      observedAt,
      input.notifyOperator ?? ((escalation) => deliverOperatorEscalation(input.env, escalation)),
    );
    if (existingReceipt.status !== 'passed') {
      throw new Error(`Map production monitor failed: ${existingReceipt.receiptId}`);
    }
    return existingReceipt;
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

  const completedAt = now();

  const receipt: MapMonitorReceipt = {
    schemaVersion: 1,
    receiptId: receiptId(scheduledAt, provisionalSourceSha),
    trigger: 'scheduled',
    scheduledAt,
    completedAt: iso(completedAt),
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

  const escalation = receipt.status === 'failed'
    ? await prepareOperatorEscalation(input.env.DB, receipt)
    : null;
  await persistReceipt(input.env.DB, receipt, retentionDays ?? REQUIRED_RETENTION_DAYS, completedAt, escalation);
  const canonicalReceipt = await findStoredReceipt(input.env.DB, scheduledAt);
  if (!canonicalReceipt) {
    throw new Error('Map monitor receipt was not persisted');
  }
  await deliverPendingOperatorEscalations(
    input.env.DB,
    completedAt,
    input.notifyOperator ?? ((escalation) => deliverOperatorEscalation(input.env, escalation)),
  );
  if (canonicalReceipt.status !== 'passed') {
    throw new Error(`Map production monitor failed: ${canonicalReceipt.receiptId}`);
  }
  return canonicalReceipt;
}
