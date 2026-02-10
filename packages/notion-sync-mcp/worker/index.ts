/**
 * Notion Sync MCP Server — Cloudflare Worker entry point
 *
 * Dual-purpose Worker:
 *   1. MCP HTTP transport: handleRequest() for remote MCP clients
 *   2. Scheduled sync: CRON-triggered background sync for all clients
 *
 * Three-Tier Framework:
 *   - This Worker IS the Automation tier deployed at the edge
 *   - D1 binding provides Database tier (no REST API needed)
 *   - MCP primitives carry Judgment tier (prompts, policy)
 *   - Insight via WorkerInsight for observability
 *
 * The Worker uses the D1 binding directly for CRON sync (no REST API),
 * but the MCP server still uses REST API through AccountContext for
 * tool handlers. This is intentional — the CRON handler is a separate
 * execution path that doesn't go through MCP primitives.
 */

import { createNotionSyncServer } from '../src/server.js';
import { NotionSyncAuth } from '../src/auth.js';
import type { D1Config } from '../src/types.js';

// =============================================================================
// Worker Environment
// =============================================================================

export interface Env {
  DB: D1Database;
  CF_ACCOUNT_ID: string;
  CF_API_TOKEN: string;
  CF_D1_DATABASE_ID: string;
  /** Optional API key for authenticating remote MCP clients */
  MCP_API_KEY?: string;
}

// =============================================================================
// Authentication Middleware
// =============================================================================

/**
 * Validate API key from Bearer token or X-API-Key header.
 * Returns null if auth passes, or an error Response if it fails.
 * When MCP_API_KEY is not set, auth is bypassed (development mode).
 */
