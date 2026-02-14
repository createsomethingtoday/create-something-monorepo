/**
 * Notion Half Dozen X CREATE SOMETHING — tool handlers.
 * Uses Notion API 2025-09-03 and @notionhq/client v5 (data sources).
 */

import { Client } from '@notionhq/client';
import type { NotionClients } from '../lib/notion.js';
import { getClient } from '../lib/notion.js';
import type {
  NotionSearchInput,
  NotionQueryDatabaseInput,
  NotionCreatePageInput,
  NotionUpdatePageInput,
  NotionAppendBlocksInput,
  NotionBulkUpdateInput,
  NotionCreateDatabaseInput,
  NotionUpdateDatabaseInput,
} from './types.js';

export type EnvWithNotion = NotionClients;

// -----------------------------------------------------------------------------
// Search (API 2025-09-03: filter value 'page' | 'data_source')
// -----------------------------------------------------------------------------
export async function handleNotionSearch(
  clients: NotionClients,
  params: NotionSearchInput
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const client = getClient(clients, params.workspace) as Client;
  const body: Parameters<Client['search']>[0] = {
    page_size: params.page_size ?? 10,
  };
  if (params.query) body.query = params.query;
  if (params.filter_type) {
    body.filter = { property: 'object', value: params.filter_type };
  }
  const result = await client.search(body);
  return {
    content: [{ type: 'text', text: JSON.stringify({ results: result.results, has_more: result.has_more, next_cursor: result.next_cursor }, null, 2) }],
  };
}

// -----------------------------------------------------------------------------
// List data sources (API 2025-09-03: search filter 'data_source')
// -----------------------------------------------------------------------------
export async function handleNotionListDatabases(
  clients: NotionClients,
  params: { workspace: 'halfdozen' | 'client' }
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const client = getClient(clients, params.workspace) as Client;
  const result = await client.search({
    filter: { property: 'object', value: 'data_source' },
    page_size: 100,
  });
  const list = result.results
    .filter((r) => (r as { object?: string }).object === 'data_source')
    .map((d) => {
      const ds = d as { id: string; title?: Array<{ plain_text?: string }>; url?: string };
      return {
        id: ds.id,
        title: (ds.title ?? []).map((t: { plain_text?: string }) => t.plain_text ?? '').join(''),
        url: ds.url,
      };
    });
  return {
    content: [{ type: 'text', text: JSON.stringify({ data_sources: list }, null, 2) }],
  };
}

// -----------------------------------------------------------------------------
// Get data source (schema) — API 2025-09-03 dataSources.retrieve
// -----------------------------------------------------------------------------
export async function handleNotionGetDatabase(
  clients: NotionClients,
  params: { workspace: 'halfdozen' | 'client'; data_source_id: string }
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const client = getClient(clients, params.workspace) as Client;
  const ds = await client.dataSources.retrieve({ data_source_id: params.data_source_id });
  const schema = Object.entries(ds.properties).map(([name, p]) => ({
    name,
    type: (p as { type: string }).type,
    id: (p as { id: string }).id,
  }));
  const title = 'title' in ds ? ds.title : undefined;
  return {
    content: [{ type: 'text', text: JSON.stringify({ data_source_id: ds.id, title, schema }, null, 2) }],
  };
}

// -----------------------------------------------------------------------------
// Query data source — API 2025-09-03 dataSources.query
// -----------------------------------------------------------------------------
export async function handleNotionQueryDatabase(
  clients: NotionClients,
  params: NotionQueryDatabaseInput
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const client = getClient(clients, params.workspace) as Client;
  const body: Parameters<Client['dataSources']['query']>[0] = {
    data_source_id: params.data_source_id,
    page_size: params.page_size ?? 10,
  };
  if (params.filter) body.filter = JSON.parse(params.filter) as Parameters<Client['dataSources']['query']>[0]['filter'];
  if (params.sort_property) {
    body.sorts = [{ property: params.sort_property, direction: (params.sort_direction ?? 'descending') as 'ascending' | 'descending' }];
  }
  if (params.start_cursor) body.start_cursor = params.start_cursor;
  const result = await client.dataSources.query(body);
  return {
    content: [{ type: 'text', text: JSON.stringify({ results: result.results, has_more: result.has_more, next_cursor: result.next_cursor }, null, 2) }],
  };
}

