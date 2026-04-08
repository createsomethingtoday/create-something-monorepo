import {
  fetchCreatorMetadataByRecordIds,
  fetchModifiedAssetsSince,
  fetchPublishedTemplateAssetsPage,
  loadLookupMaps,
} from './airtable.js';
import {
  clearIndex,
  deleteSyncStateValue,
  deleteTemplateDocuments,
  getSyncCursor,
  getSyncStateValue,
  recordSyncSummary,
  setSyncCursor,
  setSyncStateValue,
  upsertTemplateDocuments,
} from './db.js';
import { stripHtml } from './html.js';
import { getSearchRankingConfig, truncateSearchText } from './ranking.js';
import { canonicalizeCategoryGroupSlug } from './slug.js';
import type {
  AirtableAssetFields,
  AirtableRecord,
  Env,
  LookupMaps,
  SearchRankingConfig,
  SyncSummary,
  TemplateDocumentInput,
} from './types.js';
import { ensureBoolean, ensureNumber, ensureStringArray, nowIso, uniqueStrings } from './utils.js';

const FULL_SYNC_PROGRESS_KEY = 'airtable_full_sync_progress';
const LOOKUP_CACHE_KEY = 'airtable_lookup_cache';

interface FullSyncProgress {
  started_at: string;
  next_offset: string | null;
  fetched_records: number;
  indexed_records: number;
  pages_completed: number;
}

interface LookupCachePayload {
  fetched_at: string;
  styles: Array<{ id: string; name: string; slug: string }>;
  child_categories: Array<{
    id: string;
    name: string;
    slug: string;
    category: string;
    displayName: string;
    parentCategoryName: string;
    categoryGroups: string[];
    relatedKeywords: string[];
  }>;
  tags: Array<{ id: string; name: string; slug: string }>;
}

interface CreatorMetadata {
  recordId: string;
  creatorRecordId: string | null;
  profileUrl: string | null;
  templatesPageUrl: string | null;
  avatarPrimaryUrl: string | null;
  avatarSecondaryUrl: string | null;
  avatarAlt: string | null;
}

function isPublishedTemplate(record: AirtableRecord<AirtableAssetFields>): boolean {
  return record.fields['⚙️🆎Type (Text)'] === 'Template🏗️' && record.fields['🚀Marketplace Status'] === '3️⃣Published🚀';
}

function attachmentUrl(value: unknown): string | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const first = value[0] as { url?: string } | undefined;
  return first?.url ?? null;
}

function attachmentUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (typeof entry === 'object' && entry && 'url' in entry ? String((entry as { url?: string }).url ?? '') : ''))
    .filter(Boolean);
}

function extractUrlValue(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const resolved = extractUrlValue(entry);
      if (resolved) return resolved;
    }
    return null;
  }

  if (value && typeof value === 'object' && 'url' in value) {
    const raw = (value as { url?: unknown }).url;
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
  }

  return null;
}

function extractCreatorRecordId(record: AirtableRecord<AirtableAssetFields>): string | null {
  const formulaValue = record.fields['⚙️🎨Creator Record ID'];
  if (typeof formulaValue === 'string') {
    const trimmed = formulaValue.trim();
    if (trimmed.length > 0) return trimmed;
  }

  if (Array.isArray(formulaValue)) {
    const resolved = formulaValue.map((entry) => String(entry ?? '').trim()).find(Boolean);
    if (resolved) return resolved;
  }

  const linkedCreatorIds = ensureStringArray(record.fields['🎨Creator']);
  return linkedCreatorIds[0] ?? null;
}

