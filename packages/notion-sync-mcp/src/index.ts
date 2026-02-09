#!/usr/bin/env node
/**
 * Notion Sync MCP Server — Stdio entry point
 *
 * Two-way sync between a master "Issues" database and client-specific databases,
 * backed by Cloudflare D1 for state management.
 *
 * Three-Tier Framework:
 *   - Database:    Resources (sync://clients, sync://status, sync://history/{client})
 *   - Automation:  Tools (8 sync management tools)
 *   - Judgment:    Prompts (sync_strategy, conflict_resolution, client_onboarding)
 *   - Insight:     ConsoleInsight emitted for every operation
 *
 * Built on @create-something/mcp-core — the primitive is always relative.
 *
 * Environment Variables:
 *   CF_ACCOUNT_ID      - Cloudflare account ID
 *   CF_API_TOKEN        - Cloudflare API token with D1 access
 *   CF_D1_DATABASE_ID   - D1 database ID for sync state
 */

import { ConsoleInsight } from '@create-something/mcp-core';
import { NotionSyncAuth } from './auth.js';
import { createNotionSyncServer } from './server.js';

// ─── Entry Point ────────────────────────────────────────────────────

const server = createNotionSyncServer({
  authProvider: new NotionSyncAuth({
    d1Source: { type: 'env' },
  }),
  insight: new ConsoleInsight(),
});

server.serveStdio().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
