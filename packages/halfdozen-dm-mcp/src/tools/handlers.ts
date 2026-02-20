/**
 * Half Dozen DM MCP — Notion tool handlers.
 * Uses Notion API 2025-09-03 and @notionhq/client v5 (data sources).
 */

import { Client } from '@notionhq/client';
import type {
  NotionSearchInput,
  NotionListDatabasesInput,
  NotionQueryDatabaseInput,
  NotionListBlockChildrenInput,
  NotionCreatePageInput,
  NotionUpdatePageInput,
  NotionAppendBlocksInput,
  NotionBulkUpdateInput,
  NotionCreateDatabaseInput,
  NotionUpdateDatabaseInput
} from './types.js';

type ToolResponse = { content: Array<{ type: 'text'; text: string }> };

type DataSourceSummary = {
  id: string;
  title: string;
  url?: string;
};

type ListDatabasesPayload = {
  data_sources: DataSourceSummary[];
  has_more: boolean;
  next_cursor: string | null | undefined;
};

type DataSourceSchemaPayload = {
  data_source_id: string;
  title: unknown;
  schema: Array<{ name: string; type: string; id: string }>;
};

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const DEFAULT_LIST_DATABASES_PAGE_SIZE = 25;
const LIST_DATABASES_CACHE_TTL_MS = 60_000;
const DATA_SOURCE_SCHEMA_CACHE_TTL_MS = 5 * 60_000;
const BULK_MUTATION_CONCURRENCY = 3;

const listDatabasesCache = new Map<string, CacheEntry<ListDatabasesPayload>>();
const dataSourceSchemaCache = new Map<string, CacheEntry<DataSourceSchemaPayload>>();

function getCachedValue<T>(cache: Map<string, CacheEntry<T>>, key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

function setCachedValue<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  value: T,
  ttlMs: number
): void {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs
  });
}

function listDatabasesCacheKey(params: NotionListDatabasesInput, pageSize: number): string | null {
  if (params.start_cursor) return null;
  return `page_size:${pageSize}`;
}

function invalidateListDatabasesCache(): void {
  listDatabasesCache.clear();
}

function invalidateDataSourceSchemaCache(dataSourceId?: string): void {
  if (!dataSourceId) return;
  dataSourceSchemaCache.delete(dataSourceId);
}

function responseFromPayload(payload: unknown): ToolResponse {
  return {
    content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }]
  };
}

async function mapWithConcurrency<TIn, TOut>(
  items: readonly TIn[],
  concurrency: number,
  worker: (item: TIn) => Promise<TOut>
): Promise<TOut[]> {
  if (items.length === 0) return [];

  const out: TOut[] = new Array(items.length);
  let next = 0;

  async function runWorker(): Promise<void> {
    while (true) {
      const idx = next;
      next += 1;
      if (idx >= items.length) return;
      out[idx] = await worker(items[idx]);
    }
  }

  const workerCount = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
  return out;
}

// -----------------------------------------------------------------------------
// Search (API 2025-09-03: filter value 'page' | 'data_source')
// -----------------------------------------------------------------------------
export async function handleNotionSearch(
  client: Client,
  params: NotionSearchInput
): Promise<ToolResponse> {
  const body: Parameters<Client['search']>[0] = {
    page_size: params.page_size ?? 10
  };
  if (params.query) body.query = params.query;
  if (params.filter_type) {
    body.filter = { property: 'object', value: params.filter_type };
  }
  const result = await client.search(body);
  return responseFromPayload({
    results: result.results,
    has_more: result.has_more,
    next_cursor: result.next_cursor
  });
}

// -----------------------------------------------------------------------------
// List data sources (API 2025-09-03: search filter 'data_source')
// -----------------------------------------------------------------------------
export async function handleNotionListDatabases(
  client: Client,
  params: NotionListDatabasesInput
): Promise<ToolResponse> {
  const pageSize = params.page_size ?? DEFAULT_LIST_DATABASES_PAGE_SIZE;
  const cacheKey = listDatabasesCacheKey(params, pageSize);
  if (cacheKey) {
    const cached = getCachedValue(listDatabasesCache, cacheKey);
    if (cached) {
      return responseFromPayload(cached);
    }
  }

  const result = await client.search({
    filter: { property: 'object', value: 'data_source' },
    page_size: pageSize,
    ...(params.start_cursor ? { start_cursor: params.start_cursor } : {})
  });
  const dataSources = result.results
    .filter((r) => (r as { object?: string }).object === 'data_source')
    .map((d) => {
      const ds = d as { id: string; title?: Array<{ plain_text?: string }>; url?: string };
      return {
        id: ds.id,
        title: (ds.title ?? []).map((t: { plain_text?: string }) => t.plain_text ?? '').join(''),
        url: ds.url
      };
    });
  const payload: ListDatabasesPayload = {
    data_sources: dataSources,
    has_more: result.has_more,
    next_cursor: result.next_cursor
  };
  if (cacheKey) {
    setCachedValue(listDatabasesCache, cacheKey, payload, LIST_DATABASES_CACHE_TTL_MS);
  }
  return responseFromPayload(payload);
}

