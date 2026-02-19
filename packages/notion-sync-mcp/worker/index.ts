/**
 * Notion Sync MCP Server — Cloudflare Worker entry point
 *
 * Dual-purpose Worker:
 *   1. MCP HTTP transport: handleRequest() for remote MCP clients
 *   2. Scheduled sync: CRON-triggered background sync for all clients
 *
 * Three-Tier Framework:
 *   - This Worker IS the Automation tier deployed at the edge
 *   - D1 binding provides Database tier (direct access, no REST API)
 *   - MCP primitives carry Judgment tier (prompts, policy)
 *   - Insight via console logging for observability
 *
 * The Worker uses the D1 binding via createBindingExecutor() for all paths:
 *   - CRON sync uses the shared sync engine (no duplicated logic)
 *   - MCP endpoint uses binding executor via NotionSyncAuth
 *   - Manual /sync endpoint uses the same shared engine
 */

import { createNotionSyncServer } from '../src/server.js';
import { NotionSyncAuth } from '../src/auth.js';
import { createBindingExecutor, ensureInitialized, listClientMappings } from '../src/services/d1.js';
import { syncClient } from '../src/services/sync-engine.js';
import { SyncDirection } from '../src/constants.js';
import type { D1Executor, D1DatabaseBinding } from '../src/types.js';
import { recordInvocation } from '@create-something/mcp-core';
import type { InsightEmitter, InsightEvent } from '@create-something/mcp-core';

// =============================================================================
// Worker Environment
// =============================================================================

export interface Env {
  DB: D1Database;
  TELEMETRY_DB?: D1Database;
  CF_ACCOUNT_ID: string;
  CF_API_TOKEN: string;
  CF_D1_DATABASE_ID: string;
  /** Optional API key for authenticating remote MCP clients */
  MCP_API_KEY?: string;
  /** Optional encryption key for Notion tokens at rest in D1 */
  TOKEN_ENCRYPTION_KEY?: string;
  /** Optional comma-separated list of allowed CORS origins (e.g., "https://inspector.mcp.dev,https://app.example.com") */
  CORS_ALLOWED_ORIGINS?: string;
}

const TELEMETRY_SERVER_NAME = 'notion-sync-mcp';

function createTelemetryInsight(db?: D1Database): InsightEmitter | undefined {
  if (!db) return undefined;
  return {
    emit(event: InsightEvent): void {
      if (event.tier !== 'automation') return;
      if (!event.action.startsWith('tool:')) return;
      const toolName = event.action.slice('tool:'.length);
      if (!toolName) return;

      const durationMs = typeof event.durationMs === 'number' ? event.durationMs : 0;
      const success = event.success !== false;
      const metadata = event.metadata && typeof event.metadata === 'object'
        ? event.metadata as Record<string, unknown>
        : null;
      const errorMessage = success ? undefined : (
        typeof metadata?.error === 'string'
          ? metadata.error
          : 'Tool invocation failed'
      );

      void recordInvocation(
        db as any,
        TELEMETRY_SERVER_NAME,
        event.accountId || 'operator',
        toolName,
        durationMs,
        success,
        errorMessage,
      ).catch((err) => {
        console.warn('[telemetry] notion-sync metering failed:', err);
      });
    },
  };
}

// =============================================================================
// CORS — Origin-Validated (no wildcard)
// =============================================================================

/**
 * Validate the request Origin against the allowed origins list.
 * MCP clients (Codex, Claude Code, Cursor) connect server-to-server and
 * don't send Origin headers, so CORS is only needed for browser-based
 * debugging tools like the MCP Inspector.
 *
 * Returns CORS headers only for validated origins. If no CORS_ALLOWED_ORIGINS
 * is configured, no CORS headers are returned (secure default).
 */
function getCorsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin');
  if (!origin || !env.CORS_ALLOWED_ORIGINS) return {};

  const allowedOrigins = env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim());
  if (!allowedOrigins.includes(origin)) return {};

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, Accept, Mcp-Session-Id',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function jsonResponse(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
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
    const cors = getCorsHeaders(request, env);
    return jsonResponse({
      error: 'Unauthorized',
      message: 'Valid API key required. Set Bearer token or X-API-Key header.',
    }, 401, cors);
  }

  return null;
}

// =============================================================================
// Shared Sync Helper
// =============================================================================

/**
 * Run bidirectional sync for all registered clients using the shared sync engine.
 * Returns a summary string for each client.
 */
