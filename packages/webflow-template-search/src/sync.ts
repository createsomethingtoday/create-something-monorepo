import { fetchModifiedAssetsSince, fetchPublishedTemplateAssets, fetchPublishedTemplateImageFields, loadLookupMaps } from './airtable.js';
import {
  backfillCreatorAvatars,
  backfillCreatorFieldsByName,
  clearIndex,
  deleteTemplateDocuments,
  getSyncCursor,
  listTemplateImageBackfillRows,
  listTemplateImageRefreshRows,
  recordSyncSummary,
  refreshTemplateImageUrls,
  setSyncCursor,
  templateImageSourceStats,
  type TemplateImageUpdateInput,
  type TemplateImageRefreshRow,
  updateCreatorAvatarsFromWebflow,
  updateTemplateDocumentImages,
  updateTemplateImagesFromWebflow,
  upsertTemplateDocuments,
} from './db.js';
import { fetchWebflowDesignerAvatars, fetchWebflowTemplateImages } from './webflow.js';
import { stripHtml } from './html.js';
import { canonicalizeCategoryGroupSlug } from './slug.js';
import type {
  AirtableAssetFields,
  AirtableRecord,
  Env,
  ImageRefreshSummary,
  LookupMaps,
  SyncSummary,
  TemplateDocumentInput,
  TemplateImageBackfillSummary,
} from './types.js';
import { chunk, clamp, ensureBoolean, ensureNumber, ensureStringArray, nowIso, uniqueStrings } from './utils.js';
import {
  loadWebflowTemplateImageIndex,
  resolvePublishedTemplateImages,
  resolveWebflowTemplateImages,
  stableAttachmentUrl,
  type WebflowTemplateImageIndex,
} from './webflow-assets.js';

const IMAGE_BACKFILL_DEFAULT_LIMIT = 48;
const IMAGE_BACKFILL_MAX_LIMIT = 480;
const IMAGE_BACKFILL_FETCH_BATCH_SIZE = 24;

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

async function resolveAndUpdateTemplateImages(
  db: D1Database,
  rows: TemplateImageRefreshRow[],
  webflowImageIndex: WebflowTemplateImageIndex | null,
  syncedAt: string,
  fetchBatchSize = 6,
): Promise<number> {
  const updates: TemplateImageUpdateInput[] = [];

  for (const rowBatch of chunk(rows, fetchBatchSize)) {
    const resolvedRows = await Promise.all(
      rowBatch.map(async (row) => {
        const webflowImages =
          resolveWebflowTemplateImages(webflowImageIndex, {
            templateSlug: row.templateSlug,
            name: row.name,
          }) ??
          (await resolvePublishedTemplateImages({
            templateSlug: row.templateSlug,
            listingUrl: row.listingUrl,
          }));
        return { row, webflowImages };
      }),
    );

    for (const { row, webflowImages } of resolvedRows) {
      const currentThumbnailUrl = stableAttachmentUrl(row.thumbnailImageUrl);
      const currentSecondaryThumbnailUrl = stableAttachmentUrl(row.thumbnailImageSecondaryUrl);
      const nextThumbnailUrl = webflowImages?.thumbnailImageUrl ?? currentThumbnailUrl;
      const nextSecondaryThumbnailUrl = webflowImages?.thumbnailImageSecondaryUrl ?? currentSecondaryThumbnailUrl;

      if (row.thumbnailImageUrl === nextThumbnailUrl && row.thumbnailImageSecondaryUrl === nextSecondaryThumbnailUrl) {
        continue;
      }

      updates.push({
        id: row.id,
        thumbnailImageUrl: nextThumbnailUrl,
        thumbnailImageSecondaryUrl: nextSecondaryThumbnailUrl,
      });
    }
  }

  return updateTemplateDocumentImages(db, updates, syncedAt);
}

async function refreshIndexedWebflowImages(
  db: D1Database,
  webflowImageIndex: WebflowTemplateImageIndex | null,
  syncedAt: string,
  changedTemplateIds: string[] = [],
): Promise<number> {
  const rows = await listTemplateImageRefreshRows(db, changedTemplateIds);
  return resolveAndUpdateTemplateImages(db, rows, webflowImageIndex, syncedAt);
}

