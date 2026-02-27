/**
 * ScopedMcpServer — the Automation tier wrapper
 *
 * A thin wrapper around McpServer that injects AccountContext into every
 * tool, resource, and prompt handler. This is the mechanism that makes
 * "the primitive is always relative" structural, not aspirational.
 *
 * How it works:
 *   1. You register tools/resources/prompts with handlers that receive AccountContext
 *   2. At serve time, the AuthProvider resolves the caller to an AccountContext
 *   3. A real McpServer is built with handlers pre-bound to that context
 *   4. Policy is enforced at registration time (allowedTools, readOnly)
 *   5. Insight events are emitted for every operation
 *
 * Two serve modes:
 *   - serveStdio(): resolve context once (request=null), serve on stdio
 *   - handleRequest(req, env): resolve context per-request, return Response
 *
 * Three-Tier Framework alignment:
 *   - This IS the Automation tier — model-controlled tool execution
 *   - It consumes Database tier (tokens via TokenProvider)
 *   - It enforces Judgment tier (policy via AccountPolicy)
 *   - It emits to Insight (cross-cutting observability)
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type {
  CallToolResult,
  ReadResourceResult,
  GetPromptResult,
} from '@modelcontextprotocol/sdk/types.js';
import type { ZodRawShape } from 'zod';

import type { AccountContext } from './context.js';
import type { AuthProvider } from './auth.js';
import type { InsightEmitter, InsightEvent } from './insight.js';
import type { FeedbackStore } from './feedback.js';
import { registerFeedbackTool } from './feedback.js';

// =============================================================================
// Re-export SDK result types for convenience
// =============================================================================

export type ToolResult = CallToolResult;
export type ResourceResult = ReadResourceResult;
export type PromptResult = GetPromptResult;

// =============================================================================
// Scoped Handler Types
// =============================================================================

/**
 * Tool handler that receives AccountContext.
 *
 * Same as McpServer's tool callback, but with `ctx` injected.
 * The `extra` parameter contains the MCP SDK's RequestHandlerExtra
 * (abort signal, session info, etc.).
 */
export type ScopedToolHandler = (
  params: Record<string, unknown>,
  ctx: AccountContext,
  extra: unknown,
) => Promise<CallToolResult>;

/**
 * Resource handler that receives AccountContext.
 */
export type ScopedResourceHandler = (
  uri: URL,
  ctx: AccountContext,
) => Promise<ReadResourceResult>;

/**
 * Prompt handler that receives AccountContext.
 */
export type ScopedPromptHandler = (
  params: Record<string, unknown>,
  ctx: AccountContext,
) => Promise<GetPromptResult>;

// =============================================================================
// Registration Definitions (stored until serve time)
// =============================================================================

interface ToolDefinition {
  name: string;
  description: string;
  schema: ZodRawShape;
  handler: ScopedToolHandler;
  /** If true, this tool only reads — safe even under readOnly policy */
  readOnly?: boolean;
}

interface ResourceDefinition {
  name: string;
  uri: string;
  metadata: { description?: string; mimeType?: string };
  handler: ScopedResourceHandler;
}

interface PromptDefinition {
  name: string;
  description: string;
  schema?: ZodRawShape;
  handler: ScopedPromptHandler;
}

// =============================================================================
// Configuration
// =============================================================================

export interface ScopedServerConfig<TEnv = unknown> {
  /** Server name (appears in MCP server info) */
  name: string;

  /** Server version */
  version: string;

  /** Optional icons for visual identification in client UIs (SEP-973) */
  icons?: Array<{ src: string; mimeType?: string; sizes?: string[]; theme?: 'light' | 'dark' }>;

  /** Resolves requests to AccountContext */
  authProvider: AuthProvider<TEnv>;

  /** Optional insight emitter for observability */
  insight?: InsightEmitter;

  /**
   * Optional feedback store for user-reported issues.
   *
   * When provided, a `submit_feedback` tool is automatically registered
   * on every server built from this config. Users can report corrections,
   * suggestions, errors, or praise — the perceptual membrane applied to
   * content quality.
   *
   * All MCPs sharing a database get a unified feedback view.
   * The server name is captured automatically to distinguish sources.
   */
  feedbackStore?: FeedbackStore;
}

// =============================================================================
// No-op Insight (used when no emitter is configured)
// =============================================================================

const noopInsight: InsightEmitter = { emit() {} };

// =============================================================================
// ScopedMcpServer
// =============================================================================

/**
 * MCP server where every primitive is relative to an AccountContext.
 *
 * Usage:
 * ```typescript
 * const server = createScopedServer({
 *   name: 'my-service-mcp',
 *   version: '1.0.0',
 *   authProvider: myAuthProvider,
 *   insight: new ConsoleInsight(),
 * });
 *
 * server.tool('list_items', 'List items for the account', {
 *   limit: z.number().optional(),
 * }, async (params, ctx) => {
 *   const items = await api.getItems(ctx.accountId, params.limit);
 *   return jsonContent(items);
 * });
 *
 * await server.serveStdio();
 * ```
 */
