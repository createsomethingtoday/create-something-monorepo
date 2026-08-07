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

const AIRTABLE_ATTACHMENT_HOST = 'airtableusercontent.com';

/**
 * Airtable re-hosts attachment contents on its own CDN, so an image already
 * stored on a record reads back as an airtableusercontent.com URL. The edit
 * form re-submits every image field including the unchanged ones, and those
 * signed URLs carry an expiry and rotate, so they cannot be matched against the
 * stored value byte-for-byte. Recognising the host is what lets an untouched
 * image survive a save without reopening the field to arbitrary origins.
 */
export function isAirtableAttachmentUrl(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'https:') return false;

  return (
    parsed.hostname === AIRTABLE_ATTACHMENT_HOST ||
    parsed.hostname.endsWith(`.${AIRTABLE_ATTACHMENT_HOST}`)
  );
}

/**
 * Asset images land in Airtable attachment fields, which means Airtable fetches
 * whatever URL we hand it. Only two sources are legitimate: an image this
 * dashboard just uploaded, or an image Airtable is already hosting for this
 * record. Anything else would publish unvalidated remote content on a public
 * marketplace listing and bypass the size/dimension checks in /api/upload.
 */
export function isAllowedAssetImageUrl(
  value: string,
  requestOrigin: string,
  extraTrustedOriginsCsv?: string
): boolean {
  return (
    isAllowedUploadUrl(value, requestOrigin, extraTrustedOriginsCsv) ||
    isAirtableAttachmentUrl(value)
  );
}
