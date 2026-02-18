/**
 * Interaction Atlas MCP Server — server setup
 *
 * Creates a ScopedMcpServer with all three tiers registered.
 * The primitive is always relative — every handler receives AccountContext.
 */

import {
  createScopedServer,
  ConsoleInsight,
} from '@create-something/mcp-core';

import { registerTools } from './tools/index.js';
import { registerResources } from './resources/index.js';
import { registerPrompts } from './prompts/index.js';
import type { ScopedMcpServer } from '@create-something/mcp-core';
import { InteractionAtlasAuthProvider, type InteractionAtlasEnv } from './auth.js';

/**
 * Create and configure the MCP server.
 *
 * Customize the authProvider for your service:
 *   - StdioSingleUser: local dev (reads from env)
 *   - OAuthProvider: OAuth 2.0 services
 *   - APIKeyProvider: API key-based services
 */
export function createServer(): ScopedMcpServer<InteractionAtlasEnv> {
  const server = createScopedServer<InteractionAtlasEnv>({
    name: 'interaction-atlas-mcp',
    version: '0.1.0',

    // V1: public read-only + optional x-api-key/Bearer scoping.
    authProvider: new InteractionAtlasAuthProvider(),

    // --- Insight: swap for WorkerInsight in production ---
    insight: new ConsoleInsight(),
  });

  // Register all three tiers
  registerTools(server);
  registerResources(server);
  registerPrompts(server);

  return server;
}
