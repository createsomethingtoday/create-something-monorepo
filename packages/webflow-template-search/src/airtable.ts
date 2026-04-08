import type {
  AirtableAssetFields,
  AirtableCreatorFields,
  AirtableListResponse,
  AirtablePageResult,
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
const DEFAULT_CREATORS_TABLE_ID = 'tbljt0plqxdMARZXb';
const DEFAULT_STYLES_TABLE_ID = 'tblG7E9LbQj0sBX0o';
const DEFAULT_CHILD_CATEGORIES_TABLE_ID = 'tblWJXy3M6R8SeoFi';
const DEFAULT_TAGS_TABLE_ID = 'tblb4969G7O75gVWV';
const AIRTABLE_ISO_DATETIME_FORMAT = 'YYYY-MM-DDTHH:mm:ss.SSS[Z]';

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
  '📋 Cumulative Revenue',
  '🥞💲Template Price Filter (🏗️ only)',
  '🚀📅Published Date',
  '🥞CMS Slug (formula)',
  '🎨Creator',
  '🎨Creator Name',
  '⚙️🎨Creator Record ID',
  '🖼️Thumbnail Image',
  '🖼️Thumbnail Image (Secondary)',
  '🖼️Carousel Images',
  '🕸️View Asset Listing',
  '🕸️Template Profile Page ',
  '🔗Preview Site URL',
  '🔗Listing URL',
  '🔗Website URL',
  '📅LMT',
];

const CREATOR_FIELDS = [
  '⚙️🎨Creator Record ID',
  '🖼️Avatar (Primary)',
  '🖼️Avatar (Secondary)',
  '🖼️Avatar Alt Text',
  '🔗Creator Profile (📚 only)',
  '❓🔗Templates Page',
];

function assertAirtableConfigured(env: Env): asserts env is Env & { AIRTABLE_API_KEY: string } {
  if (!env.AIRTABLE_API_KEY || env.AIRTABLE_API_KEY.trim().length === 0) {
    throw new Error('AIRTABLE_API_KEY is required.');
  }
}

function escapeFormulaString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function buildDateParseExpression(value: string): string {
  return `DATETIME_PARSE("${escapeFormulaString(value)}", "${AIRTABLE_ISO_DATETIME_FORMAT}")`;
}

function buildPublishedTemplateFormula(snapshotBefore?: string): string {
  const publishedTemplateFilter = '{⚙️🆎Type (Text)}="Template🏗️",{🚀Marketplace Status}="3️⃣Published🚀"';
  if (!snapshotBefore) return `AND(${publishedTemplateFilter})`;

  const parsedSnapshot = buildDateParseExpression(snapshotBefore);
  return `AND(${publishedTemplateFilter},OR({📅LMT}=BLANK(),IS_BEFORE({📅LMT}, ${parsedSnapshot}),IS_SAME({📅LMT}, ${parsedSnapshot}, 'second')))`;
}

function buildModifiedAfterFormula(cursor: string): string {
  return `IS_AFTER({📅LMT}, ${buildDateParseExpression(cursor)})`;
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
  offset?: string;
  pageSize?: number;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
}

