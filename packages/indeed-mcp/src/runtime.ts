import type { AccountContext, D1Database } from '@create-something/mcp-core';
import { AuthError } from '@create-something/mcp-core';

import type { R2BucketLike } from './types.js';

export interface IndeedRuntimeMetadata {
  db?: D1Database;
  storage?: R2BucketLike;
  indeedApplySecret: string;
  indeedSponsoredJobsClientId?: string;
  indeedSponsoredJobsSecret?: string;
  indeedSponsoredJobsEmployerId?: string;
  requestBaseUrl?: string;
  publicBaseUrl?: string;
  feedPublisher: string;
  feedPublisherUrl: string;
}

export function getRuntimeMetadata(ctx: AccountContext): IndeedRuntimeMetadata {
  const metadata = ctx.metadata as Record<string, unknown>;

  return {
    db: metadata.db as D1Database | undefined,
    storage: metadata.storage as R2BucketLike | undefined,
    indeedApplySecret: (metadata.indeedApplySecret as string | undefined) ?? '',
    indeedSponsoredJobsClientId: metadata.indeedSponsoredJobsClientId as string | undefined,
    indeedSponsoredJobsSecret: metadata.indeedSponsoredJobsSecret as string | undefined,
    indeedSponsoredJobsEmployerId: metadata.indeedSponsoredJobsEmployerId as string | undefined,
    requestBaseUrl: metadata.requestBaseUrl as string | undefined,
    publicBaseUrl: metadata.publicBaseUrl as string | undefined,
    feedPublisher: (metadata.feedPublisher as string | undefined) ?? 'CREATE SOMETHING',
    feedPublisherUrl: (metadata.feedPublisherUrl as string | undefined) ?? 'https://createsomething.agency',
  };
}

export function requireDb(ctx: AccountContext): D1Database {
  const { db } = getRuntimeMetadata(ctx);
  if (!db) {
    throw new AuthError('DB binding is required for Indeed MCP operations.');
  }
  return db;
}

export function getStorage(ctx: AccountContext): R2BucketLike | undefined {
  return getRuntimeMetadata(ctx).storage;
}

export async function getIndeedApplyToken(ctx: AccountContext): Promise<string> {
  const token = await ctx.tokenProvider.getAccessToken();
  if (!token) {
    throw new AuthError('INDEED_APPLY_CLIENT_ID is required.');
  }
  return token;
}

export function getIndeedSponsoredJobsConfig(ctx: AccountContext): {
  clientId?: string;
  secret?: string;
  employerId?: string;
} {
  const metadata = getRuntimeMetadata(ctx);
  return {
    clientId: metadata.indeedSponsoredJobsClientId,
    secret: metadata.indeedSponsoredJobsSecret,
    employerId: metadata.indeedSponsoredJobsEmployerId,
  };
}

export function requireIndeedSponsoredJobsCredentials(ctx: AccountContext): {
  clientId: string;
  secret: string;
  employerId?: string;
} {
  const config = getIndeedSponsoredJobsConfig(ctx);
  if (!config.clientId) {
    throw new AuthError('INDEED_SPONSORED_JOBS_CLIENT_ID is required for Sponsored Jobs API operations.');
  }

  if (!config.secret) {
    throw new AuthError('INDEED_SPONSORED_JOBS_SECRET is required for Sponsored Jobs API operations.');
  }

  return config as { clientId: string; secret: string; employerId?: string };
}

export function resolveIndeedSponsoredJobsEmployerId(
  ctx: AccountContext,
  employerIdOverride?: string | null,
): string {
  const override = employerIdOverride?.trim();
  if (override) return override;

  const { employerId } = getIndeedSponsoredJobsConfig(ctx);
  if (!employerId) {
    throw new AuthError(
      'Indeed Sponsored Jobs requires an employer ID. Provide employer_id in the tool call or configure INDEED_SPONSORED_JOBS_EMPLOYER_ID.',
    );
  }

  return employerId;
}
