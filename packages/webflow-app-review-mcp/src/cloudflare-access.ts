import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTVerifyGetKey,
} from 'jose';

type ReviewerProfile = {
  accountId: string;
  email: string;
  name: string | null;
  authEmailAliases: string[];
};

export type ReviewerDirectory = Map<string, ReviewerProfile>;

export type CloudflareAccessRequestResult =
  | {
      ok: true;
      subject: string;
      accountId: string;
      email: string;
      name: string | null;
    }
  | {
      ok: false;
      status: 401 | 403 | 500;
      code: 'unauthorized' | 'forbidden' | 'misconfigured';
      message: string;
    };

const remoteJwksByTeamDomain = new Map<string, JWTVerifyGetKey>();

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function parseAllowedEmails(raw?: string | null): Set<string> {
  return new Set(
    (raw ?? '')
      .split(',')
      .map(normalizeEmail)
      .filter(Boolean),
  );
}

export function parseReviewerDirectory(raw?: string | null, rawAliases?: string | null): ReviewerDirectory {
  const directory: ReviewerDirectory = new Map();
  if (raw?.trim()) {
    const parsed = JSON.parse(raw) as unknown;
    if (isObject(parsed)) {
      for (const [accountId, value] of Object.entries(parsed)) {
        if (!isObject(value) || typeof value.email !== 'string') continue;
        const email = normalizeEmail(value.email);
        if (!accountId.trim() || !email) continue;
        directory.set(accountId, {
          accountId,
          email,
          name: typeof value.name === 'string' && value.name.trim() ? value.name.trim() : null,
          authEmailAliases: Array.isArray(value.authEmailAliases)
            ? value.authEmailAliases
                .filter((entry): entry is string => typeof entry === 'string')
                .map(normalizeEmail)
                .filter(Boolean)
            : [],
        });
      }
    }
  }

  if (!rawAliases?.trim()) return directory;
  const aliases = JSON.parse(rawAliases) as unknown;
  if (!isObject(aliases)) return directory;
  for (const [accountId, values] of Object.entries(aliases)) {
    const profile = directory.get(accountId);
    if (!profile || !Array.isArray(values)) continue;
    profile.authEmailAliases = [
      ...new Set([
        ...profile.authEmailAliases,
        ...values
          .filter((entry): entry is string => typeof entry === 'string')
          .map(normalizeEmail)
          .filter(Boolean),
      ]),
    ];
  }
  return directory;
}

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

function findReviewer(directory: ReviewerDirectory, email: string): ReviewerProfile | null {
  let match: ReviewerProfile | null = null;
  for (const profile of directory.values()) {
    if (profile.email !== email && !profile.authEmailAliases.includes(email)) continue;
    if (match && match.accountId !== profile.accountId) return null;
    match = profile;
  }
  return match;
}

export async function resolveCloudflareAccessRequest(input: {
  request: Request;
  teamDomain: string;
  audience: string;
  allowedDomain: string;
  allowedEmails: Set<string>;
  directory: ReviewerDirectory;
  jwks?: JWTVerifyGetKey;
}): Promise<CloudflareAccessRequestResult> {
  const teamDomain = normalizeTeamDomain(input.teamDomain);
  const audience = input.audience.trim();
  if (!teamDomain || !audience) {
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

  let payload: Awaited<ReturnType<typeof jwtVerify>>['payload'];
  try {
    ({ payload } = await jwtVerify(assertion, input.jwks ?? remoteJwks(teamDomain), {
      algorithms: ['RS256'],
      issuer: teamDomain,
      audience,
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
  const email = typeof payload.email === 'string' ? normalizeEmail(payload.email) : '';
  if (!subject || !email || payload.type !== 'app') {
    return {
      ok: false,
      status: 401,
      code: 'unauthorized',
      message: 'Cloudflare Access application assertion is missing required identity claims.',
    };
  }

  const allowedDomain = input.allowedDomain.trim().toLowerCase();
  const allowlisted = input.allowedEmails.size > 0
    ? input.allowedEmails.has(email)
    : Boolean(allowedDomain) && email.endsWith(`@${allowedDomain}`);
  if (!allowlisted) {
    return {
      ok: false,
      status: 403,
      code: 'forbidden',
      message: input.allowedEmails.size > 0
        ? 'You are not on the App Review access list. Ask the review team lead to add you.'
        : `App Review MCP is limited to @${allowedDomain} accounts.`,
    };
  }

  const reviewer = findReviewer(input.directory, email);
  return {
    ok: true,
    subject,
    accountId: reviewer?.accountId ?? `oauth:${email}`,
    email,
    name: reviewer?.name ?? null,
  };
}
