import { DurableObject } from 'cloudflare:workers';
import { buildOperatorBrief, toFirmwareBrief } from './brief.js';
import { buildClockSnapshot } from './clock.js';
import { isAuthorized } from './auth.js';
import { DEFAULT_HEALTH_STALE_AFTER_MS, buildHealthReviewReport } from './health-review.js';
import { buildInkNavigation } from './navigation.js';
import { collectRemoteHealthChecks, configuredRemoteHealthChecks } from './remote-health-checks.js';
import { dueDailyAlarms, shouldRunHealthReviewAtUtcHour } from './scheduled-alarms.js';
import { listSurfaceProfiles } from './surfaces.js';
import type {
  DeviceHeartbeatInput,
  HealthReviewReport,
  HealthReviewRun,
  HealthSnapshotInput,
  InkAlertInput,
  OperatorDecisionInput,
  OperatorEventInput,
  StoredAlert,
  StoredDeviceHeartbeat,
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
  INK_SOURCE_TOKEN?: string;
  HALFDOZEN_AGENT_ROUTE_TOKEN?: string;
}

interface OperatorCheckInInput {
  key?: string;
  label?: string;
  detail?: string;
  surface?: string;
  device_id?: string;
  battery_percent?: number;
}

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8'
};

const MAX_BODY_BYTES = 64 * 1024;
const REGISTRY_FALLBACK_MCP_COUNT = 1014;
const REGISTRY_FALLBACK_FLEET_COUNT = 22;
const REGISTRY_FALLBACK_AGENT_COUNT = 4;
const MAX_HEALTH_REVIEW_RUNS = 50;

type HealthReviewCollectedSummary = Array<{ ok: boolean; component: string; status?: string }>;

function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data, null, 2), {
    ...init,
    headers: {
      ...JSON_HEADERS,
      ...Object.fromEntries(new Headers(init.headers ?? undefined))
    }
  });
}

