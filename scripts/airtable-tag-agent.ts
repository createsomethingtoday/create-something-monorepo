/**
 * Airtable Primary Tag Assignment Agent
 *
 * Reads assets missing primary tags from an Airtable view, determines the best
 * primary tag based on Category Groups and asset names, then updates the
 * Tags (Primary) field with the appropriate linked record.
 *
 * Usage:
 *   npx tsx scripts/airtable-tag-agent.ts --dry-run --limit 10 --verbose
 *   npx tsx scripts/airtable-tag-agent.ts --live --min-confidence high
 *
 * Production defaults:
 * - dry-run unless --live is passed
 * - live runs only write high-confidence category matches unless overridden
 * - every live write re-checks Airtable so existing primary tags are not overwritten
 */

const PRIMARY_TAG_FIELD_NAME =
  process.env.AIRTABLE_PRIMARY_TAG_FIELD_NAME || 'ℹ️🏷️Tags (Primary; 🏗️ only)';

// Configuration
const CONFIG = {
  BASE_ID: process.env.AIRTABLE_BASE_ID || 'appMoIgXMTTTNIc3p',
  ASSETS_TABLE_ID: process.env.AIRTABLE_ASSETS_TABLE_ID || 'tblRwzpWoLgE9MrUm',
  TAGS_TABLE_ID: process.env.AIRTABLE_TAGS_TABLE_ID || 'tblb4969G7O75gVWV',
  TAGS_TABLE_FALLBACK_NAME: process.env.AIRTABLE_TAGS_TABLE_NAME || '🏷️Tags',
  VIEW_ID: process.env.AIRTABLE_MISSING_PRIMARY_TAG_VIEW_ID || '',
  PRIMARY_TAG_FIELD_ID: process.env.AIRTABLE_PRIMARY_TAG_FIELD_ID || 'fldOERCPutLT9ihWX',
  PRIMARY_TAG_FIELD_NAME,
  MISSING_PRIMARY_TAG_FORMULA:
    process.env.AIRTABLE_MISSING_PRIMARY_TAG_FORMULA || `NOT({${PRIMARY_TAG_FIELD_NAME}})`,
  NAME_FIELD: 'Name',
  CATEGORY_GROUPS_FIELD: '🪣Category Group(s) Display Name',
  DESCRIPTION_SHORT_FIELD: 'ℹ️Description (Short)',
  // API rate limiting
  REQUEST_DELAY_MS: Number.parseInt(process.env.AIRTABLE_REQUEST_DELAY_MS || '250', 10),
  PROGRESS_LOG_INTERVAL: 100
};

// Category Group to Tag mapping
// When multiple tags are possible, they're ordered by preference
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
  // Additional mappings from observed data
  Entertainment: ['Entertainment', 'Music', 'Event', 'Game'],
  'Photography & Video': ['Photography', 'Video', 'Photography & Video'],
  'Travel & Tourism': ['Travel', 'Tourism', 'Hotel', 'Hostel'],
  'Finance & Banking': ['Finance', 'Bank', 'Investment', 'Insurance'],
  'Sports & Fitness': ['Sports', 'Fitness', 'Gym', 'sport'],
  'Non-Profit & Charity': ['Nonprofit', 'Charity', 'Donation'],
  'Resume & Personal': ['Resume', 'Personal', 'CV', 'Profile'],
  'Coming Soon & Launch': ['Coming Soon', 'Landing page', 'Under Construction'],
  // More observed category groups
  'Hair & Beauty': ['Beauty', 'Salon', 'Barber', 'Spa'],
  'Community & Nonprofit': ['Nonprofit', 'Charity', 'Church'],
  'Home Services': ['Construction', 'Interior design', 'Real Estate'],
  Government: ['Business', 'Corporate', 'Nonprofit'],
  Medical: ['Medical', 'Doctor', 'Health', 'Dentist', 'Hospital'],
  Wellness: ['Wellness', 'Health', 'Spa', 'Fitness'],
  Documentation: ['Documentation', 'Help center'],
  'Real Estate': ['Real Estate'],
  // More specific categories that might appear
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
  // Additional mappings found from remaining unassigned items
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

// Types
interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}

interface AirtableResponse {
  records: AirtableRecord[];
  offset?: string;
}

interface Tag {
  id: string;
  name: string;
}

interface Asset {
  id: string;
  name: string;
  categoryGroups: string[];
  descriptionShort?: string;
}

type AssignmentConfidence = 'high' | 'medium' | 'low';

interface TagAssignment {
  assetId: string;
  assetName: string;
  categoryGroups: string[];
  assignedTag: string;
  tagId: string;
  confidence: AssignmentConfidence;
  reason: string;
}

