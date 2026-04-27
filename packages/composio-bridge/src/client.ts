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
  ComposioClientConfig,
  ComposioAccount,
  ComposioExecutionPolicy,
  ComposioMcpCreateInput,
  ComposioMcpGeneratedInstance,
  ComposioMcpServerConfig,
  ComposioMcpToolkitConfig,
  ComposioToolDiscoveryOptions,
  ComposioToolkitListOptions,
  ComposioToolkitSummary
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
    | 'MCP_CREATE'
    | 'MCP_GENERATE';
  idempotent: boolean;
}

type ComposioMcpSdk = {
  create: (
    name: string,
    config: {
      toolkits: ComposioMcpSdkToolkitConfig[];
      allowedTools?: string[];
    }
  ) => Promise<unknown>;
  generate: (userId: string, mcpConfigId: string) => Promise<unknown>;
};

type ComposioMcpSdkToolkitConfig = string | { authConfigId: string };

const DEFAULT_RETRY_STATUS_CODES = [408, 409, 425, 429, 500, 502, 503, 504];
const DEFAULT_RETRY_ERROR_CODES = [
  'ETIMEDOUT',
  'ECONNRESET',
  'ECONNREFUSED',
  'EAI_AGAIN',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'FETCH_FAILED',
  'ERR_NETWORK'
];

function normalizeExecutionPolicy(
  policy: ComposioExecutionPolicy | undefined
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
          : DEFAULT_RETRY_STATUS_CODES
        ).map((status) => Math.trunc(status))
      ),
      retryableErrorCodes: new Set(
        (retry.retryableErrorCodes && retry.retryableErrorCodes.length > 0
          ? retry.retryableErrorCodes
          : DEFAULT_RETRY_ERROR_CODES
        ).map((code) => code.trim().toUpperCase())
      )
    }
  };
}

// =============================================================================
// ComposioClient
// =============================================================================

export class ComposioClient {
  private readonly composio: Composio;
  private readonly config: ComposioClientConfig;
  private readonly executionPolicy: NormalizedExecutionPolicy;