// -----------------------------------------------------------------------------
// Get data source (schema) — API 2025-09-03 dataSources.retrieve
// -----------------------------------------------------------------------------
export async function handleNotionGetDatabase(
  client: Client,
  params: { data_source_id: string }
): Promise<ToolResponse> {
  const cached = getCachedValue(dataSourceSchemaCache, params.data_source_id);
  if (cached) {
    return responseFromPayload(cached);
  }

  const ds = await client.dataSources.retrieve({ data_source_id: params.data_source_id });
  const schema = Object.entries(ds.properties).map(([name, p]) => ({
    name,
    type: (p as { type: string }).type,
    id: (p as { id: string }).id
  }));
  const title = 'title' in ds ? ds.title : undefined;
  const payload: DataSourceSchemaPayload = {
    data_source_id: ds.id,
    title,
    schema
  };
  setCachedValue(
    dataSourceSchemaCache,
    params.data_source_id,
    payload,
    DATA_SOURCE_SCHEMA_CACHE_TTL_MS
  );
  return responseFromPayload(payload);
}

// -----------------------------------------------------------------------------
// Query data source — API 2025-09-03 dataSources.query
// -----------------------------------------------------------------------------
export async function handleNotionQueryDatabase(
  client: Client,
  params: NotionQueryDatabaseInput
): Promise<ToolResponse> {
  const body: Parameters<Client['dataSources']['query']>[0] = {
    data_source_id: params.data_source_id,
    page_size: params.page_size ?? 10
  };
  if (params.filter)
    body.filter = JSON.parse(params.filter) as Parameters<
      Client['dataSources']['query']
    >[0]['filter'];
  if (params.sort_property) {
    body.sorts = [
      {
        property: params.sort_property,
        direction: (params.sort_direction ?? 'descending') as 'ascending' | 'descending'
      }
    ];
  }
  if (params.start_cursor) body.start_cursor = params.start_cursor;
  const result = await client.dataSources.query(body);
  return responseFromPayload({
    results: result.results,
    has_more: result.has_more,
    next_cursor: result.next_cursor
  });
}

// -----------------------------------------------------------------------------
// Get page
// -----------------------------------------------------------------------------
export async function handleNotionGetPage(
  client: Client,
  params: { page_id: string }
): Promise<ToolResponse> {
  const page = await client.pages.retrieve({ page_id: params.page_id });
  return responseFromPayload(page);
}

// -----------------------------------------------------------------------------
// List block children (page body/content blocks)
// -----------------------------------------------------------------------------
export async function handleNotionListBlockChildren(
  client: Client,
  params: NotionListBlockChildrenInput
): Promise<ToolResponse> {
  const result = await client.blocks.children.list({
    block_id: params.block_id,
    page_size: params.page_size ?? 100,
    ...(params.start_cursor ? { start_cursor: params.start_cursor } : {})
  });
  return responseFromPayload({
    results: result.results,
    has_more: result.has_more,
    next_cursor: result.next_cursor
  });
}

// -----------------------------------------------------------------------------
// Create page (API 2025-09-03: parent.data_source_id)
// -----------------------------------------------------------------------------
export async function handleNotionCreatePage(
  client: Client,
  params: NotionCreatePageInput
): Promise<ToolResponse> {
  const body = {
    parent: { data_source_id: params.data_source_id },
    properties: params.properties,
    ...(params.content?.length && { children: params.content })
  } as Parameters<Client['pages']['create']>[0];
  const page = await client.pages.create(body);
  const url = 'url' in page ? page.url : undefined;
  return responseFromPayload({ id: page.id, url });
}

// -----------------------------------------------------------------------------
// Update page
// -----------------------------------------------------------------------------
export async function handleNotionUpdatePage(
  client: Client,
  params: NotionUpdatePageInput
): Promise<ToolResponse> {
  const page = await client.pages.update({
    page_id: params.page_id,
    properties: params.properties as Parameters<Client['pages']['update']>[0]['properties']
  });
  const url = 'url' in page ? page.url : undefined;
  return responseFromPayload({ id: page.id, url });
}

