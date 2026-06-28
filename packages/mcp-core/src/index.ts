/**
 * @create-something/mcp-core
 *
 * Multi-account MCP abstractions. The primitive is always relative.
 *
 * Every MCP server built with this package scopes its Resources, Tools,
 * and Prompts to an AccountContext — a typed Artifact carrying identity
 * (Database tier), authorization (Automation tier), and policy (Judgment tier).
 *
 * Three-Tier Framework alignment:
 *   - Database:    TokenStore, TokenSet, TokenProvider (what exists)
 *   - Automation:  ScopedMcpServer, createScopedServer (what happens)
 *   - Judgment:    AccountPolicy, AuthProvider (what should happen)
 *   - Insight:     InsightEmitter, InsightEvent (cross-cutting observability)
 *   - Artifacts:   AccountContext (the boundary contract between tiers)
 *
 * @example
 * ```typescript
 * import {
 *   createScopedServer,
 *   StdioSingleUser,
 *   FileTokenStore,
 *   ConsoleInsight,
 *   jsonContent,
 * } from '@create-something/mcp-core';
 * import { z } from 'zod';
 *
 * const server = createScopedServer({
 *   name: 'my-service-mcp',
 *   version: '1.0.0',
 *   authProvider: new StdioSingleUser({
 *     tokenSource: { type: 'env', name: 'MY_API_TOKEN' },
 *   }),
 *   insight: new ConsoleInsight(),
 * });
 *
 * server.tool('list_items', 'List items for the account', {
 *   limit: z.number().optional(),
 * }, async (params, ctx) => {
 *   // ctx.accountId scopes the request — the primitive is relative
 *   return jsonContent({ accountId: ctx.accountId, items: [] });
 * }, { readOnly: true });
 *
 * await server.serveStdio();
 * ```
 */

// =============================================================================
// Core Types (the Artifact)
// =============================================================================

export type {
  AccountContext,
  AccountPolicy,
  TokenProvider,
  TokenSet,
  TokenStore,
} from './context.js';

export { defaultPolicy } from './context.js';

// =============================================================================
// Auth (Database + Judgment bridge)
// =============================================================================

export type { AuthProvider } from './auth.js';
export {
  buildOAuthAuthorizationServerMetadata,
  buildOAuthProtectedResourceMetadata,
  isOAuthAuthorizationServerPath,
  isOAuthProtectedResourcePath,
} from './oauth-discovery.js';
export type { OAuthDiscoveryOptions } from './oauth-discovery.js';

// =============================================================================
// Server (Automation tier)
// =============================================================================

export {
  ScopedMcpServer,
  createScopedServer,
  AuthError,
  jsonContent,
  errorContent,
} from './server.js';

export type {
  ScopedServerConfig,
  ScopedToolHandler,
  ScopedResourceHandler,
  ScopedPromptHandler,
  ToolResult,
  ResourceResult,
  PromptResult,
} from './server.js';

// =============================================================================
// Insight (cross-cutting observability)
// =============================================================================

export type { InsightEmitter, InsightEvent } from './insight.js';
export { scopedInsight, withInsight } from './insight.js';

// =============================================================================
// Feedback (cross-cutting — Insight applied to content quality)
// =============================================================================

export type { FeedbackStore, FeedbackEntry } from './feedback.js';
export { FEEDBACK_TOOL_SCHEMA, createFeedbackToolHandler, registerFeedbackTool } from './feedback.js';

// =============================================================================
// Telemetry (cross-cutting — run metering, health, activity)
// =============================================================================

export {
  enableTelemetry,
  recordMcpToolInvocation,
  recordInvocation,
  getUsage,
  getHealth,
  getActivity,
  cleanupOldInvocations,
  TELEMETRY_MIGRATION,
} from './telemetry.js';

export type {
  UsageResult,
  HealthResult,
  ActivityResult,
  RunCountRow,
  ToolInvocationRow,
  BraintrustTelemetryOptions,
} from './telemetry.js';

// =============================================================================
// Auth Providers
// =============================================================================

export { OAuthProvider } from './providers/oauth.js';
export type { OAuthConfig } from './providers/oauth.js';

export { APIKeyProvider } from './providers/api-key.js';
export type { APIKeyConfig } from './providers/api-key.js';

export { StdioSingleUser } from './providers/stdio.js';
export type { StdioConfig } from './providers/stdio.js';

// =============================================================================
// Token Stores
// =============================================================================

export { FileTokenStore } from './stores/file.js';
export { KVTokenStore } from './stores/kv.js';
export type { KVNamespace } from './stores/kv.js';
export { D1TokenStore } from './stores/d1.js';
export type { D1Database, D1PreparedStatement } from './stores/d1.js';
export { D1FeedbackStore } from './stores/d1-feedback.js';

// =============================================================================
// Insight Adapters
// =============================================================================

export { ConsoleInsight } from './insight/console.js';
export { WorkerInsight } from './insight/worker.js';
export type { InsightCollector, InsightDataPoint } from './insight/worker.js';
export { NoopInsight } from './insight/noop.js';
