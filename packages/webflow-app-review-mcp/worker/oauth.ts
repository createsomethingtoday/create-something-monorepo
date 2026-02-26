/**
 * OAuth 2.1 shared-client-secret implementation for Cloudflare Workers.
 *
 * Flow: mcp-remote → /authorize (PKCE) → redirect with code → /token (exchange) → Bearer token → /mcp
 * The shared client_id + client_secret is distributed to the team. No per-user identity.
 */

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  /** Hosts allowed in redirect_uri (e.g. ["localhost", "127.0.0.1", "claude.ai"]) */
  allowedRedirectHosts: string[];
  issuer: string;
  kv: KVNamespace;
}

interface AuthCodePayload {
  codeChallenge: string;
  redirectUri: string;
  clientId: string;
}

// PKCE: SHA-256(code_verifier) → base64url
async function sha256Base64Url(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(hashBuffer);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

const JSON_CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

function oauthError(error: string, description: string, status = 400): Response {
  return new Response(JSON.stringify({ error, error_description: description }), {
    status,
    headers: JSON_CORS,
  });
}

/** GET /.well-known/oauth-authorization-server */
export function handleDiscovery(issuer: string): Response {
  return new Response(
    JSON.stringify({
      issuer,
      authorization_endpoint: `${issuer}/authorize`,
      token_endpoint: `${issuer}/token`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['client_secret_post'],
    }),
    { headers: JSON_CORS },
  );
}

/** GET /authorize — validates client + redirect URI, stores PKCE code, redirects to callback */
export async function handleAuthorize(request: Request, config: OAuthConfig): Promise<Response> {
  if (!config.clientId || !config.clientSecret) {
    return oauthError('server_error', 'OAuth is not fully configured on this server', 503);
  }

  const params = new URL(request.url).searchParams;
  const clientId = params.get('client_id');
  const responseType = params.get('response_type');
  const redirectUri = params.get('redirect_uri');
  const state = params.get('state') ?? '';
  const codeChallenge = params.get('code_challenge');
  const codeChallengeMethod = params.get('code_challenge_method');

  if (!clientId || clientId !== config.clientId)
    return oauthError('invalid_client', 'Unknown client_id');
  if (responseType !== 'code')
    return oauthError('unsupported_response_type', 'Only code response type is supported');
  if (!redirectUri)
    return oauthError('invalid_request', 'redirect_uri is required');

  let parsedRedirect: URL;
  try {
    parsedRedirect = new URL(redirectUri);
  } catch {
    return oauthError('invalid_request', 'redirect_uri is not a valid URL');
  }

  if (!config.allowedRedirectHosts.includes(parsedRedirect.hostname)) {
    return oauthError(
      'invalid_request',
      `redirect_uri host '${parsedRedirect.hostname}' is not in the allowlist`,
    );
  }

  if (!codeChallenge)
    return oauthError('invalid_request', 'code_challenge is required (PKCE S256)');
  if (codeChallengeMethod !== 'S256')
    return oauthError('invalid_request', 'Only S256 code_challenge_method is supported');

  const code = randomToken(32);
  const payload: AuthCodePayload = { codeChallenge, redirectUri, clientId };
  await config.kv.put(`auth_code:${code}`, JSON.stringify(payload), { expirationTtl: 300 }); // 5 min

  const callback = new URL(redirectUri);
  callback.searchParams.set('code', code);
  if (state) callback.searchParams.set('state', state);

  return Response.redirect(callback.toString(), 302);
}

/** POST /token — validates client_secret + PKCE, issues Bearer access token */
export async function handleToken(request: Request, config: OAuthConfig): Promise<Response> {
  if (!config.clientId || !config.clientSecret) {
    return oauthError('server_error', 'OAuth is not fully configured on this server', 503);
  }

  if (request.method !== 'POST')
    return oauthError('invalid_request', 'POST required', 405);

  const contentType = request.headers.get('Content-Type') ?? '';
  const params: Record<string, string> = {};
  try {
    const text = await request.text();
    if (contentType.includes('application/json')) {
      Object.assign(params, JSON.parse(text));
    } else {
      // application/x-www-form-urlencoded (or fallback)
      new URLSearchParams(text).forEach((v, k) => {
        params[k] = v;
      });
    }
  } catch {
    return oauthError('invalid_request', 'Failed to parse request body');
  }

  const { grant_type, code, redirect_uri, client_id, client_secret, code_verifier } = params;

  if (grant_type !== 'authorization_code')
    return oauthError('unsupported_grant_type', 'Only authorization_code is supported');
  if (!client_id || client_id !== config.clientId)
    return oauthError('invalid_client', 'Invalid client_id', 401);
  if (!client_secret || client_secret !== config.clientSecret)
    return oauthError('invalid_client', 'Invalid client_secret', 401);
  if (!code)
    return oauthError('invalid_request', 'code is required');
  if (!code_verifier)
    return oauthError('invalid_request', 'code_verifier is required');

  const stored = await config.kv.get(`auth_code:${code}`);
  if (!stored)
    return oauthError('invalid_grant', 'Auth code not found or expired');

  const payload: AuthCodePayload = JSON.parse(stored);
  await config.kv.delete(`auth_code:${code}`); // one-time use

  if (redirect_uri && redirect_uri !== payload.redirectUri)
    return oauthError('invalid_grant', 'redirect_uri mismatch');

  const expected = await sha256Base64Url(code_verifier);
  if (expected !== payload.codeChallenge)
    return oauthError('invalid_grant', 'PKCE code_verifier does not match code_challenge');

  const accessToken = randomToken(32);
  await config.kv.put(
    `access_token:${accessToken}`,
    JSON.stringify({ clientId: client_id, issuedAt: Date.now() }),
    { expirationTtl: 3600 }, // 1 hour
  );

  return new Response(
    JSON.stringify({ access_token: accessToken, token_type: 'Bearer', expires_in: 3600 }),
    { headers: JSON_CORS },
  );
}

/**
 * Validate Bearer token on /mcp requests.
 * Returns null if valid, or a 401 Response if not.
 */
export async function validateOAuthToken(
  request: Request,
  kv: KVNamespace,
): Promise<Response | null> {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'unauthorized', error_description: 'Bearer token required' }),
      {
        status: 401,
        headers: {
          ...JSON_CORS,
          'WWW-Authenticate': 'Bearer realm="webflow-app-review-mcp"',
        },
      },
    );
  }

  const token = auth.slice('Bearer '.length).trim();
  const found = await kv.get(`access_token:${token}`);
  if (!found) {
    return new Response(
      JSON.stringify({ error: 'invalid_token', error_description: 'Token not found or expired' }),
      {
        status: 401,
        headers: {
          ...JSON_CORS,
          'WWW-Authenticate':
            'Bearer realm="webflow-app-review-mcp", error="invalid_token"',
        },
      },
    );
  }

  return null; // valid
}
