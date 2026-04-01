import type { AccountContext, D1Database } from '@create-something/mcp-core';
import { AuthError } from '@create-something/mcp-core';

import type { R2BucketLike } from './types.js';

export interface ZipRecruiterRuntimeMetadata {
  db?: D1Database;
  storage?: R2BucketLike;
  zipRecruiterApiBaseUrl: string;
  zipRecruiterHiringSignalBaseUrl: string;
  zipRecruiterWebhookSecret?: string;
  signatureToleranceMs: number;
  requestBaseUrl?: string;
}

export function getRuntimeMetadata(ctx: AccountContext): ZipRecruiterRuntimeMetadata {
  const metadata = ctx.metadata as Record<string, unknown>;

  return {
    db: metadata.db as D1Database | undefined,
    storage: metadata.storage as R2BucketLike | undefined,
    zipRecruiterApiBaseUrl:
      (metadata.zipRecruiterApiBaseUrl as string | undefined) ?? 'https://api.ziprecruiter.com/partner/v0',
    zipRecruiterHiringSignalBaseUrl:
      (metadata.zipRecruiterHiringSignalBaseUrl as string | undefined) ??
      'https://api.ziprecruiter.com/hiring-signal/v0',
    zipRecruiterWebhookSecret: metadata.zipRecruiterWebhookSecret as string | undefined,
    signatureToleranceMs: (metadata.signatureToleranceMs as number | undefined) ?? 300_000,
    requestBaseUrl: metadata.requestBaseUrl as string | undefined,
  };
}

export function requireDb(ctx: AccountContext): D1Database {
  const { db } = getRuntimeMetadata(ctx);
  if (!db) {
    throw new AuthError('DB binding is required for ZipRecruiter MCP operations.');
  }
  return db;
}

export function getStorage(ctx: AccountContext): R2BucketLike | undefined {
  return getRuntimeMetadata(ctx).storage;
}

export async function getZipRecruiterApiKey(ctx: AccountContext): Promise<string> {
  const token = await ctx.tokenProvider.getAccessToken();
  if (!token) {
    throw new AuthError('ZIPRECRUITER_API_KEY is required.');
  }
  return token;
}
