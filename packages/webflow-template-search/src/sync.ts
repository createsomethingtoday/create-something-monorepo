import {
  fetchModifiedAssetsSince,
  fetchPublishedTemplateAssets,
  fetchPublishedTemplateAssetsPage,
  fetchTemplateAssetBySlug,
  loadLookupMaps,
} from './airtable.js';
import {
  clearIndex,
  deleteTemplateDocuments,
  getSyncCursor,
  recordSyncSummary,
  setSyncCursor,
  upsertChildCategoryTaxonomy,
  upsertTaxonomyMetadata,
  upsertTemplateDocuments,
} from './db.js';
import { stripHtml } from './html.js';
import { canonicalizeCategoryGroupSlug, deriveChildCategorySlug } from './slug.js';
import type {
  AirtableAssetFields,
  AirtableRecord,
  ChildCategoryLookupValue,
  ChildCategoryTaxonomyInput,
  Env,
  LookupMaps,
  SyncSummary,
  TaxonomyMetadataInput,
  TemplateDocumentInput,
} from './types.js';
import { chunk, ensureBoolean, ensureNumber, ensureStringArray, nowIso, parseJsonArray, uniqueStrings } from './utils.js';

function isPublishedTemplate(record: AirtableRecord<AirtableAssetFields>): boolean {
  return record.fields['⚙️🆎Type (Text)'] === 'Template🏗️' && record.fields['🚀Marketplace Status'] === '3️⃣Published🚀';
}

function firstString(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null;
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry === 'string' && entry.trim()) return entry.trim();
    }
  }
  return null;
}

function resolveTemplateSlug(fields: AirtableAssetFields): string {
  return (
    firstString(fields['🥞CMS Slug']) ??
    firstString(fields['Slug (from 🥞CMS Sync Records)']) ??
    firstString(fields['🥞CMS Slug (formula)']) ??
    ''
  );
}

