type Env = {
  UPSTREAM_MCP_URL?: string;
  UPSTREAM_SSE_URL?: string;
  UPSTREAM_MCP_BEARER_TOKEN?: string;
  OAUTH_SIGNING_SECRET?: string;
  OAUTH_LOGIN_PASSWORD?: string;
  OAUTH_SUBJECT?: string;
  OAUTH_DISPLAY_NAME?: string;
};

type SignedTokenPayload = {
  type: 'code' | 'access' | 'refresh';
  iss: string;
  sub: string;
  aud: string;
  iat: number;
  exp: number;
  client_id?: string;
  redirect_uri?: string;
  scope?: string;
  resource?: string;
  code_challenge?: string;
  code_challenge_method?: string;
};

const SERVER_NAME = 'youtube-transcript-notion-claude-mcp';
const SERVER_VERSION = '0.1.0';
const DEFAULT_UPSTREAM_MCP_URL = 'https://youtube-transcript-notion-mcp.createsomething.workers.dev/mcp';
const DEFAULT_SUBJECT = 'youtube-transcript-notion-claude';
const DEFAULT_DISPLAY_NAME = 'YouTube Transcript + Notion MCP';
const CODE_TTL_SECONDS = 5 * 60;
const ACCESS_TTL_SECONDS = 60 * 60;
const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, mcp-protocol-version, mcp-session-id',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Expose-Headers': 'mcp-session-id, www-authenticate',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return withCors(new Response(null, { status: 204 }));
    }

    if (isOAuthAuthorizationServerPath(url.pathname)) {
      return withCors(jsonResponse(buildOAuthAuthorizationServerMetadata(url), 200, {
        'Cache-Control': 'public, max-age=300',
      }));
    }

    if (isOAuthProtectedResourcePath(url.pathname)) {
      return withCors(jsonResponse(buildOAuthProtectedResourceMetadata(url), 200, {
        'Cache-Control': 'public, max-age=300',
      }));
    }

    if (url.pathname === '/oauth/register' && request.method === 'POST') {
      return withCors(await handleOAuthRegister(request, url));
    }

    if (url.pathname === '/oauth/authorize' && request.method === 'GET') {
      return withCors(handleOAuthAuthorizeGet(url, env));
    }

    if (url.pathname === '/oauth/authorize' && request.method === 'POST') {
      return withCors(await handleOAuthAuthorizePost(request, url, env));
    }

    if (url.pathname === '/oauth/token' && request.method === 'POST') {
      return withCors(await handleOAuthToken(request, url, env));
    }

    if (url.pathname === '/oauth/userinfo' && request.method === 'GET') {
      return withCors(await handleOAuthUserinfo(request, url, env));
    }

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      return withCors(await handleMcpProxy(request, url, env, '/mcp'));
    }

    if (url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
      return withCors(await handleMcpProxy(request, url, env, '/sse'));
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      return withCors(jsonResponse(buildHealth(url, env)));
    }

    return withCors(jsonResponse({ error: 'Not found' }, 404));
  },
};

export function buildOAuthAuthorizationServerMetadata(url: URL): Record<string, unknown> {
  const issuer = normalizeOrigin(url.origin);
  return {
    issuer,
    authorization_endpoint: `${issuer}/oauth/authorize`,
    token_endpoint: `${issuer}/oauth/token`,
    registration_endpoint: `${issuer}/oauth/register`,
    userinfo_endpoint: `${issuer}/oauth/userinfo`,
    scopes_supported: ['openid', 'profile', 'email', 'mcp', 'offline_access'],
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['none', 'client_secret_post', 'client_secret_basic'],
    code_challenge_methods_supported: ['S256', 'plain'],
    resource: `${issuer}/mcp`,
  };
}

export function buildOAuthProtectedResourceMetadata(url: URL): Record<string, unknown> {
  const origin = normalizeOrigin(url.origin);
  return {
    resource: `${origin}/mcp`,
    authorization_servers: [origin],
    scopes_supported: ['mcp'],
    bearer_methods_supported: ['header'],
    resource_name: DEFAULT_DISPLAY_NAME,
  };
}

