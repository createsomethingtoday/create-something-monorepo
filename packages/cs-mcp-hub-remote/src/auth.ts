export type AuthContext = {
  accountId: string;
  tenantId: string;
  subject: string;
  scopes: string[];
  issuer: string;
  audience: string | string[];
  issuedAt: number;
  expiresAt: number;
  mode: 'jwt' | 'static-operator';
};

export interface HubAuthEnv {
  HUB_API_TOKEN?: string;
  HUB_AUTH_REQUIRED?: string;
  HUB_AUTH_JWKS_URL?: string;
  HUB_AUTH_ISSUER?: string;
  HUB_AUTH_AUDIENCE?: string;
  HUB_AUTH_CLOCK_SKEW_SECONDS?: string;
  HUB_ALLOW_STATIC_OPERATOR_TOKEN?: string;
  [key: string]: unknown;
}

type JwtHeader = {
  alg?: string;
  kid?: string;
  typ?: string;
};

type JwtClaims = {
  iss?: unknown;
  aud?: unknown;
  sub?: unknown;
  exp?: unknown;
  iat?: unknown;
  account_id?: unknown;
  tenant_id?: unknown;
  scopes?: unknown;
};

type JwksDocument = {
  keys: JsonWebKey[];
};

type JwksCacheEntry = {
  expiresAt: number;
  keys: JsonWebKey[];
};

const JWKS_CACHE = new Map<string, JwksCacheEntry>();
const DEFAULT_CLOCK_SKEW_SECONDS = 60;
const DEFAULT_JWKS_TTL_MS = 300_000;

export class AuthError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

export function isAuthRequired(env: HubAuthEnv): boolean {
  const raw = readEnvString(env, 'HUB_AUTH_REQUIRED');
  if (raw === undefined) return true;
  return parseBoolean(raw, true);
}

export function allowStaticOperatorToken(env: HubAuthEnv): boolean {
  return parseBoolean(readEnvString(env, 'HUB_ALLOW_STATIC_OPERATOR_TOKEN') ?? 'false', false);
}

export function authModeLabel(env: HubAuthEnv): string {
  const required = isAuthRequired(env);
  const allowStatic = allowStaticOperatorToken(env);
  if (!required) return 'disabled';
  return allowStatic ? 'jwt_or_static_operator' : 'jwt';
}

export async function authorizeHttpRequest(request: Request, env: HubAuthEnv): Promise<AuthContext | null> {
  if (!isAuthRequired(env)) {
    return null;
  }

  const token = getBearerToken(request.headers.get('authorization'));
  if (!token) {
    throw new AuthError('Missing bearer token', 401);
  }

  return verifyBearerToken(token, env);
}

export async function resolveAuthContextFromExtra(extra: unknown, env: HubAuthEnv): Promise<AuthContext | null> {
  if (!isAuthRequired(env)) {
    return null;
  }

  const token = getBearerToken(getHeaderValue(extra, 'authorization'));
  if (!token) {
    throw new AuthError('Missing bearer token in MCP request', 401);
  }

  return verifyBearerToken(token, env);
}

async function verifyBearerToken(token: string, env: HubAuthEnv): Promise<AuthContext> {
  const staticToken = readEnvString(env, 'HUB_API_TOKEN');
  if (
    staticToken &&
    allowStaticOperatorToken(env) &&
    timingSafeEqual(staticToken, token)
  ) {
    const now = Math.floor(Date.now() / 1000);
    return {
      accountId: 'operator',
      tenantId: 'operator',
      subject: 'operator',
      scopes: ['*'],
      issuer: 'static-operator',
      audience: 'create-something-hub-remote',
      issuedAt: now,
      expiresAt: now + 3600,
      mode: 'static-operator',
    };
  }

  const jwksUrl = readEnvString(env, 'HUB_AUTH_JWKS_URL');
  const issuer = readEnvString(env, 'HUB_AUTH_ISSUER');
  const audience = readEnvString(env, 'HUB_AUTH_AUDIENCE');

  if (!jwksUrl || !issuer || !audience) {
    throw new AuthError('JWT auth is required but HUB_AUTH_JWKS_URL/HUB_AUTH_ISSUER/HUB_AUTH_AUDIENCE are not configured', 500);
  }

  const { header, claims, signedPayload, signatureBytes } = parseAndDecodeJwt(token);

  const alg = header.alg;
  if (alg !== 'RS256') {
    throw new AuthError(`Unsupported JWT alg: ${alg ?? 'unknown'}`, 401);
  }

  const key = await resolveVerificationKey(jwksUrl, header.kid);
  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    key,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['verify'],
  );

  const verified = await crypto.subtle.verify(
    {
      name: 'RSASSA-PKCS1-v1_5',
    },
    cryptoKey,
    signatureBytes,
    signedPayload,
  );

  if (!verified) {
    throw new AuthError('JWT signature verification failed', 401);
  }

  return validateClaims(claims, issuer, audience, resolveClockSkewSeconds(env));
}

