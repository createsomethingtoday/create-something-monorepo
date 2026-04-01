import type { AccountContext, AuthProvider } from '@create-something/mcp-core';
import { AuthError, defaultPolicy } from '@create-something/mcp-core';

import type { IndeedEnv } from './types.js';

function parseBearerToken(request: Request): string | null {
  const authorization = request.headers.get('authorization');
  if (!authorization) return null;
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? null;
}

function extractPresentedApiKey(request: Request | null): string | null {
  if (!request) return null;
  return parseBearerToken(request) ?? request.headers.get('x-api-key')?.trim() ?? null;
}

function readRequiredSecret(envValue: string | undefined, processValue: string | undefined, name: string): string {
  const value = envValue?.trim() || processValue?.trim() || '';
  if (!value) {
    throw new AuthError(`Missing ${name}. Provide it via Worker secret or process environment.`);
  }
  return value;
}

function readOptionalSecret(envValue: string | undefined, processValue: string | undefined): string | undefined {
  const value = envValue?.trim() || processValue?.trim() || '';
  return value || undefined;
}

export class IndeedAuthProvider implements AuthProvider<IndeedEnv> {
  async resolve(request: Request | null, env?: IndeedEnv): Promise<AccountContext> {
    const configuredMcpKey = readOptionalSecret(
      env?.INDEED_MCP_API_KEY ?? env?.MCP_API_KEY,
      process.env.INDEED_MCP_API_KEY ?? process.env.MCP_API_KEY,
    );
    const presentedMcpKey = extractPresentedApiKey(request);

    if (request && configuredMcpKey && presentedMcpKey !== configuredMcpKey) {
      throw new AuthError('Unauthorized. Provide Authorization: Bearer <INDEED_MCP_API_KEY> or X-API-Key.');
    }

    const indeedApplyClientId = readRequiredSecret(
      env?.INDEED_APPLY_CLIENT_ID,
      process.env.INDEED_APPLY_CLIENT_ID,
      'INDEED_APPLY_CLIENT_ID',
    );
    const indeedApplySecret = readRequiredSecret(
      env?.INDEED_APPLY_SECRET,
      process.env.INDEED_APPLY_SECRET,
      'INDEED_APPLY_SECRET',
    );
    const indeedSponsoredJobsClientId = readOptionalSecret(
      env?.INDEED_SPONSORED_JOBS_CLIENT_ID,
      process.env.INDEED_SPONSORED_JOBS_CLIENT_ID,
    );
    const indeedSponsoredJobsSecret = readOptionalSecret(
      env?.INDEED_SPONSORED_JOBS_SECRET,
      process.env.INDEED_SPONSORED_JOBS_SECRET,
    );
    const indeedSponsoredJobsEmployerId = readOptionalSecret(
      env?.INDEED_SPONSORED_JOBS_EMPLOYER_ID,
      process.env.INDEED_SPONSORED_JOBS_EMPLOYER_ID,
    );

    const requestUrl = request ? new URL(request.url) : null;
    const requestBaseUrl = requestUrl ? `${requestUrl.protocol}//${requestUrl.host}` : undefined;

    return {
      accountId: env?.INDEED_ACCOUNT_ID?.trim() || process.env.INDEED_ACCOUNT_ID?.trim() || 'abundance',
      tokenProvider: {
        getAccessToken: async () => indeedApplyClientId,
      },
      metadata: {
        db: env?.DB,
        storage: env?.STORAGE,
        indeedApplySecret,
        indeedSponsoredJobsClientId,
        indeedSponsoredJobsSecret,
        indeedSponsoredJobsEmployerId,
        requestBaseUrl,
        publicBaseUrl:
          env?.INDEED_APPLY_BASE_URL?.trim() ||
          process.env.INDEED_APPLY_BASE_URL?.trim() ||
          requestBaseUrl,
        feedPublisher:
          env?.INDEED_FEED_PUBLISHER?.trim() ||
          process.env.INDEED_FEED_PUBLISHER?.trim() ||
          'CREATE SOMETHING',
        feedPublisherUrl:
          env?.INDEED_FEED_PUBLISHER_URL?.trim() ||
          process.env.INDEED_FEED_PUBLISHER_URL?.trim() ||
          'https://createsomething.agency',
      },
      policy: {
        ...defaultPolicy(),
        scopes: ['indeed:apply', 'indeed:feed', 'indeed:webhooks', 'indeed:dispositions', 'indeed:sponsored-jobs'],
      },
    };
  }
}