  constructor(config: ComposioClientConfig) {
    this.config = config;
    this.executionPolicy = normalizeExecutionPolicy(config.executionPolicy);

    this.composio = new Composio({
      apiKey: config.apiKey,
      ...(config.baseURL ? { baseURL: config.baseURL } : {})
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
    options: ComposioToolDiscoveryOptions = {}
  ): Promise<ComposioToolDef[]> {
    try {
      const rawTools = await this.runWithPolicy(
        () =>
          this.composio.tools.getRawComposioTools({
            toolkits: toolkits.map((t) => t.toLowerCase()),
            ...(options.limit ? { limit: options.limit } : {}),
            ...(typeof options.important === 'boolean' ? { important: options.important } : {}),
            ...(options.search ? { search: options.search } : {}),
            ...(options.authConfigIds && options.authConfigIds.length > 0
              ? { authConfigIds: options.authConfigIds }
              : {})
          }),
        { operation: 'TOOLS_FETCH', idempotent: true }
      );
      const rawItems = Array.isArray(rawTools)
        ? rawTools.filter(isRecord)
        : (
            (Array.isArray((rawTools as Record<string, unknown>)?.items)
              ? (rawTools as Record<string, unknown>).items
              : []) as unknown[]
          ).filter(isRecord);

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
              ''
          ),
          parameters: normalizeParameters(rawTool.inputParameters ?? rawTool.parameters)
        };
      });
    } catch (error) {
      throw toBridgeError(
        error,
        `Failed to fetch tools for toolkits [${toolkits.join(', ')}]`,
        'TOOLS_FETCH_FAILED'
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
        () =>
          this.composio.toolkits.get({
            ...(options.category ? { category: options.category } : {}),
            ...(options.managedBy ? { managedBy: options.managedBy } : {}),
            ...(options.sortBy ? { sortBy: options.sortBy } : {}),
            ...(options.limit ? { limit: options.limit } : {}),
            ...(options.cursor ? { cursor: options.cursor } : {})
          }),
        { operation: 'TOOLKITS_FETCH', idempotent: true }
      );

      const items = Array.isArray(response)
        ? response.filter(isRecord)
        : (
            (Array.isArray((response as Record<string, unknown>)?.items)
              ? (response as Record<string, unknown>).items
              : []) as unknown[]
          ).filter(isRecord);

      return items.map((item) => normalizeToolkit(item as Record<string, unknown>));
    } catch (error) {
      throw toBridgeError(error, 'Failed to list toolkits', 'TOOLKITS_FETCH_FAILED');
    }
  }

  // ===========================================================================
  // Composio-hosted MCP configs (Automation tier)
  // ===========================================================================

  /**
   * Create a Composio-hosted MCP config.
   *
   * This is used for single-toolkit MCPs where Composio hosts the MCP endpoint
   * directly and the Hub consumes the generated per-user URL.
   */
  async createMcpConfig(input: ComposioMcpCreateInput): Promise<ComposioMcpServerConfig> {
    const name = input.name.trim();
    if (!name) {
      throw new ComposioBridgeError('MCP config name is required.', 'MCP_CREATE_INVALID_INPUT');
    }

    const toolkits = input.toolkits
      .map((toolkit) => ({
        toolkit: toolkit.toolkit.trim().toLowerCase(),
        authConfigId: toolkit.authConfigId.trim()
      }))
      .filter((toolkit) => toolkit.toolkit && toolkit.authConfigId);

    if (toolkits.length === 0) {
      throw new ComposioBridgeError(
        'At least one toolkit/authConfigId pair is required to create a Composio MCP config.',
        'MCP_CREATE_INVALID_INPUT'
      );
    }

    const allowedTools = normalizeAllowedTools(input.allowedTools);

    try {
      const mcp = this.getMcpSdk();
      const response = await this.runWithPolicy(
        () =>
          mcp.create(name, {
            toolkits: toMcpSdkToolkits(toolkits),
            ...(allowedTools.length > 0 ? { allowedTools } : {})
          }),
        { operation: 'MCP_CREATE', idempotent: false }
      );

      return normalizeMcpServerConfig(response);
    } catch (error) {
      throw toBridgeError(
        error,
        `Failed to create Composio MCP config "${name}"`,
        'MCP_CREATE_FAILED'
      );
    }
  }

  /**
   * Generate a per-user URL for a Composio-hosted MCP config.
   */
  async generateMcpInstance(
    userId: string,
    mcpConfigId: string
  ): Promise<ComposioMcpGeneratedInstance> {
    const normalizedUserId = userId.trim();
    const normalizedConfigId = mcpConfigId.trim();

    if (!normalizedUserId) {
      throw new ComposioBridgeError('Composio user ID is required.', 'MCP_GENERATE_INVALID_INPUT');
    }
    if (!normalizedConfigId) {
      throw new ComposioBridgeError(
        'Composio MCP config ID is required.',
        'MCP_GENERATE_INVALID_INPUT'
      );
    }

    try {
      const mcp = this.getMcpSdk();
      const response = await this.runWithPolicy(
        () => mcp.generate(normalizedUserId, normalizedConfigId),
        { operation: 'MCP_GENERATE', idempotent: false }
      );

      return normalizeMcpGeneratedInstance(response);
    } catch (error) {
      throw toBridgeError(
        error,
        `Failed to generate Composio MCP URL for config "${normalizedConfigId}"`,
        'MCP_GENERATE_FAILED'
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
   * @param connectedAccountId - Optional explicit Composio connected account ID
   */
  async executeTool(
    toolSlug: string,
    params: Record<string, unknown>,
    userId?: string,
    connectedAccountId?: string
  ): Promise<Record<string, unknown>> {
    try {
      const result = await this.runWithPolicy(
        () =>
          this.composio.tools.execute(toolSlug, {
            userId: userId ?? 'default',
            ...(connectedAccountId ? { connectedAccountId } : {}),
            arguments: params,
            dangerouslySkipVersionCheck: true
          }),
        { operation: 'TOOL_EXECUTE', idempotent: false }
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
        () =>
          this.composio.connectedAccounts.list({
            userIds: [userId]
          }),
        { operation: 'ACCOUNTS_FETCH', idempotent: true }
      );

      const items =
        (response as Record<string, unknown>)?.items ?? (Array.isArray(response) ? response : []);

      return (items as Record<string, unknown>[]).map((account) => ({
        connectionId: String(account.id ?? account.nanoid ?? ''),
        app: String(
          (account.toolkit as Record<string, unknown>)?.slug ?? account.appName ?? account.app ?? ''
        ),
        entityId: String(account.userId ?? account.entityId ?? userId),
        status: mapConnectionStatus(account.status),
        createdAt: account.createdAt ? String(account.createdAt) : undefined,
        rawStatus: account.status ? String(account.status) : undefined
      }));
    } catch (error) {
      throw toBridgeError(
        error,
        `Failed to fetch connected accounts for user ${userId}`,
        'ACCOUNTS_FETCH_FAILED'
      );
    }
  }

  /**
   * Check if a user has an active connection for a specific toolkit.
   */
  async hasActiveConnection(userId: string, toolkit: string): Promise<boolean> {
    const accounts = await this.getConnectedAccounts(userId);
    return accounts.some(
      (a) => a.app.toLowerCase() === toolkit.toLowerCase() && a.status === 'active'
    );
  }

  /**
   * Get connected accounts for one toolkit/app for a given user/entity.
   */
  async getConnectedAccountsForToolkit(
    userId: string,
    toolkit: string
  ): Promise<ComposioAccount[]> {
    const normalizedToolkit = toolkit.trim().toLowerCase();
    const accounts = await this.getConnectedAccounts(userId);
    return accounts
      .filter((account) => account.app.toLowerCase() === normalizedToolkit)
      .sort(compareComposioAccountsNewestFirst);
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
        limit: 1
      });
      return { ok: true, latencyMs: Date.now() - start };
    } catch (error) {
      return {
        ok: false,
        latencyMs: Date.now() - start,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async runWithPolicy<T>(operation: () => Promise<T>, context: PolicyContext): Promise<T> {
    const { retryMode, retry } = this.executionPolicy;
    const retriesAllowed = retryMode === 'all' || (retryMode === 'safe' && context.idempotent);
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

  // ===========================================================================
  // Accessors
  // ===========================================================================

  /**
   * Get the underlying Composio SDK instance (for evaluation scripts).
   */
  getSDK(): Composio {
    return this.composio;
  }

  private getMcpSdk(): ComposioMcpSdk {
    const mcp = (this.composio as unknown as { mcp?: unknown }).mcp;
    if (!isRecord(mcp)) {
      throw new ComposioBridgeError(
        'Installed @composio/core does not expose composio.mcp. Update @composio/core before using hosted MCP config creation.',
        'MCP_SDK_UNAVAILABLE'
      );
    }

    if (typeof mcp.create !== 'function' || typeof mcp.generate !== 'function') {
      throw new ComposioBridgeError(
        'Installed @composio/core composio.mcp surface is missing create/generate methods.',
        'MCP_SDK_UNAVAILABLE'
      );
    }

    return mcp as unknown as ComposioMcpSdk;
  }
}

// =============================================================================
// Helpers
// =============================================================================

function mapConnectionStatus(status: unknown): ComposioAccount['status'] {
  const s = String(status).toLowerCase();
  if (s === 'active' || s === 'connected') return 'active';
  if (s === 'expired') return 'expired';
  if (s === 'revoked' || s === 'disconnected') return 'revoked';
  return 'pending';
}

function compareComposioAccountsNewestFirst(a: ComposioAccount, b: ComposioAccount): number {
  const aTime = Date.parse(a.createdAt ?? '') || 0;
  const bTime = Date.parse(b.createdAt ?? '') || 0;
  return bTime - aTime;
}

/**
 * Normalize various parameter formats into our standard JSON Schema shape.
 */
function normalizeParameters(params: unknown): ComposioToolDef['parameters'] {
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
        description: param.description ?? undefined
      };

      if (param.required) {
        required.push(name);
      }
    }

    return {
      type: 'object',
      properties,
      ...(required.length > 0 ? { required } : {})
    };
  }

  // Fallback — treat as flat properties
  return {
    type: 'object',
    properties: (p.properties as Record<string, unknown>) ?? {},
    required: (p.required as string[]) ?? undefined
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
        return String(c.slug ?? c.id ?? c.name ?? '')
          .trim()
          .toLowerCase();
      })
      .filter(Boolean),
    toolsCount: numberOrUndefined(meta.toolsCount ?? meta.tools_count),
    triggersCount: numberOrUndefined(meta.triggersCount ?? meta.triggers_count),
    availableVersions: arrayOfStrings(meta.availableVersions),
    authSchemes: arrayOfStrings(raw.authSchemes),
    composioManagedAuthSchemes: arrayOfStrings(raw.composioManagedAuthSchemes),
    noAuth: booleanOrUndefined(raw.noAuth),
    isLocalToolkit: Boolean(raw.isLocalToolkit)
  };
}

