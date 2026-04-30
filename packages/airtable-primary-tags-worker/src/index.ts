const DEFAULT_BASE_ID = 'appMoIgXMTTTNIc3p';
const DEFAULT_ASSETS_TABLE_ID = 'tblRwzpWoLgE9MrUm';
const DEFAULT_TAGS_TABLE_ID = 'tblb4969G7O75gVWV';
const PRIMARY_TAG_FIELD_ID = 'fldOERCPutLT9ihWX';
const ASSET_TYPE_FIELD_ID = 'fldmfcD7pebc82EuN';
const MARKETPLACE_STATUS_FIELD_ID = 'fld51CeQNGDgW9b0D';
const PUBLISHED_DATE_FIELD_ID = 'fld4anS2bYjmdbKEG';
const NAME_FIELD = 'Name';
const CATEGORY_GROUPS_FIELD = '🪣Category Group(s) Display Name';
const DESCRIPTION_SHORT_FIELD = 'ℹ️Description (Short)';
const AIRTABLE_API_BASE = 'https://api.airtable.com/v0';

type AssignmentConfidence = 'high' | 'medium' | 'low';

interface Env {
  AIRTABLE_PAT?: string;
  AIRTABLE_API_TOKEN?: string;
  AIRTABLE_API_KEY?: string;
  AIRTABLE_BASE_ID?: string;
  AIRTABLE_ASSETS_TABLE_ID?: string;
  AIRTABLE_TAGS_TABLE_ID?: string;
  AIRTABLE_MISSING_PRIMARY_TAG_FORMULA?: string;
  AIRTABLE_MIN_CONFIDENCE?: AssignmentConfidence;
  AIRTABLE_REQUEST_DELAY_MS?: string;
  TARGET_TIME_ZONE?: string;
  TARGET_HOUR?: string;
  DRY_RUN?: string;
}

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}

interface AirtableResponse {
  records: AirtableRecord[];
  offset?: string;
}

interface Config {
  apiKey: string;
  baseId: string;
  assetsTableId: string;
  tagsTableId: string;
  missingPrimaryTagFormula: string;
  minConfidence: AssignmentConfidence;
  requestDelayMs: number;
  targetTimeZone: string;
  targetHour: number;
  dryRun: boolean;
}

interface Tag {
  id: string;
  name: string;
}

interface Asset {
  id: string;
  name: string;
  categoryGroups: string[];
  descriptionShort: string;
}

interface CandidateAssignment {
  tag: Tag;
  confidence: AssignmentConfidence;
  reason: string;
}

interface TagAssignment {
  assetId: string;
  assetName: string;
  categoryGroups: string[];
  assignedTag: string;
  tagId: string;
  confidence: AssignmentConfidence;
  reason: string;
}

interface RunSummary {
  mode: 'dry-run' | 'live';
  minConfidence: AssignmentConfidence;
  assetsFetched: number;
  assignable: number;
  skippedBelowConfidence: number;
  unassigned: number;
  updates: {
    planned: number;
    updated: number;
    skipped: number;
    failed: number;
  };
}

const CONFIDENCE_RANK: Record<AssignmentConfidence, number> = {
  low: 0,
  medium: 1,
  high: 2
};

