import type { Env } from './types';

const STATE_COOKIE = 'webflow_oauth_state';
const OAUTH_TTL_SECONDS = 15 * 60;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value)
  );
  return bytesToHex(new Uint8Array(digest));
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function encryptionKey(env: Env): Promise<CryptoKey | null> {
  if (!env.WEBFLOW_TOKEN_ENCRYPTION_KEY) return null;
  try {
    const key = base64ToBytes(env.WEBFLOW_TOKEN_ENCRYPTION_KEY);
    if (key.byteLength !== 32) return null;
    return await crypto.subtle.importKey('raw', key, 'AES-GCM', false, [
      'encrypt',
      'decrypt'
    ]);
  } catch {
    return null;
  }
}

async function encryptAccessToken(
  token: string,
  env: Env
): Promise<{ ciphertext: string; iv: string } | null> {
  const key = await encryptionKey(env);
  if (!key) return null;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(token)
  );
  return {
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    iv: bytesToBase64(iv)
  };
}

async function decryptAccessToken(
  ciphertext: string,
  iv: string,
  env: Env
): Promise<string | null> {
  const key = await encryptionKey(env);
  if (!key) return null;
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToBytes(iv) },
      key,
      base64ToBytes(ciphertext)
    );
    return new TextDecoder().decode(plaintext);
  } catch {
    return null;
  }
}

function cookieValue(request: Request, name: string): string | null {
  for (const part of (request.headers.get('cookie') ?? '').split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return value.join('=') || null;
  }
  return null;
}

function stateCookie(state: string, maxAge = OAUTH_TTL_SECONDS): string {
  return [
    `${STATE_COOKIE}=${state}`,
    'Path=/v1/oauth/webflow/callback',
    `Max-Age=${maxAge}`,
    'HttpOnly',
    'Secure',
    'SameSite=Lax'
  ].join('; ');
}

function unavailable(): Response {
  return Response.json(
    { error: 'webflow_oauth_not_configured' },
    { status: 503, headers: { 'cache-control': 'no-store' } }
  );
}

function invalidCallback(reason: string): Response {
  return Response.json(
    { error: 'invalid_webflow_oauth_callback', reason },
    { status: 400, headers: { 'cache-control': 'no-store' } }
  );
}

function configuredForStart(env: Env): boolean {
  return Boolean(env.WEBFLOW_CLIENT_ID && env.WEBFLOW_OAUTH_REDIRECT_URI);
}

function configuredForCallback(env: Env): boolean {
  return Boolean(
    configuredForStart(env) &&
      env.WEBFLOW_CLIENT_SECRET &&
      env.WEBFLOW_TOKEN_ENCRYPTION_KEY
  );
}

export async function startWebflowOAuth(env: Env): Promise<Response> {
  if (!configuredForStart(env)) return unavailable();

  const state = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OAUTH_TTL_SECONDS * 1000).toISOString();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM webflow_oauth_states WHERE expires_at <= ?').bind(
      now.toISOString()
    ),
    env.DB.prepare(
      `INSERT INTO webflow_oauth_states (state_sha256, expires_at, created_at)
       VALUES (?, ?, ?)`
    ).bind(await sha256(state), expiresAt, now.toISOString())
  ]);

  const authorization = new URL('https://webflow.com/oauth/authorize');
  authorization.searchParams.set('response_type', 'code');
  authorization.searchParams.set('client_id', env.WEBFLOW_CLIENT_ID!);
  authorization.searchParams.set('scope', 'authorized_user:read');
  authorization.searchParams.set('redirect_uri', env.WEBFLOW_OAUTH_REDIRECT_URI!);
  authorization.searchParams.set('state', state);

  return new Response(null, {
    status: 302,
    headers: {
      location: authorization.toString(),
      'set-cookie': stateCookie(state),
      'cache-control': 'no-store'
    }
  });
}

interface AccessTokenResponse {
  access_token?: unknown;
}

export async function completeWebflowOAuth(
  request: Request,
  env: Env
): Promise<Response> {
  if (!configuredForCallback(env)) return unavailable();

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieState = cookieValue(request, STATE_COOKIE);
  if (!code) return invalidCallback('missing_code');
  if (!state || !cookieState || state !== cookieState) {
    return invalidCallback('state_mismatch');
  }

  const consumed = await env.DB.prepare(
    `DELETE FROM webflow_oauth_states
      WHERE state_sha256 = ? AND expires_at > ?
      RETURNING state_sha256`
  )
    .bind(await sha256(state), new Date().toISOString())
    .first<{ state_sha256: string }>();
  if (!consumed) return invalidCallback('state_unavailable');

  const exchange = await fetch('https://api.webflow.com/oauth/access_token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client_id: env.WEBFLOW_CLIENT_ID,
      client_secret: env.WEBFLOW_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: env.WEBFLOW_OAUTH_REDIRECT_URI
    })
  });
  if (!exchange.ok) {
    return Response.json(
      { error: 'webflow_oauth_exchange_failed' },
      { status: 502, headers: { 'cache-control': 'no-store' } }
    );
  }
  const body = (await exchange.json()) as AccessTokenResponse;
  if (typeof body.access_token !== 'string' || !body.access_token) {
    return Response.json(
      { error: 'webflow_oauth_exchange_invalid' },
      { status: 502, headers: { 'cache-control': 'no-store' } }
    );
  }

  const encrypted = await encryptAccessToken(body.access_token, env);
  if (!encrypted) return unavailable();
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO webflow_oauth_installations
       (id, access_token_ciphertext, access_token_iv, created_at, updated_at)
     VALUES ('active', ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       access_token_ciphertext = excluded.access_token_ciphertext,
       access_token_iv = excluded.access_token_iv,
       updated_at = excluded.updated_at`
  )
    .bind(encrypted.ciphertext, encrypted.iv, now, now)
    .run();

  const completion = new URL('/v1/oauth/webflow/complete', request.url);
  return new Response(null, {
    status: 303,
    headers: {
      location: completion.toString(),
      'set-cookie': stateCookie('', 0),
      'cache-control': 'no-store'
    }
  });
}

export function webflowOAuthCompletePage(): Response {
  return new Response(
    '<!doctype html><meta charset="utf-8"><title>Webflow connected</title><main><h1>Connection complete</h1><p>Return to the Webflow Designer to continue validation.</p></main>',
    {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
        'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
        'x-content-type-options': 'nosniff'
      }
    }
  );
}

export async function storedWebflowAccessToken(env: Env): Promise<string | null> {
  const row = await env.DB.prepare(
    `SELECT access_token_ciphertext, access_token_iv
       FROM webflow_oauth_installations
      WHERE id = 'active'`
  ).first<{ access_token_ciphertext: string; access_token_iv: string }>();
  if (!row) return null;
  return decryptAccessToken(
    row.access_token_ciphertext,
    row.access_token_iv,
    env
  );
}