function validateApiKey(request: Request, env: Env): Response | null {
  if (!env.MCP_API_KEY) return null; // No key configured — open access (dev mode)

  const authHeader = request.headers.get('Authorization');
  const apiKeyHeader = request.headers.get('X-API-Key');

  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : apiKeyHeader;

  if (!token || token !== env.MCP_API_KEY) {
    return new Response(JSON.stringify({
      error: 'Unauthorized',
      message: 'Valid API key required. Set Bearer token or X-API-Key header.',
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return null;
}

// =============================================================================
// Notion API (for CRON sync — direct fetch, no SDK)
// =============================================================================

const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';
const RATE_LIMIT_MS = 334;
let lastRequest = 0;

async function rateLimited(url: string, init: RequestInit): Promise<Response> {
  const wait = RATE_LIMIT_MS - (Date.now() - lastRequest);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequest = Date.now();
  return fetch(url, init);
}

function notionHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  };
}

interface NotionPage {
  id: string;
  last_edited_time: string;
  properties: Record<string, Record<string, unknown>>;
}

async function queryDB(
  token: string,
  dbId: string,
  filter?: Record<string, unknown>
): Promise<NotionPage[]> {
  const pages: NotionPage[] = [];
  let cursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const body: Record<string, unknown> = { page_size: 100 };
    if (filter) body.filter = filter;
    if (cursor) body.start_cursor = cursor;

    const res = await rateLimited(`${NOTION_API}/databases/${dbId}/query`, {
      method: 'POST',
      headers: notionHeaders(token),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Notion ${res.status}: ${await res.text()}`);

    const data = (await res.json()) as {
      results: NotionPage[];
      has_more: boolean;
      next_cursor: string | null;
    };
    pages.push(...data.results);
    hasMore = data.has_more;
    cursor = data.next_cursor ?? undefined;
  }
  return pages;
}

async function createPageDirect(
  token: string,
  dbId: string,
  props: Record<string, unknown>
): Promise<NotionPage> {
  const res = await rateLimited(`${NOTION_API}/pages`, {
    method: 'POST',
    headers: notionHeaders(token),
    body: JSON.stringify({ parent: { database_id: dbId }, properties: props }),
  });
  if (!res.ok) throw new Error(`Notion create ${res.status}: ${await res.text()}`);
  return (await res.json()) as NotionPage;
}

async function updatePageDirect(
  token: string,
  pageId: string,
  props: Record<string, unknown>
): Promise<NotionPage> {
  const res = await rateLimited(`${NOTION_API}/pages/${pageId}`, {
    method: 'PATCH',
    headers: notionHeaders(token),
    body: JSON.stringify({ properties: props }),
  });
  if (!res.ok) throw new Error(`Notion update ${res.status}: ${await res.text()}`);
  return (await res.json()) as NotionPage;
}

// =============================================================================
// Property Helpers
// =============================================================================

const SYNCABLE = new Set([
  'title', 'rich_text', 'number', 'select', 'multi_select',
  'date', 'checkbox', 'url', 'email', 'phone_number', 'status',
]);

function buildPayload(page: NotionPage, propNames: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const name of propNames) {
    const prop = page.properties[name];
    if (prop?.type && SYNCABLE.has(prop.type as string)) {
      out[name] = { [prop.type as string]: prop[prop.type as string] };
    }
  }
  return out;
}

// =============================================================================
// CRON Sync (D1 binding — no REST API)
// =============================================================================

interface ClientMapping {
  id: string;
  client_name: string;
  master_database_id: string;
  client_database_id: string;
  client_filter_property: string;
  client_filter_value: string;
  notion_token_master: string;
  notion_token_client: string;
  sync_properties: string;
  conflict_strategy: string;
}

async function syncOne(db: D1Database, client: ClientMapping): Promise<string> {
  const syncProps: string[] = JSON.parse(client.sync_properties);
  let pushed = 0, pulled = 0, created = 0, errors = 0;

  const masterPages = await queryDB(client.notion_token_master, client.master_database_id, {
    or: [
      { property: client.client_filter_property, select: { equals: client.client_filter_value } },
      { property: client.client_filter_property, rich_text: { equals: client.client_filter_value } },
    ],
  });

  const clientPages = await queryDB(client.notion_token_client, client.client_database_id);

  // Load existing mappings
  const rows = await db
    .prepare('SELECT * FROM page_id_mappings WHERE client_mapping_id = ?')
    .bind(client.id)
    .all();

  const byMaster = new Map<string, Record<string, unknown>>();
  const byClient = new Map<string, Record<string, unknown>>();
  for (const r of rows.results) {
    byMaster.set(r.master_page_id as string, r);
    byClient.set(r.client_page_id as string, r);
  }

  // PUSH master → client
  for (const mp of masterPages) {
    try {
      const map = byMaster.get(mp.id);
      if (!map) {
        const cp = await createPageDirect(
          client.notion_token_client,
          client.client_database_id,
          buildPayload(mp, syncProps)
        );
        await db.prepare(
          `INSERT INTO page_id_mappings (id, client_mapping_id, master_page_id, client_page_id,
           master_last_edited, client_last_edited, sync_status, last_synced_at)
           VALUES (?, ?, ?, ?, ?, ?, 'synced', datetime('now'))`
        ).bind(crypto.randomUUID(), client.id, mp.id, cp.id, mp.last_edited_time, cp.last_edited_time).run();
        created++;
      } else if (mp.last_edited_time > (map.master_last_edited as string)) {
        await updatePageDirect(
          client.notion_token_client,
          map.client_page_id as string,
          buildPayload(mp, syncProps)
        );
        await db.prepare(
          "UPDATE page_id_mappings SET master_last_edited = ?, sync_status = 'synced', last_synced_at = datetime('now') WHERE id = ?"
        ).bind(mp.last_edited_time, map.id as string).run();
        pushed++;
      }
    } catch { errors++; }
  }

  // PULL client → master
  for (const cp of clientPages) {
    try {
      const map = byClient.get(cp.id);
      if (!map) {
        const props = buildPayload(cp, syncProps);
        props[client.client_filter_property] = { select: { name: client.client_filter_value } };
        const mp = await createPageDirect(client.notion_token_master, client.master_database_id, props);
        await db.prepare(
          `INSERT INTO page_id_mappings (id, client_mapping_id, master_page_id, client_page_id,
           master_last_edited, client_last_edited, sync_status, last_synced_at)
           VALUES (?, ?, ?, ?, ?, ?, 'synced', datetime('now'))`
        ).bind(crypto.randomUUID(), client.id, mp.id, cp.id, mp.last_edited_time, cp.last_edited_time).run();
        created++;
      } else if (cp.last_edited_time > (map.client_last_edited as string)) {
        const masterAlsoChanged = masterPages.some(
          (m) => m.id === (map.master_page_id as string) && m.last_edited_time > (map.master_last_edited as string)
        );
        if (!masterAlsoChanged) {
          await updatePageDirect(
            client.notion_token_master,
            map.master_page_id as string,
            buildPayload(cp, syncProps)
          );
          await db.prepare(
            "UPDATE page_id_mappings SET client_last_edited = ?, sync_status = 'synced', last_synced_at = datetime('now') WHERE id = ?"
          ).bind(cp.last_edited_time, map.id as string).run();
          pulled++;
        } else {
          await db.prepare("UPDATE page_id_mappings SET sync_status = 'conflict' WHERE id = ?")
            .bind(map.id as string).run();
        }
      }
    } catch { errors++; }
  }

  // Log
  await db.prepare(
    `INSERT INTO sync_logs (id, client_mapping_id, direction, pages_pushed, pages_pulled,
     pages_created, conflicts_count, errors_count, duration_ms, started_at, completed_at)
     VALUES (?, ?, 'bidirectional', ?, ?, ?, 0, ?, 0, datetime('now'), datetime('now'))`
  ).bind(crypto.randomUUID(), client.id, pushed, pulled, created, errors).run();

  return `${client.client_name}: +${created} ↑${pushed} ↓${pulled} ✗${errors}`;
}

// =============================================================================
// Worker Export
// =============================================================================

export default {
  /**
   * CRON-triggered sync for all registered clients.
   */
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    const clients = await env.DB
      .prepare('SELECT * FROM client_mappings')
      .all();

    const results: string[] = [];
    for (const row of clients.results) {
      try {
        const result = await syncOne(env.DB, row as unknown as ClientMapping);
        results.push(result);
      } catch (err) {
        results.push(`${(row as { client_name: string }).client_name}: ERROR ${err}`);
      }
    }

    console.log(`Sync complete: ${results.join(' | ')}`);
  },

  /**
   * HTTP handler — MCP endpoint + health check + manual sync trigger.
   */
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === '/health') {
      return Response.json({ status: 'ok', worker: 'notion-sync-mcp' });
    }

    // Manual CRON trigger
    if (url.pathname === '/sync' && request.method === 'POST') {
      const clients = await env.DB
        .prepare('SELECT * FROM client_mappings')
        .all();

      const results: string[] = [];
      for (const row of clients.results) {
        try {
          const result = await syncOne(env.DB, row as unknown as ClientMapping);
          results.push(result);
        } catch (err) {
          results.push(`${(row as { client_name: string }).client_name}: ERROR ${err}`);
        }
      }

      return Response.json({ results });
    }

    // MCP endpoint — create server with env-based auth
    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      const authError = validateApiKey(request, env);
      if (authError) return authError;
      const d1Config: D1Config = {
        accountId: env.CF_ACCOUNT_ID,
        apiToken: env.CF_API_TOKEN,
        databaseId: env.CF_D1_DATABASE_ID,
      };

      const server = createNotionSyncServer({
        authProvider: new NotionSyncAuth({
          d1Source: { type: 'static', config: d1Config },
        }),
      });

      return server.handleRequest(request, env);
    }

    return new Response('Not found', { status: 404 });
  },
};