const CATEGORY_TO_TAG_MAP: Record<string, string[]> = {
  'Food & Drink': ['Restaurant', 'Food', 'Cafe', 'Bar', 'Coffee Shop', 'Winery', 'Food & Drink'],
  'Portfolio & Agency': ['Agency', 'Portfolio', 'Creative', 'Design'],
  'Blog & Editorial': ['Blog', 'Magazine', 'News', 'Newsletter'],
  Education: ['Education', 'School', 'College', 'University', 'Learning'],
  'Professional Services': ['Business', 'Consulting', 'Corporate', 'Law Firm'],
  'Documentation & Help Center': ['Documentation', 'Help center'],
  'Architecture & Design': ['Architecture', 'Interior design', 'Design'],
  'Real Estate & Property Management': ['Real Estate'],
  Environment: ['Nonprofit', 'Charity'],
  'Retail & E-Commerce': ['Retail', 'Shop', 'Marketplace'],
  'Health & Wellness': ['Health', 'Wellness', 'Medical', 'Spa', 'Fitness', 'Beauty & Wellness'],
  Technology: ['Technology', 'Software', 'SaaS', 'App'],
  Entertainment: ['Entertainment', 'Music', 'Event', 'Game'],
  'Photography & Video': ['Photography', 'Video', 'Photography & Video'],
  'Travel & Tourism': ['Travel', 'Tourism', 'Hotel', 'Hostel'],
  'Finance & Banking': ['Finance', 'Bank', 'Investment', 'Insurance'],
  'Sports & Fitness': ['Sports', 'Fitness', 'Gym', 'sport'],
  'Non-Profit & Charity': ['Nonprofit', 'Charity', 'Donation'],
  'Resume & Personal': ['Resume', 'Personal', 'CV', 'Profile'],
  'Coming Soon & Launch': ['Coming Soon', 'Landing page', 'Under Construction'],
  'Hair & Beauty': ['Beauty', 'Salon', 'Barber', 'Spa'],
  'Community & Nonprofit': ['Nonprofit', 'Charity', 'Church'],
  'Home Services': ['Construction', 'Interior design', 'Real Estate'],
  Government: ['Business', 'Corporate', 'Nonprofit'],
  Medical: ['Medical', 'Doctor', 'Health', 'Dentist', 'Hospital'],
  Wellness: ['Wellness', 'Health', 'Spa', 'Fitness'],
  Documentation: ['Documentation', 'Help center'],
  'Real Estate': ['Real Estate'],
  Automotive: ['Automotive', 'Cars'],
  'Pets & Animals': ['Pets', 'Veterinary'],
  'Legal & Law': ['Law Firm', 'Attorney', 'Business'],
  Religious: ['Church', 'Religion'],
  Wedding: ['Wedding', 'Event'],
  Sports: ['Sports', 'Fitness', 'sport'],
  Fashion: ['Fashion', 'Retail', 'Shop'],
  Music: ['Music', 'Musician', 'Band', 'Entertainment'],
  Gaming: ['Game', 'Entertainment'],
  Crypto: ['Finance', 'Technology'],
  NFT: ['Technology', 'Creative', 'Marketplace'],
  'Arts & Entertainment': ['Entertainment', 'Music', 'Film', 'Event', 'Photography & Video'],
  'HR & Hiring': ['Recruitment', 'Job Portal', 'Business'],
  Transportation: ['Transport', 'Logistics', 'Delivery', 'Automotive'],
  'Weddings & Events': ['Wedding', 'Event'],
  'Food & Beverage': ['Food', 'Restaurant', 'Cafe', 'Food & Drink'],
  'Pets & Veterinary': ['Pets', 'Veterinary'],
  'Sports & Recreation': ['Sports', 'Fitness', 'Gym'],
  'News & Media': ['News', 'Magazine', 'Blog'],
  'Finance & Investment': ['Finance', 'Investment', 'Bank'],
  'Legal Services': ['Law Firm', 'Attorney', 'Business']
};

