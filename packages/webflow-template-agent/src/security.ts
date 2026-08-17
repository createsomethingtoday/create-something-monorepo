import type { ChatContext, Env } from './types.js';

const SESSION_AUDIENCE = 'webflow-template-agent';
const CONTEXT_AUDIENCE = 'webflow-template-agent-context';
const SESSION_TTL_SECONDS = 15 * 60;
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TURNSTILE_ACTION = 'template-agent-session';

export interface SessionClaims {
  sessionId: string;
  expiresAt: number;
}

export interface IssuedSession {
  token: string;
  expiresIn: number;
}

export interface TurnstileRequestContext {
  origin: string;
  remoteIp?: string;
}

export interface TurnstileVerification {
  success: boolean;
  reason?: string;
}

interface SessionPayload {
  aud: string;
  exp: number;
  iat: number;
  sid: string;
}

interface ContextPayload {
  aud: string;
  context: Pick<ChatContext, 'known_templates'>;
  exp: number;
  iat: number;
}

interface TurnstileResponse {
  success?: boolean;
  action?: string;
  hostname?: string;
  'error-codes'?: string[];
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64Url(value: string): Uint8Array | null {
  try {
    const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
    const binary = atob(padded);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

async function hmacKey(secret: string, usages: Array<'sign' | 'verify'>): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    usages,
  );
}

export async function issueSession(env: Env): Promise<IssuedSession> {
  if (!env.SESSION_SIGNING_SECRET) throw new Error('Session signing is not configured.');
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    aud: SESSION_AUDIENCE,
    exp: now + SESSION_TTL_SECONDS,
    iat: now,
    sid: crypto.randomUUID(),
  };
  const encodedPayload = encodeBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = new Uint8Array(
    await crypto.subtle.sign('HMAC', await hmacKey(env.SESSION_SIGNING_SECRET, ['sign']), new TextEncoder().encode(encodedPayload)),
  );
  return { token: `${encodedPayload}.${encodeBase64Url(signature)}`, expiresIn: SESSION_TTL_SECONDS };
}

export async function verifySession(env: Env, token: string): Promise<SessionClaims | null> {
  if (!env.SESSION_SIGNING_SECRET) return null;
  const [encodedPayload, encodedSignature, extra] = token.split('.');
  if (!encodedPayload || !encodedSignature || extra) return null;
  const signature = decodeBase64Url(encodedSignature);
  const payloadBytes = decodeBase64Url(encodedPayload);
  if (!signature || !payloadBytes) return null;

  const valid = await crypto.subtle.verify(
    'HMAC',
    await hmacKey(env.SESSION_SIGNING_SECRET, ['verify']),
    signature,
    new TextEncoder().encode(encodedPayload),
  );
  if (!valid) return null;

  try {
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as Partial<SessionPayload>;
    const now = Math.floor(Date.now() / 1000);
    if (
      payload.aud !== SESSION_AUDIENCE ||
      typeof payload.sid !== 'string' ||
      !payload.sid ||
      typeof payload.exp !== 'number' ||
      payload.exp <= now
    ) {
      return null;
    }
    return { sessionId: payload.sid, expiresAt: payload.exp * 1000 };
  } catch {
    return null;
  }
}

export async function issueContext(env: Env, context: ChatContext): Promise<string> {
  if (!env.CONTEXT_SIGNING_SECRET) throw new Error('Context signing is not configured.');
  const now = Math.floor(Date.now() / 1000);
  const payload: ContextPayload = {
    aud: CONTEXT_AUDIENCE,
    context: { known_templates: (context.known_templates ?? []).slice(-40) },
    exp: now + SESSION_TTL_SECONDS,
    iat: now,
  };
  const encodedPayload = encodeBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = new Uint8Array(
    await crypto.subtle.sign('HMAC', await hmacKey(env.CONTEXT_SIGNING_SECRET, ['sign']), new TextEncoder().encode(encodedPayload)),
  );
  return `${encodedPayload}.${encodeBase64Url(signature)}`;
}

export async function verifyContext(env: Env, token: string): Promise<Pick<ChatContext, 'known_templates'> | null> {
  if (!env.CONTEXT_SIGNING_SECRET) return null;
  const [encodedPayload, encodedSignature, extra] = token.split('.');
  if (!encodedPayload || !encodedSignature || extra) return null;
  const signature = decodeBase64Url(encodedSignature);
  const payloadBytes = decodeBase64Url(encodedPayload);
  if (!signature || !payloadBytes) return null;
  const valid = await crypto.subtle.verify(
    'HMAC',
    await hmacKey(env.CONTEXT_SIGNING_SECRET, ['verify']),
    signature,
    new TextEncoder().encode(encodedPayload),
  );
  if (!valid) return null;

  try {
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as Partial<ContextPayload>;
    const now = Math.floor(Date.now() / 1000);
    if (
      payload.aud !== CONTEXT_AUDIENCE ||
      typeof payload.exp !== 'number' ||
      payload.exp <= now ||
      typeof payload.context !== 'object' ||
      payload.context === null ||
      !Array.isArray(payload.context.known_templates)
    ) {
      return null;
    }
    return { known_templates: payload.context.known_templates.slice(-40) };
  } catch {
    return null;
  }
}

export async function verifyTurnstile(
  env: Env,
  token: string,
  context: TurnstileRequestContext,
): Promise<TurnstileVerification> {
  if (!env.TURNSTILE_SECRET_KEY || !env.TURNSTILE_EXPECTED_HOSTNAME) {
    return { success: false, reason: 'Bot verification is not configured.' };
  }

  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      secret: env.TURNSTILE_SECRET_KEY,
      response: token,
      remoteip: context.remoteIp,
      idempotency_key: crypto.randomUUID(),
    }),
  });
  if (!response.ok) return { success: false, reason: 'Bot verification is temporarily unavailable.' };

  const result = (await response.json()) as TurnstileResponse;
  if (!result.success) return { success: false, reason: 'Bot verification failed.' };
  if (result.action !== TURNSTILE_ACTION) return { success: false, reason: 'Bot verification action mismatch.' };
  // Comma-separated list so staging (webflowtest.com) can verify alongside
  // production without weakening the exact-hostname requirement per entry.
  const expectedHostnames = env.TURNSTILE_EXPECTED_HOSTNAME.split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (!result.hostname || !expectedHostnames.includes(result.hostname)) {
    return { success: false, reason: 'Bot verification hostname mismatch.' };
  }
  return { success: true };
}

export function bearerToken(request: Request): string | null {
  const value = request.headers.get('authorization');
  if (!value?.startsWith('Bearer ')) return null;
  return value.slice('Bearer '.length).trim() || null;
}