function normalizeAllowedTools(value: string[] | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((tool) => tool.trim()).filter((tool) => tool.length > 0)));
}

function toMcpSdkToolkits(toolkits: ComposioMcpToolkitConfig[]): ComposioMcpSdkToolkitConfig[] {
  return toolkits.flatMap((toolkit) => [toolkit.toolkit, { authConfigId: toolkit.authConfigId }]);
}

function normalizeMcpServerConfig(value: unknown): ComposioMcpServerConfig {
  const record = isRecord(value) ? value : {};
  const id =
    stringOrUndefined(record.id) ??
    stringOrUndefined(record.nanoid) ??
    stringOrUndefined(record.mcpConfigId) ??
    stringOrUndefined(record.configId);

  if (!id) {
    throw new ComposioBridgeError(
      `Composio MCP create response did not include an id: ${safeJson(value)}`,
      'MCP_CREATE_INVALID_RESPONSE'
    );
  }

  return {
    ...record,
    id,
    name: stringOrUndefined(record.name)
  };
}

function normalizeMcpGeneratedInstance(value: unknown): ComposioMcpGeneratedInstance {
  const record = isRecord(value) ? value : {};
  const url =
    stringOrUndefined(record.url) ??
    stringOrUndefined(record.serverUrl) ??
    stringOrUndefined(record.mcpServerUrl);

  if (!url) {
    throw new ComposioBridgeError(
      `Composio MCP generate response did not include a URL: ${safeJson(value)}`,
      'MCP_GENERATE_INVALID_RESPONSE'
    );
  }

  return {
    ...record,
    url
  };
}