function normalizeListingUrl(value: unknown, templateSlug: string): string | null {
  if (!templateSlug) return null;

  const canonical = `https://webflow.com/templates/html/${templateSlug}`;
  const raw = firstString(value);
  if (!raw) return canonical;

  try {
    const url = new URL(raw);
    const pathMatch = url.pathname.match(/\/templates\/html\/([^/]+)/);
    if (pathMatch?.[1] === templateSlug) return canonical;
  } catch {
    // Fall back to the slug-derived canonical URL below.
  }

  return canonical;
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

function uniqueChildCategoryLookups(entries: ChildCategoryLookupValue[]): ChildCategoryLookupValue[] {
  const seen = new Set<string>();
  const result: ChildCategoryLookupValue[] = [];
  for (const entry of entries) {
    if (seen.has(entry.slug)) continue;
    seen.add(entry.slug);
    result.push(entry);
  }
  return result;
}

function titleFromSlug(slug: string): string {
  return slug
    .replace(/-websites?$/, '')
    .split('-')
    .filter(Boolean)
    .map((part) => (part.length <= 3 ? part.toUpperCase() : `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`))
    .join(' ');
}

function buildCmsChildCategoryLookup(
  record: AirtableRecord<AirtableAssetFields>,
  lookups: LookupMaps,
  name: string,
  slug: string,
): ChildCategoryLookupValue | null {
  const existing = slug ? lookups.childCategories.get(slug) : lookups.childCategories.get(name);
  if (existing && !existing.isCategoryGroup && (!slug || existing.slug === slug)) return existing;

  const displayName = name || titleFromSlug(slug);
  const childSlug = slug || deriveChildCategorySlug(displayName);
  if (!displayName || !childSlug) return null;

  const categoryGroupNames = ensureStringArray(record.fields['🪣Category Group(s) Display Name']);
  const categoryGroupSlugs = ensureStringArray(record.fields['🪣Category Group(s) CMS Slug']).map((entry) =>
    canonicalizeCategoryGroupSlug(entry),
  );
  const parentCategoryName = categoryGroupNames[0] ?? '';

  return {
    id: `cms:${childSlug}`,
    name: displayName,
    slug: childSlug,
    category: displayName,
    displayName,
    parentCategoryName,
    descriptionShort: '',
    categoryGroups: categoryGroupSlugs,
    relatedKeywords: [],
    tier: null,
    type: null,
    isCategoryGroup: false,
  };
}

function resolveChildCategoryLookups(
  record: AirtableRecord<AirtableAssetFields>,
  lookups: LookupMaps,
): ChildCategoryLookupValue[] {
  const algoliaLookups = ensureStringArray(record.fields['🔍Algolia Child Category (🏗️ only)'])
    .map((value) => lookups.childCategories.get(value))
    .filter((value): value is ChildCategoryLookupValue => Boolean(value));

  const cmsCategoryNames = ensureStringArray(record.fields['ℹ️🪣Categories (Text)']);
  const cmsCategorySlugs = ensureStringArray(record.fields['🥞CMS Slug (from ℹ️🪣Categories)']);
  const cmsLookups = Array.from({ length: Math.max(cmsCategoryNames.length, cmsCategorySlugs.length) })
    .map((_, index) =>
      buildCmsChildCategoryLookup(record, lookups, cmsCategoryNames[index] ?? '', cmsCategorySlugs[index] ?? ''),
    )
    .filter((value): value is ChildCategoryLookupValue => Boolean(value));

  if (cmsLookups.length > 0) {
    return uniqueChildCategoryLookups(cmsLookups);
  }

  return uniqueChildCategoryLookups(algoliaLookups);
}

async function filterConflictingTemplateSlugs(
  db: D1Database,
  documents: TemplateDocumentInput[],
): Promise<{ documents: TemplateDocumentInput[]; skippedSlugConflicts: number }> {
  const safeDocuments: TemplateDocumentInput[] = [];
  let skippedSlugConflicts = 0;
  const seenSlugs = new Set<string>();

  for (const document of documents) {
    if (seenSlugs.has(document.templateSlug)) {
      skippedSlugConflicts += 1;
      continue;
    }
    seenSlugs.add(document.templateSlug);

    const conflict = await db
      .prepare('SELECT id FROM template_documents WHERE template_slug = ? AND id != ?')
      .bind(document.templateSlug, document.id)
      .first<{ id: string }>();

    if (conflict) {
      skippedSlugConflicts += 1;
      continue;
    }

    safeDocuments.push(document);
  }

  return { documents: safeDocuments, skippedSlugConflicts };
}

function normalizeTemplateRecord(
  record: AirtableRecord<AirtableAssetFields>,
  lookups: LookupMaps,
  syncedAt: string,
): TemplateDocumentInput | null {
  if (!isPublishedTemplate(record)) return null;

  const name = String(record.fields.Name ?? '').trim();
  const templateSlug = resolveTemplateSlug(record.fields);
  if (!name || !templateSlug) return null;

  const childCategoryLookups = resolveChildCategoryLookups(record, lookups);
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
    listingUrl: normalizeListingUrl(record.fields['🔗Listing URL'], templateSlug),
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

function normalizeChildCategoryTaxonomy(lookups: LookupMaps): ChildCategoryTaxonomyInput[] {
  const rows: ChildCategoryTaxonomyInput[] = [];
  const seen = new Set<string>();
  const parentGroups = new Map<string, { name: string; slug: string }>();

  for (const entry of lookups.childCategories.values()) {
    if (!entry.isCategoryGroup) continue;

    const slug = canonicalizeCategoryGroupSlug(entry.displayName);
    const group = { name: entry.displayName, slug };
    for (const alias of [entry.category, entry.displayName, entry.name, entry.parentCategoryName]) {
      if (alias) parentGroups.set(alias, group);
    }
  }

  for (const entry of lookups.childCategories.values()) {
    if (entry.isCategoryGroup) continue;

    const groupNames = entry.categoryGroups.length > 0 ? entry.categoryGroups : [entry.parentCategoryName].filter(Boolean);

    for (const groupName of groupNames) {
      const parentGroup = parentGroups.get(groupName);
      const normalizedGroupSlug = parentGroup?.slug ?? canonicalizeCategoryGroupSlug(groupName);
      if (!normalizedGroupSlug) continue;

      const key = `${entry.slug}:${normalizedGroupSlug}`;
      if (seen.has(key)) continue;
      seen.add(key);

      rows.push({
        childCategorySlug: entry.slug,
        childCategoryName: entry.displayName,
        categoryGroupSlug: normalizedGroupSlug,
        categoryGroupName: parentGroup?.name ?? groupName,
      });
    }
  }

  return rows;
}

function buildParentGroupLookup(
  lookups: LookupMaps,
): Map<string, { name: string; slug: string; descriptionShort: string; descriptionLandingPage: string; relatedKeywords: string[] }> {
  const parentGroups = new Map<
    string,
    { name: string; slug: string; descriptionShort: string; descriptionLandingPage: string; relatedKeywords: string[] }
  >();

  for (const entry of lookups.categoryGroups.values()) {
    const group = {
      name: entry.displayName,
      slug: entry.slug,
      descriptionShort: entry.descriptionShort,
      descriptionLandingPage: entry.descriptionLandingPage,
      relatedKeywords: entry.relatedKeywords,
    };
    for (const alias of [entry.id, entry.name, entry.displayName, entry.slug, entry.cmsSlug ?? '']) {
      if (alias) parentGroups.set(alias, group);
    }
  }

  for (const entry of lookups.childCategories.values()) {
    if (!entry.isCategoryGroup) continue;

    const existing = parentGroups.get(entry.displayName) ?? parentGroups.get(canonicalizeCategoryGroupSlug(entry.displayName));
    const group = existing ?? {
      name: entry.displayName,
      slug: canonicalizeCategoryGroupSlug(entry.displayName),
      descriptionShort: entry.descriptionShort,
      descriptionLandingPage: '',
      relatedKeywords: entry.relatedKeywords,
    };

    for (const alias of [entry.id, entry.category, entry.displayName, entry.name, entry.parentCategoryName, group.slug]) {
      if (alias) parentGroups.set(alias, group);
    }
  }

  return parentGroups;
}

function normalizeTaxonomyMetadata(lookups: LookupMaps, syncedAt: string): TaxonomyMetadataInput[] {
  const rows: TaxonomyMetadataInput[] = [];
  const seen = new Set<string>();
  const parentGroups = buildParentGroupLookup(lookups);

  for (const group of new Set(parentGroups.values())) {
    if (!group.slug) continue;
    const key = `category_group:${group.slug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      taxonomyType: 'category_group',
      slug: group.slug,
      name: group.name,
      descriptionShort: group.descriptionShort,
      descriptionLandingPage: group.descriptionLandingPage,
      relatedKeywords: group.relatedKeywords,
      parentCategoryGroupSlug: null,
      parentCategoryGroupName: null,
      syncedAt,
    });
  }

  for (const entry of lookups.childCategories.values()) {
    if (entry.isCategoryGroup) continue;

    const parentGroup = parentGroups.get(entry.parentCategoryName);
    const parentCategoryGroupSlug = parentGroup?.slug ?? (entry.parentCategoryName ? canonicalizeCategoryGroupSlug(entry.parentCategoryName) : null);
    const parentCategoryGroupName = parentGroup?.name ?? entry.parentCategoryName ?? null;
    const key = `child_category:${entry.slug}`;
    if (seen.has(key)) continue;
    seen.add(key);

    rows.push({
      taxonomyType: 'child_category',
      slug: entry.slug,
      name: entry.displayName,
      descriptionShort: entry.descriptionShort,
      descriptionLandingPage: '',
      relatedKeywords: entry.relatedKeywords,
      parentCategoryGroupSlug,
      parentCategoryGroupName,
      syncedAt,
    });
  }

  return rows;
}

async function runFullSync(env: Env): Promise<SyncSummary> {
  const startedAt = nowIso();
  const [lookups, assets] = await Promise.all([loadLookupMaps(env), fetchPublishedTemplateAssets(env)]);
  const documents = assets
    .map((record) => normalizeTemplateRecord(record, lookups, startedAt))
    .filter((value): value is NonNullable<typeof value> => Boolean(value));

  await clearIndex(env.DB);
  await upsertChildCategoryTaxonomy(env.DB, normalizeChildCategoryTaxonomy(lookups));
  await upsertTaxonomyMetadata(env.DB, normalizeTaxonomyMetadata(lookups, startedAt));
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
  await upsertChildCategoryTaxonomy(env.DB, normalizeChildCategoryTaxonomy(lookups));
  await upsertTaxonomyMetadata(env.DB, normalizeTaxonomyMetadata(lookups, startedAt));
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

export interface TemplateSlugSyncSummary {
  mode: 'template-slug-sync';
  template_slug: string;
  started_at: string;
  finished_at: string;
  fetched_records: number;
  indexed_records: number;
  removed_records: number;
  skipped_slug_conflicts: number;
  status: 'indexed' | 'removed' | 'not_found' | 'skipped_conflict';
}

export async function syncTemplateBySlug(env: Env, templateSlug: string): Promise<TemplateSlugSyncSummary> {
  const normalizedSlug = templateSlug.trim();
  if (!normalizedSlug) {
    throw new Error('template slug is required.');
  }

  const startedAt = nowIso();
  const [lookups, assets] = await Promise.all([loadLookupMaps(env), fetchTemplateAssetBySlug(env, normalizedSlug)]);
  const normalized = assets
    .map((record) => normalizeTemplateRecord(record, lookups, startedAt))
    .filter((value): value is NonNullable<typeof value> => Boolean(value));

  let status: TemplateSlugSyncSummary['status'] = 'not_found';
  let skippedSlugConflicts = 0;
  if (normalized.length > 0) {
    const filtered = await filterConflictingTemplateSlugs(env.DB, normalized);
    skippedSlugConflicts = filtered.skippedSlugConflicts;
    await upsertChildCategoryTaxonomy(env.DB, normalizeChildCategoryTaxonomy(lookups));
    await upsertTaxonomyMetadata(env.DB, normalizeTaxonomyMetadata(lookups, startedAt));
    if (filtered.documents.length > 0) await upsertTemplateDocuments(env.DB, filtered.documents);
    status = filtered.documents.length > 0 ? 'indexed' : 'skipped_conflict';
  } else if (assets.length > 0) {
    await deleteTemplateDocuments(env.DB, assets.map((record) => record.id));
    status = 'removed';
  }

  const summary: TemplateSlugSyncSummary = {
    mode: 'template-slug-sync',
    template_slug: normalizedSlug,
    started_at: startedAt,
    finished_at: nowIso(),
    fetched_records: assets.length,
    indexed_records: normalized.length - skippedSlugConflicts,
    removed_records: status === 'removed' ? assets.length : 0,
    skipped_slug_conflicts: skippedSlugConflicts,
    status,
  };

  await recordSyncSummary(env.DB, summary, `template_slug_sync:${normalizedSlug}`);
  return summary;
}

export interface CmsCategoryBackfillSummary {
  mode: 'cms-category-backfill';
  started_at: string;
  finished_at: string;
  fetched_records: number;
  indexed_records: number;
  skipped_slug_conflicts: number;
  offset: string | null;
  next_offset: string | null;
  has_next_page: boolean;
}

export async function backfillCmsCategoryPage(
  env: Env,
  offset: string | null,
): Promise<CmsCategoryBackfillSummary> {
  const startedAt = nowIso();
  const [lookups, page] = await Promise.all([loadLookupMaps(env), fetchPublishedTemplateAssetsPage(env, offset ?? undefined)]);
  const documents = page.records
    .map((record) => normalizeTemplateRecord(record, lookups, startedAt))
    .filter((value): value is NonNullable<typeof value> => Boolean(value));
  const filtered = await filterConflictingTemplateSlugs(env.DB, documents);

  await upsertChildCategoryTaxonomy(env.DB, normalizeChildCategoryTaxonomy(lookups));
  await upsertTaxonomyMetadata(env.DB, normalizeTaxonomyMetadata(lookups, startedAt));
  if (filtered.documents.length > 0) await upsertTemplateDocuments(env.DB, filtered.documents);

  const summary: CmsCategoryBackfillSummary = {
    mode: 'cms-category-backfill',
    started_at: startedAt,
    finished_at: nowIso(),
    fetched_records: page.records.length,
    indexed_records: filtered.documents.length,
    skipped_slug_conflicts: filtered.skippedSlugConflicts,
    offset,
    next_offset: page.offset ?? null,
    has_next_page: Boolean(page.offset),
  };

  await recordSyncSummary(env.DB, summary, 'cms_category_backfill_latest');
  return summary;
}

interface ParentTaxonomyRepairRow {
  id: string;
  category_groups_json: string;
  category_group_slugs_json: string;
  child_categories_json: string;
  child_category_slugs_json: string;
}

interface ParentTaxonomyGroup {
  name: string;
  slug: string;
}

export interface ParentTaxonomyRepairSummary {
  mode: 'parent-taxonomy-repair';
  started_at: string;
  finished_at: string;
  parent_groups: number;
  updated_documents: number;
  removed_child_links: number;
}

export async function repairParentTaxonomy(env: Env): Promise<ParentTaxonomyRepairSummary> {
  const startedAt = nowIso();
  const lookups = await loadLookupMaps(env);
  const groupMap = new Map<string, ParentTaxonomyGroup>();

  for (const entry of lookups.childCategories.values()) {
    if (!entry.isCategoryGroup) continue;
    const slug = canonicalizeCategoryGroupSlug(entry.displayName);
    if (!slug) continue;
    groupMap.set(slug, { name: entry.displayName, slug });
  }

  let updatedDocuments = 0;
  let removedChildLinks = 0;
  const statements: D1PreparedStatement[] = [];

  for (const group of groupMap.values()) {
    const result = await env.DB
      .prepare(
        `
        SELECT
          id,
          category_groups_json,
          category_group_slugs_json,
          child_categories_json,
          child_category_slugs_json
        FROM template_documents d
        WHERE EXISTS (
          SELECT 1
          FROM template_child_categories tcc
          WHERE tcc.template_document_id = d.id
            AND tcc.child_category_slug = ?
        )
      `,
      )
      .bind(group.slug)
      .all<ParentTaxonomyRepairRow>();

    for (const row of result.results ?? []) {
      const categoryGroups = parseJsonArray(row.category_groups_json);
      const categoryGroupSlugs = parseJsonArray(row.category_group_slugs_json);
      const childCategories = parseJsonArray(row.child_categories_json);
      const childCategorySlugs = parseJsonArray(row.child_category_slugs_json);
      const nextCategoryGroups = uniqueStrings([...categoryGroups, group.name]);
      const nextCategoryGroupSlugs = uniqueStrings([...categoryGroupSlugs, group.slug]);
      const nextChildCategories: string[] = [];
      const nextChildCategorySlugs: string[] = [];

      childCategorySlugs.forEach((slug, index) => {
        if (slug === group.slug) return;
        nextChildCategorySlugs.push(slug);
        nextChildCategories.push(childCategories[index] ?? slug);
      });

      statements.push(
        env.DB
          .prepare(
            `
            UPDATE template_documents
            SET
              category_groups_json = ?,
              category_group_slugs_json = ?,
              child_categories_json = ?,
              child_category_slugs_json = ?,
              category_groups_text = ?,
              child_categories_text = ?
            WHERE id = ?
          `,
          )
          .bind(
            JSON.stringify(nextCategoryGroups),
            JSON.stringify(nextCategoryGroupSlugs),
            JSON.stringify(nextChildCategories),
            JSON.stringify(nextChildCategorySlugs),
            nextCategoryGroups.join(' '),
            nextChildCategories.join(' '),
            row.id,
          ),
        env.DB
          .prepare('DELETE FROM template_child_categories WHERE template_document_id = ? AND child_category_slug = ?')
          .bind(row.id, group.slug),
      );

      updatedDocuments += 1;
      removedChildLinks += 1;
    }
  }

  for (const group of chunk(statements, 50)) {
    await env.DB.batch(group);
  }

  const summary: ParentTaxonomyRepairSummary = {
    mode: 'parent-taxonomy-repair',
    started_at: startedAt,
    finished_at: nowIso(),
    parent_groups: groupMap.size,
    updated_documents: updatedDocuments,
    removed_child_links: removedChildLinks,
  };

  await recordSyncSummary(env.DB, summary, 'parent_taxonomy_repair_summary');
  return summary;
}
