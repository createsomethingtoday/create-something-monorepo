/**
 * @create-something/composio-bridge
 *
 * Thin adapter between Composio SDK and mcp-core — invisible plumbing
 * for commodity integrations via the wrap pattern.
 *
 * Client sees CREATE SOMETHING MCP. Composio is infrastructure underneath.
 *
 * Usage:
 * ```typescript
 * import {
 *   ComposioToolFactory,
 *   ComposioAuthProvider,
 * } from '@create-something/composio-bridge';
 * import { createScopedServer } from '@create-something/mcp-core';
 *
 * const server = createScopedServer({
 *   name: 'client-mcp',
 *   version: '1.0.0',
 *   authProvider: new ComposioAuthProvider({
 *     apiKey: env.COMPOSIO_API_KEY,
 *   }),
 * });
 *
 * const factory = new ComposioToolFactory({
 *   apiKey: env.COMPOSIO_API_KEY,
 *   apps: ['SLACK', 'HUBSPOT'],
 * });
 *
 * await factory.registerTools(server);
 * await server.serveStdio();
 * ```
 *
 * Three-Tier alignment:
 *   - Database:    ComposioAccount, connected account state
 *   - Automation:  ComposioToolFactory, tool registration + execution
 *   - Judgment:    ComposioAuthProvider, policy per account
 */

// =============================================================================
// Core — The Wrap Pattern API
// =============================================================================

export { ComposioToolFactory } from './tool-factory.js';
export {
  ComposioAuthProvider,
  ComposioTokenProvider,
} from './auth-bridge.js';
export type { ComposioAuthProviderConfig } from './auth-bridge.js';

// =============================================================================
// Client — Low-level Composio SDK wrapper
// =============================================================================

export { ComposioClient, ComposioBridgeError } from './client.js';
export type { ComposioToolDef } from './client.js';

// =============================================================================
// Security — Redaction middleware and policy artifacts
// =============================================================================

export {
  DEFAULT_SECURE_OUTPUT_POLICY,
  composeSecureOutputPolicies,
  createSecureOutputRedactionHook,
  redactSensitiveResult,
  resolveSecureOutputRules,
} from './security.js';

// =============================================================================
// Types — Configuration and Decision Framework
// =============================================================================

export type {
  ComposioClientConfig,
  ComposioExecutionPolicy,
  ComposioRetryPolicy,
  AppConfig,
  ComposioToolDiscoveryOptions,
  ComposioToolkitListOptions,
  ComposioToolkitSummary,
  ComposioMcpCreateInput,
  ComposioMcpGeneratedInstance,
  ComposioMcpServerConfig,
  ComposioMcpToolkitConfig,
  ToolFactoryConfig,
  ComposioRegistrationMode,
  ComposioExecutionContextBase,
  ComposioBeforeExecuteContext,
  ComposioAfterExecuteContext,
  ComposioBeforeExecuteHook,
  ComposioAfterExecuteHook,
  ComposioToolExecutionHooks,
  ComposioAccount,
  McpServerLike,
  DepthClassification,
  IntegrationDecision,
  EvalResult,
  EvalReport,
} from './types.js';

export type {
  SecureOutputRuleSet,
  SecureOutputPolicyArtifact,
} from './security.js';