interface CandidateAssignment {
  tag: Tag;
  confidence: AssignmentConfidence;
  reason: string;
}

interface CliOptions {
  dryRun: boolean;
  live: boolean;
  limit: number | null;
  verbose: boolean;
  minConfidence: AssignmentConfidence;
  json: boolean;
  help: boolean;
}

interface UpdateResult {
  status: 'updated' | 'skipped' | 'failed';
  reason?: string;
}

const CONFIDENCE_RANK: Record<AssignmentConfidence, number> = {
  low: 0,
  medium: 1,
  high: 2
};

// Parse CLI arguments
function getArgValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1) return undefined;
  return args[index + 1];
}

function parseConfidence(
  value: string | undefined,
  fallback: AssignmentConfidence
): AssignmentConfidence {
  if (!value) return fallback;
  if (value === 'high' || value === 'medium' || value === 'low') return value;
  throw new Error(`Invalid --min-confidence value "${value}". Expected high, medium, or low.`);
}

function parseLimit(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid --limit value "${value}". Expected a positive integer.`);
  }
  return parsed;
}

function printUsage() {
  console.log(`Airtable Primary Tag Assignment Agent

Usage:
  npx tsx scripts/airtable-tag-agent.ts [options]

Options:
  --dry-run                 Preview assignments without writing Airtable (default)
  --live                    Write assignments to Airtable
  --limit <n>               Process only the first n records from the missing-tag view
  --min-confidence <level>  high, medium, or low. Defaults to low for dry-run, high for live
  --json                    Print a machine-readable JSON summary at the end
  --verbose, -v             Print per-record diagnostics
  --help                    Show this help

Environment:
  AIRTABLE_PAT, AIRTABLE_API_TOKEN, or AIRTABLE_API_KEY is required for Airtable access.
  Optional overrides: AIRTABLE_BASE_ID, AIRTABLE_ASSETS_TABLE_ID,
  AIRTABLE_TAGS_TABLE_ID, AIRTABLE_TAGS_TABLE_NAME, AIRTABLE_MISSING_PRIMARY_TAG_VIEW_ID,
  AIRTABLE_MISSING_PRIMARY_TAG_FORMULA, AIRTABLE_PRIMARY_TAG_FIELD_ID,
  AIRTABLE_PRIMARY_TAG_FIELD_NAME, AIRTABLE_REQUEST_DELAY_MS.`);
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2).filter((arg) => arg !== '--');
  const live = args.includes('--live');
  const explicitDryRun = args.includes('--dry-run');

  if (live && explicitDryRun) {
    throw new Error('Use either --live or --dry-run, not both.');
  }

  const minConfidence = parseConfidence(
    getArgValue(args, '--min-confidence'),
    live ? 'high' : 'low'
  );

  return {
    dryRun: !live,
    live,
    limit: parseLimit(getArgValue(args, '--limit')),
    verbose: args.includes('--verbose') || args.includes('-v'),
    minConfidence,
    json: args.includes('--json'),
    help: args.includes('--help') || args.includes('-h')
  };
}

// Get API key from environment
function getApiKey(): string {
  const pat =
    process.env.AIRTABLE_PAT || process.env.AIRTABLE_API_TOKEN || process.env.AIRTABLE_API_KEY;

  if (!pat) {
    throw new Error(
      'AIRTABLE_PAT, AIRTABLE_API_TOKEN, or AIRTABLE_API_KEY environment variable is required.\n' +
        'Set it with: export AIRTABLE_PAT="pat..."'
    );
  }
  return pat;
}

// Sleep utility for rate limiting
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Fetch all records from a table with pagination
async function fetchAllRecords(
  tableId: string,
  fields: string[],
  viewId?: string,
  returnFieldsByFieldId = false,
  filterByFormula?: string
): Promise<AirtableRecord[]> {
  const apiKey = getApiKey();
  const allRecords: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const params = new URLSearchParams();
    if (viewId) params.set('view', viewId);
    if (filterByFormula) params.set('filterByFormula', filterByFormula);
    if (returnFieldsByFieldId) params.set('returnFieldsByFieldId', 'true');
    fields.forEach((field) => params.append('fields[]', field));
    if (offset) params.set('offset', offset);

    const url = `https://api.airtable.com/v0/${CONFIG.BASE_ID}/${encodeURIComponent(tableId)}?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Airtable API error: ${response.status} - ${error}`);
    }

    const data: AirtableResponse = await response.json();
    allRecords.push(...data.records);
    offset = data.offset;

    // Rate limiting
    await sleep(CONFIG.REQUEST_DELAY_MS);
  } while (offset);

  return allRecords;
}

