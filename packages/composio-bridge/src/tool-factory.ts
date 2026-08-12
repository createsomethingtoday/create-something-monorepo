/**
 * ComposioToolFactory — registers Composio tools onto a ScopedMcpServer
 *
 * This is the core of the wrap pattern:
 *   1. Fetches tool definitions from Composio for specified apps
 *   2. Converts JSON Schema parameters to Zod schemas
 *   3. Registers each tool on the ScopedMcpServer with a handler that
 *      delegates to Composio's execution API
 *   4. Injects AccountContext → entityId mapping
 *
 * The client sees standard MCP tools. Composio is invisible.
 *
 * Three-Tier alignment:
 *   - Automation: tool registration and execution (model-controlled)
 *   - Database: connected accounts resolution (application-controlled)
 *   - Judgment: tool filtering, read-only enforcement (user-controlled via policy)
 */

import { z } from 'zod';
import type { ScopedMcpServer } from '@create-something/mcp-core';
import { ComposioClient, type ComposioToolDef } from './client.js';
import type {
  AppConfig,
  ComposioExecutionContextBase,
  ComposioRegistrationMode,
  ComposioToolExecutionHooks,
  ComposioToolDiscoveryOptions,
  McpServerLike,
  ToolFactoryConfig,
} from './types.js';

// =============================================================================
// JSON Schema → Zod conversion
// =============================================================================

/**
 * Convert a JSON Schema property definition to a Zod schema.
 *
 * Supports the subset of JSON Schema that Composio uses:
 *   - string, number, integer, boolean, array, object
 *   - enum, description, default
 *
 * This is deliberately simple — Composio tool schemas are flat CRUD params.
 * Deep/complex schemas are a signal that the integration needs custom work.
 */
function jsonSchemaPropertyToZod(
  prop: Record<string, unknown>,
  required: boolean,
): z.ZodTypeAny {
  const type = prop.type as string | undefined;
  const description = prop.description as string | undefined;
  const enumValues = prop.enum as string[] | undefined;

  let schema: z.ZodTypeAny;

  // Handle enum types
  if (enumValues && enumValues.length > 0) {
    schema = z.enum(enumValues as [string, ...string[]]);
  } else {
    switch (type) {
      case 'string':
        schema = z.string();
        break;
      case 'number':
      case 'integer':
        schema = z.number();
        break;
      case 'boolean':
        schema = z.boolean();
        break;
      case 'array': {
        const items = prop.items as Record<string, unknown> | undefined;
        if (items) {
          schema = z.array(jsonSchemaPropertyToZod(items, true));
        } else {
          schema = z.array(z.unknown());
        }
        break;
      }
      case 'object':
        schema = z.record(z.string(), z.unknown());
        break;
      default:
        // Unknown type — accept anything
        schema = z.unknown();
    }
  }

  if (description) {
    schema = schema.describe(description);
  }

  if (!required) {
    schema = schema.optional();
  }

  return schema;
}

/**
 * Convert a Composio tool's JSON Schema parameters to a mutable Zod shape
 * suitable for ScopedMcpServer.tool() registration.
 */
function jsonSchemaToZodShape(
  parameters: ComposioToolDef['parameters'],
): Record<string, z.ZodTypeAny> {
  const shape: Record<string, z.ZodTypeAny> = {};
  const properties = parameters.properties ?? {};
  const required = new Set(parameters.required ?? []);

  for (const [key, value] of Object.entries(properties)) {
    if (typeof value === 'object' && value !== null) {
      shape[key] = jsonSchemaPropertyToZod(
        value as Record<string, unknown>,
        required.has(key),
      );
    }
  }

  return shape;
}

// =============================================================================
// Tool Name Normalization
// =============================================================================

/**
 * Convert a Composio tool slug to an MCP tool name.
 *
 * Composio uses UPPER_SNAKE (e.g., 'SLACK_SEND_MESSAGE').
 * MCP convention is lower_snake (e.g., 'slack_send_message').
 *
 * If a prefix override is specified, replace the app prefix:
 *   'SLACK_SEND_MESSAGE' with prefix='messaging' → 'messaging_send_message'
 */
function normalizeToolName(slug: string, appName: string, prefix?: string): string {
  const lower = slug.toLowerCase();

  if (prefix) {
    // Replace the app prefix with the custom one
    const appPrefix = appName.toLowerCase() + '_';
    if (lower.startsWith(appPrefix)) {
      return prefix + '_' + lower.slice(appPrefix.length);
    }
    return prefix + '_' + lower;
  }

  return lower;
}

// =============================================================================
// ComposioToolFactory
// =============================================================================