async function syncAllClients(executor: D1Executor): Promise<string[]> {
  await ensureInitialized(executor);
  const clients = await listClientMappings(executor);
  const results: string[] = [];

  for (const client of clients) {
    try {
      const result = await syncClient(executor, client, SyncDirection.BIDIRECTIONAL);
      const summary = `${client.client_name}: +${result.pages_created} ↑${result.pages_pushed} ↓${result.pages_pulled}`;
      const details = result.conflicts.length > 0
        ? ` ⚡${result.conflicts.length} conflicts`
        : '';
      const errors = result.errors.length > 0
        ? ` ✗${result.errors.length} errors`
        : '';
      results.push(`${summary}${details}${errors} (${result.duration_ms}ms)`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push(`${client.client_name}: ERROR ${message}`);
      console.error(`Sync error for ${client.client_name}:`, message);
    }
  }

  return results;
}

// =============================================================================
// CRON Distributed Lock
// =============================================================================

/**
 * Acquire a D1-based distributed lock for CRON sync.
 * Prevents concurrent CRON executions from colliding.
 * Returns true if lock acquired, false if another sync is running.
 */
async function acquireSyncLock(executor: D1Executor, lockId: string, ttlSeconds = 300): Promise<boolean> {
  // Ensure lock table exists
  await executor.execute(`CREATE TABLE IF NOT EXISTS sync_locks (
    id TEXT PRIMARY KEY,
    acquired_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  )`);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

  // Delete expired locks first
  await executor.execute(
    "DELETE FROM sync_locks WHERE expires_at < datetime('now')"
  );

  // Try to insert lock — fails if another active lock exists
  try {
    await executor.execute(
      "INSERT INTO sync_locks (id, acquired_at, expires_at) VALUES (?, datetime('now'), ?)",
      [lockId, expiresAt.toISOString()]
    );
    return true;
  } catch {
    return false; // Lock already held
  }
}

/**
 * Release a distributed lock.
 */
async function releaseSyncLock(executor: D1Executor, lockId: string): Promise<void> {
  await executor.execute("DELETE FROM sync_locks WHERE id = ?", [lockId]);
}

// =============================================================================
// Worker Export
// =============================================================================

export default {
  /**
   * CRON-triggered sync for all registered clients.
   * Uses distributed lock to prevent concurrent execution.
   */
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    const executor = createBindingExecutor(env.DB as unknown as D1DatabaseBinding, env.TOKEN_ENCRYPTION_KEY);
    const lockId = 'cron-sync';

    const acquired = await acquireSyncLock(executor, lockId);
    if (!acquired) {
      console.log('[CRON] Skipped — another sync is already running');
      return;
    }

    try {
      const results = await syncAllClients(executor);
      console.log(`[CRON] Sync complete: ${results.join(' | ')}`);
    } finally {
      await releaseSyncLock(executor, lockId);
    }
  },

  /**
   * HTTP handler — MCP endpoint + health check + manual sync trigger.
   */
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const cors = getCorsHeaders(request, env);

    // CORS preflight — validated origins only
    if (request.method === 'OPTIONS') {
      if (Object.keys(cors).length === 0) {
        return new Response(null, { status: 204 });
      }
      return new Response(null, { headers: cors });
    }

    // Health check — always public
    if (url.pathname === '/' || url.pathname === '/health') {
      return jsonResponse({
        status: 'ok',
        worker: 'notion-sync-mcp',
        transport: 'streamable-http',
        endpoints: {
          mcp: '/mcp',
          sync: '/sync (POST, requires auth)',
          health: '/health',
        },
      }, 200, cors);
    }

    // Manual sync trigger — requires auth
    if (url.pathname === '/sync' && request.method === 'POST') {
      const authError = validateApiKey(request, env);
      if (authError) return authError;

      const executor = createBindingExecutor(env.DB as unknown as D1DatabaseBinding, env.TOKEN_ENCRYPTION_KEY);
      const results = await syncAllClients(executor);
      return jsonResponse({ results }, 200, cors);
    }

    // MCP endpoint — create server with D1 binding auth
    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      const authError = validateApiKey(request, env);
      if (authError) return authError;

      const server = createNotionSyncServer({
        authProvider: new NotionSyncAuth({
          d1Source: { type: 'binding', db: env.DB as unknown as D1DatabaseBinding },
          encryptionKey: env.TOKEN_ENCRYPTION_KEY,
        }),
        insight: createTelemetryInsight(env.TELEMETRY_DB),
      });

      return server.handleRequest(request, env);
    }

    return jsonResponse({ error: 'Not found', mcp_endpoint: '/mcp' }, 404, cors);
  },
};
