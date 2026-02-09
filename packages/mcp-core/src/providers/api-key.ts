/**
 * APIKeyProvider — API key per account
 *
 * The simplest auth pattern: extract an API key from the request
 * (header, query param, or environment variable) and map it to an
 * AccountContext.
 *
 * For stdio: reads from environment variable.
 * For HTTP: reads from Authorization header or X-API-Key header.
 *
 * Three-Tier alignment:
 *   - Database: API key → account mapping (via resolver function)
 *   - Judgment: policy per account (via optional resolver)
 */

import type { AccountContext, AccountPolicy, TokenProvider } from '../context.js';
import type { AuthProvider } from '../auth.js';
import { defaultPolicy } from '../context.js';
import { AuthError } from '../server.js';

// =============================================================================
// Configuration
// =============================================================================

export interface APIKeyConfig {
  /**
   * Resolve an API key to an account.
   *
   * Returns account info or null if the key is invalid.
   * This is where you'd look up the key in a database, KV store, etc.
   */
  resolveAccount: (apiKey: string) => Promise<{
    accountId: string;
    userId?: string;
    teamId?: string;
    metadata?: Record<string, unknown>;
  } | null>;

  /**
   * Optional: resolve policy per account.
   *
   * If not provided, a default permissive policy is used.
   */
  resolvePolicy?: (accountId: string) => Promise<AccountPolicy>;

  /**
   * Header name to extract the API key from (default: 'x-api-key').
   * Also checks Authorization: Bearer <key> header.
   */
  headerName?: string;

  /**
   * Environment variable name for stdio mode (default: 'API_KEY').
   */
  envVar?: string;
}

// =============================================================================
// APIKeyProvider
// =============================================================================

export class APIKeyProvider implements AuthProvider {
  private readonly config: APIKeyConfig;
  private readonly headerName: string;
  private readonly envVar: string;

  constructor(config: APIKeyConfig) {
    this.config = config;
    this.headerName = config.headerName ?? 'x-api-key';
    this.envVar = config.envVar ?? 'API_KEY';
  }

  async resolve(request: Request | null): Promise<AccountContext> {
    // Extract API key
    const apiKey = request
      ? this.extractFromRequest(request)
      : this.extractFromEnv();

    if (!apiKey) {
      throw new AuthError(
        request
          ? `Missing API key. Provide via ${this.headerName} header or Authorization: Bearer <key>`
          : `Missing API key. Set the ${this.envVar} environment variable.`,
      );
    }

    // Resolve account
    const account = await this.config.resolveAccount(apiKey);
    if (!account) {
      throw new AuthError('Invalid API key.');
    }

    // Build token provider (API key is the token)
    const tokenProvider: TokenProvider = {
      getAccessToken: async () => apiKey,
    };

    // Resolve policy
    const policy = this.config.resolvePolicy
      ? await this.config.resolvePolicy(account.accountId)
      : defaultPolicy();

    return {
      accountId: account.accountId,
      userId: account.userId,
      teamId: account.teamId,
      tokenProvider,
      metadata: account.metadata ?? {},
      policy,
    };
  }

  private extractFromRequest(request: Request): string | null {
    // Check custom header
    const headerKey = request.headers.get(this.headerName);
    if (headerKey) return headerKey;

    // Check Authorization: Bearer <key>
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    return null;
  }

  private extractFromEnv(): string | null {
    return process.env[this.envVar] ?? null;
  }
}
