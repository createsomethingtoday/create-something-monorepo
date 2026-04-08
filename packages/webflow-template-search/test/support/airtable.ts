import { vi } from 'vitest';

interface MockDataset {
  publishedAssets: Array<{ id: string; fields: Record<string, unknown> }>;
  incrementalAssets?: Array<{ id: string; fields: Record<string, unknown> }>;
  creators?: Array<{ id: string; fields: Record<string, unknown> }>;
  styles?: Array<{ id: string; fields: Record<string, unknown> }>;
  childCategories?: Array<{ id: string; fields: Record<string, unknown> }>;
  tags?: Array<{ id: string; fields: Record<string, unknown> }>;
}

function paginateRecords(records: Array<{ id: string; fields: Record<string, unknown> }>, url: URL) {
  const pageSize = Number(url.searchParams.get('pageSize') ?? '100') || 100;
  const offsetParam = url.searchParams.get('offset');
  const startIndex = offsetParam ? Number(offsetParam.replace('mock-offset-', '')) || 0 : 0;
  const page = records.slice(startIndex, startIndex + pageSize);
  const nextOffset = startIndex + page.length < records.length ? `mock-offset-${startIndex + page.length}` : undefined;

  return {
    records: page,
    offset: nextOffset,
  };
}

function applySnapshotFilter(
  records: Array<{ id: string; fields: Record<string, unknown> }>,
  formula: string,
): Array<{ id: string; fields: Record<string, unknown> }> {
  const match = formula.match(/IS_BEFORE\(\{📅LMT\},\s*DATETIME_PARSE\("([^"]+)"/);
  if (!match) return records;

  const cutoffTime = Date.parse(match[1]);
  if (!Number.isFinite(cutoffTime)) return records;

  return records.filter((record) => {
    const value = record.fields['📅LMT'];
    if (typeof value !== 'string' || value.length === 0) return true;
    const modifiedTime = Date.parse(value);
    if (!Number.isFinite(modifiedTime)) return true;
    return modifiedTime <= cutoffTime;
  });
}

function applyRecordIdsFilter(
  records: Array<{ id: string; fields: Record<string, unknown> }>,
  formula: string,
): Array<{ id: string; fields: Record<string, unknown> }> {
  const recordIds = Array.from(formula.matchAll(/RECORD_ID\(\)="([^"]+)"/g)).map((match) => match[1]).filter(Boolean);
  if (recordIds.length === 0) return records;

  const allowedIds = new Set(recordIds);
  return records.filter((record) => allowedIds.has(record.id));
}

export function installAirtableFetchMock(dataset: MockDataset) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = new URL(typeof input === 'string' ? input : input.url);
    const tableId = decodeURIComponent(url.pathname.split('/').pop() ?? '');
    const formula = url.searchParams.get('filterByFormula') ?? '';

    if (!url.hostname.includes('airtable.com')) {
      return new Response('Not Found', { status: 404 });
    }

    if (tableId === 'tblRwzpWoLgE9MrUm') {
      const records =
        formula.includes('IS_AFTER(')
          ? dataset.incrementalAssets ?? []
          : applySnapshotFilter(dataset.publishedAssets, formula);
      return Response.json(paginateRecords(applyRecordIdsFilter(records, formula), url));
    }

    if (tableId === 'tbljt0plqxdMARZXb') {
      return Response.json(paginateRecords(applyRecordIdsFilter(dataset.creators ?? [], formula), url));
    }

    if (tableId === 'tblG7E9LbQj0sBX0o') {
      return Response.json({ records: dataset.styles ?? [] });
    }

    if (tableId === 'tblWJXy3M6R8SeoFi') {
      return Response.json({ records: dataset.childCategories ?? [] });
    }

    if (tableId === 'tblb4969G7O75gVWV') {
      return Response.json({ records: dataset.tags ?? [] });
    }

    return Response.json({ records: [] });
  });
}
