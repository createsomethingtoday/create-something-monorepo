import type { Env } from './types.js';

export const TEMPLATES_COLLECTION_ID = '641b464e78789f611a5d4496';
export const DESIGNERS_COLLECTION_ID = '641b464e78789fc19d5d4461';
const WEBFLOW_PAGE_FETCH_TIMEOUT_MS = 15_000;

interface WebflowImage {
  fileId: string;
  url: string;
  alt: string | null;
}

interface WebflowCmsItem {
  id: string;
  isArchived: boolean;
  isDraft: boolean;
  fieldData: Record<string, unknown>;
}

interface WebflowListResponse {
  items: WebflowCmsItem[];
  pagination: { limit: number; offset: number; total: number };
}

interface WebflowTemplateLookupTarget {
  id?: string | null;
  templateSlug?: string | null;
  name?: string | null;
}

interface WebflowDesignerLookupTarget {
  syncRecordId?: string | null;
  slug?: string | null;
  name?: string | null;
}

async function fetchWebflowPage(url: string, apiToken: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEBFLOW_PAGE_FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'accept-version': '2.0.0',
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

export interface WebflowTemplateImageRecord {
  id: string | null; // sync-record-id = Airtable record ID = D1 id when present
  templateSlug: string | null;
  name: string | null;
  listingUrl: string | null;
  thumbnailImageUrl: string | null;
  thumbnailImageSecondaryUrl: string | null;
  carouselImageUrls: string[];
  price: number | null;
  isFree: boolean | null;
}

export interface WebflowDesignerAvatarRecord {
  syncRecordId: string | null;
  name: string;
  slug: string | null;
  profileUrl: string | null;
  avatarUrl: string | null;
  avatarAlt: string | null;
}

async function paginateWebflow<T>(
  apiToken: string,
  collectionId: string,
  mapper: (item: WebflowCmsItem) => T | null,
  options: { onPage?: () => Promise<void> } = {},
): Promise<T[]> {
  const results: T[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const url = `https://api.webflow.com/v2/collections/${collectionId}/items?limit=${limit}&offset=${offset}`;
    let response: Response;
    try {
      response = await fetchWebflowPage(url, apiToken);
    } catch (error) {
      throw new Error(`Webflow API request timed out for collection ${collectionId} at offset ${offset}: ${error instanceof Error ? error.message : String(error)}`);
    }

    if (!response.ok) {
      throw new Error(`Webflow API error (${response.status}) for collection ${collectionId} at offset ${offset}: ${await response.text()}`);
    }

    const data = (await response.json()) as WebflowListResponse;

    for (const item of data.items) {
      if (!item.isArchived && !item.isDraft) {
        const mapped = mapper(item);
        if (mapped !== null) results.push(mapped);
      }
    }

    offset += limit;
    await options.onPage?.();
    if (offset >= data.pagination.total) break;
  }

  return results;
}

async function fetchWebflowCollectionItems<T>(
  apiToken: string,
  collectionId: string,
  query: Record<string, string>,
  mapper: (item: WebflowCmsItem) => T | null,
  options: { onPage?: () => Promise<void> } = {},
): Promise<T[]> {
  const results: T[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const url = new URL(`https://api.webflow.com/v2/collections/${collectionId}/items`);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('offset', String(offset));
    for (const [key, value] of Object.entries(query)) {
      if (value) url.searchParams.set(key, value);
    }

    let response: Response;
    try {
      response = await fetchWebflowPage(url.toString(), apiToken);
    } catch (error) {
      throw new Error(
        `Webflow API request timed out for collection ${collectionId} at offset ${offset}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    if (!response.ok) {
      throw new Error(`Webflow API error (${response.status}) for collection ${collectionId} at offset ${offset}: ${await response.text()}`);
    }

    const data = (await response.json()) as WebflowListResponse;
    for (const item of data.items) {
      if (!item.isArchived && !item.isDraft) {
        const mapped = mapper(item);
        if (mapped !== null) results.push(mapped);
      }
    }

    offset += limit;
    await options.onPage?.();
    if (offset >= data.pagination.total || data.items.length === 0) break;
  }

  return results;
}

function normalizedMatchValue(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

function templateRecordMatchesTarget(record: WebflowTemplateImageRecord, target: WebflowTemplateLookupTarget): boolean {
  const targetId = normalizedMatchValue(target.id);
  const targetSlug = normalizedMatchValue(target.templateSlug);
  const targetName = normalizedMatchValue(target.name);
  return (
    (targetId.length > 0 && normalizedMatchValue(record.id) === targetId) ||
    (targetSlug.length > 0 && normalizedMatchValue(record.templateSlug) === targetSlug) ||
    (targetName.length > 0 && normalizedMatchValue(record.name) === targetName)
  );
}

function designerRecordMatchesTarget(record: WebflowDesignerAvatarRecord, target: WebflowDesignerLookupTarget): boolean {
  const targetId = normalizedMatchValue(target.syncRecordId);
  const targetSlug = normalizedMatchValue(target.slug);
  const targetName = normalizedMatchValue(target.name);
  return (
    (targetId.length > 0 && normalizedMatchValue(record.syncRecordId) === targetId) ||
    (targetSlug.length > 0 && normalizedMatchValue(record.slug) === targetSlug) ||
    (targetName.length > 0 && normalizedMatchValue(record.name) === targetName)
  );
}

function uniqueLookupQueries(targets: Array<{ slug?: string | null; name?: string | null }>): Array<Record<string, string>> {
  const seen = new Set<string>();
  const queries: Array<Record<string, string>> = [];

  for (const target of targets) {
    for (const [key, rawValue] of [
      ['slug', target.slug],
      ['name', target.name],
    ] as const) {
      const value = rawValue?.trim();
      if (!value) continue;
      const queryKey = `${key}:${value.toLowerCase()}`;
      if (seen.has(queryKey)) continue;
      seen.add(queryKey);
      queries.push({ [key]: value });
    }
  }

  return queries;
}

function appendUniqueRecord<T extends { id?: string | null; syncRecordId?: string | null; templateSlug?: string | null; slug?: string | null; name?: string | null }>(
  records: T[],
  seen: Set<string>,
  record: T,
) {
  const key = [record.id, record.syncRecordId, record.templateSlug, record.slug, record.name].map((value) => value ?? '').join('|');
  if (seen.has(key)) return;
  seen.add(key);
  records.push(record);
}

function trimString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function webflowApiToken(env: Env): string | null {
  return env.CMS_READ_ONLY?.trim() || env.WEBFLOW_API_TOKEN?.trim() || null;
}

function webflowTemplateListingUrl(templateSlug: string | null): string | null {
  return templateSlug ? `https://webflow.com/templates/html/${templateSlug}` : null;
}

function webflowDesignerProfileUrl(slug: string | null): string | null {
  return slug ? `https://webflow.com/templates/designers/${slug}` : null;
}

function imageUrl(fields: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const image = fields[key] as WebflowImage | null | undefined;
    if (image?.url) return image.url;
  }
  return null;
}

function imageUrls(fields: Record<string, unknown>, keys: string[]): string[] {
  for (const key of keys) {
    const images = fields[key] as WebflowImage[] | null | undefined;
    if (Array.isArray(images)) return images.map((img) => img.url).filter(Boolean);
  }
  return [];
}

function fieldKeyMatchesPrice(value: string): boolean {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, ' ');
  return /\b(price|pricing|cost)\b/.test(normalized);
}

function fieldKeyMatchesFree(value: string): boolean {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, ' ');
  return /\b(free|purchase type|template price|price|pricing)\b/.test(normalized);
}

function primitiveValues(value: unknown): unknown[] {
  if (value == null) return [];
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return [value];
  if (Array.isArray(value)) return value.flatMap((entry) => primitiveValues(entry));
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return ['value', 'name', 'label', 'text', 'title'].flatMap((key) => primitiveValues(record[key]));
  }
  return [];
}

