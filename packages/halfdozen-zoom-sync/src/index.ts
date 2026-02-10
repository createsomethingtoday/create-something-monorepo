#!/usr/bin/env node
/**
 * Zoom Clips MCP Server — stdio entry point
 *
 * For local development and direct integration with Claude Desktop,
 * Claude Code, and other MCP clients that support stdio transport.
 *
 * Usage:
 *   node dist/index.js
 *
 * Environment variables required:
 *   STEEL_API_KEY       — Steel.dev API key
 *   NOTION_API_KEY      — Notion integration secret
 *   NOTION_DATABASE_ID  — Notion database ID for clips
 *
 * Note: In stdio mode, D1 is not available. The server uses an in-memory
 * stub for sync run tracking and clips cache. For persistent state, use
 * the Cloudflare Worker deployment (worker/index.ts).
 *
 * Architecture (Three-Tier Framework):
 *   Database tier (Resources)   — Clips library, clip details, sync status, session health
 *   Automation tier (Tools)     — Sync, extract, search, session management
 *   Judgment tier (Prompts)     — Transcript analysis, summarization, sync strategy
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { registerSyncTools } from './tools/sync.js';
import { registerSearchTools } from './tools/search.js';
import { registerSessionTools } from './tools/session.js';
import { registerClipsResources } from './resources/clips.js';
import { registerStatusResources } from './resources/status.js';
import { registerPrompts } from './prompts/analysis.js';
import type { D1Database, D1PreparedStatement } from './lib/db.js';
import type { SteelSessionContext } from './lib/steel.js';

// =============================================================================
// In-Memory D1 Stub (for stdio mode)
// =============================================================================

function createInMemoryDb(): D1Database {
  const tables = new Map<string, Record<string, unknown>[]>();
  let autoIncrement = new Map<string, number>();

  return {
    prepare(query: string): D1PreparedStatement {
      let boundParams: unknown[] = [];

      const stmt: D1PreparedStatement = {
        bind(...params: unknown[]) {
          boundParams = params;
          return stmt;
        },
        async first<T>(column?: string): Promise<T | null> {
          // Minimal implementation for session_state and sync_runs queries
          const normalized = query.trim().toUpperCase();

          if (normalized.includes('FROM SYNC_RUNS')) {
            const runs = tables.get('sync_runs') || [];
            if (runs.length === 0) return null;
            const row = runs[runs.length - 1];
            return (column ? row[column] : row) as T;
          }

          if (normalized.includes('FROM SESSION_STATE')) {
            const states = tables.get('session_state') || [];
            const key = boundParams[0];
            const found = states.find((s) => s.key === key);
            return (found || null) as T;
          }

          if (normalized.includes('FROM CLIPS_CACHE')) {
            const clips = tables.get('clips_cache') || [];
            if (boundParams[0]) {
              const found = clips.find((c) => c.zoom_url === boundParams[0]);
              return (found || null) as T;
            }
            return (clips[0] || null) as T;
          }

          return null;
        },
        async all<T>(): Promise<{ results: T[] }> {
          const normalized = query.trim().toUpperCase();

          if (normalized.includes('FROM SYNC_RUNS')) {
            const runs = tables.get('sync_runs') || [];
            const limit = boundParams[0] as number || 10;
            return { results: runs.slice(-limit).reverse() as T[] };
          }

          if (normalized.includes('FROM CLIPS_CACHE')) {
            const clips = tables.get('clips_cache') || [];
            const limit = boundParams[0] as number || 50;
            return { results: clips.slice(-limit).reverse() as T[] };
          }

          return { results: [] };
        },
        async run(): Promise<{ success: boolean; meta: Record<string, unknown> }> {
          const normalized = query.trim().toUpperCase();

          if (normalized.startsWith('INSERT')) {
            // Determine table
            const tableMatch = query.match(/INTO\s+(\w+)/i);
            const table = tableMatch?.[1] || '';

            if (!tables.has(table)) tables.set(table, []);

            const colMatch = query.match(/\(([^)]+)\)\s*VALUES/i);
            const columns = colMatch?.[1]
              .split(',')
              .map((c) => c.trim()) || [];

            const row: Record<string, unknown> = {};
            columns.forEach((col, i) => {
              row[col] = boundParams[i] ?? null;
            });

            // Auto-increment for id
            const currentId = (autoIncrement.get(table) || 0) + 1;
            autoIncrement.set(table, currentId);
            row.id = currentId;

            // Handle INSERT OR REPLACE
            if (normalized.includes('OR REPLACE')) {
              const existing = tables.get(table)!;
              const primaryKey = columns[0]; // Assumes first column is the key
              const idx = existing.findIndex(
                (r) => r[primaryKey] === row[primaryKey],
              );
              if (idx >= 0) {
                existing[idx] = row;
              } else {
                existing.push(row);
              }
            } else {
              tables.get(table)!.push(row);
            }

            return { success: true, meta: { last_row_id: currentId } };
          }

          if (normalized.startsWith('UPDATE')) {
            // Basic update for sync_runs
            const tableMatch = query.match(/UPDATE\s+(\w+)/i);
            const table = tableMatch?.[1] || '';
            const rows = tables.get(table) || [];
            const id = boundParams[boundParams.length - 1]; // Last param is WHERE id = ?
            const row = rows.find((r) => r.id === id);
            if (row) {
              // Update fields based on SET clause
              const setMatch = query.match(/SET\s+([\s\S]+?)WHERE/i);
              if (setMatch) {
                const setClauses = setMatch[1].split(',').map((s) => s.trim());
                let paramIdx = 0;
                for (const clause of setClauses) {
                  const [col] = clause.split('=').map((s) => s.trim());
                  if (col && clause.includes('COALESCE')) {
                    const val = boundParams[paramIdx];
                    if (val !== null && val !== undefined) {
                      row[col] = val;
                    }
                  } else if (col) {
                    row[col] = boundParams[paramIdx];
                  }
                  paramIdx++;
                }
              }
            }
            return { success: true, meta: {} };
          }

          return { success: true, meta: {} };
        },
      };

      return stmt;
    },
    async exec(): Promise<unknown> {
      return {};
    },
  };
}

// =============================================================================
// In-Memory Session Context Store (for stdio mode)
// =============================================================================

let sessionContextStore: SteelSessionContext | null = null;

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  const steelApiKey = process.env.STEEL_API_KEY;
  const notionApiKey = process.env.NOTION_API_KEY;
  const notionDatabaseId = process.env.NOTION_DATABASE_ID;

  if (!steelApiKey || !notionApiKey || !notionDatabaseId) {
    console.error(
      'Missing required environment variables: STEEL_API_KEY, NOTION_API_KEY, NOTION_DATABASE_ID',
    );
    process.exit(1);
  }

  const notionConfig = { apiKey: notionApiKey, databaseId: notionDatabaseId };
  const db = createInMemoryDb();
  const getDb = () => db;

  const getSessionContext = async (): Promise<SteelSessionContext | null> => {
    return sessionContextStore;
  };

  const setSessionContext = async (ctx: SteelSessionContext): Promise<void> => {
    sessionContextStore = ctx;
  };

  // Create server
  const server = new McpServer({
    name: 'halfdozen-zoom-sync',
    version: '2.0.0',
  });

  // Register all three tiers
  registerSyncTools(server, {
    steelApiKey,
    notionConfig,
    getDb,
    getSessionContext,
  });
  registerSearchTools(server, notionConfig);
  registerSessionTools(server, {
    steelApiKey,
    getDb,
    getSessionContext,
    setSessionContext,
  });
  registerClipsResources(server, getDb, notionConfig);
  registerStatusResources(server, getDb, getSessionContext);
  registerPrompts(server);

  // Connect via stdio
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
