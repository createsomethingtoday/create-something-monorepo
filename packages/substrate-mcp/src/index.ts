#!/usr/bin/env node
/**
 * Substrate MCP Server — Stdio entry point
 *
 * The agent-native data layer. Teams interact through agents, not UI.
 * D1 for structured data. R2 for files. MCP for connectivity.
 *
 * Three-Tier Framework:
 *   Database:    Resources (substrate://*) — workspace state, schemas, records, files
 *   Automation:  Tools (19 operations) — CRUD, query, relate, upload/download
 *   Judgment:    Prompts (4 perspectives) — setup, modeling, role views, audit
 *   Insight:     ConsoleInsight for every operation
 *
 * Environment Variables:
 *   CF_ACCOUNT_ID       - Cloudflare account ID
 *   CF_API_TOKEN         - Cloudflare API token (D1 access)
 *   CF_D1_DATABASE_ID    - D1 database ID
 *   R2_ACCESS_KEY_ID     - R2 S3-compatible access key
 *   R2_SECRET_ACCESS_KEY - R2 S3-compatible secret key
 *   R2_BUCKET_NAME       - R2 bucket name
 */

import { ConsoleInsight } from '@create-something/mcp-core';
import { SubstrateAuth } from './auth.js';
import { createSubstrateServer } from './server.js';

const server = createSubstrateServer({
  authProvider: new SubstrateAuth({ source: { type: 'env' } }),
  insight: new ConsoleInsight(),
});

server.serveStdio().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