function parsePriceValue(value: unknown): number | null {
  for (const entry of primitiveValues(value)) {
    if (typeof entry === 'number' && Number.isFinite(entry) && entry >= 0) return entry;
    if (typeof entry !== 'string') continue;
    const normalized = entry.trim().toLowerCase();
    if (!normalized) continue;
    if (/\bfree\b/.test(normalized) || normalized === '$0' || normalized === '0' || normalized === '0 usd') return 0;
    const match = normalized.replace(/,/g, '').match(/\$?\s*(\d+(?:\.\d+)?)/);
    if (!match?.[1]) continue;
    const parsed = Number(match[1]);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return null;
}

function parseFreeValue(value: unknown): boolean | null {
  for (const entry of primitiveValues(value)) {
    if (typeof entry === 'boolean') return entry;
    if (typeof entry === 'number' && (entry === 0 || entry === 1)) return entry === 1;
    if (typeof entry !== 'string') continue;
    const normalized = entry.trim().toLowerCase();
    if (!normalized) continue;
    if (['true', 'yes', 'free', '$0', '0', '0 usd'].includes(normalized) || /\bfree\b/.test(normalized)) return true;
    if (['false', 'no', 'paid'].includes(normalized) || /\bpaid\b/.test(normalized)) return false;
  }
  return null;
}

export function extractTemplateOffer(fieldData: Record<string, unknown>): { price: number | null; isFree: boolean | null } | null {
  let price: number | null = null;
  let isFree: boolean | null = null;

  for (const [fieldName, value] of Object.entries(fieldData)) {
    if (fieldKeyMatchesPrice(fieldName)) {
      const parsedPrice = parsePriceValue(value);
      if (parsedPrice !== null) price = parsedPrice;
    }

    if (fieldKeyMatchesFree(fieldName)) {
      const parsedFree = parseFreeValue(value);
      if (parsedFree !== null) isFree = parsedFree;
    }
  }

  if (price !== null) {
    isFree = price === 0;
  } else if (isFree === true) {
    price = 0;
  }

  if (price === null && isFree === null) return null;
  return { price, isFree };
}

function mapTemplateFieldData(fieldData: Record<string, unknown>): WebflowTemplateImageRecord | null {
  const syncRecordId = trimString(fieldData['sync-record-id']);
  const templateSlug = trimString(fieldData.slug);
  const name = trimString(fieldData.name ?? fieldData.Name);
  if (!syncRecordId && !templateSlug && !name) return null;
  const offer = extractTemplateOffer(fieldData);

  return {
    id: syncRecordId,
    templateSlug,
    name,
    listingUrl: webflowTemplateListingUrl(templateSlug),
    thumbnailImageUrl: imageUrl(fieldData, ['main-thumbnail', 'main-thumbnail-image', 'thumbnail', 'thumbnail-image']),
    thumbnailImageSecondaryUrl: imageUrl(fieldData, ['thumbnail-secondary', 'thumbnail-image-secondary']),
    carouselImageUrls: imageUrls(fieldData, ['slider-images', 'carousel-images']),
    price: offer?.price ?? null,
    isFree: offer?.isFree ?? null,
  };
}

function mapDesignerFieldData(fieldData: Record<string, unknown>): WebflowDesignerAvatarRecord | null {
  const syncRecordId = trimString(fieldData['sync-record-id']);
  const name = trimString(fieldData.name);
  if (!name) return null;

  const slug = trimString(fieldData.slug);
  const avatar = fieldData.avatar as WebflowImage | null | undefined;
  const avatarUrl = avatar?.url ?? null;
  const profileUrl = webflowDesignerProfileUrl(slug);

  if (!profileUrl && !avatarUrl) return null;

  return {
    syncRecordId,
    name,
    slug,
    profileUrl,
    avatarUrl,
    avatarAlt: avatarUrl ? avatar?.alt ?? name : null,
  };
}

export async function fetchWebflowTemplateImages(
  env: Env,
  options: { onPage?: () => Promise<void> } = {},
): Promise<WebflowTemplateImageRecord[]> {
  const token = webflowApiToken(env);
  if (!token) throw new Error('A Webflow CMS read token is not configured.');

  return paginateWebflow(token, TEMPLATES_COLLECTION_ID, (item) => mapTemplateFieldData(item.fieldData), options);
}

export async function fetchWebflowTemplateImagesForTargets(
  env: Env,
  targets: WebflowTemplateLookupTarget[],
  options: { onPage?: () => Promise<void> } = {},
): Promise<WebflowTemplateImageRecord[]> {
  const token = webflowApiToken(env);
  if (!token) throw new Error('A Webflow CMS read token is not configured.');

  const queries = uniqueLookupQueries(targets.map((target) => ({ slug: target.templateSlug, name: target.name })));
  if (queries.length === 0) return [];

  const records: WebflowTemplateImageRecord[] = [];
  const seen = new Set<string>();
  for (const query of queries) {
    const matches = await fetchWebflowCollectionItems(token, TEMPLATES_COLLECTION_ID, query, (item) => mapTemplateFieldData(item.fieldData), options);
    for (const match of matches) {
      if (targets.some((target) => templateRecordMatchesTarget(match, target))) {
        appendUniqueRecord(records, seen, match);
      }
    }
  }

  return records;
}

// Webhook payload shape sent by Webflow for collection_item_* events.
export interface WebflowWebhookPayload {
  triggerType: string;
  payload: {
    id: string;
    isArchived: boolean;
    isDraft: boolean;
    /** Collection ID — used to route between Templates and Designers. */
    cid: string;
    fieldData: Record<string, unknown>;
  };
}

// Maps a single webhook payload to a template image record. Returns null if the
// item is archived/draft or lacks a sync-record-id.
export function mapWebhookTemplateItem(webhook: WebflowWebhookPayload): WebflowTemplateImageRecord | null {
  const item = webhook.payload;
  if (item.isArchived || item.isDraft) return null;

  return mapTemplateFieldData(item.fieldData);
}

// Maps a single webhook payload to a designer profile record. Returns null if the
// item is archived/draft or lacks both a published slug and avatar URL.
export function mapWebhookDesignerItem(webhook: WebflowWebhookPayload): WebflowDesignerAvatarRecord | null {
  const item = webhook.payload;
  if (item.isArchived || item.isDraft) return null;

  return mapDesignerFieldData(item.fieldData);
}

// Verifies a Webflow webhook signature (HMAC-SHA256, hex-encoded).
// Webflow sends the signature in the x-webflow-signature header.
export async function verifyWebflowSignature(secret: string, rawBody: string, signature: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
      'verify',
    ]);
    const sigBytes = new Uint8Array((signature.match(/../g) ?? []).map((h) => parseInt(h, 16)));
    return crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(rawBody));
  } catch {
    return false;
  }
}

