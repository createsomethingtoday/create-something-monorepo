import { fetchModifiedAssetsSince, fetchPublishedTemplateAssetPage, loadLookupMaps } from './airtable.js';
import {
  deleteSyncState,
  deleteTemplateDocuments,
  deleteTemplateDocumentsNotSyncedAt,
  getSyncCursor,
  getSyncState,
  recordSyncSummary,
  setSyncCursor,
  setSyncState,
  upsertTemplateDocuments,
} from './db.js';
import { stripHtml } from './html.js';
import { canonicalizeCategoryGroupSlug } from './slug.js';
import type {
  AirtableAssetFields,
  AirtableRecord,
  Env,
  FullSyncProgress,
  LookupMaps,
  SyncOptions,
  SyncSummary,
  TemplateDocumentInput,
} from './types.js';
import { ensureBoolean, ensureNumber, ensureStringArray, nowIso, uniqueStrings } from './utils.js';
import { resolveTemplateListingUrl, resolveTemplateSlug } from './webflow.js';

const FULL_SYNC_PROGRESS_KEY = 'full_sync_progress';
const DEFAULT_MANUAL_FULL_SYNC_PAGES = 1;
const DEFAULT_SCHEDULED_FULL_SYNC_PAGES = 5;

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

function normalizeTemplateRecord(
  record: AirtableRecord<AirtableAssetFields>,
  lookups: LookupMaps,
  syncedAt: string,
): TemplateDocumentInput | null {
  if (!isPublishedTemplate(record)) return null;

  const name = String(record.fields.Name ?? '').trim();
  const listingUrl = resolveTemplateListingUrl(record.fields);
  const templateSlug = resolveTemplateSlug(record.fields, listingUrl);
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
  const templateType =
    typeof record.fields['🥞Template Type (🏗️ only)'] === 'string' ? record.fields['🥞Template Type (🏗️ only)'] : null;

  return {
    id: record.id,
    templateSlug,
    name,
    listingUrl,
    previewUrl: typeof record.fields['🔗Preview Site URL'] === 'string' ? record.fields['🔗Preview Site URL'] : null,
    websiteUrl: typeof record.fields['🔗Website URL'] === 'string' ? record.fields['🔗Website URL'] : null,
    creatorName: typeof record.fields['🎨Creator Name'] === 'string' ? record.fields['🎨Creator Name'] : null,
    thumbnailImageUrl: attachmentUrl(record.fields['🖼️Thumbnail Image']),
    thumbnailImageSecondaryUrl: attachmentUrl(record.fields['🖼️Thumbnail Image (Secondary)']),
    carouselImageUrls: attachmentUrls(record.fields['🖼️Carousel Images']),
    descriptionShort,
    descriptionLongHtml,
    descriptionLongText: stripHtml(descriptionLongHtml),
    categoryGroups,
    categoryGroupSlugs,
    childCategories: childCategories.map((entry) => entry.displayName),
    childCategorySlugs: childCategories.map((entry) => entry.slug),
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
    price: ensureNumber(record.fields['🥞💲Template Price Filter (🏗️ only)']),
    publishedDate: typeof record.fields['🚀📅Published Date'] === 'string' ? record.fields['🚀📅Published Date'] : null,
    marketplaceStatus:
      typeof record.fields['🚀Marketplace Status'] === 'string' ? record.fields['🚀Marketplace Status'] : null,
    sourceLastModifiedTime: typeof record.fields['📅LMT'] === 'string' ? record.fields['📅LMT'] : null,
    syncedAt,
  };
}

async function runFullSync(env: Env): Promise<SyncSummary> {
  return runFullSyncInChunks(env, {
    maxFullSyncPages: DEFAULT_MANUAL_FULL_SYNC_PAGES,
  });
}

function createFullSyncProgress(startedAt: string): FullSyncProgress {
  return {
    started_at: startedAt,
    offset: null,
    fetched_records: 0,
    indexed_records: 0,
    pages_processed: 0,
  };
}

function buildSyncSummary(
  mode: 'full' | 'incremental',
  startedAt: string,
  finishedAt: string,
  fetchedRecords: number,
  indexedRecords: number,
  removedRecords: number,
  cursor: string,
  status: 'in_progress' | 'completed',
): SyncSummary {
  return {
    mode,
    started_at: startedAt,
    finished_at: finishedAt,
    fetched_records: fetchedRecords,
    indexed_records: indexedRecords,
    removed_records: removedRecords,
    cursor,
    status,
  };
}

