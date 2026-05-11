import { vi } from 'vitest';

interface MockDataset {
  publishedAssets: Array<{ id: string; fields: Record<string, unknown> }>;
  incrementalAssets?: Array<{ id: string; fields: Record<string, unknown> }>;
  styles?: Array<{ id: string; fields: Record<string, unknown> }>;
  childCategories?: Array<{ id: string; fields: Record<string, unknown> }>;
  tags?: Array<{ id: string; fields: Record<string, unknown> }>;
  webflowItems?: Array<{ id: string; fieldData: Record<string, unknown> }>;
}

export function installAirtableFetchMock(dataset: MockDataset) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = new URL(typeof input === 'string' ? input : input.url);
    const tableId = decodeURIComponent(url.pathname.split('/').pop() ?? '');
    const formula = url.searchParams.get('filterByFormula') ?? '';

    if (url.hostname === 'api.webflow.com') {
      const limit = Number(url.searchParams.get('limit') ?? 100) || 100;
      const offset = Number(url.searchParams.get('offset') ?? 0) || 0;
      const allItems = dataset.webflowItems ?? [];
      return Response.json({
        items: allItems.slice(offset, offset + limit),
        pagination: {
          limit,
          offset,
          total: allItems.length,
        },
      });
    }

    if (!url.hostname.includes('airtable.com')) {
      return new Response('Not Found', { status: 404 });
    }

    if (tableId === 'tblRwzpWoLgE9MrUm') {
      return Response.json({
        records: formula.includes('IS_AFTER(') ? dataset.incrementalAssets ?? [] : dataset.publishedAssets,
      });
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
