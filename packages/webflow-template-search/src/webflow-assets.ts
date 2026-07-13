import type { Env } from './types.js';
import { extractTemplateOffer, type WebflowTemplateImageRecord } from './webflow.js';

interface WebflowAssetVariant {
  hostedUrl?: string;
  originalFileName?: string;
  displayName?: string;
  width?: number | null;
  height?: number | null;
  error?: string | null;
}

interface WebflowAsset {
  id: string;
  contentType?: string;
  hostedUrl?: string;
  originalFileName?: string;
  displayName?: string;
  variants?: WebflowAssetVariant[];
}

interface WebflowAssetListResponse {
  assets?: WebflowAsset[];
  pagination?: {
    limit?: number;
    offset?: number;
    total?: number;
  };
}

interface WebflowCollection {
  id?: string;
  displayName?: string;
  singularName?: string;
  name?: string;
  slug?: string;
}

interface WebflowCollectionListResponse {
  collections?: WebflowCollection[];
}

interface WebflowCollectionItem {
  id?: string;
  fieldData?: Record<string, unknown>;
}

interface WebflowCollectionItemsResponse {
  items?: WebflowCollectionItem[];
  pagination?: {
    limit?: number;
    offset?: number;
    total?: number;
  };
}

interface WebflowTemplateImageCandidate {
  hostedUrl: string;
  scoreName: string;
}

interface WebflowTemplateOffer {
  price: number | null;
  isFree: boolean | null;
}

interface WebflowTemplateIdentity {
  templateSlug: string;
  listingUrl: string;
}

const PUBLISHED_TEMPLATE_FETCH_TIMEOUT_MS = 3000;
const KEY_PREFIXES = {
  exactSlug: 'slug',
  exactName: 'name',
  fuzzy: 'fuzzy',
} as const;

export interface WebflowTemplateImageIndex {
  byTemplateKey: Map<string, WebflowTemplateImageCandidate[]>;
  offerByTemplateKey: Map<string, WebflowTemplateOffer>;
  identityByTemplateKey: Map<string, WebflowTemplateIdentity[]>;
}

export interface ResolvedWebflowTemplateImages {
  thumbnailImageUrl: string | null;
  thumbnailImageSecondaryUrl: string | null;
}

function isImageAsset(contentType: string | undefined) {
  return typeof contentType === 'string' && contentType.toLowerCase().startsWith('image/');
}

function isHttpUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function isImageUrl(value: string | undefined): value is string {
  if (!isHttpUrl(value)) return false;
  try {
    const url = new URL(value);
    return (
      /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(url.pathname) ||
      url.hostname.endsWith('website-files.com') ||
      url.hostname.endsWith('uploads-ssl.webflow.com')
    );
  } catch {
    return false;
  }
}

export function isTemporaryAirtableAttachmentUrl(value: string | null): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.hostname.endsWith('airtableusercontent.com') || url.hostname === 'dl.airtable.com';
  } catch {
    return false;
  }
}

export function stableAttachmentUrl(value: string | null): string | null {
  if (!value || isTemporaryAirtableAttachmentUrl(value)) return null;
  return value;
}

function basenameFromUrl(value: string): string {
  try {
    const url = new URL(value);
    return decodeURIComponent(url.pathname.split('/').pop() ?? '');
  } catch {
    return '';
  }
}

function stripExtension(value: string) {
  return value.replace(/\.[a-z0-9]+$/i, '');
}

function normalizeLookupKey(value: string | null | undefined): string {
  if (!value) return '';
  return stripExtension(decodeURIComponent(value))
    .replace(/^[a-f0-9]{24}[_-]+/i, '')
    .replace(/\b(thumbnail|thumb|hover|secondary|primary|template|website|webflow|marketplace|preview|image|img|1x|2x)\b/gi, ' ')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase();
}

function normalizeExactKey(value: string | null | undefined): string {
  if (!value) return '';
  return stripExtension(decodeURIComponent(value))
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase();
}

