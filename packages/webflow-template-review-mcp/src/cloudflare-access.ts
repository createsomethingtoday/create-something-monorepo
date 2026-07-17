import {
  createRemoteJWKSet,
  decodeJwt,
  jwtVerify,
  type JWTVerifyGetKey,
} from 'jose';

import {
  type OAuthAccessResult,
  SCOPE_READ,
  resolveOAuthAccess,
} from './oauth-access.js';
import type { ReviewerDirectory } from './reviewer-directory.js';

export type CloudflareAccessRequestResult =
  | {
      ok: true;
      subject: string;
      accountId: string;
      email: string;
      name: null;
      scopes: string[];
    }
  | {
      ok: false;
      status: 401 | 403 | 500;
      code: 'unauthorized' | 'forbidden' | 'misconfigured';
      message: string;
    };

const remoteJwksByTeamDomain = new Map<string, JWTVerifyGetKey>();

export type CloudflareAccessApplication = {
  teamDomain: string;
  audience: string;
};

export type CloudflareAccessAssertionMetadata = {
  issuer: string | null;
  audiences: string[];
};

export function isCloudflareAccessMcpPath(pathname: string): boolean {
  return (
    pathname === '/access/mcp'
    || pathname.startsWith('/access/mcp/')
    || pathname === '/access/sse'
    || pathname.startsWith('/access/sse/')
  );
}

export function cloudflareAccessServePath(pathname: string): '/access/mcp' | '/access/sse' {
  return pathname === '/access/sse' || pathname.startsWith('/access/sse/')
    ? '/access/sse'
    : '/access/mcp';
}

function normalizeTeamDomain(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    if (
      url.protocol !== 'https:'
      || !url.hostname.endsWith('.cloudflareaccess.com')
      || url.username
      || url.password
      || url.port
      || url.pathname !== '/'
      || url.search
      || url.hash
    ) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function remoteJwks(teamDomain: string): JWTVerifyGetKey {
  const cached = remoteJwksByTeamDomain.get(teamDomain);
  if (cached) return cached;

  const jwks = createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`));
  remoteJwksByTeamDomain.set(teamDomain, jwks);
  return jwks;
}

function normalizeTrustedApplications(input: {
  teamDomain: string;
  audience: string;
  trustedApplications?: CloudflareAccessApplication[];
}): CloudflareAccessApplication[] {
  return [
    { teamDomain: input.teamDomain, audience: input.audience },
    ...(input.trustedApplications ?? []),
  ].flatMap((candidate) => {
    const teamDomain = normalizeTeamDomain(candidate.teamDomain);
    const audience = candidate.audience.trim();
    return teamDomain && audience ? [{ teamDomain, audience }] : [];
  });
}

export function readCloudflareAccessAssertionMetadata(
  assertion: string,
): CloudflareAccessAssertionMetadata | null {
  try {
    const decoded = decodeJwt(assertion);
    return {
      issuer: typeof decoded.iss === 'string' ? decoded.iss : null,
      audiences: typeof decoded.aud === 'string'
        ? [decoded.aud]
        : Array.isArray(decoded.aud)
          ? decoded.aud.filter((value): value is string => typeof value === 'string')
          : [],
    };
  } catch {
    return null;
  }
}

function resolveTrustedApplication(assertion: string, configured: CloudflareAccessApplication[]): CloudflareAccessApplication | null {
  const metadata = readCloudflareAccessAssertionMetadata(assertion);
  if (!metadata?.issuer) return null;
  return configured.find((candidate) => candidate.teamDomain === metadata.issuer) ?? null;
}

function deniedAccessResult(
  access: Exclude<OAuthAccessResult, { allowed: true }>,
  allowedDomain: string,
): CloudflareAccessRequestResult {
  const messages = {
    missing_email: 'Your Cloudflare Access identity has no verified email address.',
    domain_not_allowed: `Template Review MCP is limited to @${allowedDomain} accounts.`,
    email_not_allowlisted: 'You are not on the Template Review access list. Ask the review team lead to add you.',
  } as const;
  return { ok: false, status: 403, code: 'forbidden', message: messages[access.reason] };
}

/**
 * Verify the Access application assertion added by Cloudflare's edge, then
 * apply Template Review's existing reviewer directory and email policy.
 */
export async function resolveCloudflareAccessRequest(input: {
  request: Request;
  teamDomain: string;
  audience: string;
  trustedApplications?: CloudflareAccessApplication[];
  allowedDomain: string;
  allowedEmails: Set<string>;
  directory: ReviewerDirectory;
  jwks?: JWTVerifyGetKey;
}): Promise<CloudflareAccessRequestResult> {
  const configuredApplications = normalizeTrustedApplications({
    teamDomain: input.teamDomain,
    audience: input.audience,
    trustedApplications: input.trustedApplications,
  });
  if (!configuredApplications.length) {
    return {
      ok: false,
      status: 500,
      code: 'misconfigured',
      message: 'Cloudflare Access authentication is not configured.',
    };
  }

  const assertion = input.request.headers.get('Cf-Access-Jwt-Assertion')?.trim();
  if (!assertion) {
    return {
      ok: false,
      status: 401,
      code: 'unauthorized',
      message: 'Missing Cloudflare Access application assertion.',
    };
  }

  const application = resolveTrustedApplication(assertion, configuredApplications);
  if (!application) {
    return {
      ok: false,
      status: 401,
      code: 'unauthorized',
      message: 'Invalid Cloudflare Access application assertion.',
    };
  }

  let payload: Awaited<ReturnType<typeof jwtVerify>>['payload'];
  try {
    ({ payload } = await jwtVerify(assertion, input.jwks ?? remoteJwks(application.teamDomain), {
      algorithms: ['RS256'],
      issuer: application.teamDomain,
      audience: application.audience,
    }));
  } catch {
    return {
      ok: false,
      status: 401,
      code: 'unauthorized',
      message: 'Invalid Cloudflare Access application assertion.',
    };
  }

  const subject = typeof payload.sub === 'string' ? payload.sub.trim() : '';
  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  if (!subject || !email || payload.type !== 'app') {
    return {
      ok: false,
      status: 401,
      code: 'unauthorized',
      message: 'Cloudflare Access application assertion is missing required identity claims.',
    };
  }

  const access = resolveOAuthAccess({
    email,
    allowedDomain: input.allowedDomain,
    allowedEmails: input.allowedEmails,
    directory: input.directory,
  });
  if (access.allowed === false) return deniedAccessResult(access, input.allowedDomain);
  if (!access.scopes.includes(SCOPE_READ)) {
    return {
      ok: false,
      status: 403,
      code: 'forbidden',
      message: `Cloudflare Access identity is missing the required ${SCOPE_READ} scope.`,
    };
  }

  return {
    ok: true,
    subject,
    accountId: access.reviewerProfile?.accountId ?? `oauth:${access.email}`,
    email: access.email,
    name: null,
    scopes: access.scopes,
  };
}
