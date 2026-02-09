/**
 * StdioSingleUser — single-user auth for local stdio transport
 *
 * The simplest possible AuthProvider: reads credentials from environment
 * variables or a config file and returns a fixed AccountContext.
 *
 * Use this when:
 *   - Running locally via Claude Desktop or Claude Code
 *   - Only one account is needed
 *   - Auth credentials live in .env or a token file
 *
 * Three-Tier alignment:
 *   - Database: reads from env vars / token file (static state)
 *   - Judgment: policy is configured at construction time
 */

import type { AccountContext, AccountPolicy, TokenProvider, TokenStore } from '../context.js';
import type { AuthProvider } from '../auth.js';
import { defaultPolicy } from '../context.js';
import { AuthError } from '../server.js';

// =============================================================================
// Configuration
// =============================================================================

export interface StdioConfig {
  /** Account ID for this user (default: 'default') */
  accountId?: string;

  /** User ID (optional) */
  userId?: string;

  /** Team ID (optional) */
  teamId?: string;

  /**
   * How to get the access token.
   *
   * Options:
   *   - { type: 'env', name: 'MY_TOKEN' } — read from env var
   *   - { type: 'store', store: myTokenStore } — read from a TokenStore
   *   - { type: 'static', token: 'abc123' } — hardcoded (testing only)
   */
  tokenSource:
    | { type: 'env'; name: string }
    | { type: 'store'; store: TokenStore }
    | { type: 'static'; token: string };

  /** Account metadata */
  metadata?: Record<string, unknown>;

  /** Account policy (default: permissive) */
  policy?: Partial<AccountPolicy>;
}

// =============================================================================
// StdioSingleUser
// =============================================================================

export class StdioSingleUser implements AuthProvider {
  private readonly config: StdioConfig;

  constructor(config: StdioConfig) {
    this.config = config;
  }

  async resolve(_request: Request | null): Promise<AccountContext> {
    const accountId = this.config.accountId ?? 'default';

    // Resolve token
    const tokenProvider = await this.buildTokenProvider(accountId);

    return {
      accountId,
      userId: this.config.userId,
      teamId: this.config.teamId,
      tokenProvider,
      metadata: this.config.metadata ?? {},
      policy: defaultPolicy(this.config.policy),
    };
  }

  private async buildTokenProvider(accountId: string): Promise<TokenProvider> {
    const source = this.config.tokenSource;

    switch (source.type) {
      case 'env': {
        const token = process.env[source.name];
        if (!token) {
          throw new AuthError(
            `Missing token: set the ${source.name} environment variable.`,
          );
        }
        return { getAccessToken: async () => token };
      }

      case 'store': {
        return {
          getAccessToken: async () => {
            const tokens = await source.store.get(accountId);
            if (!tokens) {
              throw new AuthError(
                `No tokens found for account ${accountId}. Run 'pnpm auth' first.`,
              );
            }
            return tokens.access_token;
          },
        };
      }

      case 'static': {
        return { getAccessToken: async () => source.token };
      }
    }
  }
}