// -----------------------------------------------------------------------------
// Append blocks
// -----------------------------------------------------------------------------
export async function handleNotionAppendBlocks(
  client: Client,
  params: NotionAppendBlocksInput
): Promise<ToolResponse> {
  const result = await client.blocks.children.append({
    block_id: params.page_id,
    children: params.children as Parameters<Client['blocks']['children']['append']>[0]['children']
  });
  return responseFromPayload({ results: result.results });
}

// -----------------------------------------------------------------------------
// Archive page
// -----------------------------------------------------------------------------
export async function handleNotionArchivePage(
  client: Client,
  params: { page_id: string }
): Promise<ToolResponse> {
  const page = await client.pages.update({
    page_id: params.page_id,
    archived: true
  });
  return responseFromPayload({ id: page.id, archived: true });
}

// -----------------------------------------------------------------------------
// Bulk update
// -----------------------------------------------------------------------------
export async function handleNotionBulkUpdate(
  client: Client,
  params: NotionBulkUpdateInput
): Promise<ToolResponse> {
  const results = await mapWithConcurrency(
    params.page_ids,
    BULK_MUTATION_CONCURRENCY,
    async (page_id): Promise<{ id: string; success: boolean; error?: string }> => {
      try {
        await client.pages.update({
          page_id,
          properties: params.properties as unknown as Parameters<
            Client['pages']['update']
          >[0]['properties']
        });
        return { id: page_id, success: true };
      } catch (e) {
        return { id: page_id, success: false, error: e instanceof Error ? e.message : String(e) };
      }
    }
  );
  return responseFromPayload({ results });
}

// -----------------------------------------------------------------------------
// Bulk archive
// -----------------------------------------------------------------------------
export async function handleNotionBulkArchive(
  client: Client,
  params: { page_ids: string[] }
): Promise<ToolResponse> {
  const results = await mapWithConcurrency(
    params.page_ids,
    BULK_MUTATION_CONCURRENCY,
    async (page_id): Promise<{ id: string; success: boolean; error?: string }> => {
      try {
        await client.pages.update({ page_id, archived: true });
        return { id: page_id, success: true };
      } catch (e) {
        return { id: page_id, success: false, error: e instanceof Error ? e.message : String(e) };
      }
    }
  );
  return responseFromPayload({ results });
}

// -----------------------------------------------------------------------------
// Archive block (move to trash; enables reverting appended content)
// -----------------------------------------------------------------------------
export async function handleNotionArchiveBlock(
  client: Client,
  params: { block_id: string }
): Promise<ToolResponse> {
  const block = await client.blocks.delete({ block_id: params.block_id });
  const archived = (block as { archived?: boolean }).archived ?? true;
  return responseFromPayload({ id: block.id, archived });
}

// -----------------------------------------------------------------------------
// Property sanitizer: auto-convert unsupported property types
// Notion API limitation: "status" type cannot be created via API; silently dropped.
// We convert to "select" and warn the agent so it doesn't waste calls retrying.
// -----------------------------------------------------------------------------
function sanitizeProperties(properties: Record<string, unknown>): {
  sanitized: Record<string, unknown>;
  warnings: string[];
} {
  const sanitized: Record<string, unknown> = {};
  const warnings: string[] = [];

  for (const [name, def] of Object.entries(properties)) {
    const propDef = def as Record<string, unknown> | null;
    if (propDef && 'status' in propDef) {
      // Convert status → select, preserving option names if provided
      const statusDef = propDef.status as
        | { options?: Array<{ name: string; color?: string }> }
        | Record<string, unknown>;
      const options =
        'options' in statusDef && Array.isArray(statusDef.options)
          ? statusDef.options.map((o: { name: string; color?: string }) => ({
              name: o.name,
              ...(o.color && { color: o.color })
            }))
          : [{ name: 'Not started' }, { name: 'In progress' }, { name: 'Done' }];
      sanitized[name] = { select: { options } };
      warnings.push(
        `"${name}": converted from "status" to "select" (Notion API does not support creating status properties). Options: ${options.map((o: { name: string }) => o.name).join(', ')}.`
      );
    } else {
      sanitized[name] = def;
    }
  }

  return { sanitized, warnings };
}

