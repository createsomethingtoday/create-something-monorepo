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
  normalizeChildCategorySlug,
  slugifySegment,
  normalizeStyleSlug,
  normalizeTagSlug,
} from './slug.js';
import { ensureStringArray, uniqueStrings } from './utils.js';

const DEFAULT_ASSETS_TABLE_ID = 'tblRwzpWoLgE9MrUm';
const DEFAULT_CHILD_CATEGORIES_TABLE_ID = 'tblSygBX7adZ4VNjK';
const DEFAULT_STYLES_TABLE_ID = 'tblG7E9LbQj0sBX0o';
const DEFAULT_TAGS_TABLE_ID = 'tblb4969G7O75gVWV';
const DEFAULT_CREATORS_TABLE_ID = 'tbljt0plqxdMARZXb';

export const DEFAULT_SEARCH_VISIBILITY_FIELDS = [
  '👁️Search Visibility (🏗️ only)',
  'Search Visibility',
  'search_visibility',
] as const;

export const ASSET_FIELDS = [
  'Name',
  '⚙️🆎Type (Text)',
  '🚀Marketplace Status',
  'ℹ️Description (Short)',
  'ℹ️Description (Long).html',
  '🪣Category Group(s) Display Name',
  '🪣Category Group(s) CMS Slug',
  'ℹ️🪣Categories',
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

function buildPublishedSinceFormula(date: string): string {
  return `AND(${buildPublishedTemplateFormula()}, IS_AFTER({🚀📅Published Date}, DATETIME_PARSE("${date}")))`;
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

interface FetchOptions {
  tableId: string;
  fields: string[];
  optionalFields?: string[];
  formula?: string;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  maxRecords?: number;
}

function parseConfiguredSearchVisibilityFields(env: Env): string[] {
  const configured = (env.AIRTABLE_SEARCH_VISIBILITY_FIELDS ?? '')
    .split(',')
    .map((field) => field.trim())
    .filter(Boolean);

  return uniqueStrings([...configured, ...DEFAULT_SEARCH_VISIBILITY_FIELDS]);
}

function isMissingOptionalFieldError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /unknown field|UNKNOWN_FIELD|INVALID_REQUEST_UNKNOWN_FIELD_NAME/i.test(message);
}

async function fetchAirtableRecords<TFields extends Record<string, unknown>>(
  env: Env,
  options: FetchOptions,
): Promise<Array<AirtableRecord<TFields>>> {
  assertAirtableConfigured(env);

  async function requestRecords(fields: string[]): Promise<Array<AirtableRecord<TFields>>> {
    const records: Array<AirtableRecord<TFields>> = [];
    let offset: string | undefined;

    do {
      const params = new URLSearchParams();
      const remainingRecords =
        typeof options.maxRecords === 'number' ? Math.max(1, Math.min(100, options.maxRecords - records.length)) : 100;
      params.set('pageSize', String(remainingRecords));
      if (typeof options.maxRecords === 'number') params.set('maxRecords', String(options.maxRecords));
      fields.forEach((field) => params.append('fields[]', field));
      if (options.formula) params.set('filterByFormula', options.formula);
      if (options.sortField) {
        params.set('sort[0][field]', options.sortField);
        params.set('sort[0][direction]', options.sortDirection ?? 'asc');
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
      if (typeof options.maxRecords === 'number' && records.length >= options.maxRecords) {
        return records.slice(0, options.maxRecords);
      }
      offset = payload.offset;
    } while (offset);

    return records;
  }

  const optionalFields = options.optionalFields ?? [];
  if (optionalFields.length === 0) return requestRecords(options.fields);

  try {
    return await requestRecords(uniqueStrings([...options.fields, ...optionalFields]));
  } catch (error) {
    if (!isMissingOptionalFieldError(error)) throw error;
    return requestRecords(options.fields);
  }
}

// Minimal field list for periodic image URL refresh — much cheaper than full ASSET_FIELDS.
const IMAGE_REFRESH_FIELDS = [
  '⚙️🆎Type (Text)',
  '🚀Marketplace Status',
  '🖼️Thumbnail Image',
  '🖼️Thumbnail Image (Secondary)',
  '🖼️Carousel Images',
];

interface AirtableCategoryFields extends Record<string, unknown> {
  Name?: string;
  '🥞CMS Slug'?: string;
  Category?: string;
  'Display name'?: string;
  'Parent Category'?: string[] | string;
  'Parent Category Name'?: string;
  '🪣Category Groups'?: string[] | string;
  '🪣Category Group Display Names'?: string[] | string;
  '🪣Category Group CMS Slug'?: string[] | string;
  '🪣Category Group(s) Display Name'?: string[] | string;
  '🪣Category Group(s) CMS Slug'?: string[] | string;
  Tier?: string;
  type?: string;
}

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
    optionalFields: parseConfiguredSearchVisibilityFields(env),
    formula: buildPublishedTemplateFormula(),
    sortField: '📅LMT',
  });
}

