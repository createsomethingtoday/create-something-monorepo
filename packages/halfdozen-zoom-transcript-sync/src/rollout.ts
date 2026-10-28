import type { Env, LedgerRow } from './types';

/** No default: the operator must approve and configure the actual release instant. */
export function rolloutCutoff(env: Env): string {
  const value = env.INDEXED_INGESTION_NOT_BEFORE;
  if (!value || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) {
    throw new Error('INDEXED_INGESTION_NOT_BEFORE must be an approved explicit UTC instant');
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value.replace(/Z$/, value.includes('.') ? 'Z' : '.000Z')) {
    throw new Error('INDEXED_INGESTION_NOT_BEFORE is invalid');
  }
  return parsed.toISOString();
}

export function atOrAfter(value: string | null | undefined, cutoff: string): boolean {
  if (!value || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return false;
  const day = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== value.slice(0, 10)) return false;
  if (Number(value.slice(11, 13)) > 23 || Number(value.slice(14, 16)) > 59 || Number(value.slice(17, 19)) > 59) return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && time >= Date.parse(cutoff);
}

export function ledgerAdmitted(ledger: LedgerRow, cutoff: string): boolean {
  return atOrAfter(ledger.recording_start_time, cutoff) && atOrAfter(ledger.first_seen_at, cutoff);
}