export class ComposioToolFactory {
  private readonly client: ComposioClient;
  private readonly appConfigs: AppConfig[];
  private readonly resolveUserId: (accountId: string) => string | Promise<string>;
  private readonly toolDiscovery: ComposioToolDiscoveryOptions | undefined;
  private readonly executionHooks: ComposioToolExecutionHooks | undefined;

  /** Cached tool definitions — fetched once, reused across registrations */
  private toolCache: Map<string, ComposioToolDef[]> | null = null;

  constructor(config: ToolFactoryConfig) {
    this.client = new ComposioClient({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      fetch: config.fetch,
      timeoutMs: config.timeoutMs,
      executionPolicy: config.executionPolicy,
    });

    // Normalize string[] shorthand to AppConfig[]
    this.appConfigs = config.apps.map((app) =>
      typeof app === 'string' ? { app } : app,
    );

    this.resolveUserId = config.resolveUserId ?? ((id: string) => id);
    this.toolDiscovery = config.toolDiscovery;
    this.executionHooks = config.executionHooks;
  }

  // ===========================================================================
  // Tool Registration
  // ===========================================================================

  /**
   * Register Composio-backed tools onto a ScopedMcpServer.
   *
   * This is the primary API. Call it from your MCP server's setup:
   *
   * ```typescript
   * const factory = new ComposioToolFactory({
   *   apiKey: env.COMPOSIO_API_KEY,
   *   apps: ['SLACK', 'HUBSPOT'],
   * });
   * await factory.registerTools(server);
   * ```
   *
   * Each Composio tool becomes an MCP tool. The handler:
   *   1. Resolves accountId → entityId via the user ID mapper
   *   2. Delegates to Composio's execute API
   *   3. Returns the result as MCP JSON content
   */
  async registerTools(server: ScopedMcpServer): Promise<number> {
    const toolsByApp = await this.fetchTools();
    let registered = 0;

    for (const appConfig of this.appConfigs) {
      const tools = toolsByApp.get(appConfig.app.toUpperCase()) ?? [];

      for (const tool of tools) {
        // Filter to specific actions if configured
        if (appConfig.actions && !appConfig.actions.includes(tool.slug)) {
          continue;
        }

        const toolName = normalizeToolName(tool.slug, tool.app, appConfig.prefix);
        const zodShape = jsonSchemaToZodShape(tool.parameters);

        // Prefix description with [Composio] for internal observability
        const description = tool.description || `${tool.name} via Composio`;

        server.tool(
          toolName,
          description,
          zodShape,
          async (params, ctx) => {
            const entityId = await this.resolveUserId(ctx.accountId);
            const baseContext = this.buildExecutionContext(
              tool,
              toolName,
              entityId,
              'scoped',
            );
            const nextParams = await this.applyBeforeExecuteHooks(baseContext, params);

            const result = await this.client.executeTool(
              tool.slug,
              nextParams,
              entityId,
            );
            const safeResult = await this.applyAfterExecuteHooks(baseContext, nextParams, result);

            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify(safeResult, null, 2),
                },
              ],
            };
          },
          { readOnly: appConfig.readOnly },
        );

