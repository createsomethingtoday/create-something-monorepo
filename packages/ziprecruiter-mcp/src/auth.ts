import type { AccountContext, AuthProvider } from '@create-something/mcp-core';
import { AuthError, defaultPolicy } from '@create-something/mcp-core';

import type { ZipRecruiterEnv } from './types.js';

function parseBearerToken(request: Request): string | null {
  const authorization = request.headers.get('authorization');
  if (!authorization) return null;
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? null;
}

function extractPresentedApiKey(request: Request | null): string | null {
  if (!request) return null;
  return (
    parseBearerToken(request) ??
    request.headers.get('x-api-key')?.trim() ??
    null
  );
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

function parseToleranceSeconds(raw: string | undefined): number {
  if (!raw) return 300_000;
  const seconds = Number(raw);
  if (!Number.isFinite(seconds) || seconds <= 0) return 300_000;
  return Math.floor(seconds * 1000);
}

export class ZipRecruiterAuthProvider implements AuthProvider<ZipRecruiterEnv> {
  async resolve(request: Request | null, env?: ZipRecruiterEnv): Promise<AccountContext> {
    const configuredMcpKey = readOptionalSecret(
      env?.ZIPRECRUITER_MCP_API_KEY ?? env?.MCP_API_KEY,
      process.env.ZIPRECRUITER_MCP_API_KEY ?? process.env.MCP_API_KEY,
    );
    const presentedMcpKey = extractPresentedApiKey(request);

    if (request && configuredMcpKey && presentedMcpKey !== configuredMcpKey) {
      throw new AuthError('Unauthorized. Provide Authorization: Bearer <ZIPRECRUITER_MCP_API_KEY>.');
    }

    const zipRecruiterApiKey = readRequiredSecret(
      env?.ZIPRECRUITER_API_KEY,
      process.env.ZIPRECRUITER_API_KEY,
      'ZIPRECRUITER_API_KEY',
    );

    const requestUrl = request ? new URL(request.url) : null;
    const requestBaseUrl = requestUrl ? `${requestUrl.protocol}//${requestUrl.host}` : undefined;

    return {
      accountId:
        env?.ZIPRECRUITER_ACCOUNT_ID?.trim() ||
        process.env.ZIPRECRUITER_ACCOUNT_ID?.trim() ||
        'abundance',
      tokenProvider: {
        getAccessToken: async () => zipRecruiterApiKey,
      },
      metadata: {
        db: env?.DB,
        storage: env?.STORAGE,
        zipRecruiterApiBaseUrl:
          env?.ZIPRECRUITER_API_BASE_URL?.trim() ||
          process.env.ZIPRECRUITER_API_BASE_URL?.trim() ||
          'https://api.ziprecruiter.com/partner/v0',
        zipRecruiterHiringSignalBaseUrl:
          env?.ZIPRECRUITER_HIRING_SIGNAL_BASE_URL?.trim() ||
          process.env.ZIPRECRUITER_HIRING_SIGNAL_BASE_URL?.trim() ||
          'https://api.ziprecruiter.com/hiring-signal/v0',
        zipRecruiterWebhookSecret: readOptionalSecret(
          env?.ZIPRECRUITER_WEBHOOK_SECRET,
          process.env.ZIPRECRUITER_WEBHOOK_SECRET,
        ),
        signatureToleranceMs: parseToleranceSeconds(
          env?.ZIPRECRUITER_SIGNATURE_TOLERANCE_SECONDS ??
            process.env.ZIPRECRUITER_SIGNATURE_TOLERANCE_SECONDS,
        ),
        requestBaseUrl,
      },
      policy: {
        ...defaultPolicy(),
        scopes: ['ziprecruiter:jobs', 'ziprecruiter:questions', 'ziprecruiter:webhooks', 'ziprecruiter:hiring-signals'],
      },
    };
  }
}
