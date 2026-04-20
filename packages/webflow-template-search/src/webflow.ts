import type { AirtableAssetFields } from './types.js';

const WEBFLOW_ORIGIN = 'https://webflow.com';

export const WEBFLOW_TEMPLATE_IMAGE_HOSTS = [
  'assets-global.website-files.com',
  'assets.website-files.com',
  'cdn.prod.website-files.com',
  'd1otoma47x30pg.cloudfront.net',
  'd3e54v103j8qbb.cloudfront.net',
  'daks2k3a4ib2z.cloudfront.net',
  'dhygzobemt712.cloudfront.net',
  'webflow-assets.s3.us-east-1.amazonaws.com',
  'webflow.itsoffbrand.io',
] as const;

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function resolveAirtableUrlValue(value: unknown): string | null {
  const directValue = normalizeString(value);
  if (directValue) return directValue;
  if (typeof value !== 'object' || !value || !('url' in value)) return null;
  return normalizeString((value as { url?: unknown }).url);
}

function toAbsoluteUrl(value: string | null): string | null {
  if (!value) return null;

  try {
    if (/^https?:\/\//i.test(value)) return new URL(value).toString();
    if (value.startsWith('/')) return new URL(value, WEBFLOW_ORIGIN).toString();
  } catch {
    return null;
  }

  return null;
}

export function extractTemplateSlugFromUrl(value: string | null): string | null {
  const absoluteUrl = toAbsoluteUrl(value);
  if (!absoluteUrl) return null;

  try {
    const pathname = new URL(absoluteUrl).pathname;
    const match = pathname.match(/^\/templates\/html\/([^/?#]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export function resolveTemplateListingUrl(fields: AirtableAssetFields): string | null {
  const candidates = [
    toAbsoluteUrl(resolveAirtableUrlValue(fields['🕸️View Asset Listing'])),
    toAbsoluteUrl(normalizeString(fields['🏸Admin Detail Page Path (🏗️ only)'])),
    toAbsoluteUrl(normalizeString(fields['🔗Listing URL'])),
  ];

  for (const candidate of candidates) {
    if (candidate) return candidate;
  }

  const fallbackSlug = normalizeString(fields['🥞CMS Slug (formula)']);
  return fallbackSlug ? `${WEBFLOW_ORIGIN}/templates/html/${fallbackSlug}` : null;
}

export function resolveTemplateSlug(fields: AirtableAssetFields, listingUrl: string | null): string | null {
  return extractTemplateSlugFromUrl(listingUrl) ?? normalizeString(fields['🥞CMS Slug (formula)']);
}

export function isSafeTemplateImageUrl(value: string | null | undefined): value is string {
  if (!value) return false;

  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    return (
      url.protocol === 'data:' ||
      hostname === 'webflow.com' ||
      hostname.endsWith('.webflow.com') ||
      WEBFLOW_TEMPLATE_IMAGE_HOSTS.includes(hostname as (typeof WEBFLOW_TEMPLATE_IMAGE_HOSTS)[number])
    );
  } catch {
    return false;
  }
}