const TAG_NAME_ALIASES: Record<string, string[]> = {
  App: ['Mobile App'],
  Automotive: ['Cars'],
  Bar: ['Bar & Nightclub'],
  Beauty: ['Beauty & Wellness', 'Beauty & Wellness Store', 'Makeup & Cosmetics'],
  'Beauty & Wellness': ['Beauty & Wellness', 'Beauty & Wellness Store'],
  Business: ['Freelancers & Consultants', 'Consulting & Coaching', 'Startup'],
  Cafe: ['Cafe & Coffee Shop'],
  Charity: ['Charity & Fundraising', 'Foundations & NGO', 'Foundation & NGO'],
  Church: ['Religious & Spiritual'],
  College: ['College / University'],
  Construction: ['Home Construction'],
  Consulting: ['Consulting & Coaching', 'Freelancers & Consultants'],
  Delivery: ['Shipping and Delivery', 'Catering & Delivery'],
  'Food & Drink': ['Food & Drinks Store', 'Restaurant', 'Cafe & Coffee Shop'],
  Food: ['Food & Drinks Store', 'Food & Recipe Blog', 'Restaurant'],
  Fitness: ['Fitness & Gym', 'Sports'],
  Gym: ['Fitness & Gym'],
  'Help center': ['Support/Help center', 'Documentation'],
  Hotel: ['Hotels & Lodging'],
  Logistics: ['Transportation & Logistics'],
  Medical: ['Clinic & Pharmacy', 'Doctor', 'Dentist'],
  Music: ['Music Industry & Promotion', 'Musicians & Bands'],
  Nonprofit: ['Foundations & NGO', 'Foundation & NGO', 'Volunteer & Community'],
  Pets: ['Pets & Animals Store', 'Veterinary'],
  Portfolio: ['Design Portfolio', 'Photography & Video Portfolio'],
  Recruitment: ['Recruiting', 'Job Portal'],
  Retail: ['Retail & E-Commerce', 'Ecommerce'],
  SaaS: ['Software & SaaS'],
  Salon: ['Salon & Barbershop'],
  Shop: ['Ecommerce', 'Shopping Cart', 'Retail & E-Commerce'],
  Software: ['Software & SaaS'],
  Sports: ['Sports', 'Fitness & Gym', 'Sports & Outdoors Store'],
  Technology: ['Software & SaaS', 'Mobile App', 'AI', 'Developer Tools'],
  Transport: ['Transportation & Logistics'],
  Travel: ['Travel & Tourism'],
  University: ['College / University'],
  Video: ['Photography & Video Portfolio', 'Image and Video Display Tools'],
  Wellness: ['Health & Wellness', 'Spa'],
  Wedding: ['Weddings']
};

const SAFE_SINGLE_TOKEN_TAG_MATCHES = new Set([
  'agriculture',
  'ai',
  'app',
  'architecture',
  'automotive',
  'bank',
  'barber',
  'beauty',
  'blog',
  'book',
  'cafe',
  'cars',
  'conference',
  'dance',
  'dentist',
  'design',
  'doctor',
  'documentation',
  'education',
  'event',
  'fashion',
  'finance',
  'fitness',
  'game',
  'gym',
  'hospital',
  'insurance',
  'investment',
  'marketing',
  'magazine',
  'news',
  'personal',
  'podcast',
  'restaurant',
  'retail',
  'saas',
  'school',
  'seo',
  'software',
  'spa',
  'sports',
  'travel',
  'tourism',
  'veterinary',
  'wellness'
]);

