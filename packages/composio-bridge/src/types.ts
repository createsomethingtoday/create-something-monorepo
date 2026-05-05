/**
 * Composio Bridge — Shared Types
 *
 * Types for configuring the bridge between Composio's managed integrations
 * and mcp-core's ScopedMcpServer. These define the contract for the wrap
 * pattern: client sees CREATE SOMETHING MCP, Composio is plumbing underneath.
 *
 * Three-Tier alignment:
 *   - Database:    ComposioAccount (connected account state)
 *   - Automation:  ToolConfig, AppConfig (what tools to register)
 *   - Judgment:    DepthClassification (when to use Composio vs custom)
 */

// =============================================================================
// Client Configuration
// =============================================================================

/**
 * Configuration for the Composio SDK client wrapper.
 *
 * Workers-safe: uses fetch-based SDK, no Node.js-specific APIs.
 */
export interface ComposioClientConfig {
  /** Composio API key — from https://app.composio.dev/settings */
  apiKey: string;

  /** Base URL for the Composio API. Defaults to production. */
  baseURL?: string;

  /**
   * Custom fetch implementation.
   * Use this in Cloudflare Workers or environments with a non-global fetch.
   */
  fetch?: typeof globalThis.fetch;

  /** Request timeout in milliseconds. Defaults to 30_000. */
  timeoutMs?: number;

  /**
   * Centralized execution policy for Composio SDK calls.
   *
   * Defaults to safe retries for idempotent reads (tool discovery, toolkit list,
   * connected account checks), and no automatic retries for tool execution.
   */
  executionPolicy?: ComposioExecutionPolicy;
}

/**
 * Retry behavior for Composio SDK calls.
 */
export interface ComposioRetryPolicy {
  /**
   * Maximum number of attempts, including the first call.
   * Defaults to 3.
   */
  maxAttempts?: number;

  /**
   * Base delay before retrying attempt #2 (milliseconds).
   * Defaults to 250ms.
   */
  baseDelayMs?: number;

  /**
   * Maximum backoff delay per attempt (milliseconds).
   * Defaults to 4_000ms.
   */
  maxDelayMs?: number;

  /**
   * Jitter ratio applied to backoff delay to avoid thundering herd.
   * Defaults to 0.2 (±20% jitter).
   */
  jitterRatio?: number;

  /**
   * HTTP status codes considered retryable.
   * Defaults include standard transient classes (408/429/5xx).
   */
  retryableStatusCodes?: number[];

  /**
   * Transport/runtime error codes considered retryable.
   * Examples: ETIMEDOUT, ECONNRESET, EAI_AGAIN.
   */
  retryableErrorCodes?: string[];
}

/**
 * Shared policy controls for Composio operations.
 */
export interface ComposioExecutionPolicy {
  /**
   * Retry mode:
   * - off: disable all retries
   * - safe: retry only idempotent read operations
   * - all: retry all operations, including tool execution
   *
   * Defaults to 'safe'.
   */
  retryMode?: 'off' | 'safe' | 'all';

  /**
   * Retry tuning.
   */
  retry?: ComposioRetryPolicy;
}

/**
 * Options for fetching Composio tool definitions.
 *
 * By default, Composio auto-applies "important" filtering for toolkit lookups.
 * Set `important: false` for full-surface discovery.
 */
export interface ComposioToolDiscoveryOptions {
  /** Max tools to return from Composio. */
  limit?: number;
  /** Search query for tool names/descriptions. */
  search?: string;
  /** Restrict to auth config IDs. */
  authConfigIds?: string[];
  /** Include only important tools when true; all tools when false. */
  important?: boolean;
}

/**
 * Options for listing Composio toolkits.
 */
export interface ComposioToolkitListOptions {
  /** Optional category filter. */
  category?: string;
  /** Source of toolkits. Defaults to Composio SDK behavior. */
  managedBy?: 'all' | 'composio' | 'project';
  /** Sort order. */
  sortBy?: 'usage' | 'alphabetically';
  /** Optional request page size hint. */
  limit?: number;
  /** Optional cursor hint (when supported by SDK/backend). */
  cursor?: string;
}

/**
 * Normalized Composio toolkit summary for inventory/sync flows.
 */