export class ScopedMcpServer<TEnv = unknown> {
  private readonly config: ScopedServerConfig<TEnv>;
  private readonly insight: InsightEmitter;

  private readonly toolDefs: ToolDefinition[] = [];
  private readonly resourceDefs: ResourceDefinition[] = [];
  private readonly promptDefs: PromptDefinition[] = [];

  constructor(config: ScopedServerConfig<TEnv>) {
    this.config = config;
    this.insight = config.insight ?? noopInsight;
  }

  // ===========================================================================
  // Registration API — mirrors McpServer but handlers receive AccountContext
  // ===========================================================================

  /**
   * Register a tool (Automation tier — model-controlled).
   *
   * @param name        - Tool name
   * @param description - Human-readable description
   * @param schema      - Zod schema for parameters
   * @param handler     - Handler that receives (params, ctx, extra)
   * @param options     - Additional options (readOnly hint)
   */
  tool(
    name: string,
    description: string,
    schema: ZodRawShape,
    handler: ScopedToolHandler,
    options?: { readOnly?: boolean },
  ): void {
    this.toolDefs.push({
      name,
      description,
      schema,
      handler,
      readOnly: options?.readOnly,
    });
  }

  /**
   * Register a resource (Database tier — application-controlled).
   *
   * @param name     - Resource name
   * @param uri      - Resource URI (e.g., 'service://items')
   * @param metadata - Description and MIME type
   * @param handler  - Handler that receives (uri, ctx)
   */
  resource(
    name: string,
    uri: string,
    metadata: { description?: string; mimeType?: string },
    handler: ScopedResourceHandler,
  ): void {
    this.resourceDefs.push({ name, uri, metadata, handler });
  }

  /**
   * Register a prompt (Judgment tier — user-controlled).
   *
   * @param name        - Prompt name
   * @param description - Human-readable description
   * @param schema      - Optional Zod schema for arguments
   * @param handler     - Handler that receives (params, ctx)
   */
  prompt(
    name: string,
    description: string,
    schema: ZodRawShape | undefined,
    handler: ScopedPromptHandler,
  ): void {
    this.promptDefs.push({ name, description, schema, handler });
  }

  // ===========================================================================
  // Server Building — bind handlers to a resolved AccountContext
  // ===========================================================================

  /**
   * Build a real McpServer with all handlers pre-bound to the given context.
   *
   * This is where policy enforcement happens:
   *   - allowedTools: skip tools not in the allowlist
   *   - readOnly: skip write tools (those without readOnly: true)
   *
   * This is where insight wiring happens:
   *   - Every tool/resource/prompt call emits an InsightEvent
   */
  private buildServer(ctx: AccountContext): McpServer {
    const server = new McpServer({
      name: this.config.name,
      version: this.config.version,
      ...(this.config.icons && { icons: this.config.icons }),
    });

    const insight = this.insight;
    const toolAccessMode = resolveToolAccessMode(ctx);

    // --- Tools (Automation) ---
    for (const def of this.toolDefs) {
      // Policy: emergency tool-access kill switch
      if (toolAccessMode === 'off') {
        continue;
      }

      // Policy: allowedTools filter
      if (ctx.policy.allowedTools && !ctx.policy.allowedTools.includes(def.name)) {
        continue;
      }

      // Policy: readOnly enforcement — skip write tools
      if ((ctx.policy.readOnly || toolAccessMode === 'read_only') && !def.readOnly) {
        continue;
      }

      server.tool(
        def.name,
        def.description,
        def.schema,
        async (params: Record<string, unknown>, extra: unknown) => {
          const start = Date.now();
          try {
            const result = await def.handler(params, ctx, extra);
            emitToolInsight(insight, ctx, def.name, true, Date.now() - start);
            return result;
          } catch (error) {
            emitToolInsight(insight, ctx, def.name, false, Date.now() - start, error);
            throw error;
          }
        },
      );
    }

    // --- Resources (Database) ---
    for (const def of this.resourceDefs) {
      server.resource(
        def.name,
        def.uri,
        def.metadata,
        async (uri: URL) => {
          insight.emit({
            accountId: ctx.accountId,
            tier: 'database',
            action: `resource:${def.name}`,
            timestamp: Date.now(),
          });
          return def.handler(uri, ctx);
        },
      );
    }

    // --- Prompts (Judgment) ---
    for (const def of this.promptDefs) {
      if (def.schema) {
        server.prompt(
          def.name,
          def.description,
          def.schema,
          async (params: Record<string, unknown>) => {
            insight.emit({
              accountId: ctx.accountId,
              tier: 'judgment',
              action: `prompt:${def.name}`,
              timestamp: Date.now(),
            });
            return def.handler(params, ctx);
          },
        );
      } else {
        server.prompt(
          def.name,
          def.description,
          async () => {
            insight.emit({
              accountId: ctx.accountId,
              tier: 'judgment',
              action: `prompt:${def.name}`,
              timestamp: Date.now(),
            });
            return def.handler({}, ctx);
          },
        );
      }
    }

    // --- Feedback (Insight — cross-cutting) ---
    if (this.config.feedbackStore) {
      registerFeedbackTool(server, this.config.feedbackStore, this.config.name, ctx.accountId);
    }

    return server;
  }

