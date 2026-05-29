import type { Env } from './types.js';

const DEFAULT_TEMPLATE_COLLECTION_ID = '641b464e78789f611a5d4496';
const WEBFLOW_IMAGE_HOST_RE =
  /(?:cdn\.prod\.website-files\.com|uploads-ssl\.webflow\.com|assets\.website-files\.com)/i;

export interface WebflowTemplateMetadata {
  templateSlug: string | null;
  thumbnailImageUrl: string | null;
  thumbnailImageSecondaryUrl: string | null;
}

export interface WebflowTemplateImageItem extends WebflowTemplateMetadata {
  templateSlug: string;
}

export interface WebflowTemplateImagesPage {
  items: WebflowTemplateImageItem[];
  offset: number;
  nextOffset: number | null;
  total: number;
  hasNextPage: boolean;
}

function firstString(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null;
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry === 'string' && entry.trim()) return entry.trim();
    }
  }
  return null;
}

export function resolveWebflowCmsItemId(value: unknown): string | null {
  return firstString(value);
}

function getWebflowToken(env: Env): string | null {
  return env.CMS_READ_ONLY?.trim() || env.WEBFLOW_API_TOKEN?.trim() || env.WEBFLOW_DATA_API_TOKEN?.trim() || null;
}

function normalizeFieldKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function isUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function extractImageUrls(value: unknown): string[] {
  if (!value) return [];
  if (typeof value === 'string') return isUrl(value) ? [value] : [];
  if (Array.isArray(value)) return value.flatMap((entry) => extractImageUrls(entry));
  if (typeof value !== 'object') return [];

  const record = value as Record<string, unknown>;
  return [
    ...extractImageUrls(record.url),
    ...extractImageUrls(record.src),
    ...extractImageUrls(record.file),
    ...extractImageUrls(record.image),
  ];
}

function preferWebflowImageUrl(urls: string[]): string | null {
  return urls.find((url) => WEBFLOW_IMAGE_HOST_RE.test(url)) ?? urls[0] ?? null;
}

function extractDirectFieldUrl(fieldData: Record<string, unknown>, keys: string[]): string | null {
  const normalizedEntries = new Map(Object.entries(fieldData).map(([key, value]) => [normalizeFieldKey(key), value]));

  for (const key of keys) {
    const value = fieldData[key] ?? normalizedEntries.get(normalizeFieldKey(key));
    const url = preferWebflowImageUrl(extractImageUrls(value));
    if (url) return url;
  }

  return null;
}

function extractFallbackFieldUrl(fieldData: Record<string, unknown>, kind: 'primary' | 'secondary'): string | null {
  const entries = Object.entries(fieldData);
  const candidates = entries.filter(([key, value]) => {
    const normalizedKey = normalizeFieldKey(key);
    const urls = extractImageUrls(value);
    if (urls.length === 0) return false;

    const isThumbnail = normalizedKey.includes('thumbnail') || normalizedKey.includes('thumb');
    const isImage = normalizedKey.includes('image');
    const isSecondary =
      normalizedKey.includes('secondary') || normalizedKey.includes('hover') || normalizedKey.includes('alternate');

    if (kind === 'secondary') return (isThumbnail || isImage) && isSecondary;
    return (isThumbnail || isImage) && !isSecondary;
  });

  return preferWebflowImageUrl(candidates.flatMap(([, value]) => extractImageUrls(value)));
}

function extractTemplateMetadata(fieldData: Record<string, unknown>): WebflowTemplateMetadata {
  return {
    templateSlug: firstString(fieldData.slug),
    thumbnailImageUrl:
      extractDirectFieldUrl(fieldData, ['thumbnail']) ?? extractFallbackFieldUrl(fieldData, 'primary'),
    thumbnailImageSecondaryUrl:
      extractDirectFieldUrl(fieldData, ['thumbnail-secondary', 'thumbnail secondary']) ??
      extractFallbackFieldUrl(fieldData, 'secondary'),
  };
}

export async function fetchWebflowTemplateMetadata(
  env: Env,
  cmsItemId: string | null,
): Promise<WebflowTemplateMetadata> {
  const empty = { templateSlug: null, thumbnailImageUrl: null, thumbnailImageSecondaryUrl: null };
  const token = getWebflowToken(env);
  if (!token || !cmsItemId) return empty;

  try {
    const collectionId = env.WEBFLOW_TEMPLATE_COLLECTION_ID?.trim() || DEFAULT_TEMPLATE_COLLECTION_ID;
    const response = await fetch(`https://api.webflow.com/v2/collections/${collectionId}/items/${cmsItemId}/live`, {
      headers: {
        Authorization: `Bearer ${token}`,
        accept: 'application/json',
      },
    });

    if (!response.ok) return empty;

    const payload = (await response.json()) as { fieldData?: Record<string, unknown> };
    return extractTemplateMetadata(payload.fieldData ?? {});
  } catch {
    return empty;
  }
}

export async function fetchWebflowTemplateImagesPage(
  env: Env,
  offset: number,
  limit = 100,
): Promise<WebflowTemplateImagesPage> {
  const token = getWebflowToken(env);
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const safeOffset = Math.max(offset, 0);
  const empty = {
    items: [],
    offset: safeOffset,
    nextOffset: null,
    total: 0,
    hasNextPage: false,
  };
  if (!token) return empty;

  try {
    const collectionId = env.WEBFLOW_TEMPLATE_COLLECTION_ID?.trim() || DEFAULT_TEMPLATE_COLLECTION_ID;
    const url = new URL(`https://api.webflow.com/v2/collections/${collectionId}/items/live`);
    url.searchParams.set('limit', String(safeLimit));
    url.searchParams.set('offset', String(safeOffset));
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        accept: 'application/json',
      },
    });

    if (!response.ok) return empty;

    const payload = (await response.json()) as {
      items?: Array<{ fieldData?: Record<string, unknown> }>;
      pagination?: { limit?: number; offset?: number; total?: number };
    };
    const items = (payload.items ?? [])
      .map((item): WebflowTemplateImageItem | null => {
        const fieldData = item.fieldData ?? {};
        const metadata = extractTemplateMetadata(fieldData);
        const templateSlug = metadata.templateSlug;
        if (!templateSlug) return null;

        return {
          templateSlug,
          thumbnailImageUrl: metadata.thumbnailImageUrl,
          thumbnailImageSecondaryUrl: metadata.thumbnailImageSecondaryUrl,
        };
      })
      .filter((item): item is WebflowTemplateImageItem => Boolean(item));

    const pageOffset = payload.pagination?.offset ?? safeOffset;
    const pageLimit = payload.pagination?.limit ?? safeLimit;
    const total = payload.pagination?.total ?? items.length;
    const nextOffset = pageOffset + pageLimit < total ? pageOffset + pageLimit : null;

    return {
      items,
      offset: pageOffset,
      nextOffset,
      total,
      hasNextPage: nextOffset !== null,
    };
  } catch {
    return empty;
  }
}
