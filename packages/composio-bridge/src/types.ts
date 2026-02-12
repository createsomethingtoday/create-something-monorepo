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
   * User ID resolver — maps mcp-core's accountId to Composio's userId.
   *
   * Composio uses "entity_id" to scope connected accounts. This function
   * bridges the two identity systems.
   *
   * Defaults to identity (accountId is used as-is).
   */
  resolveUserId?: (accountId: string) => string | Promise<string>;
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
