import type { Env, TemplateImageUrls } from './types.js';

const DEFAULT_WEBFLOW_API_BASE = 'https://api.webflow.com/v2';
const DEFAULT_TEMPLATES_COLLECTION_ID = '641b464e78789f611a5d4496';
const PAGE_SIZE = 100;
const MAX_RETRIES = 3;
const TRUTHY_FLAG_VALUES = new Set(['1', 'true', 'yes']);

export function isWebflowImageSyncRequired(env: Env): boolean {
  return TRUTHY_FLAG_VALUES.has((env.WEBFLOW_IMAGE_SYNC_REQUIRED ?? '').trim().toLowerCase());
}

interface WebflowCmsItem {
  id?: string;
  fieldData?: Record<string, unknown>;
  field_data?: Record<string, unknown>;
  fields?: Record<string, unknown>;
}

interface WebflowCmsListResponse {
  items?: WebflowCmsItem[];
  pagination?: {
    limit?: number;
    offset?: number;
    total?: number;
  };
}

export interface WebflowImageSyncResult {
  images: Map<string, TemplateImageUrls>;
  fetchedItems: number;
  configured: boolean;
  offset: number;
  nextOffset: number;
  totalItems: number | null;
}

export interface FetchWebflowTemplateImagesOptions {
  offset?: number;
  maxItems?: number;
}

function getApiToken(env: Env): string | null {
  return env.CMS_READ_ONLY?.trim() || env.WEBFLOW_API_TOKEN?.trim() || null;
}

function getCollectionId(env: Env): string {
  return env.WEBFLOW_TEMPLATES_COLLECTION_ID?.trim() || DEFAULT_TEMPLATES_COLLECTION_ID;
}

function getApiBase(env: Env): string {
  return (env.WEBFLOW_API_BASE?.trim() || DEFAULT_WEBFLOW_API_BASE).replace(/\/$/, '');
}

function toUrl(value: unknown): string | null {
  if (!value) return null;

  if (typeof value === 'string') {
    return /^https?:\/\//i.test(value) ? value : null;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const url = toUrl(entry);
      if (url) return url;
    }
    return null;
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return toUrl(record.url) ?? toUrl(record.src);
  }

  return null;
}

function pickImageUrl(fields: Record<string, unknown>, preferredKeys: string[], matcher: (key: string) => boolean): string | null {
  for (const key of preferredKeys) {
    const url = toUrl(fields[key]);
    if (url) return url;
  }

  for (const [key, value] of Object.entries(fields)) {
    if (!matcher(key.toLowerCase())) continue;
    const url = toUrl(value);
    if (url) return url;
  }

  return null;
}

function readSlug(fields: Record<string, unknown>): string {
  for (const key of ['slug', 'cms-slug', 'template-slug']) {
    const value = fields[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function readImageUrls(item: WebflowCmsItem): TemplateImageUrls | null {
  const fields = item.fieldData ?? item.field_data ?? item.fields ?? {};
  const templateSlug = readSlug(fields);
  const templateName = typeof fields.name === 'string' && fields.name.trim() ? fields.name.trim() : null;
  if (!templateSlug) return null;

  const thumbnail = pickImageUrl(
    fields,
    ['thumbnail-image', 'thumbnail', 'thumbnail-image-url', 'image'],
    (key) => key.includes('thumbnail') && !key.includes('secondary') && !key.includes('hover'),
  );

  const secondary = pickImageUrl(
    fields,
    ['thumbnail-image-secondary', 'thumbnail-secondary', 'thumbnail-hover', 'hover-thumbnail'],
    (key) => key.includes('thumbnail') && (key.includes('secondary') || key.includes('hover')),
  );

  if (!thumbnail && !secondary) return null;

  return {
    template_slug: templateSlug,
    template_name: templateName,
    thumbnail_image_url: thumbnail,
    thumbnail_image_secondary_url: secondary,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryDelayMs(response: Response, attempt: number): number {
  const retryAfter = response.headers.get('retry-after');
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
  }

  return 500 * 2 ** attempt;
}

async function fetchWebflowList(url: string, token: string): Promise<WebflowCmsListResponse> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) return (await response.json()) as WebflowCmsListResponse;

    const body = await response.text();
    lastError = new Error(`Webflow CMS image sync request failed (${response.status}): ${body}`);

    if ((response.status === 429 || response.status >= 500) && attempt < MAX_RETRIES) {
      await sleep(retryDelayMs(response, attempt));
      continue;
    }

    throw lastError;
  }

  throw lastError ?? new Error('Webflow CMS image sync request failed after retries.');
}

function normalizeOffset(value: number | undefined): number {
  return Number.isFinite(value) && Number(value) > 0 ? Math.floor(Number(value)) : 0;
}

function normalizeMaxItems(value: number | undefined): number | null {
  return Number.isFinite(value) && Number(value) > 0 ? Math.floor(Number(value)) : null;
}

export async function fetchWebflowTemplateImages(
  env: Env,
  options: FetchWebflowTemplateImagesOptions = {},
): Promise<WebflowImageSyncResult> {
  const token = getApiToken(env);
  if (!token) {
    if (isWebflowImageSyncRequired(env)) {
      throw new Error('CMS_READ_ONLY or WEBFLOW_API_TOKEN is required for Webflow image sync.');
    }
    return { images: new Map(), fetchedItems: 0, configured: false, offset: 0, nextOffset: 0, totalItems: null };
  }

  const images = new Map<string, TemplateImageUrls>();
  let fetchedItems = 0;
  const startOffset = normalizeOffset(options.offset);
  const maxItems = normalizeMaxItems(options.maxItems);
  let offset = startOffset;
  let total: number | null = null;

  do {
    const remaining = maxItems === null ? PAGE_SIZE : maxItems - fetchedItems;
    if (remaining <= 0) break;
    const pageSize = Math.min(PAGE_SIZE, remaining);

    const url = new URL(`${getApiBase(env)}/collections/${getCollectionId(env)}/items/live`);
    url.searchParams.set('limit', String(pageSize));
    url.searchParams.set('offset', String(offset));

    const payload = await fetchWebflowList(url.toString(), token);
    const items = payload.items ?? [];
    fetchedItems += items.length;
    total = typeof payload.pagination?.total === 'number' ? payload.pagination.total : total;

    for (const item of items) {
      const imageUrls = readImageUrls(item);
      if (imageUrls) images.set(imageUrls.template_slug, imageUrls);
    }

    offset += typeof payload.pagination?.limit === 'number' && payload.pagination.limit > 0 ? payload.pagination.limit : pageSize;

    if (items.length === 0) break;
    if (maxItems !== null && fetchedItems >= maxItems) break;
  } while (total === null ? true : offset < total);

  return {
    images,
    fetchedItems,
    configured: true,
    offset: startOffset,
    nextOffset: total !== null && offset >= total ? 0 : offset,
    totalItems: total,
  };
}
