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
