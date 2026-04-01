import type { AccountContext } from '@create-something/mcp-core';

import {
  requireIndeedSponsoredJobsCredentials,
  resolveIndeedSponsoredJobsEmployerId,
} from './runtime.js';

const ADS_API_ROOT = 'https://apis.indeed.com/ads';
const OAUTH_TOKEN_URL = 'https://apis.indeed.com/oauth/v2/tokens';
const TOKEN_REFRESH_SKEW_MS = 60_000;

type SponsoredJobsAccessToken = {
  accessToken: string;
  scope: string;
  expiresAt: number;
};

type TokenRequestOptions = {
  employerId?: string | null;
  omitEmployer?: boolean;
};

type SponsoredJobsApiRequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH';
  path: string;
  scopes: string[];
  employerId?: string | null;
  omitEmployer?: boolean;
  query?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown;
};

const tokenCache = new Map<string, SponsoredJobsAccessToken>();

function encodeBasicAuth(clientId: string, secret: string): string {
  return Buffer.from(`${clientId}:${secret}`).toString('base64');
}

function normalizeScopes(scopes: string[]): string[] {
  const seen = new Set<string>();
  for (const scope of scopes) {
    const trimmed = scope.trim();
    if (trimmed) seen.add(trimmed);
  }

  return Array.from(seen);
}

function buildTokenCacheKey(clientId: string, employerId: string | null, scopes: string[]): string {
  return [clientId, employerId ?? 'no-employer', scopes.join(' ')].join('|');
}

async function parseResponsePayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function buildErrorMessage(prefix: string, response: Response, payload: unknown): string {
  if (payload && typeof payload === 'object') {
    const meta = (payload as { meta?: { errors?: Array<{ type?: string; description?: string }> } }).meta;
    const errors = meta?.errors ?? [];
    if (errors.length > 0) {
      const details = errors
        .map((error) => [error.type, error.description].filter(Boolean).join(': '))
        .filter(Boolean)
        .join('; ');
      if (details) {
        return `${prefix} failed (${response.status} ${response.statusText}): ${details}`;
      }
    }
  }

  if (typeof payload === 'string' && payload.trim()) {
    return `${prefix} failed (${response.status} ${response.statusText}): ${payload.trim()}`;
  }

  return `${prefix} failed (${response.status} ${response.statusText}).`;
}

async function requestTokenAttempt(
  clientId: string,
  secret: string,
  body: string,
  contentType: string,
): Promise<{ response: Response; payload: unknown }> {
  const response = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Basic ${encodeBasicAuth(clientId, secret)}`,
      'Content-Type': contentType,
    },
    body,
  });

  const payload = await parseResponsePayload(response);
  return { response, payload };
}

export async function getSponsoredJobsAccessToken(
  ctx: AccountContext,
  scopes: string[],
  options: TokenRequestOptions = {},
): Promise<{ accessToken: string; scope: string; employerId: string | null }> {
  const { clientId, secret } = requireIndeedSponsoredJobsCredentials(ctx);
  const normalizedScopes = normalizeScopes(scopes);
  const employerId = options.omitEmployer ? null : resolveIndeedSponsoredJobsEmployerId(ctx, options.employerId);
  const cacheKey = buildTokenCacheKey(clientId, employerId, normalizedScopes);
  const cached = tokenCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now() + TOKEN_REFRESH_SKEW_MS) {
    return {
      accessToken: cached.accessToken,
      scope: cached.scope,
      employerId,
    };
  }

  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    scope: normalizedScopes.join(' '),
  });
  if (employerId) {
    params.set('employer', employerId);
  }

  const jsonPayload = JSON.stringify({
    grant_type: 'client_credentials',
    scope: normalizedScopes.join(' '),
    ...(employerId ? { employer: employerId } : {}),
  });

  const attempts = [
    await requestTokenAttempt(clientId, secret, params.toString(), 'application/x-www-form-urlencoded'),
    await requestTokenAttempt(clientId, secret, jsonPayload, 'application/json'),
  ];

  const successfulAttempt = attempts.find((attempt) => attempt.response.ok);
  if (!successfulAttempt) {
    const finalAttempt = attempts.at(-1) ?? attempts[0];
    throw new Error(buildErrorMessage('Sponsored Jobs OAuth token request', finalAttempt.response, finalAttempt.payload));
  }

  const tokenPayload = successfulAttempt.payload as {
    access_token?: string;
    scope?: string;
    expires_in?: number;
  } | null;

  if (!tokenPayload?.access_token) {
    throw new Error('Sponsored Jobs OAuth token request succeeded without returning access_token.');
  }

  const expiresIn = Math.max(300, tokenPayload.expires_in ?? 3600);
  const token: SponsoredJobsAccessToken = {
    accessToken: tokenPayload.access_token,
    scope: tokenPayload.scope ?? normalizedScopes.join(' '),
    expiresAt: Date.now() + expiresIn * 1000,
  };
  tokenCache.set(cacheKey, token);

  return {
    accessToken: token.accessToken,
    scope: token.scope,
    employerId,
  };
}

export async function sponsoredJobsApiRequest(
  ctx: AccountContext,
  options: SponsoredJobsApiRequestOptions,
): Promise<{
  employer_id: string | null;
  scope: string;
  response: unknown;
}> {
  const token = await getSponsoredJobsAccessToken(ctx, options.scopes, {
    employerId: options.employerId,
    omitEmployer: options.omitEmployer,
  });

  const url = new URL(options.path, ADS_API_ROOT);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value === undefined || value === null || value === '') continue;
    url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token.accessToken}`,
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const payload = await parseResponsePayload(response);
  if (!response.ok) {
    throw new Error(buildErrorMessage(`Sponsored Jobs API ${options.method ?? 'GET'} ${options.path}`, response, payload));
  }

  return {
    employer_id: token.employerId,
    scope: token.scope,
    response: payload,
  };
}
