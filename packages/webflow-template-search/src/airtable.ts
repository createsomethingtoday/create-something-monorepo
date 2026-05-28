import type {
  AirtableAssetFields,
  AirtableListResponse,
  AirtableRecord,
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
const DEFAULT_STYLES_TABLE_ID = 'tblG7E9LbQj0sBX0o';
const DEFAULT_CHILD_CATEGORIES_TABLE_ID = 'tblWJXy3M6R8SeoFi';
const DEFAULT_TAGS_TABLE_ID = 'tblb4969G7O75gVWV';

export const ASSET_FIELDS = [
  'Name',
  '⚙️🆎Type (Text)',
  '🚀Marketplace Status',
  'ℹ️Description (Short)',
  'ℹ️Description (Long).html',
  '🪣Category Group(s) Display Name',
  '🪣Category Group(s) CMS Slug',
  '🔍Algolia Child Category (🏗️ only)',
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
  '🥞CMS Slug (formula)',
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

function splitLookupText(value: unknown): string[] {
  if (typeof value !== 'string') return ensureStringArray(value);
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

interface FetchOptions {
  tableId: string;
  fields: string[];
  formula?: string;
  sortField?: string;
}

async function fetchAirtableRecords<TFields extends Record<string, unknown>>(
  env: Env,
  options: FetchOptions,
): Promise<Array<AirtableRecord<TFields>>> {
  assertAirtableConfigured(env);

  const records: Array<AirtableRecord<TFields>> = [];
  let offset: string | undefined;

  do {
    const params = new URLSearchParams();
    params.set('pageSize', '100');
    options.fields.forEach((field) => params.append('fields[]', field));
    if (options.formula) params.set('filterByFormula', options.formula);
    if (options.sortField) {
      params.set('sort[0][field]', options.sortField);
      params.set('sort[0][direction]', 'asc');
    }
    if (offset) params.set('offset', offset);

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

export async function loadLookupMaps(env: Env): Promise<LookupMaps> {
  const [styles, childCategories, tags] = await Promise.all([
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
    const displayName = String(record.fields['Display name'] ?? category).trim();
    const parentCategoryName = String(record.fields['Parent Category Name'] ?? '').trim();
    const tier = typeof record.fields.Tier === 'string' ? record.fields.Tier.trim() : null;
    const type = typeof record.fields.type === 'string' ? record.fields.type.trim() : null;
    const name = displayName || category;
    if (!name) continue;
    const isCategoryGroup = tier?.toLowerCase() === 'parent' || type?.toLowerCase() === 'group';

    childCategoryMap.set(record.id, {
      id: record.id,
      name,
      slug: deriveChildCategorySlug(name),
      category,
      displayName: name,
      parentCategoryName,
      categoryGroups: uniqueStrings(splitLookupText(record.fields['🪣Category Groups']).map((entry) => canonicalizeCategoryGroupSlug(entry))),
      relatedKeywords: splitLookupText(record.fields['Related Keywords']),
      tier,
      type,
      isCategoryGroup,
    });
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
    styles: styleMap,
    childCategories: childCategoryMap,
    tags: tagMap,
  };
}
