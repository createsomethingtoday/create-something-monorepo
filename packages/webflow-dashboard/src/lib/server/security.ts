const TRUSTED_DOMAIN_SUFFIXES = ['webflow.com', 'webflow.io', 'createsomething.io'] as const;

function parseCsv(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
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
 * Constant-time string comparison so secret checks do not leak length or
 * prefix information through response timing.
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

/**
 * Returns true when the user email is in the configured admin allowlist.
 * In non-production environments, all authenticated users are allowed when
 * the allowlist is not configured.
 */
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

/**
 * Extract source origin from Origin header or Referer header.
 */
export function getSourceOrigin(request: Request): string | null {
  const originHeader = parseOrigin(request.headers.get('origin'));
  if (originHeader) return originHeader;
  return parseOrigin(request.headers.get('referer'));
}

/**
 * Validates that a public mutation was submitted by the dashboard origin itself.
 * This is stricter than iframe mutation CSRF checks because these endpoints do
 * not have an authenticated session boundary yet.
 */
export function isSameOriginRequest(request: Request, requestOrigin: string): boolean {
  return getSourceOrigin(request) === requestOrigin;
}

/**
 * Validates that a request originated from an allowed origin.
 */
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

/**
 * Cron requests are authorized only when a configured secret matches.
 * If no secret is configured, only non-production environments are allowed.
 */
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
