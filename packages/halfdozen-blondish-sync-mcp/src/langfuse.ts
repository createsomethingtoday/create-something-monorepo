import { Langfuse } from 'langfuse';
import { resolveRuntimeConfig } from './config.js';
import { summarizeTelemetryPayload, type JsonRecord, type JsonValue } from './telemetry-summary.js';
import type { Env } from './types.js';

type LangfuseToolInvocation = {
  toolName: string;
  result?: unknown;
  durationMs: number;
  error?: unknown;
};

let langfuseClient: Langfuse | null = null;
let langfuseClientKey: string | null = null;

export function langfuseHealth(env: Env): JsonRecord {
  return {
    enabled: isLangfuseEnabled(env),
    public_key_configured: Boolean(env.LANGFUSE_PUBLIC_KEY?.trim()),
    secret_key_configured: Boolean(env.LANGFUSE_SECRET_KEY?.trim()),
    host: resolveLangfuseHost(env),
    project_name: resolveLangfuseProjectName(env),
  };
}

export async function emitLangfuseToolInvocation(env: Env, invocation: LangfuseToolInvocation): Promise<void> {
  const client = getLangfuseClient(env);
  if (!client) return;

  const runtime = resolveRuntimeConfig(env);
  const output = summarizeTelemetryPayload(invocation.result);
  const action = typeof output.action === 'string' ? output.action : null;
  const error = invocation.error ? sanitizeError(invocation.error) : null;
  const success = !error && (typeof output.ok === 'boolean' ? output.ok : true);
  const traceId = crypto.randomUUID();

  try {
    client.trace({
      id: traceId,
      name: `mcp:${runtime.serverName}:${invocation.toolName}`,
      input: {
        tool: invocation.toolName,
      },
      output,
      metadata: {
        server: runtime.serverName,
        client: runtime.clientSlug,
        tenant: runtime.tenantSlug,
        tool: invocation.toolName,
        action,
        duration_ms: invocation.durationMs,
        success,
        ok: typeof output.ok === 'boolean' ? output.ok : null,
        error,
        created: numberOrNull(output.created),
        updated: numberOrNull(output.updated),
        skipped: numberOrNull(output.skipped),
        error_count: numberOrNull(output.error_count),
        missing_hd_rows_count: numberOrNull(output.missing_hd_rows_count),
        contract_field_drifts_count: numberOrNull(output.contract_field_drifts_count),
        body_drifts_count: numberOrNull(output.body_drifts_count),
        reverse_status_drifts_count: numberOrNull(output.reverse_status_drifts_count),
        duplicate_hd_matches_count: numberOrNull(output.duplicate_hd_matches_count),
      },
      sessionId: runtime.clientSlug,
      userId: runtime.tenantSlug,
      tags: [
        'mcp',
        runtime.serverName,
        'halfdozen',
        runtime.clientSlug,
        invocation.toolName,
        ...(action ? [action] : []),
        success ? 'success' : 'error',
      ],
    });
    await client.flushAsync();
  } catch (traceError) {
    console.warn('Langfuse trace emission failed', sanitizeError(traceError));
  }
}

function isLangfuseEnabled(env: Env): boolean {
  if (!env.LANGFUSE_PUBLIC_KEY?.trim() || !env.LANGFUSE_SECRET_KEY?.trim()) return false;
  const configured = env.LANGFUSE_ENABLED?.trim().toLowerCase();
  return !configured || !['0', 'false', 'no', 'off', 'disabled'].includes(configured);
}

function getLangfuseClient(env: Env): Langfuse | null {
  if (!isLangfuseEnabled(env)) return null;

  const publicKey = env.LANGFUSE_PUBLIC_KEY!.trim();
  const secretKey = env.LANGFUSE_SECRET_KEY!.trim();
  const host = resolveLangfuseHost(env);
  const projectName = resolveLangfuseProjectName(env);
  const nextKey = `${publicKey}::${secretKey}::${host}::${projectName}`;

  if (!langfuseClient || langfuseClientKey !== nextKey) {
    langfuseClient = new Langfuse({
      publicKey,
      secretKey,
      baseUrl: host,
      flushAt: 1,
    });
    langfuseClientKey = nextKey;
  }

  return langfuseClient;
}

function resolveLangfuseHost(env: Env): string {
  return env.LANGFUSE_BASE_URL?.trim()
    || env.LANGFUSE_HOST?.trim()
    || 'https://us.cloud.langfuse.com';
}

function resolveLangfuseProjectName(env: Env): string {
  const runtime = resolveRuntimeConfig(env);
  return env.LANGFUSE_PROJECT_NAME?.trim() || `Half Dozen ${runtime.clientDisplayName} Sync MCP`;
}

function sanitizeError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw
    .replace(/\bBearer\s+[A-Za-z0-9._-]{8,}/gi, 'Bearer [redacted]')
    .replace(/\b(?:secret|ntn|sk|pk|pat)_[A-Za-z0-9_-]{8,}/gi, '[redacted_token]')
    .replace(/\b[A-Za-z0-9_-]{24,}\.[A-Za-z0-9_-]{24,}\.[A-Za-z0-9_-]{12,}\b/g, '[redacted_token]')
    .slice(0, 500);
}

function numberOrNull(value: JsonValue | undefined): number | null {
  return typeof value === 'number' ? value : null;
}