async function fetchRecordFieldsById(
  recordId: string,
  _fieldIds: string[]
): Promise<Record<string, unknown>> {
  const apiKey = getApiKey();
  const params = new URLSearchParams();
  params.set('returnFieldsByFieldId', 'true');

  const url = `https://api.airtable.com/v0/${CONFIG.BASE_ID}/${CONFIG.ASSETS_TABLE_ID}/${recordId}?${params.toString()}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Airtable API error: ${response.status} - ${error}`);
  }

  const record = (await response.json()) as AirtableRecord;
  await sleep(CONFIG.REQUEST_DELAY_MS);
  return record.fields || {};
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter((entry) => entry.length > 0);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
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

async function fetchCurrentPrimaryTagIds(assetId: string): Promise<string[]> {
  const fields = await fetchRecordFieldsById(assetId, [CONFIG.PRIMARY_TAG_FIELD_ID]);
  return toLinkedRecordIds(fields[CONFIG.PRIMARY_TAG_FIELD_ID]);
}

// Fetch all tags and build name -> ID map
async function fetchAllTags(): Promise<Map<string, Tag>> {
  console.log('📚 Fetching all tags from Tags table...');

  const tableCandidates = [CONFIG.TAGS_TABLE_ID, CONFIG.TAGS_TABLE_FALLBACK_NAME].filter(
    (table, index, tables) => table && tables.indexOf(table) === index
  );

  const tagMap = new Map<string, Tag>();
  let lastError: unknown;

  for (const table of tableCandidates) {
    try {
      const records = await fetchAllRecords(table, [CONFIG.NAME_FIELD]);

      for (const record of records) {
        const name = record.fields[CONFIG.NAME_FIELD] as string;
        if (name) {
          tagMap.set(name.toLowerCase(), {
            id: record.id,
            name
          });
        }
      }

      if (tagMap.size === 0) {
        throw new Error(`No tags found in Airtable table ${table}`);
      }

      console.log(`✅ Loaded ${tagMap.size} tags from ${table}`);
      return tagMap;
    } catch (error) {
      lastError = error;
      tagMap.clear();
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Unable to fetch Airtable tags');
}

// Fetch assets missing primary tags from the filtered view
async function fetchAssetsMissingTags(limit?: number | null): Promise<Asset[]> {
  console.log('📋 Fetching assets missing primary tags...');

  const fields = [CONFIG.NAME_FIELD, CONFIG.CATEGORY_GROUPS_FIELD, CONFIG.DESCRIPTION_SHORT_FIELD];
  let records: AirtableRecord[] | null = null;

  if (CONFIG.VIEW_ID) {
    try {
      records = await fetchAllRecords(CONFIG.ASSETS_TABLE_ID, fields, CONFIG.VIEW_ID);
    } catch (error) {
      console.warn(
        `⚠️  Failed to fetch missing-tag view ${CONFIG.VIEW_ID}; falling back to formula filter.`
      );
      if (process.env.DEBUG_AIRTABLE_TAG_AGENT === 'true') {
        console.warn(error);
      }
    }
  }

  records ??= await fetchAllRecords(
    CONFIG.ASSETS_TABLE_ID,
    fields,
    undefined,
    false,
    CONFIG.MISSING_PRIMARY_TAG_FORMULA
  );

  let assets = records.map((record) => ({
    id: record.id,
    name: (record.fields[CONFIG.NAME_FIELD] as string) || '',
    categoryGroups: toStringArray(record.fields[CONFIG.CATEGORY_GROUPS_FIELD]),
    descriptionShort: (record.fields[CONFIG.DESCRIPTION_SHORT_FIELD] as string) || ''
  }));

  if (limit && limit > 0) {
    assets = assets.slice(0, limit);
  }

  console.log(`✅ Found ${assets.length} assets missing primary tags`);
  return assets;
}

function meetsConfidence(actual: AssignmentConfidence, minimum: AssignmentConfidence): boolean {
  return CONFIDENCE_RANK[actual] >= CONFIDENCE_RANK[minimum];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeTagToken(value: string): string {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, '');
  if (normalized.length > 3 && normalized.endsWith('s')) {
    return normalized.slice(0, -1);
  }
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

  const allowTokenMatch =
    requestedTokens.length > 1 || SAFE_SINGLE_TOKEN_TAG_MATCHES.has(requestedTokens[0]);
  if (!allowTokenMatch) return undefined;

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

function containsKeyword(text: string, keyword: string): boolean {
  const escaped = escapeRegExp(keyword).replace(/\\ /g, '\\s+');
  const pattern = new RegExp(`(^|[^a-z0-9])${escaped}(?=$|[^a-z0-9])`, 'i');
  return pattern.test(text);
}

// Determine the best primary tag for an asset
function determinePrimaryTag(asset: Asset, tagMap: Map<string, Tag>): CandidateAssignment | null {
  const { name, categoryGroups, descriptionShort } = asset;

  // Filter out null/undefined categories
  const validCategories = categoryGroups.filter((c) => c != null && typeof c === 'string');

  // Combine name and description for keyword matching
  const normalizedName = name.toLowerCase();
  const normalizedDescription = (descriptionShort || '').toLowerCase();
  const searchText = `${normalizedName} ${normalizedDescription}`;

  // Strategy 1: Exact match - check if any category group exactly matches a tag
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

  // Strategy 2: Use mapping table
  for (const category of validCategories) {
    const mappedTags = CATEGORY_TO_TAG_MAP[category];
    if (mappedTags) {
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
  }

  // Strategy 3: Name and description-based inference - look for keywords
  const nameKeywords: Record<string, string[]> = {
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
    // Fallback generic keywords for templates without specific context
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

  for (const [keyword, tagNames] of Object.entries(nameKeywords)) {
    if (containsKeyword(searchText, keyword)) {
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
  }

  // Strategy 4: Fallback - use first category group's first word as tag
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

// Update asset with primary tag
async function updateAssetTag(assetId: string, tagId: string): Promise<UpdateResult> {
  const apiKey = getApiKey();

  const currentPrimaryTagIds = await fetchCurrentPrimaryTagIds(assetId);
  if (currentPrimaryTagIds.length > 0) {
    return {
      status: 'skipped',
      reason: `already has primary tag ${currentPrimaryTagIds.join(', ')}`
    };
  }

  const params = new URLSearchParams();
  params.set('returnFieldsByFieldId', 'true');
  const url = `https://api.airtable.com/v0/${CONFIG.BASE_ID}/${CONFIG.ASSETS_TABLE_ID}/${assetId}?${params.toString()}`;

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fields: {
        [CONFIG.PRIMARY_TAG_FIELD_ID]: [tagId]
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`❌ Failed to update asset ${assetId}: ${error}`);
    return { status: 'failed', reason: error };
  }

  await response.json();

  const verifiedPrimaryTagIds = await fetchCurrentPrimaryTagIds(assetId);
  if (!verifiedPrimaryTagIds.includes(tagId)) {
    return {
      status: 'failed',
      reason: 'Airtable record did not include the expected primary tag after update'
    };
  }

  return { status: 'updated' };
}

// Batch update assets with primary tags
async function batchUpdateAssets(
  assignments: TagAssignment[],
  dryRun: boolean,
  verbose: boolean
): Promise<{ planned: number; updated: number; skipped: number; failed: number }> {
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < assignments.length; i++) {
    const assignment = assignments[i];

    if (verbose || (i + 1) % CONFIG.PROGRESS_LOG_INTERVAL === 0) {
      console.log(`📝 [${i + 1}/${assignments.length}] ${assignment.assetName}`);
      console.log(`   Categories: ${assignment.categoryGroups.join(', ') || '(none)'}`);
      console.log(
        `   → Tag: ${assignment.assignedTag} (${assignment.confidence}, ${assignment.reason})`
      );
    }

    if (!dryRun) {
      const result = await updateAssetTag(assignment.assetId, assignment.tagId);
      if (result.status === 'updated') {
        updated++;
      } else if (result.status === 'skipped') {
        skipped++;
        if (verbose) {
          console.log(`   Skipped: ${result.reason}`);
        }
      } else {
        failed++;
        if (verbose && result.reason) {
          console.log(`   Failed: ${result.reason}`);
        }
      }
      // Rate limiting
      await sleep(CONFIG.REQUEST_DELAY_MS);
    } else {
      updated++;
    }
  }

  return { planned: assignments.length, updated, skipped, failed };
}

// Main execution
async function main() {
  const options = parseArgs();
  const { dryRun, limit, verbose, minConfidence } = options;

  if (options.help) {
    printUsage();
    return;
  }

  console.log('🏷️  Airtable Primary Tag Assignment Agent');
  console.log('=========================================');
  console.log(`Mode: ${dryRun ? '🔍 DRY RUN (no changes)' : '✏️  LIVE (will update records)'}`);
  console.log(`Minimum confidence: ${minConfidence}`);
  if (limit) console.log(`Limit: ${limit} records`);
  console.log(`Base: ${CONFIG.BASE_ID}`);
  console.log(`Assets table: ${CONFIG.ASSETS_TABLE_ID}`);
  console.log(`Tags table: ${CONFIG.TAGS_TABLE_ID}`);
  console.log(
    CONFIG.VIEW_ID
      ? `Missing-primary-tag source: view ${CONFIG.VIEW_ID}`
      : `Missing-primary-tag source: formula ${CONFIG.MISSING_PRIMARY_TAG_FORMULA}`
  );
  console.log('');

  try {
    // Step 1: Fetch all tags
    const tagMap = await fetchAllTags();

    // Step 2: Fetch assets missing tags
    const assets = await fetchAssetsMissingTags(limit);

    if (assets.length === 0) {
      console.log('✅ No assets missing primary tags!');
      if (options.json) {
        console.log(
          JSON.stringify(
            {
              mode: dryRun ? 'dry-run' : 'live',
              minConfidence,
              assetsFetched: 0,
              assignable: 0,
              skippedBelowConfidence: 0,
              unassigned: 0,
              updates: {
                planned: 0,
                updated: 0,
                skipped: 0,
                failed: 0
              }
            },
            null,
            2
          )
        );
      }
      return;
    }

    // Step 3: Determine primary tag for each asset
    console.log('\n🔄 Processing assets...');
    const assignments: TagAssignment[] = [];
    const skippedForConfidence: Array<{ asset: Asset; result: CandidateAssignment }> = [];
    const unassigned: Asset[] = [];

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
        skippedForConfidence.push({ asset, result });
      } else {
        unassigned.push(asset);
      }
    }

    console.log(`\n📊 Results:`);
    console.log(`   Assignable at ${minConfidence}+ confidence: ${assignments.length}`);
    console.log(`   Skipped below confidence threshold: ${skippedForConfidence.length}`);
    console.log(`   Unassigned: ${unassigned.length}`);

    // Show some unassigned for debugging
    if (unassigned.length > 0 && verbose) {
      console.log('\n⚠️  Sample unassigned assets:');
      unassigned.slice(0, 10).forEach((asset) => {
        const desc = asset.descriptionShort
          ? ` | "${asset.descriptionShort.slice(0, 60)}${asset.descriptionShort.length > 60 ? '...' : ''}"`
          : '';
        console.log(
          `   - ${asset.name} [${asset.categoryGroups.join(', ') || 'no categories'}]${desc}`
        );
      });
    }

    if (skippedForConfidence.length > 0 && verbose) {
      console.log('\n⚠️  Sample low-confidence candidates:');
      skippedForConfidence.slice(0, 10).forEach(({ asset, result }) => {
        console.log(
          `   - ${asset.name} -> ${result.tag.name} (${result.confidence}, ${result.reason})`
        );
      });
    }

    // Step 4: Update assets
    let updateSummary: Awaited<ReturnType<typeof batchUpdateAssets>> = {
      planned: 0,
      updated: 0,
      skipped: 0,
      failed: 0
    };

    if (assignments.length > 0) {
      console.log(
        `\n${dryRun ? '🔍 Would update' : '✏️  Updating'} ${assignments.length} assets...`
      );
      updateSummary = await batchUpdateAssets(assignments, dryRun, verbose);

      console.log(`\n✅ Complete!`);
      console.log(`   Planned: ${updateSummary.planned}`);
      console.log(`   ${dryRun ? 'Would update' : 'Updated'}: ${updateSummary.updated}`);
      if (updateSummary.skipped > 0)
        console.log(`   Skipped at write time: ${updateSummary.skipped}`);
      if (updateSummary.failed > 0) console.log(`   Failed: ${updateSummary.failed}`);
    } else if (!dryRun) {
      console.log('\n✅ No assignments meet the live write threshold.');
    }

    // Summary of tag distribution
    if (verbose) {
      const tagCounts = new Map<string, number>();
      for (const a of assignments) {
        tagCounts.set(a.assignedTag, (tagCounts.get(a.assignedTag) || 0) + 1);
      }

      console.log('\n📈 Tag Distribution:');
      const sorted = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]);
      sorted.slice(0, 20).forEach(([tag, count]) => {
        console.log(`   ${tag}: ${count}`);
      });
    }

    if (options.json) {
      console.log(
        JSON.stringify(
          {
            mode: dryRun ? 'dry-run' : 'live',
            minConfidence,
            assetsFetched: assets.length,
            assignable: assignments.length,
            skippedBelowConfidence: skippedForConfidence.length,
            unassigned: unassigned.length,
            updates: updateSummary
          },
          null,
          2
        )
      );
    }

    if (!dryRun && updateSummary.failed > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
