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
import type {
  ComposioAuthConfig,
  ComposioAuthConfigCreateResult,
  ComposioAuthConfigListOptions,
  ComposioAuthConfigListResult,
  ComposioConnectionLinkResult,
  ComposioClientConfig,
  ComposioAccount,
  ComposioExecutionPolicy,
  ComposioInternalActionExecutionLog,
  ComposioInternalActionExecutionLogField,
  ComposioInternalActionExecutionLogQuery,
  ComposioInternalActionExecutionLogResult,
  ComposioInternalSearchValue,
  ComposioInternalTriggerLog,
  ComposioInternalTriggerLogQuery,
  ComposioInternalTriggerLogResult,
  ComposioToolDiscoveryOptions,
  ComposioToolkitListOptions,
  ComposioToolkitSummary,
} from './types.js';

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

interface NormalizedRetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterRatio: number;
  retryableStatusCodes: Set<number>;
  retryableErrorCodes: Set<string>;
}

interface NormalizedExecutionPolicy {
  retryMode: 'off' | 'safe' | 'all';
  retry: NormalizedRetryPolicy;
}

interface PolicyContext {
  operation:
    | 'TOOLS_FETCH'
    | 'TOOLKITS_FETCH'
    | 'TOOL_EXECUTE'
    | 'ACCOUNTS_FETCH'
    | 'AUTH_CONFIGS_FETCH'
    | 'AUTH_CONFIGS_MUTATE'
    | 'CONNECTION_LINK_CREATE'
    | 'INTERNAL_LOGS_FETCH';
  idempotent: boolean;
}

const DEFAULT_RETRY_STATUS_CODES = [408, 409, 425, 429, 500, 502, 503, 504];
const DEFAULT_RETRY_ERROR_CODES = [
  'ETIMEDOUT',
  'ECONNRESET',
  'ECONNREFUSED',
  'EAI_AGAIN',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'FETCH_FAILED',
  'ERR_NETWORK',
];

function normalizeExecutionPolicy(
  policy: ComposioExecutionPolicy | undefined,
): NormalizedExecutionPolicy {
  const retry = policy?.retry ?? {};

  return {
    retryMode: policy?.retryMode ?? 'safe',
    retry: {
      maxAttempts: clampInteger(retry.maxAttempts, 1, 10, 3),
      baseDelayMs: clampInteger(retry.baseDelayMs, 1, 60_000, 250),
      maxDelayMs: clampInteger(retry.maxDelayMs, 1, 120_000, 4_000),
      jitterRatio: clampNumber(retry.jitterRatio, 0, 1, 0.2),
      retryableStatusCodes: new Set(
        (retry.retryableStatusCodes && retry.retryableStatusCodes.length > 0
          ? retry.retryableStatusCodes
          : DEFAULT_RETRY_STATUS_CODES).map((status) => Math.trunc(status)),
      ),
      retryableErrorCodes: new Set(
        (retry.retryableErrorCodes && retry.retryableErrorCodes.length > 0
          ? retry.retryableErrorCodes
          : DEFAULT_RETRY_ERROR_CODES).map((code) => code.trim().toUpperCase()),
      ),
    },
  };
}

// =============================================================================
// ComposioClient
// =============================================================================

export class ComposioClient {
  private readonly composio: Composio;
  private readonly config: ComposioClientConfig;
  private readonly internalApiBaseUrl: string;
  private readonly executionPolicy: NormalizedExecutionPolicy;

