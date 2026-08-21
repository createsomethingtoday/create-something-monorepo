import type { GuardAccessScope } from './scope.js';

export const PROJECT_SESSION_COOKIE = 'guard_lab_project_session';
export const PROJECT_SESSION_TTL_SECONDS = 14 * 24 * 60 * 60;
const PASSWORD_HASH_ALGORITHM = 'pbkdf2-sha256';
// Cloudflare Workers Web Crypto rejects PBKDF2 requests above 100,000 iterations.
const PASSWORD_HASH_ITERATIONS = 100_000;
const PASSWORD_HASH_BYTES = 32;
const PASSWORD_SALT_BYTES = 16;

export type RuntimeEnv = Record<string, string | undefined>;

export interface GuardProjectAccessConfig {
  passwordHash: string;
  sessionSecret: string;
  playerId: string;
  production: boolean;
}

export interface GuardApplicationAccess {
  status: 'allowed' | 'unauthenticated' | 'invalid' | 'unconfigured';
  source: 'project-password' | 'none';
  signInUrl: string;
  reason: string;
  detail: string;
  scope: GuardAccessScope | null;
}

type PasswordHashOptions = {
  iterations?: number;
  salt?: Uint8Array<ArrayBuffer>;
};

type ProjectSessionInput = {
  passwordHash: string;
  playerId: string;
  sessionSecret: string;
  now?: number;
  ttlSeconds?: number;
};

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid base64url value.');
  const padded = value.replaceAll('-', '+').replaceAll('_', '/')
    + '='.repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function parsePasswordHash(value: string): {
  iterations: number;
  salt: Uint8Array<ArrayBuffer>;
  digest: Uint8Array<ArrayBuffer>;
} {
  const [algorithm, rawIterations, rawSalt, rawDigest, ...extra] = value.split('$');
  const iterations = Number(rawIterations);
  if (
    algorithm !== PASSWORD_HASH_ALGORITHM
    || extra.length > 0
    || !Number.isInteger(iterations)
    || iterations !== PASSWORD_HASH_ITERATIONS
  ) {
    throw new Error(`GUARD_LAB_PROJECT_PASSWORD_HASH must use ${PASSWORD_HASH_ALGORITHM} with exactly ${PASSWORD_HASH_ITERATIONS} iterations.`);
  }
  let salt: Uint8Array<ArrayBuffer>;
  let digest: Uint8Array<ArrayBuffer>;
  try {
    salt = fromBase64Url(rawSalt ?? '');
    digest = fromBase64Url(rawDigest ?? '');
  } catch {
    throw new Error('GUARD_LAB_PROJECT_PASSWORD_HASH contains invalid verifier bytes.');
  }
  if (salt.byteLength < PASSWORD_SALT_BYTES || digest.byteLength !== PASSWORD_HASH_BYTES) {
    throw new Error('GUARD_LAB_PROJECT_PASSWORD_HASH contains an invalid salt or digest length.');
  }
  return { iterations, salt, digest };
}

async function derivePasswordDigest(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number
): Promise<Uint8Array<ArrayBuffer>> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const digest = await crypto.subtle.deriveBits({
    name: 'PBKDF2',
    hash: 'SHA-256',
    salt,
    iterations
  }, key, PASSWORD_HASH_BYTES * 8);
  return new Uint8Array(digest);
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  let mismatch = 0;
  for (let index = 0; index < left.byteLength; index += 1) {
    mismatch |= left[index]! ^ right[index]!;
  }
  return mismatch === 0;
}

export async function hashProjectPassword(
  password: string,
  options: PasswordHashOptions = {}
): Promise<string> {
  if (password.length < 12) throw new Error('The shared project password must contain at least 12 characters.');
  const iterations = options.iterations ?? PASSWORD_HASH_ITERATIONS;
  if (!Number.isInteger(iterations) || iterations < PASSWORD_HASH_ITERATIONS) {
    throw new Error(`Project password hashing requires at least ${PASSWORD_HASH_ITERATIONS} iterations.`);
  }
  if (iterations > PASSWORD_HASH_ITERATIONS) {
    throw new Error(`Project password hashing supports at most ${PASSWORD_HASH_ITERATIONS} iterations on Cloudflare Workers.`);
  }
  const salt = options.salt ?? crypto.getRandomValues(new Uint8Array(PASSWORD_SALT_BYTES));
  if (salt.byteLength < PASSWORD_SALT_BYTES) throw new Error('Project password hashing requires at least 16 salt bytes.');
  const digest = await derivePasswordDigest(password, salt, iterations);
  return `${PASSWORD_HASH_ALGORITHM}$${iterations}$${toBase64Url(salt)}$${toBase64Url(digest)}`;
}