const KEYWORD_TO_TAGS: Record<string, string[]> = {
  restaurant: ['Restaurant', 'Food', 'Cafe'],
  cafe: ['Cafe', 'Coffee Shop', 'Food'],
  coffee: ['Coffee Shop', 'Cafe'],
  hotel: ['Hotel', 'Travel'],
  hostel: ['Hostel', 'Travel'],
  portfolio: ['Portfolio', 'Creative'],
  agency: ['Agency', 'Creative'],
  blog: ['Blog', 'Magazine'],
  shop: ['Shop', 'Retail', 'E-Commerce'],
  store: ['Shop', 'Retail', 'E-Commerce'],
  ecommerce: ['Retail', 'Shop', 'Marketplace'],
  saas: ['SaaS', 'Software', 'Technology'],
  dashboard: ['Dashboard', 'SaaS', 'App'],
  app: ['App', 'Software', 'Technology'],
  startup: ['Startup', 'Business', 'Technology'],
  consulting: ['Consulting', 'Business'],
  law: ['Law Firm', 'Attorney'],
  lawyer: ['Law Firm', 'Attorney'],
  medical: ['Medical', 'Health', 'Doctor'],
  health: ['Health', 'Medical', 'Wellness'],
  fitness: ['Fitness', 'Gym', 'Sports'],
  gym: ['Gym', 'Fitness', 'Sports'],
  real: ['Real Estate'],
  estate: ['Real Estate'],
  property: ['Real Estate'],
  education: ['Education', 'School', 'Learning'],
  school: ['School', 'Education'],
  university: ['University', 'Education', 'College'],
  photography: ['Photography', 'Photography & Video'],
  photographer: ['Photography', 'Photography & Video'],
  video: ['Video', 'Photography & Video'],
  wedding: ['Wedding', 'Event'],
  event: ['Event', 'Conference'],
  music: ['Music', 'Musician', 'Band'],
  podcast: ['Podcast', 'Music', 'Entertainment'],
  resume: ['Resume', 'CV', 'Personal'],
  cv: ['CV', 'Resume', 'Personal'],
  personal: ['Personal', 'Portfolio', 'Profile'],
  nonprofit: ['Nonprofit', 'Charity'],
  charity: ['Charity', 'Nonprofit', 'Donation'],
  church: ['Church', 'Religion'],
  travel: ['Travel', 'Tourism'],
  tourism: ['Tourism', 'Travel'],
  finance: ['Finance', 'Bank', 'Investment'],
  bank: ['Bank', 'Finance'],
  insurance: ['Insurance', 'Finance'],
  construction: ['Construction', 'Architecture'],
  architecture: ['Architecture', 'Interior design'],
  interior: ['Interior design', 'Architecture'],
  design: ['Design', 'Creative', 'Interior design'],
  creative: ['Creative', 'Agency', 'Design'],
  marketing: ['Marketing', 'Agency', 'Business'],
  news: ['News', 'Magazine', 'Blog'],
  magazine: ['Magazine', 'News', 'Blog'],
  technology: ['Technology', 'Software', 'App'],
  tech: ['Technology', 'Software', 'App'],
  software: ['Software', 'Technology', 'SaaS'],
  crypto: ['Finance', 'Technology', 'Investment'],
  nft: ['Technology', 'Creative', 'Marketplace'],
  ai: ['AI', 'Technology', 'Software', 'SaaS'],
  seo: ['SEO Tools', 'SEO'],
  fashion: ['Fashion', 'Retail', 'Shop'],
  beauty: ['Beauty', 'Salon', 'Spa'],
  salon: ['Salon', 'Beauty', 'Spa'],
  spa: ['Spa', 'Beauty', 'Wellness'],
  barber: ['Barber', 'Salon', 'Beauty'],
  dentist: ['Dentist', 'Medical', 'Health'],
  doctor: ['Doctor', 'Medical', 'Health'],
  veterinary: ['Veterinary', 'Pets', 'Medical'],
  pet: ['Pets', 'Veterinary'],
  automotive: ['Automotive', 'Cars'],
  car: ['Cars', 'Automotive'],
  logistics: ['Logistics', 'Transport'],
  delivery: ['Delivery', 'Logistics', 'Transport'],
  job: ['Job Portal', 'Recruitment'],
  career: ['Job Portal', 'Recruitment'],
  recruitment: ['Recruitment', 'Job Portal'],
  multipurpose: ['Multipurpose', 'Business'],
  'multi-purpose': ['Multipurpose', 'Business'],
  corporate: ['Corporate', 'Business'],
  responsive: ['Multipurpose', 'Business'],
  'any business': ['Business', 'Multipurpose'],
  'any type': ['Multipurpose', 'Business'],
  minimal: ['Personal', 'Portfolio', 'Creative'],
  clean: ['Business', 'Corporate', 'Portfolio'],
  modern: ['Business', 'Creative', 'Agency']
};

