import type { SourceProvider } from './broker.ts';
import type { CanonicalImportInput } from './import-adapter.ts';

/** A date window bounds selection, not how much of a mailbox has been scanned. */
export interface SourceSelection { from?: string; to?: string; calendarId?: 'primary' }
export class SourceSelectionError extends Error {}

export function requireSourceSelection(value: unknown, provider: SourceProvider): SourceSelection {
  if (value === undefined) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new SourceSelectionError();
  const selection = value as Record<string, unknown>;
  if (Object.keys(selection).some((key) => !['from', 'to', 'calendarId'].includes(key))) throw new SourceSelectionError();
  const result: SourceSelection = {};
  for (const key of ['from', 'to'] as const) {
    const stamp = selection[key];
    if (stamp === undefined) continue;
    if (typeof stamp !== 'string' || stamp.length > 40 ||
        !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?Z$/u.test(stamp) ||
        !Number.isFinite(Date.parse(stamp)) || new Date(stamp).toISOString().slice(0, 10) !== stamp.slice(0, 10)) {
      throw new SourceSelectionError();
    }
    result[key] = new Date(stamp).toISOString();
  }
  if (result.from && result.to && Date.parse(result.from) >= Date.parse(result.to)) throw new SourceSelectionError();
  if (selection.calendarId !== undefined) {
    if (provider !== 'googlecalendar' || selection.calendarId !== 'primary') throw new SourceSelectionError();
    result.calendarId = 'primary';
  }
  return result;
}

/** No provider query/scope expansion: filter this bounded page and keep its raw continuation. */
export function selectSourceRecords(records: CanonicalImportInput[], selection: SourceSelection) {
  const lower = selection.from ? Date.parse(selection.from) : -Infinity;
  const upper = selection.to ? Date.parse(selection.to) : Infinity;
  const hasWindow = !!(selection.from || selection.to);
  let unknownDateCount = 0;
  const selected = records.filter((record) => {
    if (!hasWindow) return true;
    if (record.source.provider === 'gmail') {
      const stamp = record.fields.Date;
      const instant = typeof stamp === 'string' ? Date.parse(stamp) : NaN;
      if (!Number.isFinite(instant)) { unknownDateCount += 1; return false; }
      return instant >= lower && instant < upper;
    }
    const timing = record.source.calendarTiming;
    // An all-day calendar date has no unique UTC instant. Do not invent a zone.
    const start = timing?.start.dateTime ? Date.parse(timing.start.dateTime) : NaN;
    const end = timing?.end.dateTime ? Date.parse(timing.end.dateTime) : NaN;
    if (!Number.isFinite(start) || !Number.isFinite(end)) { unknownDateCount += 1; return false; }
    return start < upper && end > lower;
  });
  return { records: selected, coverage: {
    scannedCount: records.length, selectedCount: selected.length, excludedCount: records.length - selected.length,
    unknownDateCount, dateFiltering: 'page-local' as const, dateWindow: 'message-date-or-event-overlap' as const,
  } };
}
