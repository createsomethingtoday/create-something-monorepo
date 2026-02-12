/**
 * NotionSyncAuth — AuthProvider for the Notion Sync MCP server
 *
 * Three-Tier Framework alignment:
 *   - Database:  Reads Cloudflare credentials from env vars (static state)
 *   - Judgment:  Policy is permissive by default (all tools available)
 *   - Artifact:  Produces AccountContext with D1Executor in metadata
 *
 * The Cloudflare credentials (CF_ACCOUNT_ID, CF_API_TOKEN, CF_D1_DATABASE_ID)
 * are infrastructure — they scope the D1 database, not the Notion data.
 * Notion tokens are per-client and stored in D1 as part of client registration.
 */

import type { AccountContext } from '@create-something/mcp-core';
import type { AuthProvider } from '@create-something/mcp-core';
import { defaultPolicy, AuthError } from '@create-something/mcp-core';
import type { D1Config, D1Executor, D1DatabaseBinding } from './types.js';
import { createRestExecutor, createBindingExecutor } from './services/d1.js';

// =============================================================================
// Configuration
// =============================================================================

export interface NotionSyncAuthConfig {
  /** Account ID (default: 'default') */
  accountId?: string;

  /**
   * How to resolve D1 configuration.
   *
   * - 'env': Read from CF_ACCOUNT_ID, CF_API_TOKEN, CF_D1_DATABASE_ID env vars → REST executor
   * - 'static': Provide config directly (testing) → REST executor
   * - 'binding': Use D1 binding directly (Worker mode) → Binding executor (faster)
   */
  d1Source:
    | { type: 'env' }
    | { type: 'static'; config: D1Config }
    | { type: 'binding'; db: D1DatabaseBinding };

  /**
   * Optional encryption key for Notion tokens at rest.
   * When set, tokens are encrypted with AES-GCM before storing in D1.
   * For 'env' mode, falls back to TOKEN_ENCRYPTION_KEY env var.
   */
  encryptionKey?: string;
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
    const executor = this.resolveExecutor();

    return {
      accountId,
      tokenProvider: {
        // The "token" for this server is synthetic — D1 access is via executor
        getAccessToken: async () => 'n/a',
      },
      metadata: {
        d1Executor: executor,
      },
      policy: defaultPolicy(),
    };
  }

  private resolveExecutor(): D1Executor {
    const source = this.config.d1Source;
    const encryptionKey = this.config.encryptionKey
      ?? (source.type === 'env' ? process.env.TOKEN_ENCRYPTION_KEY : undefined);

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

        return createRestExecutor(
          { accountId: accountId!, apiToken: apiToken!, databaseId: databaseId! },
          encryptionKey
        );
      }

      case 'static': {
        return createRestExecutor(source.config, encryptionKey);
      }

      case 'binding': {
        return createBindingExecutor(source.db, encryptionKey);
      }
    }
  }
}

// =============================================================================
// Helper — extract D1Executor from AccountContext.metadata
// =============================================================================

/**
 * Extract D1 executor from an AccountContext.
 *
 * This is the canonical way to get D1 access in tool/resource handlers.
 * The auth provider puts the executor in metadata; services extract it here.
 */
export function getD1Executor(ctx: AccountContext): D1Executor {
  return ctx.metadata.d1Executor as D1Executor;
}
