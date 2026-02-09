/**
 * NotionSyncAuth — AuthProvider for the Notion Sync MCP server
 *
 * Three-Tier Framework alignment:
 *   - Database:  Reads Cloudflare credentials from env vars (static state)
 *   - Judgment:  Policy is permissive by default (all tools available)
 *   - Artifact:  Produces AccountContext with D1 config in metadata
 *
 * The Cloudflare credentials (CF_ACCOUNT_ID, CF_API_TOKEN, CF_D1_DATABASE_ID)
 * are infrastructure — they scope the D1 database, not the Notion data.
 * Notion tokens are per-client and stored in D1 as part of client registration.
 */

import type { AccountContext } from '@create-something/mcp-core';
import type { AuthProvider } from '@create-something/mcp-core';
import { defaultPolicy, AuthError } from '@create-something/mcp-core';
import type { D1Config } from './types.js';

// =============================================================================
// Configuration
// =============================================================================

export interface NotionSyncAuthConfig {
  /** Account ID (default: 'default') */
  accountId?: string;

  /**
   * How to resolve D1 configuration.
   *
   * - 'env': Read from CF_ACCOUNT_ID, CF_API_TOKEN, CF_D1_DATABASE_ID env vars
   * - 'static': Provide config directly (testing)
   */
  d1Source:
    | { type: 'env' }
    | { type: 'static'; config: D1Config };
}

// =============================================================================
// NotionSyncAuth
// =============================================================================

export class NotionSyncAuth implements AuthProvider {
  private readonly config: NotionSyncAuthConfig;

  constructor(config: NotionSyncAuthConfig) {
    this.config = config;
  }

  async resolve(_request: Request | null): Promise<AccountContext> {
    const accountId = this.config.accountId ?? 'default';
    const d1Config = this.resolveD1Config();

    return {
      accountId,
      tokenProvider: {
        // The "token" for this server is the CF API token (for D1 REST access)
        getAccessToken: async () => d1Config.apiToken,
      },
      metadata: {
        cfAccountId: d1Config.accountId,
        cfApiToken: d1Config.apiToken,
        cfD1DatabaseId: d1Config.databaseId,
      },
      policy: defaultPolicy(),
    };
  }

  private resolveD1Config(): D1Config {
    const source = this.config.d1Source;

    switch (source.type) {
      case 'env': {
        const accountId = process.env.CF_ACCOUNT_ID;
        const apiToken = process.env.CF_API_TOKEN;
        const databaseId = process.env.CF_D1_DATABASE_ID;

        const missing: string[] = [];
        if (!accountId) missing.push('CF_ACCOUNT_ID');
        if (!apiToken) missing.push('CF_API_TOKEN');
        if (!databaseId) missing.push('CF_D1_DATABASE_ID');

        if (missing.length > 0) {
          throw new AuthError(
            `Missing required environment variables: ${missing.join(', ')}. ` +
            'These are needed for Cloudflare D1 sync state storage.'
          );
        }

        return { accountId: accountId!, apiToken: apiToken!, databaseId: databaseId! };
      }

      case 'static': {
        return source.config;
      }
    }
  }
}

// =============================================================================
// Helper — extract D1Config from AccountContext.metadata
// =============================================================================

/**
 * Extract D1 configuration from an AccountContext.
 *
 * This is the canonical way to get D1 credentials in tool/resource handlers.
 * The auth provider puts them in metadata; services extract them here.
 */
export function getD1Config(ctx: AccountContext): D1Config {
  const meta = ctx.metadata;
  return {
    accountId: meta.cfAccountId as string,
    apiToken: meta.cfApiToken as string,
    databaseId: meta.cfD1DatabaseId as string,
  };
}
