import type { AirtableRecord, CmsRecordFields, WebflowItem } from './types';

/** Mirrors Whalesync's "Webflow Status" values observed in the table: Active | Draft | Archived. */
export function deriveStatus(item: Pick<WebflowItem, 'isArchived' | 'isDraft'>): string {
  if (item.isArchived) return 'Archived';
  if (item.isDraft) return 'Draft';
  return 'Active';
}

function text(value: unknown): string {
  if (value == null) return '';
  return String(value);
}

/**
 * Maps a Webflow Templates item to the Airtable 🕸️🚰WF CMS Records row shape.
 * Field-for-field parity with the Whalesync "WF Templates → Marketplace Assets (Sync Log)" mapping.
 */
export function mapItemToRow(item: WebflowItem): CmsRecordFields {
  const fd = item.fieldData ?? {};
  return {
    Name: text(fd['name']),
    Status: deriveStatus(item),
    Slug: text(fd['slug']),
    'MRP ID': text(fd['unique-id']),
    'Sync Source': text(fd['sync-source']),
    'Sync Record ID': text(fd['sync-record-id']),
    'Webflow Record ID': item.id,
    'WF Created': item.createdOn,
    'WF Last Updated': item.lastUpdated,
    'Approval Date': fd['creation-date'] ? text(fd['creation-date']) : null,
  };
}

/** Normalize for comparison: trim, treat null/undefined as empty string. */
function norm(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

/** Normalize dateTimes to epoch ms strings so "Z" vs "+00:00" or ms-precision differences don't count as drift. */
function normDate(value: unknown): string {
  const raw = norm(value);
  if (!raw) return '';
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? String(parsed) : raw;
}

const DATE_FIELDS = new Set(['WF Created', 'WF Last Updated', 'Approval Date']);

/**
 * Fields the reconciler compares (and, in live mode, heals) on the sync-log table.
 * WF Last Updated is compared but drift on it alone is expected churn — callers may filter it.
 */
export const COMPARED_FIELDS: Array<keyof CmsRecordFields> = [
  'Name',
  'Status',
  'Slug',
  'MRP ID',
  'Sync Source',
  'Sync Record ID',
  'WF Created',
  'WF Last Updated',
  'Approval Date',
];

export interface FieldDiff {
  field: keyof CmsRecordFields;
  webflowValue: string;
  airtableValue: string;
}

export function diffRow(expected: CmsRecordFields, record: AirtableRecord): FieldDiff[] {
  const diffs: FieldDiff[] = [];
  for (const field of COMPARED_FIELDS) {
    const wf = expected[field];
    const at = record.fields[field];
    const equal = DATE_FIELDS.has(field) ? normDate(wf) === normDate(at) : norm(wf) === norm(at);
    if (!equal) diffs.push({ field, webflowValue: norm(wf), airtableValue: norm(at) });
  }
  return diffs;
}

/** Build the minimal PATCH payload from a diff. */
export function fieldsFromDiffs(expected: CmsRecordFields, diffs: FieldDiff[]): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const diff of diffs) fields[diff.field] = expected[diff.field];
  return fields;
}

export const UNIQUE_ID_PATTERN = /^[0-9a-f]{24}$/;

export function isMalformedUniqueId(uniqueId: string): boolean {
  const trimmed = uniqueId.trim();
  if (!trimmed) return false; // absent is a different problem class (MRP ID missing flag)
  return !UNIQUE_ID_PATTERN.test(trimmed);
}
