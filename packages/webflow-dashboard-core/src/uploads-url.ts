/**
 * Validates that a URL points at an image this dashboard uploaded.
 *
 * Avatars and asset images are written into Airtable attachment fields, and
 * Airtable fetches whatever URL it is given. Accepting an arbitrary URL would
 * let an authenticated creator publish unvalidated remote content on a public
 * marketplace profile and bypass the size/dimension checks enforced at upload
 * time, so writes are restricted to our own /api/uploads/ keys.
 */
const UPLOADS_PATH_PREFIX = '/api/uploads/';

function parseOrigins(csv: string | undefined): string[] {
  if (!csv) return [];

  return csv
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => {
      try {
        return new URL(value).origin;
      } catch {
        return '';
      }
    })
    .filter(Boolean);
}

export function isAllowedUploadUrl(
  value: string,
  requestOrigin: string,
  extraTrustedOriginsCsv?: string
): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value, requestOrigin);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
  if (!parsed.pathname.startsWith(UPLOADS_PATH_PREFIX)) return false;
  if (parsed.pathname.includes('..')) return false;

  const allowedOrigins = new Set([requestOrigin, ...parseOrigins(extraTrustedOriginsCsv)]);
  return allowedOrigins.has(parsed.origin);
}