function normalizeTemplateRecord(
  record: AirtableRecord<AirtableAssetFields>,
  lookups: LookupMaps,
  syncedAt: string,
  webflowImageIndex: WebflowTemplateImageIndex | null,
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
  const templateType =
    typeof record.fields['🥞Template Type (🏗️ only)'] === 'string' ? record.fields['🥞Template Type (🏗️ only)'] : null;
  const webflowImages = resolveWebflowTemplateImages(webflowImageIndex, { templateSlug, name });
  const airtableThumbnailUrl = stableAttachmentUrl(attachmentUrl(record.fields['🖼️Thumbnail Image']));
  const airtableSecondaryThumbnailUrl = stableAttachmentUrl(attachmentUrl(record.fields['🖼️Thumbnail Image (Secondary)']));

  return {
    id: record.id,
    templateSlug,
    name,
    listingUrl: typeof record.fields['🔗Listing URL'] === 'string' ? record.fields['🔗Listing URL'] : null,
    previewUrl: typeof record.fields['🔗Preview Site URL'] === 'string' ? record.fields['🔗Preview Site URL'] : null,
    websiteUrl: typeof record.fields['🔗Website URL'] === 'string' ? record.fields['🔗Website URL'] : null,
    creatorName: typeof record.fields['🎨Creator Name'] === 'string' ? record.fields['🎨Creator Name'] : null,
    creatorRecordId: (() => {
      const ids = ensureStringArray(record.fields['🎨Creator']);
      return ids[0] ?? null;
    })(),
    creatorProfileUrl: (() => {
      const ids = ensureStringArray(record.fields['🎨Creator']);
      const creator = ids[0] ? lookups.creators.get(ids[0]) : undefined;
      return creator?.profileUrl || null;
    })(),
    creatorAvatarUrl: (() => {
      const ids = ensureStringArray(record.fields['🎨Creator']);
      const creator = ids[0] ? lookups.creators.get(ids[0]) : undefined;
      return creator?.avatarUrl ?? null;
    })(),
    creatorAvatarAlt: (() => {
      const ids = ensureStringArray(record.fields['🎨Creator']);
      const creator = ids[0] ? lookups.creators.get(ids[0]) : undefined;
      return creator?.avatarAlt ?? (creator?.name ?? null);
    })(),
    thumbnailImageUrl: webflowImages?.thumbnailImageUrl ?? airtableThumbnailUrl,
    thumbnailImageSecondaryUrl: webflowImages?.thumbnailImageSecondaryUrl ?? airtableSecondaryThumbnailUrl,
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
  const startedAt = nowIso();
  const [lookups, assets, webflowImageIndex] = await Promise.all([
    loadLookupMaps(env),
    fetchPublishedTemplateAssets(env),
    loadWebflowTemplateImageIndex(env),
  ]);
  const documents = assets
    .map((record) => normalizeTemplateRecord(record, lookups, startedAt, webflowImageIndex))
    .filter((value): value is NonNullable<typeof value> => Boolean(value));

  await clearIndex(env.DB);
  await upsertTemplateDocuments(env.DB, documents);
  const [backfilledRecords, imageRefreshedRecords] = await Promise.all([
    backfillCreatorFieldsByName(env.DB, startedAt),
    refreshIndexedWebflowImages(env.DB, webflowImageIndex, startedAt),
  ]);

  const summary: SyncSummary = {
    mode: 'full',
    started_at: startedAt,
    finished_at: nowIso(),
    fetched_records: assets.length,
    indexed_records: documents.length,
    removed_records: 0,
    backfilled_records: backfilledRecords,
    image_refreshed_records: imageRefreshedRecords,
    cursor: startedAt,
  };

  await setSyncCursor(env.DB, startedAt);
  await recordSyncSummary(env.DB, summary, 'last_full_sync');
  return summary;
}

// Cloudflare Workers cap at 1,000 subrequests per invocation. Each record needs
// ~10 D1 statements (slug-eviction DELETEs + UPSERT + style/category INSERTs) and
// lookup tables consume ~65 Airtable subrequests. To stay comfortably under the
// limit we target ≤ 600 records per run. Bulk Airtable updates can modify thousands
// of records in a short window, so we cap each invocation to 15 minutes of LMT
// range — even at peak density (~4,918 records over 117 min) that yields ~630 records
// per window, for ~800 total subrequests with safe headroom.
const MAX_SYNC_WINDOW_MS = 15 * 60 * 1000;

async function runIncrementalSync(env: Env): Promise<SyncSummary> {
  const currentCursor = await getSyncCursor(env.DB);
  if (!currentCursor) return runFullSync(env);

  const startedAt = nowIso();
  const now = new Date();
  const windowEnd = new Date(Math.min(new Date(currentCursor).getTime() + MAX_SYNC_WINDOW_MS, now.getTime()));
  const isCaughtUp = windowEnd.getTime() >= now.getTime();
  const windowEndIso = isCaughtUp ? undefined : windowEnd.toISOString();

  const [lookups, assets] = await Promise.all([
    loadLookupMaps(env),
    fetchModifiedAssetsSince(env, currentCursor, windowEndIso),
  ]);
  // Only fetch the Webflow asset index when there are records to process — avoids
  // paginating the full asset list on the majority of 5-min polls that find nothing.
  const webflowImageIndex = assets.length > 0 ? await loadWebflowTemplateImageIndex(env) : null;
  const toUpsert: TemplateDocumentInput[] = [];
  const toDelete: string[] = [];

  for (const record of assets) {
    const normalized = normalizeTemplateRecord(record, lookups, startedAt, webflowImageIndex);
    if (normalized) {
      toUpsert.push(normalized);
    } else {
      toDelete.push(record.id);
    }
  }

  if (toDelete.length > 0) await deleteTemplateDocuments(env.DB, toDelete);
  if (toUpsert.length > 0) await upsertTemplateDocuments(env.DB, toUpsert);
  const imageRefreshedRecords = await refreshIndexedWebflowImages(
    env.DB,
    webflowImageIndex,
    startedAt,
    toUpsert.map((document) => document.id),
  );

  // Creator avatar/profile updates in Airtable don't bump template LMT, so templates
  // linked to creators who recently added avatars are missed by the window query above.
  // Apply a targeted UPDATE pass using the freshly-loaded creator map to patch any
  // template_document whose stored creator fields have drifted from current values.
  const airtableBackfilledRecords = await backfillCreatorAvatars(env.DB, lookups.creators, startedAt);
  const nameBackfilledRecords = await backfillCreatorFieldsByName(env.DB, startedAt);
  const backfilledRecords = airtableBackfilledRecords + nameBackfilledRecords;

  // When catching up, advance cursor to end of the processed window so the next
  // invocation picks up the next 24-hour slice. When caught up, record startedAt.
  const newCursor = isCaughtUp ? startedAt : windowEnd.toISOString();
  const summary: SyncSummary = {
    mode: 'incremental',
    started_at: startedAt,
    finished_at: nowIso(),
    fetched_records: assets.length,
    indexed_records: toUpsert.length,
    removed_records: toDelete.length,
    backfilled_records: backfilledRecords,
    image_refreshed_records: imageRefreshedRecords,
    cursor: newCursor,
  };

  await setSyncCursor(env.DB, newCursor);
  await recordSyncSummary(env.DB, summary, 'last_incremental_sync');
  return summary;
}

export async function syncTemplates(env: Env, mode: 'full' | 'incremental'): Promise<SyncSummary> {
  return mode === 'full' ? runFullSync(env) : runIncrementalSync(env);
}

// Image URL refresh: prefers stable Webflow CDN URLs (never expire) when CMS_READ_ONLY
// is configured. Falls back to Airtable signed URLs (expire ~2h) otherwise.
// Always runs backfillCreatorAvatars from Airtable as a fallback for designers whose
// Webflow CMS item has no sync-record-id (e.g. designers not yet linked in Webflow).
async function runImageUrlRefresh(env: Env): Promise<ImageRefreshSummary> {
  const startedAt = nowIso();

  if (env.CMS_READ_ONLY) {
    // Webflow path: fetch stable CDN URLs for templates and designer avatars.
    const [templateImages, designerAvatars, lookups] = await Promise.all([
      fetchWebflowTemplateImages(env),
      fetchWebflowDesignerAvatars(env),
      loadLookupMaps(env),
    ]);

    const [refreshedImages, refreshedAvatars, backfilledAvatars] = await Promise.all([
      updateTemplateImagesFromWebflow(env.DB, templateImages, startedAt),
      updateCreatorAvatarsFromWebflow(env.DB, designerAvatars, startedAt),
      // Catch any designers missing from Webflow CMS (no sync-record-id) via Airtable.
      backfillCreatorAvatars(env.DB, lookups.creators, startedAt),
    ]);
    const nameBackfilledAvatars = await backfillCreatorFieldsByName(env.DB, startedAt);

    const summary: ImageRefreshSummary = {
      mode: 'image_refresh',
      started_at: startedAt,
      finished_at: nowIso(),
      fetched_records: templateImages.length + designerAvatars.length,
      refreshed_records: refreshedImages + refreshedAvatars,
      backfilled_records: backfilledAvatars + nameBackfilledAvatars,
    };

    await recordSyncSummary(env.DB, summary, 'last_image_refresh');
    return summary;
  }

  // Airtable fallback: re-fetches only image attachment fields (~110 subrequests).
  const [lookups, assets] = await Promise.all([
    loadLookupMaps(env),
    fetchPublishedTemplateImageFields(env),
  ]);

  const records = assets.map((record) => ({
    id: record.id,
    thumbnailImageUrl: attachmentUrl(record.fields['🖼️Thumbnail Image']),
    thumbnailImageSecondaryUrl: attachmentUrl(record.fields['🖼️Thumbnail Image (Secondary)']),
    carouselImageUrls: attachmentUrls(record.fields['🖼️Carousel Images']),
  }));

  const [refreshedImages, backfilledAvatars] = await Promise.all([
    refreshTemplateImageUrls(env.DB, records, startedAt),
    backfillCreatorAvatars(env.DB, lookups.creators, startedAt),
  ]);
  const nameBackfilledAvatars = await backfillCreatorFieldsByName(env.DB, startedAt);

  const summary: ImageRefreshSummary = {
    mode: 'image_refresh',
    started_at: startedAt,
    finished_at: nowIso(),
    fetched_records: assets.length,
    refreshed_records: refreshedImages,
    backfilled_records: backfilledAvatars + nameBackfilledAvatars,
  };

  await recordSyncSummary(env.DB, summary, 'last_image_refresh');
  return summary;
}

export async function refreshImages(env: Env): Promise<ImageRefreshSummary> {
  return runImageUrlRefresh(env);
}

export async function backfillTemplateImages(
  env: Env,
  options: { limit?: number } = {},
): Promise<TemplateImageBackfillSummary> {
  const startedAt = nowIso();
  const requestedLimit = clamp(Math.floor(options.limit ?? IMAGE_BACKFILL_DEFAULT_LIMIT), 1, IMAGE_BACKFILL_MAX_LIMIT);
  const rows = await listTemplateImageBackfillRows(env.DB, requestedLimit);
  const webflowImageIndex = rows.length > 0 ? await loadWebflowTemplateImageIndex(env) : null;
  const updatedRecords = await resolveAndUpdateTemplateImages(
    env.DB,
    rows,
    webflowImageIndex,
    startedAt,
    IMAGE_BACKFILL_FETCH_BATCH_SIZE,
  );
  const imageSourceStats = await templateImageSourceStats(env.DB);

  const summary: TemplateImageBackfillSummary = {
    mode: 'image_backfill',
    started_at: startedAt,
    finished_at: nowIso(),
    requested_limit: requestedLimit,
    scanned_records: rows.length,
    updated_records: updatedRecords,
    remaining_temp_airtable_rows: imageSourceStats.rows_with_temp_airtable_image,
    image_source_stats: imageSourceStats,
  };

  await recordSyncSummary(env.DB, summary, 'last_image_backfill');
  return summary;
}
