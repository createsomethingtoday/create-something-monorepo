import type { SyncError, SyncResult } from './types.js';

type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonRecord = { [key: string]: JsonValue };

export function summarizeTelemetryPayload(payload: unknown): JsonRecord {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