function normalizeScoreName(value: string | null | undefined): string {
  if (!value) return '';
  return stripExtension(decodeURIComponent(value))
    .replace(/^[a-f0-9]{24}[_-]+/i, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase();
}

function compactKey(value: string) {
  return value.replace(/\s+/g, '');
}

function prefixedKeys(prefix: string, values: string[]) {
  return uniqueKeys(values).map((value) => `${prefix}:${value}`);
}

function templateKeyGroups(templateSlug: string, name: string): Record<keyof typeof KEY_PREFIXES, string[]> {
  const slugBase = templateSlug
    .replace(/-website-template$/i, '')
    .replace(/-template$/i, '')
    .replace(/-/g, ' ');
  return {
    exactSlug: prefixedKeys(KEY_PREFIXES.exactSlug, [normalizeExactKey(templateSlug)]),
    exactName: prefixedKeys(KEY_PREFIXES.exactName, [normalizeExactKey(name)]),
    fuzzy: prefixedKeys(KEY_PREFIXES.fuzzy, [
      normalizeLookupKey(templateSlug),
      normalizeLookupKey(slugBase),
      normalizeLookupKey(name),
    ]),
  };
}

function uniqueKeys(values: string[]) {
  const keys = new Set<string>();
  for (const value of values) {
    if (!value) continue;
    keys.add(value);
    keys.add(compactKey(value));
  }
  return Array.from(keys).filter(Boolean);
}

function appendCandidate(
  byTemplateKey: WebflowTemplateImageIndex['byTemplateKey'],
  key: string,
  candidate: WebflowTemplateImageCandidate,
  options: { preserveExisting?: boolean } = {},
) {
  if (options.preserveExisting && byTemplateKey.has(key)) return;
  const current = byTemplateKey.get(key) ?? [];
  current.push(candidate);
  byTemplateKey.set(key, current);
}

function appendTemplateCandidate(
  byTemplateKey: WebflowTemplateImageIndex['byTemplateKey'],
  templateSlug: string,
  name: string,
  candidate: WebflowTemplateImageCandidate,
) {
  const groups = templateKeyGroups(templateSlug, name);
  for (const key of [...groups.exactSlug, ...groups.exactName, ...groups.fuzzy]) {
    appendCandidate(byTemplateKey, key, candidate);
  }
}

function appendTemplateOfferCandidate(
  offerByTemplateKey: WebflowTemplateImageIndex['offerByTemplateKey'],
  templateSlug: string,
  name: string,
  offer: WebflowTemplateOffer,
) {
  const groups = templateKeyGroups(templateSlug, name);
  for (const key of [...groups.exactSlug, ...groups.exactName]) {
    if (!offerByTemplateKey.has(key)) offerByTemplateKey.set(key, offer);
  }
}

function appendTemplateIdentityCandidate(
  identityByTemplateKey: WebflowTemplateImageIndex['identityByTemplateKey'],
  templateSlug: string,
  name: string,
) {
  if (!templateSlug || !name) return;
  const identity: WebflowTemplateIdentity = {
    templateSlug,
    listingUrl: publishedTemplateUrl(templateSlug, null),
  };
  const groups = templateKeyGroups(templateSlug, name);
  for (const key of [...groups.exactSlug, ...groups.exactName]) {
    const current = identityByTemplateKey.get(key) ?? [];
    if (!current.some((entry) => entry.templateSlug === identity.templateSlug)) {
      current.push(identity);
      identityByTemplateKey.set(key, current);
    }
  }
}

function assetLookupKeys(asset: WebflowAsset) {
  const rawNames = [
    asset.displayName,
    asset.originalFileName,
    asset.hostedUrl ? basenameFromUrl(asset.hostedUrl) : '',
    ...(asset.variants ?? []).flatMap((variant) => [
      variant.displayName,
      variant.originalFileName,
      variant.hostedUrl ? basenameFromUrl(variant.hostedUrl) : '',
    ]),
  ];
  return prefixedKeys(KEY_PREFIXES.fuzzy, rawNames.map((value) => normalizeLookupKey(value)));
}

function bestHostedUrl(asset: WebflowAsset): string | null {
  if (isHttpUrl(asset.hostedUrl)) return asset.hostedUrl;
  const variant = (asset.variants ?? []).find((entry) => !entry.error && isHttpUrl(entry.hostedUrl));
  return variant?.hostedUrl ?? null;
}

function candidateScore(candidate: WebflowTemplateImageCandidate, purpose: 'primary' | 'secondary') {
  const name = candidate.scoreName;
  let score = 0;
  if (purpose === 'primary') {
    if (/\b(hover|secondary|alternate|alt|rollover|2)\b/i.test(name)) score -= 20;
    if (/\b(thumbnail|thumb)\b/i.test(name)) score += 10;
    if (/\b(primary|main|default)\b/i.test(name)) score += 5;
  } else {
    if (/\b(hover|secondary|alternate|alt|rollover|2)\b/i.test(name)) score += 20;
    if (/\b(primary|main|default)\b/i.test(name)) score -= 5;
  }
  return score;
}

function chooseCandidate(candidates: WebflowTemplateImageCandidate[], purpose: 'primary' | 'secondary') {
  return [...candidates].sort((a, b) => candidateScore(b, purpose) - candidateScore(a, purpose))[0]?.hostedUrl ?? null;
}

function decodeHtmlAttribute(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function extractMetaImage(html: string): string | null {
  const patterns = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
    /"image"\s*:\s*"([^"]+)"/i,
  ];

  for (const pattern of patterns) {
    const value = html.match(pattern)?.[1];
    const url = value ? decodeHtmlAttribute(value) : null;
    if (isImageUrl(url ?? undefined)) return url;
  }
  return null;
}