function buildHealth(url: URL, env: Env): Record<string, unknown> {
  return {
    name: SERVER_NAME,
    version: SERVER_VERSION,
    displayName: readEnvString(env, 'OAUTH_DISPLAY_NAME') ?? DEFAULT_DISPLAY_NAME,
    endpoints: {
      mcp: '/mcp',
      health: '/health',
      oauthAuthorizationServer: '/.well-known/oauth-authorization-server',
      oauthProtectedResource: '/mcp/.well-known/oauth-protected-resource',
    },
    upstream: {
      url: readEnvString(env, 'UPSTREAM_MCP_URL') ?? DEFAULT_UPSTREAM_MCP_URL,
      bearerConfigured: Boolean(readEnvString(env, 'UPSTREAM_MCP_BEARER_TOKEN')),
    },
    oauth: {
      issuer: normalizeOrigin(url.origin),
      signingSecretConfigured: Boolean(readEnvString(env, 'OAUTH_SIGNING_SECRET')),
      loginPasswordConfigured: Boolean(readEnvString(env, 'OAUTH_LOGIN_PASSWORD')),
    },
    client: {
      claudeConnectorUrl: `${normalizeOrigin(url.origin)}/mcp`,
    },
  };
}

async function handleOAuthRegister(request: Request, url: URL): Promise<Response> {
  let metadata: Record<string, unknown> = {};
  try {
    metadata = await request.json() as Record<string, unknown>;
  } catch {
    metadata = {};
  }

  const clientId = typeof metadata.client_name === 'string' && metadata.client_name.trim()
    ? `claude-${slugify(metadata.client_name)}-${randomId()}`
    : `claude-${randomId()}`;

  return jsonResponse({
    client_id: clientId,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    redirect_uris: Array.isArray(metadata.redirect_uris) ? metadata.redirect_uris : undefined,
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
    scope: 'openid profile email mcp offline_access',
    client_name: metadata.client_name ?? DEFAULT_DISPLAY_NAME,
    issuer: normalizeOrigin(url.origin),
  });
}

function handleOAuthAuthorizeGet(url: URL, env: Env): Response {
  const validationError = validateAuthorizeParams(url.searchParams);
  if (validationError) {
    return htmlResponse(renderAuthorizeError(validationError), 400);
  }

  const passwordConfigured = Boolean(readEnvString(env, 'OAUTH_LOGIN_PASSWORD'));
  return htmlResponse(renderAuthorizePage(url, passwordConfigured), passwordConfigured ? 200 : 503);
}

async function handleOAuthAuthorizePost(request: Request, url: URL, env: Env): Promise<Response> {
  const form = await request.formData();
  const params = new URLSearchParams();
  form.forEach((value, key) => {
    if (typeof value === 'string') params.set(key, value);
  });

  const validationError = validateAuthorizeParams(params);
  if (validationError) {
    return htmlResponse(renderAuthorizeError(validationError), 400);
  }

  const expectedPassword = readEnvString(env, 'OAUTH_LOGIN_PASSWORD');
  if (!expectedPassword) {
    return htmlResponse(renderAuthorizeError('Connector login password is not configured.'), 503);
  }

  const providedPassword = params.get('password') ?? '';
  if (!constantTimeEqual(providedPassword, expectedPassword)) {
    return htmlResponse(renderAuthorizeError('Invalid connector password.'), 401);
  }

  const signingSecret = readEnvString(env, 'OAUTH_SIGNING_SECRET');
  if (!signingSecret) {
    return htmlResponse(renderAuthorizeError('OAuth signing secret is not configured.'), 503);
  }

  const issuer = normalizeOrigin(url.origin);
  const redirectUri = params.get('redirect_uri') ?? '';
  const scope = params.get('scope') ?? 'openid mcp';
  const now = nowSeconds();
  const code = await signToken({
    type: 'code',
    iss: issuer,
    sub: readEnvString(env, 'OAUTH_SUBJECT') ?? DEFAULT_SUBJECT,
    aud: `${issuer}/mcp`,
    iat: now,
    exp: now + CODE_TTL_SECONDS,
    client_id: params.get('client_id') ?? undefined,
    redirect_uri: redirectUri,
    scope,
    resource: params.get('resource') ?? `${issuer}/mcp`,
    code_challenge: params.get('code_challenge') ?? undefined,
    code_challenge_method: params.get('code_challenge_method') ?? undefined,
  }, signingSecret);

  const redirect = new URL(redirectUri);
  redirect.searchParams.set('code', code);
  const state = params.get('state');
  if (state) redirect.searchParams.set('state', state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: redirect.toString(),
      'Cache-Control': 'no-store',
    },
  });
}