export interface ComposioToolkitSummary {
  /** Toolkit slug (e.g. "gmail"). */
  slug: string;
  /** Human-friendly name. */
  name: string;
  /** Optional toolkit description. */
  description?: string;
  /** Category slugs for grouping/bundles. */
  categories: string[];
  /** Approximate number of tools in this toolkit. */
  toolsCount?: number;
  /** Approximate number of triggers in this toolkit. */
  triggersCount?: number;
  /** Available toolkit versions, if provided. */
  availableVersions?: string[];
  /** Composio-auth schemes supported by this toolkit. */
  authSchemes?: string[];
  /** Composio-managed auth schemes supported by this toolkit. */
  composioManagedAuthSchemes?: string[];
  /** Whether this toolkit can run without auth. */
  noAuth?: boolean;
  /** Whether this toolkit is local/project scoped in Composio. */
  isLocalToolkit: boolean;
}

// =============================================================================
// Composio-hosted MCP configuration
// =============================================================================

/**
 * Toolkit binding used when creating a Composio-hosted MCP config.
 */
export interface ComposioMcpToolkitConfig {
  /** Toolkit slug, e.g. "quickbooks". */
  toolkit: string;
  /** Composio auth config ID, e.g. "ac_xyz123". */
  authConfigId: string;
}

/**
 * Input for creating a Composio-hosted MCP config.
 */
export interface ComposioMcpCreateInput {
  /** Human-readable server/config name. */
  name: string;
  /** One or more toolkit bindings. */
  toolkits: ComposioMcpToolkitConfig[];
  /** Optional allowlist of Composio tool slugs. Omit to expose toolkit defaults. */
  allowedTools?: string[];
}

/**
 * Normalized response for a Composio-hosted MCP config.
 */
export interface ComposioMcpServerConfig {
  id: string;
  name?: string;
  [key: string]: unknown;
}

/**
 * Normalized response for a generated per-user Composio MCP URL.
 */
export interface ComposioMcpGeneratedInstance {
  url: string;
  [key: string]: unknown;
}

// =============================================================================
// App & Tool Configuration
// =============================================================================

/**
 * Configuration for which Composio apps and tools to expose via MCP.
 *
 * The wrap pattern: specify which commodity apps to delegate to Composio.
 * Deep integrations (QuickBooks, scheduling, substrate) stay custom.
 */
export interface AppConfig {
  /** Composio app identifier (e.g., 'SLACK', 'HUBSPOT', 'JIRA') */
  app: string;

  /**
   * Specific actions to expose. If omitted, all actions for the app are exposed.
   * Use this to limit surface area — only expose what the client actually needs.
   */
  actions?: string[];

  /**
   * Tool name prefix. Defaults to lowercase app name.
   * e.g., app='SLACK' → tools are 'slack_send_message', 'slack_list_channels'
   */
  prefix?: string;

  /**
   * Mark all tools from this app as read-only.
   * When true, tools are registered with { readOnly: true } and survive
   * AccountPolicy.readOnly enforcement.
   */
  readOnly?: boolean;
}

/**
 * Configuration for the ComposioToolFactory.
 */
export interface ToolFactoryConfig extends ComposioClientConfig {
  /** Apps to register tools for */
  apps: AppConfig[] | string[];

  /**
   * Tool discovery controls passed through to Composio getRawComposioTools().
   * Keep undefined to preserve existing default behavior.
   */
  toolDiscovery?: ComposioToolDiscoveryOptions;

  /**
   * User ID resolver — maps mcp-core's accountId to Composio's userId.
   *
   * Composio uses "entity_id" to scope connected accounts. This function
   * bridges the two identity systems.
   *
   * Defaults to identity (accountId is used as-is).
   */
  resolveUserId?: (accountId: string) => string | Promise<string>;

  /**
   * Optional execution hooks for request/response middleware.
   *
   * Use this for cross-cutting concerns like:
   * - request normalization
   * - response redaction and output safety
   * - metering and trace annotations
   */
  executionHooks?: ComposioToolExecutionHooks;
}

/**
 * Tool registration path where execution happened.
 */
export type ComposioRegistrationMode = 'scoped' | 'mcp_server' | 'resolver';

/**
 * Shared execution metadata for hook contexts.
 */
export interface ComposioExecutionContextBase {
  app: string;
  toolName: string;
  toolSlug: string;
  entityId: string;
  mode: ComposioRegistrationMode;
}

/**
 * Context passed to beforeExecute hooks.
 */
export interface ComposioBeforeExecuteContext extends ComposioExecutionContextBase {
  params: Record<string, unknown>;
}

