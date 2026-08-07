import { vi } from 'vitest';
import type { Env, WebflowItem } from '../../src/types';

/** Minimal in-memory D1 mock: records every executed statement. */
export function mockD1() {
  const executed: Array<{ sql: string; params: unknown[] }> = [];
  const statement = (sql: string) => {
    const make = (params: unknown[]) => ({
      bind: (...more: unknown[]) => make([...params, ...more]),
      run: async () => {
        executed.push({ sql, params });
        return { meta: { last_row_id: executed.length } };
      },
      first: async () => null,
      all: async () => ({ results: [] }),
    });
    return make([]);
  };
  return {
    executed,
    db: {
      prepare: statement,
      batch: async (statements: Array<{ run: () => Promise<unknown> }>) => {
        for (const s of statements) await s.run();
        return [];
      },
    } as unknown as D1Database,
  };
}

export function makeEnv(overrides: Partial<Env> = {}): Env & { __d1: ReturnType<typeof mockD1> } {
  const d1 = mockD1();
  return {
    DB: d1.db,
    ENVIRONMENT: 'test',
    WRITE_MODE: 'shadow',
    AIRTABLE_BASE_ID: 'appTESTBASE000000',
    AIRTABLE_CMS_RECORDS_TABLE_ID: 'tblTESTTABLE00000',
    WEBFLOW_SITE_ID: 'site000000000000000000000',
    WEBFLOW_TEMPLATES_COLLECTION_ID: '641b464e78789f611a5d4496',
    SWEEP_WINDOW_HOURS: '72',
    AIRTABLE_API_KEY: 'pat-test',
    WEBFLOW_API_TOKEN: 'wf-test',
    CMS_READ_ONLY: 'wf-read-test',
    __d1: d1,
    ...overrides,
  } as Env & { __d1: ReturnType<typeof mockD1> };
}

export function makeItem(overrides: Partial<WebflowItem> & { fieldData?: Record<string, unknown> } = {}): WebflowItem {
  return {
    id: 'item00000000000000000001',
    isArchived: false,
    isDraft: false,
    createdOn: '2026-08-01T12:00:00.000Z',
    lastUpdated: '2026-08-02T12:00:00.000Z',
    lastPublished: '2026-08-02T12:00:05.000Z',
    ...overrides,
    fieldData: {
      name: 'Testflow',
      slug: 'testflow-website-template',
      'unique-id': '64a000000000000000000abc',
      'sync-source': 'Whalesync',
      'sync-record-id': 'recASSET0000000001',
      'creation-date': '2026-07-30T10:00:00.000Z',
      ...(overrides.fieldData ?? {}),
    },
  };
}

export interface FetchMockState {
  /** Airtable rows returned by the find-by-Webflow-Record-ID query. */
  airtableFindResults: Array<{ id: string; fields: Record<string, unknown> }>;
  /** Airtable rows returned by the full list (paginated). */
  airtableListResults: Array<{ id: string; fields: Record<string, unknown> }>;
  /** Webflow items returned by GET items/:id, keyed by id. */
  webflowItems: Record<string, WebflowItem>;
  /** Webflow items returned by list, in order. */
  webflowList: WebflowItem[];
  calls: Array<{ method: string; url: string; body?: unknown }>;
}

export function installFetchMock(state: Partial<FetchMockState> = {}): FetchMockState {
  const full: FetchMockState = {
    airtableFindResults: [],
    airtableListResults: [],
    webflowItems: {},
    webflowList: [],
    calls: [],
    ...state,
  };

  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    full.calls.push({ method, url, body });
    const parsed = new URL(url);

    if (parsed.hostname === 'api.airtable.com') {
      if (method === 'GET' && parsed.searchParams.has('filterByFormula')) {
        return jsonResponse({ records: full.airtableFindResults });
      }
      if (method === 'GET') {
        return jsonResponse({ records: full.airtableListResults });
      }
      if (method === 'POST') {
        return jsonResponse({ records: [{ id: 'recNEW000000000001', fields: body.records[0].fields }] });
      }
      if (method === 'PATCH') {
        return jsonResponse({ records: [{ id: body.records[0].id, fields: body.records[0].fields }] });
      }
    }

    if (parsed.hostname === 'api.webflow.com') {
      const itemMatch = parsed.pathname.match(/\/items\/([^/?]+)$/);
      if (itemMatch) {
        const item = full.webflowItems[itemMatch[1]];
        return item ? jsonResponse(item) : jsonResponse({ message: 'Not found' }, 404);
      }
      if (parsed.pathname.endsWith('/items')) {
        const offset = Number(parsed.searchParams.get('offset') ?? '0');
        const limit = Number(parsed.searchParams.get('limit') ?? '100');
        return jsonResponse({
          items: full.webflowList.slice(offset, offset + limit),
          pagination: { total: full.webflowList.length, offset, limit },
        });
      }
    }

    throw new Error(`Unmocked fetch: ${method} ${url}`);
  });

  return full;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