export async function fetchWebflowDesignerAvatars(
  env: Env,
  options: { onPage?: () => Promise<void> } = {},
): Promise<WebflowDesignerAvatarRecord[]> {
  const token = webflowApiToken(env);
  if (!token) throw new Error('A Webflow CMS read token is not configured.');

  return paginateWebflow(token, DESIGNERS_COLLECTION_ID, (item) => mapDesignerFieldData(item.fieldData), options);
}

export async function fetchWebflowDesignerAvatarsForTargets(
  env: Env,
  targets: WebflowDesignerLookupTarget[],
  options: { onPage?: () => Promise<void> } = {},
): Promise<WebflowDesignerAvatarRecord[]> {
  const token = webflowApiToken(env);
  if (!token) throw new Error('A Webflow CMS read token is not configured.');

  const queries = uniqueLookupQueries(targets);
  if (queries.length === 0) return [];

  const records: WebflowDesignerAvatarRecord[] = [];
  const seen = new Set<string>();
  for (const query of queries) {
    const matches = await fetchWebflowCollectionItems(token, DESIGNERS_COLLECTION_ID, query, (item) => mapDesignerFieldData(item.fieldData), options);
    for (const match of matches) {
      if (targets.some((target) => designerRecordMatchesTarget(match, target))) {
        appendUniqueRecord(records, seen, match);
      }
    }
  }

  return records;
}
