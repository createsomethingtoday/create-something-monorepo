import { vi } from 'vitest';

interface MockDataset {
  publishedAssets: Array<{ id: string; fields: Record<string, unknown> }>;
  incrementalAssets?: Array<{ id: string; fields: Record<string, unknown> }>;
  styles?: Array<{ id: string; fields: Record<string, unknown> }>;
  childCategories?: Array<{ id: string; fields: Record<string, unknown> }>;
  tags?: Array<{ id: string; fields: Record<string, unknown> }>;
}

export function installAirtableFetchMock(dataset: MockDataset) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = new URL(typeof input === 'string' ? input : input.url);
    const tableId = decodeURIComponent(url.pathname.split('/').pop() ?? '');
    const formula = url.searchParams.get('filterByFormula') ?? '';
    const pageSize = Number(url.searchParams.get('pageSize') ?? '100') || 100;
    const start = Number(url.searchParams.get('offset') ?? '0') || 0;

    function paginated(records: Array<{ id: string; fields: Record<string, unknown> }>) {
      const pageRecords = records.slice(start, start + pageSize);
      const nextOffset = start + pageSize < records.length ? String(start + pageSize) : undefined;
      return Response.json({
        records: pageRecords,
        ...(nextOffset ? { offset: nextOffset } : {}),
      });
    }

    if (!url.hostname.includes('airtable.com')) {
      return new Response('Not Found', { status: 404 });
    }

    if (tableId === 'tblRwzpWoLgE9MrUm') {
      return paginated(formula.includes('IS_AFTER(') ? dataset.incrementalAssets ?? [] : dataset.publishedAssets);
    }

    if (tableId === 'tblG7E9LbQj0sBX0o') {
      return paginated(dataset.styles ?? []);
    }

    if (tableId === 'tblWJXy3M6R8SeoFi') {
      return paginated(dataset.childCategories ?? []);
    }

    if (tableId === 'tblb4969G7O75gVWV') {
      return paginated(dataset.tags ?? []);
    }

    return Response.json({ records: [] });
  });
}
