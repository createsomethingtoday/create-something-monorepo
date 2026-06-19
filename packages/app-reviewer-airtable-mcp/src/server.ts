/**
 * App Reviewer Airtable MCP Server — server setup
 *
 * Creates a ScopedMcpServer with all three tiers registered.
 * The primitive is always relative — every handler receives AccountContext.
 */

import { createScopedServer, ConsoleInsight } from '@create-something/mcp-core';

import { registerTools } from './tools/index.js';
import { registerResources } from './resources/index.js';
import { registerPrompts } from './prompts/index.js';
import { AppReviewerAirtableAuthProvider, type AppReviewerAirtableEnv } from './auth.js';
import { SERVER_NAME, SERVER_VERSION } from './schemas/index.js';
import type { ScopedMcpServer } from '@create-something/mcp-core';

/**
 * Create and configure the MCP server.
 *
 * Customize the authProvider for your service:
 *   - StdioSingleUser: local dev (reads from env)
 *   - OAuthProvider: OAuth 2.0 services
 *   - APIKeyProvider: API key-based services
 */
export function createServer(): ScopedMcpServer<AppReviewerAirtableEnv> {
  const server = createScopedServer<AppReviewerAirtableEnv>({
    name: SERVER_NAME,
    version: SERVER_VERSION,
    authProvider: new AppReviewerAirtableAuthProvider(),
    insight: new ConsoleInsight(),
  });

  // Register all three tiers
  registerTools(server);
  registerResources(server);
  registerPrompts(server);

  return server;
}
