const DEFAULT_HEALTH_URL = 'https://cs-mcp-hub-remote.createsomething.workers.dev/health';
const DEFAULT_ALERT_EMAIL = 'micah@createsomething.io';
const DEFAULT_EMAIL_FROM = 'CREATE SOMETHING Ops <notifications@createsomething.io>';
const RESEND_EMAIL_API_URL = 'https://api.resend.com/emails';
export const PRODUCTION_WATCHDOG_ALERT_COOLDOWN_SECONDS = 6 * 60 * 60;
// A cold Hub health request connects every enabled downstream and currently
// takes about 26 seconds in production. Keep the synthetic above that measured
// cold-start envelope while remaining bounded below the 15-minute cadence.
const HEALTH_PROBE_TIMEOUT_MS = 60_000;

export interface WatchdogFinding {
  rule: 'health_probe_failed' | 'mcp_failures' | 'telemetry_query_failed';
  message: string;
}

export interface WatchdogInput {
  healthOk: boolean;
  healthStatus: number;
  invocationCount: number;
  failureCount: number;
  topErrors: Array<{ message: string; count: number }>;
}

export interface WatchdogAlertEmailInput {
  checkedAt: string;
  correlationId: string;
  findings: WatchdogFinding[];
}

export interface ProductionWatchdogEnv {
  TELEMETRY_DB?: D1Database;
  HUB_STATE_KV?: KVNamespace;
  RESEND_API_KEY?: string;
  WATCHDOG_ALERT_EMAIL?: string;
  WATCHDOG_EMAIL_FROM?: string;
  WATCHDOG_HEALTH_URL?: string;
}

export interface ProductionWatchdogResult extends WatchdogInput {
  checkedAt: string;
  correlationId: string;
  findings: WatchdogFinding[];
  alertDelivered: boolean;
  durationMs: number;
}

export function evaluateProductionWatchdog(input: WatchdogInput): WatchdogFinding[] {
  const findings: WatchdogFinding[] = [];

  if (!input.healthOk) {
    findings.push({
      rule: 'health_probe_failed',
      message: `CREATE SOMETHING Hub health probe returned HTTP ${input.healthStatus}.`
    });
  }

  if (input.failureCount > 0) {
    const rate =
      input.invocationCount > 0 ? (input.failureCount / input.invocationCount) * 100 : 100;
    const topError = input.topErrors[0];
    const suffix = topError ? ` Top error: ${topError.message} (${topError.count}).` : '';
    findings.push({
      rule: 'mcp_failures',
      message:
        `${input.failureCount} of ${input.invocationCount} MCP invocations failed in the last 15 minutes ` +
        `(${rate.toFixed(1)}%).${suffix}`
    });
  }

  return findings;
}

export function buildWatchdogAlertEmail(input: WatchdogAlertEmailInput): {
  subject: string;
  text: string;
} {
  const count = input.findings.length;
  const subject = `[CREATE SOMETHING] Production watchdog detected ${count} ${count === 1 ? 'issue' : 'issues'}`;
  const text = [
    subject,
    '',
    ...input.findings.map((finding) => `- ${finding.rule}: ${finding.message}`),
    '',
    `Checked: ${input.checkedAt}`,
    `Correlation: ${input.correlationId}`,
    'Telemetry: Langfuse project CREATE SOMETHING and Cloudflare cs-telemetry.'
  ].join('\n');

  return { subject, text };
}

async function probeHealth(
  env: ProductionWatchdogEnv,
  fetcher: typeof fetch
): Promise<{ ok: boolean; status: number }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HEALTH_PROBE_TIMEOUT_MS);
  try {
    const response = await fetcher(env.WATCHDOG_HEALTH_URL ?? DEFAULT_HEALTH_URL, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'create-something-production-watchdog/1.0'
      },
      signal: controller.signal
    });
    let failedServers = 0;
    if (response.ok) {
      try {
        const body = (await response.clone().json()) as { failed_servers?: unknown };
        failedServers = Array.isArray(body.failed_servers) ? body.failed_servers.length : 0;
      } catch {
        failedServers = 0;
      }
    }
    return { ok: response.ok && failedServers === 0, status: response.status };
  } catch {
    return { ok: false, status: 0 };
  } finally {
    clearTimeout(timeout);
  }
}