// -----------------------------------------------------------------------------
// Create database (as child of a page, with initial data source properties)
// -----------------------------------------------------------------------------
export async function handleNotionCreateDatabase(
  client: Client,
  params: NotionCreateDatabaseInput
): Promise<ToolResponse> {
  // Sanitize properties (auto-convert unsupported types like status → select)
  const { sanitized, warnings } = sanitizeProperties(params.properties);

  const body = {
    parent: { type: 'page_id' as const, page_id: params.parent_page_id },
    title: [{ text: { content: params.title } }],
    is_inline: params.is_inline ?? false,
    initial_data_source: { properties: sanitized }
  } as Parameters<Client['databases']['create']>[0];
  const db = await client.databases.create(body);
  const url = 'url' in db ? db.url : undefined;

  // Extract data_source_id from the response for immediate use
  const dataSources =
    'data_sources' in db
      ? (db as { data_sources?: Array<{ id: string }> }).data_sources
      : undefined;
  const dataSourceId = dataSources?.[0]?.id;
  invalidateListDatabasesCache();
  invalidateDataSourceSchemaCache(dataSourceId);

  // Retrieve the actual data source schema so the agent sees exact property names
  // (Notion may rename properties on creation, e.g. "Name" → "Title")
  let schema: Array<{ name: string; type: string; id: string }> | undefined;
  if (dataSourceId) {
    try {
      const ds = await client.dataSources.retrieve({ data_source_id: dataSourceId });
      schema = Object.entries(ds.properties).map(([name, p]) => ({
        name,
        type: (p as { type: string }).type,
        id: (p as { id: string }).id
      }));
      const payload: DataSourceSchemaPayload = {
        data_source_id: dataSourceId,
        title: 'title' in ds ? ds.title : undefined,
        schema
      };
      setCachedValue(dataSourceSchemaCache, dataSourceId, payload, DATA_SOURCE_SCHEMA_CACHE_TTL_MS);
    } catch {
      // Non-fatal: schema confirmation failed but database was created
    }
  }

  const result: Record<string, unknown> = { id: db.id, url, data_source_id: dataSourceId, schema };
  if (warnings.length > 0) {
    result.warnings = warnings;
  }

  return responseFromPayload(result);
}

// -----------------------------------------------------------------------------
// Update database (title/description) and optionally data source properties
// -----------------------------------------------------------------------------
export async function handleNotionUpdateDatabase(
  client: Client,
  params: NotionUpdateDatabaseInput
): Promise<ToolResponse> {
  const results: {
    database?: { id: string };
    data_source?: { id: string; schema?: Array<{ name: string; type: string; id: string }> };
  } = {};

  // Update database container (title / description) if either is provided
  if (params.title !== undefined || params.description !== undefined) {
    const dbBody: Record<string, unknown> = { database_id: params.database_id };
    if (params.title !== undefined) {
      dbBody.title = [{ text: { content: params.title } }];
    }
    if (params.description !== undefined) {
      dbBody.description = [{ text: { content: params.description } }];
    }
    const db = await client.databases.update(
      dbBody as Parameters<Client['databases']['update']>[0]
    );
    results.database = { id: db.id };
    invalidateListDatabasesCache();
  }

  // Update data source properties if properties are provided
  if (params.properties) {
    let dsId = params.data_source_id;

    // Auto-resolve data_source_id from the database if not provided
    if (!dsId) {
      const db = await client.databases.retrieve({ database_id: params.database_id });
      const dataSources =
        'data_sources' in db
          ? (db as { data_sources?: Array<{ id: string }> }).data_sources
          : undefined;
      dsId = dataSources?.[0]?.id;
      if (!dsId) {
        return responseFromPayload({
          error:
            'Could not resolve data_source_id from database. Pass data_source_id explicitly or use notion_get_database to find it.',
          database_id: params.database_id
        });
      }
    }

    // Sanitize properties (auto-convert unsupported types like status → select)
    const { sanitized, warnings } = sanitizeProperties(params.properties);

    const ds = await client.dataSources.update({
      data_source_id: dsId,
      properties: sanitized as Parameters<Client['dataSources']['update']>[0]['properties']
    });

    // Return the updated schema so the agent sees exact property names
    const schema = Object.entries(ds.properties).map(([name, p]) => ({
      name,
      type: (p as { type: string }).type,
      id: (p as { id: string }).id
    }));
    results.data_source = { id: ds.id, schema };
    setCachedValue(
      dataSourceSchemaCache,
      ds.id,
      {
        data_source_id: ds.id,
        title: 'title' in ds ? ds.title : undefined,
        schema
      },
      DATA_SOURCE_SCHEMA_CACHE_TTL_MS
    );
    if (warnings.length > 0) {
      (results as Record<string, unknown>).warnings = warnings;
    }
  }

  return responseFromPayload(results);
}
