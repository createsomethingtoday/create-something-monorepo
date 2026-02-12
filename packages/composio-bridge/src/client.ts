/**
 * ComposioClient — Workers-safe wrapper over @composio/core
 *
 * Thin layer that:
 *   1. Initializes the Composio SDK with Workers-compatible settings
 *   2. Provides typed methods for the operations the bridge needs
 *   3. Handles errors consistently
 *   4. Uses getRawComposioTools() for tool discovery (no provider wrapping)
 *
 * This is NOT a general-purpose Composio client — it exposes only what
 * the bridge pattern requires. If Composio is swapped out, only this
 * file changes.
 *
 * Three-Tier alignment:
 *   - Database: getConnectedAccounts (reads state)
 *   - Automation: getTools, executeTool (model-controlled actions)
 */

import { Composio } from '@composio/core';
import type { ComposioClientConfig, ComposioAccount } from './types.js';

// =============================================================================
// Error Types
// =============================================================================

export class ComposioBridgeError extends Error {
  readonly code: string;
  readonly statusCode?: number;

  constructor(message: string, code: string, statusCode?: number) {
    super(message);
    this.name = 'ComposioBridgeError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

// =============================================================================
// Tool Schema (normalized from Composio's raw tool format)
// =============================================================================

/**
 * Composio tool definition — normalized from their raw API response.
 * We map these to mcp-core's tool registration format.
 */
export interface ComposioToolDef {
  /** Tool slug (e.g., 'SLACK_SEND_MESSAGE') */
  slug: string;

  /** Human-readable name */
  name: string;

  /** Description for the LLM */
  description: string;

  /** The app/toolkit this tool belongs to */
  app: string;

  /** JSON Schema for input parameters */
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// =============================================================================
// ComposioClient
// =============================================================================

export class ComposioClient {
  private readonly composio: Composio;
  private readonly config: ComposioClientConfig;

  constructor(config: ComposioClientConfig) {
    this.config = config;

    this.composio = new Composio({
      apiKey: config.apiKey,
      ...(config.baseURL ? { baseURL: config.baseURL } : {}),
    });
  }

  // ===========================================================================
  // Tool Discovery (Automation tier)
  // ===========================================================================

  /**
   * Get available tools for the specified toolkits.
   *
   * Uses getRawComposioTools() to get tool definitions without provider wrapping.
   * The ToolFactory converts these to mcp-core tool registrations.
   */
  async getTools(toolkits: string[]): Promise<ComposioToolDef[]> {
    try {
      const rawTools = await this.composio.tools.getRawComposioTools({
        toolkits: toolkits.map((t) => t.toLowerCase()),
      });

      // Map to our internal type — insulates us from SDK shape changes
      return (rawTools ?? []).map((tool: Record<string, unknown>) => ({
        slug: String(tool.slug ?? tool.enum ?? ''),
        name: String(tool.name ?? tool.displayName ?? ''),
        description: String(tool.description ?? ''),
        app: String(
          (tool.toolkit as Record<string, unknown>)?.name ??
          (tool.toolkit as Record<string, unknown>)?.slug ??
          tool.appName ??
          tool.app ??
          '',
        ),
        parameters: normalizeParameters(tool.inputParameters ?? tool.parameters),
      }));
    } catch (error) {
      throw new ComposioBridgeError(
        `Failed to fetch tools for toolkits [${toolkits.join(', ')}]: ${error instanceof Error ? error.message : String(error)}`,
        'TOOLS_FETCH_FAILED',
      );
    }
  }

  // ===========================================================================
  // Tool Execution (Automation tier)
  // ===========================================================================

  /**
   * Execute a Composio tool action.
   *
   * @param toolSlug  - The tool identifier (e.g., 'SLACK_SEND_MESSAGE')
   * @param params    - Parameters for the tool call
   * @param userId    - Composio user/entity ID (maps from mcp-core's accountId)
   */
  async executeTool(
    toolSlug: string,
    params: Record<string, unknown>,
    userId?: string,
  ): Promise<Record<string, unknown>> {
    try {
      const result = await this.composio.tools.execute(toolSlug, {
        userId: userId ?? 'default',
        arguments: params,
        dangerouslySkipVersionCheck: true,
      });

      // Normalize the response
      if (result && typeof result === 'object') {
        return result as Record<string, unknown>;
      }

      return { result };
    } catch (error) {
      throw new ComposioBridgeError(
        `Failed to execute tool ${toolSlug}: ${error instanceof Error ? error.message : String(error)}`,
        'TOOL_EXECUTE_FAILED',
      );
    }
  }

  // ===========================================================================
  // Connected Accounts (Database tier)
  // ===========================================================================

  /**
   * Get connected accounts for a user/entity.
   *
   * Maps Composio's connected accounts to our ComposioAccount type.
   */
  async getConnectedAccounts(userId: string): Promise<ComposioAccount[]> {
    try {
      const response = await this.composio.connectedAccounts.list({
        userIds: [userId],
      });

      const items = (response as Record<string, unknown>)?.items ??
        (Array.isArray(response) ? response : []);

      return (items as Record<string, unknown>[]).map((account) => ({
        connectionId: String(account.id ?? account.nanoid ?? ''),
        app: String(
          (account.toolkit as Record<string, unknown>)?.slug ??
          account.appName ??
          account.app ??
          '',
        ),
        entityId: String(account.userId ?? account.entityId ?? userId),
        status: mapConnectionStatus(account.status),
        createdAt: account.createdAt ? String(account.createdAt) : undefined,
      }));
    } catch (error) {
      throw new ComposioBridgeError(
        `Failed to fetch connected accounts for user ${userId}: ${error instanceof Error ? error.message : String(error)}`,
        'ACCOUNTS_FETCH_FAILED',
      );
    }
  }

  /**
   * Check if a user has an active connection for a specific toolkit.
   */
  async hasActiveConnection(userId: string, toolkit: string): Promise<boolean> {
    const accounts = await this.getConnectedAccounts(userId);
    return accounts.some(
      (a) => a.app.toLowerCase() === toolkit.toLowerCase() && a.status === 'active',
    );
  }

  // ===========================================================================
  // Health Check
  // ===========================================================================

  /**
   * Verify the Composio API is reachable and the API key is valid.
   * Used by evaluation scripts.
   */
  async healthCheck(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      // Use a lightweight call to verify connectivity
      await this.composio.tools.getRawComposioTools({
        toolkits: ['github'],
        limit: 1,
      });
      return { ok: true, latencyMs: Date.now() - start };
    } catch (error) {
      return {
        ok: false,
        latencyMs: Date.now() - start,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // ===========================================================================
  // Accessors
  // ===========================================================================

  /**
   * Get the underlying Composio SDK instance (for evaluation scripts).
   */
  getSDK(): Composio {
    return this.composio;
  }
}

// =============================================================================
// Helpers
// =============================================================================

function mapConnectionStatus(
  status: unknown,
): ComposioAccount['status'] {
  const s = String(status).toLowerCase();
  if (s === 'active' || s === 'connected') return 'active';
  if (s === 'expired') return 'expired';
  if (s === 'revoked' || s === 'disconnected') return 'revoked';
  return 'pending';
}

/**
 * Normalize various parameter formats into our standard JSON Schema shape.
 */
function normalizeParameters(
  params: unknown,
): ComposioToolDef['parameters'] {
  if (!params || typeof params !== 'object') {
    return { type: 'object', properties: {} };
  }

  const p = params as Record<string, unknown>;

  // Already in JSON Schema format
  if (p.type === 'object' && p.properties) {
    return p as ComposioToolDef['parameters'];
  }

  // Composio's inputParameters format (array of param objects)
  if (Array.isArray(params)) {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const param of params as Record<string, unknown>[]) {
      const name = String(param.name ?? param.key ?? '');
      if (!name) continue;

      properties[name] = {
        type: param.type ?? 'string',
        description: param.description ?? undefined,
      };

      if (param.required) {
        required.push(name);
      }
    }

    return {
      type: 'object',
      properties,
      ...(required.length > 0 ? { required } : {}),
    };
  }

  // Fallback — treat as flat properties
  return {
    type: 'object',
    properties: p.properties as Record<string, unknown> ?? {},
    required: p.required as string[] ?? undefined,
  };
}