export function publishedTemplateUrl(templateSlug: string, listingUrl: string | null | undefined) {
  if (listingUrl && isHttpUrl(listingUrl)) return listingUrl;
  return `https://webflow.com/templates/html/${templateSlug}`;
}

export async function fetchPublishedTemplateStatus(template: {
  templateSlug: string;
  listingUrl?: string | null;
}): Promise<{ ok: boolean; status: number | null; url: string }> {
  const url = publishedTemplateUrl(template.templateSlug, template.listingUrl);
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), PUBLISHED_TEMPLATE_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: { Accept: 'text/html' },
      signal: abortController.signal,
    });
    return { ok: response.ok, status: response.status, url };
  } catch {
    return { ok: false, status: null, url };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function resolvePublishedTemplateImages(template: {
  templateSlug: string;
  listingUrl?: string | null;
}): Promise<ResolvedWebflowTemplateImages | null> {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), PUBLISHED_TEMPLATE_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(publishedTemplateUrl(template.templateSlug, template.listingUrl), {
      headers: { Accept: 'text/html' },
      signal: abortController.signal,
    });
    if (!response.ok) return null;

    const html = await response.text();
    const primary = extractMetaImage(html);
    return primary
      ? {
          thumbnailImageUrl: primary,
          thumbnailImageSecondaryUrl: null,
        }
      : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

function extractImageUrls(value: unknown, depth = 0): string[] {
  if (depth > 4 || value == null) return [];
  if (typeof value === 'string') return isImageUrl(value) ? [value] : [];
  if (Array.isArray(value)) return value.flatMap((entry) => extractImageUrls(entry, depth + 1));
  if (typeof value !== 'object') return [];

  const urls = new Set<string>();
  for (const entry of Object.values(value as Record<string, unknown>)) {
    for (const url of extractImageUrls(entry, depth + 1)) {
      urls.add(url);
    }
  }
  return Array.from(urls);
}

function collectionScore(collection: WebflowCollection) {
  const value = normalizeScoreName(
    [collection.slug, collection.displayName, collection.singularName, collection.name].filter(Boolean).join(' '),
  );
  let score = 0;
  if (/\btemplates?\b/i.test(value)) score += 20;
  if (/\bmarketplace\b/i.test(value)) score += 10;
  if (/\bassets?\b/i.test(value)) score += 5;
  if (/\b(categories?|tags?|styles?|authors?|creators?)\b/i.test(value)) score -= 20;
  return score;
}

async function resolveTemplateCollectionIds(env: Env, siteId: string, token: string): Promise<string[]> {
  const configuredCollectionId = env.WEBFLOW_TEMPLATE_COLLECTION_ID?.trim();
  if (configuredCollectionId) return [configuredCollectionId];

  try {
    const url = new URL(`https://api.webflow.com/v2/sites/${siteId}/collections`);
    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      console.warn(`Webflow collections request failed (${response.status}); skipping CMS template image lookup.`);
      return [];
    }

    const payload = (await response.json()) as WebflowCollectionListResponse;
    return (payload.collections ?? [])
      .map((collection) => ({ collection, score: collectionScore(collection) }))
      .filter(({ collection, score }) => Boolean(collection.id) && score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ collection }) => collection.id as string);
  } catch (error) {
    console.warn('Webflow collections lookup failed; skipping CMS template image lookup.', error);
    return [];
  }
}

