const TRUSTED_DOMAIN_SUFFIXES = ['webflow.com', 'webflow.io', 'createsomething.io'] as const;
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const API_ORIGIN_PROTECTION_EXEMPT_PREFIXES = ['/api/cron/'] as const;

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

export function isSecureHostedUrl(
  rawUrl: string,
  domain: string,
  options: { requireSubdomain?: boolean } = {}
): boolean {
  try {
    const parsed = new URL(rawUrl);
    const hostMatches = options.requireSubdomain
      ? parsed.hostname.endsWith(`.${domain}`)
      : isDomainOrSubdomain(parsed.hostname, domain);
    return parsed.protocol === 'https:' && hostMatches;
  } catch {
    return false;
  }
}

function isLocalDevHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]';
}

function parseOrigin(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function getProvidedSecret(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim();
    return token || null;
  }

  const headerSecret = request.headers.get('x-cron-secret')?.trim();
  if (headerSecret) return headerSecret;

  const url = new URL(request.url);
  const querySecret = url.searchParams.get('cron_secret')?.trim();
  if (querySecret) return querySecret;

  const queryToken = url.searchParams.get('token')?.trim();
  return queryToken || null;
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

export function shouldEnforceTrustedApiOrigin(pathname: string, method: string): boolean {
  if (!pathname.startsWith('/api/')) {
    return false;
  }

  if (!MUTATING_METHODS.has(method.toUpperCase())) {
    return false;
  }

  return !API_ORIGIN_PROTECTION_EXEMPT_PREFIXES.some((prefix) => pathname.startsWith(prefix));
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
    const provided = getProvidedSecret(request);
    return provided === cronSecret;
  }

  return (environment ?? 'production') !== 'production';
}
