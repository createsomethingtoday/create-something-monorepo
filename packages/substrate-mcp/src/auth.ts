/**
 * SubstrateAuth — AuthProvider for the Substrate MCP server
 *
 * Three-Tier Framework alignment:
 *   - Database:  Reads Cloudflare credentials from env vars
 *   - Judgment:  Policy is permissive by default
 *   - Artifact:  Produces AccountContext with D1 + R2 config in metadata
 *
 * Infrastructure credentials flow through metadata so every handler
 * can access both D1 (structured data) and R2 (file storage).
 */

import type { AccountContext } from '@create-something/mcp-core';
import type { AuthProvider } from '@create-something/mcp-core';
import { defaultPolicy, AuthError } from '@create-something/mcp-core';
import type { D1Config, R2Config, SubstrateConfig } from './types.js';

// =============================================================================
// Configuration
// =============================================================================

export interface SubstrateAuthConfig {
  accountId?: string;
  source:
    | { type: 'env' }
    | { type: 'static'; config: SubstrateConfig };
}

// =============================================================================
// SubstrateAuth
// =============================================================================

export class SubstrateAuth implements AuthProvider {
  private readonly config: SubstrateAuthConfig;

  constructor(config: SubstrateAuthConfig) {
    this.config = config;
  }

  async resolve(_request: Request | null): Promise<AccountContext> {
    const accountId = this.config.accountId ?? 'default';
    const infra = this.resolveConfig();

    return {
      accountId,
      tokenProvider: {
        getAccessToken: async () => infra.d1.apiToken,
      },
      metadata: {
        // D1 config
        cfAccountId: infra.d1.accountId,
        cfApiToken: infra.d1.apiToken,
        cfD1DatabaseId: infra.d1.databaseId,
        // R2 config
        r2AccessKeyId: infra.r2.accessKeyId,
        r2SecretAccessKey: infra.r2.secretAccessKey,
        r2BucketName: infra.r2.bucketName,
      },
      policy: defaultPolicy(),
    };
  }

  private resolveConfig(): SubstrateConfig {
    const source = this.config.source;

    switch (source.type) {
      case 'env': {
        const cfAccountId = process.env.CF_ACCOUNT_ID;
        const cfApiToken = process.env.CF_API_TOKEN;
        const cfD1DatabaseId = process.env.CF_D1_DATABASE_ID;
        const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
        const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
        const r2BucketName = process.env.R2_BUCKET_NAME;

        const missing: string[] = [];
        if (!cfAccountId) missing.push('CF_ACCOUNT_ID');
        if (!cfApiToken) missing.push('CF_API_TOKEN');
        if (!cfD1DatabaseId) missing.push('CF_D1_DATABASE_ID');
        if (!r2AccessKeyId) missing.push('R2_ACCESS_KEY_ID');
        if (!r2SecretAccessKey) missing.push('R2_SECRET_ACCESS_KEY');
        if (!r2BucketName) missing.push('R2_BUCKET_NAME');

        if (missing.length > 0) {
          throw new AuthError(
            `Missing required environment variables: ${missing.join(', ')}. ` +
            'D1 vars (CF_*) are for structured data. R2 vars (R2_*) are for file storage.',
          );
        }

        return {
          d1: {
            accountId: cfAccountId!,
            apiToken: cfApiToken!,
            databaseId: cfD1DatabaseId!,
          },
          r2: {
            accountId: cfAccountId!,
            accessKeyId: r2AccessKeyId!,
            secretAccessKey: r2SecretAccessKey!,
            bucketName: r2BucketName!,
          },
        };
      }

      case 'static':
        return source.config;
    }
  }
}

// =============================================================================
// Helpers — extract config from AccountContext.metadata
// =============================================================================

export function getD1Config(ctx: AccountContext): D1Config {
  const m = ctx.metadata;
  return {
    accountId: m.cfAccountId as string,
    apiToken: m.cfApiToken as string,
    databaseId: m.cfD1DatabaseId as string,
  };
}

export function getR2Config(ctx: AccountContext): R2Config {
  const m = ctx.metadata;
  return {
    accountId: m.cfAccountId as string,
    accessKeyId: m.r2AccessKeyId as string,
    secretAccessKey: m.r2SecretAccessKey as string,
    bucketName: m.r2BucketName as string,
  };
}