// -----------------------------------------------------------------------------
// Get page
// -----------------------------------------------------------------------------
export async function handleNotionGetPage(
  clients: NotionClients,
  params: { workspace: 'halfdozen' | 'client'; page_id: string }
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const client = getClient(clients, params.workspace) as Client;
  const page = await client.pages.retrieve({ page_id: params.page_id });
  return {
    content: [{ type: 'text', text: JSON.stringify(page, null, 2) }],
  };
}

// -----------------------------------------------------------------------------
// Create page (API 2025-09-03: parent.data_source_id)
// -----------------------------------------------------------------------------
export async function handleNotionCreatePage(
  clients: NotionClients,
  params: NotionCreatePageInput
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const client = getClient(clients, params.workspace) as Client;
  const body = {
    parent: { data_source_id: params.data_source_id },
    properties: params.properties,
    ...(params.content?.length && { children: params.content }),
  } as Parameters<Client['pages']['create']>[0];
  const page = await client.pages.create(body);
  const url = 'url' in page ? page.url : undefined;
  return {
    content: [{ type: 'text', text: JSON.stringify({ id: page.id, url }, null, 2) }],
  };
}

// -----------------------------------------------------------------------------
// Update page
// -----------------------------------------------------------------------------
export async function handleNotionUpdatePage(
  clients: NotionClients,
  params: NotionUpdatePageInput
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const client = getClient(clients, params.workspace) as Client;
  const page = await client.pages.update({
    page_id: params.page_id,
    properties: params.properties as Parameters<Client['pages']['update']>[0]['properties'],
  });
  const url = 'url' in page ? page.url : undefined;
  return {
    content: [{ type: 'text', text: JSON.stringify({ id: page.id, url }, null, 2) }],
  };
}

// -----------------------------------------------------------------------------
// Append blocks
// -----------------------------------------------------------------------------
export async function handleNotionAppendBlocks(
  clients: NotionClients,
  params: NotionAppendBlocksInput
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const client = getClient(clients, params.workspace) as Client;
  const result = await client.blocks.children.append({
    block_id: params.page_id,
    children: params.children as Parameters<Client['blocks']['children']['append']>[0]['children'],
  });
  return {
    content: [{ type: 'text', text: JSON.stringify({ results: result.results }, null, 2) }],
  };
}

// -----------------------------------------------------------------------------
// Archive page
// -----------------------------------------------------------------------------
export async function handleNotionArchivePage(
  clients: NotionClients,
  params: { workspace: 'halfdozen' | 'client'; page_id: string }
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const client = getClient(clients, params.workspace) as Client;
  const page = await client.pages.update({
    page_id: params.page_id,
    archived: true,
  });
  return {
    content: [{ type: 'text', text: JSON.stringify({ id: page.id, archived: true }, null, 2) }],
  };
}