function resolveClockSkewSeconds(env: HubAuthEnv): number {
  const raw = readEnvString(env, 'HUB_AUTH_CLOCK_SKEW_SECONDS');
  if (!raw) return DEFAULT_CLOCK_SKEW_SECONDS;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 3600) {
    return DEFAULT_CLOCK_SKEW_SECONDS;
  }
  return parsed;
}

function parseAndDecodeJwt(token: string): {
  header: JwtHeader;
  claims: JwtClaims;
  signedPayload: Uint8Array;
  signatureBytes: Uint8Array;
} {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new AuthError('Invalid JWT format', 401);
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw new AuthError('Invalid JWT format', 401);
  }

  const header = parseJson<JwtHeader>(base64UrlDecodeToString(encodedHeader), 'JWT header');
  const claims = parseJson<JwtClaims>(base64UrlDecodeToString(encodedPayload), 'JWT claims');

  const signedPayload = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
  const signatureBytes = base64UrlDecode(encodedSignature);

  return {
    header,
    claims,
    signedPayload,
    signatureBytes,
  };
}

async function resolveVerificationKey(jwksUrl: string, kid: string | undefined): Promise<JsonWebKey> {
  const keys = await loadJwksKeys(jwksUrl);
  if (keys.length === 0) {
    throw new AuthError('JWKS endpoint returned no keys', 401);
  }

  if (kid) {
    const match = keys.find((key) => getJwkKid(key) === kid);
    if (!match) {
      throw new AuthError(`No JWKS key found for kid=${kid}`, 401);
    }
    return match;
  }

  if (keys.length > 1) {
    throw new AuthError('JWT missing kid and JWKS returned multiple keys', 401);
  }

  return keys[0];
}

async function loadJwksKeys(jwksUrl: string): Promise<JsonWebKey[]> {
  const now = Date.now();
  const cached = JWKS_CACHE.get(jwksUrl);
  if (cached && cached.expiresAt > now) {
    return cached.keys;
  }

  const response = await fetch(jwksUrl, { method: 'GET' });
  if (!response.ok) {
    throw new AuthError(`Failed to fetch JWKS: HTTP ${response.status}`, 401);
  }

  const document = (await response.json()) as JwksDocument;
  if (!document || !Array.isArray(document.keys)) {
    throw new AuthError('Invalid JWKS response format', 401);
  }

  const maxAge = parseCacheControlMaxAge(response.headers.get('cache-control'));
  const expiresAt = now + (maxAge ? maxAge * 1000 : DEFAULT_JWKS_TTL_MS);
  JWKS_CACHE.set(jwksUrl, {
    keys: document.keys,
    expiresAt,
  });

  return document.keys;
}

