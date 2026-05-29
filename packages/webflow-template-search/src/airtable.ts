import type {
  AirtableAssetFields,
  AirtableListResponse,
  AirtableRecord,
  CategoryGroupLookupValue,
  ChildCategoryLookupValue,
  Env,
  LookupMaps,
  LookupValue,
} from './types.js';
import {
  canonicalizeCategoryGroupSlug,
  deriveChildCategorySlug,
  normalizeStyleSlug,
  normalizeTagSlug,
} from './slug.js';
import { ensureStringArray, uniqueStrings } from './utils.js';

const DEFAULT_ASSETS_TABLE_ID = 'tblRwzpWoLgE9MrUm';
const DEFAULT_CATEGORY_GROUPS_TABLE_ID = 'tblZyofRhtLchXSH9';
const DEFAULT_STYLES_TABLE_ID = 'tblG7E9LbQj0sBX0o';
const DEFAULT_CHILD_CATEGORIES_TABLE_ID = 'tblWJXy3M6R8SeoFi';
const DEFAULT_TAGS_TABLE_ID = 'tblb4969G7O75gVWV';
const LOOKUP_MAPS_CACHE_TTL_MS = 60 * 60 * 1000;

let lookupMapsCache: { expiresAt: number; promise: Promise<LookupMaps> } | null = null;

export function clearLookupMapsCache(): void {
  lookupMapsCache = null;
}

export const ASSET_FIELDS = [
  'Name',
  '⚙️🆎Type (Text)',
  '🚀Marketplace Status',
  'ℹ️Description (Short)',
  'ℹ️Description (Long).html',
  '🪣Category Group(s) Display Name',
  '🪣Category Group(s) CMS Slug',
  '🔍Algolia Child Category (🏗️ only)',
  'ℹ️🪣Categories (Text)',
  '🥞CMS Slug (from ℹ️🪣Categories)',
  'ℹ️👘Styles',
  'ℹ️🏷️Tags (Multi)',
  '🥞Template Type (🏗️ only)',
  'Is free?',
  '🥞Is Currently Featured? (🏗️ only)',
  'ℹ️Is Featured? (🖥️, 🏗️only)',
  '🖌️Popularity Score',
  '📋 Unique Viewers',
  '📋 Cumulative Purchases',
  '🥞💲Template Price Filter (🏗️ only)',
  '🚀📅Published Date',
  '🥞CMS Slug',
  'Slug (from 🥞CMS Sync Records)',
  '🥞CMS Slug (formula)',
  '🥞CMS Record ID',
  '🎨Creator Name',
  '🖼️Thumbnail Image',
  '🖼️Thumbnail Image (Secondary)',
  '🖼️Carousel Images',
  '🔗Preview Site URL',
  '🔗Listing URL',
  '🔗Website URL',
  '📅LMT',
];

function assertAirtableConfigured(env: Env): asserts env is Env & { AIRTABLE_API_KEY: string } {
  if (!env.AIRTABLE_API_KEY || env.AIRTABLE_API_KEY.trim().length === 0) {
    throw new Error('AIRTABLE_API_KEY is required.');
  }
}

function buildPublishedTemplateFormula(): string {
  return 'AND({⚙️🆎Type (Text)}="Template🏗️",{🚀Marketplace Status}="3️⃣Published🚀")';
}

function buildModifiedAfterFormula(cursor: string): string {
  return `IS_AFTER({📅LMT}, DATETIME_PARSE("${cursor}"))`;
}

function escapeFormulaString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function buildTemplateSlugFormula(templateSlug: string): string {
  const escaped = escapeFormulaString(templateSlug);
  return `OR({🥞CMS Slug}="${escaped}",{🥞CMS Slug (formula)}="${escaped}")`;
}

