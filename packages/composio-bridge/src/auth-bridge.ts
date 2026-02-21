/**
 * ComposioAuthBridge — maps mcp-core AccountContext to Composio connected accounts
 *
 * The bridge between two identity systems:
 *   - mcp-core: AccountContext with accountId, tokenProvider, policy
 *   - Composio: entity_id → connected accounts per app
 *
 * This module provides:
 *   1. ComposioAuthProvider: an AuthProvider implementation that resolves
 *      AccountContext with Composio as the token backend
 *   2. ComposioTokenProvider: a TokenProvider that gets tokens via Composio SDK
 *   3. Utility functions for account mapping
 *
 * The wrap pattern applied to auth: mcp-core manages the MCP session,
 * Composio manages the OAuth tokens for third-party apps.
 *
 * Three-Tier alignment:
 *   - Database: connected accounts, token state (Composio-managed)
 *   - Automation: auth resolution flow
 *   - Judgment: policy assignment per account
 */

import type {
  AuthProvider,
  AccountContext,
  AccountPolicy,
  TokenProvider,
} from '@create-something/mcp-core';
import { defaultPolicy } from '@create-something/mcp-core';
import { ComposioClient } from './client.js';
import type { ComposioClientConfig, ComposioAccount } from './types.js';

// =============================================================================
// ComposioTokenProvider
// =============================================================================

/**
 * TokenProvider that delegates to Composio's managed auth.
 *
 * In the wrap pattern, Composio holds the OAuth tokens for third-party apps.
 * This provider returns a Composio API key or session token for tool execution,
 * NOT the third-party access token (Composio handles that internally).
 *
 * For tools registered via ComposioToolFactory, the actual OAuth token
 * is resolved by Composio's execution engine, not by us. This provider
 * exists to satisfy mcp-core's AccountContext contract.
 */
export class ComposioTokenProvider implements TokenProvider {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getAccessToken(): Promise<string> {
    // The Composio API key is used for all tool executions.
    // Per-app OAuth tokens are managed by Composio internally.
    return this.apiKey;
  }
}

// =============================================================================
// ComposioAuthProvider Configuration
// =============================================================================

export interface ComposioAuthProviderConfig extends ComposioClientConfig {
  /**
   * Resolve the account ID from an incoming request.
   *
   * For stdio: returns a default account ID.
   * For HTTP: extracts from headers, session, or URL.
   */
  resolveAccountId?: (request: Request | null) => string | Promise<string>;

  /**
   * Map mcp-core account IDs to Composio entity IDs.
   * Defaults to identity mapping (accountId = entityId).
   */
  resolveEntityId?: (accountId: string) => string | Promise<string>;

  /**
   * Policy to apply to all accounts. Defaults to permissive.
   */
  defaultPolicy?: Partial<AccountPolicy>;

  /**
   * Custom policy resolver per account.
   * Takes precedence over defaultPolicy if provided.
   */
  resolvePolicy?: (accountId: string) => AccountPolicy | Promise<AccountPolicy>;
}

// =============================================================================
// ComposioAuthProvider
// =============================================================================

/**
 * AuthProvider that uses Composio for managed OAuth.
 *
 * This is the auth bridge: mcp-core calls resolve() to get an AccountContext,
 * and this provider builds one backed by Composio's connected accounts.
 *
 * Usage:
 * ```typescript
 * const server = createScopedServer({
 *   name: 'my-mcp',
 *   version: '1.0.0',
 *   authProvider: new ComposioAuthProvider({
 *     apiKey: env.COMPOSIO_API_KEY,
 *     resolveAccountId: (req) => req?.headers.get('x-account-id') ?? 'default',
 *   }),
 * });
 * ```
 */
export class ComposioAuthProvider implements AuthProvider {
  private readonly client: ComposioClient;
  private readonly config: ComposioAuthProviderConfig;

  constructor(config: ComposioAuthProviderConfig) {
    this.config = config;
    this.client = new ComposioClient({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      fetch: config.fetch,
      timeoutMs: config.timeoutMs,
      executionPolicy: config.executionPolicy,
    });
  }

  /**
   * Resolve an incoming request to an AccountContext backed by Composio.
   */
  async resolve(request: Request | null): Promise<AccountContext> {
    // 1. Determine account ID
    const accountId = this.config.resolveAccountId
      ? await this.config.resolveAccountId(request)
      : 'default';

    // 2. Determine Composio entity ID
    const entityId = this.config.resolveEntityId
      ? await this.config.resolveEntityId(accountId)
      : accountId;

    // 3. Build policy
    const policy = this.config.resolvePolicy
      ? await this.config.resolvePolicy(accountId)
      : defaultPolicy(this.config.defaultPolicy);

    // 4. Build token provider (Composio API key)
    const tokenProvider = new ComposioTokenProvider(this.config.apiKey);

    return {
      accountId,
      tokenProvider,
      metadata: {
        composioEntityId: entityId,
        provider: 'composio-bridge',
      },
      policy,
    };
  }

  /**
   * Get connected accounts for a given entity.
   * Convenience method for evaluation and debugging.
   */
  async getConnectedAccounts(accountId: string): Promise<ComposioAccount[]> {
    const entityId = this.config.resolveEntityId
      ? await this.config.resolveEntityId(accountId)
      : accountId;

    return this.client.getConnectedAccounts(entityId);
  }

  /**
   * Check if an entity has an active connection for a specific app.
   */
  async hasActiveConnection(accountId: string, app: string): Promise<boolean> {
    const entityId = this.config.resolveEntityId
      ? await this.config.resolveEntityId(accountId)
      : accountId;

    return this.client.hasActiveConnection(entityId, app);
  }

  /**
   * Get the underlying ComposioClient (for evaluation scripts).
   */
  getClient(): ComposioClient {
    return this.client;
  }
}
