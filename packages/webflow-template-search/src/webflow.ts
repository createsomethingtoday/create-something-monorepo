import type { Env } from './types.js';

export const TEMPLATES_COLLECTION_ID = '641b464e78789f611a5d4496';
export const DESIGNERS_COLLECTION_ID = '641b464e78789fc19d5d4461';

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

export interface WebflowTemplateImageRecord {
  id: string | null; // sync-record-id = Airtable record ID = D1 id when present
  templateSlug: string | null;
  name: string | null;
  listingUrl: string | null;
  thumbnailImageUrl: string | null;
  thumbnailImageSecondaryUrl: string | null;
  carouselImageUrls: string[];
}

export interface WebflowDesignerAvatarRecord {
  syncRecordId: string | null;
  name: string;
  profileUrl: string | null;
  avatarUrl: string;
  avatarAlt: string | null;
}

async function paginateWebflow<T>(
  apiToken: string,
  collectionId: string,
  mapper: (item: WebflowCmsItem) => T | null,
): Promise<T[]> {
  const results: T[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const url = `https://api.webflow.com/v2/collections/${collectionId}/items?limit=${limit}&offset=${offset}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'accept-version': '2.0.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Webflow API error (${response.status}): ${await response.text()}`);
    }

    const data = (await response.json()) as WebflowListResponse;

    for (const item of data.items) {
      if (!item.isArchived && !item.isDraft) {
        const mapped = mapper(item);
        if (mapped !== null) results.push(mapped);
      }
    }

    offset += limit;
    if (offset >= data.pagination.total) break;
  }

  return results;
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

function mapTemplateFieldData(fieldData: Record<string, unknown>): WebflowTemplateImageRecord | null {
  const syncRecordId = trimString(fieldData['sync-record-id']);
  const templateSlug = trimString(fieldData.slug);
  const name = trimString(fieldData.name ?? fieldData.Name);
  if (!syncRecordId && !templateSlug && !name) return null;

  return {
    id: syncRecordId,
    templateSlug,
    name,
    listingUrl: webflowTemplateListingUrl(templateSlug),
    thumbnailImageUrl: imageUrl(fieldData, ['thumbnail', 'thumbnail-image']),
    thumbnailImageSecondaryUrl: imageUrl(fieldData, ['thumbnail-secondary', 'thumbnail-image-secondary']),
    carouselImageUrls: imageUrls(fieldData, ['slider-images', 'carousel-images']),
  };
}

export async function fetchWebflowTemplateImages(env: Env): Promise<WebflowTemplateImageRecord[]> {
  const token = webflowApiToken(env);
  if (!token) throw new Error('A Webflow CMS read token is not configured.');

  return paginateWebflow(token, TEMPLATES_COLLECTION_ID, (item) => mapTemplateFieldData(item.fieldData));
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

// Maps a single webhook payload to a designer avatar record. Returns null if the
// item is archived/draft, lacks a sync-record-id, or has no avatar URL.
export function mapWebhookDesignerItem(webhook: WebflowWebhookPayload): WebflowDesignerAvatarRecord | null {
  const item = webhook.payload;
  if (item.isArchived || item.isDraft) return null;

  const syncRecordId = item.fieldData['sync-record-id'];
  const name = item.fieldData.name;
  if (typeof name !== 'string' || !name.trim()) return null;

  const avatar = item.fieldData['avatar'] as WebflowImage | null | undefined;
  if (!avatar?.url) return null;

  const slug = item.fieldData.slug;

  return {
    syncRecordId: typeof syncRecordId === 'string' && syncRecordId ? syncRecordId : null,
    name: name.trim(),
    profileUrl: typeof slug === 'string' && slug ? `https://webflow.com/templates/designers/${slug}` : null,
    avatarUrl: avatar.url,
    avatarAlt: avatar.alt ?? name.trim(),
  };
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

export async function fetchWebflowDesignerAvatars(env: Env): Promise<WebflowDesignerAvatarRecord[]> {
  const token = webflowApiToken(env);
  if (!token) throw new Error('A Webflow CMS read token is not configured.');

  return paginateWebflow(token, DESIGNERS_COLLECTION_ID, (item) => {
    const syncRecordId = item.fieldData['sync-record-id'];
    const name = item.fieldData.name;
    if (typeof name !== 'string' || !name.trim()) return null;

    const avatar = item.fieldData['avatar'] as WebflowImage | null | undefined;
    if (!avatar?.url) return null;

    const slug = item.fieldData.slug;

    return {
      syncRecordId: typeof syncRecordId === 'string' && syncRecordId ? syncRecordId : null,
      name: name.trim(),
      profileUrl: typeof slug === 'string' && slug ? `https://webflow.com/templates/designers/${slug}` : null,
      avatarUrl: avatar.url,
      avatarAlt: avatar.alt ?? name.trim(),
    };
  });
}