function splitLookupText(value: unknown): string[] {
  if (typeof value !== 'string') return ensureStringArray(value);
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeTaxonomyDisplayName(value: string): string {
  return value
    .replace(/\bIt\b/g, 'IT')
    .replace(/\bUi\b/g, 'UI')
    .replace(/\bHr\b/g, 'HR')
    .replace(/\bSaas\b/g, 'SaaS')
    .replace(/\bNfts\b/g, 'NFTs')
    .replace(/\bNft\b/g, 'NFT')
    .replace(/\bAi\b/g, 'AI');
}

interface FetchOptions {
  tableId: string;
  fields: string[];
  formula?: string;
  sortField?: string;
  pageSize?: number;
}

export interface AirtableRecordsPage<TFields extends Record<string, unknown>> {
  records: Array<AirtableRecord<TFields>>;
  offset?: string;
}

async function fetchAirtableRecordsPage<TFields extends Record<string, unknown>>(
  env: Env,
  options: FetchOptions & { offset?: string },
): Promise<AirtableRecordsPage<TFields>> {
  assertAirtableConfigured(env);

  const params = new URLSearchParams();
  params.set('pageSize', String(Math.min(Math.max(options.pageSize ?? 100, 1), 100)));
  options.fields.forEach((field) => params.append('fields[]', field));
  if (options.formula) params.set('filterByFormula', options.formula);
  if (options.sortField) {
    params.set('sort[0][field]', options.sortField);
    params.set('sort[0][direction]', 'asc');
  }
  if (options.offset) params.set('offset', options.offset);

  const url = `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${encodeURIComponent(options.tableId)}?${params.toString()}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${env.AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Airtable request failed (${response.status}): ${await response.text()}`);
  }

  const payload = (await response.json()) as AirtableListResponse<TFields>;
  return { records: payload.records, offset: payload.offset };
}

async function fetchAirtableRecords<TFields extends Record<string, unknown>>(
  env: Env,
  options: FetchOptions,
): Promise<Array<AirtableRecord<TFields>>> {
  const records: Array<AirtableRecord<TFields>> = [];
  let offset: string | undefined;

  do {
    const payload = await fetchAirtableRecordsPage<TFields>(env, { ...options, offset });
    records.push(...payload.records);
    offset = payload.offset;
  } while (offset);

  return records;
}

export async function fetchPublishedTemplateAssets(env: Env): Promise<Array<AirtableRecord<AirtableAssetFields>>> {
  return fetchAirtableRecords<AirtableAssetFields>(env, {
    tableId: env.AIRTABLE_ASSETS_TABLE_ID ?? DEFAULT_ASSETS_TABLE_ID,
    fields: ASSET_FIELDS,
    formula: buildPublishedTemplateFormula(),
    sortField: '📅LMT',
  });
}

export async function fetchPublishedTemplateAssetsPage(
  env: Env,
  offset?: string,
): Promise<AirtableRecordsPage<AirtableAssetFields>> {
  return fetchAirtableRecordsPage<AirtableAssetFields>(env, {
    tableId: env.AIRTABLE_ASSETS_TABLE_ID ?? DEFAULT_ASSETS_TABLE_ID,
    fields: ASSET_FIELDS,
    formula: buildPublishedTemplateFormula(),
    sortField: '📅LMT',
    pageSize: 100,
    offset,
  });
}

export async function fetchModifiedAssetsSince(
  env: Env,
  cursor: string,
): Promise<Array<AirtableRecord<AirtableAssetFields>>> {
  return fetchAirtableRecords<AirtableAssetFields>(env, {
    tableId: env.AIRTABLE_ASSETS_TABLE_ID ?? DEFAULT_ASSETS_TABLE_ID,
    fields: ASSET_FIELDS,
    formula: buildModifiedAfterFormula(cursor),
    sortField: '📅LMT',
  });
}

export async function fetchTemplateAssetBySlug(
  env: Env,
  templateSlug: string,
): Promise<Array<AirtableRecord<AirtableAssetFields>>> {
  return fetchAirtableRecords<AirtableAssetFields>(env, {
    tableId: env.AIRTABLE_ASSETS_TABLE_ID ?? DEFAULT_ASSETS_TABLE_ID,
    fields: ASSET_FIELDS,
    formula: buildTemplateSlugFormula(templateSlug),
  });
}

export async function loadLookupMaps(env: Env): Promise<LookupMaps> {
  const now = Date.now();
  if (lookupMapsCache && lookupMapsCache.expiresAt > now) {
    return lookupMapsCache.promise;
  }

  const promise = loadLookupMapsUncached(env);
  lookupMapsCache = { expiresAt: now + LOOKUP_MAPS_CACHE_TTL_MS, promise };

  try {
    return await promise;
  } catch (error) {
    if (lookupMapsCache?.promise === promise) {
      lookupMapsCache = null;
    }
    throw error;
  }
}

