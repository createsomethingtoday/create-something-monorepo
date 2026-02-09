/**
 * Substrate MCP Server — ScopedMcpServer setup for stdio mode.
 *
 * Bridges the ScopedMcpServer's AccountContext-based auth into the
 * accessor pattern used by the shared registration functions.
 *
 * For Worker/remote mode, see worker/index.ts which uses McpAgent.
 */

import { createScopedServer } from '@create-something/mcp-core';
import type { ScopedMcpServer, AuthProvider, InsightEmitter } from '@create-something/mcp-core';
import { restExecutor, s3R2Store } from './services/executor.js';
import { getD1Config, getR2Config } from './auth.js';
import { registerTools } from './tools/index.js';
import { registerResources } from './resources/index.js';
import { registerPrompts } from './prompts/index.js';

export interface SubstrateServerConfig {
  authProvider: AuthProvider;
  insight?: InsightEmitter;
}

/**
 * Create the Substrate MCP server for stdio mode.
 *
 * The ScopedMcpServer wraps each handler call with AccountContext.
 * We pre-resolve the context at server creation (single-user stdio)
 * and create REST/S3 executors from it.
 */
export function createSubstrateServer(config: SubstrateServerConfig): ScopedMcpServer {
  const server = createScopedServer({
    name: 'substrate-mcp',
    version: '0.1.0',
    authProvider: config.authProvider,
    insight: config.insight,
  });

  // For stdio mode, resolve config once at startup and create executors.
  // The ScopedMcpServer handlers receive AccountContext but we need
  // plain accessors for the shared registration functions.
  // We lazily resolve from the auth provider on first use.

  let _d1Exec: ReturnType<typeof restExecutor> | null = null;
  let _r2Store: ReturnType<typeof s3R2Store> | null = null;
  let _actor = 'default';

  const lazyInit = async () => {
    if (!_d1Exec) {
      const ctx = await config.authProvider.resolve(null);
      _d1Exec = restExecutor(getD1Config(ctx));
      _r2Store = s3R2Store(getR2Config(ctx));
      _actor = ctx.accountId;
    }
  };

  // Eagerly init (stdio is single-user, config is static)
  lazyInit().catch(() => { /* will fail at tool call time with clear error */ });

  const getD1 = () => {
    if (!_d1Exec) throw new Error('Substrate not initialized — check env vars');
    return _d1Exec;
  };
  const getR2 = () => {
    if (!_r2Store) throw new Error('Substrate not initialized — check env vars');
    return _r2Store;
  };
  const getActor = () => _actor;

  // Register all three tiers with the shared functions.
  // The ScopedMcpServer's .tool/.resource/.prompt accept the same shape
  // as our AnyMcpServer interface (the extra AccountContext arg is ignored
  // by our handlers since we use the pre-resolved accessors).
  registerTools(server as unknown as Parameters<typeof registerTools>[0], getD1, getR2, getActor);
  registerResources(server as unknown as Parameters<typeof registerResources>[0], getD1);
  registerPrompts(server as unknown as Parameters<typeof registerPrompts>[0], getD1);

  return server;
}