function stringOrUndefined(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
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

function toBridgeError(error: unknown, prefix: string, code: string): ComposioBridgeError {
  if (error instanceof ComposioBridgeError) {
    const message = error.message.startsWith(prefix)
      ? error.message
      : `${prefix}: ${error.message}`;
    return new ComposioBridgeError(message, code, error.statusCode);
  }
  const statusCode = extractStatusCode(error);
  const detail = extractErrorMessage(error) || String(error);
  const statusDetail = statusCode !== undefined ? ` (status ${statusCode})` : '';
  const diagnosticDetail = extractErrorDiagnostic(error);
  const diagnosticSuffix = diagnosticDetail ? `; ${diagnosticDetail}` : '';
  return new ComposioBridgeError(
    `${prefix}: ${detail}${statusDetail}${diagnosticSuffix}`,
    code,
    statusCode
  );
}

function isRetryableError(error: unknown, policy: NormalizedRetryPolicy): boolean {
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

function backoffDelayMs(policy: NormalizedRetryPolicy, attempt: number): number {
  const unbounded = policy.baseDelayMs * 2 ** Math.max(0, attempt - 1);
  const bounded = Math.min(policy.maxDelayMs, unbounded);
  const jitterWindow = bounded * policy.jitterRatio;

  if (jitterWindow === 0) return Math.round(bounded);

  const jittered = bounded - jitterWindow + Math.random() * jitterWindow * 2;
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

function extractErrorDiagnostic(error: unknown): string | undefined {
  if (!isRecord(error)) return undefined;

  const response = isRecord(error.response) ? error.response : null;
  const cause = isRecord(error.cause) ? error.cause : null;
  const candidates: unknown[] = [
    error.details,
    error.error,
    response?.error,
    response?.message,
    response?.body,
    response?.data,
    cause?.details,
    cause?.error,
    cause?.message
  ];

  for (const candidate of candidates) {
    const rendered = renderDiagnosticValue(candidate);
    if (rendered) return rendered;
  }

  return undefined;
}

function renderDiagnosticValue(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (!value || typeof value !== 'object') return undefined;

  try {
    const serialized = JSON.stringify(value);
    if (!serialized || serialized === '{}') return undefined;
    return serialized.length > 400 ? `${serialized.slice(0, 400)}...` : serialized;
  } catch {
    return undefined;
  }
}

function extractStatusCode(error: unknown): number | undefined {
  if (!isRecord(error)) return undefined;

  const direct = numberOrUndefined(error.statusCode) ?? numberOrUndefined(error.status);
  if (direct !== undefined) return Math.trunc(direct);

  const response = error.response;
  if (isRecord(response)) {
    const status = numberOrUndefined(response.status);
    if (status !== undefined) return Math.trunc(status);
  }

  const cause = error.cause;
  if (isRecord(cause)) {
    const nested = numberOrUndefined(cause.statusCode) ?? numberOrUndefined(cause.status);
    if (nested !== undefined) return Math.trunc(nested);
  }

  return undefined;
}

function clampInteger(
  value: number | undefined,
  min: number,
  max: number,
  fallback: number
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function clampNumber(
  value: number | undefined,
  min: number,
  max: number,
  fallback: number
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