async function loadOrStartFullSyncProgress(env: Env, restart: boolean): Promise<FullSyncProgress> {
  if (!restart) {
    const existing = await getSyncState<FullSyncProgress>(env.DB, FULL_SYNC_PROGRESS_KEY);
    if (existing) return existing;
  }

  const progress = createFullSyncProgress(nowIso());
  await setSyncState(env.DB, FULL_SYNC_PROGRESS_KEY, progress);
  return progress;
}

async function finalizeFullSync(env: Env, progress: FullSyncProgress): Promise<SyncSummary> {
  const removedRecords = await deleteTemplateDocumentsNotSyncedAt(env.DB, progress.started_at);
  const summary = buildSyncSummary(
    'full',
    progress.started_at,
    nowIso(),
    progress.fetched_records,
    progress.indexed_records,
    removedRecords,
    progress.started_at,
    'completed',
  );

  await setSyncCursor(env.DB, progress.started_at);
  await recordSyncSummary(env.DB, summary, 'last_full_sync');
  await deleteSyncState(env.DB, FULL_SYNC_PROGRESS_KEY);
  return summary;
}

async function runFullSyncInChunks(env: Env, options: SyncOptions): Promise<SyncSummary> {
  const maxPages = Math.max(1, options.maxFullSyncPages ?? DEFAULT_SCHEDULED_FULL_SYNC_PAGES);
  const lookups = await loadLookupMaps(env);
  let progress = await loadOrStartFullSyncProgress(env, options.restartFullSync ?? false);

  for (let index = 0; index < maxPages; index += 1) {
    const page = await fetchPublishedTemplateAssetPage(env, progress.offset ?? undefined);
    const documents = page.records
      .map((record) => normalizeTemplateRecord(record, lookups, progress.started_at))
      .filter((value): value is NonNullable<typeof value> => Boolean(value));

    if (documents.length > 0) {
      await upsertTemplateDocuments(env.DB, documents);
    }

    progress = {
      started_at: progress.started_at,
      offset: page.offset,
      fetched_records: progress.fetched_records + page.records.length,
      indexed_records: progress.indexed_records + documents.length,
      pages_processed: progress.pages_processed + 1,
    };

    await setSyncState(env.DB, FULL_SYNC_PROGRESS_KEY, progress);

    if (!page.offset) {
      return finalizeFullSync(env, progress);
    }
  }

  const summary = buildSyncSummary(
    'full',
    progress.started_at,
    nowIso(),
    progress.fetched_records,
    progress.indexed_records,
    0,
    progress.started_at,
    'in_progress',
  );
  await recordSyncSummary(env.DB, summary, 'last_full_sync');
  return summary;
}

async function runIncrementalSync(env: Env, options: SyncOptions): Promise<SyncSummary> {
  const fullSyncProgress = await getSyncState<FullSyncProgress>(env.DB, FULL_SYNC_PROGRESS_KEY);
  const currentCursor = await getSyncCursor(env.DB);
  if (fullSyncProgress || !currentCursor) {
    return runFullSyncInChunks(env, {
      maxFullSyncPages: options.maxFullSyncPages ?? DEFAULT_SCHEDULED_FULL_SYNC_PAGES,
      restartFullSync: false,
    });
  }

  const startedAt = nowIso();
  const [lookups, assets] = await Promise.all([loadLookupMaps(env), fetchModifiedAssetsSince(env, currentCursor)]);
  const toUpsert: TemplateDocumentInput[] = [];
  const toDelete: string[] = [];

  for (const record of assets) {
    const normalized = normalizeTemplateRecord(record, lookups, startedAt);
    if (normalized) {
      toUpsert.push(normalized);
    } else {
      toDelete.push(record.id);
    }
  }

  if (toDelete.length > 0) await deleteTemplateDocuments(env.DB, toDelete);
  if (toUpsert.length > 0) await upsertTemplateDocuments(env.DB, toUpsert);

  const summary = buildSyncSummary(
    'incremental',
    startedAt,
    nowIso(),
    assets.length,
    toUpsert.length,
    toDelete.length,
    startedAt,
    'completed',
  );

  await setSyncCursor(env.DB, startedAt);
  await recordSyncSummary(env.DB, summary, 'last_incremental_sync');
  return summary;
}

export async function syncTemplates(env: Env, mode: 'full' | 'incremental', options: SyncOptions = {}): Promise<SyncSummary> {
  if (mode === 'full') {
    return runFullSyncInChunks(env, {
      maxFullSyncPages: options.maxFullSyncPages ?? DEFAULT_MANUAL_FULL_SYNC_PAGES,
      restartFullSync: options.restartFullSync ?? false,
    });
  }

  return runIncrementalSync(env, options);
}