async function handleOAuthToken(request: Request, url: URL, env: Env): Promise<Response> {
  const signingSecret = readEnvString(env, 'OAUTH_SIGNING_SECRET');
  if (!signingSecret) {
    return oauthError('server_error', 'OAuth signing secret is not configured.', 503);
  }

  const params = await readTokenRequestParams(request);
  const grantType = params.get('grant_type');

  if (grantType === 'authorization_code') {
    return exchangeAuthorizationCode(params, url, env, signingSecret);
  }

  if (grantType === 'refresh_token') {
    return exchangeRefreshToken(params, url, env, signingSecret);
  }

  return oauthError('unsupported_grant_type', 'Only authorization_code and refresh_token grants are supported.', 400);
}

async function exchangeAuthorizationCode(
  params: URLSearchParams,
  url: URL,
  env: Env,
  signingSecret: string,
): Promise<Response> {
  const code = params.get('code') ?? '';
  const codePayload = await verifyToken(code, signingSecret);
  if (!codePayload || codePayload.type !== 'code') {
    return oauthError('invalid_grant', 'Authorization code is invalid or expired.', 400);
  }

  const issuer = normalizeOrigin(url.origin);
  if (codePayload.iss !== issuer || codePayload.aud !== `${issuer}/mcp`) {
    return oauthError('invalid_grant', 'Authorization code was not issued for this resource.', 400);
  }

  const redirectUri = params.get('redirect_uri');
  if (codePayload.redirect_uri && redirectUri && codePayload.redirect_uri !== redirectUri) {
    return oauthError('invalid_grant', 'Redirect URI does not match the authorization code.', 400);
  }

  const clientId = params.get('client_id');
  if (codePayload.client_id && clientId && codePayload.client_id !== clientId) {
    return oauthError('invalid_grant', 'Client ID does not match the authorization code.', 400);
  }

  const verifierError = await validatePkce(params, codePayload);
  if (verifierError) {
    return oauthError('invalid_grant', verifierError, 400);
  }

  return issueTokenResponse(url, env, signingSecret, codePayload.scope ?? 'openid mcp');
}

async function exchangeRefreshToken(
  params: URLSearchParams,
  url: URL,
  env: Env,
  signingSecret: string,
): Promise<Response> {
  const refreshToken = params.get('refresh_token') ?? '';
  const refreshPayload = await verifyToken(refreshToken, signingSecret);
  if (!refreshPayload || refreshPayload.type !== 'refresh') {
    return oauthError('invalid_grant', 'Refresh token is invalid or expired.', 400);
  }

  const issuer = normalizeOrigin(url.origin);
  if (refreshPayload.iss !== issuer || refreshPayload.aud !== `${issuer}/mcp`) {
    return oauthError('invalid_grant', 'Refresh token was not issued for this resource.', 400);
  }

  return issueTokenResponse(url, env, signingSecret, refreshPayload.scope ?? 'openid mcp');
}

async function issueTokenResponse(
  url: URL,
  env: Env,
  signingSecret: string,
  scope: string,
): Promise<Response> {
  const issuer = normalizeOrigin(url.origin);
  const subject = readEnvString(env, 'OAUTH_SUBJECT') ?? DEFAULT_SUBJECT;
  const now = nowSeconds();
  const accessToken = await signToken({
    type: 'access',
    iss: issuer,
    sub: subject,
    aud: `${issuer}/mcp`,
    iat: now,
    exp: now + ACCESS_TTL_SECONDS,
    scope,
  }, signingSecret);
  const refreshToken = await signToken({
    type: 'refresh',
    iss: issuer,
    sub: subject,
    aud: `${issuer}/mcp`,
    iat: now,
    exp: now + REFRESH_TTL_SECONDS,
    scope,
  }, signingSecret);

  return jsonResponse({
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: 'Bearer',
    expires_in: ACCESS_TTL_SECONDS,
    scope,
  }, 200, { 'Cache-Control': 'no-store' });
}

async function handleOAuthUserinfo(request: Request, url: URL, env: Env): Promise<Response> {
  const authFailure = await authorizeWrapperBearer(request, url, env);
  if (authFailure) return authFailure;

  const subject = readEnvString(env, 'OAUTH_SUBJECT') ?? DEFAULT_SUBJECT;
  return jsonResponse({
    sub: subject,
    name: readEnvString(env, 'OAUTH_DISPLAY_NAME') ?? DEFAULT_DISPLAY_NAME,
    email_verified: false,
  });
}