function parseCacheControlMaxAge(value: string | null): number | null {
  if (!value) return null;
  const match = value.match(/max-age=(\d+)/i);
  if (!match || !match[1]) return null;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function validateClaims(
  claims: JwtClaims,
  expectedIssuer: string,
  expectedAudience: string,
  clockSkewSeconds: number,
): AuthContext {
  const issuer = asString(claims.iss, 'iss');
  if (issuer !== expectedIssuer) {
    throw new AuthError('Invalid JWT issuer', 401);
  }

  const audience = claims.aud;
  const audienceValid = Array.isArray(audience)
    ? audience.some((value) => value === expectedAudience)
    : audience === expectedAudience;
  if (!audienceValid) {
    throw new AuthError('Invalid JWT audience', 401);
  }

  const normalizedAudience: string | string[] = Array.isArray(audience)
    ? audience.filter((value): value is string => typeof value === 'string')
    : expectedAudience;

  const subject = asString(claims.sub, 'sub');
  const accountId = asString(claims.account_id, 'account_id');
  const tenantId = asString(claims.tenant_id, 'tenant_id');

  const exp = asNumericDate(claims.exp, 'exp');
  const iat = asNumericDate(claims.iat, 'iat');
  const now = Math.floor(Date.now() / 1000);

  if (exp <= now - clockSkewSeconds) {
    throw new AuthError('JWT is expired', 401);
  }

  if (iat > now + clockSkewSeconds) {
    throw new AuthError('JWT iat is in the future', 401);
  }

  const scopes = parseScopes(claims.scopes);
  if (scopes.length === 0) {
    throw new AuthError('JWT scopes are missing', 403);
  }

  return {
    accountId,
    tenantId,
    subject,
    scopes,
    issuer,
    audience: normalizedAudience,
    issuedAt: iat,
    expiresAt: exp,
    mode: 'jwt',
  };
}

function getJwkKid(key: JsonWebKey): string | null {
  const record = key as unknown as Record<string, unknown>;
  const kid = record.kid;
  return typeof kid === 'string' && kid.length > 0 ? kid : null;
}

function parseScopes(raw: unknown): string[] {
  if (typeof raw === 'string') {
    return raw
      .split(/\s+/)
      .map((scope) => scope.trim())
      .filter((scope) => scope.length > 0);
  }

  if (Array.isArray(raw)) {
    return raw
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter((scope) => scope.length > 0);
  }

  return [];
}

function asString(value: unknown, claimName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new AuthError(`JWT claim ${claimName} is missing`, 401);
  }
  return value.trim();
}

function asNumericDate(value: unknown, claimName: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new AuthError(`JWT claim ${claimName} is invalid`, 401);
  }
  return Math.floor(value);
}

function parseJson<T>(value: string, label: string): T {
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    throw new AuthError(`Invalid ${label}: ${(error as Error).message}`, 401);
  }
}

function base64UrlDecodeToString(value: string): string {
  return new TextDecoder().decode(base64UrlDecode(value));
}

function base64UrlDecode(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function parseBoolean(raw: string, fallback: boolean): boolean {
  const normalized = raw.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function readEnvString(env: HubAuthEnv, key: string): string | undefined {
  const value = env[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function getBearerToken(headerValue: string | null): string | null {
  if (!headerValue) return null;
  const match = headerValue.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1]?.trim();
  return token && token.length > 0 ? token : null;
}

function getHeaderValue(extra: unknown, name: string): string | null {
  if (typeof extra !== 'object' || extra === null) {
    return null;
  }

  const requestInfo = (extra as Record<string, unknown>).requestInfo;
  if (typeof requestInfo !== 'object' || requestInfo === null) {
    return null;
  }

  const headersUnknown = (requestInfo as Record<string, unknown>).headers;
  if (!headersUnknown) {
    return null;
  }

  if (headersUnknown instanceof Headers) {
    const value = headersUnknown.get(name);
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
  }

  if (Array.isArray(headersUnknown)) {
    for (const item of headersUnknown) {
      if (!Array.isArray(item) || item.length < 2) continue;
      if (String(item[0]).toLowerCase() !== name.toLowerCase()) continue;
      const value = item[1];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value;
      }
    }
    return null;
  }

  if (typeof headersUnknown !== 'object' || headersUnknown === null) {
    return null;
  }

  for (const [headerName, value] of Object.entries(headersUnknown)) {
    if (headerName.toLowerCase() !== name.toLowerCase()) continue;
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (typeof entry === 'string' && entry.trim().length > 0) {
          return entry;
        }
      }
    }
  }

  return null;
}
