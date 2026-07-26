export const SCOPE_READ = 'cracked-sync:read';
export const SCOPE_WRITE = 'cracked-sync:write';

interface IdentityUserInfo {
  subject: string;
  email: string;
  name: string | null;
  resource: string;
  scope: string;
}

type IdentityOAuthRequestResult =
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

class IdentityUserInfoError extends Error {
  constructor(
    readonly kind: 'invalid_token' | 'unverified_email' | 'invalid_response' | 'unavailable',
    message: string,
  ) {
    super(message);
    this.name = 'IdentityUserInfoError';
  }
}

export function parseAllowedEmails(raw?: string | null): Set<string> {
  return new Set(
    (raw ?? '')
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function parseAllowedDomains(raw?: string | null): Set<string> {
  return new Set(
    (raw ?? '')
      .split(',')
      .map((entry) => entry.trim().toLowerCase().replace(/^@/, ''))
      .filter(Boolean),
  );
}

async function fetchIdentityUserInfo(input: {
  issuer: string;
  token: string;
  expectedResource: string;
  fetch?: typeof globalThis.fetch;
}): Promise<IdentityUserInfo> {
  const issuer = input.issuer.trim().replace(/\/+$/, '');
  if (!issuer) {
    throw new IdentityUserInfoError('invalid_response', 'CREATE SOMETHING Identity issuer is missing.');
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
    throw new IdentityUserInfoError('unavailable', 'CREATE SOMETHING Identity is unavailable.');
  }

  if (!response.ok) {
    const invalidToken = response.status === 401 || response.status === 403;
    throw new IdentityUserInfoError(
      invalidToken ? 'invalid_token' : 'unavailable',
      invalidToken ? 'Missing or invalid OAuth access token.' : 'CREATE SOMETHING Identity is unavailable.',
    );
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await response.json()) as Record<string, unknown>;
  } catch {
    throw new IdentityUserInfoError('invalid_response', 'CREATE SOMETHING Identity returned invalid userinfo.');
  }

  const subject = typeof payload.sub === 'string' ? payload.sub.trim() : '';
  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  const resource = typeof payload.resource === 'string' ? payload.resource.trim().replace(/\/+$/, '') : '';
  const expectedResource = input.expectedResource.trim().replace(/\/+$/, '');
  if (!subject || !email) {
    throw new IdentityUserInfoError('invalid_response', 'CREATE SOMETHING Identity userinfo is incomplete.');
  }
  if (!resource || resource !== expectedResource) {
    throw new IdentityUserInfoError('invalid_token', 'OAuth access token is not valid for this resource.');
  }
  if (payload.email_verified !== true) {
    throw new IdentityUserInfoError('unverified_email', 'A verified email is required for Cracked Live Ticket Sync.');
  }

  return {
    subject,
    email,
    name: typeof payload.name === 'string' && payload.name.trim() ? payload.name.trim() : null,
    resource,
    scope: typeof payload.scope === 'string' ? payload.scope.trim() : '',
  };
}

export async function resolveIdentityOAuthRequest(input: {
  request: Request;
  issuer: string;
  expectedResource: string;
  allowedEmails: Set<string>;
  allowedDomains?: Set<string>;
  fetch?: typeof globalThis.fetch;
}): Promise<IdentityOAuthRequestResult> {
  const token = input.request.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!token) {
    return { ok: false, status: 401, code: 'unauthorized', message: 'Missing or invalid OAuth access token.' };
  }
  if (!input.issuer.trim()) {
    return { ok: false, status: 500, code: 'misconfigured', message: 'CREATE SOMETHING Identity is not configured.' };
  }
  const allowedDomains = input.allowedDomains ?? new Set<string>();
  if (input.allowedEmails.size === 0 && allowedDomains.size === 0) {
    return {
      ok: false,
      status: 500,
      code: 'misconfigured',
      message: 'Cracked Live OAuth access requires an explicit email or domain allowlist.',
    };
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

  const atIndex = identity.email.lastIndexOf('@');
  const emailDomain = atIndex > 0 && atIndex < identity.email.length - 1
    ? identity.email.slice(atIndex + 1)
    : '';
  if (!input.allowedEmails.has(identity.email) && !allowedDomains.has(emailDomain)) {
    return {
      ok: false,
      status: 403,
      code: 'forbidden',
      message: 'You are not on the Cracked Live Ticket Sync access list.',
    };
  }

  const tokenScopes = new Set(identity.scope.split(/\s+/).map((scope) => scope.trim()).filter(Boolean));
  const scopes = [SCOPE_READ, SCOPE_WRITE].filter((scope) => tokenScopes.has(scope));
  if (!scopes.includes(SCOPE_READ)) {
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
    accountId: `oauth:${identity.subject}`,
    email: identity.email,
    name: identity.name,
    scopes,
  };
}

export function buildProtectedResourceMetadata(options: {
  resourceOrigin: string;
  authorizationServer: string;
}): Record<string, unknown> {
  return {
    resource: `${options.resourceOrigin.replace(/\/+$/, '')}/mcp`,
    authorization_servers: [options.authorizationServer.replace(/\/+$/, '')],
    scopes_supported: [SCOPE_READ, SCOPE_WRITE],
    bearer_methods_supported: ['header'],
    resource_name: 'Cracked Live Ticket Sync MCP',
  };
}