// -----------------------------------------------------------------------------
// Bulk update
// -----------------------------------------------------------------------------
export async function handleNotionBulkUpdate(
  clients: NotionClients,
  params: NotionBulkUpdateInput
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const client = getClient(clients, params.workspace) as Client;
  const results: { id: string; success: boolean; error?: string }[] = [];
  for (const page_id of params.page_ids) {
    try {
      await client.pages.update({
        page_id,
        properties: params.properties as unknown as Parameters<Client['pages']['update']>[0]['properties'],
      });
      results.push({ id: page_id, success: true });
    } catch (e) {
      results.push({ id: page_id, success: false, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return {
    content: [{ type: 'text', text: JSON.stringify({ results }, null, 2) }],
  };
}

// -----------------------------------------------------------------------------
// Bulk archive
// -----------------------------------------------------------------------------
export async function handleNotionBulkArchive(
  clients: NotionClients,
  params: { workspace: 'halfdozen' | 'client'; page_ids: string[] }
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const client = getClient(clients, params.workspace) as Client;
  const results: { id: string; success: boolean; error?: string }[] = [];
  for (const page_id of params.page_ids) {
    try {
      await client.pages.update({ page_id, archived: true });
      results.push({ id: page_id, success: true });
    } catch (e) {
      results.push({ id: page_id, success: false, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return {
    content: [{ type: 'text', text: JSON.stringify({ results }, null, 2) }],
  };
}

// -----------------------------------------------------------------------------
// Archive block (move to trash; enables reverting appended content)
// -----------------------------------------------------------------------------
export async function handleNotionArchiveBlock(
  clients: NotionClients,
  params: { workspace: 'halfdozen' | 'client'; block_id: string }
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const client = getClient(clients, params.workspace) as Client;
  const block = await client.blocks.delete({ block_id: params.block_id });
  const archived = (block as { archived?: boolean }).archived ?? true;
  return {
    content: [{ type: 'text', text: JSON.stringify({ id: block.id, archived }, null, 2) }],
  };
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
      const statusDef = propDef.status as { options?: Array<{ name: string; color?: string }> } | Record<string, unknown>;
      const options = ('options' in statusDef && Array.isArray(statusDef.options))
        ? statusDef.options.map((o: { name: string; color?: string }) => ({ name: o.name, ...(o.color && { color: o.color }) }))
        : [{ name: 'Not started' }, { name: 'In progress' }, { name: 'Done' }];
      sanitized[name] = { select: { options } };
      warnings.push(`"${name}": converted from "status" to "select" (Notion API does not support creating status properties). Options: ${options.map((o: { name: string }) => o.name).join(', ')}.`);
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
  clients: NotionClients,
  params: NotionCreateDatabaseInput
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const client = getClient(clients, params.workspace) as Client;

  // Sanitize properties (auto-convert unsupported types like status → select)
  const { sanitized, warnings } = sanitizeProperties(params.properties);

  const body = {
    parent: { type: 'page_id' as const, page_id: params.parent_page_id },
    title: [{ text: { content: params.title } }],
    is_inline: params.is_inline ?? false,
    initial_data_source: { properties: sanitized },
  } as Parameters<Client['databases']['create']>[0];
  const db = await client.databases.create(body);
  const url = 'url' in db ? db.url : undefined;

  // Extract data_source_id from the response for immediate use
  const dataSources = 'data_sources' in db
    ? (db as { data_sources?: Array<{ id: string }> }).data_sources
    : undefined;
  const dataSourceId = dataSources?.[0]?.id;

  // Retrieve the actual data source schema so the agent sees exact property names
  // (Notion may rename properties on creation, e.g. "Name" → "Title")
  let schema: Array<{ name: string; type: string; id: string }> | undefined;
  if (dataSourceId) {
    try {
      const ds = await client.dataSources.retrieve({ data_source_id: dataSourceId });
      schema = Object.entries(ds.properties).map(([name, p]) => ({
        name,
        type: (p as { type: string }).type,
        id: (p as { id: string }).id,
      }));
    } catch {
      // Non-fatal: schema confirmation failed but database was created
    }
  }

  const result: Record<string, unknown> = { id: db.id, url, data_source_id: dataSourceId, schema };
  if (warnings.length > 0) {
    result.warnings = warnings;
  }

  return {
    content: [{
      type: 'text',
      text: JSON.stringify(result, null, 2),
    }],
  };
}

// -----------------------------------------------------------------------------
// Update database (title/description) and optionally data source properties
// -----------------------------------------------------------------------------
export async function handleNotionUpdateDatabase(
  clients: NotionClients,
  params: NotionUpdateDatabaseInput
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const client = getClient(clients, params.workspace) as Client;
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
    const db = await client.databases.update(dbBody as Parameters<Client['databases']['update']>[0]);
    results.database = { id: db.id };
  }

  // Update data source properties if properties are provided
  if (params.properties) {
    let dsId = params.data_source_id;

    // Auto-resolve data_source_id from the database if not provided
    if (!dsId) {
      const db = await client.databases.retrieve({ database_id: params.database_id });
      const dataSources = 'data_sources' in db
        ? (db as { data_sources?: Array<{ id: string }> }).data_sources
        : undefined;
      dsId = dataSources?.[0]?.id;
      if (!dsId) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              error: 'Could not resolve data_source_id from database. Pass data_source_id explicitly or use notion_get_database to find it.',
              database_id: params.database_id,
            }, null, 2),
          }],
        };
      }
    }

    // Sanitize properties (auto-convert unsupported types like status → select)
    const { sanitized, warnings } = sanitizeProperties(params.properties);

    const ds = await client.dataSources.update({
      data_source_id: dsId,
      properties: sanitized as Parameters<Client['dataSources']['update']>[0]['properties'],
    });

    // Return the updated schema so the agent sees exact property names
    const schema = Object.entries(ds.properties).map(([name, p]) => ({
      name,
      type: (p as { type: string }).type,
      id: (p as { id: string }).id,
    }));
    results.data_source = { id: ds.id, schema };
    if (warnings.length > 0) {
      (results as Record<string, unknown>).warnings = warnings;
    }
  }

  return {
    content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
  };
}