  constructor(config: ComposioClientConfig) {
    this.config = config;
    this.internalApiBaseUrl = resolveInternalApiBaseUrl(config.internalApiBaseUrl ?? config.baseURL);
    this.executionPolicy = normalizeExecutionPolicy(config.executionPolicy);

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
  async getTools(
    toolkits: string[],
    options: ComposioToolDiscoveryOptions = {},
  ): Promise<ComposioToolDef[]> {
    try {
      const rawTools = await this.runWithPolicy(
        () => this.composio.tools.getRawComposioTools({
          toolkits: toolkits.map((t) => t.toLowerCase()),
          ...(options.limit ? { limit: options.limit } : {}),
          ...(typeof options.important === 'boolean' ? { important: options.important } : {}),
          ...(options.search ? { search: options.search } : {}),
          ...(options.authConfigIds && options.authConfigIds.length > 0
            ? { authConfigIds: options.authConfigIds }
            : {}),
        }),
        { operation: 'TOOLS_FETCH', idempotent: true },
      );
      const rawItems = Array.isArray(rawTools)
        ? rawTools.filter(isRecord)
        : ((Array.isArray((rawTools as Record<string, unknown>)?.items)
          ? (rawTools as Record<string, unknown>).items
          : []) as unknown[]).filter(isRecord);

      // Map to our internal type — insulates us from SDK shape changes
      return (rawItems ?? []).map((tool) => {
        const rawTool = tool as Record<string, unknown>;
        return {
          slug: String(rawTool.slug ?? rawTool.enum ?? ''),
          name: String(rawTool.name ?? rawTool.displayName ?? ''),
          description: String(rawTool.description ?? ''),
          app: String(
            (rawTool.toolkit as Record<string, unknown>)?.name ??
            (rawTool.toolkit as Record<string, unknown>)?.slug ??
            rawTool.appName ??
            rawTool.app ??
            '',
          ),
          parameters: normalizeParameters(rawTool.inputParameters ?? rawTool.parameters),
        };
      });
    } catch (error) {
      throw toBridgeError(
        error,
        `Failed to fetch tools for toolkits [${toolkits.join(', ')}]`,
        'TOOLS_FETCH_FAILED',
      );
    }
  }

  // ===========================================================================
  // Toolkit Discovery (Automation tier)
  // ===========================================================================

  /**
   * List Composio toolkits for inventory/sync flows.
   */
  async listToolkits(options: ComposioToolkitListOptions = {}): Promise<ComposioToolkitSummary[]> {
    try {
      const response = await this.runWithPolicy(
        () => this.composio.toolkits.get({
          ...(options.category ? { category: options.category } : {}),
          ...(options.managedBy ? { managedBy: options.managedBy } : {}),
          ...(options.sortBy ? { sortBy: options.sortBy } : {}),
          ...(options.limit ? { limit: options.limit } : {}),
          ...(options.cursor ? { cursor: options.cursor } : {}),
        }),
        { operation: 'TOOLKITS_FETCH', idempotent: true },
      );

      const items = Array.isArray(response)
        ? response.filter(isRecord)
        : ((Array.isArray((response as Record<string, unknown>)?.items)
          ? (response as Record<string, unknown>).items
          : []) as unknown[]).filter(isRecord);

      return items.map((item) => normalizeToolkit(item as Record<string, unknown>));
    } catch (error) {
      throw toBridgeError(error, 'Failed to list toolkits', 'TOOLKITS_FETCH_FAILED');
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
      const result = await this.runWithPolicy(
        () => this.composio.tools.execute(toolSlug, {
          userId: userId ?? 'default',
          arguments: params,
          dangerouslySkipVersionCheck: true,
        }),
        { operation: 'TOOL_EXECUTE', idempotent: false },
      );

      // Normalize the response
      if (result && typeof result === 'object') {
        return result as Record<string, unknown>;
      }

      return { result };
    } catch (error) {
      throw toBridgeError(error, `Failed to execute tool ${toolSlug}`, 'TOOL_EXECUTE_FAILED');
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
      const response = await this.runWithPolicy(
        () => this.composio.connectedAccounts.list({
          userIds: [userId],
        }),
        { operation: 'ACCOUNTS_FETCH', idempotent: true },
      );

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
      throw toBridgeError(
        error,
        `Failed to fetch connected accounts for user ${userId}`,
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
  // Auth Config Management (Database tier)
  // ===========================================================================

  /**
   * List auth configs (optionally filtered by toolkit or Composio-managed flag).
   */
  async listAuthConfigs(
    options: ComposioAuthConfigListOptions = {},
  ): Promise<ComposioAuthConfigListResult> {
    try {
      const response = await this.runWithPolicy(
        () => this.composio.authConfigs.list({
          ...(options.toolkit ? { toolkit: options.toolkit.toLowerCase() } : {}),
          ...(options.limit ? { limit: options.limit } : {}),
          ...(options.cursor ? { cursor: options.cursor } : {}),
          ...(typeof options.isComposioManaged === 'boolean'
            ? { isComposioManaged: options.isComposioManaged }
            : {}),
        }),
        { operation: 'AUTH_CONFIGS_FETCH', idempotent: true },
      );

      const normalized = normalizeAuthConfigListResponse(response);
      if (!options.enabledOnly) return normalized;

      return {
        ...normalized,
        items: normalized.items.filter((item) => item.status === 'ENABLED'),
      };
    } catch (error) {
      throw toBridgeError(error, 'Failed to list auth configs', 'AUTH_CONFIGS_LIST_FAILED');
    }
  }

  /**
   * Retrieve one auth config by ID.
   */
  async getAuthConfig(authConfigId: string): Promise<ComposioAuthConfig> {
    try {
      const response = await this.runWithPolicy(
        () => this.composio.authConfigs.get(authConfigId),
        { operation: 'AUTH_CONFIGS_FETCH', idempotent: true },
      );

      if (!isRecord(response)) {
        throw new Error('Unexpected auth config payload shape');
      }

      return normalizeAuthConfig(response);
    } catch (error) {
      throw toBridgeError(
        error,
        `Failed to fetch auth config ${authConfigId}`,
        'AUTH_CONFIGS_GET_FAILED',
      );
    }
  }

  /**
   * Find the first auth config for a toolkit.
   * Paginates a few pages to avoid missing configs on larger workspaces.
   */
  async findAuthConfigForToolkit(
    toolkit: string,
    options: {
      enabledOnly?: boolean;
      isComposioManaged?: boolean;
      limit?: number;
      maxPages?: number;
    } = {},
  ): Promise<ComposioAuthConfig | null> {
    const maxPages = clampInteger(options.maxPages, 1, 20, 5);
    let cursor: string | undefined;

    for (let page = 0; page < maxPages; page += 1) {
      const result = await this.listAuthConfigs({
        toolkit,
        enabledOnly: options.enabledOnly,
        isComposioManaged: options.isComposioManaged,
        limit: options.limit,
        cursor,
      });

      if (result.items.length > 0) {
        return result.items[0];
      }

      if (!result.nextCursor) break;
      cursor = result.nextCursor;
    }

    return null;
  }

  /**
   * Create an auth config for a toolkit.
   */
  async createAuthConfig(
    toolkit: string,
    options: Record<string, unknown> = {},
  ): Promise<ComposioAuthConfigCreateResult> {
    try {
      type CreateAuthConfigOptions = Parameters<Composio['authConfigs']['create']>[1];
      const response = await this.runWithPolicy(
        () => this.composio.authConfigs.create(toolkit.toLowerCase(), options as CreateAuthConfigOptions),
        { operation: 'AUTH_CONFIGS_MUTATE', idempotent: false },
      );

      if (!isRecord(response)) {
        throw new Error('Unexpected auth config create payload shape');
      }

      return normalizeAuthConfigCreateResponse(response);
    } catch (error) {
      throw toBridgeError(
        error,
        `Failed to create auth config for toolkit ${toolkit}`,
        'AUTH_CONFIGS_CREATE_FAILED',
      );
    }
  }

  /**
   * Update an existing auth config and return the refreshed representation.
   */
  async updateAuthConfig(
    authConfigId: string,
    data: Record<string, unknown>,
  ): Promise<ComposioAuthConfig> {
    try {
      type UpdateAuthConfigOptions = Parameters<Composio['authConfigs']['update']>[1];
      await this.runWithPolicy(
        () => this.composio.authConfigs.update(authConfigId, data as UpdateAuthConfigOptions),
        { operation: 'AUTH_CONFIGS_MUTATE', idempotent: false },
      );

      return await this.getAuthConfig(authConfigId);
    } catch (error) {
      throw toBridgeError(
        error,
        `Failed to update auth config ${authConfigId}`,
        'AUTH_CONFIGS_UPDATE_FAILED',
      );
    }
  }

  /**
   * Enable an auth config and return the refreshed representation.
   */
  async enableAuthConfig(authConfigId: string): Promise<ComposioAuthConfig> {
    try {
      await this.runWithPolicy(
        () => this.composio.authConfigs.enable(authConfigId),
        { operation: 'AUTH_CONFIGS_MUTATE', idempotent: false },
      );

      return await this.getAuthConfig(authConfigId);
    } catch (error) {
      throw toBridgeError(
        error,
        `Failed to enable auth config ${authConfigId}`,
        'AUTH_CONFIGS_ENABLE_FAILED',
      );
    }
  }

  /**
   * Disable an auth config and return the refreshed representation.
   */
  async disableAuthConfig(authConfigId: string): Promise<ComposioAuthConfig> {
    try {
      await this.runWithPolicy(
        () => this.composio.authConfigs.disable(authConfigId),
        { operation: 'AUTH_CONFIGS_MUTATE', idempotent: false },
      );

      return await this.getAuthConfig(authConfigId);
    } catch (error) {
      throw toBridgeError(
        error,
        `Failed to disable auth config ${authConfigId}`,
        'AUTH_CONFIGS_DISABLE_FAILED',
      );
    }
  }

  /**
   * Delete an auth config by ID.
   */
  async deleteAuthConfig(authConfigId: string): Promise<void> {
    try {
      await this.runWithPolicy(
        () => this.composio.authConfigs.delete(authConfigId),
        { operation: 'AUTH_CONFIGS_MUTATE', idempotent: false },
      );
    } catch (error) {
      throw toBridgeError(
        error,
        `Failed to delete auth config ${authConfigId}`,
        'AUTH_CONFIGS_DELETE_FAILED',
      );
    }
  }

  /**
   * Create a connect link for an entity/user and auth config.
   */
  async createConnectionLink(
    userId: string,
    authConfigId: string,
    callbackUrl?: string,
  ): Promise<ComposioConnectionLinkResult> {
    try {
      const response = await this.runWithPolicy(
        () => this.composio.connectedAccounts.link(
          userId,
          authConfigId,
          callbackUrl ? { callbackUrl } : undefined,
        ),
        { operation: 'CONNECTION_LINK_CREATE', idempotent: false },
      );

      return normalizeConnectionLinkResult(response);
    } catch (error) {
      throw toBridgeError(
        error,
        `Failed to create connection link for auth config ${authConfigId}`,
        'CONNECTION_LINK_CREATE_FAILED',
      );
    }
  }

  // ===========================================================================
  // Internal Logs (Automation diagnostics)
  // ===========================================================================

  /**
   * Query internal action execution logs from Composio.
   */
  async listInternalActionExecutionLogs(
    query: ComposioInternalActionExecutionLogQuery = {},
  ): Promise<ComposioInternalActionExecutionLogResult> {
    try {
      const response = await this.runWithPolicy(
        () => this.requestInternalApi(
          '/api/v3/internal/action_execution_logs',
          'POST',
          toInternalActionLogRequestBody(query),
        ),
        { operation: 'INTERNAL_LOGS_FETCH', idempotent: true },
      );

      return normalizeInternalActionExecutionLogResult(response);
    } catch (error) {
      throw toBridgeError(
        error,
        'Failed to query Composio internal action execution logs',
        'INTERNAL_ACTION_LOGS_FAILED',
      );
    }
  }

  /**
   * Query internal trigger logs from Composio.
   */
  async listInternalTriggerLogs(
    query: ComposioInternalTriggerLogQuery = {},
  ): Promise<ComposioInternalTriggerLogResult> {
    try {
      const response = await this.runWithPolicy(
        () => this.requestInternalApi(
          '/api/v3/internal/trigger_logs',
          'POST',
          toInternalTriggerLogRequestBody(query),
        ),
        { operation: 'INTERNAL_LOGS_FETCH', idempotent: true },
      );

      return normalizeInternalTriggerLogResult(response);
    } catch (error) {
      throw toBridgeError(
        error,
        'Failed to query Composio internal trigger logs',
        'INTERNAL_TRIGGER_LOGS_FAILED',
      );
    }
  }

  /**
   * List supported searchable fields for action execution logs.
   */
  async listInternalActionExecutionLogFields(): Promise<ComposioInternalActionExecutionLogField[]> {
    try {
      const response = await this.runWithPolicy(
        () => this.requestInternalApi('/api/v3/internal/action_execution_logs/fields', 'GET'),
        { operation: 'INTERNAL_LOGS_FETCH', idempotent: true },
      );

      return normalizeInternalActionExecutionLogFields(response);
    } catch (error) {
      throw toBridgeError(
        error,
        'Failed to fetch Composio internal action execution log fields',
        'INTERNAL_ACTION_LOG_FIELDS_FAILED',
      );
    }
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

  private async runWithPolicy<T>(
    operation: () => Promise<T>,
    context: PolicyContext,
  ): Promise<T> {
    const { retryMode, retry } = this.executionPolicy;
    const retriesAllowed =
      retryMode === 'all' || (retryMode === 'safe' && context.idempotent);
    const maxAttempts = retriesAllowed ? retry.maxAttempts : 1;

    let attempt = 1;
    let lastError: unknown;

    while (attempt <= maxAttempts) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt >= maxAttempts || !isRetryableError(error, retry)) {
          break;
        }

        const delayMs = backoffDelayMs(retry, attempt);
        await sleep(delayMs);
        attempt += 1;
      }
    }

    throw lastError;
  }

  private async requestInternalApi(
    path: string,
    method: 'GET' | 'POST',
    body?: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const fetchFn = this.config.fetch ?? globalThis.fetch;
    if (typeof fetchFn !== 'function') {
      throw new ComposioBridgeError(
        'No fetch implementation available for internal Composio API calls',
        'INTERNAL_API_FETCH_UNAVAILABLE',
      );
    }

    const url = joinUrl(this.internalApiBaseUrl, path);
    const controller = typeof AbortController === 'function'
      ? new AbortController()
      : undefined;
    const timeoutMs = this.config.timeoutMs ?? 30_000;
    const timeoutHandle = controller
      ? setTimeout(() => controller.abort(), timeoutMs)
      : undefined;

    try {
      const response = await fetchFn(url, {
        method,
        headers: {
          'x-api-key': this.config.apiKey,
          ...(body ? { 'content-type': 'application/json' } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        ...(controller ? { signal: controller.signal } : {}),
      });

      const text = await response.text();
      if (!response.ok) {
        throw new ComposioBridgeError(
          `Composio internal API ${method} ${path} failed (${response.status}): ${truncate(text, 500)}`,
          'INTERNAL_API_REQUEST_FAILED',
          response.status,
        );
      }

      if (!text.trim()) return {};

      const parsed = JSON.parse(text) as unknown;
      if (isRecord(parsed)) return parsed;
      if (Array.isArray(parsed)) return { items: parsed };
      return { value: parsed };
    } finally {
      if (timeoutHandle !== undefined) {
        clearTimeout(timeoutHandle);
      }
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

function normalizeToolkit(raw: Record<string, unknown>): ComposioToolkitSummary {
  const meta = (raw.meta as Record<string, unknown> | undefined) ?? {};
  const categoriesRaw = Array.isArray(meta.categories) ? meta.categories : [];

  return {
    slug: String(raw.slug ?? ''),
    name: String(raw.name ?? raw.slug ?? ''),
    description: stringOrUndefined(meta.description ?? raw.description),
    categories: categoriesRaw
      .map((category) => {
        if (typeof category === 'string') return category;
        if (!category || typeof category !== 'object') return '';
        const c = category as Record<string, unknown>;
        return String(c.slug ?? c.id ?? c.name ?? '').trim().toLowerCase();
      })
      .filter(Boolean),
    toolsCount: numberOrUndefined(meta.toolsCount ?? meta.tools_count),
    triggersCount: numberOrUndefined(meta.triggersCount ?? meta.triggers_count),
    availableVersions: arrayOfStrings(meta.availableVersions),
    authSchemes: arrayOfStrings(raw.authSchemes),
    composioManagedAuthSchemes: arrayOfStrings(raw.composioManagedAuthSchemes),
    noAuth: booleanOrUndefined(raw.noAuth),
    isLocalToolkit: Boolean(raw.isLocalToolkit),
  };
}

function normalizeAuthConfigListResponse(response: unknown): ComposioAuthConfigListResult {
  if (!isRecord(response)) {
    return { items: [], nextCursor: null };
  }

  const itemsRaw = Array.isArray(response.items) ? response.items : [];
  const items = itemsRaw.filter(isRecord).map((item) => normalizeAuthConfig(item));

  return {
    items,
    nextCursor: extractNextCursor(response),
    totalPages: numberOrUndefined(response.totalPages ?? response.total_pages),
  };
}

function normalizeAuthConfigCreateResponse(raw: Record<string, unknown>): ComposioAuthConfigCreateResult {
  return {
    id: String(raw.id ?? ''),
    toolkit: stringOrUndefined(raw.toolkit),
    authScheme: stringOrUndefined(raw.authScheme ?? raw.auth_scheme),
    isComposioManaged: booleanOrUndefined(raw.isComposioManaged ?? raw.is_composio_managed),
    raw,
  };
}

function normalizeAuthConfig(raw: Record<string, unknown>): ComposioAuthConfig {
  const toolkitRaw = isRecord(raw.toolkit) ? raw.toolkit : {};

  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    toolkit: String(toolkitRaw.slug ?? raw.toolkit ?? ''),
    status: String(raw.status ?? 'UNKNOWN').toUpperCase(),
    noOfConnections: numberOrUndefined(raw.noOfConnections ?? raw.no_of_connections) ?? 0,
    isComposioManaged: booleanOrUndefined(raw.isComposioManaged ?? raw.is_composio_managed),
    authScheme: stringOrUndefined(raw.authScheme ?? raw.auth_scheme),
    createdAt: stringOrUndefined(raw.createdAt ?? raw.created_at),
    lastUpdatedAt: stringOrUndefined(raw.lastUpdatedAt ?? raw.last_updated_at),
    raw,
  };
}

function normalizeConnectionLinkResult(value: unknown): ComposioConnectionLinkResult {
  const raw = toSerializableRecord(value);

  return {
    id: String(raw.id ?? ''),
    status: stringOrUndefined(raw.status),
    redirectUrl: nullableString(raw.redirectUrl ?? raw.redirect_url),
    raw,
  };
}

function toInternalActionLogRequestBody(
  query: ComposioInternalActionExecutionLogQuery,
): Record<string, unknown> {
  return toInternalLogRequestBody(query, {
    ...(query.actionName ? { action_name: query.actionName } : {}),
  });
}

function toInternalTriggerLogRequestBody(
  query: ComposioInternalTriggerLogQuery,
): Record<string, unknown> {
  return toInternalLogRequestBody(query, {
    ...(query.triggerId ? { trigger_id: query.triggerId } : {}),
  });
}

function toInternalLogRequestBody(
  query: {
    connectedAccountId?: string;
    status?: string;
    startTime?: string;
    endTime?: string;
    limit?: number;
    cursor?: string;
    searchParams?: Record<string, ComposioInternalSearchValue>;
  },
  extra: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...extra,
    ...(query.connectedAccountId ? { connected_account_id: query.connectedAccountId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.startTime ? { start_time: query.startTime } : {}),
    ...(query.endTime ? { end_time: query.endTime } : {}),
    ...(typeof query.limit === 'number' ? { limit: query.limit } : {}),
    ...(query.cursor ? { cursor: query.cursor } : {}),
    ...(query.searchParams && Object.keys(query.searchParams).length > 0
      ? { search_params: query.searchParams }
      : {}),
  };
}

function normalizeInternalActionExecutionLogResult(
  response: Record<string, unknown>,
): ComposioInternalActionExecutionLogResult {
  const items = extractListItems(response)
    .filter(isRecord)
    .map((item) => normalizeInternalActionExecutionLog(item));

  return {
    items,
    nextCursor: extractNextCursor(response),
    totalPages: numberOrUndefined(response.totalPages ?? response.total_pages),
  };
}

function normalizeInternalTriggerLogResult(
  response: Record<string, unknown>,
): ComposioInternalTriggerLogResult {
  const items = extractListItems(response)
    .filter(isRecord)
    .map((item) => normalizeInternalTriggerLog(item));

  return {
    items,
    nextCursor: extractNextCursor(response),
    totalPages: numberOrUndefined(response.totalPages ?? response.total_pages),
  };
}

function normalizeInternalActionExecutionLog(item: Record<string, unknown>): ComposioInternalActionExecutionLog {
  const metadata = isRecord(item.metadata) ? item.metadata : {};

  return {
    id: stringOrUndefined(item.id ?? item.log_id ?? metadata.log_id),
    connectedAccountId: stringOrUndefined(
      item.connected_account_id ?? item.connectedAccountId ?? metadata.connected_account_id,
    ),
    actionName: stringOrUndefined(item.action_name ?? item.actionName ?? metadata.action_name),
    status: stringOrUndefined(item.status ?? metadata.status),
    startTime: stringOrUndefined(item.start_time ?? item.startTime ?? metadata.start_time),
    endTime: stringOrUndefined(item.end_time ?? item.endTime ?? metadata.end_time),
    raw: item,
  };
}

function normalizeInternalTriggerLog(item: Record<string, unknown>): ComposioInternalTriggerLog {
  const metadata = isRecord(item.metadata) ? item.metadata : {};

  return {
    id: stringOrUndefined(item.id ?? item.log_id ?? metadata.log_id),
    connectedAccountId: stringOrUndefined(
      item.connected_account_id ?? item.connectedAccountId ?? metadata.connected_account_id,
    ),
    triggerId: stringOrUndefined(item.trigger_id ?? item.triggerId ?? metadata.trigger_id),
    triggerSlug: stringOrUndefined(item.trigger_slug ?? item.triggerSlug ?? metadata.trigger_slug),
    status: stringOrUndefined(item.status ?? metadata.status),
    startTime: stringOrUndefined(item.start_time ?? item.startTime ?? metadata.start_time),
    endTime: stringOrUndefined(item.end_time ?? item.endTime ?? metadata.end_time),
    raw: item,
  };
}

function normalizeInternalActionExecutionLogFields(
  response: Record<string, unknown>,
): ComposioInternalActionExecutionLogField[] {
  const fieldContainer = Array.isArray(response.fields)
    ? response.fields
    : extractListItems(response);

  const fields: ComposioInternalActionExecutionLogField[] = [];
  for (const entry of fieldContainer) {
    if (typeof entry === 'string') {
      fields.push({
        name: entry,
        raw: { name: entry },
      });
      continue;
    }
    if (!isRecord(entry)) continue;
    const name = stringOrUndefined(entry.name ?? entry.field ?? entry.key ?? entry.id);
    if (!name) continue;
    fields.push({
      name,
      type: stringOrUndefined(entry.type),
      description: stringOrUndefined(entry.description),
      raw: entry,
    });
  }

  return fields;
}

function extractListItems(response: Record<string, unknown>): unknown[] {
  if (Array.isArray(response.items)) return response.items;
  if (Array.isArray(response.results)) return response.results;
  if (Array.isArray(response.data)) return response.data;
  if (Array.isArray(response.logs)) return response.logs;

  if (isRecord(response.data)) {
    const nestedData = response.data;
    if (Array.isArray(nestedData.items)) return nestedData.items;
    if (Array.isArray(nestedData.results)) return nestedData.results;
    if (Array.isArray(nestedData.logs)) return nestedData.logs;
  }

  return [];
}

function extractNextCursor(response: Record<string, unknown>): string | null {
  const direct = nullableString(response.nextCursor ?? response.next_cursor ?? response.cursor);
  if (direct !== null) return direct;

  if (isRecord(response.data)) {
    const nested = nullableString(
      response.data.nextCursor ?? response.data.next_cursor ?? response.data.cursor,
    );
    if (nested !== null) return nested;
  }

  return null;
}

function resolveInternalApiBaseUrl(rawBaseUrl: string | undefined): string {
  const baseUrl = (rawBaseUrl && rawBaseUrl.trim())
    ? rawBaseUrl.trim()
    : 'https://backend.composio.dev';
  return baseUrl.replace(/\/+$/, '');
}

function joinUrl(baseUrl: string, path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const normalizedBase = baseUrl.replace(/\/+$/, '');

  if (normalizedBase.endsWith('/api/v3') && normalizedPath.startsWith('/api/v3/')) {
    return `${normalizedBase}${normalizedPath.slice('/api/v3'.length)}`;
  }

  return `${normalizedBase}${normalizedPath}`;
}

function truncate(value: string, maxLength: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength)}...`;
}

function toSerializableRecord(value: unknown): Record<string, unknown> {
  if (isRecord(value)) return value;

  if (value && typeof value === 'object' && 'toJSON' in value) {
    const candidate = (value as { toJSON?: () => unknown }).toJSON?.();
    if (isRecord(candidate)) return candidate;
  }

  try {
    const cloned = JSON.parse(JSON.stringify(value)) as unknown;
    if (isRecord(cloned)) return cloned;
  } catch {
    // Best effort fallback below.
  }

  return {};
}

function stringOrUndefined(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function nullableString(value: unknown): string | null {
  const normalized = stringOrUndefined(value);
  return normalized ?? null;
}

function numberOrUndefined(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function booleanOrUndefined(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  return undefined;
}

function arrayOfStrings(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const normalized = value
    .filter((entry) => typeof entry === 'string')
    .map((entry) => String(entry).trim())
    .filter(Boolean);
  return normalized.length > 0 ? normalized : undefined;
}

function toBridgeError(
  error: unknown,
  prefix: string,
  code: string,
): ComposioBridgeError {
  if (error instanceof ComposioBridgeError) {
    const message = error.message.startsWith(prefix)
      ? error.message
      : `${prefix}: ${error.message}`;
    return new ComposioBridgeError(message, code, error.statusCode);
  }
  const statusCode = extractStatusCode(error);
  const detail = error instanceof Error ? error.message : String(error);
  return new ComposioBridgeError(`${prefix}: ${detail}`, code, statusCode);
}

function isRetryableError(
  error: unknown,
  policy: NormalizedRetryPolicy,
): boolean {
  const statusCode = extractStatusCode(error);
  if (statusCode !== undefined && policy.retryableStatusCodes.has(statusCode)) {
    return true;
  }

  const errorCode = extractErrorCode(error);
  if (errorCode && policy.retryableErrorCodes.has(errorCode)) {
    return true;
  }

  const message = extractErrorMessage(error).toLowerCase();
  if (!message) return false;

  return (
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('network') ||
    message.includes('socket hang up') ||
    message.includes('fetch failed') ||
    message.includes('rate limit') ||
    message.includes('temporarily unavailable') ||
    message.includes('service unavailable') ||
    message.includes('bad gateway')
  );
}

function backoffDelayMs(
  policy: NormalizedRetryPolicy,
  attempt: number,
): number {
  const unbounded = policy.baseDelayMs * (2 ** Math.max(0, attempt - 1));
  const bounded = Math.min(policy.maxDelayMs, unbounded);
  const jitterWindow = bounded * policy.jitterRatio;

  if (jitterWindow === 0) return Math.round(bounded);

  const jittered = bounded - jitterWindow + (Math.random() * jitterWindow * 2);
  return Math.max(0, Math.round(jittered));
}

function extractErrorCode(error: unknown): string | undefined {
  if (!isRecord(error)) return undefined;

  const direct = (error.code ?? error.errorCode) as unknown;
  if (typeof direct === 'string' && direct.trim()) return direct.trim().toUpperCase();

  const cause = error.cause;
  if (isRecord(cause)) {
    const nested = (cause.code ?? cause.errorCode) as unknown;
    if (typeof nested === 'string' && nested.trim()) return nested.trim().toUpperCase();
  }

  return undefined;
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (isRecord(error) && typeof error.message === 'string') return error.message;
  return '';
}

function extractStatusCode(error: unknown): number | undefined {
  if (!isRecord(error)) return undefined;

  const direct =
    numberOrUndefined(error.statusCode) ??
    numberOrUndefined(error.status);
  if (direct !== undefined) return Math.trunc(direct);

  const response = error.response;
  if (isRecord(response)) {
    const status = numberOrUndefined(response.status);
    if (status !== undefined) return Math.trunc(status);
  }

  const cause = error.cause;
  if (isRecord(cause)) {
    const nested =
      numberOrUndefined(cause.statusCode) ??
      numberOrUndefined(cause.status);
    if (nested !== undefined) return Math.trunc(nested);
  }

  return undefined;
}

function clampInteger(
  value: number | undefined,
  min: number,
  max: number,
  fallback: number,
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function clampNumber(
  value: number | undefined,
  min: number,
  max: number,
  fallback: number,
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
