import { DurableObject } from 'cloudflare:workers';
import { buildOperatorBrief, toFirmwareBrief } from './brief.js';
import { isAuthorized } from './auth.js';
import type {
  DeviceHeartbeatInput,
  HealthSnapshotInput,
  InkAlertInput,
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
  INK_BRIDGE_TOKEN?: string;
  INK_DEVICE_TOKEN?: string;
  INK_SOURCE_TOKEN?: string;
}

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8'
};

const MAX_BODY_BYTES = 64 * 1024;

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
        'POST /ink/alert',
        'POST /ink/health-snapshot',
        'POST /ink/device-heartbeat',
        'POST /ink/clear'
      ]
    });
  }

  if ((method === 'GET' && (path === '/ink/brief' || path === '/ink/surface-brief' || path === '/ink/device')) ||
      (method === 'POST' && (path === '/ink/device-heartbeat' || path === '/ink/clear'))) {
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

  if (method === 'GET' && path === '/ink/device') {
    const deviceId = url.searchParams.get('device_id') || defaultDeviceId(env);
    return json({ ok: true, device: await stub.device(deviceId) });
  }

  if (method === 'POST' && path === '/ink/alert') {
    const body = await parseJsonBody<InkAlertInput>(request);
    return json(await stub.addAlert(body));
  }

  if (method === 'POST' && path === '/ink/health-snapshot') {
    const body = await parseJsonBody<HealthSnapshotInput>(request);
    return json(await stub.setHealthSnapshot(body));
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
  }
};