/**
 * Context passed to afterExecute hooks.
 */
export interface ComposioAfterExecuteContext extends ComposioExecutionContextBase {
  params: Record<string, unknown>;
  result: Record<string, unknown>;
}

/**
 * Optional hook called before execution.
 *
 * Return a params object to replace the current params.
 * Return void to keep params unchanged.
 */
export type ComposioBeforeExecuteHook = (
  ctx: ComposioBeforeExecuteContext,
) => Record<string, unknown> | void | Promise<Record<string, unknown> | void>;

/**
 * Optional hook called after execution.
 *
 * Must return the result object that should be exposed to the MCP client.
 */
export type ComposioAfterExecuteHook = (
  ctx: ComposioAfterExecuteContext,
) => Record<string, unknown> | Promise<Record<string, unknown>>;

/**
 * Execution hook collection for tool middleware.
 */
export interface ComposioToolExecutionHooks {
  beforeExecute?: ComposioBeforeExecuteHook[];
  afterExecute?: ComposioAfterExecuteHook[];
}

// =============================================================================
// Raw McpServer adapter (for non-ScopedMcpServer usage)
// =============================================================================

/**
 * Minimal MCP server interface for registering Composio tools without
 * AccountContext (e.g. McpServer from @modelcontextprotocol/sdk used by
 * McpAgent workers).
 *
 * Use registerToolsOnMcpServer() to add Composio tools to such a server
 * with a fixed entityId (e.g. 'default').
 */
export interface McpServerLike {
  tool(
    name: string,
    description: string,
    schema: Record<string, import('zod').ZodTypeAny>,
    handler: (
      params: Record<string, unknown>,
    ) => Promise<{ content: Array<{ type: 'text'; text: string }> }>,
  ): void;
}

// =============================================================================
// Connected Account Mapping
// =============================================================================

/**
 * Represents a Composio connected account — the Database tier artifact
 * for a user's OAuth connection managed by Composio.
 */
export interface ComposioAccount {
  /** Composio's internal connection ID */
  connectionId: string;

  /** The app this connection is for (e.g., 'SLACK') */
  app: string;

  /** Composio entity/user ID */
  entityId: string;

  /** Connection status */
  status: 'active' | 'expired' | 'revoked' | 'pending';

  /** When the connection was created */
  createdAt?: string;

  /** Optional raw provider status for debugging and UI surfacing. */
  rawStatus?: string;
}

// =============================================================================
// Depth Classification (Decision Matrix)
// =============================================================================

/**
 * Classifies an integration need as commodity (Composio) or deep (custom).
 *
 * This is the Judgment tier applied to build-vs-buy:
 *   - commodity: Composio-wrapped, fast, ~90% margin
 *   - deep: Custom MCP, slower, higher absolute value
 *   - hybrid: Composio for CRUD, custom for domain logic
 */
export type DepthClassification = 'commodity' | 'deep' | 'hybrid';

/**
 * Decision criteria for choosing Composio vs custom build.
 *
 * Used by the evaluation scripts and documented in COMPOSIO_EVALUATION.md.
 */
export interface IntegrationDecision {
  /** The integration being evaluated */
  app: string;

  /** Classification result */
  classification: DepthClassification;

  /** Why this classification */
  rationale: string;

  /** Estimated hours if built custom */
  customHours?: number;

  /** Estimated hours if Composio-wrapped */
  composioHours?: number;

  /** Does this need domain-specific logic beyond CRUD? */
  requiresDomainLogic: boolean;

  /** Does this need Three-Tier alignment (Resources, Prompts)? */
  requiresThreeTier: boolean;
}

// =============================================================================
// Evaluation Types
// =============================================================================

/**
 * Result from a single evaluation test.
 */
export interface EvalResult {
  /** Test name */
  test: string;

  /** Did it pass? */
  passed: boolean;

  /** Latency in milliseconds (if applicable) */
  latencyMs?: number;

  /** Details or error message */
  details: string;

  /** Timestamp */
  timestamp: string;
}

/**
 * Aggregated evaluation report.
 */
export interface EvalReport {
  /** Date of evaluation */
  date: string;

  /** SDK version tested */
  sdkVersion: string;

  /** Workers compatibility */
  workersCompat: boolean;

  /** Individual test results */
  results: EvalResult[];

  /** Overall recommendation */
  recommendation: 'adopt' | 'reject' | 'conditional';

  /** Summary rationale */
  summary: string;
}