function buildConfig(env: Env): Config {
  const apiKey = env.AIRTABLE_PAT || env.AIRTABLE_API_TOKEN || env.AIRTABLE_API_KEY;
  if (!apiKey) {
    throw new Error('Missing AIRTABLE_PAT, AIRTABLE_API_TOKEN, or AIRTABLE_API_KEY secret.');
  }

  const minConfidence = parseConfidence(env.AIRTABLE_MIN_CONFIDENCE || 'medium');
  const targetHour = Number.parseInt(env.TARGET_HOUR || '9', 10);
  if (!Number.isFinite(targetHour) || targetHour < 0 || targetHour > 23) {
    throw new Error(`Invalid TARGET_HOUR "${env.TARGET_HOUR}". Expected 0-23.`);
  }

  const baseId = env.AIRTABLE_BASE_ID || DEFAULT_BASE_ID;
  const assetsTableId = env.AIRTABLE_ASSETS_TABLE_ID || DEFAULT_ASSETS_TABLE_ID;
  const tagsTableId = env.AIRTABLE_TAGS_TABLE_ID || DEFAULT_TAGS_TABLE_ID;

  return {
    apiKey,
    baseId,
    assetsTableId,
    tagsTableId,
    missingPrimaryTagFormula:
      env.AIRTABLE_MISSING_PRIMARY_TAG_FORMULA ||
      `AND(NOT({${PRIMARY_TAG_FIELD_ID}}), FIND('Template', {${ASSET_TYPE_FIELD_ID}}), FIND('Published', {${MARKETPLACE_STATUS_FIELD_ID}}), {${PUBLISHED_DATE_FIELD_ID}}, DATETIME_FORMAT({${PUBLISHED_DATE_FIELD_ID}}, 'YYYY') = DATETIME_FORMAT(TODAY(), 'YYYY'))`,
    minConfidence,
    requestDelayMs: Number.parseInt(env.AIRTABLE_REQUEST_DELAY_MS || '250', 10),
    targetTimeZone: env.TARGET_TIME_ZONE || 'America/Chicago',
    targetHour,
    dryRun: env.DRY_RUN === 'true'
  };
}

function parseConfidence(value: string): AssignmentConfidence {
  if (value === 'high' || value === 'medium' || value === 'low') return value;
  throw new Error(`Invalid confidence "${value}". Expected high, medium, or low.`);
}

function centralHour(epochMs: number, timeZone: string): number {
  const hour = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    hour12: false,
    timeZone
  }).format(new Date(epochMs));
  return Number.parseInt(hour, 10);
}

