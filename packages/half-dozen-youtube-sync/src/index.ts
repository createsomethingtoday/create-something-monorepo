#!/usr/bin/env node

// Load environment variables from .env file
import 'dotenv/config';

/**
 * Half Dozen YouTube Sync MCP Server — stdio entry point
 *
 * For local development and direct integration with Claude Desktop,
 * Cursor, and other MCP clients that support stdio transport.
 *
 * Architecture (Three-Tier Framework):
 *   Database tier (Resources)   — Server status, video transcripts
 *   Automation tier (Tools)     — Session mgmt, extraction, Notion sync, pipeline
 *   Judgment tier (Prompts)     — Guided sync workflow, transcript analysis
 *
 * For remote access, use the Cloudflare Worker deployment (worker/index.ts).
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { SERVER_NAME, SERVER_VERSION } from './config.js';
import { registerTools } from './tools.js';
import { registerResources } from './resources.js';
import { registerPrompts } from './prompts.js';
import { resetProvider } from './providers/steel.js';
import { resetNotionClient } from './notion/client.js';
import {
  initYouTubeSyncObservability,
  shutdownObservability,
} from './observability.js';

// =============================================================================
// Server Initialization
// =============================================================================

async function main() {
  initYouTubeSyncObservability();

  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  // Register all three tiers
  registerResources(server);
  registerTools(server);
  registerPrompts(server);

  // Lifecycle
  async function shutdown() {
    resetProvider();
    resetNotionClient();
    await shutdownObservability();
    process.exit(0);
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Connect via stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(`${SERVER_NAME} v${SERVER_VERSION} running on stdio`);
  console.error('Tiers: Resources (2) + Tools (11) + Prompts (2)');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