function explicitCmsImageRole(fieldName: string): 'main thumbnail' | 'secondary thumbnail' | 'carousel image' | null {
  const normalized = fieldName.trim().toLowerCase();
  if (['main-thumbnail', 'main-thumbnail-image', 'thumbnail', 'thumbnail-image'].includes(normalized)) {
    return 'main thumbnail';
  }
  if (['thumbnail-secondary', 'thumbnail-image-secondary'].includes(normalized)) return 'secondary thumbnail';
  if (['slider-images', 'carousel-images'].includes(normalized)) return 'carousel image';
  return null;
}

function appendCollectionItemImages(
  byTemplateKey: WebflowTemplateImageIndex['byTemplateKey'],
  offerByTemplateKey: WebflowTemplateImageIndex['offerByTemplateKey'],
  identityByTemplateKey: WebflowTemplateImageIndex['identityByTemplateKey'],
  item: WebflowCollectionItem,
): number {
  const fieldData = item.fieldData ?? {};
  const templateSlug = String(fieldData.slug ?? fieldData['cms-slug'] ?? '').trim();
  const name = String(fieldData.name ?? fieldData.Name ?? '').trim();
  if (!templateSlug && !name) return 0;

  const offer = extractTemplateOffer(fieldData);
  if (offer) appendTemplateOfferCandidate(offerByTemplateKey, templateSlug, name, offer);
  appendTemplateIdentityCandidate(identityByTemplateKey, templateSlug, name);

  let added = 0;
  for (const [fieldName, value] of Object.entries(fieldData)) {
    const explicitRole = explicitCmsImageRole(fieldName);
    for (const hostedUrl of extractImageUrls(value)) {
      appendTemplateCandidate(byTemplateKey, templateSlug, name, {
        hostedUrl,
        scoreName: normalizeScoreName(explicitRole ?? `${fieldName} ${basenameFromUrl(hostedUrl)}`),
      });
      added += 1;
    }
  }
  return added;
}

export function buildWebflowTemplateImageIndexFromRecords(records: WebflowTemplateImageRecord[]): WebflowTemplateImageIndex | null {
  const byTemplateKey = new Map<string, WebflowTemplateImageCandidate[]>();
  const offerByTemplateKey = new Map<string, WebflowTemplateOffer>();
  const identityByTemplateKey = new Map<string, WebflowTemplateIdentity[]>();

  for (const record of records) {
    const templateSlug = record.templateSlug ?? '';
    const name = record.name ?? '';
    if (!templateSlug && !name) continue;

    if (record.price !== null || record.isFree !== null) {
      appendTemplateOfferCandidate(offerByTemplateKey, templateSlug, name, {
        price: record.price,
        isFree: record.isFree,
      });
    }
    appendTemplateIdentityCandidate(identityByTemplateKey, templateSlug, name);

    if (isImageUrl(record.thumbnailImageUrl ?? undefined)) {
      appendTemplateCandidate(byTemplateKey, templateSlug, name, {
        hostedUrl: record.thumbnailImageUrl as string,
        scoreName: normalizeScoreName('main thumbnail'),
      });
    }
    if (isImageUrl(record.thumbnailImageSecondaryUrl ?? undefined)) {
      appendTemplateCandidate(byTemplateKey, templateSlug, name, {
        hostedUrl: record.thumbnailImageSecondaryUrl as string,
        scoreName: normalizeScoreName('secondary thumbnail'),
      });
    }
    for (const imageUrl of record.carouselImageUrls) {
      if (!isImageUrl(imageUrl)) continue;
      appendTemplateCandidate(byTemplateKey, templateSlug, name, {
        hostedUrl: imageUrl,
        scoreName: normalizeScoreName('carousel image'),
      });
    }
  }

  return byTemplateKey.size > 0 || offerByTemplateKey.size > 0 || identityByTemplateKey.size > 0
    ? { byTemplateKey, offerByTemplateKey, identityByTemplateKey }
    : null;
}

