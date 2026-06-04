import { initLogger, type Logger, type Span } from 'braintrust';
import type { Env, SyncError, SyncResult } from './types.js';

const SERVER_NAME = 'halfdozen-blondish-sync-mcp';
const DEFAULT_BRAINTRUST_PROJECT_NAME = 'Half Dozen BLONDISH Sync MCP';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type JsonRecord = { [key: string]: JsonValue };

type BraintrustToolInvocation = {
  toolName: string;
  result?: unknown;
  durationMs: number;
  error?: unknown;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let braintrustLogger: Logger<any> | null = null;
let braintrustLoggerKey: string | null = null;

export function braintrustHealth(env: Env): JsonRecord {
  return {
    enabled: isBraintrustEnabled(env),
    api_key_configured: Boolean(env.BRAINTRUST_API_KEY?.trim()),
    project_id_configured: Boolean(env.BRAINTRUST_PROJECT_ID?.trim()),
    project_name: resolveBraintrustProjectName(env),
  };
}

export async function emitBraintrustToolInvocation(env: Env, invocation: BraintrustToolInvocation): Promise<void> {
  const logger = getBraintrustLogger(env);
  if (!logger) return;

  const output = summarizeBraintrustPayload(invocation.result);
  const action = typeof output.action === 'string' ? output.action : null;
  const error = invocation.error ? sanitizeError(invocation.error) : null;
  const success = !error && (typeof output.ok === 'boolean' ? output.ok : true);

  try {
    await logger.traced(
      (span: Span) => {
        span.log({
          input: {
            tool: invocation.toolName,
          },
          output,
          error,
          tags: [
            'mcp',
            SERVER_NAME,
            'halfdozen',
            'blondish',
            invocation.toolName,
            ...(action ? [action] : []),
          ],
          metadata: {
            server: SERVER_NAME,
            client: 'blondish',
            tenant: 'blondish',
            tool: invocation.toolName,
            action,
            duration_ms: invocation.durationMs,
            success,
            ok: typeof output.ok === 'boolean' ? output.ok : null,
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
        });
      },
      {
        name: `mcp:${SERVER_NAME}:${invocation.toolName}`,
        type: 'tool',
      },
    );
  } catch (traceError) {
    console.warn('Braintrust trace emission failed', sanitizeError(traceError));
  }
}

export function summarizeBraintrustPayload(payload: unknown): JsonRecord {
  if (!isRecord(payload)) {
    return {
      result_type: payload === null ? 'null' : typeof payload,
    };
  }

  if (isSyncResult(payload)) {
    return summarizeSyncResult(payload);
  }

  return {
    result_type: 'object',
    keys: Object.keys(payload).sort().slice(0, 25),
  };
}

export function summarizeSyncResult(result: SyncResult): JsonRecord {
  const details = isRecord(result.details) ? result.details : {};
  const summary: JsonRecord = {
    result_type: 'sync_result',
    ok: result.ok,
    action: result.action,
    created: result.created,
    updated: result.updated,
    skipped: result.skipped,
    error_count: result.errors.length,
    error_scopes: uniqueErrorScopes(result.errors),
  };

  copyNumericDetails(summary, details, [
    'source_rows_checked',
    'target_rows_checked',
    'matched_rows',
    'repairable_missing_hd_rows',
    'repairable_external_url_drifts',
    'repairable_external_files_drifts',
    'external_reference_updates',
    'title_repairs',
    'property_repairs',
    'body_repairs',
  ]);

  copyStringDetails(summary, details, [
    'repair_scope',
    'source_status_property',
  ]);

  copyArrayCount(summary, details, 'missing_hd_rows', 'missing_hd_rows_count');
  copyArrayCount(summary, details, 'duplicate_hd_matches', 'duplicate_hd_matches_count');
  copyArrayCount(summary, details, 'contract_field_drifts', 'contract_field_drifts_count');
  copyArrayCount(summary, details, 'body_drifts', 'body_drifts_count');
  copyArrayCount(summary, details, 'reverse_status_drifts', 'reverse_status_drifts_count');
  copyArrayCount(summary, details, 'other_contract_drifts', 'other_contract_drifts_count');
  copyArrayCount(summary, details, 'selected_source_page_ids', 'selected_source_page_ids_count');
  copyArrayCount(summary, details, 'selected_ext_page_ids', 'selected_ext_page_ids_count');

  const recommendedTools = details.recommended_write_tools;
  if (Array.isArray(recommendedTools)) {
    summary.recommended_write_tools = recommendedTools
      .filter((tool): tool is string => typeof tool === 'string')
      .sort();
  }

  const contractFieldDrifts = arrayValue(details.contract_field_drifts);
  if (contractFieldDrifts.length > 0) {
    summary.contract_field_drift_fields = countContractFieldDriftFields(contractFieldDrifts);
  }

  if (details.future_scale_note) {
    summary.future_scale_note_present = true;
  }

  if (isSyncResult(details.forward)) {
    summary.forward = summarizeSyncResult(details.forward);
  }
  if (isSyncResult(details.reverse)) {
    summary.reverse = summarizeSyncResult(details.reverse);
  }

  return summary;
}

function isBraintrustEnabled(env: Env): boolean {
  if (!env.BRAINTRUST_API_KEY?.trim()) return false;
  const configured = env.BRAINTRUST_ENABLED?.trim().toLowerCase();
  return !configured || !['0', 'false', 'no', 'off', 'disabled'].includes(configured);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getBraintrustLogger(env: Env): Logger<any> | null {
  if (!isBraintrustEnabled(env)) return null;

  const apiKey = env.BRAINTRUST_API_KEY!.trim();
  const projectName = resolveBraintrustProjectName(env);
  const projectId = env.BRAINTRUST_PROJECT_ID?.trim() || null;
  const nextKey = `${apiKey}::${projectId ?? ''}::${projectName}`;

  if (!braintrustLogger || braintrustLoggerKey !== nextKey) {
    const loggerConfig: Parameters<typeof initLogger>[0] = {
      apiKey,
      projectName,
      asyncFlush: true,
      setCurrent: true,
    };
    if (projectId) {
      (loggerConfig as Record<string, unknown>).projectId = projectId;
    }

    braintrustLogger = initLogger(loggerConfig);
    braintrustLoggerKey = nextKey;
  }

  return braintrustLogger;
}

function resolveBraintrustProjectName(env: Pick<Env, 'BRAINTRUST_PROJECT_NAME'>): string {
  return env.BRAINTRUST_PROJECT_NAME?.trim() || DEFAULT_BRAINTRUST_PROJECT_NAME;
}

function isSyncResult(value: unknown): value is SyncResult {
  if (!isRecord(value)) return false;
  return typeof value.ok === 'boolean'
    && typeof value.action === 'string'
    && typeof value.created === 'number'
    && typeof value.updated === 'number'
    && typeof value.skipped === 'number'
    && Array.isArray(value.errors);
}

function copyNumericDetails(summary: JsonRecord, details: Record<string, unknown>, keys: string[]): void {
  for (const key of keys) {
    const value = details[key];
    if (typeof value === 'number' && Number.isFinite(value)) summary[key] = value;
  }
}

function copyStringDetails(summary: JsonRecord, details: Record<string, unknown>, keys: string[]): void {
  for (const key of keys) {
    const value = details[key];
    if (typeof value === 'string' && value.trim()) summary[key] = value.trim();
  }
}

function copyArrayCount(summary: JsonRecord, details: Record<string, unknown>, key: string, outputKey: string): void {
  const value = details[key];
  if (Array.isArray(value)) summary[outputKey] = value.length;
}

function countContractFieldDriftFields(drifts: unknown[]): JsonRecord {
  const counts = new Map<string, number>();
  for (const drift of drifts) {
    if (!isRecord(drift) || !Array.isArray(drift.fields)) continue;
    for (const field of drift.fields) {
      if (typeof field !== 'string' || !field.trim()) continue;
      counts.set(field, (counts.get(field) ?? 0) + 1);
    }
  }

  return Object.fromEntries([...counts.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function uniqueErrorScopes(errors: SyncError[]): string[] {
  return [...new Set(errors.map((error) => error.scope).filter(Boolean))].sort();
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
