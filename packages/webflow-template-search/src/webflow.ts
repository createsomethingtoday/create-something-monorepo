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
  id: string; // sync-record-id = Airtable record ID = D1 id
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

export async function fetchWebflowTemplateImages(env: Env): Promise<WebflowTemplateImageRecord[]> {
  if (!env.CMS_READ_ONLY) throw new Error('CMS_READ_ONLY is not configured.');

  return paginateWebflow(env.CMS_READ_ONLY, TEMPLATES_COLLECTION_ID, (item) => {
    const syncRecordId = item.fieldData['sync-record-id'];
    if (typeof syncRecordId !== 'string' || !syncRecordId) return null;

    const thumbnail = item.fieldData['thumbnail'] as WebflowImage | null | undefined;
    const thumbnailSecondary = item.fieldData['thumbnail-secondary'] as WebflowImage | null | undefined;
    const sliderImages = item.fieldData['slider-images'] as WebflowImage[] | null | undefined;

    return {
      id: syncRecordId,
      thumbnailImageUrl: thumbnail?.url ?? null,
      thumbnailImageSecondaryUrl: thumbnailSecondary?.url ?? null,
      carouselImageUrls: Array.isArray(sliderImages) ? sliderImages.map((img) => img.url).filter(Boolean) : [],
    };
  });
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

  const syncRecordId = item.fieldData['sync-record-id'];
  if (typeof syncRecordId !== 'string' || !syncRecordId) return null;

  const thumbnail = item.fieldData['thumbnail'] as WebflowImage | null | undefined;
  const thumbnailSecondary = item.fieldData['thumbnail-secondary'] as WebflowImage | null | undefined;
  const sliderImages = item.fieldData['slider-images'] as WebflowImage[] | null | undefined;

  return {
    id: syncRecordId,
    thumbnailImageUrl: thumbnail?.url ?? null,
    thumbnailImageSecondaryUrl: thumbnailSecondary?.url ?? null,
    carouselImageUrls: Array.isArray(sliderImages) ? sliderImages.map((img) => img.url).filter(Boolean) : [],
  };
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
  if (!env.CMS_READ_ONLY) throw new Error('CMS_READ_ONLY is not configured.');

  return paginateWebflow(env.CMS_READ_ONLY, DESIGNERS_COLLECTION_ID, (item) => {
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
