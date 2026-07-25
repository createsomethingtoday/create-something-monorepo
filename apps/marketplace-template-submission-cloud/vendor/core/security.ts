const TRUSTED_DOMAIN_SUFFIXES = ['webflow.com', 'webflow.io', 'createsomething.io'] as const;

function parseCsv(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isDomainOrSubdomain(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

function isLocalDevHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

function parseOrigin(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/**
 * Reads the cron secret from headers only.
 *
 * Query-string secrets end up in request logs, analytics, and referrers, so the
 * `?cron_secret=`/`?token=` forms are deliberately not accepted. Callers use
 * `Authorization: Bearer <secret>` or `x-cron-secret: <secret>`.
 */
function getProvidedSecret(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim();
    return token || null;
  }

  const headerSecret = request.headers.get('x-cron-secret')?.trim();
  return headerSecret || null;
}

/**
 * Constant-time comparison so secret checks do not leak length or prefix
 * information through response timing.
 */
function secretsMatch(provided: string | null, expected: string): boolean {
  if (!provided) return false;

  const providedBytes = new TextEncoder().encode(provided);
  const expectedBytes = new TextEncoder().encode(expected);
  if (providedBytes.length !== expectedBytes.length) return false;

  let diff = 0;
  for (let index = 0; index < expectedBytes.length; index += 1) {
    diff |= providedBytes[index] ^ expectedBytes[index];
  }

  return diff === 0;
}

export function hasAdminAccess(
  email: string | undefined,
  options: {
    adminEmailsCsv?: string;
    environment?: string;
  } = {}
): boolean {
  if (!email) return false;

  const adminEmails = new Set(parseCsv(options.adminEmailsCsv).map(normalizeEmail));
  if (adminEmails.size === 0) {
    return (options.environment ?? 'production') !== 'production';
  }

  return adminEmails.has(normalizeEmail(email));
}

export function getSourceOrigin(request: Request): string | null {
  const originHeader = parseOrigin(request.headers.get('origin'));
  if (originHeader) return originHeader;
  return parseOrigin(request.headers.get('referer'));
}

export function isTrustedRequestOrigin(
  request: Request,
  requestOrigin: string,
  extraTrustedOriginsCsv?: string,
  environment?: string
): boolean {
  const sourceOrigin = getSourceOrigin(request);
  if (!sourceOrigin) return false;

  const extraOrigins = new Set(
    parseCsv(extraTrustedOriginsCsv)
      .map((value) => parseOrigin(value))
      .filter(Boolean) as string[]
  );

  if (sourceOrigin === requestOrigin || extraOrigins.has(sourceOrigin)) {
    return true;
  }

  try {
    const parsed = new URL(sourceOrigin);

    if (isLocalDevHost(parsed.hostname)) {
      return (environment ?? 'production') !== 'production';
    }

    if (parsed.protocol !== 'https:') {
      return false;
    }

    return TRUSTED_DOMAIN_SUFFIXES.some((domain) => isDomainOrSubdomain(parsed.hostname, domain));
  } catch {
    return false;
  }
}

export function isAuthorizedCronRequest(
  request: Request,
  cronSecret: string | undefined,
  environment: string | undefined
): boolean {
  if (cronSecret) {
    return secretsMatch(getProvidedSecret(request), cronSecret);
  }

  return (environment ?? 'production') !== 'production';
}