function normalizeTemplateRecord(
  record: AirtableRecord<AirtableAssetFields>,
  lookups: LookupMaps,
  rankingConfig: SearchRankingConfig,
  syncedAt: string,
  creatorMetadataById: Map<string, CreatorMetadata>,
): TemplateDocumentInput | null {
  if (!isPublishedTemplate(record)) return null;

  const name = String(record.fields.Name ?? '').trim();
  const templateSlug = String(record.fields['🥞CMS Slug (formula)'] ?? '').trim();
  if (!name || !templateSlug) return null;

  const categoryGroups = ensureStringArray(record.fields['🪣Category Group(s) Display Name']);
  const categoryGroupSlugs = uniqueStrings(
    ensureStringArray(record.fields['🪣Category Group(s) CMS Slug']).map((entry) => canonicalizeCategoryGroupSlug(entry)),
  );

  const childCategories = ensureStringArray(record.fields['🔍Algolia Child Category (🏗️ only)'])
    .map((id) => lookups.childCategories.get(id))
    .filter((value): value is NonNullable<typeof value> => Boolean(value));

  const styles = ensureStringArray(record.fields['ℹ️👘Styles'])
    .map((id) => lookups.styles.get(id))
    .filter((value): value is NonNullable<typeof value> => Boolean(value));

  const tags = ensureStringArray(record.fields['ℹ️🏷️Tags (Multi)'])
    .map((id) => lookups.tags.get(id))
    .filter((value): value is NonNullable<typeof value> => Boolean(value));

  const descriptionShort = String(record.fields['ℹ️Description (Short)'] ?? '').trim();
  const descriptionLongHtml = String(record.fields['ℹ️Description (Long).html'] ?? '').trim();
  const descriptionLongText = truncateSearchText(
    stripHtml(descriptionLongHtml),
    rankingConfig.controls.longDescriptionMaxChars,
  );
  const childCategorySearchTerms = uniqueStrings(
    childCategories.flatMap((entry) => [entry.displayName, ...entry.relatedKeywords]).map((entry) => entry.trim()),
  );
  const templateType =
    typeof record.fields['🥞Template Type (🏗️ only)'] === 'string' ? record.fields['🥞Template Type (🏗️ only)'] : null;
  const creatorRecordId = extractCreatorRecordId(record);
  const creatorMetadata = creatorRecordId ? creatorMetadataById.get(creatorRecordId) ?? null : null;
  const creatorName = typeof record.fields['🎨Creator Name'] === 'string' ? record.fields['🎨Creator Name'] : null;

  return {
    id: record.id,
    templateSlug,
    name,
    listingUrl: extractUrlValue(record.fields['🕸️View Asset Listing']) ?? extractUrlValue(record.fields['🔗Listing URL']),
    previewUrl: typeof record.fields['🔗Preview Site URL'] === 'string' ? record.fields['🔗Preview Site URL'] : null,
    websiteUrl: typeof record.fields['🔗Website URL'] === 'string' ? record.fields['🔗Website URL'] : null,
    creatorRecordId,
    creatorName,
    creatorProfileUrl:
      extractUrlValue(record.fields['🕸️Template Profile Page ']) ??
      creatorMetadata?.templatesPageUrl ??
      creatorMetadata?.profileUrl ??
      null,
    creatorAvatarUrl: creatorMetadata?.avatarPrimaryUrl ?? creatorMetadata?.avatarSecondaryUrl ?? null,
    creatorAvatarAlt: creatorMetadata?.avatarAlt ?? creatorName,
    thumbnailImageUrl: attachmentUrl(record.fields['🖼️Thumbnail Image']),
    thumbnailImageSecondaryUrl: attachmentUrl(record.fields['🖼️Thumbnail Image (Secondary)']),
    carouselImageUrls: attachmentUrls(record.fields['🖼️Carousel Images']),
    descriptionShort,
    descriptionLongHtml,
    descriptionLongText,
    categoryGroups,
    categoryGroupSlugs,
    childCategories: childCategories.map((entry) => entry.displayName),
    childCategorySlugs: childCategories.map((entry) => entry.slug),
    childCategorySearchTerms,
    styles: styles.map((entry) => entry.name),
    styleSlugs: styles.map((entry) => entry.slug),
    tags: tags.map((entry) => entry.name),
    tagSlugs: tags.map((entry) => entry.slug),
    templateType,
    isFree: ensureBoolean(record.fields['Is free?']) || ensureNumber(record.fields['🥞💲Template Price Filter (🏗️ only)']) === 0,
    isFeatured:
      ensureBoolean(record.fields['🥞Is Currently Featured? (🏗️ only)']) ||
      ensureBoolean(record.fields['ℹ️Is Featured? (🖥️, 🏗️only)']),
    isLandingPage: templateType === 'One Page',
    popularityScore: ensureNumber(record.fields['🖌️Popularity Score']),
    uniqueViewers: ensureNumber(record.fields['📋 Unique Viewers']),
    cumulativePurchases: ensureNumber(record.fields['📋 Cumulative Purchases']),
    cumulativeRevenue: ensureNumber(record.fields['📋 Cumulative Revenue']),
    price: ensureNumber(record.fields['🥞💲Template Price Filter (🏗️ only)']),
    publishedDate: typeof record.fields['🚀📅Published Date'] === 'string' ? record.fields['🚀📅Published Date'] : null,
    marketplaceStatus:
      typeof record.fields['🚀Marketplace Status'] === 'string' ? record.fields['🚀Marketplace Status'] : null,
    sourceLastModifiedTime: typeof record.fields['📅LMT'] === 'string' ? record.fields['📅LMT'] : null,
    syncedAt,
  };
}