        registered++;
      }
    }

    return registered;
  }

  /**
   * Register Composio-backed tools onto a raw McpServer (no AccountContext).
   *
   * Use this when the server is from @modelcontextprotocol/sdk (e.g. McpAgent
   * workers like halfdozen-zoom-sync). All tools run with the same entityId
   * (Composio user/entity ID); ensure that entity has connected accounts for
   * the relevant apps.
   *
   * @param server   - Any server with .tool(name, description, schema, handler)
   * @param entityId - Composio entity ID (e.g. 'default' or your user id)
   * @returns Number of tools registered
   */
  async registerToolsOnMcpServer(server: McpServerLike, entityId: string): Promise<number> {
    const toolsByApp = await this.fetchTools();
    let registered = 0;

    for (const appConfig of this.appConfigs) {
      const tools = toolsByApp.get(appConfig.app.toUpperCase()) ?? [];

      for (const tool of tools) {
        if (appConfig.actions && !appConfig.actions.includes(tool.slug)) {
          continue;
        }

        const toolName = normalizeToolName(tool.slug, tool.app, appConfig.prefix);
        const zodShape = jsonSchemaToZodShape(tool.parameters);
        const description = tool.description || `${tool.name} via Composio`;

        server.tool(
          toolName,
          description,
          zodShape,
          async (params) => {
            const baseContext = this.buildExecutionContext(
              tool,
              toolName,
              entityId,
              'mcp_server',
            );
            const nextParams = await this.applyBeforeExecuteHooks(baseContext, params);
            const result = await this.client.executeTool(tool.slug, nextParams, entityId);
            const safeResult = await this.applyAfterExecuteHooks(baseContext, nextParams, result);
            return {
              content: [{ type: 'text' as const, text: JSON.stringify(safeResult, null, 2) }],
            };
          },
        );

        registered++;
      }
    }

    return registered;
  }

  /**
   * Register Composio-backed tools with a per-request entityId resolver.
   *
   * Use this for multi-user Workers: pass a getter that returns the current
   * request's account/entity id (e.g. from a header set in the DO's fetch()).
   *
   * @param server      - Any server with .tool(name, description, schema, handler)
   * @param getEntityId - Called when each tool runs; return Composio entity ID for this request
   * @param onToolCall  - Optional; called after each tool execution (e.g. for metering)
   * @returns Number of tools registered
   */
  async registerToolsOnMcpServerWithResolver(
    server: McpServerLike,
    getEntityId: () => string | Promise<string>,
    onToolCall?: (entityId: string, toolName: string) => void | Promise<void>,
  ): Promise<number> {
    const toolsByApp = await this.fetchTools();
    let registered = 0;

    for (const appConfig of this.appConfigs) {
      const tools = toolsByApp.get(appConfig.app.toUpperCase()) ?? [];

      for (const tool of tools) {
        if (appConfig.actions && !appConfig.actions.includes(tool.slug)) {
          continue;
        }

        const toolName = normalizeToolName(tool.slug, tool.app, appConfig.prefix);
        const zodShape = jsonSchemaToZodShape(tool.parameters);
        const description = tool.description || `${tool.name} via Composio`;

        server.tool(
          toolName,
          description,
          zodShape,
          async (params) => {
            const entityId = await getEntityId();
            const baseContext = this.buildExecutionContext(
              tool,
              toolName,
              entityId,
              'resolver',
            );
            const nextParams = await this.applyBeforeExecuteHooks(baseContext, params);
            const result = await this.client.executeTool(tool.slug, nextParams, entityId);
            const safeResult = await this.applyAfterExecuteHooks(baseContext, nextParams, result);
            if (onToolCall) {
              await onToolCall(entityId, toolName);
            }
            return {
              content: [{ type: 'text' as const, text: JSON.stringify(safeResult, null, 2) }],
            };
          },
        );

        registered++;
      }
    }

    return registered;
  }

  // ===========================================================================
  // Tool Discovery
  // ===========================================================================

  /**
   * Fetch tools from Composio, grouped by app.
   * Results are cached for the lifetime of this factory instance.
   */
  private async fetchTools(): Promise<Map<string, ComposioToolDef[]>> {
    if (this.toolCache) return this.toolCache;

    const appNames = this.appConfigs.map((c) => c.app.toUpperCase());
    const allTools = await this.client.getTools(appNames, this.toolDiscovery);

    const byApp = new Map<string, ComposioToolDef[]>();
    for (const tool of allTools) {
      const key = tool.app.toUpperCase();
      const list = byApp.get(key) ?? [];
      list.push(tool);
      byApp.set(key, list);
    }

    this.toolCache = byApp;
    return byApp;
  }

  /**
   * List available tools without registering them.
   * Useful for evaluation and debugging.
   */
  async listTools(): Promise<ComposioToolDef[]> {
    const byApp = await this.fetchTools();
    return Array.from(byApp.values()).flat();
  }

  /**
   * Clear the tool cache. Call if app configuration changes.
   */
  clearCache(): void {
    this.toolCache = null;
  }

  // ===========================================================================
  // Execution hooks
  // ===========================================================================

  private buildExecutionContext(
    tool: ComposioToolDef,
    toolName: string,
    entityId: string,
    mode: ComposioRegistrationMode,
  ): ComposioExecutionContextBase {
    return {
      app: tool.app,
      toolName,
      toolSlug: tool.slug,
      entityId,
      mode,
    };
  }

  private async applyBeforeExecuteHooks(
    baseContext: ComposioExecutionContextBase,
    params: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const hooks = this.executionHooks?.beforeExecute;
    if (!hooks || hooks.length === 0) {
      return params;
    }

    let nextParams = params;
    for (const hook of hooks) {
      const maybeNext = await hook({ ...baseContext, params: nextParams });
      if (maybeNext) {
        nextParams = maybeNext;
      }
    }
    return nextParams;
  }

  private async applyAfterExecuteHooks(
    baseContext: ComposioExecutionContextBase,
    params: Record<string, unknown>,
    result: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const hooks = this.executionHooks?.afterExecute;
    if (!hooks || hooks.length === 0) {
      return result;
    }

    let nextResult = result;
    for (const hook of hooks) {
      nextResult = await hook({
        ...baseContext,
        params,
        result: nextResult,
      });
    }
    return nextResult;
  }

  // ===========================================================================
  // Accessors
  // ===========================================================================

  /**
   * Get the underlying ComposioClient (for evaluation scripts).
   */
  getClient(): ComposioClient {
    return this.client;
  }
}