export async function fetchRecentlyPublishedTemplateAssets(
  env: Env,
  publishedSinceDate: string,
  maxRecords: number,
): Promise<Array<AirtableRecord<AirtableAssetFields>>> {
  return fetchAirtableRecords<AirtableAssetFields>(env, {
    tableId: env.AIRTABLE_ASSETS_TABLE_ID ?? DEFAULT_ASSETS_TABLE_ID,
    fields: ASSET_FIELDS,
    optionalFields: parseConfiguredSearchVisibilityFields(env),
    formula: buildPublishedSinceFormula(publishedSinceDate),
    sortField: '📅LMT',
    sortDirection: 'desc',
    maxRecords,
  });
}

export async function fetchModifiedAssetsSince(
  env: Env,
  cursor: string,
  until?: string,
  maxRecords?: number,
): Promise<Array<AirtableRecord<AirtableAssetFields>>> {
  return fetchAirtableRecords<AirtableAssetFields>(env, {
    tableId: env.AIRTABLE_ASSETS_TABLE_ID ?? DEFAULT_ASSETS_TABLE_ID,
    fields: ASSET_FIELDS,
    optionalFields: parseConfiguredSearchVisibilityFields(env),
    formula: buildModifiedAfterFormula(cursor, until),
    sortField: '📅LMT',
    maxRecords,
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
    optionalFields: parseConfiguredSearchVisibilityFields(env),
    formula: buildRecordIdFormula(uniqueIds),
    sortField: '📅LMT',
  });
}

export async function loadLookupMaps(env: Env): Promise<LookupMaps> {
  const [childCategories, styles, tags, creators] = await Promise.all([
    fetchAirtableRecords<AirtableCategoryFields>(env, {
      tableId: env.AIRTABLE_CHILD_CATEGORIES_TABLE_ID ?? DEFAULT_CHILD_CATEGORIES_TABLE_ID,
      fields: [],
    }),
    fetchAirtableRecords(env, {
      tableId: env.AIRTABLE_STYLES_TABLE_ID ?? DEFAULT_STYLES_TABLE_ID,
      fields: ['Name', '🥞CMS Slug'],
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

  const childCategoryRecordsById = new Map(childCategories.map((record) => [record.id, record]));
  const childCategoryMap = new Map<string, ChildCategoryLookupValue>();
  const childCategoryAliases: LookupMaps['childCategoryAliases'] = [];

  function categoryDisplayName(record: AirtableRecord<AirtableCategoryFields> | undefined): string {
    if (!record) return '';
    const displayName = typeof record.fields['Display name'] === 'string' ? record.fields['Display name'].trim() : '';
    const category = typeof record.fields.Category === 'string' ? record.fields.Category.trim() : '';
    const name = typeof record.fields.Name === 'string' ? record.fields.Name.trim() : '';
    return displayName || category || name;
  }

  for (const record of childCategories) {
    const tier = typeof record.fields.Tier === 'string' ? record.fields.Tier.toLowerCase() : '';
    const type = typeof record.fields.type === 'string' ? record.fields.type.toLowerCase() : '';
    const isLegacyCategoryRecord = Boolean(tier || type);

    const name = categoryDisplayName(record);
    if (!name) continue;

    const parentIds = ensureStringArray(record.fields['Parent Category']);
    const parentRecord = parentIds[0] ? childCategoryRecordsById.get(parentIds[0]) : undefined;
    const parentName =
      categoryDisplayName(parentRecord) ||
      (typeof record.fields['Parent Category Name'] === 'string' ? record.fields['Parent Category Name'].trim() : '');
    const fallbackGroupSlugs = ensureStringArray(record.fields['🪣Category Groups']).map((entry) =>
      canonicalizeCategoryGroupSlug(entry),
    );
    const currentGroupNames = uniqueStrings([
      ...ensureStringArray(record.fields['🪣Category Group Display Names']),
      ...ensureStringArray(record.fields['🪣Category Group(s) Display Name']),
    ]);
    const currentGroupSlugs = uniqueStrings([
      ...ensureStringArray(record.fields['🪣Category Group CMS Slug']),
      ...ensureStringArray(record.fields['🪣Category Group(s) CMS Slug']),
    ]).map((entry) => canonicalizeCategoryGroupSlug(entry));
    const categoryGroupName = parentName || currentGroupNames[0] || null;
    const categoryGroupSlug = parentName ? canonicalizeCategoryGroupSlug(parentName) : currentGroupSlugs[0] ?? fallbackGroupSlugs[0] ?? null;

    if (isLegacyCategoryRecord && tier !== 'child' && type !== 'category') continue;
    if (!isLegacyCategoryRecord && !categoryGroupName && !categoryGroupSlug) continue;

    const providedSlug = typeof record.fields['🥞CMS Slug'] === 'string' ? record.fields['🥞CMS Slug'] : null;
    const slug = normalizeChildCategorySlug(name, providedSlug);
    const publicSlug = providedSlug ? slugifySegment(providedSlug.replace(/-websites$/i, '')) : '';

    childCategoryMap.set(record.id, {
      id: record.id,
      name,
      slug,
      categoryGroupName,
      categoryGroupSlug,
    });

    if (publicSlug && publicSlug !== slug) {
      childCategoryAliases.push({
        slugType: 'child_category',
        aliasSlug: publicSlug,
        canonicalSlug: slug,
        note: 'Airtable category CMS slug',
      });
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
    childCategories: childCategoryMap,
    childCategoryAliases,
    styles: styleMap,
    tags: tagMap,
    creators: creatorMap,
  };
}
