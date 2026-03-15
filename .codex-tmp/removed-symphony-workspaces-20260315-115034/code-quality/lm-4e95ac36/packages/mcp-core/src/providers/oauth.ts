/**
 * OAuthProvider — OAuth 2.0 authorization code flow
 *
 * Pattern A from sdk-auth-patterns.md: own auth with raw fetch.
 * No vendor SDK dependency — standard OAuth 2.0 is ~200 lines of fetch.
 *
 * Supports:
 *   - Authorization code flow (with PKCE optional)
 *   - Token refresh with configurable buffer
 *   - Multi-account via TokenStore keying
 *
 * Three-Tier alignment:
 *   - Database: TokenStore persistence
 *   - Automation: token refresh (happens transparently)
 *   - Judgment: scopes define what the account can do
 */

import type { AccountContext, AccountPolicy, TokenProvider, TokenSet, TokenStore } from '../context.js';
import type { AuthProvider } from '../auth.js';
import { defaultPolicy } from '../context.js';
import { AuthError } from '../server.js';

// =============================================================================
// Configuration
// =============================================================================

export interface OAuthConfig {
  /** OAuth client ID */
  clientId: string;

  /** OAuth client secret */
  clientSecret: string;

  /** Token endpoint URL (e.g., 'https://oauth.example.com/token') */
  tokenEndpoint: string;

  /** Authorization endpoint URL (for setup flow) */
  authorizationEndpoint?: string;

  /** Redirect URI (for setup flow) */
  redirectUri?: string;

  /** Default scopes to request */
  scopes?: string[];

  /** Token store for persistence */
  tokenStore: TokenStore;

  /**
   * Resolve the accountId from an HTTP request.
   *
   * For single-account setups, return a static string.
   * For multi-account, extract from request headers, path, or session.
   */
  resolveAccountId: (request: Request | null) => Promise<string>;

  /**
   * Optional: resolve additional account metadata.
   *
   * Use for service-specific data (realmId, workspace URL, etc.)
   */
  resolveMetadata?: (accountId: string) => Promise<Record<string, unknown>>;

  /**
   * Optional: resolve policy per account.
   *
   * If not provided, a default permissive policy is used.
   */
  resolvePolicy?: (accountId: string) => Promise<AccountPolicy>;

  /** Token refresh buffer in milliseconds (default: 5 minutes) */
  refreshBufferMs?: number;
}

// =============================================================================
// OAuthProvider
// =============================================================================

export class OAuthProvider implements AuthProvider {
  private readonly config: OAuthConfig;
  private readonly refreshBuffer: number;

  constructor(config: OAuthConfig) {
    this.config = config;
    this.refreshBuffer = config.refreshBufferMs ?? 5 * 60 * 1000;
  }

  async resolve(request: Request | null): Promise<AccountContext> {
    const accountId = await this.config.resolveAccountId(request);

    // Load tokens from store
    const tokens = await this.config.tokenStore.get(accountId);
    if (!tokens) {
      throw new AuthError(
        `No tokens found for account ${accountId}. Run the auth setup flow first.`,
      );
    }

    // Refresh if needed
    const refreshedTokens = await this.refreshIfNeeded(accountId, tokens);

    // Build token provider
    const tokenProvider: TokenProvider = {
      getAccessToken: async () => {
        // Re-check freshness on each call
        const current = await this.config.tokenStore.get(accountId);
        if (!current) throw new AuthError(`Tokens expired for account ${accountId}`);

        if (this.isExpired(current)) {
          const refreshed = await this.refreshTokens(accountId, current);
          return refreshed.access_token;
        }

        return current.access_token;
      },
    };

    // Resolve metadata and policy
    const metadata = this.config.resolveMetadata
      ? await this.config.resolveMetadata(accountId)
      : {};

    const policy = this.config.resolvePolicy
      ? await this.config.resolvePolicy(accountId)
      : defaultPolicy({ scopes: refreshedTokens.scopes ?? this.config.scopes ?? [] });

    return {
      accountId,
      tokenProvider,
      metadata,
      policy,
    };
  }

  async persistTokens(ctx: AccountContext, tokens: TokenSet): Promise<void> {
    await this.config.tokenStore.set(ctx.accountId, tokens);
  }

  // ===========================================================================
  // Token Refresh
  // ===========================================================================

  private isExpired(tokens: TokenSet): boolean {
    if (!tokens.expires_at) return false;
    return Date.now() >= tokens.expires_at - this.refreshBuffer;
  }

  private async refreshIfNeeded(accountId: string, tokens: TokenSet): Promise<TokenSet> {
    if (!this.isExpired(tokens)) return tokens;
    return this.refreshTokens(accountId, tokens);
  }

  private async refreshTokens(accountId: string, tokens: TokenSet): Promise<TokenSet> {
    if (!tokens.refresh_token) {
      throw new AuthError(
        `Token expired for account ${accountId} and no refresh token available.`,
      );
    }

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokens.refresh_token,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    });

    const response = await fetch(this.config.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new AuthError(
        `Token refresh failed for account ${accountId}: ${response.status} ${errorText}`,
      );
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    };

    const newTokens: TokenSet = {
      access_token: data.access_token,
      refresh_token: data.refresh_token ?? tokens.refresh_token,
      expires_at: data.expires_in
        ? Date.now() + data.expires_in * 1000
        : undefined,
      scopes: data.scope?.split(' ') ?? tokens.scopes,
    };

    // Persist the refreshed tokens
    await this.config.tokenStore.set(accountId, newTokens);

    return newTokens;
  }
}
