import { z } from 'zod';
import { BundleError } from './bundle-contract';
import { required, portalOrigin, type Platform } from './platform';
import { providerFetch } from './provider';
import { identitySchema, withMcp, toolData, OAUTH_ISSUER, MCP_URL, type Identity } from './mcp';

const cookieName = 'review_session';
const b64 = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64url');
export const random = () => b64(crypto.getRandomValues(new Uint8Array(32)));
export const digest = async (value: string) =>
  b64(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))));
async function key(env: Platform) {
  const bytes = Buffer.from(
    required(env.SESSION_ENCRYPTION_KEY, 'Session encryption'),
    'base64url'
  );
  if (bytes.length !== 32)
    throw new BundleError(
      'CONFIGURATION_REQUIRED',
      'Session encryption key must be 32 bytes.',
      503
    );
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
export async function seal(env: Platform, data: unknown) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await key(env),
    new TextEncoder().encode(JSON.stringify(data))
  );
  return `${b64(iv)}.${b64(new Uint8Array(encrypted))}`;
}
export async function unseal<T>(env: Platform, data: string): Promise<T> {
  const [iv, payload] = data.split('.');
  return JSON.parse(
    new TextDecoder().decode(
      await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: Buffer.from(iv, 'base64url') },
        await key(env),
        Buffer.from(payload, 'base64url')
      )
    )
  );
}
export function readCookie(request: Request, name: string) {
  return (request.headers.get('cookie') || '')
    .split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}
function cookie(name: string, value: string, age: number) {
  return `${name}=${value}; Path=/; Max-Age=${age}; HttpOnly; Secure; SameSite=Lax`;
}
export function assertAllowed(env: Platform, identity: Identity) {
  const allowed = required(env.PORTAL_ALLOWED_EMAILS, 'Reviewer access policy')
    .split(',')
    .map((e) => e.trim().toLowerCase());
  if (!allowed.includes(identity.email.toLowerCase()))
    throw new BundleError(
      'ACCESS_NOT_GRANTED',
      'Your account does not have access to this portal yet.',
      403
    );
}
type Session = { identity: Identity; accessToken: string; expiresAt: number };
export async function session(env: Platform, request: Request): Promise<Session & { id: string }> {
  const raw = readCookie(request, cookieName);
  if (!raw || !/^[\w-]{43}$/.test(raw))
    throw new BundleError('SIGN_IN_REQUIRED', 'Sign in with your Webflow work account.', 401);
  const id = await digest(raw);
  const row = await env.DB.prepare(
    'SELECT encrypted FROM portal_sessions WHERE id = ? AND expires_at > ?'
  )
    .bind(id, Date.now())
    .first<{ encrypted: string }>();
  if (!row) throw new BundleError('SIGN_IN_REQUIRED', 'Your session expired. Sign in again.', 401);
  const data = await unseal<Session>(env, row.encrypted);
  assertAllowed(env, data.identity);
  return { ...data, id };
}
export async function beginLogin(env: Platform) {
  const clientId = required(env.OAUTH_CLIENT_ID, 'App Review OAuth client');
  const state = random(),
    verifier = random();
  await env.DB.prepare('DELETE FROM oauth_attempts WHERE expires_at < ?').bind(Date.now()).run();
  await env.DB.prepare('INSERT INTO oauth_attempts (id, encrypted, expires_at) VALUES (?, ?, ?)')
    .bind(await digest(state), await seal(env, { verifier }), Date.now() + 600000)
    .run();
  const url = new URL(`${OAUTH_ISSUER}/cdn-cgi/access/oauth/authorization`);
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${portalOrigin(env)}/api/auth/callback`,
    response_type: 'code',
    state,
    code_challenge: await digest(verifier),
    code_challenge_method: 'S256',
    resource: MCP_URL
  }).toString();
  return new Response(null, {
    status: 302,
    headers: {
      Location: url.href,
      'Set-Cookie': cookie('review_oauth_state', state, 600),
      'Cache-Control': 'no-store'
    }
  });
}
export async function finishLogin(env: Platform, request: Request) {
  const url = new URL(request.url),
    state = url.searchParams.get('state'),
    code = url.searchParams.get('code');
  if (!state || !code || state !== readCookie(request, 'review_oauth_state'))
    throw new BundleError(
      'OAUTH_STATE_INVALID',
      'The sign-in attempt expired or did not match this browser.',
      401
    );
  const row = await env.DB.prepare(
    'DELETE FROM oauth_attempts WHERE id = ? AND expires_at > ? RETURNING encrypted'
  )
    .bind(await digest(state), Date.now())
    .first<{ encrypted: string }>();
  if (!row)
    throw new BundleError(
      'OAUTH_STATE_INVALID',
      'This sign-in attempt has already been used or expired.',
      401
    );
  const { verifier } = await unseal<{ verifier: string }>(env, row.encrypted);
  const response = await providerFetch(
    'Webflow sign-in',
    `${OAUTH_ISSUER}/cdn-cgi/access/oauth/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        code_verifier: verifier,
        client_id: required(env.OAUTH_CLIENT_ID, 'OAuth client'),
        redirect_uri: `${portalOrigin(env)}/api/auth/callback`,
        resource: MCP_URL
      }).toString()
    }
  );
  const token = z
    .object({
      access_token: z.string().min(1),
      token_type: z.string(),
      expires_in: z.number().positive()
    })
    .parse(await response.json());
  if (token.token_type.toLowerCase() !== 'bearer')
    throw new BundleError('OAUTH_TOKEN_INVALID', 'Unsupported access token type.', 401);
  // The identity comes from the MCP's verified Access assertion, never unsigned headers or a browser email.
  const identity = await withMcp(token.access_token, async (rpc) =>
    identitySchema.parse(
      toolData(await rpc('tools/call', { name: 'app_review_session', arguments: {} }))
    )
  );
  assertAllowed(env, identity);
  const raw = random(),
    expiresAt = Date.now() + Math.min(token.expires_in, 3600) * 1000;
  await env.DB.prepare('DELETE FROM portal_sessions WHERE expires_at < ?').bind(Date.now()).run();
  await env.DB.prepare('INSERT INTO portal_sessions (id, encrypted, expires_at) VALUES (?, ?, ?)')
    .bind(
      await digest(raw),
      await seal(env, { identity, accessToken: token.access_token, expiresAt }),
      expiresAt
    )
    .run();
  const headers = new Headers({ Location: portalOrigin(env), 'Cache-Control': 'no-store' });
  headers.append('Set-Cookie', cookie(cookieName, raw, Math.min(token.expires_in, 3600)));
  headers.append('Set-Cookie', cookie('review_oauth_state', '', 0));
  return new Response(null, { status: 302, headers });
}
export async function logout(env: Platform, request: Request) {
  const raw = readCookie(request, cookieName);
  if (raw)
    await env.DB.prepare('DELETE FROM portal_sessions WHERE id = ?')
      .bind(await digest(raw))
      .run();
  return new Response(null, {
    status: 204,
    headers: { 'Set-Cookie': cookie(cookieName, '', 0), 'Cache-Control': 'no-store' }
  });
}
