import worker from '../../src/index.js';
import type { Env } from '../../src/types.js';
import { closeTestD1, createTestD1 } from './d1.js';

export function createTestEnv(overrides: Partial<Env> = {}) {
  const db = createTestD1();
  const env: Env = {
    DB: db,
    AIRTABLE_API_KEY: 'test-airtable-token',
    AIRTABLE_BASE_ID: 'appMoIgXMTTTNIc3p',
    AIRTABLE_ASSETS_TABLE_ID: 'tblRwzpWoLgE9MrUm',
    AIRTABLE_STYLES_TABLE_ID: 'tblG7E9LbQj0sBX0o',
    AIRTABLE_CHILD_CATEGORIES_TABLE_ID: 'tblWJXy3M6R8SeoFi',
    AIRTABLE_TAGS_TABLE_ID: 'tblb4969G7O75gVWV',
    SYNC_ADMIN_TOKEN: 'sync-token',
    DEFAULT_PAGE_SIZE: '24',
    DEFAULT_CLIENT_MODE: 'shadow',
    FULL_SYNC_PAGE_LIMIT: '2',
    FULL_SYNC_PAGE_SIZE: '100',
    LOOKUP_CACHE_TTL_SECONDS: '21600',
    ...overrides,
  };

  return {
    env,
    close: () => closeTestD1(db),
  };
}

export async function callWorker(request: Request, env: Env): Promise<Response> {
  return worker.fetch(request, env);
}
