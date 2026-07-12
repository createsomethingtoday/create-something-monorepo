import { type ReviewerDirectory, type ReviewerProfile, getReviewerProfileForEmail } from './reviewer-directory.js';

export const SCOPE_READ = 'template-review:read';
export const SCOPE_WRITE = 'template-review:write';
export const SCOPE_QUEUE_READ = 'template-review:queue-read';

export interface IdentityUserInfo {
  subject: string;
  email: string;
  emailVerified: true;
  name: string | null;
  resource: string;
  scope: string;
}

export type IdentityUserInfoErrorKind =
  | 'invalid_token'
  | 'unverified_email'
  | 'invalid_response'
  | 'unavailable';

export class IdentityUserInfoError extends Error {
  constructor(
    readonly kind: IdentityUserInfoErrorKind,
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'IdentityUserInfoError';
  }
}

/** Resolve one OAuth bearer through the owned Identity Worker userinfo endpoint. */
export async function fetchIdentityUserInfo(input: {
  issuer: string;
  token: string;
  expectedResource: string;
  fetch?: typeof globalThis.fetch;
}): Promise<IdentityUserInfo> {
  const issuer = input.issuer.trim().replace(/\/+$/, '');
  if (!issuer) {
    throw new IdentityUserInfoError('invalid_response', 500, 'CREATE SOMETHING Identity issuer is missing.');
  }

  let response: Response;
  try {
    response = await (input.fetch ?? globalThis.fetch)(`${issuer}/oauth/userinfo`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${input.token}`,
      },
    });
  } catch {
    throw new IdentityUserInfoError('unavailable', 502, 'CREATE SOMETHING Identity is unavailable.');
  }

  if (!response.ok) {
    const invalidToken = response.status === 401 || response.status === 403;
    throw new IdentityUserInfoError(
      invalidToken ? 'invalid_token' : 'unavailable',
      invalidToken ? 401 : 502,
      invalidToken ? 'Missing or invalid OAuth access token.' : 'CREATE SOMETHING Identity is unavailable.',
    );
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await response.json()) as Record<string, unknown>;
  } catch {
    throw new IdentityUserInfoError('invalid_response', 502, 'CREATE SOMETHING Identity returned invalid userinfo.');
  }

  const subject = typeof payload.sub === 'string' ? payload.sub.trim() : '';
  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  const resource = typeof payload.resource === 'string' ? payload.resource.trim().replace(/\/+$/, '') : '';
  const expectedResource = input.expectedResource.trim().replace(/\/+$/, '');
  if (!subject || !email) {
    throw new IdentityUserInfoError('invalid_response', 502, 'CREATE SOMETHING Identity userinfo is incomplete.');
  }
  if (!resource || resource !== expectedResource) {
    throw new IdentityUserInfoError('invalid_token', 401, 'OAuth access token is not valid for this resource.');
  }
  if (payload.email_verified !== true) {
    throw new IdentityUserInfoError('unverified_email', 403, 'A verified email is required for Template Review.');
  }

  return {
    subject,
    email,
    emailVerified: true,
    name: typeof payload.name === 'string' && payload.name.trim() ? payload.name.trim() : null,
    resource,
    scope: typeof payload.scope === 'string' ? payload.scope.trim() : '',
  };
}

export function parseAllowedEmails(raw?: string | null): Set<string> {
  return new Set(
    (raw ?? '')
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  );
}

export interface OAuthAccessInput {
  email?: string | null;
  allowedDomain: string;
  allowedEmails: Set<string>;
  directory: ReviewerDirectory;
}

export type OAuthAccessResult =
  | { allowed: false; reason: 'missing_email' | 'domain_not_allowed' | 'email_not_allowlisted' }
  | { allowed: true; email: string; scopes: string[]; reviewerProfile: ReviewerProfile | null };

export type IdentityOAuthRequestResult =
  | {
      ok: true;
      subject: string;
      accountId: string;
      email: string;
      name: string | null;
      scopes: string[];
    }
  | {
      ok: false;
      status: 401 | 403 | 500 | 502;
      code: 'unauthorized' | 'forbidden' | 'misconfigured' | 'identity_unavailable';
      message: string;
    };

/** Authenticate one MCP request with Identity, then apply Template Review's explicit reviewer policy. */
export async function resolveIdentityOAuthRequest(input: {
  request: Request;
  issuer: string;
  expectedResource: string;
  allowedDomain: string;
  allowedEmails: Set<string>;
  directory: ReviewerDirectory;
  fetch?: typeof globalThis.fetch;
}): Promise<IdentityOAuthRequestResult> {
  const token = input.request.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!token) {
    return { ok: false, status: 401, code: 'unauthorized', message: 'Missing or invalid OAuth access token.' };
  }
  if (!input.issuer.trim()) {
    return { ok: false, status: 500, code: 'misconfigured', message: 'CREATE SOMETHING Identity is not configured.' };
  }

  let identity: IdentityUserInfo;
  try {
    identity = await fetchIdentityUserInfo({
      issuer: input.issuer,
      token,
      expectedResource: input.expectedResource,
      fetch: input.fetch,
    });
  } catch (error) {
    if (error instanceof IdentityUserInfoError) {
      if (error.kind === 'invalid_token') {
        return { ok: false, status: 401, code: 'unauthorized', message: error.message };
      }
      if (error.kind === 'unverified_email') {
        return { ok: false, status: 403, code: 'forbidden', message: error.message };
      }
      return { ok: false, status: 502, code: 'identity_unavailable', message: error.message };
    }
    return {
      ok: false,
      status: 502,
      code: 'identity_unavailable',
      message: 'CREATE SOMETHING Identity is unavailable.',
    };
  }

  const access = resolveOAuthAccess({
    email: identity.email,
    allowedDomain: input.allowedDomain,
    allowedEmails: input.allowedEmails,
    directory: input.directory,
  });
  if (access.allowed === false) {
    const messages = {
      missing_email: 'Your identity has no verified email address.',
      domain_not_allowed: `Template Review MCP is limited to @${input.allowedDomain} accounts.`,
      email_not_allowlisted: 'You are not on the Template Review access list. Ask the review team lead to add you.',
    } as const;
    return { ok: false, status: 403, code: 'forbidden', message: messages[access.reason] };
  }

  const tokenScopes = new Set(identity.scope.split(/\s+/).map((scope) => scope.trim()).filter(Boolean));
  const queueReadOnly = tokenScopes.has(SCOPE_QUEUE_READ)
    && !tokenScopes.has(SCOPE_READ)
    && !tokenScopes.has(SCOPE_WRITE);
  const scopes = queueReadOnly
    ? [SCOPE_QUEUE_READ]
    : access.scopes.filter((scope) => tokenScopes.has(scope));
  if (!scopes.includes(SCOPE_READ) && !scopes.includes(SCOPE_QUEUE_READ)) {
    return {
      ok: false,
      status: 403,
      code: 'forbidden',
      message: `OAuth access token is missing the required ${SCOPE_READ} scope.`,
    };
  }

  return {
    ok: true,
    subject: identity.subject,
    accountId: access.reviewerProfile?.accountId ?? `oauth:${access.email}`,
    email: access.email,
    name: identity.name,
    scopes,
  };
}

/**
 * Central access policy for OAuth-authenticated sessions:
 * - an explicit email allowlist is authoritative when configured
 * - otherwise email must belong to the allowed domain
 * - allowlisted users and directory-listed reviewers get write scope;
 *   everyone else is read-only
 */
export function resolveOAuthAccess(input: OAuthAccessInput): OAuthAccessResult {
  const email = input.email?.trim().toLowerCase();
  if (!email) return { allowed: false, reason: 'missing_email' };
  if (input.allowedEmails.size > 0) {
    if (!input.allowedEmails.has(email)) return { allowed: false, reason: 'email_not_allowlisted' };
  } else if (!email.endsWith(`@${input.allowedDomain}`)) {
      return { allowed: false, reason: 'domain_not_allowed' };
  }

  const reviewerProfile = getReviewerProfileForEmail(input.directory, email);
  const isReviewer = Boolean(reviewerProfile) || input.allowedEmails.has(email);
  return {
    allowed: true,
    email,
    scopes: isReviewer ? [SCOPE_READ, SCOPE_WRITE] : [SCOPE_READ],
    reviewerProfile,
  };
}

/** RFC 9728 metadata pointing MCP clients at CREATE SOMETHING Identity. */
export function buildProtectedResourceMetadata(options: {
  resourceOrigin: string;
  resourcePath: string;
  authorizationServer: string;
}): Record<string, unknown> {
  return {
    resource: `${options.resourceOrigin}${options.resourcePath}`,
    authorization_servers: [options.authorizationServer],
    scopes_supported: [SCOPE_READ, SCOPE_WRITE],
    bearer_methods_supported: ['header'],
    resource_name: 'Webflow Template Review MCP',
  };
}
