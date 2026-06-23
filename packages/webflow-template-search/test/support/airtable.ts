import { vi } from 'vitest';

interface MockDataset {
  publishedAssets: Array<{ id: string; fields: Record<string, unknown> }>;
  incrementalAssets?: Array<{ id: string; fields: Record<string, unknown> }>;
  webflowAssets?: Array<Record<string, unknown>>;
  webflowCollections?: Array<Record<string, unknown>>;
  webflowCollectionItems?: Record<string, Array<Record<string, unknown>>>;
  webflowCollectionItemErrors?: Record<string, { status: number; body: unknown; headers?: Record<string, string> }>;
  webflowCollectionItemErrorSequences?: Record<string, Array<{ status: number; body: unknown; headers?: Record<string, string> }>>;
  publishedTemplatePages?: Record<string, string>;
  styles?: Array<{ id: string; fields: Record<string, unknown> }>;
  childCategories?: Array<{ id: string; fields: Record<string, unknown> }>;
  tags?: Array<{ id: string; fields: Record<string, unknown> }>;
  creators?: Array<{ id: string; fields: Record<string, unknown> }>;
}

function dateMatchesModifiedWindow(record: { fields: Record<string, unknown> }, formula: string): boolean {
  const dates = Array.from(formula.matchAll(/DATETIME_PARSE\("([^"]+)"\)/g)).map((match) => match[1]).filter(Boolean);
  const modifiedAt = record.fields['📅LMT'];
  if (dates.length === 0 || typeof modifiedAt !== 'string') return true;
  const modifiedTime = Date.parse(modifiedAt);
  const afterTime = Date.parse(dates[0] ?? '');
  const untilTime = dates[1] ? Date.parse(dates[1]) : null;
  return modifiedTime > afterTime && (untilTime === null || modifiedTime <= untilTime);
}

export function installAirtableFetchMock(dataset: MockDataset) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = new URL(typeof input === 'string' ? input : input.url);
    const tableId = decodeURIComponent(url.pathname.split('/').pop() ?? '');
    const formula = url.searchParams.get('filterByFormula') ?? '';

    if (url.hostname === 'api.webflow.com') {
      if (/\/v2\/sites\/[^/]+\/collections$/.test(url.pathname)) {
        return Response.json({ collections: dataset.webflowCollections ?? [] });
      }

      const collectionItemsMatch = url.pathname.match(/\/v2\/collections\/([^/]+)\/items$/);
      if (collectionItemsMatch) {
        const collectionId = collectionItemsMatch[1] ?? '';
        const sequencedError = dataset.webflowCollectionItemErrorSequences?.[collectionId]?.shift();
        if (sequencedError) {
          return Response.json(sequencedError.body, { status: sequencedError.status, headers: sequencedError.headers });
        }

        const error = dataset.webflowCollectionItemErrors?.[collectionId];
        if (error) {
          return Response.json(error.body, { status: error.status, headers: error.headers });
        }

        const offset = Number(url.searchParams.get('offset') ?? '0') || 0;
        const limit = Number(url.searchParams.get('limit') ?? '100') || 100;
        const requestedName = url.searchParams.get('name');
        const requestedSlug = url.searchParams.get('slug');
        const items = (dataset.webflowCollectionItems?.[collectionId] ?? []).filter((item) => {
          const fieldData = (item.fieldData ?? {}) as Record<string, unknown>;
          if (requestedName && fieldData.name !== requestedName) return false;
          if (requestedSlug && fieldData.slug !== requestedSlug) return false;
          return true;
        });
        return Response.json({
          items: items.slice(offset, offset + limit),
          pagination: {
            limit,
            offset,
            total: items.length,
          },
        });
      }

      const offset = Number(url.searchParams.get('offset') ?? '0') || 0;
      const limit = Number(url.searchParams.get('limit') ?? '100') || 100;
      const assets = dataset.webflowAssets ?? [];
      return Response.json({
        assets: assets.slice(offset, offset + limit),
        pagination: {
          limit,
          offset,
          total: assets.length,
        },
      });
    }

    if (url.hostname === 'webflow.com' || url.hostname === 'www.webflow.com') {
      const html = dataset.publishedTemplatePages?.[url.pathname];
      return html ? new Response(html, { headers: { 'content-type': 'text/html' } }) : new Response('Not Found', { status: 404 });
    }

    if (!url.hostname.includes('airtable.com')) {
      return new Response('Not Found', { status: 404 });
    }

    if (tableId === 'tblRwzpWoLgE9MrUm') {
      const maxRecords = Number(url.searchParams.get('maxRecords') ?? '0') || null;

      if (formula.includes('RECORD_ID()')) {
        return Response.json({
          records: dataset.publishedAssets.filter((record) => formula.includes(`"${record.id}"`)),
        });
      }

      if (formula.includes('IS_AFTER(')) {
        const records = dataset.incrementalAssets ?? [];
        const matchingRecords = records.some((record) => typeof record.fields['📅LMT'] === 'string')
          ? records.filter((record) => dateMatchesModifiedWindow(record, formula))
          : records;
        return Response.json({
          records: maxRecords ? matchingRecords.slice(0, maxRecords) : matchingRecords,
        });
      }

      return Response.json({ records: dataset.publishedAssets });
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

    if (tableId === 'tbljt0plqxdMARZXb') {
      return Response.json({ records: dataset.creators ?? [] });
    }

    return Response.json({ records: [] });
  });
}