async function loadLookupMapsUncached(env: Env): Promise<LookupMaps> {
  const [categoryGroups, styles, childCategories, tags] = await Promise.all([
    fetchAirtableRecords(env, {
      tableId: env.AIRTABLE_CATEGORY_GROUPS_TABLE_ID ?? DEFAULT_CATEGORY_GROUPS_TABLE_ID,
      fields: [
        'Name',
        'Display Name',
        '🥞CMS Slug',
        'ℹ️Description (Short)',
        'ℹ️Description (Landing page)',
        '❓Related Keywords for Algolia',
        '🥞CMS Status',
      ],
    }),
    fetchAirtableRecords(env, {
      tableId: env.AIRTABLE_STYLES_TABLE_ID ?? DEFAULT_STYLES_TABLE_ID,
      fields: ['Name', '🥞CMS Slug'],
    }),
    fetchAirtableRecords(env, {
      tableId: env.AIRTABLE_CHILD_CATEGORIES_TABLE_ID ?? DEFAULT_CHILD_CATEGORIES_TABLE_ID,
      fields: ['Category', 'Display name', 'Parent Category Name', '🪣Category Groups', 'Related Keywords', 'Tier', 'type'],
    }),
    fetchAirtableRecords(env, {
      tableId: env.AIRTABLE_TAGS_TABLE_ID ?? DEFAULT_TAGS_TABLE_ID,
      fields: ['Name', '🥞CMS Slug'],
    }),
  ]);

  const categoryGroupMap = new Map<string, CategoryGroupLookupValue>();
  for (const record of categoryGroups) {
    const name = String(record.fields.Name ?? '').trim();
    const displayName = normalizeTaxonomyDisplayName(String(record.fields['Display Name'] ?? name).trim());
    if (!displayName) continue;
    const status = typeof record.fields['🥞CMS Status'] === 'string' ? record.fields['🥞CMS Status'].trim() : null;
    const normalizedStatus = status?.toLowerCase() ?? '';
    if (name.toLowerCase().startsWith('legacy ') || (normalizedStatus && normalizedStatus !== 'active')) continue;
    const providedSlug = typeof record.fields['🥞CMS Slug'] === 'string' ? record.fields['🥞CMS Slug'] : null;
    const slug = canonicalizeCategoryGroupSlug(displayName);
    const value: CategoryGroupLookupValue = {
      id: record.id,
      name: displayName,
      displayName,
      slug,
      cmsSlug: providedSlug,
      descriptionShort: String(record.fields['ℹ️Description (Short)'] ?? '').trim(),
      descriptionLandingPage: String(record.fields['ℹ️Description (Landing page)'] ?? '').trim(),
      relatedKeywords: splitLookupText(record.fields['❓Related Keywords for Algolia']),
      status,
    };

    for (const alias of [record.id, name, displayName, slug, providedSlug ?? '']) {
      if (alias) categoryGroupMap.set(alias, value);
    }
  }

  const styleMap = new Map<string, LookupValue>();
  for (const record of styles) {
    const name = String(record.fields.Name ?? '').trim();
    if (!name) continue;
    const providedSlug = typeof record.fields['🥞CMS Slug'] === 'string' ? record.fields['🥞CMS Slug'] : null;
    styleMap.set(record.id, {
      id: record.id,
      name,
      slug: normalizeStyleSlug(name, providedSlug),
    });
  }

  const childCategoryMap = new Map<string, ChildCategoryLookupValue>();
  for (const record of childCategories) {
    const category = String(record.fields.Category ?? '').trim();
    const displayName = normalizeTaxonomyDisplayName(String(record.fields['Display name'] ?? category).trim());
    const parentCategoryName = String(record.fields['Parent Category Name'] ?? '').trim();
    const tier = typeof record.fields.Tier === 'string' ? record.fields.Tier.trim() : null;
    const type = typeof record.fields.type === 'string' ? record.fields.type.trim() : null;
    const name = displayName || category;
    if (!name) continue;
    const isCategoryGroup = tier?.toLowerCase() === 'parent' || type?.toLowerCase() === 'group';

    const value: ChildCategoryLookupValue = {
      id: record.id,
      name,
      slug: deriveChildCategorySlug(name),
      category,
      displayName: name,
      parentCategoryName,
      descriptionShort: '',
      categoryGroups: uniqueStrings(splitLookupText(record.fields['🪣Category Groups']).map((entry) => canonicalizeCategoryGroupSlug(entry))),
      relatedKeywords: splitLookupText(record.fields['Related Keywords']),
      tier,
      type,
      isCategoryGroup,
    };

    for (const alias of [record.id, category, displayName, name, value.slug]) {
      if (alias) childCategoryMap.set(alias, value);
    }
  }

  const tagMap = new Map<string, LookupValue>();
  for (const record of tags) {
    const name = String(record.fields.Name ?? '').trim();
    if (!name) continue;
    const providedSlug = typeof record.fields['🥞CMS Slug'] === 'string' ? record.fields['🥞CMS Slug'] : null;
    tagMap.set(record.id, {
      id: record.id,
      name,
      slug: normalizeTagSlug(name, providedSlug),
    });
  }

  return {
    categoryGroups: categoryGroupMap,
    styles: styleMap,
    childCategories: childCategoryMap,
    tags: tagMap,
  };
}
