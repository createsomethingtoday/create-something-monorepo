import type { HealthSnapshotInput, RemoteHealthCheckConfig, RemoteHealthCheckResult } from './types.js';

interface RemoteHealthEnv {
  HEALTH_CHECKS_JSON?: string;
  HEALTH_SELF_ORIGIN?: string;
  HEALTH_SELF_CHECK_ENABLED?: string;
}

const DEFAULT_TIMEOUT_MS = 5000;
const MAX_TIMEOUT_MS = 15000;

function compact(value: string, max: number): string {
  const trimmed = value.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= max) return trimmed;
  if (max <= 1) return trimmed.slice(0, max);
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function parseChecksJson(value: string | undefined): RemoteHealthCheckConfig[] {
  if (!value?.trim()) return [];

  const parsed = JSON.parse(value) as unknown;
  const rawChecks = Array.isArray(parsed)
    ? parsed
    : typeof parsed === 'object' && parsed !== null && Array.isArray((parsed as { checks?: unknown }).checks)
      ? (parsed as { checks: unknown[] }).checks
      : [];

  return rawChecks
    .filter((item): item is RemoteHealthCheckConfig => {
      if (typeof item !== 'object' || item === null) return false;
      const candidate = item as Partial<RemoteHealthCheckConfig>;
      return typeof candidate.component === 'string' && typeof candidate.url === 'string';
    })
    .map((check) => ({
      ...check,
      method: check.method?.trim() || 'GET',
      source: check.source?.trim() || 'remote-health-check'
    }));
}

function selfCheck(env: RemoteHealthEnv): RemoteHealthCheckConfig[] {
  if (env.HEALTH_SELF_CHECK_ENABLED?.toLowerCase() !== 'true') return [];
  const origin = env.HEALTH_SELF_ORIGIN?.trim() || 'https://ink.createsomething.agency';

  return [
    {
      id: 'service.calm-operator-ink-bridge',
      source: 'remote-health-check',
      component: 'Calm Operator Ink Bridge',
      type: 'service',
      registry_id: 'service.calm-operator-ink-bridge',
      url: `${origin.replace(/\/+$/, '')}/healthz`,
      expected_status: 200,
      expected_text: 'calm-operator-ink-bridge',
      action: 'Check Cloudflare Worker deployment and route'
    }
  ];
}

export function configuredRemoteHealthChecks(env: RemoteHealthEnv): RemoteHealthCheckConfig[] {
  return [...selfCheck(env), ...parseChecksJson(env.HEALTH_CHECKS_JSON)];
}

function timeoutFor(check: RemoteHealthCheckConfig): number {
  if (typeof check.timeout_ms !== 'number' || !Number.isFinite(check.timeout_ms)) return DEFAULT_TIMEOUT_MS;
  return Math.max(250, Math.min(MAX_TIMEOUT_MS, Math.round(check.timeout_ms)));
}

function redactedUrl(value: string): string {
  try {
    const url = new URL(value);
    url.username = '';
    url.password = '';
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return '';
  }
}

function tokenFor(check: RemoteHealthCheckConfig, env: RemoteHealthEnv): string | undefined {
  const key = check.token_env?.trim();
  if (!key) return undefined;
  const value = (env as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function snapshotFor(input: {
  check: RemoteHealthCheckConfig;
  status: string;
  summary: string;
  detail: string;
  severity: number;
  observedAt: number;
  httpStatus?: number;
  durationMs?: number;
}): HealthSnapshotInput {
  const { check } = input;

  return {
    id: check.id || `${check.source ?? 'remote-health-check'}:${check.component}`,
    source: check.source ?? 'remote-health-check',
    component: check.component,
    status: input.status,
    summary: compact(input.summary, 120),
    detail: compact(input.detail, 240),
    severity: input.severity,
    observed_at: input.observedAt,
    payload: {
      kind: 'remote_health_check',
      type: check.type ?? 'service',
      registry_id: check.registry_id ?? '',
      action: check.action ?? '',
      url: redactedUrl(check.url),
      expected_status: check.expected_status ?? 200,
      expected_text: check.expected_text ?? '',
      http_status: input.httpStatus ?? null,
      duration_ms: input.durationMs ?? null
    }
  };
}

export async function runRemoteHealthCheck(
  check: RemoteHealthCheckConfig,
  env: RemoteHealthEnv,
  fetcher: typeof fetch = fetch,
  now = Date.now()
): Promise<RemoteHealthCheckResult> {
  const startedAt = now;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort('timeout'), timeoutFor(check));
  const headers = new Headers({ accept: 'application/json, text/plain;q=0.9, */*;q=0.1' });
  const token = tokenFor(check, env);
  if (token) headers.set('authorization', `Bearer ${token}`);

  try {
    const response = await fetcher(check.url, {
      method: check.method ?? 'GET',
      headers,
      signal: controller.signal
    });
    const body = await response.text();
    const durationMs = Math.max(0, Date.now() - startedAt);
    const expectedStatus = check.expected_status ?? 200;
    const statusOk = response.status === expectedStatus;
    const textOk = check.expected_text ? body.includes(check.expected_text) : true;
    const ok = statusOk && textOk;
    const summary = ok
      ? `${check.component} healthy`
      : `${check.component} failed remote health check`;
    const detail = ok
      ? `HTTP ${response.status} matched expected health response.`
      : `HTTP ${response.status}; expected ${expectedStatus}${check.expected_text ? ' and expected text.' : '.'}`;

    return {
      ok,
      check,
      snapshot: snapshotFor({
        check,
        status: ok ? 'healthy' : 'failed',
        summary,
        detail,
        severity: ok ? 0 : (check.severity ?? 80),
        observedAt: now,
        httpStatus: response.status,
        durationMs
      })
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      check,
      snapshot: snapshotFor({
        check,
        status: 'failed',
        summary: `${check.component} remote health check failed`,
        detail: message || 'Remote health check request failed.',
        severity: check.severity ?? 80,
        observedAt: now
      })
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function collectRemoteHealthChecks(
  env: RemoteHealthEnv,
  fetcher: typeof fetch = fetch
): Promise<RemoteHealthCheckResult[]> {
  const checks = configuredRemoteHealthChecks(env);
  const now = Date.now();
  return Promise.all(checks.map((check) => runRemoteHealthCheck(check, env, fetcher, now)));
}
