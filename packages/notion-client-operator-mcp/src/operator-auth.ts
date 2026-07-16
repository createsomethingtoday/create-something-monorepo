import { buildOAuthProtectedResourceMetadata } from '@create-something/mcp-core';

export const NOTION_CLIENT_SCOPES = [
  'notion-client:read',
  'notion-client:write',
  'notion-client:admin',
] as const;

export type OperatorPrincipal = {
  subject: string;
  email: string;
  name: string | null;
  scopes: string[];
};

export type OperatorAuthResult =
  | { ok: true; operator: OperatorPrincipal }
  | {
      ok: false;
      status: 401 | 403 | 500 | 502;
      code: 'unauthorized' | 'forbidden' | 'misconfigured' | 'identity_unavailable';
      message: string;
    };

export function parseAllowedEmails(raw?: string | null): Set<string> {
  return new Set(
    (raw ?? '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function buildNotionProtectedResourceMetadata(input: {
  origin: string;
  issuer: string;
}): Record<string, unknown> {
  return {
    ...buildOAuthProtectedResourceMetadata(input.origin, {
      issuer: input.issuer,
      resourcePath: '/mcp',
      scopesSupported: [...NOTION_CLIENT_SCOPES],
    }),
    resource_name: 'Notion Client Operator MCP',
  };
}

export async function authenticateOperatorRequest(input: {
  request: Request;
  issuer: string;
  expectedResource: string;
  allowedDomain: string;
  allowedEmails: Set<string>;
  fetch?: typeof globalThis.fetch;
}): Promise<OperatorAuthResult> {
  const token = input.request.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!token) {
    return {
      ok: false,
      status: 401,
      code: 'unauthorized',
      message: 'Missing or invalid OAuth access token.',
    };
  }
  const issuer = input.issuer.trim().replace(/\/+$/, '');
  if (!issuer) {
    return {
      ok: false,
      status: 500,
      code: 'misconfigured',
      message: 'CREATE SOMETHING Identity is not configured.',
    };
  }

  let response: Response;
  try {
    response = await (input.fetch ?? globalThis.fetch)(`${issuer}/oauth/userinfo`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });
  } catch {
    return {
      ok: false,
      status: 502,
      code: 'identity_unavailable',
      message: 'CREATE SOMETHING Identity is unavailable.',
    };
  }
  if (!response.ok) {
    const invalid = response.status === 401 || response.status === 403;
    return {
      ok: false,
      status: invalid ? 401 : 502,
      code: invalid ? 'unauthorized' : 'identity_unavailable',
      message: invalid
        ? 'Missing or invalid OAuth access token.'
        : 'CREATE SOMETHING Identity is unavailable.',
    };
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await response.json()) as Record<string, unknown>;
  } catch {
    return {
      ok: false,
      status: 502,
      code: 'identity_unavailable',
      message: 'CREATE SOMETHING Identity returned invalid userinfo.',
    };
  }

  const subject = stringValue(payload.sub);
  const email = stringValue(payload.email).toLowerCase();
  const resource = stringValue(payload.resource).replace(/\/+$/, '');
  const expectedResource = input.expectedResource.replace(/\/+$/, '');
  if (!subject || !email || resource !== expectedResource) {
    return {
      ok: false,
      status: 401,
      code: 'unauthorized',
      message: 'OAuth access token is incomplete or not valid for this resource.',
    };
  }
  if (payload.email_verified !== true) {
    return {
      ok: false,
      status: 403,
      code: 'forbidden',
      message: 'A verified operator email is required.',
    };
  }

  const domain = input.allowedDomain.trim().toLowerCase().replace(/^@/, '');
  const allowed = input.allowedEmails.size > 0
    ? input.allowedEmails.has(email)
    : Boolean(domain && email.endsWith(`@${domain}`));
  if (!allowed) {
    return {
      ok: false,
      status: 403,
      code: 'forbidden',
      message: 'This identity is not allowed to operate the client Notion MCP.',
    };
  }

  const tokenScopes = new Set(stringValue(payload.scope).split(/\s+/).filter(Boolean));
  const scopes = NOTION_CLIENT_SCOPES.filter((scope) => tokenScopes.has(scope));
  if (!scopes.includes('notion-client:read')) {
    return {
      ok: false,
      status: 403,
      code: 'forbidden',
      message: 'OAuth access token is missing notion-client:read.',
    };
  }

  return {
    ok: true,
    operator: {
      subject,
      email,
      name: stringValue(payload.name) || null,
      scopes,
    },
  };
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