export async function verifyProjectPassword(password: string, verifier: string): Promise<boolean> {
  let parsed: ReturnType<typeof parsePasswordHash>;
  try {
    parsed = parsePasswordHash(verifier);
  } catch {
    return false;
  }
  const actual = await derivePasswordDigest(password, parsed.salt, parsed.iterations);
  return constantTimeEqual(actual, parsed.digest);
}

async function sessionSigningKey(sessionSecret: string, passwordHash: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(`${sessionSecret}\u0000${passwordHash}`),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function createProjectSession(input: ProjectSessionInput): Promise<string> {
  const issuedAt = Math.floor((input.now ?? Date.now()) / 1000);
  const expiresAt = issuedAt + (input.ttlSeconds ?? PROJECT_SESSION_TTL_SECONDS);
  const payload = toBase64Url(encoder.encode(JSON.stringify({
    version: 1,
    playerId: input.playerId,
    issuedAt,
    expiresAt
  })));
  const key = await sessionSigningKey(input.sessionSecret, input.passwordHash);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return `v1.${payload}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifyProjectSession(
  token: string,
  input: ProjectSessionInput
): Promise<GuardAccessScope | null> {
  const [version, payload, rawSignature, ...extra] = token.split('.');
  if (version !== 'v1' || !payload || !rawSignature || extra.length > 0) return null;
  let signature: Uint8Array<ArrayBuffer>;
  try {
    signature = fromBase64Url(rawSignature);
  } catch {
    return null;
  }
  const key = await sessionSigningKey(input.sessionSecret, input.passwordHash);
  const valid = await crypto.subtle.verify('HMAC', key, signature, encoder.encode(payload));
  if (!valid) return null;

  let session: unknown;
  try {
    session = JSON.parse(new TextDecoder().decode(fromBase64Url(payload)));
  } catch {
    return null;
  }
  if (!session || typeof session !== 'object' || Array.isArray(session)) return null;
  const value = session as Record<string, unknown>;
  const nowSeconds = Math.floor((input.now ?? Date.now()) / 1000);
  if (
    value.version !== 1
    || value.playerId !== input.playerId
    || typeof value.issuedAt !== 'number'
    || typeof value.expiresAt !== 'number'
    || value.issuedAt > nowSeconds + 60
    || value.expiresAt <= nowSeconds
    || value.expiresAt - value.issuedAt > PROJECT_SESSION_TTL_SECONDS
  ) return null;
  return { role: 'player', playerId: input.playerId };
}

export function parseGuardProjectAccessConfig(env: RuntimeEnv): GuardProjectAccessConfig {
  const passwordHash = env.GUARD_LAB_PROJECT_PASSWORD_HASH?.trim();
  const sessionSecret = env.GUARD_LAB_SESSION_SECRET?.trim();
  const playerId = env.GUARD_LAB_SHARED_PLAYER_ID?.trim();
  if (!passwordHash || !sessionSecret) {
    throw new Error('Guard Lab requires a project password verifier and session secret.');
  }
  if (!playerId) throw new Error('Guard Lab requires one explicit shared player ID.');
  parsePasswordHash(passwordHash);
  if (sessionSecret.length < 32) throw new Error('GUARD_LAB_SESSION_SECRET must contain at least 32 characters.');
  return {
    passwordHash,
    sessionSecret,
    playerId,
    production: env.ENVIRONMENT === 'production'
  };
}

function signInUrlFor(url: URL, configured: string | undefined): string {
  const target = new URL(configured?.trim() || '/sign-in', url.origin);
  target.searchParams.set('redirect', `${url.pathname}${url.search}`);
  return target.origin === url.origin ? `${target.pathname}${target.search}` : target.toString();
}

function cookieValue(request: Request, name: string): string | null {
  for (const entry of request.headers.get('cookie')?.split(';') ?? []) {
    const separator = entry.indexOf('=');
    if (separator < 0 || entry.slice(0, separator).trim() !== name) continue;
    return entry.slice(separator + 1).trim() || null;
  }
  return null;
}

function unconfigured(signInUrl: string, reason: string): GuardApplicationAccess {
  return { status: 'unconfigured', source: 'none', signInUrl, reason, detail: reason, scope: null };
}

export function privateResponse(response: Response): Response {
  response.headers.set('cache-control', 'private, no-store');
  return response;
}

export async function resolveGuardApplicationAccess(input: {
  request: Request;
  url: URL;
  env: RuntimeEnv;
  now?: number;
  fetch?: typeof globalThis.fetch;
}): Promise<GuardApplicationAccess> {
  const signInUrl = signInUrlFor(input.url, input.env.GUARD_LAB_PROJECT_SIGN_IN_URL);
  let config: GuardProjectAccessConfig;
  try {
    config = parseGuardProjectAccessConfig(input.env);
  } catch (error) {
    return unconfigured(signInUrl, error instanceof Error ? error.message : 'Guard Lab project access is invalid.');
  }

  const token = cookieValue(input.request, PROJECT_SESSION_COOKIE);
  if (!token) {
    return {
      status: 'unauthenticated',
      source: 'none',
      signInUrl,
      reason: 'Enter the shared project password to continue.',
      detail: 'This private player workspace is protected by one shared project password.',
      scope: null
    };
  }
  const scope = await verifyProjectSession(token, { ...config, now: input.now });
  if (!scope) {
    return {
      status: 'invalid',
      source: 'none',
      signInUrl,
      reason: 'The project session is invalid or expired.',
      detail: 'Enter the shared project password again to continue.',
      scope: null
    };
  }
  return {
    status: 'allowed',
    source: 'project-password',
    signInUrl,
    reason: 'Shared project access is active.',
    detail: 'Shared project access is active for the assigned player workspace.',
    scope
  };
}

function sessionCookie(token: string, production: boolean): string {
  return [
    `${PROJECT_SESSION_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${PROJECT_SESSION_TTL_SECONDS}`,
    production ? 'Secure' : ''
  ].filter(Boolean).join('; ');
}

export function clearProjectSessionCookie(production: boolean): string {
  return [
    `${PROJECT_SESSION_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    production ? 'Secure' : ''
  ].filter(Boolean).join('; ');
}

export async function authenticateProjectPassword(input: {
  request: Request;
  env: RuntimeEnv;
  now?: number;
}): Promise<Response> {
  let config: GuardProjectAccessConfig;
  try {
    config = parseGuardProjectAccessConfig(input.env);
  } catch {
    return privateResponse(Response.json({ success: false, error: 'Project access is not configured.' }, { status: 503 }));
  }
  let password = '';
  try {
    const body = await input.request.json() as { password?: unknown };
    password = typeof body.password === 'string' ? body.password : '';
  } catch {
    return privateResponse(Response.json({ success: false, error: 'Enter the project password.' }, { status: 400 }));
  }
  if (!password || !await verifyProjectPassword(password, config.passwordHash)) {
    return privateResponse(Response.json({ success: false, error: 'Invalid project password.' }, { status: 401 }));
  }
  const token = await createProjectSession({ ...config, now: input.now });
  return privateResponse(Response.json({ success: true }, {
    headers: { 'set-cookie': sessionCookie(token, config.production) }
  }));
}

export function runtimeEnv(platform?: App.Platform): RuntimeEnv {
  const platformEnv = platform?.env as RuntimeEnv | undefined;
  const processEnv = typeof process !== 'undefined' ? process.env : undefined;
  return new Proxy({}, {
    get: (_target, key: string) => processEnv?.[key] ?? platformEnv?.[key]
  }) as RuntimeEnv;
}

export function deniedAccessResponse(access: GuardApplicationAccess): Response {
  return privateResponse(Response.json({
    ok: false,
    error: access.reason,
    signInUrl: access.signInUrl
  }, { status: access.status === 'unconfigured' ? 503 : 401 }));
}