async function loadCreatorMetadataByAssetRecords(
  env: Env,
  records: Array<AirtableRecord<AirtableAssetFields>>,
): Promise<Map<string, CreatorMetadata>> {
  const creatorRecordIds = uniqueStrings(records.map((record) => extractCreatorRecordId(record) ?? '').filter(Boolean));
  if (creatorRecordIds.length === 0) return new Map();
  return fetchCreatorMetadataByRecordIds(env, creatorRecordIds);
}

function getFullSyncPageLimit(env: Env): number {
  const parsed = Number(env.FULL_SYNC_PAGE_LIMIT ?? '2');
  if (!Number.isFinite(parsed)) return 2;
  return Math.max(1, Math.min(20, Math.floor(parsed)));
}

function getFullSyncPageSize(env: Env): number {
  const parsed = Number(env.FULL_SYNC_PAGE_SIZE ?? '100');
  if (!Number.isFinite(parsed)) return 100;
  return Math.max(1, Math.min(100, Math.floor(parsed)));
}

function getLookupCacheTtlSeconds(env: Env): number {
  const parsed = Number(env.LOOKUP_CACHE_TTL_SECONDS ?? '21600');
  if (!Number.isFinite(parsed)) return 21600;
  return Math.max(0, Math.min(31_536_000, Math.floor(parsed)));
}

function serializeLookupMaps(lookups: LookupMaps): LookupCachePayload {
  return {
    fetched_at: nowIso(),
    styles: Array.from(lookups.styles.values()),
    child_categories: Array.from(lookups.childCategories.values()),
    tags: Array.from(lookups.tags.values()),
  };
}

function deserializeLookupMaps(cache: LookupCachePayload): LookupMaps {
  return {
    styles: new Map(cache.styles.map((entry) => [entry.id, entry])),
    childCategories: new Map(cache.child_categories.map((entry) => [entry.id, entry])),
    tags: new Map(cache.tags.map((entry) => [entry.id, entry])),
  };
}

function isLookupCacheFresh(cache: LookupCachePayload, ttlSeconds: number): boolean {
  if (ttlSeconds <= 0) return false;
  const fetchedAt = Date.parse(cache.fetched_at);
  if (!Number.isFinite(fetchedAt)) return false;
  return fetchedAt + ttlSeconds * 1000 > Date.now();
}

async function loadLookupMapsCached(env: Env): Promise<LookupMaps> {
  const ttlSeconds = getLookupCacheTtlSeconds(env);
  if (ttlSeconds > 0) {
    const cached = await getSyncStateValue<LookupCachePayload>(env.DB, LOOKUP_CACHE_KEY);
    if (cached && isLookupCacheFresh(cached, ttlSeconds)) {
      return deserializeLookupMaps(cached);
    }
  }

  const lookups = await loadLookupMaps(env);
  if (ttlSeconds > 0) {
    await setSyncStateValue(env.DB, LOOKUP_CACHE_KEY, serializeLookupMaps(lookups));
  }
  return lookups;
}

