import type {
  HealthSnapshotInput,
  RemoteHealthCheckConfig,
  RemoteHealthCheckResult,
  RemoteHealthJsonRule
} from './types.js';

interface RemoteHealthEnv {
  HEALTH_CHECKS_JSON?: string;
  HEALTH_SELF_ORIGIN?: string;
  HEALTH_SELF_CHECK_ENABLED?: string;
}

const DEFAULT_TIMEOUT_MS = 5000;
const MAX_TIMEOUT_MS = 30000;

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

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

function pathValue(input: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((value, segment) => {
    if (segment === 'length') {
      if (Array.isArray(value) || typeof value === 'string') return value.length;
      return undefined;
    }
    if (value && typeof value === 'object') {
      return (value as Record<string, unknown>)[segment];
    }
    return undefined;
  }, input);
}

function numericValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function valueLabel(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) return String(value);
  if (value === undefined) return 'missing';
  if (Array.isArray(value)) return `array(${value.length})`;
  return 'object';
}

function ruleFailure(rule: RemoteHealthJsonRule, document: unknown): string | null {
  const value = pathValue(document, rule.path);
  if ('equals' in rule && value !== rule.equals) {
    return `${rule.path} expected ${valueLabel(rule.equals)} got ${valueLabel(value)}`;
  }
  if (rule.truthy && !value) {
    return `${rule.path} expected truthy got ${valueLabel(value)}`;
  }
  if (typeof rule.includes === 'string') {
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    if (!text?.includes(rule.includes)) {
      return `${rule.path} expected to include ${rule.includes}`;
    }
  }

  const numeric = numericValue(value);
  if (typeof rule.min === 'number' && (numeric === null || numeric < rule.min)) {
    return `${rule.path} expected >= ${rule.min} got ${valueLabel(value)}`;
  }
  if (typeof rule.max === 'number' && (numeric === null || numeric > rule.max)) {
    return `${rule.path} expected <= ${rule.max} got ${valueLabel(value)}`;
  }

  return null;
}

function jsonRuleFailures(check: RemoteHealthCheckConfig, body: string): string[] {
  if (!check.json_rules?.length) return [];
  const document = parseJson(body);
  if (document === undefined) return ['response body is not valid JSON'];
  return check.json_rules
    .map((rule) => ruleFailure(rule, document))
    .filter((failure): failure is string => Boolean(failure));
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
      json_rules: check.json_rules ?? [],
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
    const failures = jsonRuleFailures(check, body);
    const ok = statusOk && textOk && failures.length === 0;
    const summary = ok
      ? `${check.component} healthy`
      : `${check.component} failed remote health check`;
    const detail = ok
      ? `HTTP ${response.status} matched expected health response.`
      : [
          `HTTP ${response.status}; expected ${expectedStatus}${check.expected_text ? ' and expected text' : ''}.`,
          ...failures
        ].join(' ');

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
