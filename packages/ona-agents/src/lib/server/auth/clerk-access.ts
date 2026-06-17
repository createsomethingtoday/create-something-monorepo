import type { Cookies } from '@sveltejs/kit';
import {
  isPreviewAccessEnabled,
  parseBooleanFlag,
  readRuntimeEnv,
  readRuntimeList
} from '../runtime';

export type ClerkAccessStatus = 'allowed' | 'anonymous' | 'blocked' | 'invalid' | 'unconfigured';
export type ClerkAccessSource = 'clerk' | 'preview' | 'none';

export interface ClerkAccessState {
  status: ClerkAccessStatus;
  source: ClerkAccessSource;
  signInUrl: string;
  subject: string | null;
  email: string | null;
  organizationId: string | null;
  organizationRole: string | null;
  reason: string;
  detail: string;
}

export interface ClerkRequestContext {
  cookies?: Pick<Cookies, 'get'>;
  fetch?: typeof globalThis.fetch;
  platform?: App.Platform;
  request?: Request;
  url?: URL;
}

interface JwtParts {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signingInput: string;
  signature: Uint8Array;
}

interface ClerkClaims {
  subject: string;
  email: string | null;
  organizationId: string | null;
  organizationRole: string | null;
  expiresAt: number | null;
  notBefore: number | null;
  issuer: string | null;
  authorizedParty: string | null;
}

interface JsonWebKeySet {
  keys?: JsonWebKey[];
}

const STANDARD_CLERK_SESSION_COOKIE = '__session';
const DEFAULT_SIGN_IN_URL = '/sign-in';

let jwksCache = new Map<string, { expiresAt: number; keys: JsonWebKey[] }>();

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function base64UrlToJson(value: string): Record<string, unknown> {
  return JSON.parse(new TextDecoder().decode(base64UrlToBytes(value))) as Record<string, unknown>;
}

function parseJwt(token: string): JwtParts {
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some((part) => !part)) {
    throw new Error('Malformed Clerk session token.');
  }

  return {
    header: base64UrlToJson(parts[0]),
    payload: base64UrlToJson(parts[1]),
    signingInput: `${parts[0]}.${parts[1]}`,
    signature: base64UrlToBytes(parts[2])
  };
}

