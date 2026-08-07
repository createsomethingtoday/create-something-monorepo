import { DurableObject } from 'cloudflare:workers';
import { buildOperatorBrief, toFirmwareBrief } from './brief.js';
import { buildInkClock } from './clock.js';
import { isAuthorized } from './auth.js';
import { CodexCommandCoordinator } from './codex-command-coordinator.js';
import { SqlCodexCommandStorage } from './codex-command-sql.js';
import {
  CodexCommandError,
  type CompleteCodexCommandInput,
  type CreateCodexCommandInput
} from './codex-commands.js';
import { DEFAULT_HEALTH_STALE_AFTER_MS, buildHealthReviewReport } from './health-review.js';
import { claimLinearIssue, fetchLinearOpenIssues } from './linear-open.js';
import {
  buildHealthReviewRunRecord,
  missingHealthReviewRunColumnMigrations,
  normalizeHealthReviewRunLimit,
  rowHealthReviewRun
} from './health-review-runs.js';
import { collectRemoteHealthChecks, configuredRemoteHealthChecks } from './remote-health-checks.js';
import { dueDailyAlarms, shouldRunHealthReviewAtUtcHour } from './scheduled-alarms.js';
import { authRoleForInkRoute } from './route-auth.js';
import type {
  DeviceHeartbeatInput,
  HealthReviewReport,
  HealthReviewRunTrigger,
  HealthSnapshotInput,
  InkAlertInput,
  OperatorPriorityInput,
  OperatorEventInput,
  StoredAlert,
  StoredDeviceHeartbeat,
  StoredHealthReviewRun,
  StoredHealthSnapshot
} from './types.js';

interface Env {
  INK_STATE: DurableObjectNamespace<InkState>;
  WORKSPACE_ID?: string;
  DEFAULT_DEVICE_ID?: string;
  DEFAULT_SURFACE?: string;
  HEALTH_STALE_AFTER_MS?: string;
  HEALTH_CHECKS_JSON?: string;
  HEALTH_SELF_ORIGIN?: string;
  HEALTH_SELF_CHECK_ENABLED?: string;
  HEALTH_REVIEW_UTC_HOURS?: string;
  DAILY_ALARMS_CT?: string;
  ALARM_TTL_MS?: string;
  INK_BRIDGE_TOKEN?: string;
  INK_DEVICE_TOKEN?: string;
  INK_RUNNER_TOKEN?: string;
  INK_SOURCE_TOKEN?: string;
  LINEAR_API_KEY?: string;
  LINEAR_TEAM_KEY?: string;
}

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8'
};

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-headers': 'authorization,x-api-key,x-ink-token,content-type,accept',
  'access-control-max-age': '86400'
};

const MAX_BODY_BYTES = 64 * 1024;
const REGISTRY_FALLBACK_MCP_COUNT = 1014;
const REGISTRY_FALLBACK_FLEET_COUNT = 22;
const REGISTRY_FALLBACK_AGENT_COUNT = 4;

interface HealthReviewRunOptions {
  staleAfterMs?: number;
  trigger?: HealthReviewRunTrigger;
  collectedCount?: number;
  startedAt?: number;
  payload?: Record<string, unknown>;
}

interface HealthReviewRunResult {
  ok: true;
  report: HealthReviewReport;
  run: StoredHealthReviewRun | null;
  alert?: StoredAlert;
  cleared?: number;
  brief: ReturnType<typeof buildOperatorBrief>;
}

type CodexRpcResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; code: string; status: number };

function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data, null, 2), {
    ...init,
    headers: {
      ...CORS_HEADERS,
      ...JSON_HEADERS,
      ...Object.fromEntries(new Headers(init.headers ?? undefined))
    }
  });
}

function text(data: string, init: ResponseInit = {}): Response {
  return new Response(data, {
    ...init,
    headers: {
      ...CORS_HEADERS,
      ...Object.fromEntries(new Headers(init.headers ?? undefined))
    }
  });
}

function codexResponse<T>(result: CodexRpcResult<T>, successStatus = 200): Response {
  if (!result.ok) {
    return json({ ok: false, error: result.error, code: result.code }, { status: result.status });
  }
  const value = result.value;
  return json(
    typeof value === 'object' && value !== null ? { ok: true, ...value } : { ok: true, value },
    { status: successStatus }
  );
}

async function codexRpc<T>(operation: () => Promise<T>): Promise<CodexRpcResult<T>> {
  try {
    return { ok: true, value: await operation() };
  } catch (error) {
    if (error instanceof CodexCommandError) {
      return { ok: false, error: error.message, code: error.code, status: error.status };
    }
    throw error;
  }
}

function workspaceId(env: Env): string {
  return env.WORKSPACE_ID?.trim() || 'create-something';
}

function defaultDeviceId(env: Env): string {
  return env.DEFAULT_DEVICE_ID?.trim() || 'core-ink';
}

function defaultSurface(env: Env): string {
  return env.DEFAULT_SURFACE?.trim() || 'core-ink';
}

function healthStaleAfterMs(env: Env): number {
  const parsed = Number(env.HEALTH_STALE_AFTER_MS);
  if (Number.isFinite(parsed) && parsed > 0) return Math.round(parsed);
  return DEFAULT_HEALTH_STALE_AFTER_MS;
}

function healthReviewRunOptions(input: number | HealthReviewRunOptions | undefined): Required<HealthReviewRunOptions> {
  if (typeof input === 'number') {
    return {
      staleAfterMs: input,
      trigger: 'manual',
      collectedCount: 0,
      startedAt: Date.now(),
      payload: {}
    };
  }

  return {
    staleAfterMs: input?.staleAfterMs ?? DEFAULT_HEALTH_STALE_AFTER_MS,
    trigger: input?.trigger ?? 'manual',
    collectedCount: input?.collectedCount ?? 0,
    startedAt: input?.startedAt ?? Date.now(),
    payload: input?.payload ?? {}
  };
}