async function handleMcpProxy(request: Request, url: URL, env: Env, mountPath: '/mcp' | '/sse'): Promise<Response> {
  const authFailure = await authorizeWrapperBearer(request, url, env);
  if (authFailure) return authFailure;

  const upstreamToken = readEnvString(env, 'UPSTREAM_MCP_BEARER_TOKEN');
  if (!upstreamToken) {
    return jsonResponse({ error: 'Upstream MCP bearer token is not configured.' }, 503);
  }

  const upstreamUrl = resolveUpstreamUrl(request, url, env, mountPath);
  const headers = buildProxyHeaders(request.headers, upstreamToken);
  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: 'manual',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.clone().arrayBuffer();
  }

  try {
    const upstreamResponse = await fetch(upstreamUrl, init);
    return copyProxyResponse(upstreamResponse);
  } catch (error) {
    return jsonResponse({
      error: 'Failed to reach upstream MCP.',
      detail: error instanceof Error ? error.message : String(error),
    }, 502);
  }
}

async function authorizeWrapperBearer(request: Request, url: URL, env: Env): Promise<Response | null> {
  const signingSecret = readEnvString(env, 'OAUTH_SIGNING_SECRET');
  if (!signingSecret) {
    return jsonResponse({ error: 'OAuth signing secret is not configured.' }, 503);
  }

  const token = getBearerToken(request);
  const payload = token ? await verifyToken(token, signingSecret) : null;
  const issuer = normalizeOrigin(url.origin);
  if (payload?.type === 'access' && payload.iss === issuer && payload.aud === `${issuer}/mcp`) {
    return null;
  }

  return jsonResponse({ error: 'Unauthorized' }, 401, {
    'WWW-Authenticate': `Bearer realm="${SERVER_NAME}", resource_metadata="${issuer}/mcp/.well-known/oauth-protected-resource"`,
  });
}

function resolveUpstreamUrl(request: Request, url: URL, env: Env, mountPath: '/mcp' | '/sse'): string {
  const configured = readEnvString(env, 'UPSTREAM_MCP_URL') ?? DEFAULT_UPSTREAM_MCP_URL;
  const base = new URL(configured);
  const suffix = url.pathname.slice(mountPath.length);

  if (mountPath === '/sse') {
    const configuredSse = readEnvString(env, 'UPSTREAM_SSE_URL');
    if (configuredSse) {
      const sseBase = new URL(configuredSse);
      sseBase.pathname = joinUrlPath(sseBase.pathname, suffix);
      sseBase.search = url.search;
      return sseBase.toString();
    }
    base.pathname = base.pathname.replace(/\/mcp\/?$/, '/sse');
  }

  base.pathname = joinUrlPath(base.pathname, suffix);
  base.search = new URL(request.url).search;
  return base.toString();
}

function buildProxyHeaders(inbound: Headers, upstreamToken: string): Headers {
  const headers = new Headers(inbound);
  headers.set('Authorization', `Bearer ${upstreamToken}`);
  headers.delete('Host');
  headers.delete('Content-Length');
  headers.delete('CF-Connecting-IP');
  headers.delete('CF-IPCountry');
  headers.delete('CF-Ray');
  headers.delete('X-Forwarded-For');
  headers.delete('X-Forwarded-Proto');
  return headers;
}

function copyProxyResponse(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.delete('Content-Encoding');
  headers.delete('Content-Length');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function readTokenRequestParams(request: Request): Promise<URLSearchParams> {
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const body = await request.json() as Record<string, unknown>;
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === 'string') params.set(key, value);
    }
    return params;
  }

  const text = await request.text();
  return new URLSearchParams(text);
}

async function validatePkce(params: URLSearchParams, payload: SignedTokenPayload): Promise<string | null> {
  if (!payload.code_challenge) return null;

  const verifier = params.get('code_verifier');
  if (!verifier) return 'Missing PKCE code_verifier.';

  const method = payload.code_challenge_method ?? 'plain';
  if (method === 'plain') {
    return verifier === payload.code_challenge ? null : 'PKCE verifier does not match.';
  }

  if (method === 'S256') {
    const digest = await crypto.subtle.digest('SHA-256', toArrayBuffer(utf8(verifier)));
    const challenge = base64UrlEncode(new Uint8Array(digest));
    return challenge === payload.code_challenge ? null : 'PKCE verifier does not match.';
  }

  return `Unsupported PKCE method: ${method}.`;
}

