import type { SourcePage } from './broker.ts';

export interface CanonicalImportInput {
  workspaceId: string;
  entity: 'interactions' | 'schedule';
  title: string;
  fields: Record<string, string | boolean>;
  source: {
    kind: 'import'; provider: SourcePage['provider']; connectedAccountId: string;
    collectionId: string; externalId: string; observedAt: string; preview: Record<string, string>;
  };
}

/** Pure projection for Rust `records.save`; callers persist each returned input and count receipts. */
export function mapSourcePage(workspaceId: string, page: SourcePage): CanonicalImportInput[] {
  if (!safeId(workspaceId) || !page || !['gmail', 'googlecalendar'].includes(page.provider) ||
      !safeId(page.connectedAccountId) || !Array.isArray(page.records) || page.records.length > 25) {
    throw new Error('invalid_source_page');
  }
  return page.records.map((record) => {
    if (!safeId(record.externalId) || !record.data || typeof record.data !== 'object' ||
        !Number.isFinite(Date.parse(record.observedAt))) throw new Error('invalid_source_page');
    const observedAt = new Date(record.observedAt).toISOString();
    if (page.provider === 'gmail') {
      if (record.kind !== 'message') throw new Error('invalid_source_page');
      const collectionId = bounded(record.data.threadId, 128) || 'mailbox';
      const subject = bounded(record.data.subject, 500);
      const source = {
        kind: 'import' as const, provider: page.provider, connectedAccountId: page.connectedAccountId,
        collectionId, externalId: record.externalId, observedAt,
        preview: { from: bounded(record.data.from, 320), snippet: bounded(record.data.snippet, 500) },
      };
      trimPreview(source);
      const parsedDate = typeof record.data.date === 'string' ? Date.parse(record.data.date) : NaN;
      const fields: Record<string, string | boolean> = { Source: 'Gmail', 'Thread ID': collectionId };
      if (Number.isFinite(parsedDate)) fields.Date = new Date(parsedDate).toISOString();
      return {
        workspaceId, entity: 'interactions' as const, title: subject || 'Untitled message',
        fields, source,
      };
    }
    if (record.kind !== 'event') throw new Error('invalid_source_page');
    const collectionId = bounded(record.data.calendarId, 320);
    if (!collectionId) throw new Error('invalid_source_page');
    const start = dateValue(record.data.start);
    const end = dateValue(record.data.end);
    if (!start || !end || start.allDay !== end.allDay) throw new Error('invalid_source_page');
    const source = {
      kind: 'import' as const, provider: page.provider, connectedAccountId: page.connectedAccountId,
      collectionId, externalId: record.externalId, observedAt,
      preview: { location: bounded(record.data.location, 500), description: bounded(record.data.description, 1_000) },
    };
    trimPreview(source);
    const fields: Record<string, string | boolean> = { Date: `${start.value}/${end.value}`, 'All Day': start.allDay, 'External Calendar ID': collectionId };
    return {
      workspaceId, entity: 'schedule' as const, title: bounded(record.data.summary, 500) || 'Untitled event',
      fields, source,
    };
  });
}

function trimPreview(source: CanonicalImportInput['source']): void {
  for (const key of ['description', 'snippet', 'location', 'from']) {
    while (Buffer.byteLength(JSON.stringify(source), 'utf8') > 1_950 && source.preview[key]) {
      source.preview[key] = Array.from(source.preview[key]).slice(0, -1).join('');
    }
  }
  if (Buffer.byteLength(JSON.stringify(source), 'utf8') > 2_000) throw new Error('invalid_source_page');
}

function safeId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 320 && !/[\r\n\u0000]/u.test(value);
}
function bounded(value: unknown, max: number): string {
  return typeof value === 'string' ? value.slice(0, max).trim() : '';
}
function dateValue(value: unknown): { value: string; allDay: boolean } | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  if (typeof item.date === 'string' && /^\d{4}-\d{2}-\d{2}$/u.test(item.date)) return { value: item.date, allDay: true };
  if (typeof item.dateTime === 'string' && Number.isFinite(Date.parse(item.dateTime))) return { value: new Date(item.dateTime).toISOString(), allDay: false };
  return null;
}
