#!/usr/bin/env node
/**
 * Schedule MCP Server — stdio entry point
 *
 * For local development and direct integration with Claude Desktop,
 * Claude Code, and other MCP clients that support stdio transport.
 *
 * Usage:
 *   node dist/index.js
 *
 * Note: In stdio mode, D1 is not available. The server will start but
 * database-dependent tools/resources will fail gracefully. For full
 * functionality, use the Cloudflare Worker deployment (worker/index.ts).
 *
 * Architecture (Three-Tier Framework):
 *   Database tier (Resources)   — Calendars, events, members, units, templates
 *   Automation tier (Tools)     — CRUD, backfill, forecast, conflicts, iCal
 *   Judgment tier (Prompts)     — Schedule analysis, conflict resolution, optimization
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { registerResources } from './resources.js';
import { registerTools } from './tools.js';
import { registerPrompts } from './prompts.js';
import type { D1Database } from './db/queries.js';
import { configureInsight } from './insight.js';

// =============================================================================
// In-Memory D1 Stub (for stdio mode)
// =============================================================================

/**
 * Minimal in-memory D1 stub for stdio mode.
 *
 * This provides a basic implementation that allows the server to start
 * and respond to tool calls. For production data persistence, use the
 * Cloudflare Worker deployment with real D1.
 *
 * Tables are stored as arrays of objects in memory — suitable for
 * development, testing, and demos.
 */