async function fetchAirtablePage<TFields extends Record<string, unknown>>(
  env: Env,
  options: FetchOptions,
): Promise<AirtablePageResult<TFields>> {
  assertAirtableConfigured(env);

  const params = new URLSearchParams();
  params.set('pageSize', String(options.pageSize ?? 100));
  options.fields.forEach((field) => params.append('fields[]', field));
  if (options.formula) params.set('filterByFormula', options.formula);
  if (options.sortField) {
    params.set('sort[0][field]', options.sortField);
    params.set('sort[0][direction]', options.sortDirection ?? 'asc');
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
  return {
    records: payload.records,
    offset: payload.offset ?? null,
  };
}

async function fetchAirtableRecords<TFields extends Record<string, unknown>>(
  env: Env,
  options: FetchOptions,
): Promise<Array<AirtableRecord<TFields>>> {
  const records: Array<AirtableRecord<TFields>> = [];
  let offset = options.offset;

  do {
    const payload = await fetchAirtablePage<TFields>(env, { ...options, offset });
    records.push(...payload.records);
    offset = payload.offset ?? undefined;
  } while (offset);

  return records;
}

export async function fetchPublishedTemplateAssets(
  env: Env,
  snapshotBefore?: string,
): Promise<Array<AirtableRecord<AirtableAssetFields>>> {
  return fetchAirtableRecords<AirtableAssetFields>(env, {
    tableId: env.AIRTABLE_ASSETS_TABLE_ID ?? DEFAULT_ASSETS_TABLE_ID,
    fields: ASSET_FIELDS,
    formula: buildPublishedTemplateFormula(snapshotBefore),
    sortField: '📅LMT',
    sortDirection: 'desc',
  });
}

export async function fetchPublishedTemplateAssetsPage(
  env: Env,
  offset?: string,
  pageSize = 100,
  snapshotBefore?: string,
): Promise<AirtablePageResult<AirtableAssetFields>> {
  return fetchAirtablePage<AirtableAssetFields>(env, {
    tableId: env.AIRTABLE_ASSETS_TABLE_ID ?? DEFAULT_ASSETS_TABLE_ID,
    fields: ASSET_FIELDS,
    formula: buildPublishedTemplateFormula(snapshotBefore),
    offset,
    pageSize,
    sortField: '📅LMT',
    sortDirection: 'desc',
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

function buildRecordIdsFormula(recordIds: string[]): string {
  const clauses = recordIds.map((recordId) => `RECORD_ID()="${escapeFormulaString(recordId)}"`);
  if (clauses.length === 0) return 'FALSE()';
  return clauses.length === 1 ? clauses[0]! : `OR(${clauses.join(',')})`;
}

export async function fetchAssetImageUrlsByRecordIds(
  env: Env,
  recordIds: string[],
): Promise<Map<string, { primary: string | null; secondary: string | null; carousel: string[] }>> {
  const uniqueRecordIds = Array.from(new Set(recordIds.filter(Boolean)));
  if (uniqueRecordIds.length === 0) return new Map();

  const chunks: string[][] = [];
  for (let index = 0; index < uniqueRecordIds.length; index += 50) {
    chunks.push(uniqueRecordIds.slice(index, index + 50));
  }

  const records = (
    await Promise.all(
      chunks.map((chunk) =>
        fetchAirtableRecords<AirtableAssetFields>(env, {
          tableId: env.AIRTABLE_ASSETS_TABLE_ID ?? DEFAULT_ASSETS_TABLE_ID,
          fields: ['🖼️Thumbnail Image', '🖼️Thumbnail Image (Secondary)', '🖼️Carousel Images'],
          formula: buildRecordIdsFormula(chunk),
          pageSize: chunk.length,
        }),
      ),
    )
  ).flat();

  return new Map(
    records.map((record) => [
      record.id,
      {
        primary: Array.isArray(record.fields['🖼️Thumbnail Image']) ? String(record.fields['🖼️Thumbnail Image']?.[0]?.url ?? '') || null : null,
        secondary: Array.isArray(record.fields['🖼️Thumbnail Image (Secondary)'])
          ? String(record.fields['🖼️Thumbnail Image (Secondary)']?.[0]?.url ?? '') || null
          : null,
        carousel: Array.isArray(record.fields['🖼️Carousel Images'])
          ? record.fields['🖼️Carousel Images']
              .map((entry) => String(entry?.url ?? ''))
              .filter(Boolean)
          : [],
      },
    ]),
  );
}

function extractAssetCreatorRecordId(record: AirtableRecord<AirtableAssetFields>): string | null {
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

function attachmentUrl(value: unknown): string | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const first = value[0] as { url?: string } | undefined;
  return typeof first?.url === 'string' && first.url.length > 0 ? first.url : null;
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

export interface AirtableCreatorMetadata {
  recordId: string;
  creatorRecordId: string | null;
  profileUrl: string | null;
  templatesPageUrl: string | null;
  avatarPrimaryUrl: string | null;
  avatarSecondaryUrl: string | null;
  avatarAlt: string | null;
}

export interface AirtableAssetMetadata {
  recordId: string;
  listingUrl: string | null;
  previewUrl: string | null;
  websiteUrl: string | null;
  creatorRecordId: string | null;
  creatorName: string | null;
  creatorProfileUrl: string | null;
  thumbnailImageUrl: string | null;
  thumbnailImageSecondaryUrl: string | null;
}

export async function fetchAssetMetadataByRecordIds(
  env: Env,
  recordIds: string[],
): Promise<Map<string, AirtableAssetMetadata>> {
  const uniqueRecordIds = Array.from(new Set(recordIds.filter(Boolean)));
  if (uniqueRecordIds.length === 0) return new Map();

  const chunks: string[][] = [];
  for (let index = 0; index < uniqueRecordIds.length; index += 50) {
    chunks.push(uniqueRecordIds.slice(index, index + 50));
  }

  const records = (
    await Promise.all(
      chunks.map((chunk) =>
        fetchAirtableRecords<AirtableAssetFields>(env, {
          tableId: env.AIRTABLE_ASSETS_TABLE_ID ?? DEFAULT_ASSETS_TABLE_ID,
          fields: [
            '🎨Creator',
            '🎨Creator Name',
            '⚙️🎨Creator Record ID',
            '🖼️Thumbnail Image',
            '🖼️Thumbnail Image (Secondary)',
            '🕸️View Asset Listing',
            '🕸️Template Profile Page ',
            '🔗Preview Site URL',
            '🔗Listing URL',
            '🔗Website URL',
          ],
          formula: buildRecordIdsFormula(chunk),
          pageSize: chunk.length,
        }),
      ),
    )
  ).flat();

  return new Map(
    records.map((record) => [
      record.id,
      {
        recordId: record.id,
        listingUrl: extractUrlValue(record.fields['🕸️View Asset Listing']) ?? extractUrlValue(record.fields['🔗Listing URL']),
        previewUrl: typeof record.fields['🔗Preview Site URL'] === 'string' ? record.fields['🔗Preview Site URL'] : null,
        websiteUrl: typeof record.fields['🔗Website URL'] === 'string' ? record.fields['🔗Website URL'] : null,
        creatorRecordId: extractAssetCreatorRecordId(record),
        creatorName: typeof record.fields['🎨Creator Name'] === 'string' ? record.fields['🎨Creator Name'] : null,
        creatorProfileUrl: extractUrlValue(record.fields['🕸️Template Profile Page ']),
        thumbnailImageUrl: attachmentUrl(record.fields['🖼️Thumbnail Image']),
        thumbnailImageSecondaryUrl: attachmentUrl(record.fields['🖼️Thumbnail Image (Secondary)']),
      },
    ]),
  );
}

export async function fetchCreatorMetadataByRecordIds(
  env: Env,
  recordIds: string[],
): Promise<Map<string, AirtableCreatorMetadata>> {
  const uniqueRecordIds = Array.from(new Set(recordIds.filter(Boolean)));
  if (uniqueRecordIds.length === 0) return new Map();

  const chunks: string[][] = [];
  for (let index = 0; index < uniqueRecordIds.length; index += 50) {
    chunks.push(uniqueRecordIds.slice(index, index + 50));
  }

  const records = (
    await Promise.all(
      chunks.map((chunk) =>
        fetchAirtableRecords<AirtableCreatorFields>(env, {
          tableId: env.AIRTABLE_CREATORS_TABLE_ID ?? DEFAULT_CREATORS_TABLE_ID,
          fields: CREATOR_FIELDS,
          formula: buildRecordIdsFormula(chunk),
          pageSize: chunk.length,
        }),
      ),
    )
  ).flat();

  return new Map(
    records.map((record) => [
      record.id,
      {
        recordId: record.id,
        creatorRecordId:
          typeof record.fields['⚙️🎨Creator Record ID'] === 'string' ? record.fields['⚙️🎨Creator Record ID'] : null,
        profileUrl: extractUrlValue(record.fields['🔗Creator Profile (📚 only)']),
        templatesPageUrl: extractUrlValue(record.fields['❓🔗Templates Page']),
        avatarPrimaryUrl: attachmentUrl(record.fields['🖼️Avatar (Primary)']),
        avatarSecondaryUrl: attachmentUrl(record.fields['🖼️Avatar (Secondary)']),
        avatarAlt: typeof record.fields['🖼️Avatar Alt Text'] === 'string' ? record.fields['🖼️Avatar Alt Text'] : null,
      },
    ]),
  );
}

export async function loadLookupMaps(env: Env): Promise<LookupMaps> {
  const [styles, childCategories, tags] = await Promise.all([
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

  return {
    styles: styleMap,
    childCategories: childCategoryMap,
    tags: tagMap,
  };
}