  // ===========================================================================
  // Transport: Stdio
  // ===========================================================================

  /**
   * Serve on stdio transport (single-user, local).
   *
   * Resolves AccountContext once with request=null, then serves.
   * This is the pattern for Claude Desktop, Claude Code, and other
   * MCP clients that connect via stdio.
   */
  async serveStdio(): Promise<void> {
    this.insight.emit({
      accountId: 'system',
      tier: 'automation',
      action: 'server:stdio:start',
      timestamp: Date.now(),
    });

    // Resolve context once (no request in stdio mode)
    const ctx = await this.config.authProvider.resolve(null);

    this.insight.emit({
      accountId: ctx.accountId,
      tier: 'database',
      action: 'auth:resolved',
      timestamp: Date.now(),
      metadata: {
        userId: ctx.userId,
        teamId: ctx.teamId,
        scopes: ctx.policy.scopes,
        readOnly: ctx.policy.readOnly,
      },
    });

    // Build server bound to this context
    const server = this.buildServer(ctx);

    // Connect stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error(`${this.config.name} v${this.config.version} running on stdio`);
    console.error(`Account: ${ctx.accountId}${ctx.userId ? ` (user: ${ctx.userId})` : ''}`);
  }

  // ===========================================================================
  // Transport: HTTP (Cloudflare Workers / Node.js)
  // ===========================================================================

  /**
   * Handle an HTTP request (multi-user, per-request context resolution).
   *
   * Resolves AccountContext from the request, builds a scoped server,
   * connects it to a StreamableHTTP transport, and returns the response.
   *
   * Use this in a Cloudflare Worker's fetch handler or an Express route.
   *
   * Note: requires @modelcontextprotocol/sdk's WebStandard transport
   * (imported dynamically to avoid bundling in stdio-only deployments).
   */
  async handleRequest(request: Request, env?: TEnv): Promise<Response> {
    const start = Date.now();

    try {
      // Resolve context from the incoming request
      const ctx = await this.config.authProvider.resolve(request, env);

      this.insight.emit({
        accountId: ctx.accountId,
        tier: 'database',
        action: 'auth:resolved',
        timestamp: start,
        metadata: {
          userId: ctx.userId,
          teamId: ctx.teamId,
          method: request.method,
          url: request.url,
        },
      });

      // Build server scoped to this account
      const server = this.buildServer(ctx);

      // Dynamic import — avoids bundling WebStandard transport in stdio builds
      const { WebStandardStreamableHTTPServerTransport } = await import(
        '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
      );

      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });

      await server.connect(transport);
      return await transport.handleRequest(request);
    } catch (error) {
      this.insight.emit({
        accountId: 'unknown',
        tier: 'automation',
        action: 'server:http:error',
        success: false,
        durationMs: Date.now() - start,
        timestamp: start,
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      });

      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
        { status: error instanceof AuthError ? 401 : 500, headers: { 'Content-Type': 'application/json' } },
      );
    }
  }
}

type ToolAccessMode = 'normal' | 'read_only' | 'off';

function resolveToolAccessMode(ctx: AccountContext): ToolAccessMode {
  const raw = ctx.policy.constraints?.mcpToolAccessMode;
  if (typeof raw !== 'string') return 'normal';
  const normalized = raw.trim().toLowerCase();
  if (normalized === 'off' || normalized === 'deny_all' || normalized === 'disabled') return 'off';
  if (normalized === 'read_only' || normalized === 'read-only' || normalized === 'readonly') return 'read_only';
  return 'normal';
}

// =============================================================================
// Auth Error — thrown by AuthProviders for 401 responses
// =============================================================================

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Create a scoped MCP server.
 *
 * Every tool, resource, and prompt registered on this server will receive
 * an AccountContext — the primitive is always relative.
 */
export function createScopedServer<TEnv = unknown>(
  config: ScopedServerConfig<TEnv>,
): ScopedMcpServer<TEnv> {
  return new ScopedMcpServer(config);
}

// =============================================================================
// Helpers
// =============================================================================

/** Emit an InsightEvent for a tool invocation */
function emitToolInsight(
  insight: InsightEmitter,
  ctx: AccountContext,
  toolName: string,
  success: boolean,
  durationMs: number,
  error?: unknown,
): void {
  const event: InsightEvent = {
    accountId: ctx.accountId,
    tier: 'automation',
    action: `tool:${toolName}`,
    success,
    durationMs,
    timestamp: Date.now() - durationMs,
  };

  if (!success && error) {
    event.metadata = {
      error: error instanceof Error ? error.message : String(error),
    };
  }

  insight.emit(event);
}

/** Wrap a value as MCP tool result content (convenience for tool handlers) */
export function jsonContent(data: unknown): CallToolResult {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
  };
}

/** Return an error message in MCP tool result format */
export function errorContent(message: string): CallToolResult {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify({ error: message }, null, 2) }],
    isError: true,
  };
}
