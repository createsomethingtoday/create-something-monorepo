#!/usr/bin/env node

/**
 * Webflow Marketplace MCP Server
 * 
 * Agent-native tools for the Webflow Marketplace team.
 * Exposes plagiarism detection, template analysis, and more via MCP.
 * 
 * Usage:
 *   node dist/index.js              # Run as MCP server (stdio)
 *   webflow-mcp                     # If installed globally
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { WEBFLOW_ORIGINALITY_SERVER_NAME, createWebflowMcpServer } from './server.js';

export {
  WEBFLOW_ORIGINALITY_SERVER_NAME,
  WEBFLOW_ORIGINALITY_SERVER_VERSION,
  createWebflowMcpServer,
} from './server.js';

// =============================================================================
// Start Server
// =============================================================================

export async function startWebflowMcpStdio(): Promise<void> {
  const transport = new StdioServerTransport();
  const server = createWebflowMcpServer();
  await server.connect(transport);
  console.error('Webflow MCP server running on stdio');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startWebflowMcpStdio().catch((error) => {
    console.error('Webflow MCP server failed to start:', error);
    process.exit(1);
  });
}
