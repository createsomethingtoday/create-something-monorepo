#!/usr/bin/env node
/**
 * App Reviewer Airtable MCP Server — stdio entry point
 *
 * Architecture (Three-Tier Framework):
 *   Database tier (Resources)   — Account-scoped data
 *   Automation tier (Tools)     — Account-scoped actions
 *   Judgment tier (Prompts)     — Account-scoped policy templates
 *
 * Every primitive is relative to the authenticated AccountContext.
 */

import { createServer } from './server.js';

async function main() {
  const server = createServer();
  await server.serveStdio();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
