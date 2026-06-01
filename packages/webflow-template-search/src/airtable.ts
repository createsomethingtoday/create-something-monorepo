import type {
  AirtableAssetFields,
  AirtableListResponse,
  AirtableRecord,
  ChildCategoryLookupValue,
  CreatorLookupValue,
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
const DEFAULT_CREATORS_TABLE_ID = 'tbljt0plqxdMARZXb';

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
  '👀📅Decision Date (Override)',
  '🚀📅Published Date',
  '🥞CMS Slug',
  '🥞CMS Slug (formula)',
  '🎨Creator',
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

function buildModifiedAfterFormula(cursor: string, until?: string): string {
  if (until) {
    return `AND(IS_AFTER({📅LMT}, DATETIME_PARSE("${cursor}")), NOT(IS_AFTER({📅LMT}, DATETIME_PARSE("${until}"))))`;
  }
  return `IS_AFTER({📅LMT}, DATETIME_PARSE("${cursor}"))`;
}

function buildRecordIdFormula(recordIds: string[]): string {
  for (const id of recordIds) {
    if (!/^rec[A-Za-z0-9]+$/.test(id)) {
      throw new Error(`Invalid Airtable record ID: ${id}`);
    }
  }
  const clauses = recordIds.map((id) => `RECORD_ID()="${id}"`);
  return clauses.length === 1 ? clauses[0] : `OR(${clauses.join(',')})`;
}

function attachmentUrl(value: unknown): string | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const first = value[0] as { url?: string } | undefined;
  return first?.url ?? null;
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

// Minimal field list for periodic image URL refresh — much cheaper than full ASSET_FIELDS.
const IMAGE_REFRESH_FIELDS = [
  '⚙️🆎Type (Text)',
  '🚀Marketplace Status',
  '🖼️Thumbnail Image',
  '🖼️Thumbnail Image (Secondary)',
  '🖼️Carousel Images',
];

export async function fetchPublishedTemplateImageFields(
  env: Env,
): Promise<Array<AirtableRecord<AirtableAssetFields>>> {
  return fetchAirtableRecords<AirtableAssetFields>(env, {
    tableId: env.AIRTABLE_ASSETS_TABLE_ID ?? DEFAULT_ASSETS_TABLE_ID,
    fields: IMAGE_REFRESH_FIELDS,
    formula: buildPublishedTemplateFormula(),
  });
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
  until?: string,
): Promise<Array<AirtableRecord<AirtableAssetFields>>> {
  return fetchAirtableRecords<AirtableAssetFields>(env, {
    tableId: env.AIRTABLE_ASSETS_TABLE_ID ?? DEFAULT_ASSETS_TABLE_ID,
    fields: ASSET_FIELDS,
    formula: buildModifiedAfterFormula(cursor, until),
    sortField: '📅LMT',
  });
}

export async function fetchAssetRecordsByIds(
  env: Env,
  recordIds: string[],
): Promise<Array<AirtableRecord<AirtableAssetFields>>> {
  const uniqueIds = uniqueStrings(recordIds.map((id) => id.trim()).filter(Boolean));
  if (uniqueIds.length === 0) return [];

  return fetchAirtableRecords<AirtableAssetFields>(env, {
    tableId: env.AIRTABLE_ASSETS_TABLE_ID ?? DEFAULT_ASSETS_TABLE_ID,
    fields: ASSET_FIELDS,
    formula: buildRecordIdFormula(uniqueIds),
    sortField: '📅LMT',
  });
}

export async function loadLookupMaps(env: Env): Promise<LookupMaps> {
  const [styles, childCategories, tags, creators] = await Promise.all([
    fetchAirtableRecords(env, {
      tableId: env.AIRTABLE_STYLES_TABLE_ID ?? DEFAULT_STYLES_TABLE_ID,
      fields: ['Name', '🥞CMS Slug'],
    }),
    fetchAirtableRecords(env, {
      tableId: env.AIRTABLE_CHILD_CATEGORIES_TABLE_ID ?? DEFAULT_CHILD_CATEGORIES_TABLE_ID,
      fields: ['Category', 'Display name', 'Parent Category Name', '🪣Category Groups', 'Related Keywords'],
    }),
    fetchAirtableRecords(env, {
      tableId: env.AIRTABLE_TAGS_TABLE_ID ?? DEFAULT_TAGS_TABLE_ID,
      fields: ['Name', '🥞CMS Slug'],
    }),
    fetchAirtableRecords(env, {
      tableId: DEFAULT_CREATORS_TABLE_ID,
      fields: ['Name', '🥞CMS Slug', '🖼️Avatar (Primary)', '🖼️Avatar Alt Text'],
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
    const name = displayName || category;
    if (!name) continue;

    childCategoryMap.set(record.id, {
      id: record.id,
      name,
      slug: deriveChildCategorySlug(name),
      category,
      displayName: name,
      parentCategoryName,
      categoryGroups: uniqueStrings(splitLookupText(record.fields['🪣Category Groups']).map((entry) => canonicalizeCategoryGroupSlug(entry))),
      relatedKeywords: splitLookupText(record.fields['Related Keywords']),
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

  const creatorMap = new Map<string, CreatorLookupValue>();
  for (const record of creators) {
    const name = String(record.fields.Name ?? '').trim();
    if (!name) continue;
    const slug = typeof record.fields['🥞CMS Slug'] === 'string' ? record.fields['🥞CMS Slug'].trim() : '';
    const avatarValue = record.fields['🖼️Avatar (Primary)'];
    const avatarAltValue = record.fields['🖼️Avatar Alt Text'];
    creatorMap.set(record.id, {
      id: record.id,
      name,
      slug,
      profileUrl: slug ? `https://webflow.com/templates/designers/${slug}` : '',
      avatarUrl: attachmentUrl(avatarValue),
      avatarAlt: typeof avatarAltValue === 'string' ? avatarAltValue.trim() || null : null,
    });
  }

  return {
    styles: styleMap,
    childCategories: childCategoryMap,
    tags: tagMap,
    creators: creatorMap,
  };
}