function text(data: string, init: ResponseInit = {}): Response {
  return new Response(data, init);
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

function compactText(value: string | undefined, max: number): string {
  const trimmed = value?.replace(/\s+/g, ' ').trim() ?? '';
  if (trimmed.length <= max) return trimmed;
  if (max <= 1) return trimmed.slice(0, max);
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function normalizedUrgency(input: OperatorDecisionInput): string {
  return input.urgency?.trim().toLowerCase() || '';
}

function decisionRequiresAttention(input: OperatorDecisionInput): boolean {
  const urgency = normalizedUrgency(input);
  if (input.can_step_away === true && input.decision_required !== true) return false;
  if (input.decision_required === true) return true;
  if (['attention', 'urgent', 'blocked'].includes(urgency)) return true;
  if (input.state && !['clear', 'note'].includes(input.state.trim().toLowerCase())) return true;
  return false;
}

function alertStateForDecision(input: OperatorDecisionInput): string {
  const urgency = normalizedUrgency(input);
  if (input.state?.trim()) return input.state.trim();
  if (urgency === 'blocked') return 'blocked';
  if (urgency === 'urgent') return 'operator_attention';
  return 'operator_attention';
}

function severityForDecision(input: OperatorDecisionInput): number {
  const urgency = normalizedUrgency(input);
  if (urgency === 'blocked') return 90;
  if (urgency === 'urgent') return 85;
  if (urgency === 'attention' || input.decision_required) return 75;
  return 35;
}

function decisionPayload(input: OperatorDecisionInput): Record<string, unknown> {
  return {
    ...(input.payload ?? {}),
    kind: 'operator_decision',
    decision_required: Boolean(input.decision_required),
    can_step_away: Boolean(input.can_step_away),
    urgency: input.urgency ?? '',
    owner: input.owner ?? '',
    artifact: input.artifact ?? '',
    confidence: typeof input.confidence === 'number' && Number.isFinite(input.confidence)
      ? Math.max(0, Math.min(1, input.confidence))
      : null
  };
}

function decisionDetail(input: OperatorDecisionInput): string {
  const parts = [
    input.detail?.trim(),
    input.artifact?.trim() ? `Artifact: ${input.artifact.trim()}` : '',
    input.owner?.trim() ? `Owner: ${input.owner.trim()}` : ''
  ].filter((part): part is string => Boolean(part));
  return compactText(parts.join(' '), 500);
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

function rowHealthReviewRun(row: Record<string, SqlStorageValue>): HealthReviewRun {
  return {
    id: String(row.id ?? ''),
    trigger: String(row.trigger ?? ''),
    state: String(row.state ?? 'clear') as HealthReviewRun['state'],
    checked: Number(row.checked ?? 0),
    healthy_count: Number(row.healthy_count ?? 0),
    poor_count: Number(row.poor_count ?? 0),
    stale_count: Number(row.stale_count ?? 0),
    urgent: Boolean(row.urgent),
    summary: String(row.summary ?? ''),
    detail: String(row.detail ?? ''),
    action: String(row.action ?? ''),
    collected_count: Number(row.collected_count ?? 0),
    created_at: Number(row.created_at ?? 0),
    report: JSON.parse(String(row.report_json ?? '{}')) as HealthReviewReport,
    collected: JSON.parse(String(row.collected_json ?? '[]')) as HealthReviewCollectedSummary
  };
}

function healthReviewRunId(report: HealthReviewReport, trigger: string): string {
  const epoch = Date.parse(report.generated_at);
  const timestamp = Number.isFinite(epoch) ? epoch : Date.now();
  return `health-review:${trigger}:${timestamp}`;
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
        CREATE TABLE IF NOT EXISTS health_review_runs (
          id TEXT PRIMARY KEY,
          trigger TEXT NOT NULL,
          state TEXT NOT NULL,
          checked INTEGER NOT NULL,
          healthy_count INTEGER NOT NULL,
          poor_count INTEGER NOT NULL,
          stale_count INTEGER NOT NULL,
          urgent INTEGER NOT NULL,
          summary TEXT NOT NULL,
          detail TEXT NOT NULL,
          action TEXT NOT NULL,
          collected_count INTEGER NOT NULL,
          created_at INTEGER NOT NULL,
          report_json TEXT NOT NULL,
          collected_json TEXT NOT NULL
        );
      `);
      this.ctx.storage.sql.exec(`
        CREATE INDEX IF NOT EXISTS idx_health_review_runs_created_at
        ON health_review_runs(created_at DESC);
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

  recordOperatorDecision(input: OperatorDecisionInput): {
    ok: true;
    event_id: string;
    escalated: boolean;
    alert?: StoredAlert;
    brief: ReturnType<typeof buildOperatorBrief>;
  } {
    const summary = input.summary?.trim() || input.reason?.trim() || input.subject?.trim() || 'Operator decision';
    const event = this.recordEvent({
      type: 'operator_decision',
      source: input.source?.trim() || 'remote-agent',
      summary,
      payload: decisionPayload(input)
    });

    if (!decisionRequiresAttention(input)) {
      return {
        ok: true,
        event_id: event.event_id,
        escalated: false,
        brief: this.brief('core-ink')
      };
    }

    const result = this.addAlert({
      id: input.id?.trim(),
      state: alertStateForDecision(input),
      category: 'operator_decision',
      severity: severityForDecision(input),
      subject: input.subject?.trim() || summary,
      reason: input.reason?.trim() || summary,
      detail: decisionDetail(input),
      action: input.action?.trim() || 'Review agent decision',
      source: input.source?.trim() || 'remote-agent',
      external_id: input.id?.trim() || input.artifact?.trim() || '',
      urgent: ['urgent', 'blocked'].includes(normalizedUrgency(input)),
      ttl_ms: input.ttl_ms,
      payload: decisionPayload(input)
    });

    return {
      ok: true,
      event_id: event.event_id,
      escalated: true,
      alert: result.alert,
      brief: result.brief
    };
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

  recordHealthReviewRun(
    report: HealthReviewReport,
    options: { trigger?: string; collected?: HealthReviewCollectedSummary } = {}
  ): HealthReviewRun {
    const trigger = options.trigger?.trim() || 'manual';
    const collected = options.collected ?? [];
    const createdAt = Date.parse(report.generated_at);
    const run: HealthReviewRun = {
      id: healthReviewRunId(report, trigger),
      trigger,
      state: report.state,
      checked: report.checked,
      healthy_count: report.healthy_count,
      poor_count: report.poor_count,
      stale_count: report.stale_count,
      urgent: report.urgent,
      summary: report.summary,
      detail: report.detail,
      action: report.action,
      collected_count: collected.length,
      created_at: Number.isFinite(createdAt) ? createdAt : Date.now(),
      report,
      collected
    };

    this.ctx.storage.sql.exec(
      `INSERT OR REPLACE INTO health_review_runs
        (id, trigger, state, checked, healthy_count, poor_count, stale_count, urgent, summary, detail, action, collected_count, created_at, report_json, collected_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      run.id,
      run.trigger,
      run.state,
      run.checked,
      run.healthy_count,
      run.poor_count,
      run.stale_count,
      run.urgent ? 1 : 0,
      run.summary,
      run.detail,
      run.action,
      run.collected_count,
      run.created_at,
      JSON.stringify(run.report),
      JSON.stringify(run.collected)
    );
    this.ctx.storage.sql.exec(
      `DELETE FROM health_review_runs
       WHERE id NOT IN (
         SELECT id FROM health_review_runs
         ORDER BY created_at DESC
         LIMIT ?
       )`,
      MAX_HEALTH_REVIEW_RUNS
    );

    return run;
  }

  healthReviewRuns(limit = 20): { ok: true; runs: HealthReviewRun[] } {
    const safeLimit = Math.max(1, Math.min(MAX_HEALTH_REVIEW_RUNS, Math.round(limit)));
    const runs = this.ctx.storage.sql
      .exec<Record<string, SqlStorageValue>>(
        `SELECT * FROM health_review_runs
         ORDER BY created_at DESC
         LIMIT ?`,
        safeLimit
      )
      .toArray()
      .map(rowHealthReviewRun);

    return { ok: true, runs };
  }

  runHealthReview(
    staleAfterMs = DEFAULT_HEALTH_STALE_AFTER_MS,
    options: { trigger?: string; collected?: HealthReviewCollectedSummary } = {}
  ): {
    ok: true;
    report: HealthReviewReport;
    run: HealthReviewRun;
    alert?: StoredAlert;
    cleared?: number;
    brief: ReturnType<typeof buildOperatorBrief>;
  } {
    const report = this.healthReview(staleAfterMs);
    const alertId = 'health-review:create-something';
    const run = this.recordHealthReviewRun(report, options);

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
        ttl_ms: staleAfterMs,
        payload: { report }
      });

      return { ok: true, report, run, alert: result.alert, brief: result.brief };
    }

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

    return { ok: true, report, run, cleared, brief: this.brief('core-ink') };
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

async function collectAndRunHealthReview(env: Env, trigger = 'source_run'): Promise<{
  ok: true;
  collected: HealthReviewCollectedSummary;
  review: Awaited<ReturnType<InkState['runHealthReview']>>;
}> {
  const stub = stateStub(env);
  const collected = await collectRemoteHealthChecks(env);

  for (const result of collected) {
    await stub.setHealthSnapshot(result.snapshot);
  }

  const collectedSummary = collected.map((result) => ({
    ok: result.ok,
    component: result.check.component,
    status: result.snapshot.status
  }));
  const review = (await stub.runHealthReview(healthStaleAfterMs(env), {
    trigger,
    collected: collectedSummary
  })) as Awaited<ReturnType<InkState['runHealthReview']>>;

  console.log(JSON.stringify({
    service: 'calm-operator-ink-bridge',
    event: 'health_review_run',
    trigger,
    state: review.report.state,
    checked: review.report.checked,
    poor_count: review.report.poor_count,
    stale_count: review.report.stale_count,
    collected_count: collectedSummary.length,
    summary: review.report.summary
  }));

  return {
    ok: true,
    collected: collectedSummary,
    review
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
        'GET /ink/navigation',
        'GET /ink/surfaces',
        'POST /ink/alert',
        'POST /ink/operator-decision',
        'POST /ink/health-snapshot',
        'GET /ink/health-checks',
        'POST /ink/health-checks/run',
        'GET /ink/health-review',
        'GET /ink/health-review/runs',
        'POST /ink/health-review/request',
        'POST /ink/health-review/run',
        'POST /ink/alarms/run',
        'POST /ink/operator-check-in',
        'POST /ink/device-heartbeat',
        'POST /ink/clear'
      ]
    });
  }

  if ((method === 'GET' &&
      (path === '/ink/brief' ||
        path === '/ink/surface-brief' ||
        path === '/ink/clock' ||
        path === '/ink/navigation' ||
        path === '/ink/surfaces' ||
        path === '/ink/device')) ||
      (method === 'POST' &&
        (path === '/ink/device-heartbeat' ||
          path === '/ink/clear' ||
          path === '/ink/health-review/request' ||
          path === '/ink/operator-check-in'))) {
    if (!(await isAuthorized(request, env, 'device'))) {
      return json({ ok: false, error: 'Unauthorized device request.' }, { status: 401 });
    }
  } else if (path.startsWith('/ink/')) {
    if (!(await isAuthorized(request, env, 'source'))) {
      return json({ ok: false, error: 'Unauthorized source request.' }, { status: 401 });
    }
  }

  const stub = stateStub(env);

  if (method === 'GET' && (path === '/ink/brief' || path === '/ink/surface-brief')) {
    const surface = url.searchParams.get('surface') || defaultSurface(env);
    const deviceId = url.searchParams.get('device_id') || defaultDeviceId(env);
    const brief = await stub.brief(surface, deviceId);
    return json(path === '/ink/brief' ? toFirmwareBrief(brief) : brief);
  }

  if (method === 'GET' && path === '/ink/clock') {
    return json({ ok: true, clock: buildClockSnapshot() });
  }

  if (method === 'GET' && path === '/ink/navigation') {
    const surface = url.searchParams.get('surface') || defaultSurface(env);
    return json({ ok: true, navigation: buildInkNavigation(surface) });
  }

  if (method === 'GET' && path === '/ink/surfaces') {
    return json({ ok: true, surfaces: listSurfaceProfiles() });
  }

  if (method === 'GET' && path === '/ink/device') {
    const deviceId = url.searchParams.get('device_id') || defaultDeviceId(env);
    return json({ ok: true, device: await stub.device(deviceId) });
  }

  if (method === 'POST' && path === '/ink/alert') {
    const body = await parseJsonBody<InkAlertInput>(request);
    return json(await stub.addAlert(body));
  }

  if (method === 'POST' && path === '/ink/operator-decision') {
    const body = await parseJsonBody<OperatorDecisionInput>(request);
    return json(await stub.recordOperatorDecision(body));
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
    const limit = Number(url.searchParams.get('limit') ?? '20');
    return json(await stub.healthReviewRuns(Number.isFinite(limit) ? limit : 20));
  }

  if (method === 'GET' && path === '/ink/health-review') {
    return json(await stub.healthReview(healthStaleAfterMs(env)));
  }

  if (method === 'POST' && path === '/ink/health-review/run') {
    const collect = url.searchParams.get('collect');
    return json(collect === 'false'
      ? await stub.runHealthReview(healthStaleAfterMs(env), { trigger: 'source_run_no_collect', collected: [] })
      : await collectAndRunHealthReview(env, 'source_run'));
  }

  if (method === 'POST' && path === '/ink/health-review/request') {
    const collect = url.searchParams.get('collect');
    const surface = url.searchParams.get('surface') || defaultSurface(env);
    const deviceId = url.searchParams.get('device_id') || defaultDeviceId(env);
    const result =
      collect === 'false'
        ? {
            ok: true,
            collected: [],
            review: await stub.runHealthReview(healthStaleAfterMs(env), {
              trigger: 'device_request_no_collect',
              collected: []
            })
          }
        : await collectAndRunHealthReview(env, 'device_request');
    const surfaceBrief = await stub.brief(surface, deviceId);
    const firmwareBrief = toFirmwareBrief(surfaceBrief);
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

  if (method === 'POST' && path === '/ink/operator-check-in') {
    const body = await parseJsonBody<OperatorCheckInInput>(request);
    const label = body.label?.trim() || body.key?.trim() || 'Operator check-in';
    const result = (await stub.recordEvent({
      type: 'operator_checkin',
      source: body.device_id?.trim() || defaultDeviceId(env),
      summary: label,
      payload: {
        ...body,
        surface: body.surface?.trim() || defaultSurface(env),
        recorded_at: new Date().toISOString()
      }
    })) as { ok: true; event_id: string };
    return json({
      ok: true,
      event_id: result.event_id,
      state: 'clear',
      headline: 'CHECK-IN SAVED',
      line1: label,
      line2: 'Operator state logged',
      detail: 'No operator action.',
      action: 'Return to Calm',
      urgent: false
    });
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