async function parseJsonBody<T>(request: Request): Promise<T> {
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    throw new Error('Request body is too large.');
  }

  return (await request.json()) as T;
}

function parseEpoch(value: number | string | undefined, fallback: number | null): number | null {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Date.parse(String(value));
  if (Number.isFinite(parsed)) return parsed;
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric;
  return fallback;
}

function expiresAtFor(input: { expires_at?: number | string; ttl_ms?: unknown }, now: number): number | null {
  const explicit = parseEpoch(input.expires_at, null);
  if (explicit !== null) return explicit;

  const ttlMs =
    typeof input.ttl_ms === 'number'
      ? input.ttl_ms
      : typeof input.ttl_ms === 'string'
        ? Number(input.ttl_ms)
        : undefined;

  if (ttlMs !== undefined && Number.isFinite(ttlMs) && ttlMs > 0) {
    return now + ttlMs;
  }

  return null;
}

function recordValue(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function numberValue(record: Record<string, unknown> | undefined, key: string): number | null {
  const value = record?.[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function normalizedPrioritySourceLinks(
  input: OperatorPriorityInput['source_links']
): NonNullable<OperatorPriorityInput['source_links']> {
  if (!Array.isArray(input)) return [];

  return input
    .map((link) => {
      const label = stringValue(link?.label);
      if (!label) return null;
      const url = stringValue(link?.url);
      const kind = stringValue(link?.kind);
      const id = stringValue(link?.id);
      return {
        label,
        ...(url ? { url } : {}),
        ...(kind ? { kind } : {}),
        ...(id ? { id } : {})
      };
    })
    .filter((link): link is NonNullable<OperatorPriorityInput['source_links']>[number] => Boolean(link))
    .slice(0, 8);
}

function boundedSeverity(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(100, Math.round(value)))
    : fallback;
}

function operatorPriorityDetail(input: {
  summary: string;
  risk: string;
  sourceLinks: NonNullable<OperatorPriorityInput['source_links']>;
  signal: string;
}): string {
  const sourceText = input.sourceLinks.length
    ? `Sources: ${input.sourceLinks.map((link) => link.kind ? `${link.kind}:${link.label}` : link.label).join(', ')}`
    : '';
  const signalText = input.signal ? `Signal: ${input.signal}` : '';
  return [input.summary, `Risk: ${input.risk}`, signalText, sourceText].filter(Boolean).join('\n');
}

function healthReviewFirmwareCopy(
  report: HealthReviewReport,
  collectedCount: number
): {
  headline: string;
  summary: string;
  line2: string;
  detail: string;
  action: string;
  urgent: boolean;
} {
  const registryItem = report.items.find((item) => item.payload.kind === 'mcp_registry_sweep');
  const defaultLine2 = collectedCount > 0 ? `${collectedCount} remote checks` : 'Report complete';

  if (!registryItem) {
    if (report.state === 'clear') {
      return {
        headline: report.headline,
        summary: 'MCP registry clear',
        line2: `${REGISTRY_FALLBACK_MCP_COUNT} MCPs, ${REGISTRY_FALLBACK_FLEET_COUNT} fleet, ${REGISTRY_FALLBACK_AGENT_COUNT} agents`,
        detail: report.detail,
        action: report.action,
        urgent: report.urgent
      };
    }

    return {
      headline: report.headline,
      summary: report.summary,
      line2: defaultLine2,
      detail: report.detail,
      action: report.action,
      urgent: report.urgent
    };
  }

  const registryInventory = recordValue(registryItem.payload.registry_inventory);
  const fleetInventory = recordValue(registryItem.payload.fleet_inventory);
  const agentInventory = recordValue(registryItem.payload.agent_inventory);
  const liveHub = recordValue(registryItem.payload.live_hub);
  const mcpCount = numberValue(registryInventory, 'server_count');
  const fleetCount = numberValue(fleetInventory, 'deployed_count') ?? numberValue(fleetInventory, 'deployment_count');
  const agentCount = numberValue(agentInventory, 'registered_health_surface_count');
  const connectedCount = numberValue(liveHub, 'connected_server_count');
  const enabledCount = numberValue(liveHub, 'enabled_server_count');
  const failedCount = numberValue(liveHub, 'failed_server_count');
  const toolCount = numberValue(liveHub, 'proxy_tool_count');

  const line2Parts = [
    mcpCount !== null ? `${mcpCount} MCPs` : null,
    fleetCount !== null ? `${fleetCount} fleet` : null,
    agentCount !== null ? `${agentCount} agents` : null
  ].filter((part): part is string => Boolean(part));
  const liveText =
    connectedCount !== null && enabledCount !== null
      ? `Live ${connectedCount}/${enabledCount}; failed ${failedCount ?? 0}; tools ${toolCount ?? 0}.`
      : report.detail;

  return {
    headline: report.headline,
    summary: registryItem.summary || report.summary,
    line2: line2Parts.length > 0 ? line2Parts.join(', ') : defaultLine2,
    detail: liveText,
    action: report.action,
    urgent: report.urgent
  };
}

function severityFor(input: { severity?: number; urgent?: boolean; state?: string; status?: string }): number {
  if (typeof input.severity === 'number' && Number.isFinite(input.severity)) {
    return Math.max(0, Math.min(100, Math.round(input.severity)));
  }
  if (input.urgent) return 90;
  if (input.state === 'blocked') return 85;
  if (input.state === 'mcp_attention' || input.state === 'agent_attention') return 80;
  if (input.status && ['fail', 'failed', 'error', 'down'].includes(input.status.toLowerCase())) return 80;
  if (input.status && ['poor', 'degraded'].includes(input.status.toLowerCase())) return 70;
  return 50;
}

function rowAlert(row: Record<string, SqlStorageValue>): StoredAlert {
  return {
    id: String(row.id ?? ''),
    state: String(row.state ?? 'operator_attention'),
    category: String(row.category ?? ''),
    severity: Number(row.severity ?? 50),
    subject: String(row.subject ?? ''),
    reason: String(row.reason ?? ''),
    detail: String(row.detail ?? ''),
    action: String(row.action ?? ''),
    source: String(row.source ?? ''),
    external_id: String(row.external_id ?? ''),
    urgent: Boolean(row.urgent),
    status: row.status === 'cleared' ? 'cleared' : 'active',
    created_at: Number(row.created_at ?? 0),
    updated_at: Number(row.updated_at ?? 0),
    expires_at: row.expires_at === null ? null : Number(row.expires_at ?? 0),
    payload: JSON.parse(String(row.payload_json ?? '{}')) as Record<string, unknown>
  };
}

function rowHealth(row: Record<string, SqlStorageValue>): StoredHealthSnapshot {
  return {
    id: String(row.id ?? ''),
    source: String(row.source ?? ''),
    component: String(row.component ?? ''),
    status: String(row.status ?? 'unknown'),
    summary: String(row.summary ?? ''),
    detail: String(row.detail ?? ''),
    severity: Number(row.severity ?? 0),
    observed_at: Number(row.observed_at ?? 0),
    updated_at: Number(row.updated_at ?? 0),
    payload: JSON.parse(String(row.payload_json ?? '{}')) as Record<string, unknown>
  };
}

function rowDevice(row: Record<string, SqlStorageValue> | null): StoredDeviceHeartbeat | null {
  if (!row) return null;
  return {
    device_id: String(row.device_id ?? ''),
    surface: String(row.surface ?? ''),
    firmware_version: String(row.firmware_version ?? ''),
    battery_percent: Number(row.battery_percent ?? 0),
    battery_mv: Number(row.battery_mv ?? 0),
    charging: Boolean(row.charging),
    power_mode: String(row.power_mode ?? ''),
    ip_hint: String(row.ip_hint ?? ''),
    received_at: Number(row.received_at ?? 0),
    payload: JSON.parse(String(row.payload_json ?? '{}')) as Record<string, unknown>
  };
}

export class InkState extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS alerts (
          id TEXT PRIMARY KEY,
          state TEXT NOT NULL,
          category TEXT NOT NULL,
          severity INTEGER NOT NULL,
          subject TEXT NOT NULL,
          reason TEXT NOT NULL,
          detail TEXT NOT NULL,
          action TEXT NOT NULL,
          source TEXT NOT NULL,
          external_id TEXT NOT NULL,
          urgent INTEGER NOT NULL,
          status TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          expires_at INTEGER,
          payload_json TEXT NOT NULL
        );
      `);
      this.ctx.storage.sql.exec(`
        CREATE INDEX IF NOT EXISTS idx_alerts_active
        ON alerts(status, severity, updated_at);
      `);
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS health_snapshots (
          id TEXT PRIMARY KEY,
          source TEXT NOT NULL,
          component TEXT NOT NULL,
          status TEXT NOT NULL,
          summary TEXT NOT NULL,
          detail TEXT NOT NULL,
          severity INTEGER NOT NULL,
          observed_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          payload_json TEXT NOT NULL
        );
      `);
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS health_review_runs (
          id TEXT PRIMARY KEY,
          trigger TEXT NOT NULL,
          status TEXT NOT NULL,
          ok INTEGER NOT NULL,
          state TEXT NOT NULL,
          collected_count INTEGER NOT NULL,
          checked INTEGER NOT NULL,
          healthy_count INTEGER NOT NULL,
          poor_count INTEGER NOT NULL,
          stale_count INTEGER NOT NULL,
          urgent INTEGER NOT NULL,
          started_at INTEGER NOT NULL,
          finished_at INTEGER NOT NULL,
          duration_ms INTEGER NOT NULL,
          error TEXT NOT NULL,
          report_json TEXT NOT NULL,
          payload_json TEXT NOT NULL
        );
      `);
      const healthReviewRunColumns = this.ctx.storage.sql
        .exec<Record<string, SqlStorageValue>>(`PRAGMA table_info(health_review_runs);`)
        .toArray()
        .map((row) => String(row.name ?? ''));
      for (const column of missingHealthReviewRunColumnMigrations(healthReviewRunColumns)) {
        this.ctx.storage.sql.exec(`ALTER TABLE health_review_runs ADD COLUMN ${column.name} ${column.definition};`);
      }
      this.ctx.storage.sql.exec(`
        CREATE INDEX IF NOT EXISTS idx_health_review_runs_started
        ON health_review_runs(started_at DESC);
      `);
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS device_heartbeats (
          device_id TEXT PRIMARY KEY,
          surface TEXT NOT NULL,
          firmware_version TEXT NOT NULL,
          battery_percent REAL NOT NULL,
          battery_mv INTEGER NOT NULL,
          charging INTEGER NOT NULL,
          power_mode TEXT NOT NULL,
          ip_hint TEXT NOT NULL,
          received_at INTEGER NOT NULL,
          payload_json TEXT NOT NULL
        );
      `);
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS events (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          source TEXT NOT NULL,
          summary TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          payload_json TEXT NOT NULL
        );
      `);
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS codex_snapshots (
          device_id TEXT PRIMARY KEY,
          runner_id TEXT NOT NULL,
          expires_at INTEGER NOT NULL,
          payload_json TEXT NOT NULL
        );
      `);
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS codex_commands (
          request_id TEXT PRIMARY KEY,
          runner_id TEXT NOT NULL,
          device_id TEXT NOT NULL,
          device_nonce TEXT NOT NULL,
          status TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          expires_at INTEGER NOT NULL,
          payload_json TEXT NOT NULL,
          UNIQUE(device_id, device_nonce)
        );
      `);
      this.ctx.storage.sql.exec(`
        CREATE INDEX IF NOT EXISTS idx_codex_commands_runner_queue
        ON codex_commands(runner_id, status, created_at);
      `);
    });
  }

  addAlert(input: InkAlertInput): { ok: true; alert: StoredAlert; brief: ReturnType<typeof buildOperatorBrief> } {
    const now = Date.now();
    const id = input.id?.trim() || crypto.randomUUID();
    const alert: StoredAlert = {
      id,
      state: input.state?.trim() || 'operator_attention',
      category: input.category?.trim() || 'operator',
      severity: severityFor(input),
      subject: input.subject?.trim() || 'Operator attention',
      reason: input.reason?.trim() || '',
      detail: input.detail?.trim() || '',
      action: input.action?.trim() || 'Review source',
      source: input.source?.trim() || 'unknown',
      external_id: input.external_id?.trim() || '',
      urgent: Boolean(input.urgent),
      status: 'active',
      created_at: now,
      updated_at: now,
      expires_at: expiresAtFor(input as InkAlertInput & { ttl_ms?: unknown }, now),
      payload: input.payload ?? {}
    };

    this.ctx.storage.sql.exec(
      `INSERT OR REPLACE INTO alerts
        (id, state, category, severity, subject, reason, detail, action, source, external_id, urgent, status, created_at, updated_at, expires_at, payload_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      alert.id,
      alert.state,
      alert.category,
      alert.severity,
      alert.subject,
      alert.reason,
      alert.detail,
      alert.action,
      alert.source,
      alert.external_id,
      alert.urgent ? 1 : 0,
      alert.status,
      alert.created_at,
      alert.updated_at,
      alert.expires_at,
      JSON.stringify(alert.payload)
    );

    return { ok: true, alert, brief: this.brief('core-ink') };
  }

  setOperatorPriority(input: OperatorPriorityInput): {
    ok: true;
    priority: StoredAlert;
    brief: ReturnType<typeof buildOperatorBrief>;
  } {
    const focus = stringValue(input.focus || input.summary) || 'Operator priority';
    const risk = stringValue(input.risk) || 'No major risk recorded.';
    const nextAction = stringValue(input.next_action) || 'Review priority source';
    const summary = stringValue(input.summary);
    const signal = stringValue(input.signal || input.payload?.signal || input.source_links?.[0]?.kind) || 'operator';
    const sourceLinks = normalizedPrioritySourceLinks(input.source_links);
    const payload = input.payload ?? {};
    const result = this.addAlert({
      id: stringValue(input.id) || 'operator-priority:current',
      state: 'operator_priority',
      category: 'operator_priority',
      severity: boundedSeverity(input.severity, 92),
      subject: focus,
      reason: risk,
      detail: operatorPriorityDetail({ summary, risk, signal, sourceLinks }),
      action: nextAction,
      source: 'operator-priority-producer',
      external_id: 'current',
      urgent: Boolean(input.urgent),
      expires_at: input.expires_at,
      ttl_ms: input.ttl_ms,
      payload: {
        ...payload,
        kind: 'operator_priority',
        signal,
        focus,
        risk,
        next_action: nextAction,
        source_links: sourceLinks
      }
    });

    return { ok: true, priority: result.alert, brief: result.brief };
  }

  setHealthSnapshot(input: HealthSnapshotInput): {
    ok: true;
    health: StoredHealthSnapshot;
    brief: ReturnType<typeof buildOperatorBrief>;
  } {
    const now = Date.now();
    const source = input.source?.trim() || 'unknown';
    const component = input.component?.trim() || source;
    const id = input.id?.trim() || `${source}:${component}`;
    const status = input.status?.trim() || 'unknown';
    const health: StoredHealthSnapshot = {
      id,
      source,
      component,
      status,
      summary: input.summary?.trim() || status,
      detail: input.detail?.trim() || '',
      severity: severityFor({ severity: input.severity, status }),
      observed_at: parseEpoch(input.observed_at, now) ?? now,
      updated_at: now,
      payload: input.payload ?? {}
    };

    this.ctx.storage.sql.exec(
      `INSERT OR REPLACE INTO health_snapshots
        (id, source, component, status, summary, detail, severity, observed_at, updated_at, payload_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      health.id,
      health.source,
      health.component,
      health.status,
      health.summary,
      health.detail,
      health.severity,
      health.observed_at,
      health.updated_at,
      JSON.stringify(health.payload)
    );

    return { ok: true, health, brief: this.brief('core-ink') };
  }

  recordEvent(input: OperatorEventInput): { ok: true; event_id: string; alert?: StoredAlert } {
    const now = Date.now();
    const eventId = crypto.randomUUID();
    this.ctx.storage.sql.exec(
      `INSERT INTO events (id, type, source, summary, created_at, payload_json)
       VALUES (?, ?, ?, ?, ?, ?)`,
      eventId,
      input.type?.trim() || 'operator_event',
      input.source?.trim() || 'unknown',
      input.summary?.trim() || '',
      now,
      JSON.stringify(input.payload ?? {})
    );

    if (input.escalate || input.alert) {
      const result = this.addAlert({
        ...input.alert,
        source: input.alert?.source ?? input.source,
        subject: input.alert?.subject ?? input.summary ?? 'Operator event',
        payload: input.alert?.payload ?? input.payload
      });
      return { ok: true, event_id: eventId, alert: result.alert };
    }

    return { ok: true, event_id: eventId };
  }

  heartbeat(input: DeviceHeartbeatInput, fallbackDeviceId: string): {
    ok: true;
    device: StoredDeviceHeartbeat;
  } {
    const now = Date.now();
    const device: StoredDeviceHeartbeat = {
      device_id: input.device_id?.trim() || fallbackDeviceId,
      surface: input.surface?.trim() || 'core-ink',
      firmware_version: input.firmware_version?.trim() || '',
      battery_percent:
        typeof input.battery_percent === 'number' && Number.isFinite(input.battery_percent)
          ? input.battery_percent
          : 0,
      battery_mv:
        typeof input.battery_mv === 'number' && Number.isFinite(input.battery_mv)
          ? Math.round(input.battery_mv)
          : 0,
      charging: Boolean(input.charging),
      power_mode: input.power_mode?.trim() || '',
      ip_hint: input.ip_hint?.trim() || '',
      received_at: now,
      payload: input.payload ?? {}
    };

    this.ctx.storage.sql.exec(
      `INSERT OR REPLACE INTO device_heartbeats
        (device_id, surface, firmware_version, battery_percent, battery_mv, charging, power_mode, ip_hint, received_at, payload_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      device.device_id,
      device.surface,
      device.firmware_version,
      device.battery_percent,
      device.battery_mv,
      device.charging ? 1 : 0,
      device.power_mode,
      device.ip_hint,
      device.received_at,
      JSON.stringify(device.payload)
    );

    return { ok: true, device };
  }

  clear(scope = 'alerts'): { ok: true; cleared: number; brief: ReturnType<typeof buildOperatorBrief> } {
    if (scope === 'health') {
      const result = this.ctx.storage.sql.exec<Record<string, SqlStorageValue>>(
        `DELETE FROM health_snapshots RETURNING 1 AS count`
      );
      return { ok: true, cleared: result.toArray().length, brief: this.brief('core-ink') };
    }

    const result = this.ctx.storage.sql.exec<Record<string, SqlStorageValue>>(
      `UPDATE alerts SET status = 'cleared', updated_at = ? WHERE status = 'active' RETURNING 1 AS count`,
      Date.now()
    );
    return { ok: true, cleared: result.toArray().length, brief: this.brief('core-ink') };
  }

  healthReview(staleAfterMs = DEFAULT_HEALTH_STALE_AFTER_MS): HealthReviewReport {
    const health = this.ctx.storage.sql
      .exec<Record<string, SqlStorageValue>>(
        `SELECT * FROM health_snapshots
         ORDER BY severity DESC, updated_at DESC
         LIMIT 100`
      )
      .toArray()
      .map(rowHealth);

    return buildHealthReviewReport({ health, staleAfterMs });
  }

  private recordHealthReviewRun(run: StoredHealthReviewRun): StoredHealthReviewRun | null {
    try {
      this.ctx.storage.sql.exec(
        `INSERT INTO health_review_runs
          (id, trigger, status, ok, state, collected_count, checked, healthy_count, poor_count, stale_count, urgent,
           started_at, finished_at, duration_ms, error, report_json, payload_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        run.id,
        run.trigger,
        run.status,
        run.ok ? 1 : 0,
        run.state,
        run.collected_count,
        run.checked,
        run.healthy_count,
        run.poor_count,
        run.stale_count,
        run.urgent ? 1 : 0,
        run.started_at,
        run.finished_at,
        run.duration_ms,
        run.error,
        JSON.stringify(run.report),
        JSON.stringify(run.payload)
      );
      return run;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(JSON.stringify({ service: 'calm-operator-ink-bridge', level: 'error', message }));
      return null;
    }
  }

  recordHealthReviewFailure(input: {
    trigger?: HealthReviewRunTrigger;
    startedAt?: number;
    collectedCount?: number;
    error?: string;
    payload?: Record<string, unknown>;
  }): StoredHealthReviewRun | null {
    const finishedAt = Date.now();
    return this.recordHealthReviewRun(buildHealthReviewRunRecord({
      trigger: input.trigger,
      status: 'failed',
      startedAt: input.startedAt ?? finishedAt,
      finishedAt,
      collectedCount: input.collectedCount ?? 0,
      error: input.error || 'Health review attempt failed.',
      payload: input.payload
    }));
  }

  healthReviewRuns(limit = 20): StoredHealthReviewRun[] {
    return this.ctx.storage.sql
      .exec<Record<string, SqlStorageValue>>(
        `SELECT * FROM health_review_runs
         ORDER BY started_at DESC
         LIMIT ?`,
        normalizeHealthReviewRunLimit(limit)
      )
      .toArray()
      .map(rowHealthReviewRun);
  }

  runHealthReview(optionsInput: number | HealthReviewRunOptions = DEFAULT_HEALTH_STALE_AFTER_MS): HealthReviewRunResult {
    const options = healthReviewRunOptions(optionsInput);
    const startedAt = options.startedAt;

    try {
      const report = this.healthReview(options.staleAfterMs);
      const alertId = 'health-review:create-something';
      let output: Omit<HealthReviewRunResult, 'run'>;

      if (report.state === 'health_attention') {
        const result = this.addAlert({
          id: alertId,
          state: 'health_attention',
          category: 'health',
          severity: report.urgent ? 85 : 75,
          subject: 'CREATE SOMETHING health',
          reason: report.summary,
          detail: report.detail,
          action: report.action,
          source: 'calm-operator-health-review',
          external_id: 'scheduled-health-review',
          urgent: report.urgent,
          ttl_ms: options.staleAfterMs,
          payload: { report }
        });

        output = { ok: true, report, alert: result.alert, brief: result.brief };
      } else {
        const cleared = this.ctx.storage.sql
          .exec<Record<string, SqlStorageValue>>(
            `UPDATE alerts
             SET status = 'cleared', updated_at = ?
             WHERE id = ? AND status = 'active'
             RETURNING 1 AS count`,
            Date.now(),
            alertId
          )
          .toArray().length;

        output = { ok: true, report, cleared, brief: this.brief('core-ink') };
      }

      const finishedAt = Date.now();
      const run = this.recordHealthReviewRun(buildHealthReviewRunRecord({
        trigger: options.trigger,
        status: 'completed',
        startedAt,
        finishedAt,
        collectedCount: options.collectedCount,
        report,
        payload: options.payload
      }));

      return { ...output, run };
    } catch (error) {
      const finishedAt = Date.now();
      this.recordHealthReviewRun(buildHealthReviewRunRecord({
        trigger: options.trigger,
        status: 'failed',
        startedAt,
        finishedAt,
        collectedCount: options.collectedCount,
        error: error instanceof Error ? error.message : String(error),
        payload: options.payload
      }));
      throw error;
    }
  }

  device(deviceId: string): StoredDeviceHeartbeat | null {
    const row = this.ctx.storage.sql
      .exec<Record<string, SqlStorageValue>>(
        `SELECT * FROM device_heartbeats WHERE device_id = ? LIMIT 1`,
        deviceId
      )
      .toArray()[0];
    return rowDevice(row ?? null);
  }

  async publishCodexSnapshot(input: unknown): Promise<CodexRpcResult<Awaited<ReturnType<CodexCommandCoordinator['publishSnapshot']>>>> {
    return codexRpc(() =>
      new CodexCommandCoordinator(new SqlCodexCommandStorage(this.ctx.storage.sql)).publishSnapshot(input)
    );
  }

  async codexDeviceView(deviceId: string): Promise<CodexRpcResult<Awaited<ReturnType<CodexCommandCoordinator['deviceView']>>>> {
    return codexRpc(() =>
      new CodexCommandCoordinator(new SqlCodexCommandStorage(this.ctx.storage.sql)).deviceView(deviceId)
    );
  }

  async createCodexCommand(input: CreateCodexCommandInput): Promise<CodexRpcResult<Awaited<ReturnType<CodexCommandCoordinator['createCommand']>>>> {
    return codexRpc(() =>
      new CodexCommandCoordinator(new SqlCodexCommandStorage(this.ctx.storage.sql)).createCommand(input)
    );
  }

  async nextCodexCommand(runnerId: string): Promise<CodexRpcResult<Awaited<ReturnType<CodexCommandCoordinator['nextCommand']>>>> {
    return codexRpc(() =>
      new CodexCommandCoordinator(new SqlCodexCommandStorage(this.ctx.storage.sql)).nextCommand(runnerId)
    );
  }

  async claimCodexCommand(requestId: string, runnerId: string): Promise<CodexRpcResult<Awaited<ReturnType<CodexCommandCoordinator['claimCommand']>>>> {
    return codexRpc(() =>
      new CodexCommandCoordinator(new SqlCodexCommandStorage(this.ctx.storage.sql)).claimCommand(requestId, runnerId)
    );
  }

  async completeCodexCommand(
    requestId: string,
    runnerId: string,
    input: CompleteCodexCommandInput
  ): Promise<CodexRpcResult<Awaited<ReturnType<CodexCommandCoordinator['completeCommand']>>>> {
    return codexRpc(() =>
      new CodexCommandCoordinator(new SqlCodexCommandStorage(this.ctx.storage.sql)).completeCommand(
        requestId,
        runnerId,
        input
      )
    );
  }

  async codexDeviceCommand(requestId: string, deviceId: string): Promise<CodexRpcResult<Awaited<ReturnType<CodexCommandCoordinator['deviceCommand']>>>> {
    return codexRpc(() =>
      new CodexCommandCoordinator(new SqlCodexCommandStorage(this.ctx.storage.sql)).deviceCommand(requestId, deviceId)
    );
  }

  brief(surface: string, deviceId = 'core-ink'): ReturnType<typeof buildOperatorBrief> {
    const alerts = this.ctx.storage.sql
      .exec<Record<string, SqlStorageValue>>(
        `SELECT * FROM alerts
         WHERE status = 'active'
           AND (expires_at IS NULL OR expires_at > ?)
         ORDER BY severity DESC, updated_at DESC
         LIMIT 20`,
        Date.now()
      )
      .toArray()
      .map(rowAlert);

    const health = this.ctx.storage.sql
      .exec<Record<string, SqlStorageValue>>(
        `SELECT * FROM health_snapshots
         ORDER BY severity DESC, updated_at DESC
         LIMIT 30`
      )
      .toArray()
      .map(rowHealth);

    return buildOperatorBrief({
      surface,
      alerts,
      health,
      device: this.device(deviceId)
    });
  }
}

function stateStub(env: Env): DurableObjectStub<InkState> {
  return env.INK_STATE.getByName(workspaceId(env));
}

async function collectAndRunHealthReview(env: Env, trigger: HealthReviewRunTrigger = 'manual'): Promise<{
  ok: true;
  collected: Array<{ ok: boolean; component: string; status?: string }>;
  review: Awaited<ReturnType<InkState['runHealthReview']>>;
}> {
  const stub = stateStub(env);
  const startedAt = Date.now();
  let collected: Awaited<ReturnType<typeof collectRemoteHealthChecks>> = [];
  let collectedSummary: Array<{ ok: boolean; component: string; status?: string }> = [];

  try {
    collected = await collectRemoteHealthChecks(env);

    for (const result of collected) {
      await stub.setHealthSnapshot(result.snapshot);
    }

    collectedSummary = collected.map((result) => ({
      ok: result.ok,
      component: result.check.component,
      status: result.snapshot.status
    }));
  } catch (error) {
    try {
      await stub.recordHealthReviewFailure({
        trigger,
        startedAt,
        collectedCount: collected.length,
        error: error instanceof Error ? error.message : String(error),
        payload: { collected: collectedSummary }
      });
    } catch (recordError) {
      const message = recordError instanceof Error ? recordError.message : String(recordError);
      console.error(JSON.stringify({ service: 'calm-operator-ink-bridge', level: 'error', message }));
    }
    throw error;
  }

  return {
    ok: true,
    collected: collectedSummary,
    review: await stub.runHealthReview({
      staleAfterMs: healthStaleAfterMs(env),
      trigger,
      collectedCount: collected.length,
      startedAt,
      payload: { collected: collectedSummary }
    })
  };
}

async function runScheduledDailyAlarms(env: Env, nowMs = Date.now()): Promise<{
  ok: true;
  checked_at: string;
  fired: Array<{ id: string; local_date: string; local_time: string; display_time: string }>;
}> {
  const alarms = dueDailyAlarms(env, nowMs);
  if (!alarms.length) {
    return { ok: true, checked_at: new Date(nowMs).toISOString(), fired: [] };
  }

  const stub = stateStub(env);
  const fired = [];

  for (const alarm of alarms) {
    await stub.addAlert(alarm.alert);
    fired.push({
      id: alarm.id,
      local_date: alarm.local_date,
      local_time: alarm.local_time,
      display_time: alarm.display_time
    });
  }

  return { ok: true, checked_at: new Date(nowMs).toISOString(), fired };
}

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const method = request.method.toUpperCase();

  if (method === 'OPTIONS') return text('', { status: 204 });

  if (method === 'GET' && path === '/healthz') {
    return json({
      ok: true,
      service: 'calm-operator-ink-bridge',
      workspace: workspaceId(env),
      live_only: true
    });
  }

  if (method === 'GET' && path === '/') {
    return json({
      service: 'calm-operator-ink-bridge',
      description: 'Production bridge for Calm Operator Ink live operator briefs.',
      endpoints: [
        'GET /healthz',
        'GET /ink/brief',
        'GET /ink/surface-brief',
        'GET /ink/clock',
        'POST /ink/alert',
        'POST /ink/operator-priority',
        'POST /ink/operator-event',
        'POST /ink/health-snapshot',
        'GET /ink/health-checks',
        'POST /ink/health-checks/run',
        'GET /ink/health-review',
        'GET /ink/health-review/runs',
        'POST /ink/health-review/request',
        'POST /ink/health-review/run',
        'POST /ink/alarms/run',
        'POST /ink/device-heartbeat',
        'GET /ink/codex',
        'POST /ink/codex/commands',
        'GET /ink/codex/commands/:request_id',
        'POST /ink/codex/snapshot',
        'GET /ink/codex/commands/next',
        'POST /ink/codex/commands/:request_id/claim',
        'POST /ink/codex/commands/:request_id/receipt',
        'POST /ink/clear'
      ]
    });
  }

  const authRole = authRoleForInkRoute(method, path);
  if (authRole && !(await isAuthorized(request, env, authRole))) {
    return json(
      {
        ok: false,
        error: `Unauthorized ${authRole} request.`
      },
      { status: 401 }
    );
  }

  const stub = stateStub(env);

  if (method === 'GET' && path === '/ink/codex') {
    const deviceId = url.searchParams.get('device_id') || defaultDeviceId(env);
    return codexResponse(await stub.codexDeviceView(deviceId));
  }

  if (method === 'POST' && path === '/ink/codex/snapshot') {
    return codexResponse(await stub.publishCodexSnapshot(await parseJsonBody<unknown>(request)), 201);
  }

  if (method === 'POST' && path === '/ink/codex/commands') {
    const body = await parseJsonBody<CreateCodexCommandInput>(request);
    return codexResponse(await stub.createCodexCommand(body), 201);
  }

  if (method === 'GET' && path === '/ink/codex/commands/next') {
    return codexResponse(await stub.nextCodexCommand(url.searchParams.get('runner_id') || ''));
  }

  const codexCommandMatch = path.match(/^\/ink\/codex\/commands\/([A-Za-z0-9][A-Za-z0-9:._-]*)$/);
  if (method === 'GET' && codexCommandMatch) {
    const deviceId = url.searchParams.get('device_id') || defaultDeviceId(env);
    return codexResponse(await stub.codexDeviceCommand(codexCommandMatch[1]!, deviceId));
  }

  const codexRunnerMatch = path.match(
    /^\/ink\/codex\/commands\/([A-Za-z0-9][A-Za-z0-9:._-]*)\/(claim|receipt)$/
  );
  if (method === 'POST' && codexRunnerMatch) {
    const body = await parseJsonBody<CompleteCodexCommandInput & { runner_id?: string }>(request);
    const requestId = codexRunnerMatch[1]!;
    const runnerId = body.runner_id || '';
    return codexRunnerMatch[2] === 'claim'
      ? codexResponse(await stub.claimCodexCommand(requestId, runnerId))
      : codexResponse(await stub.completeCodexCommand(requestId, runnerId, body));
  }

  if (method === 'GET' && (path === '/ink/brief' || path === '/ink/surface-brief')) {
    const surface = url.searchParams.get('surface') || defaultSurface(env);
    const deviceId = url.searchParams.get('device_id') || defaultDeviceId(env);
    const brief = await stub.brief(surface, deviceId);
    return json(path === '/ink/brief' ? toFirmwareBrief(brief) : brief);
  }

  if (method === 'GET' && path === '/ink/clock') {
    const clock = buildInkClock();
    return json({
      ok: true,
      clock: {
        ...clock,
        display_date: clock.local_date
      }
    });
  }

  if (method === 'GET' && path === '/ink/device') {
    const deviceId = url.searchParams.get('device_id') || defaultDeviceId(env);
    return json({ ok: true, device: await stub.device(deviceId) });
  }

  if (method === 'GET' && path === '/ink/linear-open') {
    return json(
      await fetchLinearOpenIssues({
        apiKey: env.LINEAR_API_KEY ?? '',
        teamKey: url.searchParams.get('team') || env.LINEAR_TEAM_KEY || 'CRE',
        limit: Number(url.searchParams.get('limit') || 5)
      })
    );
  }

  if (method === 'POST' && path === '/ink/linear-action') {
    const body = await parseJsonBody<{ action?: string; issue?: string; team?: string }>(request);
    if (body.action !== 'claim') {
      return json({ ok: false, error: 'Unsupported Linear action.' }, { status: 400 });
    }

    return json(
      await claimLinearIssue({
        apiKey: env.LINEAR_API_KEY ?? '',
        identifier: body.issue ?? '',
        teamKey: body.team || env.LINEAR_TEAM_KEY || 'CRE'
      })
    );
  }

  if (method === 'POST' && path === '/ink/alert') {
    const body = await parseJsonBody<InkAlertInput>(request);
    return json(await stub.addAlert(body));
  }

  if (method === 'POST' && path === '/ink/operator-priority') {
    const body = await parseJsonBody<OperatorPriorityInput>(request);
    return json(await stub.setOperatorPriority(body));
  }

  if (method === 'POST' && path === '/ink/health-snapshot') {
    const body = await parseJsonBody<HealthSnapshotInput>(request);
    return json(await stub.setHealthSnapshot(body));
  }

  if (method === 'GET' && path === '/ink/health-checks') {
    return json({
      ok: true,
      checks: configuredRemoteHealthChecks(env).map((check) => ({
        id: check.id ?? '',
        source: check.source ?? 'remote-health-check',
        component: check.component,
        type: check.type ?? 'service',
        registry_id: check.registry_id ?? '',
        method: check.method ?? 'GET',
        has_token: Boolean(check.token_env)
      }))
    });
  }

  if (method === 'POST' && path === '/ink/health-checks/run') {
    return json(await collectAndRunHealthReview(env, 'health_checks_run'));
  }

  if (method === 'GET' && path === '/ink/health-review/runs') {
    return json({
      ok: true,
      runs: await stub.healthReviewRuns(normalizeHealthReviewRunLimit(url.searchParams.get('limit')))
    });
  }

  if (method === 'GET' && path === '/ink/health-review') {
    return json(await stub.healthReview(healthStaleAfterMs(env)));
  }

  if (method === 'POST' && path === '/ink/health-review/run') {
    const collect = url.searchParams.get('collect');
    return json(
      collect === 'false'
        ? await stub.runHealthReview({ staleAfterMs: healthStaleAfterMs(env), trigger: 'manual' })
        : await collectAndRunHealthReview(env, 'manual')
    );
  }

  if (method === 'POST' && path === '/ink/health-review/request') {
    const collect = url.searchParams.get('collect');
    const result =
      collect === 'false'
        ? {
            ok: true,
            collected: [],
            review: await stub.runHealthReview({
              staleAfterMs: healthStaleAfterMs(env),
              trigger: 'device_request'
            })
          }
        : await collectAndRunHealthReview(env, 'device_request');
    const firmwareBrief = toFirmwareBrief(result.review.brief);
    const healthCopy = healthReviewFirmwareCopy(result.review.report, result.collected.length);

    return json({
      ...firmwareBrief,
      headline: healthCopy.headline,
      line1: healthCopy.summary,
      line2: healthCopy.line2,
      detail: healthCopy.detail,
      action: healthCopy.action,
      urgent: healthCopy.urgent,
      health_review: {
        run_id: result.review.run?.id ?? null,
        state: result.review.report.state,
        headline: healthCopy.headline,
        summary: healthCopy.summary,
        line2: healthCopy.line2,
        detail: healthCopy.detail,
        action: healthCopy.action,
        urgent: healthCopy.urgent,
        collected: result.collected.length
      }
    });
  }

  if (method === 'POST' && path === '/ink/alarms/run') {
    const body: { now?: number | string } = await parseJsonBody<{ now?: number | string }>(request).catch(() => ({}));
    const nowMs = parseEpoch(body.now, Date.now()) ?? Date.now();
    return json(await runScheduledDailyAlarms(env, nowMs));
  }

  if (method === 'POST' && (path === '/ink/source-event' || path === '/ink/operator-event')) {
    const body = await parseJsonBody<OperatorEventInput>(request);
    return json(await stub.recordEvent(body));
  }

  if (method === 'POST' && path === '/ink/device-heartbeat') {
    const body = await parseJsonBody<DeviceHeartbeatInput>(request);
    return json(await stub.heartbeat(body, defaultDeviceId(env)));
  }

  if (method === 'POST' && path === '/ink/clear') {
    const body = await parseJsonBody<{ scope?: string }>(request).catch(() => ({ scope: 'alerts' }));
    return json(await stub.clear(body.scope ?? 'alerts'));
  }

  return json({ ok: false, error: 'Not found.' }, { status: 404 });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await route(request, env);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(JSON.stringify({ service: 'calm-operator-ink-bridge', level: 'error', message }));
      return json({ ok: false, error: message }, { status: 500 });
    }
  },

  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      (async () => {
        try {
          const nowMs = controller.scheduledTime ?? Date.now();
          await runScheduledDailyAlarms(env, nowMs);
          if (shouldRunHealthReviewAtUtcHour(env.HEALTH_REVIEW_UTC_HOURS, nowMs)) {
            await collectAndRunHealthReview(env, 'scheduled');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(JSON.stringify({ service: 'calm-operator-ink-bridge', level: 'error', message }));
        }
      })()
    );
  }
};