async function runFullSync(env: Env): Promise<SyncSummary> {
  let progress = await getSyncStateValue<FullSyncProgress>(env.DB, FULL_SYNC_PROGRESS_KEY);

  if (!progress) {
    const startedAt = nowIso();
    progress = {
      started_at: startedAt,
      next_offset: null,
      fetched_records: 0,
      indexed_records: 0,
      pages_completed: 0,
    };

    await clearIndex(env.DB);
    await setSyncStateValue(env.DB, FULL_SYNC_PROGRESS_KEY, progress);
  }

  if (!progress) {
    throw new Error('Failed to initialize full sync progress.');
  }

  const rankingConfig = getSearchRankingConfig(env);
  const lookups = await loadLookupMapsCached(env);
  const pageLimit = getFullSyncPageLimit(env);
  const pageSize = getFullSyncPageSize(env);
  const startedAt = progress.started_at;

  let nextOffset = progress.next_offset ?? undefined;

  for (let pageIndex = 0; pageIndex < pageLimit; pageIndex += 1) {
    const page = await fetchPublishedTemplateAssetsPage(env, nextOffset, pageSize, startedAt);
    const creatorMetadataById = await loadCreatorMetadataByAssetRecords(env, page.records);
    const documents = page.records
      .map((record) => normalizeTemplateRecord(record, lookups, rankingConfig, startedAt, creatorMetadataById))
      .filter((value): value is NonNullable<typeof value> => Boolean(value));

    if (documents.length > 0) {
      await upsertTemplateDocuments(env.DB, documents, { removeExistingRelations: false });
    }

    progress = {
      ...progress,
      next_offset: page.offset,
      fetched_records: progress.fetched_records + page.records.length,
      indexed_records: progress.indexed_records + documents.length,
      pages_completed: progress.pages_completed + 1,
    };

    await setSyncStateValue(env.DB, FULL_SYNC_PROGRESS_KEY, progress);

    if (!page.offset) break;
    nextOffset = page.offset;
  }

  if (progress.next_offset) {
    return {
      mode: 'full',
      started_at: progress.started_at,
      finished_at: nowIso(),
      fetched_records: progress.fetched_records,
      indexed_records: progress.indexed_records,
      removed_records: 0,
      cursor: progress.started_at,
      complete: false,
      next_offset: progress.next_offset,
    };
  }

  const finishedAt = nowIso();

  const summary: SyncSummary = {
    mode: 'full',
    started_at: progress.started_at,
    finished_at: finishedAt,
    fetched_records: progress.fetched_records,
    indexed_records: progress.indexed_records,
    removed_records: 0,
    cursor: finishedAt,
    complete: true,
    next_offset: null,
  };

  await setSyncCursor(env.DB, finishedAt);
  await recordSyncSummary(env.DB, summary, 'last_full_sync');
  await deleteSyncStateValue(env.DB, FULL_SYNC_PROGRESS_KEY);
  return summary;
}

async function runIncrementalSync(env: Env): Promise<SyncSummary> {
  const inProgressFullSync = await getSyncStateValue<FullSyncProgress>(env.DB, FULL_SYNC_PROGRESS_KEY);
  if (inProgressFullSync) return runFullSync(env);

  const currentCursor = await getSyncCursor(env.DB);
  if (!currentCursor) return runFullSync(env);

  const startedAt = nowIso();
  const rankingConfig = getSearchRankingConfig(env);
  const [lookups, assets] = await Promise.all([loadLookupMapsCached(env), fetchModifiedAssetsSince(env, currentCursor)]);
  const creatorMetadataById = await loadCreatorMetadataByAssetRecords(env, assets);
  const toUpsert: TemplateDocumentInput[] = [];
  const toDelete: string[] = [];

  for (const record of assets) {
    const normalized = normalizeTemplateRecord(record, lookups, rankingConfig, startedAt, creatorMetadataById);
    if (normalized) {
      toUpsert.push(normalized);
    } else {
      toDelete.push(record.id);
    }
  }

  if (toDelete.length > 0) await deleteTemplateDocuments(env.DB, toDelete);
  if (toUpsert.length > 0) await upsertTemplateDocuments(env.DB, toUpsert);

  const summary: SyncSummary = {
    mode: 'incremental',
    started_at: startedAt,
    finished_at: nowIso(),
    fetched_records: assets.length,
    indexed_records: toUpsert.length,
    removed_records: toDelete.length,
    cursor: startedAt,
  };

  await setSyncCursor(env.DB, startedAt);
  await recordSyncSummary(env.DB, summary, 'last_incremental_sync');
  return summary;
}

export async function syncTemplates(env: Env, mode: 'full' | 'incremental'): Promise<SyncSummary> {
  return mode === 'full' ? runFullSync(env) : runIncrementalSync(env);
}
