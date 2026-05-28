import { fetchModifiedAssetsSince, fetchPublishedTemplateAssets, loadLookupMaps } from './airtable.js';
import { clearIndex, deleteTemplateDocuments, getSyncCursor, recordSyncSummary, setSyncCursor, upsertTemplateDocuments } from './db.js';
import { stripHtml } from './html.js';
import { canonicalizeCategoryGroupSlug } from './slug.js';
import type { AirtableAssetFields, AirtableRecord, Env, LookupMaps, SyncSummary, TemplateDocumentInput } from './types.js';
import { ensureBoolean, ensureNumber, ensureStringArray, nowIso, uniqueStrings } from './utils.js';

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
  const templateSlug = String(record.fields['🥞CMS Slug (formula)'] ?? '').trim();
  if (!name || !templateSlug) return null;

  const childCategoryLookups = ensureStringArray(record.fields['🔍Algolia Child Category (🏗️ only)'])
    .map((id) => lookups.childCategories.get(id))
    .filter((value): value is NonNullable<typeof value> => Boolean(value));
  const parentCategoryLookups = childCategoryLookups.filter((entry) => entry.isCategoryGroup);
  const childCategories = childCategoryLookups.filter((entry) => !entry.isCategoryGroup);

  const categoryGroups = uniqueStrings([
    ...ensureStringArray(record.fields['🪣Category Group(s) Display Name']),
    ...parentCategoryLookups.map((entry) => entry.displayName),
  ]);
  const categoryGroupSlugs = uniqueStrings([
    ...ensureStringArray(record.fields['🪣Category Group(s) CMS Slug']).map((entry) => canonicalizeCategoryGroupSlug(entry)),
    ...parentCategoryLookups.map((entry) => canonicalizeCategoryGroupSlug(entry.displayName)),
  ]);

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
    listingUrl: typeof record.fields['🔗Listing URL'] === 'string' ? record.fields['🔗Listing URL'] : null,
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
  const startedAt = nowIso();
  const [lookups, assets] = await Promise.all([loadLookupMaps(env), fetchPublishedTemplateAssets(env)]);
  const documents = assets
    .map((record) => normalizeTemplateRecord(record, lookups, startedAt))
    .filter((value): value is NonNullable<typeof value> => Boolean(value));

  await clearIndex(env.DB);
  await upsertTemplateDocuments(env.DB, documents);

  const summary: SyncSummary = {
    mode: 'full',
    started_at: startedAt,
    finished_at: nowIso(),
    fetched_records: assets.length,
    indexed_records: documents.length,
    removed_records: 0,
    cursor: startedAt,
  };

  await setSyncCursor(env.DB, startedAt);
  await recordSyncSummary(env.DB, summary, 'last_full_sync');
  return summary;
}

async function runIncrementalSync(env: Env): Promise<SyncSummary> {
  const currentCursor = await getSyncCursor(env.DB);
  if (!currentCursor) return runFullSync(env);

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
