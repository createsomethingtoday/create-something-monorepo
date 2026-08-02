import {
  OFFER_SAVINGS_READ_SCOPE,
  OFFER_SAVINGS_WRITE_SCOPE,
  type OfferSavingsRequestProps,
  type OfferSavingsWorkerEnv
} from './contract.js';

type McpFetch = (
  request: Request,
  env: OfferSavingsWorkerEnv,
  ctx: ExecutionContext & { props?: OfferSavingsRequestProps }
) => Promise<Response>;

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Mcp-Session-Id'
};

function identityIssuer(env: OfferSavingsWorkerEnv): string {
  return env.CS_IDENTITY_ISSUER?.trim().replace(/\/+$/, '') ?? '';
}

export function buildOfferSavingsProtectedResourceMetadata(
  origin: string,
  env: OfferSavingsWorkerEnv
): Record<string, unknown> {
  return {
    resource: `${origin}/mcp`,
    authorization_servers: [identityIssuer(env)],
    scopes_supported: [OFFER_SAVINGS_READ_SCOPE, OFFER_SAVINGS_WRITE_SCOPE],
    bearer_methods_supported: ['header'],
    resource_name: 'Offer Savings'
  };
}

function jsonResponse(value: unknown, status = 200, headers: HeadersInit = {}): Response {
  return Response.json(value, {
    status,
    headers: { ...CORS_HEADERS, ...headers }
  });
}

function unauthorized(origin: string, message: string): Response {
  return jsonResponse({ ok: false, error: { code: 'UNAUTHORIZED', message } }, 401, {
    'WWW-Authenticate': `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource"`
  });
}

function parseAllowedEmails(raw?: string): Set<string> {
  return new Set(
    (raw ?? '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  );
}

async function authenticateIdentityRequest(input: {
  request: Request;
  env: OfferSavingsWorkerEnv;
  origin: string;
  identityFetch: (request: Request) => Promise<Response>;
}): Promise<OfferSavingsRequestProps | Response> {
  const issuer = identityIssuer(input.env);
  if (!issuer) {
    return jsonResponse(
      { ok: false, error: { code: 'MISCONFIGURED', message: 'CS_IDENTITY_ISSUER is missing.' } },
      500
    );
  }
  const allowedEmails = parseAllowedEmails(input.env.OAUTH_ALLOWED_EMAILS);
  if (allowedEmails.size === 0) {
    return jsonResponse(
      { ok: false, error: { code: 'MISCONFIGURED', message: 'OAUTH_ALLOWED_EMAILS is missing.' } },
      500
    );
  }
  const token = input.request.headers
    .get('Authorization')
    ?.match(/^Bearer\s+(.+)$/i)?.[1]
    ?.trim();
  if (!token) return unauthorized(input.origin, 'Missing or invalid OAuth access token.');

  let response: Response;
  try {
    response = await input.identityFetch(
      new Request(`${issuer}/oauth/userinfo`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` }
      })
    );
  } catch {
    return jsonResponse(
      {
        ok: false,
        error: {
          code: 'IDENTITY_UNAVAILABLE',
          message: 'CREATE SOMETHING Identity is unavailable.'
        }
      },
      502
    );
  }
  if (!response.ok) return unauthorized(input.origin, 'Missing or invalid OAuth access token.');

  const payload = (await response.json()) as Record<string, unknown>;
  const subject = typeof payload.sub === 'string' ? payload.sub.trim() : '';
  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  const resource =
    typeof payload.resource === 'string' ? payload.resource.trim().replace(/\/+$/, '') : '';
  if (!subject || !email || payload.email_verified !== true || resource !== `${input.origin}/mcp`) {
    return unauthorized(input.origin, 'OAuth access token is not valid for this resource.');
  }
  if (!allowedEmails.has(email)) {
    return jsonResponse(
      {
        ok: false,
        error: { code: 'FORBIDDEN', message: 'You are not on the Offer Savings access list.' }
      },
      403
    );
  }

  const tokenScopes = new Set(
    (typeof payload.scope === 'string' ? payload.scope : '')
      .split(/\s+/)
      .map((scope) => scope.trim())
      .filter(Boolean)
  );
  if (!tokenScopes.has(OFFER_SAVINGS_READ_SCOPE)) {
    return jsonResponse(
      {
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: `OAuth access token is missing ${OFFER_SAVINGS_READ_SCOPE}.`
        }
      },
      403
    );
  }
  return {
    subject,
    email,
    scopes: [OFFER_SAVINGS_READ_SCOPE, OFFER_SAVINGS_WRITE_SCOPE].filter((scope) =>
      tokenScopes.has(scope)
    )
  };
}

export function createOfferSavingsWorkerHandler(options: {
  mcpFetch: McpFetch;
  identityFetch?: typeof fetch;
}) {
  return {
    async fetch(
      request: Request,
      env: OfferSavingsWorkerEnv,
      ctx: ExecutionContext
    ): Promise<Response> {
      const url = new URL(request.url);

      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
      }

      if (url.pathname === '/.well-known/oauth-protected-resource') {
        const issuer = identityIssuer(env);
        if (!issuer) {
          return jsonResponse(
            {
              ok: false,
              error: { code: 'MISCONFIGURED', message: 'CS_IDENTITY_ISSUER is missing.' }
            },
            500
          );
        }
        return jsonResponse(buildOfferSavingsProtectedResourceMetadata(url.origin, env));
      }

      if (url.pathname === '/' || url.pathname === '/health') {
        return jsonResponse({
          name: 'offer-savings-agent',
          version: '0.2.5',
          status: 'healthy',
          endpoint: '/mcp',
          authentication: 'OAuth 2.1 + PKCE through CREATE SOMETHING Identity'
        });
      }

      if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
        const identityWorker = env.IDENTITY_WORKER;
        const identityFetch = identityWorker
          ? (identityRequest: Request) => identityWorker.fetch(identityRequest)
          : (identityRequest: Request) => (options.identityFetch ?? fetch)(identityRequest);
        const identity = await authenticateIdentityRequest({
          request,
          env,
          origin: url.origin,
          identityFetch
        });
        if (identity instanceof Response) return identity;
        return options.mcpFetch(request, env, { ...ctx, props: identity });
      }

      return new Response('Not found', { status: 404, headers: CORS_HEADERS });
    }
  };
}
