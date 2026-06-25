import {
  fetchAssetRecordsByIds,
  fetchModifiedAssetsSince,
  fetchPublishedTemplateAssets,
  fetchPublishedTemplateImageFields,
  fetchRecentlyPublishedTemplateAssets,
  loadLookupMaps,
  DEFAULT_SEARCH_VISIBILITY_FIELDS,
} from './airtable.js';
import {
  backfillCreatorAvatars,
  backfillCreatorFieldsByName,
  backfillCreatorFieldsFromLookup,
  acquireSyncJobLock,
  bumpPublicSearchCacheVersion,
  clearIndex,
  deleteTemplateDocuments,
  filterMissingOrStaleTemplateLookupTargets,
  finishSyncJobLock,
  getSyncCursor,
  heartbeatSyncJobLock,
  listTemplateImageBackfillRows,
  listTemplateImageRefreshRows,
  markTemplateImageBackfillAttempts,
  publicSyncJobRecord,
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
import {
  fetchWebflowDesignerAvatars,
  fetchWebflowDesignerAvatarsForTargets,
  fetchWebflowTemplateImages,
  fetchWebflowTemplateImagesForTargets,
  type WebflowDesignerAvatarRecord,
  type WebflowTemplateImageRecord,
} from './webflow.js';
import { stripHtml } from './html.js';
import { canonicalizeCategoryGroupSlug, normalizeChildCategorySlug } from './slug.js';
import type {
  AirtableAssetFields,
  AirtableRecord,
  CategoryMembershipInput,
  Env,
  ImageRefreshSummary,
  LookupMaps,
  SyncSummary,
  TemplateDocumentInput,
  TemplateImageBackfillSummary,
  TemplateImagePruneSummary,
  CreatorLookupValue,
} from './types.js';
import { chunk, clamp, ensureBoolean, ensureNumber, ensureStringArray, nowIso, uniqueStrings } from './utils.js';
import {
  loadWebflowTemplateImageIndex,
  buildWebflowTemplateImageIndexFromRecords,
  fetchPublishedTemplateStatus,
  resolvePublishedTemplateImages,
  resolveWebflowTemplateIdentity,
  resolveWebflowTemplateOffer,
  resolveWebflowTemplateImages,
  stableAttachmentUrl,
  type WebflowTemplateImageIndex,
} from './webflow-assets.js';

const IMAGE_BACKFILL_DEFAULT_LIMIT = 48;
const IMAGE_BACKFILL_MAX_LIMIT = 480;
const IMAGE_BACKFILL_FETCH_BATCH_SIZE = 24;
const DEFAULT_SYNC_LOCK_TTL_MS = 20 * 60 * 1000;
const FULL_SYNC_LOCK_TTL_MS = 3 * 60 * 60 * 1000;
const SYNC_HEARTBEAT_INTERVAL_MS = 30 * 1000;
const LONG_SYNC_STALE_HEARTBEAT_MS = 10 * 60 * 1000;
const RECORD_SYNC_STALE_HEARTBEAT_MS = 5 * 60 * 1000;
const INCREMENTAL_SYNC_STALE_HEARTBEAT_MS = 10 * 60 * 1000;

interface SyncWarning {
  source: string;
  message: string;
}

type SyncHeartbeat = () => Promise<void>;

function staleHeartbeatMsForMode(mode: string): number | undefined {
  if (mode === 'records') return RECORD_SYNC_STALE_HEARTBEAT_MS;
  if (mode === 'creator_backfill') return RECORD_SYNC_STALE_HEARTBEAT_MS;
  if (mode === 'incremental') return INCREMENTAL_SYNC_STALE_HEARTBEAT_MS;
  if (['full', 'image_refresh', 'creator_refresh', 'image_backfill', 'image_prune'].includes(mode)) {
    return LONG_SYNC_STALE_HEARTBEAT_MS;
  }
  return undefined;
}

async function withPeriodicHeartbeat<T>(heartbeat: SyncHeartbeat, work: Promise<T>): Promise<T> {
  let inFlight: Promise<void> | null = null;
  const timer = setInterval(() => {
    if (inFlight) return;
    inFlight = heartbeat()
      .catch((error) => {
        console.warn('Template sync heartbeat failed while long-running work continued.', error);
      })
      .finally(() => {
        inFlight = null;
      });
  }, SYNC_HEARTBEAT_INTERVAL_MS);

  try {
    return await work;
  } finally {
    clearInterval(timer);
    if (inFlight) await inFlight;
  }
}

export class SyncAlreadyRunningError extends Error {
  readonly activeJob: ReturnType<typeof publicSyncJobRecord>;

  constructor(activeJob: Parameters<typeof publicSyncJobRecord>[0]) {
    super('A template sync job is already running.');
    this.name = 'SyncAlreadyRunningError';
    this.activeJob = publicSyncJobRecord(activeJob);
  }
}

async function runWithSyncJobLock<T>(env: Env, mode: string, task: (heartbeat: SyncHeartbeat) => Promise<T>): Promise<T> {
  const lockResult = await acquireSyncJobLock(env.DB, mode, {
    ttlMs: mode === 'full' ? FULL_SYNC_LOCK_TTL_MS : DEFAULT_SYNC_LOCK_TTL_MS,
    staleHeartbeatMs: staleHeartbeatMsForMode(mode),
  });
  if (!lockResult.acquired) {
    throw new SyncAlreadyRunningError(lockResult.activeJob);
  }

  const heartbeat = () => heartbeatSyncJobLock(env.DB, lockResult.lock);

  try {
    await heartbeat();
    const result = await task(heartbeat);
    await finishSyncJobLock(env.DB, lockResult.lock, { status: 'succeeded', summary: result });
    return result;
  } catch (error) {
    await finishSyncJobLock(env.DB, lockResult.lock, { status: 'failed', error });
    throw error;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function pushWarning(warnings: SyncWarning[], source: string, error: unknown): void {
  const warning = { source, message: errorMessage(error) };
  warnings.push(warning);
  console.warn(`Continuing template sync without ${source}: ${warning.message}`);
}

async function bestEffortWebflowTemplateImageIndex(
  env: Env,
  warnings: SyncWarning[],
  options: { onPage?: () => Promise<void> } = {},
): Promise<WebflowTemplateImageIndex | null> {
  try {
    return await loadWebflowTemplateImageIndex(env, options);
  } catch (error) {
    pushWarning(warnings, 'webflow_template_image_index', error);
    return null;
  }
}

async function bestEffortWebflowDesignerAvatars(
  env: Env,
  warnings: SyncWarning[],
  options: { onPage?: () => Promise<void> } = {},
): Promise<WebflowDesignerAvatarRecord[]> {
  if (!hasWebflowCmsToken(env)) return [];

  try {
    return await fetchWebflowDesignerAvatars(env, options);
  } catch (error) {
    pushWarning(warnings, 'webflow_designer_avatars', error);
    return [];
  }
}

async function bestEffortTargetedWebflowTemplateImages(
  env: Env,
  warnings: SyncWarning[],
  targets: Array<{ id?: string | null; templateSlug?: string | null; name?: string | null }>,
  options: { onPage?: () => Promise<void> } = {},
): Promise<WebflowTemplateImageRecord[]> {
  if (!hasWebflowCmsToken(env)) return [];

  try {
    return await fetchWebflowTemplateImagesForTargets(env, targets, options);
  } catch (error) {
    pushWarning(warnings, 'webflow_template_targets', error);
    return [];
  }
}

async function bestEffortTargetedWebflowDesignerAvatars(
  env: Env,
  warnings: SyncWarning[],
  targets: Array<{ syncRecordId?: string | null; slug?: string | null; name?: string | null }>,
  options: { onPage?: () => Promise<void> } = {},
): Promise<WebflowDesignerAvatarRecord[]> {
  if (!hasWebflowCmsToken(env)) return [];

  try {
    return await fetchWebflowDesignerAvatarsForTargets(env, targets, options);
  } catch (error) {
    pushWarning(warnings, 'webflow_designer_targets', error);
    return [];
  }
}

async function recordSyncWarnings(env: Env, mode: SyncSummary['mode'], startedAt: string, warnings: SyncWarning[]): Promise<void> {
  if (warnings.length === 0) return;

  const occurredAt = nowIso();
  await env.DB.prepare(
    'INSERT INTO sync_state (key, value_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at',
  )
    .bind(
      'last_sync_warning',
      JSON.stringify({
        mode,
        started_at: startedAt,
        occurred_at: occurredAt,
        warnings,
      }),
      occurredAt,
    )
    .run();
}

async function clearSyncWarningsForMode(env: Env, mode: SyncSummary['mode']): Promise<void> {
  const row = await env.DB.prepare('SELECT value_json FROM sync_state WHERE key = ?')
    .bind('last_sync_warning')
    .first<{ value_json: string }>();
  if (!row?.value_json) return;

  let warningMode: unknown = null;
  try {
    warningMode = (JSON.parse(row.value_json) as { mode?: unknown }).mode;
  } catch {
    warningMode = null;
  }
  if (typeof warningMode === 'string' && warningMode !== mode) return;

  await env.DB.prepare('DELETE FROM sync_state WHERE key = ?').bind('last_sync_warning').run();
}

async function recordSyncSummaryAndWarnings(
  env: Env,
  summary: SyncSummary,
  key: 'last_full_sync' | 'last_incremental_sync' | 'last_record_sync',
  warnings: SyncWarning[],
): Promise<void> {
  if (warnings.length > 0) summary.warnings = warnings;
  await recordSyncSummary(env.DB, summary, key);
  if (warnings.length > 0) {
    await recordSyncWarnings(env, summary.mode, summary.started_at, warnings);
  } else {
    await clearSyncWarningsForMode(env, summary.mode);
  }
}

function normalizePolicyText(value: unknown): string {
  if (typeof value === 'string') return value.trim().toLowerCase();
  if (Array.isArray(value)) return value.map(normalizePolicyText).find(Boolean) ?? '';
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const candidate of [record.name, record.label, record.value, record.title, record.text]) {
      const normalized = normalizePolicyText(candidate);
      if (normalized) return normalized;
    }
  }
  return '';
}

function searchVisibility(record: AirtableRecord<AirtableAssetFields>): string {
  for (const field of DEFAULT_SEARCH_VISIBILITY_FIELDS) {
    const value = normalizePolicyText(record.fields[field]);
    if (value) return value;
  }
  return '';
}

function isSearchSuppressed(record: AirtableRecord<AirtableAssetFields>): boolean {
  const visibility = searchVisibility(record);
  if (!visibility) return false;

  if (/\b(searchable|search\s*enabled|listed|marketplace\s*search)\b/.test(visibility) && !visibility.includes('unlisted')) {
    return false;
  }

  return (
    visibility.includes('detail only') ||
    visibility.includes('detail-only') ||
    visibility.includes('unlisted') ||
    visibility.includes('hidden') ||
    visibility.includes('suppress') ||
    visibility.includes('not searchable') ||
    visibility.includes('no search') ||
    visibility.includes('remove from search')
  );
}

function isPublishedTemplate(record: AirtableRecord<AirtableAssetFields>): boolean {
  return (
    record.fields['⚙️🆎Type (Text)'] === 'Template🏗️' &&
    record.fields['🚀Marketplace Status'] === '3️⃣Published🚀' &&
    !isSearchSuppressed(record)
  );
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

function dateFieldValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

async function resolveAndUpdateTemplateImages(
  db: D1Database,
  rows: TemplateImageRefreshRow[],
  webflowImageIndex: WebflowTemplateImageIndex | null,
  syncedAt: string,
  fetchBatchSize = 6,
  options: { onBatch?: SyncHeartbeat } = {},
): Promise<{ updatedCount: number; resolvedIds: string[]; unresolvedIds: string[] }> {
  const updates: TemplateImageUpdateInput[] = [];
  const resolvedIds = new Set<string>();

  for (const rowBatch of chunk(rows, fetchBatchSize)) {
    const resolvedRows = await Promise.all(
      rowBatch.map(async (row) => {
        const webflowImages = resolveWebflowTemplateImages(webflowImageIndex, {
          templateSlug: row.templateSlug,
          name: row.name,
        });
        const publishedImages = await resolvePublishedTemplateImages({
          templateSlug: row.templateSlug,
          listingUrl: row.listingUrl,
        });
        return { row, webflowImages, publishedImages };
      }),
    );

    for (const { row, webflowImages, publishedImages } of resolvedRows) {
      const currentThumbnailUrl = stableAttachmentUrl(row.thumbnailImageUrl);
      const currentSecondaryThumbnailUrl = stableAttachmentUrl(row.thumbnailImageSecondaryUrl);
      const nextThumbnailUrl = publishedImages?.thumbnailImageUrl ?? webflowImages?.thumbnailImageUrl ?? currentThumbnailUrl;
      const nextSecondaryThumbnailUrl =
        webflowImages?.thumbnailImageSecondaryUrl ??
        (currentSecondaryThumbnailUrl === nextThumbnailUrl ? null : currentSecondaryThumbnailUrl);

      if (nextThumbnailUrl || nextSecondaryThumbnailUrl) {
        resolvedIds.add(row.id);
      }

      if (row.thumbnailImageUrl === nextThumbnailUrl && row.thumbnailImageSecondaryUrl === nextSecondaryThumbnailUrl) {
        continue;
      }

      updates.push({
        id: row.id,
        thumbnailImageUrl: nextThumbnailUrl,
        thumbnailImageSecondaryUrl: nextSecondaryThumbnailUrl,
      });
    }

    await options.onBatch?.();
  }

  const updatedCount = await updateTemplateDocumentImages(db, updates, syncedAt, { onBatch: options.onBatch });
  const unresolvedIds = rows.map((row) => row.id).filter((id) => !resolvedIds.has(id));
  return { updatedCount, resolvedIds: Array.from(resolvedIds), unresolvedIds };
}

async function refreshIndexedWebflowImages(
  db: D1Database,
  webflowImageIndex: WebflowTemplateImageIndex | null,
  syncedAt: string,
  changedTemplateIds: string[] = [],
  options: { includeStale?: boolean; onBatch?: SyncHeartbeat } = {},
): Promise<number> {
  const rows = await listTemplateImageRefreshRows(db, changedTemplateIds, { includeStale: options.includeStale });
  const result = await resolveAndUpdateTemplateImages(db, rows, webflowImageIndex, syncedAt, 6, { onBatch: options.onBatch });
  return result.updatedCount;
}

function hasWebflowCmsToken(env: Env): boolean {
  return Boolean(env.CMS_READ_ONLY?.trim() || env.WEBFLOW_API_TOKEN?.trim());
}

function normalizeCreatorName(name: string): string {
  return name.trim().toLowerCase();
}

function isArchiveCreatorSlug(slug: string | null | undefined): boolean {
  return Boolean(slug?.endsWith('-archive'));
}

function creatorProfileUrlForSlug(slug: string | null | undefined): string | null {
  return slug ? `https://webflow.com/templates/designers/${slug}` : null;
}

function airtableCreatorFallbackMap(
  creators: Map<string, CreatorLookupValue>,
  webflowDesigners: WebflowDesignerAvatarRecord[],
): Map<string, CreatorLookupValue> {
  if (creators.size === 0 || webflowDesigners.length === 0) return creators;

  const webflowIds = new Set<string>();
  const webflowNames = new Set<string>();

  for (const designer of webflowDesigners) {
    if (designer.syncRecordId) webflowIds.add(designer.syncRecordId);
    webflowNames.add(normalizeCreatorName(designer.name));
  }

  const fallbackCreators = new Map<string, CreatorLookupValue>();
  for (const [creatorId, creator] of creators) {
    if (webflowIds.has(creatorId)) continue;
    if (webflowNames.has(normalizeCreatorName(creator.name))) continue;
    fallbackCreators.set(creatorId, creator);
  }

  return fallbackCreators;
}

interface WebflowDesignerAvatarIndex {
  bySyncRecordId: Map<string, WebflowDesignerAvatarRecord>;
  byName: Map<string, WebflowDesignerAvatarRecord>;
}

function buildWebflowDesignerAvatarIndex(records: WebflowDesignerAvatarRecord[]): WebflowDesignerAvatarIndex | null {
  if (records.length === 0) return null;

  const bySyncRecordId = new Map<string, WebflowDesignerAvatarRecord>();
  const byName = new Map<string, WebflowDesignerAvatarRecord>();

  for (const record of records) {
    if (record.syncRecordId) bySyncRecordId.set(record.syncRecordId, record);
    byName.set(normalizeCreatorName(record.name), record);
  }

  return { bySyncRecordId, byName };
}

function resolveCreatorMetadata(
  record: AirtableRecord<AirtableAssetFields>,
  lookups: LookupMaps,
  webflowDesignerIndex: WebflowDesignerAvatarIndex | null,
) {
  const ids = ensureStringArray(record.fields['🎨Creator']);
  const creatorRecordId = ids[0] ?? null;
  const creatorName = typeof record.fields['🎨Creator Name'] === 'string' ? record.fields['🎨Creator Name'].trim() : '';
  const airtableCreator = creatorRecordId ? lookups.creators.get(creatorRecordId) : undefined;
  const webflowCreator =
    (creatorRecordId ? webflowDesignerIndex?.bySyncRecordId.get(creatorRecordId) : undefined) ??
    (creatorName ? webflowDesignerIndex?.byName.get(normalizeCreatorName(creatorName)) : undefined);
  const webflowSlug = webflowCreator?.slug || null;
  const airtableSlug = airtableCreator?.slug || null;
  const shouldUseAirtableProfile =
    isArchiveCreatorSlug(webflowSlug) && Boolean(airtableSlug) && !isArchiveCreatorSlug(airtableSlug);
  const creatorSlug = shouldUseAirtableProfile ? airtableSlug : webflowSlug || airtableSlug || null;
  const creatorProfileUrl = shouldUseAirtableProfile
    ? airtableCreator?.profileUrl || creatorProfileUrlForSlug(airtableSlug)
    : webflowCreator?.profileUrl || airtableCreator?.profileUrl || null;

  return {
    creatorRecordId,
    creatorSlug,
    creatorProfileUrl,
    creatorAvatarUrl: webflowCreator?.avatarUrl ?? airtableCreator?.avatarUrl ?? null,
    creatorAvatarAlt: webflowCreator?.avatarAlt ?? airtableCreator?.avatarAlt ?? (airtableCreator?.name ?? null),
  };
}

interface NormalizedChildCategory {
  displayName: string;
  slug: string;
  categoryGroupName: string | null;
  categoryGroupSlug: string | null;
}

function uniqueCategoryMemberships(categories: NormalizedChildCategory[]): CategoryMembershipInput[] {
  const memberships = new Map<string, CategoryMembershipInput>();

  for (const category of categories) {
    if (!category.categoryGroupName || !category.categoryGroupSlug) continue;
    const key = `${category.categoryGroupSlug}:${category.slug}`;
    if (memberships.has(key)) continue;
    memberships.set(key, {
      childCategoryName: category.displayName,
      childCategorySlug: category.slug,
      categoryGroupName: category.categoryGroupName,
      categoryGroupSlug: category.categoryGroupSlug,
    });
  }

  return Array.from(memberships.values());
}

function uniqueCategoryGroupPairs(
  memberships: CategoryMembershipInput[],
  fallbackNames: string[],
  fallbackSlugs: string[],
): { names: string[]; slugs: string[] } {
  const groups = new Map<string, string>();

  for (const membership of memberships) {
    if (!groups.has(membership.categoryGroupSlug)) {
      groups.set(membership.categoryGroupSlug, membership.categoryGroupName);
    }
  }

  if (groups.size === 0) {
    fallbackSlugs.forEach((slug, index) => {
      if (!slug || groups.has(slug)) return;
      groups.set(slug, fallbackNames[index] ?? slug);
    });
  }

  return {
    names: Array.from(groups.values()),
    slugs: Array.from(groups.keys()),
  };
}

function normalizeAssetChildCategories(record: AirtableRecord<AirtableAssetFields>, lookups: LookupMaps): NormalizedChildCategory[] {
  const ids = ensureStringArray(record.fields['ℹ️🪣Categories']);
  const names = ensureStringArray(record.fields['ℹ️🪣Categories (Text)']);
  const slugs = ensureStringArray(record.fields['🥞CMS Slug (from ℹ️🪣Categories)']);
  const categories = new Map<string, NormalizedChildCategory>();

  const total = Math.max(ids.length, names.length, slugs.length);
  for (let index = 0; index < total; index += 1) {
    const lookup = ids[index] ? lookups.childCategories.get(ids[index]) : undefined;
    const displayName = (lookup?.name ?? names[index] ?? '').trim();
    if (!displayName) continue;

    const slug = normalizeChildCategorySlug(displayName, slugs[index] ?? lookup?.slug);
    if (!slug || categories.has(slug)) continue;

    categories.set(slug, {
      displayName,
      slug,
      categoryGroupName: lookup?.categoryGroupName ?? null,
      categoryGroupSlug: lookup?.categoryGroupSlug ?? null,
    });
  }

  return Array.from(categories.values());
}

function normalizeTemplateRecord(
  record: AirtableRecord<AirtableAssetFields>,
  lookups: LookupMaps,
  syncedAt: string,
  webflowImageIndex: WebflowTemplateImageIndex | null,
  webflowDesignerIndex: WebflowDesignerAvatarIndex | null = null,
): TemplateDocumentInput | null {
  if (!isPublishedTemplate(record)) return null;

  const name = String(record.fields.Name ?? '').trim();
  const sourceTemplateSlug = String(record.fields['🥞CMS Slug'] ?? record.fields['🥞CMS Slug (formula)'] ?? '').trim();
  if (!name || !sourceTemplateSlug) return null;

  const categoryGroups = ensureStringArray(record.fields['🪣Category Group(s) Display Name']);
  const categoryGroupSlugs = uniqueStrings(
    ensureStringArray(record.fields['🪣Category Group(s) CMS Slug']).map((entry) => canonicalizeCategoryGroupSlug(entry)),
  );

  const childCategories = normalizeAssetChildCategories(record, lookups);
  const categoryMemberships = uniqueCategoryMemberships(childCategories);
  const normalizedCategoryGroups = uniqueCategoryGroupPairs(categoryMemberships, categoryGroups, categoryGroupSlugs);

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
  const webflowIdentity = resolveWebflowTemplateIdentity(webflowImageIndex, { templateSlug: sourceTemplateSlug, name });
  const templateSlug = webflowIdentity?.templateSlug ?? sourceTemplateSlug;
  const webflowImages = resolveWebflowTemplateImages(webflowImageIndex, { templateSlug: sourceTemplateSlug, name });
  const airtableThumbnailUrl = stableAttachmentUrl(attachmentUrl(record.fields['🖼️Thumbnail Image']));
  const airtableSecondaryThumbnailUrl = stableAttachmentUrl(attachmentUrl(record.fields['🖼️Thumbnail Image (Secondary)']));
  const airtablePrice = ensureNumber(record.fields['🥞💲Template Price Filter (🏗️ only)']);
  const webflowOffer = resolveWebflowTemplateOffer(webflowImageIndex, { templateSlug, name });
  const price = webflowOffer?.price ?? airtablePrice;
  const isFree = webflowOffer?.isFree ?? (price === null ? ensureBoolean(record.fields['Is free?']) : price === 0);
  const creator = resolveCreatorMetadata(record, lookups, webflowDesignerIndex);

  return {
    id: record.id,
    templateSlug,
    name,
    listingUrl: webflowIdentity?.listingUrl ?? (typeof record.fields['🔗Listing URL'] === 'string' ? record.fields['🔗Listing URL'] : null),
    previewUrl: typeof record.fields['🔗Preview Site URL'] === 'string' ? record.fields['🔗Preview Site URL'] : null,
    websiteUrl: typeof record.fields['🔗Website URL'] === 'string' ? record.fields['🔗Website URL'] : null,
    creatorName: typeof record.fields['🎨Creator Name'] === 'string' ? record.fields['🎨Creator Name'] : null,
    creatorRecordId: creator.creatorRecordId,
    creatorSlug: creator.creatorSlug,
    creatorProfileUrl: creator.creatorProfileUrl,
    creatorAvatarUrl: creator.creatorAvatarUrl,
    creatorAvatarAlt: creator.creatorAvatarAlt,
    thumbnailImageUrl: webflowImages?.thumbnailImageUrl ?? airtableThumbnailUrl,
    thumbnailImageSecondaryUrl: webflowImages?.thumbnailImageSecondaryUrl ?? airtableSecondaryThumbnailUrl,
    carouselImageUrls: attachmentUrls(record.fields['🖼️Carousel Images']),
    descriptionShort,
    descriptionLongHtml,
    descriptionLongText: stripHtml(descriptionLongHtml),
    categoryGroups: normalizedCategoryGroups.names,
    categoryGroupSlugs: normalizedCategoryGroups.slugs,
    childCategories: childCategories.map((entry) => entry.displayName),
    childCategorySlugs: childCategories.map((entry) => entry.slug),
    categoryMemberships,
    styles: styles.map((entry) => entry.name),
    styleSlugs: styles.map((entry) => entry.slug),
    tags: tags.map((entry) => entry.name),
    tagSlugs: tags.map((entry) => entry.slug),
    templateType,
    isFree,
    isFeatured:
      ensureBoolean(record.fields['🥞Is Currently Featured? (🏗️ only)']) ||
      ensureBoolean(record.fields['ℹ️Is Featured? (🖥️, 🏗️only)']),
    isLandingPage: templateType === 'One Page',
    popularityScore: ensureNumber(record.fields['🖌️Popularity Score']),
    uniqueViewers: ensureNumber(record.fields['📋 Unique Viewers']),
    cumulativePurchases: ensureNumber(record.fields['📋 Cumulative Purchases']),
    price,
    publishedDate: dateFieldValue(record.fields['👀📅Decision Date (Override)']) ?? dateFieldValue(record.fields['🚀📅Published Date']),
    marketplaceStatus:
      typeof record.fields['🚀Marketplace Status'] === 'string' ? record.fields['🚀Marketplace Status'] : null,
    sourceLastModifiedTime: typeof record.fields['📅LMT'] === 'string' ? record.fields['📅LMT'] : null,
    syncedAt,
  };
}

async function runFullSync(env: Env, heartbeat: SyncHeartbeat): Promise<SyncSummary> {
  const startedAt = nowIso();
  const warnings: SyncWarning[] = [];
  const [lookups, assets, webflowImageIndex, webflowDesigners] = await withPeriodicHeartbeat(
    heartbeat,
    Promise.all([
      loadLookupMaps(env),
      fetchPublishedTemplateAssets(env),
      bestEffortWebflowTemplateImageIndex(env, warnings, { onPage: heartbeat }),
      bestEffortWebflowDesignerAvatars(env, warnings, { onPage: heartbeat }),
    ]),
  );
  await heartbeat();
  const webflowDesignerIndex = buildWebflowDesignerAvatarIndex(webflowDesigners);
  const documents = assets
    .map((record) => normalizeTemplateRecord(record, lookups, startedAt, webflowImageIndex, webflowDesignerIndex))
    .filter((value): value is NonNullable<typeof value> => Boolean(value));

  await withPeriodicHeartbeat(heartbeat, clearIndex(env.DB));
  await heartbeat();
  await withPeriodicHeartbeat(heartbeat, upsertTemplateDocuments(env.DB, documents));
  await heartbeat();
  const webflowCreatorRecords = await withPeriodicHeartbeat(
    heartbeat,
    updateCreatorAvatarsFromWebflow(env.DB, webflowDesigners, startedAt),
  );
  await heartbeat();
  const [nameBackfilledRecords, lookupBackfilledRecords, imageRefreshedRecords] = await withPeriodicHeartbeat(
    heartbeat,
    Promise.all([
      backfillCreatorFieldsByName(env.DB, startedAt),
      backfillCreatorFieldsFromLookup(env.DB, lookups.creators, startedAt),
      refreshIndexedWebflowImages(env.DB, webflowImageIndex, startedAt, [], { onBatch: heartbeat }),
    ]),
  );
  await heartbeat();

  const summary: SyncSummary = {
    mode: 'full',
    started_at: startedAt,
    finished_at: nowIso(),
    fetched_records: assets.length,
    indexed_records: documents.length,
    removed_records: 0,
    backfilled_records: nameBackfilledRecords + lookupBackfilledRecords + webflowCreatorRecords,
    image_refreshed_records: imageRefreshedRecords,
    cursor: startedAt,
  };

  await setSyncCursor(env.DB, startedAt);
  if (summary.indexed_records > 0 || summary.removed_records > 0 || summary.image_refreshed_records > 0 || summary.backfilled_records > 0) {
    await bumpPublicSearchCacheVersion(env.DB, summary.mode);
  }
  await recordSyncSummaryAndWarnings(env, summary, 'last_full_sync', warnings);
  return summary;
}

// Cloudflare Workers cap per-invocation work, and frequent cron runs are more
// reliable when they advance stale cursors in bounded slices. Each incremental
// invocation scans at most two hours of empty 15-minute windows before returning.
// Bulk Airtable updates can modify thousands of records in a short window, so
// each scanned window remains capped to 15 minutes of LMT range.
const MAX_SYNC_WINDOW_MS = 15 * 60 * 1000;
const MAX_EMPTY_SYNC_WINDOWS_PER_RUN = 8;
const MAX_INCREMENTAL_RECORDS_PER_RUN = 600;
// Stale catch-up reads a small oldest-first Airtable page before applying the
// tighter write cap. Without the fetch cap, a bulk-edited 15-minute window can
// page thousands of records and die before the cursor advances.
const MAX_STALE_INCREMENTAL_FETCH_RECORDS_PER_RUN = 100;
const MAX_STALE_INCREMENTAL_RECORDS_PER_RUN = 80;
const INCREMENTAL_WRITE_BATCH_SIZE = 12;
const RECENT_PUBLISHED_SWEEP_LOOKBACK_DAYS = 21;
const RECENT_PUBLISHED_SWEEP_LIMIT = 50;

function resolveSyncWindow(cursor: string, now: Date): { end: Date; until: string | undefined; isCaughtUp: boolean } {
  const end = new Date(Math.min(new Date(cursor).getTime() + MAX_SYNC_WINDOW_MS, now.getTime()));
  const isCaughtUp = end.getTime() >= now.getTime();
  return {
    end,
    until: isCaughtUp ? undefined : end.toISOString(),
    isCaughtUp,
  };
}

function sourceLastModifiedTime(record: AirtableRecord<AirtableAssetFields>): string | null {
  const value = record.fields['📅LMT'];
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function recentPublishedSweepSinceDate(now: Date): string {
  const since = new Date(now.getTime() - RECENT_PUBLISHED_SWEEP_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  return since.toISOString().slice(0, 10);
}

function templateLookupTargets(records: Array<AirtableRecord<AirtableAssetFields>>) {
  return records.map((record) => ({
    id: record.id,
    templateSlug: String(record.fields['🥞CMS Slug'] ?? record.fields['🥞CMS Slug (formula)'] ?? '').trim() || null,
    name: String(record.fields.Name ?? '').trim() || null,
  }));
}

async function fetchChangedRecentPublishedAssets(
  env: Env,
  now: Date,
  alreadyQueuedRecords: Array<AirtableRecord<AirtableAssetFields>>,
): Promise<Array<AirtableRecord<AirtableAssetFields>>> {
  const queuedIds = new Set(alreadyQueuedRecords.map((record) => record.id));
  const queuedSlugs = new Set(templateLookupTargets(alreadyQueuedRecords).map((target) => target.templateSlug).filter(Boolean));
  const recentAssets = await fetchRecentlyPublishedTemplateAssets(
    env,
    recentPublishedSweepSinceDate(now),
    RECENT_PUBLISHED_SWEEP_LIMIT,
  );
  const candidates = recentAssets.filter((record) => {
    const target = templateLookupTargets([record])[0];
    return !queuedIds.has(record.id) && (!target.templateSlug || !queuedSlugs.has(target.templateSlug));
  });
  if (candidates.length === 0) return [];

  const missingOrStaleTargets = await filterMissingOrStaleTemplateLookupTargets(
    env.DB,
    candidates.map((record) => {
      const target = templateLookupTargets([record])[0];
      return { id: record.id, templateSlug: target.templateSlug, sourceLastModifiedTime: sourceLastModifiedTime(record) };
    }),
  );
  const changedIds = new Set(missingOrStaleTargets.map((target) => target.id));
  return candidates.filter((record) => changedIds.has(record.id));
}

function templateImageBackfillTargets(rows: TemplateImageRefreshRow[]) {
  return rows.map((row) => ({
    id: row.id,
    templateSlug: row.templateSlug || null,
    name: row.name || null,
  }));
}

function designerLookupTargets(records: Array<AirtableRecord<AirtableAssetFields>>, lookups: LookupMaps) {
  const targets: Array<{ syncRecordId?: string | null; slug?: string | null; name?: string | null }> = [];
  for (const record of records) {
    const creatorRecordId = ensureStringArray(record.fields['🎨Creator'])[0] ?? null;
    const creatorName = typeof record.fields['🎨Creator Name'] === 'string' ? record.fields['🎨Creator Name'].trim() : '';
    const creator = creatorRecordId ? lookups.creators.get(creatorRecordId) : undefined;
    targets.push({
      syncRecordId: creatorRecordId,
      slug: creator?.slug || null,
      name: creator?.name || creatorName || null,
    });
  }
  return targets;
}

function boundStaleChangedAssets(
  assets: Array<AirtableRecord<AirtableAssetFields>>,
): { assets: Array<AirtableRecord<AirtableAssetFields>>; cursor: string | null } {
  if (assets.length <= MAX_STALE_INCREMENTAL_RECORDS_PER_RUN) return { assets, cursor: null };

  const boundary = sourceLastModifiedTime(assets[MAX_STALE_INCREMENTAL_RECORDS_PER_RUN - 1]);
  if (!boundary) return { assets: assets.slice(0, MAX_STALE_INCREMENTAL_RECORDS_PER_RUN), cursor: null };

  const bounded = assets.filter((record) => {
    const modifiedAt = sourceLastModifiedTime(record);
    return modifiedAt !== null && modifiedAt <= boundary;
  });

  return { assets: bounded, cursor: boundary };
}

async function deleteTemplateDocumentsInChunks(db: D1Database, ids: string[], heartbeat: SyncHeartbeat): Promise<void> {
  for (const idBatch of chunk(ids, 100)) {
    await deleteTemplateDocuments(db, idBatch);
    await heartbeat();
  }
}

async function upsertTemplateDocumentsInChunks(
  db: D1Database,
  documents: TemplateDocumentInput[],
  heartbeat: SyncHeartbeat,
): Promise<void> {
  for (const documentBatch of chunk(documents, INCREMENTAL_WRITE_BATCH_SIZE)) {
    await upsertTemplateDocuments(db, documentBatch);
    await heartbeat();
  }
}

async function runIncrementalSync(env: Env, heartbeat: SyncHeartbeat): Promise<SyncSummary> {
  const currentCursor = await getSyncCursor(env.DB);
  if (!currentCursor) return runFullSync(env, heartbeat);

  const startedAt = nowIso();
  const warnings: SyncWarning[] = [];
  const now = new Date();
  let scanCursor = currentCursor;
  let windowEnd = new Date(currentCursor);
  let isCaughtUp = false;
  let assets: Array<AirtableRecord<AirtableAssetFields>> = [];
  let skippedEmptyWindows = 0;
  let scannedWindows = 0;
  let boundedCursor: string | null = null;
  let hitStaleFetchLimit = false;
  let recentPublishedRecords = 0;

  while (scannedWindows < MAX_EMPTY_SYNC_WINDOWS_PER_RUN) {
    const syncWindow = resolveSyncWindow(scanCursor, now);
    const staleFetchLimit = syncWindow.isCaughtUp ? undefined : MAX_STALE_INCREMENTAL_FETCH_RECORDS_PER_RUN;
    const windowAssets = await fetchModifiedAssetsSince(env, scanCursor, syncWindow.until, staleFetchLimit);
    await heartbeat();
    scannedWindows += 1;
    windowEnd = syncWindow.end;
    isCaughtUp = syncWindow.isCaughtUp;
    hitStaleFetchLimit =
      hitStaleFetchLimit || (typeof staleFetchLimit === 'number' && windowAssets.length >= staleFetchLimit);

    if (windowAssets.length === 0 && !syncWindow.isCaughtUp) {
      skippedEmptyWindows += 1;
    } else {
      assets.push(...windowAssets);
    }

    if (isCaughtUp || hitStaleFetchLimit || assets.length >= MAX_INCREMENTAL_RECORDS_PER_RUN) {
      break;
    }

    scanCursor = syncWindow.end.toISOString();
  }

  if (!isCaughtUp && (hitStaleFetchLimit || assets.length > MAX_STALE_INCREMENTAL_RECORDS_PER_RUN)) {
    const bounded = boundStaleChangedAssets(assets);
    assets = bounded.assets;
    boundedCursor = bounded.cursor;
    if (boundedCursor) windowEnd = new Date(boundedCursor);
  }

  if (!hitStaleFetchLimit) {
    const recentPublishedAssets = await fetchChangedRecentPublishedAssets(env, now, assets);
    await heartbeat();
    if (recentPublishedAssets.length > 0) {
      assets.push(...recentPublishedAssets);
      recentPublishedRecords = recentPublishedAssets.length;
    }
  }

  const toUpsert: TemplateDocumentInput[] = [];
  const toDelete: string[] = [];
  let webflowImageIndex: Awaited<ReturnType<typeof loadWebflowTemplateImageIndex>> = null;

  if (assets.length > 0) {
    const lookups = await loadLookupMaps(env);
    const [loadedWebflowImageIndex, webflowDesigners] = await withPeriodicHeartbeat(
      heartbeat,
      Promise.all([
        bestEffortTargetedWebflowTemplateImages(env, warnings, templateLookupTargets(assets), { onPage: heartbeat }).then((records) =>
          buildWebflowTemplateImageIndexFromRecords(records),
        ),
        bestEffortTargetedWebflowDesignerAvatars(env, warnings, designerLookupTargets(assets, lookups), { onPage: heartbeat }),
      ]),
    );
    await heartbeat();
    webflowImageIndex = loadedWebflowImageIndex;
    const webflowDesignerIndex = buildWebflowDesignerAvatarIndex(webflowDesigners);

    for (const record of assets) {
      const normalized = normalizeTemplateRecord(record, lookups, startedAt, webflowImageIndex, webflowDesignerIndex);
      if (normalized) {
        toUpsert.push(normalized);
      } else {
        toDelete.push(record.id);
      }
    }
  }

  if (toDelete.length > 0) await deleteTemplateDocumentsInChunks(env.DB, toDelete, heartbeat);
  if (toUpsert.length > 0) await upsertTemplateDocumentsInChunks(env.DB, toUpsert, heartbeat);
  await heartbeat();
  const imageRefreshedRecords = 0;
  await heartbeat();

  // Keep the frequent 5-minute incremental path limited to changed template rows.
  // Creator metadata is repaired by Webflow designer webhooks and image refresh,
  // while normalized changed templates already receive lookup creator fields.
  const backfilledRecords = 0;

  // When catching up, advance cursor to the processed window or bounded record
  // high-water mark. When caught up, record startedAt.
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
    skipped_empty_windows: skippedEmptyWindows,
    recent_published_records: recentPublishedRecords,
  };

  await setSyncCursor(env.DB, newCursor);
  if (summary.indexed_records > 0 || summary.removed_records > 0 || summary.image_refreshed_records > 0) {
    await bumpPublicSearchCacheVersion(env.DB, summary.mode);
  }
  await recordSyncSummaryAndWarnings(env, summary, 'last_incremental_sync', warnings);
  return summary;
}

export async function syncTemplates(env: Env, mode: 'full' | 'incremental'): Promise<SyncSummary> {
  return runWithSyncJobLock(env, mode, (heartbeat) =>
    mode === 'full' ? runFullSync(env, heartbeat) : runIncrementalSync(env, heartbeat),
  );
}

export async function syncTemplateRecordsByIds(env: Env, recordIds: string[]): Promise<SyncSummary> {
  return runWithSyncJobLock(env, 'records', async (heartbeat) => {
    const startedAt = nowIso();
    const warnings: SyncWarning[] = [];
    const uniqueRecordIds = uniqueStrings(recordIds.map((id) => id.trim()).filter(Boolean));
    const [lookups, assets] = await Promise.all([loadLookupMaps(env), fetchAssetRecordsByIds(env, uniqueRecordIds)]);
    await heartbeat();
    const [webflowTemplateRecords, webflowDesigners] = await Promise.all([
      bestEffortTargetedWebflowTemplateImages(env, warnings, templateLookupTargets(assets), { onPage: heartbeat }),
      bestEffortTargetedWebflowDesignerAvatars(env, warnings, designerLookupTargets(assets, lookups), { onPage: heartbeat }),
    ]);
    await heartbeat();
    const webflowImageIndex = buildWebflowTemplateImageIndexFromRecords(webflowTemplateRecords);
    const webflowDesignerIndex = buildWebflowDesignerAvatarIndex(webflowDesigners);
    const documents: TemplateDocumentInput[] = [];
    const toDelete: string[] = [];

    for (const record of assets) {
      const normalized = normalizeTemplateRecord(record, lookups, startedAt, webflowImageIndex, webflowDesignerIndex);
      if (normalized) {
        documents.push(normalized);
      } else {
        toDelete.push(record.id);
      }
    }

    if (toDelete.length > 0) await deleteTemplateDocuments(env.DB, toDelete);
    if (documents.length > 0) await upsertTemplateDocuments(env.DB, documents);
    await heartbeat();
    const imageRefreshedRecords = documents.length
      ? await refreshIndexedWebflowImages(
          env.DB,
          webflowImageIndex,
          startedAt,
          documents.map((document) => document.id),
          { includeStale: false, onBatch: heartbeat },
        )
      : 0;
    await heartbeat();
    const [nameBackfilledRecords, lookupBackfilledRecords] = await Promise.all([
      backfillCreatorFieldsByName(env.DB, startedAt, { documentIds: documents.map((document) => document.id) }),
      backfillCreatorFieldsFromLookup(env.DB, lookups.creators, startedAt, {
        documentIds: documents.map((document) => document.id),
      }),
    ]);
    await heartbeat();

    const summary: SyncSummary = {
      mode: 'records',
      started_at: startedAt,
      finished_at: nowIso(),
      fetched_records: assets.length,
      indexed_records: documents.length,
      removed_records: toDelete.length,
      backfilled_records: nameBackfilledRecords + lookupBackfilledRecords,
      image_refreshed_records: imageRefreshedRecords,
      cursor: startedAt,
    };

    if (summary.indexed_records > 0 || summary.removed_records > 0 || summary.image_refreshed_records > 0 || summary.backfilled_records > 0) {
      await bumpPublicSearchCacheVersion(env.DB, summary.mode);
    }
    await recordSyncSummaryAndWarnings(env, summary, 'last_record_sync', warnings);
    return summary;
  });
}

// Image URL refresh: prefers stable Webflow CMS/CDN URLs (never expire) when a
// Webflow API token is configured. Falls back to Airtable signed URLs otherwise.
// Airtable remains the fallback for designers missing from Webflow CMS.
async function runImageUrlRefresh(env: Env, heartbeat: SyncHeartbeat): Promise<ImageRefreshSummary> {
  const startedAt = nowIso();

  if (hasWebflowCmsToken(env)) {
    // Webflow path: fetch stable CDN URLs for templates and designer avatars.
    const [templateImages, designerAvatars, lookups] = await withPeriodicHeartbeat(
      heartbeat,
      Promise.all([
        fetchWebflowTemplateImages(env, { onPage: heartbeat }),
        fetchWebflowDesignerAvatars(env, { onPage: heartbeat }),
        loadLookupMaps(env),
      ]),
    );
    await heartbeat();
    const airtableFallbackCreators = airtableCreatorFallbackMap(lookups.creators, designerAvatars);

    const [refreshedImages, refreshedAvatars, backfilledAvatars, lookupBackfilledAvatars] = await withPeriodicHeartbeat(
      heartbeat,
      Promise.all([
        updateTemplateImagesFromWebflow(env.DB, templateImages, startedAt, { onBatch: heartbeat }),
        updateCreatorAvatarsFromWebflow(env.DB, designerAvatars, startedAt, { onBatch: heartbeat }),
        backfillCreatorAvatars(env.DB, airtableFallbackCreators, startedAt, { overwriteExisting: true, onBatch: heartbeat }),
        backfillCreatorFieldsFromLookup(env.DB, lookups.creators, startedAt, { onBatch: heartbeat }),
      ]),
    );
    await heartbeat();
    const nameBackfilledAvatars = await backfillCreatorFieldsByName(env.DB, startedAt);
    await heartbeat();

    const summary: ImageRefreshSummary = {
      mode: 'image_refresh',
      started_at: startedAt,
      finished_at: nowIso(),
      fetched_records: templateImages.length + designerAvatars.length,
      refreshed_records: refreshedImages + refreshedAvatars,
      backfilled_records: backfilledAvatars + lookupBackfilledAvatars + nameBackfilledAvatars,
    };

    await recordSyncSummary(env.DB, summary, 'last_image_refresh');
    return summary;
  }

  // Airtable fallback: re-fetches only image attachment fields (~110 subrequests).
  const [lookups, assets] = await withPeriodicHeartbeat(
    heartbeat,
    Promise.all([loadLookupMaps(env), fetchPublishedTemplateImageFields(env)]),
  );
  await heartbeat();

  const records = assets.map((record) => ({
    id: record.id,
    thumbnailImageUrl: attachmentUrl(record.fields['🖼️Thumbnail Image']),
    thumbnailImageSecondaryUrl: attachmentUrl(record.fields['🖼️Thumbnail Image (Secondary)']),
    carouselImageUrls: attachmentUrls(record.fields['🖼️Carousel Images']),
  }));

  const [refreshedImages, backfilledAvatars, lookupBackfilledAvatars] = await withPeriodicHeartbeat(
    heartbeat,
    Promise.all([
      refreshTemplateImageUrls(env.DB, records, startedAt, { onBatch: heartbeat }),
      backfillCreatorAvatars(env.DB, lookups.creators, startedAt, { overwriteExisting: true, onBatch: heartbeat }),
      backfillCreatorFieldsFromLookup(env.DB, lookups.creators, startedAt, { onBatch: heartbeat }),
    ]),
  );
  await heartbeat();
  const nameBackfilledAvatars = await backfillCreatorFieldsByName(env.DB, startedAt);
  await heartbeat();

  const summary: ImageRefreshSummary = {
    mode: 'image_refresh',
    started_at: startedAt,
    finished_at: nowIso(),
    fetched_records: assets.length,
    refreshed_records: refreshedImages,
    backfilled_records: backfilledAvatars + lookupBackfilledAvatars + nameBackfilledAvatars,
  };

  await recordSyncSummary(env.DB, summary, 'last_image_refresh');
  return summary;
}

export async function refreshImages(env: Env): Promise<ImageRefreshSummary> {
  return runWithSyncJobLock(env, 'image_refresh', (heartbeat) => runImageUrlRefresh(env, heartbeat));
}

function filterCreatorLookupMap(lookups: LookupMaps, creatorNames: string[]): Map<string, CreatorLookupValue> {
  const requestedNames = new Set(creatorNames.map((name) => normalizeCreatorName(name)).filter(Boolean));
  if (requestedNames.size === 0) return lookups.creators;

  const filtered = new Map<string, CreatorLookupValue>();
  for (const [id, creator] of lookups.creators.entries()) {
    if (requestedNames.has(normalizeCreatorName(creator.name))) filtered.set(id, creator);
  }
  return filtered;
}

async function runCreatorFieldBackfill(
  env: Env,
  heartbeat: SyncHeartbeat,
  creatorNames: string[] = [],
): Promise<ImageRefreshSummary> {
  const startedAt = nowIso();
  const lookups = await loadLookupMaps(env);
  const creators = filterCreatorLookupMap(lookups, creatorNames);
  await heartbeat();
  const lookupBackfilledRecords = await backfillCreatorFieldsFromLookup(env.DB, creators, startedAt);
  await heartbeat();

  const summary: ImageRefreshSummary = {
    mode: 'creator_backfill',
    started_at: startedAt,
    finished_at: nowIso(),
    fetched_records: creators.size,
    refreshed_records: 0,
    backfilled_records: lookupBackfilledRecords,
  };

  await recordSyncSummary(env.DB, summary, 'last_creator_backfill');
  return summary;
}

export async function backfillCreatorMetadata(env: Env, creatorNames: string[] = []): Promise<ImageRefreshSummary> {
  return runWithSyncJobLock(env, 'creator_backfill', (heartbeat) => runCreatorFieldBackfill(env, heartbeat, creatorNames));
}

async function runCreatorProfileRefresh(env: Env, heartbeat: SyncHeartbeat): Promise<ImageRefreshSummary> {
  const startedAt = nowIso();
  if (!hasWebflowCmsToken(env)) {
    throw new Error('A Webflow CMS read token is not configured.');
  }

  const [designerAvatars, lookups] = await withPeriodicHeartbeat(
    heartbeat,
    Promise.all([fetchWebflowDesignerAvatars(env, { onPage: heartbeat }), loadLookupMaps(env)]),
  );
  await heartbeat();
  const [refreshedAvatars, lookupBackfilledAvatars] = await withPeriodicHeartbeat(
    heartbeat,
    Promise.all([
      updateCreatorAvatarsFromWebflow(env.DB, designerAvatars, startedAt, {
        matchByName: false,
      }),
      backfillCreatorFieldsFromLookup(env.DB, lookups.creators, startedAt),
    ]),
  );
  await heartbeat();

  const summary: ImageRefreshSummary = {
    mode: 'creator_refresh',
    started_at: startedAt,
    finished_at: nowIso(),
    fetched_records: designerAvatars.length,
    refreshed_records: refreshedAvatars,
    backfilled_records: lookupBackfilledAvatars,
  };

  await recordSyncSummary(env.DB, summary, 'last_creator_refresh');
  return summary;
}

async function runForcedCreatorProfileRefresh(
  env: Env,
  heartbeat: SyncHeartbeat,
  creatorNames: string[] = [],
): Promise<ImageRefreshSummary> {
  const startedAt = nowIso();
  if (!hasWebflowCmsToken(env)) {
    throw new Error('A Webflow CMS read token is not configured.');
  }

  const requestedNames = new Set(creatorNames.map((name) => normalizeCreatorName(name)).filter(Boolean));
  const designerAvatars = await withPeriodicHeartbeat(
    heartbeat,
    requestedNames.size > 0
      ? fetchWebflowDesignerAvatarsForTargets(
          env,
          creatorNames.map((name) => ({ name })),
        )
      : fetchWebflowDesignerAvatars(env),
  );
  await heartbeat();
  const refreshedAvatars = await updateCreatorAvatarsFromWebflow(env.DB, designerAvatars, startedAt, {
    forceMatchByName: true,
  });

  const summary: ImageRefreshSummary = {
    mode: 'creator_refresh',
    started_at: startedAt,
    finished_at: nowIso(),
    fetched_records: designerAvatars.length,
    refreshed_records: refreshedAvatars,
    backfilled_records: 0,
  };

  await recordSyncSummary(env.DB, summary, 'last_creator_refresh');
  return summary;
}

export async function refreshCreatorProfiles(env: Env): Promise<ImageRefreshSummary> {
  return runWithSyncJobLock(env, 'creator_refresh', (heartbeat) => runCreatorProfileRefresh(env, heartbeat));
}

export async function forceRefreshCreatorProfiles(env: Env, creatorNames: string[] = []): Promise<ImageRefreshSummary> {
  return runWithSyncJobLock(env, 'creator_refresh', (heartbeat) => runForcedCreatorProfileRefresh(env, heartbeat, creatorNames));
}

export async function backfillTemplateImages(
  env: Env,
  options: { limit?: number; templateSlugs?: string[] } = {},
): Promise<TemplateImageBackfillSummary> {
  return runWithSyncJobLock(env, 'image_backfill', async (heartbeat) => {
    const startedAt = nowIso();
    const requestedLimit = clamp(Math.floor(options.limit ?? IMAGE_BACKFILL_DEFAULT_LIMIT), 1, IMAGE_BACKFILL_MAX_LIMIT);
    const requestedTemplateSlugs = uniqueStrings((options.templateSlugs ?? []).map((slug) => slug.trim()).filter(Boolean));
    const rows = await listTemplateImageBackfillRows(env.DB, requestedLimit, requestedTemplateSlugs, {
      includeStable: requestedTemplateSlugs.length > 0,
    });
    const warnings: SyncWarning[] = [];
    const webflowImageRecords =
      rows.length > 0
        ? await withPeriodicHeartbeat(
            heartbeat,
            bestEffortTargetedWebflowTemplateImages(env, warnings, templateImageBackfillTargets(rows), { onPage: heartbeat }),
          )
        : [];
    const webflowImageIndex = buildWebflowTemplateImageIndexFromRecords(webflowImageRecords);
    await heartbeat();
    const imageResolution = await resolveAndUpdateTemplateImages(
      env.DB,
      rows,
      webflowImageIndex,
      startedAt,
      IMAGE_BACKFILL_FETCH_BATCH_SIZE,
      { onBatch: heartbeat },
    );
    await markTemplateImageBackfillAttempts(env.DB, rows, imageResolution.resolvedIds, startedAt);
    await heartbeat();
    const imageSourceStats = await templateImageSourceStats(env.DB);
    await heartbeat();

    const summary: TemplateImageBackfillSummary = {
      mode: 'image_backfill',
      started_at: startedAt,
      finished_at: nowIso(),
      requested_limit: requestedLimit,
      requested_template_slugs: requestedTemplateSlugs.length > 0 ? requestedTemplateSlugs : undefined,
      scanned_records: rows.length,
      attempted_records: rows.length,
      updated_records: imageResolution.updatedCount,
      unresolved_records: imageResolution.unresolvedIds.length,
      remaining_temp_airtable_rows: imageSourceStats.rows_with_temp_airtable_image,
      image_source_stats: imageSourceStats,
    };

    await recordSyncSummary(env.DB, summary, 'last_image_backfill');
    return summary;
  });
}

export async function pruneMissingTemplateImages(
  env: Env,
  options: { limit?: number; templateSlugs?: string[] } = {},
): Promise<TemplateImagePruneSummary> {
  return runWithSyncJobLock(env, 'image_prune', async (heartbeat) => {
    const startedAt = nowIso();
    const requestedLimit = clamp(Math.floor(options.limit ?? IMAGE_BACKFILL_DEFAULT_LIMIT), 1, IMAGE_BACKFILL_MAX_LIMIT);
    const requestedTemplateSlugs = uniqueStrings((options.templateSlugs ?? []).map((slug) => slug.trim()).filter(Boolean));
    const rows = await listTemplateImageBackfillRows(env.DB, requestedLimit, requestedTemplateSlugs);
    const warnings: SyncWarning[] = [];
    const webflowImageRecords =
      rows.length > 0
        ? await withPeriodicHeartbeat(
            heartbeat,
            bestEffortTargetedWebflowTemplateImages(env, warnings, templateImageBackfillTargets(rows), { onPage: heartbeat }),
          )
        : [];
    const webflowImageIndex = buildWebflowTemplateImageIndexFromRecords(webflowImageRecords);
    await heartbeat();
    const idsToDelete: string[] = [];
    const skippedRecords: TemplateImagePruneSummary['skipped_records'] = [];

    for (const rowBatch of chunk(rows, IMAGE_BACKFILL_FETCH_BATCH_SIZE)) {
      const checkedRows = await Promise.all(
        rowBatch.map(async (row) => {
          const webflowImages = resolveWebflowTemplateImages(webflowImageIndex, {
            templateSlug: row.templateSlug,
            name: row.name,
          });
          if (webflowImages?.thumbnailImageUrl) {
            return { row, status: null, reason: 'webflow_image_found' as const };
          }

          const pageStatus = await fetchPublishedTemplateStatus({
            templateSlug: row.templateSlug,
            listingUrl: row.listingUrl,
          });
          return {
            row,
            status: pageStatus.status,
            reason: pageStatus.status === 404 ? null : ('listing_not_404' as const),
          };
        }),
      );
      await heartbeat();

      for (const checked of checkedRows) {
        if (checked.reason === null) {
          idsToDelete.push(checked.row.id);
        } else {
          skippedRecords.push({
            id: checked.row.id,
            name: checked.row.name,
            template_slug: checked.row.templateSlug,
            status: checked.status,
            reason: checked.reason,
          });
        }
      }
    }

    await deleteTemplateDocuments(env.DB, idsToDelete);
    await heartbeat();
    const imageSourceStats = await templateImageSourceStats(env.DB);
    await heartbeat();
    const summary: TemplateImagePruneSummary = {
      mode: 'image_prune',
      started_at: startedAt,
      finished_at: nowIso(),
      requested_limit: requestedLimit,
      requested_template_slugs: requestedTemplateSlugs.length > 0 ? requestedTemplateSlugs : undefined,
      scanned_records: rows.length,
      pruned_records: idsToDelete.length,
      skipped_records: skippedRecords,
      image_source_stats: imageSourceStats,
    };

    await recordSyncSummary(env.DB, summary, 'last_image_prune');
    return summary;
  });
}
