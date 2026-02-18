/**
 * Interaction Atlas MCP Server — server setup
 *
 * Creates a ScopedMcpServer with all three tiers registered.
 * The primitive is always relative — every handler receives AccountContext.
 */
import type { ScopedMcpServer } from '@create-something/mcp-core';
import { type InteractionAtlasEnv } from './auth.js';
/**
 * Create and configure the MCP server.
 *
 * Customize the authProvider for your service:
 *   - StdioSingleUser: local dev (reads from env)
 *   - OAuthProvider: OAuth 2.0 services
 *   - APIKeyProvider: API key-based services
 */
export declare function createServer(): ScopedMcpServer<InteractionAtlasEnv>;
//# sourceMappingURL=server.d.ts.map