async function signToken(payload: SignedTokenPayload, secret: string): Promise<string> {
  const encodedPayload = base64UrlEncode(utf8(JSON.stringify(payload)));
  const signature = await hmac(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

async function verifyToken(token: string, secret: string): Promise<SignedTokenPayload | null> {
  const [encodedPayload, signature, extra] = token.split('.');
  if (!encodedPayload || !signature || extra !== undefined) return null;

  const expectedSignature = await hmac(encodedPayload, secret);
  if (!constantTimeEqual(signature, expectedSignature)) return null;

  try {
    const payload = JSON.parse(utf8Decode(base64UrlDecode(encodedPayload))) as SignedTokenPayload;
    if (typeof payload.exp !== 'number' || payload.exp < nowSeconds()) return null;
    return payload;
  } catch {
    return null;
  }
}

async function hmac(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(utf8(secret)),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, toArrayBuffer(utf8(value)));
  return base64UrlEncode(new Uint8Array(signature));
}

function validateAuthorizeParams(params: URLSearchParams): string | null {
  if (params.get('response_type') !== 'code') return 'Unsupported response_type.';
  if (!params.get('client_id')) return 'Missing client_id.';
  const redirectUri = params.get('redirect_uri');
  if (!redirectUri || !isHttpUrl(redirectUri)) return 'Invalid redirect_uri.';
  const codeChallengeMethod = params.get('code_challenge_method');
  if (codeChallengeMethod && !['plain', 'S256'].includes(codeChallengeMethod)) {
    return 'Unsupported code_challenge_method.';
  }
  return null;
}

function isOAuthAuthorizationServerPath(pathname: string): boolean {
  return pathname === '/.well-known/oauth-authorization-server' ||
    pathname === '/mcp/.well-known/oauth-authorization-server';
}

function isOAuthProtectedResourcePath(pathname: string): boolean {
  return pathname === '/.well-known/oauth-protected-resource' ||
    pathname === '/mcp/.well-known/oauth-protected-resource';
}

function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get('authorization');
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? null;
}

function readEnvString(env: Env, key: keyof Env | 'UPSTREAM_SSE_URL'): string | null {
  const value = (env as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function jsonResponse(body: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

function htmlResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function oauthError(error: string, description: string, status: number): Response {
  return jsonResponse({ error, error_description: description }, status, {
    'Cache-Control': 'no-store',
  });
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function renderAuthorizePage(url: URL, passwordConfigured: boolean): string {
  const params = url.searchParams;
  const hidden = ['response_type', 'client_id', 'redirect_uri', 'scope', 'state', 'resource', 'code_challenge', 'code_challenge_method']
    .map((key) => {
      const value = params.get(key);
      return value ? `<input type="hidden" name="${escapeHtml(key)}" value="${escapeHtml(value)}">` : '';
    })
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Authorize MCP Access</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #0b0b0b; color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    main { width: min(420px, calc(100vw - 32px)); border: 1px solid #2a2a2a; border-radius: 8px; padding: 24px; background: #141414; }
    h1 { margin: 0 0 8px; font-size: 20px; }
    p { margin: 0 0 20px; color: #b5b5b5; line-height: 1.45; }
    label { display: block; margin-bottom: 8px; font-size: 13px; color: #d6d6d6; }
    input[type="password"] { box-sizing: border-box; width: 100%; border: 1px solid #3a3a3a; border-radius: 6px; padding: 10px 12px; background: #050505; color: #fff; font-size: 15px; }
    button { margin-top: 16px; width: 100%; border: 0; border-radius: 6px; padding: 10px 12px; background: #fff; color: #111; font-weight: 600; cursor: pointer; }
    .error { color: #ffb4a8; }
  </style>
</head>
<body>
  <main>
    <h1>Authorize MCP Access</h1>
    <p>Connect Claude to the YouTube Transcript + Notion MCP.</p>
    ${passwordConfigured ? `<form method="post" action="/oauth/authorize">
      ${hidden}
      <label for="password">Connector password</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required>
      <button type="submit">Authorize</button>
    </form>` : '<p class="error">Connector login password is not configured.</p>'}
  </main>
</body>
</html>`;
}

function renderAuthorizeError(message: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Authorize MCP Access</title></head><body><h1>Authorize MCP Access</h1><p>${escapeHtml(message)}</p></body></html>`;
}

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/+$/, '');
}

function joinUrlPath(basePath: string, suffix: string): string {
  const cleanBase = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
  if (!suffix) return cleanBase || '/';
  return `${cleanBase}${suffix.startsWith('/') ? suffix : `/${suffix}`}`;
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function randomId(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32) || 'client';
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function utf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function utf8Decode(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