function createInMemoryDb(): D1Database {
  const tables = new Map<string, Record<string, unknown>[]>();

  // Initialize tables
  const tableNames = [
    'calendars', 'events', 'members', 'units',
    'unit_members', 'calendar_shares', 'event_participants',
    'templates', 'template_slots',
  ];
  for (const name of tableNames) {
    tables.set(name, []);
  }

  function parseQuery(query: string, params: unknown[]): {
    type: 'select' | 'insert' | 'update' | 'delete' | 'create';
    table: string;
    query: string;
    params: unknown[];
  } {
    const normalized = query.trim().toUpperCase();
    let type: 'select' | 'insert' | 'update' | 'delete' | 'create';
    let table = '';

    if (normalized.startsWith('SELECT')) {
      type = 'select';
      const fromMatch = query.match(/FROM\s+(\w+)/i);
      if (fromMatch) table = fromMatch[1];
    } else if (normalized.startsWith('INSERT')) {
      type = 'insert';
      const intoMatch = query.match(/INTO\s+(\w+)/i);
      if (intoMatch) table = intoMatch[1];
    } else if (normalized.startsWith('UPDATE')) {
      type = 'update';
      const updateMatch = query.match(/UPDATE\s+(\w+)/i);
      if (updateMatch) table = updateMatch[1];
    } else if (normalized.startsWith('DELETE')) {
      type = 'delete';
      const deleteMatch = query.match(/FROM\s+(\w+)/i);
      if (deleteMatch) table = deleteMatch[1];
    } else {
      type = 'create'; // CREATE TABLE, etc.
    }

    return { type, table, query, params };
  }

  function executeInsert(table: string, query: string, params: unknown[]): void {
    // Parse column names from query
    const colMatch = query.match(/\(([^)]+)\)\s*VALUES/i);
    if (!colMatch) return;

    const columns = colMatch[1].split(',').map(c => c.trim());
    const row: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      row[col] = params[i] ?? null;
    });

    const rows = tables.get(table);
    if (rows) rows.push(row);
  }

  function executeSelect(table: string, query: string, params: unknown[]): Record<string, unknown>[] {
    const rows = tables.get(table) ?? [];

    // Simple WHERE clause handling
    const whereMatch = query.match(/WHERE\s+(.+?)(?:ORDER|GROUP|LIMIT|$)/is);
    if (!whereMatch) return [...rows];

    // Very basic: handle "column = ?" conditions
    const conditions = whereMatch[1].split(/\s+AND\s+/i);
    let paramIdx = 0;
    let filtered = [...rows];

    for (const cond of conditions) {
      const eqMatch = cond.trim().match(/(\w+)\s*=\s*\?/);
      if (eqMatch && paramIdx < params.length) {
        const col = eqMatch[1];
        const val = params[paramIdx++];
        filtered = filtered.filter(r => r[col] === val);
      } else if (cond.includes('>=') && cond.includes('?')) {
        const geMatch = cond.trim().match(/(\w+)\s*>=\s*\?/);
        if (geMatch && paramIdx < params.length) {
          const col = geMatch[1];
          const val = params[paramIdx++] as number;
          filtered = filtered.filter(r => (r[col] as number) >= val);
        }
      } else if (cond.includes('<=') && cond.includes('?')) {
        const leMatch = cond.trim().match(/(\w+)\s*<=\s*\?/);
        if (leMatch && paramIdx < params.length) {
          const col = leMatch[1];
          const val = params[paramIdx++] as number;
          filtered = filtered.filter(r => (r[col] as number) <= val);
        }
      } else if (cond.includes('1=1')) {
        // Passthrough
      }
    }

    // Handle ORDER BY
    const orderMatch = query.match(/ORDER\s+BY\s+(\w+)\s+(ASC|DESC)?/i);
    if (orderMatch) {
      const col = orderMatch[1];
      const dir = orderMatch[2]?.toUpperCase() === 'DESC' ? -1 : 1;
      filtered.sort((a, b) => {
        const av = a[col];
        const bv = b[col];
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
        if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * dir;
        return 0;
      });
    }

    return filtered;
  }

  function executeUpdate(table: string, query: string, params: unknown[]): void {
    const rows = tables.get(table);
    if (!rows) return;

    // Parse SET clause
    const setMatch = query.match(/SET\s+(.+?)\s+WHERE/is);
    if (!setMatch) return;

    const setClauses = setMatch[1].split(',').map(c => c.trim());
    const setParams: Array<{ col: string }> = [];
    for (const clause of setClauses) {
      const m = clause.match(/(\w+)\s*=\s*\?/);
      if (m) setParams.push({ col: m[1] });
    }

    // Parse WHERE
    const whereMatch = query.match(/WHERE\s+(\w+)\s*=\s*\?/i);
    if (!whereMatch) return;

    const whereCol = whereMatch[1];
    const whereVal = params[setParams.length];

    for (const row of rows) {
      if (row[whereCol] === whereVal) {
        setParams.forEach((sp, i) => {
          row[sp.col] = params[i];
        });
      }
    }
  }

  function executeDelete(table: string, query: string, params: unknown[]): void {
    const rows = tables.get(table);
    if (!rows) return;

    const whereMatch = query.match(/WHERE\s+(\w+)\s*=\s*\?/i);
    if (!whereMatch) return;

    const col = whereMatch[1];
    const val = params[0];
    const newRows = rows.filter(r => r[col] !== val);
    tables.set(table, newRows);
  }

  const createStatement = (query: string) => {
    let boundParams: unknown[] = [];

    const stmt = {
      bind(...values: unknown[]) {
        boundParams = values;
        return stmt;
      },
      async first<T = unknown>(_column?: string): Promise<T | null> {
        const parsed = parseQuery(query, boundParams);
        if (parsed.type === 'select') {
          const results = executeSelect(parsed.table, query, boundParams);
          return (results[0] as T) ?? null;
        }
        return null;
      },
      async all<T = unknown>() {
        const parsed = parseQuery(query, boundParams);
        if (parsed.type === 'select') {
          const results = executeSelect(parsed.table, query, boundParams);
          return { results: results as T[], success: true };
        }
        return { results: [] as T[], success: true };
      },
      async run() {
        const parsed = parseQuery(query, boundParams);
        switch (parsed.type) {
          case 'insert':
            executeInsert(parsed.table, query, boundParams);
            break;
          case 'update':
            executeUpdate(parsed.table, query, boundParams);
            break;
          case 'delete':
            executeDelete(parsed.table, query, boundParams);
            break;
        }
        return { results: [], success: true };
      },
    };

    return stmt;
  };

  return {
    prepare: createStatement,
    async batch(statements) {
      const results = [];
      for (const stmt of statements) {
        const result = await (stmt as ReturnType<typeof createStatement>).run();
        results.push(result);
      }
      return results;
    },
  } as D1Database;
}

// =============================================================================
// Server Initialization
// =============================================================================

async function main() {
  // Configure Insight for stdio mode (logs to stderr)
  configureInsight({
    enabled: true,
    logToStderr: true,
  });

  const server = new McpServer({
    name: 'schedule-mcp',
    version: '1.1.0',
    icons: [{
      src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHJ4PSI2IiBmaWxsPSIjMDAwMDAwIi8+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNCw0KSIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZmlsbD0ibm9uZSI+PHBhdGggZD0iTTggMnY0Ii8+PHBhdGggZD0iTTE2IDJ2NCIvPjxyZWN0IHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCIgeD0iMyIgeT0iNCIgcng9IjIiLz48cGF0aCBkPSJNMyAxMGgxOCIvPjwvZz48L3N2Zz4=',
      mimeType: 'image/svg+xml',
      sizes: ['any'],
    }],
  });

  // In-memory database for stdio mode
  const db = createInMemoryDb();
  const getDb = () => db;

  // Register all three tiers
  // Note: sampling (recursive property) is null in stdio mode — tools
  // degrade gracefully by returning raw heuristic results without LLM judgment.
  registerResources(server, getDb);
  registerTools(server, getDb, null);
  registerPrompts(server);

  // Connect via stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('Schedule MCP server running on stdio (sampling: disabled, insight: stderr)');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