function shouldRunAtScheduledTime(controller: ScheduledController, config: Config): boolean {
  return centralHour(controller.scheduledTime, config.targetTimeZone) === config.targetHour;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function airtableFetch(
  config: Config,
  url: string,
  init: RequestInit = {},
  tries = 6
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= tries; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
          ...(init.headers || {})
        }
      });

      if (response.status === 429 || response.status >= 500) {
        const retryAfter = Number.parseInt(response.headers.get('retry-after') || '', 10);
        const backoffMs = Number.isFinite(retryAfter)
          ? retryAfter * 1000
          : Math.min(30_000, 500 * 2 ** (attempt - 1));
        await sleep(backoffMs);
        continue;
      }

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Airtable API error ${response.status}: ${text.slice(0, 1000)}`);
      }

      return response;
    } catch (error) {
      lastError = error;
      if (attempt < tries) {
        await sleep(Math.min(10_000, 250 * 2 ** (attempt - 1)));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Unknown Airtable request failure.');
}

async function fetchAllRecords(
  config: Config,
  tableId: string,
  fields: string[],
  filterByFormula?: string,
  returnFieldsByFieldId = false
): Promise<AirtableRecord[]> {
  const records: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const params = new URLSearchParams();
    params.set('pageSize', '100');
    if (filterByFormula) params.set('filterByFormula', filterByFormula);
    if (returnFieldsByFieldId) params.set('returnFieldsByFieldId', 'true');
    for (const field of fields) {
      params.append('fields[]', field);
    }
    if (offset) params.set('offset', offset);

    const url = `${AIRTABLE_API_BASE}/${config.baseId}/${encodeURIComponent(tableId)}?${params}`;
    const response = await airtableFetch(config, url);
    const data = (await response.json()) as AirtableResponse;
    records.push(...data.records);
    offset = data.offset;

    if (offset) await sleep(config.requestDelayMs);
  } while (offset);

  return records;
}

async function fetchTags(config: Config): Promise<Map<string, Tag>> {
  const records = await fetchAllRecords(config, config.tagsTableId, [NAME_FIELD]);
  const tagMap = new Map<string, Tag>();

  for (const record of records) {
    const name = record.fields[NAME_FIELD];
    if (typeof name === 'string' && name.trim()) {
      tagMap.set(name.toLowerCase(), { id: record.id, name });
    }
  }

  if (tagMap.size === 0) {
    throw new Error(`No tags found in Airtable table ${config.tagsTableId}.`);
  }

  return tagMap;
}

async function fetchAssetsMissingPrimaryTags(config: Config): Promise<Asset[]> {
  const records = await fetchAllRecords(
    config,
    config.assetsTableId,
    [NAME_FIELD, CATEGORY_GROUPS_FIELD, DESCRIPTION_SHORT_FIELD],
    config.missingPrimaryTagFormula
  );

  return records.map((record) => ({
    id: record.id,
    name: typeof record.fields[NAME_FIELD] === 'string' ? record.fields[NAME_FIELD] : '',
    categoryGroups: toStringArray(record.fields[CATEGORY_GROUPS_FIELD]),
    descriptionShort:
      typeof record.fields[DESCRIPTION_SHORT_FIELD] === 'string'
        ? record.fields[DESCRIPTION_SHORT_FIELD]
        : ''
  }));
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((entry) => (typeof entry === 'string' ? entry.trim() : '')).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
}

function toLinkedRecordIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (typeof entry === 'string') return entry;
      if (entry && typeof entry === 'object' && 'id' in entry) {
        return String((entry as { id: unknown }).id);
      }
      return null;
    })
    .filter((entry): entry is string => Boolean(entry));
}

function meetsConfidence(actual: AssignmentConfidence, minimum: AssignmentConfidence): boolean {
  return CONFIDENCE_RANK[actual] >= CONFIDENCE_RANK[minimum];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsKeyword(text: string, keyword: string): boolean {
  const escaped = escapeRegExp(keyword).replace(/\\ /g, '\\s+');
  return new RegExp(`(^|[^a-z0-9])${escaped}(?=$|[^a-z0-9])`, 'i').test(text);
}

function normalizeTagToken(value: string): string {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, '');
  if (normalized.length > 3 && normalized.endsWith('s')) return normalized.slice(0, -1);
  return normalized;
}

function tagTokens(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map(normalizeTagToken)
    .filter(Boolean);
}

function resolveTag(tagMap: Map<string, Tag>, requestedName: string): Tag | undefined {
  const exact = tagMap.get(requestedName.toLowerCase());
  if (exact) return exact;

  for (const alias of TAG_NAME_ALIASES[requestedName] || []) {
    const aliasMatch = tagMap.get(alias.toLowerCase());
    if (aliasMatch) return aliasMatch;
  }

  const requestedTokens = tagTokens(requestedName);
  if (requestedTokens.length === 0) return undefined;
  if (requestedTokens.length === 1 && !SAFE_SINGLE_TOKEN_TAG_MATCHES.has(requestedTokens[0])) {
    return undefined;
  }

  const matches = [...tagMap.values()]
    .map((tag) => ({ tag, tokens: tagTokens(tag.name) }))
    .filter(({ tokens }) => requestedTokens.every((token) => tokens.includes(token)))
    .sort((a, b) => {
      const lengthDiff = a.tokens.length - b.tokens.length;
      if (lengthDiff !== 0) return lengthDiff;
      return a.tag.name.localeCompare(b.tag.name);
    });

  return matches[0]?.tag;
}

function determinePrimaryTag(asset: Asset, tagMap: Map<string, Tag>): CandidateAssignment | null {
  const validCategories = asset.categoryGroups.filter(Boolean);
  const normalizedName = asset.name.toLowerCase();
  const normalizedDescription = asset.descriptionShort.toLowerCase();
  const searchText = `${normalizedName} ${normalizedDescription}`;

  for (const category of validCategories) {
    const exactMatch = resolveTag(tagMap, category);
    if (exactMatch) {
      const isExact = exactMatch.name.toLowerCase() === category.toLowerCase();
      return {
        tag: exactMatch,
        confidence: 'high',
        reason: isExact
          ? `Exact match with category "${category}"`
          : `Resolved category "${category}" to "${exactMatch.name}"`
      };
    }
  }

  for (const category of validCategories) {
    const mappedTags = CATEGORY_TO_TAG_MAP[category];
    if (!mappedTags) continue;
    for (const tagName of mappedTags) {
      const tag = resolveTag(tagMap, tagName);
      if (tag) {
        return {
          tag,
          confidence: 'high',
          reason: `Mapped from category "${category}" to "${tag.name}"`
        };
      }
    }
  }

  for (const [keyword, tagNames] of Object.entries(KEYWORD_TO_TAGS)) {
    if (!containsKeyword(searchText, keyword)) continue;
    for (const tagName of tagNames) {
      const tag = resolveTag(tagMap, tagName);
      if (tag) {
        const source = containsKeyword(normalizedDescription, keyword) ? 'description' : 'name';
        return {
          tag,
          confidence: 'medium',
          reason: `${source} contains keyword "${keyword}" -> "${tag.name}"`
        };
      }
    }
  }

  if (validCategories.length > 0) {
    const firstCategory = validCategories[0];
    const firstWord = firstCategory.split(/[&,]/)[0].trim();
    const fallbackTag = resolveTag(tagMap, firstWord);
    if (fallbackTag) {
      return {
        tag: fallbackTag,
        confidence: 'low',
        reason: `Fallback: first word of category "${firstWord}"`
      };
    }
  }

  return null;
}

function buildAssignments(
  assets: Asset[],
  tagMap: Map<string, Tag>,
  minConfidence: AssignmentConfidence
): {
  assignments: TagAssignment[];
  skippedBelowConfidence: number;
  unassigned: number;
} {
  const assignments: TagAssignment[] = [];
  let skippedBelowConfidence = 0;
  let unassigned = 0;

  for (const asset of assets) {
    const result = determinePrimaryTag(asset, tagMap);
    if (result && meetsConfidence(result.confidence, minConfidence)) {
      assignments.push({
        assetId: asset.id,
        assetName: asset.name,
        categoryGroups: asset.categoryGroups,
        assignedTag: result.tag.name,
        tagId: result.tag.id,
        confidence: result.confidence,
        reason: result.reason
      });
    } else if (result) {
      skippedBelowConfidence += 1;
    } else {
      unassigned += 1;
    }
  }

  return { assignments, skippedBelowConfidence, unassigned };
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function recordIdFormula(recordIds: string[]): string {
  return `OR(${recordIds.map((id) => `RECORD_ID()='${id}'`).join(',')})`;
}

async function fetchPrimaryTagMap(
  config: Config,
  assetIds: string[]
): Promise<Map<string, string[]>> {
  if (assetIds.length === 0) return new Map();

  const records = await fetchAllRecords(
    config,
    config.assetsTableId,
    [],
    recordIdFormula(assetIds),
    true
  );

  const primaryTagsByAssetId = new Map<string, string[]>();
  for (const record of records) {
    primaryTagsByAssetId.set(record.id, toLinkedRecordIds(record.fields[PRIMARY_TAG_FIELD_ID]));
  }

  return primaryTagsByAssetId;
}

async function patchAssignmentBatch(
  config: Config,
  assignments: TagAssignment[]
): Promise<{ updated: number; skipped: number; failed: number }> {
  const currentPrimaryTags = await fetchPrimaryTagMap(
    config,
    assignments.map((assignment) => assignment.assetId)
  );

  const writableAssignments = assignments.filter((assignment) => {
    const current = currentPrimaryTags.get(assignment.assetId) || [];
    return current.length === 0;
  });

  const skipped = assignments.length - writableAssignments.length;
  if (writableAssignments.length === 0) return { updated: 0, skipped, failed: 0 };

  const params = new URLSearchParams();
  params.set('returnFieldsByFieldId', 'true');
  const url = `${AIRTABLE_API_BASE}/${config.baseId}/${config.assetsTableId}?${params}`;
  const response = await airtableFetch(config, url, {
    method: 'PATCH',
    body: JSON.stringify({
      records: writableAssignments.map((assignment) => ({
        id: assignment.assetId,
        fields: {
          [PRIMARY_TAG_FIELD_ID]: [assignment.tagId]
        }
      })),
      typecast: false
    })
  });
  await response.json();

  const verifiedPrimaryTags = await fetchPrimaryTagMap(
    config,
    writableAssignments.map((assignment) => assignment.assetId)
  );

  let updated = 0;
  let failed = 0;
  for (const assignment of writableAssignments) {
    const current = verifiedPrimaryTags.get(assignment.assetId) || [];
    if (current.includes(assignment.tagId)) {
      updated += 1;
    } else {
      failed += 1;
      console.error(
        JSON.stringify({
          event: 'airtable-primary-tags.verify-failed',
          assetId: assignment.assetId,
          assetName: assignment.assetName,
          assignedTag: assignment.assignedTag,
          expectedTagId: assignment.tagId,
          current
        })
      );
    }
  }

  return { updated, skipped, failed };
}

async function updateAssignments(
  config: Config,
  assignments: TagAssignment[]
): Promise<RunSummary['updates']> {
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  let processed = 0;

  for (const batch of chunk(assignments, 10)) {
    processed += batch.length;
    const result = await patchAssignmentBatch(config, batch);
    updated += result.updated;
    skipped += result.skipped;
    failed += result.failed;

    if (processed % 100 === 0 || processed === assignments.length) {
      console.log(
        JSON.stringify({
          event: 'airtable-primary-tags.progress',
          processed,
          total: assignments.length,
          updated,
          skipped,
          failed
        })
      );
    }

    await sleep(config.requestDelayMs);
  }

  return { planned: assignments.length, updated, skipped, failed };
}

async function runPrimaryTagFill(config: Config): Promise<RunSummary> {
  const [tagMap, assets] = await Promise.all([
    fetchTags(config),
    fetchAssetsMissingPrimaryTags(config)
  ]);

  const { assignments, skippedBelowConfidence, unassigned } = buildAssignments(
    assets,
    tagMap,
    config.minConfidence
  );

  const updateSummary = config.dryRun
    ? {
        planned: assignments.length,
        updated: assignments.length,
        skipped: 0,
        failed: 0
      }
    : await updateAssignments(config, assignments);

  return {
    mode: config.dryRun ? 'dry-run' : 'live',
    minConfidence: config.minConfidence,
    assetsFetched: assets.length,
    assignable: assignments.length,
    skippedBelowConfidence,
    unassigned,
    updates: updateSummary
  };
}

export default {
  async scheduled(controller: ScheduledController, env: Env): Promise<void> {
    const config = buildConfig(env);
    if (!shouldRunAtScheduledTime(controller, config)) {
      console.log(
        JSON.stringify({
          event: 'airtable-primary-tags.skipped',
          reason: 'outside-target-hour',
          targetTimeZone: config.targetTimeZone,
          targetHour: config.targetHour,
          scheduledTime: controller.scheduledTime
        })
      );
      return;
    }

    const summary = await runPrimaryTagFill(config);
    console.log(JSON.stringify({ event: 'airtable-primary-tags.complete', summary }));
    if (summary.updates.failed > 0) {
      throw new Error(`Airtable primary tag fill failed for ${summary.updates.failed} records.`);
    }
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return Response.json({
        ok: true,
        service: 'airtable-primary-tags',
        targetTimeZone: env.TARGET_TIME_ZONE || 'America/Chicago',
        targetHour: Number.parseInt(env.TARGET_HOUR || '9', 10),
        minConfidence: env.AIRTABLE_MIN_CONFIDENCE || 'medium'
      });
    }

    return Response.json(
      {
        ok: true,
        service: 'airtable-primary-tags',
        routes: ['/health']
      },
      { status: 200 }
    );
  }
};