function getStringClaim(payload: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function getNumberClaim(payload: Record<string, unknown>, key: string): number | null {
  const value = payload[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readBearerToken(request?: Request): string | null {
  const header = request?.headers.get('authorization') ?? '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

function readSessionCookie(context: ClerkRequestContext): string | null {
  const configuredName = readRuntimeEnv(context.platform, 'CLERK_SESSION_COOKIE_NAME')?.trim();
  const cookieNames = [configuredName, STANDARD_CLERK_SESSION_COOKIE].filter(
    (name): name is string => Boolean(name)
  );

  for (const cookieName of cookieNames) {
    const value = context.cookies?.get(cookieName)?.trim();
    if (value) {
      return value;
    }
  }

  return null;
}

function buildSignInUrl(context: ClerkRequestContext): string {
  const rawUrl = readRuntimeEnv(context.platform, 'CLERK_SIGN_IN_URL')?.trim() || DEFAULT_SIGN_IN_URL;
  if (!context.url) {
    return rawUrl;
  }

  try {
    const target = new URL(rawUrl, context.url.origin);
    target.searchParams.set('redirect_url', context.url.toString());
    return target.toString();
  } catch {
    return rawUrl;
  }
}

function getJwksUrl(platform?: App.Platform): string | null {
  const explicit = readRuntimeEnv(platform, 'CLERK_JWKS_URL')?.trim();
  if (explicit) {
    return explicit;
  }

  const issuer = readRuntimeEnv(platform, 'CLERK_ISSUER')?.trim()?.replace(/\/+$/, '');
  return issuer ? `${issuer}/.well-known/jwks.json` : null;
}

async function getJwks(url: string, runtimeFetch: typeof globalThis.fetch): Promise<JsonWebKey[]> {
  const cached = jwksCache.get(url);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.keys;
  }

  const response = await runtimeFetch(url);
  if (!response.ok) {
    throw new Error(`Clerk JWKS fetch failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as JsonWebKeySet;
  const keys = Array.isArray(payload.keys) ? payload.keys : [];
  jwksCache.set(url, {
    expiresAt: Date.now() + 5 * 60 * 1000,
    keys
  });
  return keys;
}

async function verifyRs256Signature(input: {
  jwt: JwtParts;
  jwk: JsonWebKey;
}): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'jwk',
    input.jwk,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256'
    },
    false,
    ['verify']
  );

  return crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    toArrayBuffer(input.jwt.signature),
    new TextEncoder().encode(input.jwt.signingInput)
  );
}

function extractClaims(payload: Record<string, unknown>): ClerkClaims {
  return {
    subject: getStringClaim(payload, ['sub']) ?? 'unknown',
    email: getStringClaim(payload, [
      'email',
      'email_address',
      'primary_email',
      'primary_email_address'
    ]),
    organizationId: getStringClaim(payload, ['org_id', 'organization_id']),
    organizationRole: getStringClaim(payload, ['org_role', 'organization_role']),
    expiresAt: getNumberClaim(payload, 'exp'),
    notBefore: getNumberClaim(payload, 'nbf'),
    issuer: getStringClaim(payload, ['iss']),
    authorizedParty: getStringClaim(payload, ['azp'])
  };
}

function normalizeOrigin(value: string): URL | null {
  try {
    return new URL(value).origin === 'null' ? null : new URL(value);
  } catch {
    return null;
  }
}

function hostnameMatchesAuthorizedParty(hostname: string, authorizedHostname: string) {
  if (hostname === authorizedHostname) {
    return true;
  }

  if (authorizedHostname.startsWith('*.')) {
    const suffix = authorizedHostname.slice(2);
    return hostname === suffix || hostname.endsWith(`.${suffix}`);
  }

  if (authorizedHostname === 'ona-agent-chat.pages.dev') {
    return hostname.endsWith('.ona-agent-chat.pages.dev');
  }

  return false;
}

function isAllowedAuthorizedParty(value: string | null, configuredParties: string[]) {
  if (configuredParties.length === 0) {
    return true;
  }

  if (!value) {
    return false;
  }

  const authorizedParty = normalizeOrigin(value);
  if (!authorizedParty) {
    return false;
  }

  return configuredParties.some((configuredParty) => {
    const allowed = normalizeOrigin(configuredParty);
    if (!allowed || allowed.protocol !== authorizedParty.protocol) {
      return false;
    }

    return hostnameMatchesAuthorizedParty(authorizedParty.hostname, allowed.hostname);
  });
}

function validateClaims(claims: ClerkClaims, platform?: App.Platform) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (claims.expiresAt !== null && claims.expiresAt <= nowSeconds) {
    throw new Error('Clerk session token has expired.');
  }

  if (claims.notBefore !== null && claims.notBefore > nowSeconds + 60) {
    throw new Error('Clerk session token is not active yet.');
  }

  const expectedIssuer = readRuntimeEnv(platform, 'CLERK_ISSUER')?.trim()?.replace(/\/+$/, '');
  if (expectedIssuer && claims.issuer?.replace(/\/+$/, '') !== expectedIssuer) {
    throw new Error('Clerk session token issuer does not match CLERK_ISSUER.');
  }

  const authorizedParties = readRuntimeList(platform, 'CLERK_AUTHORIZED_PARTIES');
  if (!isAllowedAuthorizedParty(claims.authorizedParty, authorizedParties)) {
    throw new Error('Clerk session token authorized party is not allowed.');
  }
}

function matchesAllowRules(claims: ClerkClaims, platform?: App.Platform) {
  const allowedEmails = readRuntimeList(platform, 'CLERK_ALLOWED_EMAILS').map((email) =>
    email.toLowerCase()
  );
  const allowedDomains = readRuntimeList(platform, 'CLERK_ALLOWED_EMAIL_DOMAINS').map((domain) =>
    domain.toLowerCase().replace(/^@/, '')
  );
  const allowedOrgIds = readRuntimeList(platform, 'CLERK_ALLOWED_ORGANIZATION_IDS');
  const allowedOrgRoles = readRuntimeList(platform, 'CLERK_ALLOWED_ORGANIZATION_ROLES');
  const allowAnyAuthenticated = parseBooleanFlag(
    readRuntimeEnv(platform, 'CLERK_ALLOW_ANY_AUTHENTICATED')
  );
  const hasRules =
    allowedEmails.length > 0 ||
    allowedDomains.length > 0 ||
    allowedOrgIds.length > 0 ||
    allowedOrgRoles.length > 0 ||
    allowAnyAuthenticated === true;

  if (allowAnyAuthenticated === true) {
    return true;
  }

  if (claims.email && allowedEmails.includes(claims.email.toLowerCase())) {
    return true;
  }

  const emailDomain = claims.email?.split('@')[1]?.toLowerCase();
  if (emailDomain && allowedDomains.includes(emailDomain)) {
    return true;
  }

  if (claims.organizationId && allowedOrgIds.includes(claims.organizationId)) {
    if (allowedOrgRoles.length === 0) {
      return true;
    }
    return claims.organizationRole ? allowedOrgRoles.includes(claims.organizationRole) : false;
  }

  if (claims.organizationRole && allowedOrgRoles.includes(claims.organizationRole)) {
    return true;
  }

  return hasRules ? false : false;
}

function makeState(input: Partial<ClerkAccessState> & Pick<ClerkAccessState, 'status' | 'reason'>) {
  return {
    source: 'none',
    signInUrl: DEFAULT_SIGN_IN_URL,
    subject: null,
    email: null,
    organizationId: null,
    organizationRole: null,
    detail: input.reason,
    ...input
  } satisfies ClerkAccessState;
}

export async function verifyClerkSessionToken(input: {
  token: string;
  fetch?: typeof globalThis.fetch;
  platform?: App.Platform;
}): Promise<ClerkClaims> {
  const jwksUrl = getJwksUrl(input.platform);
  if (!jwksUrl) {
    throw new Error('Missing CLERK_JWKS_URL or CLERK_ISSUER.');
  }

  const jwt = parseJwt(input.token);
  if (jwt.header.alg !== 'RS256') {
    throw new Error('Only RS256 Clerk session tokens are supported.');
  }

  const keyId = typeof jwt.header.kid === 'string' ? jwt.header.kid : null;
  const keys = await getJwks(jwksUrl, input.fetch ?? globalThis.fetch);
  const jwk = keys.find(
    (candidate) => !keyId || (candidate as JsonWebKey & { kid?: string }).kid === keyId
  );
  if (!jwk) {
    throw new Error('No matching Clerk JWKS key found for session token.');
  }

  const verified = await verifyRs256Signature({ jwt, jwk });
  if (!verified) {
    throw new Error('Clerk session token signature is invalid.');
  }

  const claims = extractClaims(jwt.payload);
  validateClaims(claims, input.platform);
  return claims;
}

export async function getClerkAccessState(
  context: ClerkRequestContext
): Promise<ClerkAccessState> {
  const signInUrl = buildSignInUrl(context);

  if (isPreviewAccessEnabled(context.platform)) {
    return makeState({
      status: 'allowed',
      source: 'preview',
      signInUrl,
      subject: 'local-preview',
      reason: 'Local preview access is enabled.',
      detail: 'ALLOW_CLERK_ACCESS_PREVIEW is active outside production.'
    });
  }

  const token = readBearerToken(context.request) ?? readSessionCookie(context);
  if (!token) {
    return makeState({
      status: 'anonymous',
      source: 'none',
      signInUrl,
      reason: 'No Clerk session token found.',
      detail: 'Sign in with Clerk before accessing operator agents.'
    });
  }

  try {
    const claims = await verifyClerkSessionToken({
      token,
      fetch: context.fetch,
      platform: context.platform
    });
    const allowed = matchesAllowRules(claims, context.platform);

    return makeState({
      status: allowed ? 'allowed' : 'blocked',
      source: 'clerk',
      signInUrl,
      subject: claims.subject,
      email: claims.email,
      organizationId: claims.organizationId,
      organizationRole: claims.organizationRole,
      reason: allowed ? 'Clerk session matches operator access rules.' : 'Clerk session is valid but not allowlisted.',
      detail: allowed
        ? 'Operator access is active for this Clerk session.'
        : 'Ask an admin to add the Clerk org, role, email, or domain to runtime allow rules.'
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return makeState({
      status: message.includes('Missing CLERK_JWKS_URL') ? 'unconfigured' : 'invalid',
      source: 'none',
      signInUrl,
      reason: message,
      detail: 'Clerk access could not be verified for this request.'
    });
  }
}