async function queryRecentInvocations(env: ProductionWatchdogEnv): Promise<{
  invocationCount: number;
  failureCount: number;
  topErrors: Array<{ message: string; count: number }>;
}> {
  if (!env.TELEMETRY_DB) {
    throw new Error('TELEMETRY_DB is not configured.');
  }

  const [summary, errors] = await Promise.all([
    env.TELEMETRY_DB.prepare(
      `SELECT COUNT(*) AS invocation_count,
              SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) AS failure_count
         FROM mcp_tool_invocations
        WHERE created_at >= datetime('now', '-15 minutes')
          AND tool_name != 'production_watchdog'`
    ).first<{ invocation_count: number | string | null; failure_count: number | string | null }>(),
    env.TELEMETRY_DB.prepare(
      `SELECT COALESCE(error_message, 'Unknown MCP failure') AS message, COUNT(*) AS error_count
         FROM mcp_tool_invocations
        WHERE created_at >= datetime('now', '-15 minutes')
          AND success = 0
          AND tool_name != 'production_watchdog'
        GROUP BY COALESCE(error_message, 'Unknown MCP failure')
        ORDER BY error_count DESC
        LIMIT 3`
    ).all<{ message: string; error_count: number | string }>()
  ]);

  return {
    invocationCount: Number(summary?.invocation_count ?? 0),
    failureCount: Number(summary?.failure_count ?? 0),
    topErrors: (errors.results ?? []).map((row) => ({
      message: String(row.message).slice(0, 240),
      count: Number(row.error_count ?? 0)
    }))
  };
}

async function deliverAlert(
  env: ProductionWatchdogEnv,
  input: WatchdogAlertEmailInput,
  fetcher: typeof fetch
): Promise<boolean> {
  if (!env.RESEND_API_KEY) {
    console.warn(`[production-watchdog] alert delivery disabled: RESEND_API_KEY is missing.`);
    return false;
  }

  const cooldownKey = `production-watchdog:alert:${input.findings
    .map((item) => item.rule)
    .sort()
    .join('+')}`;
  if (await env.HUB_STATE_KV?.get(cooldownKey)) return false;

  const email = buildWatchdogAlertEmail(input);
  const response = await fetcher(RESEND_EMAIL_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `production-watchdog:${input.correlationId}`
    },
    body: JSON.stringify({
      from: env.WATCHDOG_EMAIL_FROM ?? DEFAULT_EMAIL_FROM,
      to: [env.WATCHDOG_ALERT_EMAIL ?? DEFAULT_ALERT_EMAIL],
      subject: email.subject,
      text: email.text,
      tags: [{ name: 'surface', value: 'cs-mcp-hub' }]
    })
  });

  if (!response.ok) {
    throw new Error(`Resend alert failed with HTTP ${response.status}.`);
  }

  await env.HUB_STATE_KV?.put(cooldownKey, input.checkedAt, {
    expirationTtl: PRODUCTION_WATCHDOG_ALERT_COOLDOWN_SECONDS
  });
  return true;
}

export async function runProductionWatchdog(
  env: ProductionWatchdogEnv,
  options: { fetcher?: typeof fetch; now?: Date; correlationId?: string } = {}
): Promise<ProductionWatchdogResult> {
  const startedAt = Date.now();
  const fetcher = options.fetcher ?? fetch;
  const checkedAt = (options.now ?? new Date()).toISOString();
  const correlationId = options.correlationId ?? `watchdog-${crypto.randomUUID()}`;
  const health = await probeHealth(env, fetcher);

  let recent = {
    invocationCount: 0,
    failureCount: 0,
    topErrors: [] as Array<{ message: string; count: number }>
  };
  let findings: WatchdogFinding[] = [];
  try {
    recent = await queryRecentInvocations(env);
  } catch (error) {
    findings.push({
      rule: 'telemetry_query_failed',
      message: `Cloudflare telemetry query failed: ${error instanceof Error ? error.message : String(error)}`
    });
  }

  const input: WatchdogInput = {
    healthOk: health.ok,
    healthStatus: health.status,
    ...recent
  };
  findings = [...findings, ...evaluateProductionWatchdog(input)];

  let alertDelivered = false;
  if (findings.length > 0) {
    try {
      alertDelivered = await deliverAlert(env, { checkedAt, correlationId, findings }, fetcher);
    } catch (error) {
      console.error(
        `[production-watchdog] alert delivery failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return {
    ...input,
    checkedAt,
    correlationId,
    findings,
    alertDelivered,
    durationMs: Date.now() - startedAt
  };
}