async function appendWebflowCmsImages(
  env: Env,
  siteId: string,
  token: string,
  byTemplateKey: WebflowTemplateImageIndex['byTemplateKey'],
  offerByTemplateKey: WebflowTemplateImageIndex['offerByTemplateKey'],
  identityByTemplateKey: WebflowTemplateImageIndex['identityByTemplateKey'],
  options: { onPage?: () => Promise<void> } = {},
): Promise<number> {
  const collectionIds = await resolveTemplateCollectionIds(env, siteId, token);
  let added = 0;
  const limit = 100;

  for (const collectionId of collectionIds) {
    let offset = 0;
    while (true) {
      const url = new URL(`https://api.webflow.com/v2/collections/${collectionId}/items`);
      url.searchParams.set('limit', String(limit));
      url.searchParams.set('offset', String(offset));

      const response = await fetch(url.toString(), {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        console.warn(`Webflow collection items request failed (${response.status}); skipping collection ${collectionId}.`);
        break;
      }

      const payload = (await response.json()) as WebflowCollectionItemsResponse;
      const items = payload.items ?? [];
      for (const item of items) {
        added += appendCollectionItemImages(byTemplateKey, offerByTemplateKey, identityByTemplateKey, item);
      }

      const total = payload.pagination?.total ?? items.length;
      offset += payload.pagination?.limit ?? limit;
      await options.onPage?.();
      if (offset >= total || items.length === 0) break;
    }
  }

  return added;
}

async function appendWebflowAssetImages(
  env: Env,
  siteId: string,
  token: string,
  byTemplateKey: WebflowTemplateImageIndex['byTemplateKey'],
  options: { onPage?: () => Promise<void> } = {},
): Promise<number> {
  let offset = 0;
  const limit = 100;
  let added = 0;

  try {
    while (true) {
      const url = new URL(`https://api.webflow.com/v2/sites/${siteId}/assets`);
      url.searchParams.set('limit', String(limit));
      url.searchParams.set('offset', String(offset));
      if (env.WEBFLOW_TEMPLATE_ASSET_FOLDER_ID) {
        url.searchParams.set('folderId', env.WEBFLOW_TEMPLATE_ASSET_FOLDER_ID);
      }

      const response = await fetch(url.toString(), {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.warn(`Webflow assets request failed (${response.status}); continuing without Webflow thumbnails.`);
        return added;
      }

      const payload = (await response.json()) as WebflowAssetListResponse;
      const assets = payload.assets ?? [];
      for (const asset of assets) {
        if (!isImageAsset(asset.contentType)) continue;
        const hostedUrl = bestHostedUrl(asset);
        if (!hostedUrl) continue;

        const rawNames = [asset.displayName, asset.originalFileName, basenameFromUrl(hostedUrl)].filter(Boolean);
        const candidate: WebflowTemplateImageCandidate = {
          hostedUrl,
          scoreName: normalizeScoreName(rawNames.join(' ')),
        };
        for (const key of assetLookupKeys(asset)) {
          appendCandidate(byTemplateKey, key, candidate, { preserveExisting: true });
        }
        added += 1;
      }

      const total = payload.pagination?.total ?? assets.length;
      offset += payload.pagination?.limit ?? limit;
      await options.onPage?.();
      if (offset >= total || assets.length === 0) break;
    }
  } catch (error) {
    console.warn('Webflow assets lookup failed; continuing without Webflow thumbnails.', error);
    return added;
  }

  return added;
}

export async function loadWebflowTemplateImageIndex(
  env: Env,
  options: { onPage?: () => Promise<void> } = {},
): Promise<WebflowTemplateImageIndex | null> {
  const siteId = env.WEBFLOW_TEMPLATE_ASSET_SITE_ID?.trim();
  if (!siteId) return null;

  const byTemplateKey = new Map<string, WebflowTemplateImageCandidate[]>();
  const offerByTemplateKey = new Map<string, WebflowTemplateOffer>();
  const identityByTemplateKey = new Map<string, WebflowTemplateIdentity[]>();
  const cmsToken = env.WEBFLOW_API_TOKEN?.trim() || env.CMS_READ_ONLY?.trim();
  const cmsIndexEnabled = env.WEBFLOW_TEMPLATE_ENABLE_CMS_INDEX !== 'false';
  if (cmsToken && cmsIndexEnabled) {
    await appendWebflowCmsImages(env, siteId, cmsToken, byTemplateKey, offerByTemplateKey, identityByTemplateKey, options);
  }

  const assetToken = env.WEBFLOW_API_TOKEN?.trim();
  if (assetToken) {
    await appendWebflowAssetImages(env, siteId, assetToken, byTemplateKey, options);
  }

  return byTemplateKey.size > 0 || offerByTemplateKey.size > 0 || identityByTemplateKey.size > 0
    ? { byTemplateKey, offerByTemplateKey, identityByTemplateKey }
    : null;
}

export function resolveWebflowTemplateImages(
  index: WebflowTemplateImageIndex | null,
  template: { templateSlug: string; name: string },
): ResolvedWebflowTemplateImages | null {
  if (!index) return null;

  const groups = templateKeyGroups(template.templateSlug, template.name);
  const groupCandidates = [
    collectTemplateImageCandidates(index, groups.exactSlug),
    collectTemplateImageCandidates(index, groups.exactName),
    collectTemplateImageCandidates(index, groups.fuzzy),
  ];
  const candidates = groupCandidates.find((entries) => entries.length > 0) ?? [];
  if (candidates.length === 0) return null;

  const primary = chooseCandidate(candidates, 'primary');
  const secondary = candidates.length > 1 ? chooseCandidate(candidates, 'secondary') : null;
  return {
    thumbnailImageUrl: primary,
    thumbnailImageSecondaryUrl: secondary && secondary !== primary ? secondary : null,
  };
}

export function resolveWebflowTemplateOffer(
  index: WebflowTemplateImageIndex | null,
  template: { templateSlug: string; name: string },
): WebflowTemplateOffer | null {
  if (!index) return null;

  const groups = templateKeyGroups(template.templateSlug, template.name);
  for (const key of [...groups.exactSlug, ...groups.exactName]) {
    const offer = index.offerByTemplateKey.get(key);
    if (offer) return offer;
  }
  return null;
}

export function resolveWebflowTemplateIdentity(
  index: WebflowTemplateImageIndex | null,
  template: { templateSlug: string; name: string },
): WebflowTemplateIdentity | null {
  if (!index) return null;

  const groups = templateKeyGroups(template.templateSlug, template.name);
  for (const keyGroup of [groups.exactSlug, groups.exactName]) {
    const identities = collectTemplateIdentities(index, keyGroup);
    if (identities.length === 1) return identities[0];
  }

  return null;
}

function collectTemplateImageCandidates(
  index: WebflowTemplateImageIndex,
  keys: string[],
): WebflowTemplateImageCandidate[] {
  const candidates: WebflowTemplateImageCandidate[] = [];
  const seen = new Set<string>();
  for (const key of keys) {
    for (const candidate of index.byTemplateKey.get(key) ?? []) {
      if (seen.has(candidate.hostedUrl)) continue;
      candidates.push(candidate);
      seen.add(candidate.hostedUrl);
    }
  }

  return candidates;
}

function collectTemplateIdentities(index: WebflowTemplateImageIndex, keys: string[]): WebflowTemplateIdentity[] {
  const identities: WebflowTemplateIdentity[] = [];
  const seen = new Set<string>();
  for (const key of keys) {
    for (const identity of index.identityByTemplateKey.get(key) ?? []) {
      if (seen.has(identity.templateSlug)) continue;
      identities.push(identity);
      seen.add(identity.templateSlug);
    }
  }

  return identities;
}
