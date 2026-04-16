import Airtable from 'airtable';
import { createHash, randomBytes } from 'node:crypto';

const TABLES = {
  USERS: 'tbldQNGszIyOjt9a1',
  CREATORS: 'tbljt0plqxdMARZXb',
  ASSETS: 'tblRwzpWoLgE9MrUm',
  ASSET_VERSIONS: 'tblHxZ2hgSFLZxsZu',
  API_KEYS: 'tblU5rI3WiQerozvX',
  CATEGORY_PERFORMANCE: 'tblDU1oUiobNfMQP9',
  LEADERBOARD: 'tblcXLVLYobhNmrg6'
} as const;

const FIELDS = {
  VERIFICATION_TOKEN: 'fldI8NZzmJSEVly4D',
  TOKEN_EXPIRATION: 'fldbK6n1sooEQaoWg'
} as const;

const VIEWS = {
  ASSETS: 'viwETCKXDaVHbEnZQ',
  CATEGORY_PERFORMANCE: 'viw5EUGpK0xDMcBga',
  LEADERBOARD: 'viwEaYTAux1ADl5C5'
} as const;

const MARKETPLACE_TIMESTAMP_FIELD_HINTS = [
  'lastsync',
  'syncedat',
  'syncat',
  'lastupdated',
  'updatedat',
  'snapshotdate',
  'snapshotat',
  'asofdate',
  'dataasof',
  'refreshedat',
  'reportdate',
  'weekending',
  'windowend'
] as const;

const MARKETPLACE_TIMESTAMP_FIELD_EXCLUDES = [
  'published',
  'submitted',
  'decision',
  'release',
  'launch',
  'approval',
  'createdby'
] as const;

const CREATOR_EMAIL_FIELDS_PRIORITY = [
  '🎨📧 Creator Email',
  '🎨📧 Creator WF Account Email',
  '📧Emails (from 🎨Creator)',
  'CREATOR_EMAIL'
] as const;

const CATEGORY_FIELDS_PRIORITY = [
  '🏷️Category',
  '🏷️Categories',
  '📂Primary Category',
  '📂Category',
  'CATEGORY',
  'Category'
] as const;

const SUBCATEGORY_FIELDS_PRIORITY = [
  '🏷️Subcategory',
  '🏷️Subcategories',
  '📂Primary Subcategory',
  '📂Subcategory',
  'SUBCATEGORY',
  'Subcategory'
] as const;

const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface AirtableEnv {
  AIRTABLE_API_KEY: string;
  AIRTABLE_BASE_ID: string;
  ENVIRONMENT?: string;
  DEBUG_AIRTABLE?: string;
}

export interface AirtableEnvLike {
  AIRTABLE_API_KEY?: string;
  AIRTABLE_BASE_ID?: string;
  ENVIRONMENT?: string;
  DEBUG_AIRTABLE?: string;
}

export interface MarketplaceFreshnessMetadata {
  timestamp: string | null;
  source: 'field' | 'record-created-time' | 'none';
  fieldName?: string;
}

export interface Asset {
  id: string;
  name: string;
  description?: string;
  descriptionShort?: string;
  descriptionLongHtml?: string;
  type: 'Template' | 'Library' | 'App';
  category?: string;
  subcategory?: string;
  status: 'Draft' | 'Scheduled' | 'Upcoming' | 'Published' | 'Rejected' | 'Delisted';
  thumbnailUrl?: string;
  secondaryThumbnailUrl?: string;
  secondaryThumbnails?: string[];
  carouselImages?: string[];
  websiteUrl?: string;
  previewUrl?: string;
  marketplaceUrl?: string;
  submittedDate?: string;
  publishedDate?: string;
  decisionDate?: string;
  uniqueViewers?: number;
  cumulativePurchases?: number;
  cumulativeRevenue?: number;
  latestReviewStatus?: string;
  latestReviewDate?: string;
  latestReviewFeedback?: string;
  rejectionFeedback?: string;
  rejectionFeedbackHtml?: string;
  qualityScore?: string;
  priceString?: string;
  appCapabilities?: string;
  appInstallUrl?: string;
  appScopes?: string[];
  appAvatarAltText?: string;
  paymentType?: string[];
  visibility?: string;
  appCategory?: string[];
  creatorName?: string;
  creatorWebsite?: string;
  creatorContactEmail?: string;
  appFeaturesOverview?: string[];
  appDeveloperNotes?: string;
  appAccessCredentials?: string;
  appVideoUrl?: string;
  appDemoVideoUrl?: string;
  appPrivacyPolicyUrl?: string;
  appSupportEmail?: string;
  appSupportUrl?: string;
  appTermsUrl?: string;
  appScreenshotAltTexts?: string[];
}

export interface AssetUpdateData {
  name?: string;
  description?: string;
  descriptionShort?: string;
  descriptionLongHtml?: string;
  websiteUrl?: string;
  previewUrl?: string;
  thumbnailUrl?: string | null;
  secondaryThumbnailUrl?: string | null;
  secondaryThumbnails?: string[];
  carouselImages?: string[];
  appCapabilities?: string;
  appInstallUrl?: string;
  appScopes?: string[];
  appAvatarAltText?: string;
  paymentType?: string[];
  visibility?: string;
  appCategory?: string[];
  creatorName?: string;
  creatorWebsite?: string;
  creatorContactEmail?: string;
  appFeaturesOverview?: string[];
  appDeveloperNotes?: string;
  appAccessCredentials?: string;
  appVideoUrl?: string;
  appDemoVideoUrl?: string;
  appPrivacyPolicyUrl?: string;
  appSupportEmail?: string;
  appSupportUrl?: string;
  appTermsUrl?: string;
  appScreenshotAltTexts?: string[];
}

export interface Creator {
  id: string;
  name: string;
  email: string;
  emails?: string[];
  avatarUrl?: string;
  biography?: string;
  legalName?: string;
  websiteUrl?: string;
}

export interface CreateCreatorInput {
  email: string;
  webflowEmail: string;
  name: string;
  legalName: string;
  biography: string;
  avatarUrl?: string | null;
  websiteUrl?: string;
}

export interface CreateTemplateSubmissionInput {
  creatorEmail: string;
  creatorWebflowEmail?: string;
  name: string;
  description?: string;
  descriptionShort?: string;
  descriptionLongHtml?: string;
  websiteUrl?: string;
  previewUrl?: string;
  priceString?: string;
  thumbnailUrl?: string | null;
  secondaryThumbnailUrl?: string | null;
  secondaryThumbnails?: string[];
  carouselImages?: string[];
  metadata?: Record<string, unknown>;
}

export interface TemplateSubmissionRecord {
  asset: Asset;
  versionId?: string;
  warning?: string;
}

export interface AssetVersion {
  id: string;
  assetId: string;
  versionNumber: number;
  createdAt: string;
  createdBy: string;
  changes: string;
  snapshot: AssetVersionSnapshot;
}

export interface AssetVersionSnapshot extends AssetUpdateData {
  description?: string;
}

export interface ApiKey {
  id: string;
  name: string;
  createdAt: string;
  expiresAt?: string;
  lastUsedAt?: string;
  scopes: string[];
  status: 'Active' | 'Revoked' | 'Expired';
}

function parseTimestampCandidate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || /^\d{1,4}$/.test(trimmed)) {
      return null;
    }

    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const ms =
      value > 1_000_000_000_000 ? value : value > 1_000_000_000 ? value * 1000 : null;
    if (!ms) return null;

    const parsed = new Date(ms);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function isLikelyMarketplaceTimestampField(fieldName: string): boolean {
  const normalized = fieldName.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (MARKETPLACE_TIMESTAMP_FIELD_EXCLUDES.some((token) => normalized.includes(token))) {
    return false;
  }

  return MARKETPLACE_TIMESTAMP_FIELD_HINTS.some((token) => normalized.includes(token));
}

function isReasonableRecentTimestamp(date: Date, maxAgeDays: number): boolean {
  const now = Date.now();
  const value = date.getTime();
  const maxFuture = now + 2 * MS_PER_DAY;
  const minRecent = now - maxAgeDays * MS_PER_DAY;
  return value <= maxFuture && value >= minRecent;
}

function extractMarketplaceFreshness(
  records: readonly Airtable.Record<Airtable.FieldSet>[]
): MarketplaceFreshnessMetadata {
  let latestFieldTimestamp: { date: Date; fieldName: string } | null = null;
  let latestCreatedTime: Date | null = null;

  for (const record of records) {
    for (const [fieldName, rawValue] of Object.entries(record.fields)) {
      if (!isLikelyMarketplaceTimestampField(fieldName)) {
        continue;
      }

      const values = Array.isArray(rawValue) ? rawValue : [rawValue];
      for (const value of values) {
        const parsed = parseTimestampCandidate(value);
        if (!parsed || !isReasonableRecentTimestamp(parsed, 180)) {
          continue;
        }

        if (!latestFieldTimestamp || parsed.getTime() > latestFieldTimestamp.date.getTime()) {
          latestFieldTimestamp = { date: parsed, fieldName };
        }
      }
    }

    const createdAt = parseTimestampCandidate(
      (record as Airtable.Record<Airtable.FieldSet> & { _rawJson?: { createdTime?: string } })._rawJson
        ?.createdTime
    );

    if (createdAt && isReasonableRecentTimestamp(createdAt, 21)) {
      if (!latestCreatedTime || createdAt.getTime() > latestCreatedTime.getTime()) {
        latestCreatedTime = createdAt;
      }
    }
  }

  if (latestFieldTimestamp) {
    return {
      timestamp: latestFieldTimestamp.date.toISOString(),
      source: 'field',
      fieldName: latestFieldTimestamp.fieldName
    };
  }

  if (latestCreatedTime) {
    return {
      timestamp: latestCreatedTime.toISOString(),
      source: 'record-created-time'
    };
  }

  return {
    timestamp: null,
    source: 'none'
  };
}

export function escapeAirtableString(input: string): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }

  return input.replace(/'/g, "''");
}

export function buildCreatorEmailMatchFormula(email: string): string {
  const normalizedEmail = email.trim().toLowerCase();
  const escapedEmail = escapeAirtableString(normalizedEmail);
  const clauses = CREATOR_EMAIL_FIELDS_PRIORITY.map(
    (field) =>
      `FIND('${escapedEmail}', IFERROR(LOWER(ARRAYJOIN({${field}}, ",")), IFERROR(LOWER({${field}}), ""))) > 0`
  );

  return `OR(${clauses.join(', ')})`;
}

export function buildAssetListFormula(email: string): string {
  return `AND(${buildCreatorEmailMatchFormula(email)}, {🆎Type} = 'Template🏗️')`;
}

export function validateEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    throw new Error('Email must be a non-empty string');
  }

  const trimmedEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(trimmedEmail)) {
    throw new Error('Invalid email format');
  }

  if (trimmedEmail.length > 254) {
    throw new Error('Email too long');
  }

  return trimmedEmail;
}

export function validateToken(token: string): string {
  if (!token || typeof token !== 'string') {
    throw new Error('Token must be a non-empty string');
  }

  const trimmedToken = token.trim();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(trimmedToken)) {
    throw new Error('Invalid token format');
  }

  return trimmedToken;
}

export function cleanMarketplaceStatus(rawStatus: string): string {
  return rawStatus
    .replace(/^\d[\uFE0F]?[\u20E3]?/u, '')
    .replace(/^[0-9]+/u, '')
    .replace(/🆕/gu, '')
    .replace(/📅/gu, '')
    .replace(/🚀/gu, '')
    .replace(/☠️/gu, '')
    .replace(/❌/gu, '')
    .replace(/✅/gu, '')
    .trim();
}

function normalizeFieldName(fieldName: string): string {
  return fieldName.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function toStringArray(value: unknown): string[] {
  if (typeof value === 'string') {
    return value
      .split(/[,;\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (Array.isArray(value)) {
    return value
      .flatMap((item) => toStringArray(item))
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return [record.name, record.label, record.value, record.title]
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function firstString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || undefined;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const candidate = firstString(entry);
      if (candidate) return candidate;
    }
    return undefined;
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const candidate of [record.name, record.label, record.value, record.title, record.text]) {
      if (typeof candidate !== 'string') continue;
      const trimmed = candidate.trim();
      if (trimmed) return trimmed;
    }
  }

  return undefined;
}

function parseJsonArray(value: string): string[] | null {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return null;
    return parsed
      .flatMap((entry) => toStringArray(entry))
      .map((entry) => entry.trim())
      .filter(Boolean);
  } catch {
    return null;
  }
}

function parseDelimitedStringArray(
  value: unknown,
  delimiter: RegExp = /\n|,|;/,
  cleaner?: (entry: string) => string
): string[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((entry) => parseDelimitedStringArray(entry, delimiter, cleaner))
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    const parsedJson = parseJsonArray(trimmed);
    if (parsedJson) {
      return parsedJson
        .map((entry) => (cleaner ? cleaner(entry) : entry))
        .map((entry) => entry.trim())
        .filter(Boolean);
    }

    return trimmed
      .split(delimiter)
      .map((entry) => (cleaner ? cleaner(entry) : entry))
      .map((entry) => entry.trim().replace(/^"|"$/g, ''))
      .filter(Boolean);
  }

  return toStringArray(value)
    .map((entry) => (cleaner ? cleaner(entry) : entry))
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseScopesField(value: unknown): string[] {
  return parseDelimitedStringArray(value, /\n|,/, (entry) => entry.trim());
}

function parseFeaturesField(value: unknown): string[] {
  return parseDelimitedStringArray(value, /\n/, (entry) =>
    entry.replace(/^[-*]\s*/, '').replace(/^\d+\.\s*/, '')
  ).slice(0, 5);
}

function parseSupportField(value: unknown): { supportEmail: string; supportUrl: string } {
  const rawValue = firstString(value) || '';
  const parts = rawValue
    .split(/\n|,/)
    .map((part) => part.trim())
    .filter(Boolean);

  const supportEmail = parts.find((part) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(part)) || '';
  const supportUrl = parts.find((part) => /^https?:\/\//i.test(part)) || '';

  if (!supportEmail && !supportUrl && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawValue.trim())) {
    return { supportEmail: rawValue.trim(), supportUrl: '' };
  }

  if (!supportEmail && !supportUrl && /^https?:\/\//i.test(rawValue.trim())) {
    return { supportEmail: '', supportUrl: rawValue.trim() };
  }

  return { supportEmail, supportUrl };
}

function buildSupportField(supportEmail?: string, supportUrl?: string): string {
  return [supportEmail?.trim(), supportUrl?.trim()].filter(Boolean).join('\n');
}

function buildFeaturesField(features: string[]): string {
  return features
    .map((feature) => feature.trim())
    .filter(Boolean)
    .slice(0, 5)
    .join('\n');
}

function detectMarketplaceType(rawType: unknown): Asset['type'] | null {
  const directCandidates = typeof rawType === 'string' ? [rawType] : [];
  const candidates = [...toStringArray(rawType), ...directCandidates]
    .map((candidate) => candidate.trim())
    .filter(Boolean);

  for (const candidate of candidates) {
    if (isAirtableRecordId(candidate)) {
      continue;
    }

    const value = candidate.toLowerCase();

    if (value.includes('library')) return 'Library';
    if (value.includes('app')) return 'App';
    if (value.includes('template')) return 'Template';
  }

  return null;
}

function cleanMarketplaceType(rawType: unknown): Asset['type'] {
  return detectMarketplaceType(rawType) || 'Template';
}

function isAirtableRecordId(value: string): boolean {
  return /^(rec|tbl|viw|fld)[A-Za-z0-9]{10,}$/.test(value);
}

function cleanCategoryToken(value: string): string | null {
  const cleaned = value.trim().replace(/\s+/g, ' ');
  if (!cleaned) return null;
  if (cleaned.includes('@')) return null;
  if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) return null;
  if (isAirtableRecordId(cleaned)) return null;
  return cleaned;
}

function getCandidateFieldNames(
  fields: Airtable.FieldSet,
  priorityFields: readonly string[],
  includesToken: 'category' | 'subcategory'
): string[] {
  const candidates = new Set<string>();

  for (const fieldName of priorityFields) {
    if (fieldName in fields) {
      candidates.add(fieldName);
    }
  }

  for (const fieldName of Object.keys(fields)) {
    const normalized = normalizeFieldName(fieldName);
    const hasToken = normalized.includes(includesToken);
    if (!hasToken) continue;

    if (includesToken === 'category' && normalized.includes('subcategory')) {
      continue;
    }

    if (normalized.includes('categoryperformance') || normalized.includes('templatesinsubcategory')) {
      continue;
    }

    candidates.add(fieldName);
  }

  return [...candidates];
}

function extractCategoryValues(
  fields: Airtable.FieldSet,
  priorityFields: readonly string[],
  includesToken: 'category' | 'subcategory'
): string[] {
  const categories = new Set<string>();
  const candidateFields = getCandidateFieldNames(fields, priorityFields, includesToken);

  for (const fieldName of candidateFields) {
    for (const value of toStringArray(fields[fieldName])) {
      const cleaned = cleanCategoryToken(value);
      if (cleaned) {
        categories.add(cleaned);
      }
    }
  }

  return [...categories];
}

function extractPrimaryCategory(fields: Airtable.FieldSet): string | undefined {
  return extractCategoryValues(fields, CATEGORY_FIELDS_PRIORITY, 'category')[0];
}

function extractPrimarySubcategory(fields: Airtable.FieldSet): string | undefined {
  return extractCategoryValues(fields, SUBCATEGORY_FIELDS_PRIORITY, 'subcategory')[0];
}

function extractEmails(value: unknown): string[] {
  const values = toStringArray(value);
  const emails = new Set<string>();

  for (const entry of values) {
    const matches = entry.match(EMAIL_REGEX) || [];
    for (const match of matches) {
      emails.add(match.toLowerCase());
    }
  }

  return [...emails];
}

function extractCreatorEmailFromAsset(fields: Airtable.FieldSet): string | null {
  for (const fieldName of CREATOR_EMAIL_FIELDS_PRIORITY) {
    if (!(fieldName in fields)) continue;
    const emails = extractEmails(fields[fieldName]);
    if (emails.length > 0) return emails[0];
  }

  for (const [fieldName, value] of Object.entries(fields)) {
    if (!normalizeFieldName(fieldName).includes('email')) continue;
    const emails = extractEmails(value);
    if (emails.length > 0) return emails[0];
  }

  return null;
}

function dedupeEmails(...values: Array<string | null | undefined>): string[] {
  const unique = new Set<string>();

  for (const value of values) {
    if (!value || typeof value !== 'string') continue;
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) continue;
    unique.add(trimmed);
  }

  return [...unique];
}

function extractAttachmentUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (typeof entry === 'string') return entry.trim();
      if (entry && typeof entry === 'object' && 'url' in entry && typeof entry.url === 'string') {
        return entry.url.trim();
      }
      return '';
    })
    .filter(Boolean);
}

function getScreenshotAltTexts(fields: Airtable.FieldSet): string[] {
  return Array.from({ length: 5 }, (_, index) => firstString(fields[`Alt Text Screenshot ${index + 1}`]) || '');
}

function buildSubmissionSummary(metadata: Record<string, unknown> | undefined): string {
  if (!metadata) return '';

  const entries = Object.entries(metadata)
    .map(([key, value]) => {
      if (value === undefined || value === null) return null;

      if (Array.isArray(value)) {
        const cleaned = value
          .map((item) => String(item).trim())
          .filter(Boolean);
        if (cleaned.length === 0) return null;
        return `${key}: ${cleaned.join(', ')}`;
      }

      if (typeof value === 'object') {
        const stringified = JSON.stringify(value);
        return stringified === '{}' ? null : `${key}: ${stringified}`;
      }

      const cleaned = String(value).trim();
      return cleaned ? `${key}: ${cleaned}` : null;
    })
    .filter((value): value is string => Boolean(value));

  return entries.join('\n');
}

function mapAssetRecord(record: Airtable.Record<Airtable.FieldSet>): Asset {
  const cleanedStatus = cleanMarketplaceStatus(record.fields['🚀Marketplace Status'] as string) as Asset['status'];
  const category = extractPrimaryCategory(record.fields);
  const subcategory = extractPrimarySubcategory(record.fields);
  const thumbnailImages = extractAttachmentUrls(record.fields['🖼️Thumbnail Image']);
  const secondaryThumbnails = extractAttachmentUrls(record.fields['🖼️Thumbnail Image (Secondary)']);
  const carouselImages = extractAttachmentUrls(record.fields['🖼️Carousel Images']);
  const support = parseSupportField(record.fields['🔗Support Email/URL']);
  const type = cleanMarketplaceType(
    record.fields['⚙️🆎Type (Text)'] ?? record.fields['🆎Type'] ?? record.fields['Type'] ?? record.fields['type']
  );

  return {
    id: record.id,
    name: firstString(record.fields['Name']) || '',
    description: firstString(record.fields['📝Description']) || '',
    descriptionShort: firstString(record.fields['ℹ️Description (Short)']) || '',
    descriptionLongHtml: firstString(record.fields['ℹ️Description (Long).html']) || '',
    type,
    category,
    subcategory,
    status: cleanedStatus || 'Draft',
    thumbnailUrl: thumbnailImages[0],
    secondaryThumbnailUrl: secondaryThumbnails[0],
    secondaryThumbnails,
    carouselImages,
    websiteUrl: firstString(record.fields['🔗Website URL']),
    previewUrl:
      firstString(record.fields['🔗Preview Site URL']) ||
      firstString(record.fields['fldROrXCnuZyKNCxW']),
    marketplaceUrl: firstString(record.fields['🔗Marketplace URL']),
    submittedDate: firstString(record.fields['📅Submitted Date']),
    publishedDate: firstString(record.fields['📅Published Date']),
    decisionDate: firstString(record.fields['🚀📅Decision Date']),
    uniqueViewers: Number(record.fields['📋 Unique Viewers']) || 0,
    cumulativePurchases: Number(record.fields['📋 Cumulative Purchases']) || 0,
    cumulativeRevenue: Number(record.fields['📋 Cumulative Revenue']) || 0,
    latestReviewStatus: firstString(record.fields['📝Latest Review Status']),
    latestReviewDate: firstString(record.fields['📝Latest Review Date']),
    latestReviewFeedback: firstString(record.fields['🖌️📝Latest Review Feedback']),
    rejectionFeedback:
      firstString(record.fields['🚩Rejection Feedback']) ||
      firstString(record.fields['🖌Rejection Feedback']),
    rejectionFeedbackHtml:
      firstString(record.fields['🚩Rejection Feedback.html']) ||
      firstString(record.fields['🖌Rejection Feedback.html']),
    qualityScore: firstString(record.fields['🖌️Initial Quality Score']),
    priceString: firstString(record.fields['🥞💲Template Price String (🏗️ only)']),
    appCapabilities: firstString(record.fields['ℹ️Capabilities (🖥️ only)']),
    appInstallUrl: firstString(record.fields['🔗Install URL (🖥️ only)']),
    appScopes: parseScopesField(
      record.fields['ℹ️Scopes'] ?? record.fields['Scopes'] ?? record.fields['all-selected-scopes']
    ),
    appAvatarAltText: firstString(record.fields['App Avatar Alt Text']),
    paymentType: parseDelimitedStringArray(record.fields['ℹ️💲Payment Types']),
    visibility: firstString(record.fields['ℹ️Visibility (🖥️ only)']),
    appCategory: parseDelimitedStringArray(record.fields['ℹ️🪣Categories (Text)']),
    creatorName: firstString(record.fields['🎨Creator Name']),
    creatorWebsite: firstString(record.fields['👀🎨📧 Creator WF Account Email (Override)']),
    creatorContactEmail: firstString(record.fields['🎨📧 Creator Email']),
    appFeaturesOverview: parseFeaturesField(
      record.fields['❓ℹ️✨Features Text (MIGRATE TO LINKED FIELD)']
    ),
    appDeveloperNotes: firstString(record.fields['Developer Notes']),
    appAccessCredentials: firstString(record.fields['ℹ️Credentials']),
    appVideoUrl: firstString(record.fields['🔗Promo Video URL (🖥️ only)']),
    appDemoVideoUrl: firstString(record.fields['🔗Demo Video URL']),
    appPrivacyPolicyUrl: firstString(record.fields['🔗Privacy Policy URL']),
    appSupportEmail: support.supportEmail,
    appSupportUrl: support.supportUrl,
    appTermsUrl: firstString(record.fields['🔗Terms & Conditions URL']),
    appScreenshotAltTexts: getScreenshotAltTexts(record.fields)
  };
}

type AirtableWritableValue =
  | string
  | number
  | boolean
  | readonly string[]
  | readonly { url: string }[]
  | null
  | undefined;

function requiresCurrentSupportRecord(data: AssetUpdateData): boolean {
  const isSupportUpdate = data.appSupportEmail !== undefined || data.appSupportUrl !== undefined;
  return isSupportUpdate && (data.appSupportEmail === undefined || data.appSupportUrl === undefined);
}

function buildAssetUpdateFields(
  data: AssetUpdateData,
  currentAsset?: Asset | null
): Record<string, AirtableWritableValue> {
  const fields: Record<string, AirtableWritableValue> = {};

  if (data.name !== undefined) fields['Name'] = data.name;
  if (data.description !== undefined) fields['📝Description'] = data.description;
  if (data.descriptionShort !== undefined) fields['ℹ️Description (Short)'] = data.descriptionShort;
  if (data.descriptionLongHtml !== undefined) fields['ℹ️Description (Long).html'] = data.descriptionLongHtml;
  if (data.websiteUrl !== undefined) fields['🔗Website URL'] = data.websiteUrl;
  if (data.previewUrl !== undefined) fields['🔗Preview Site URL'] = data.previewUrl;
  if (data.appCapabilities !== undefined) {
    fields['ℹ️Capabilities (🖥️ only)'] = data.appCapabilities || null;
  }
  if (data.appInstallUrl !== undefined) fields['🔗Install URL (🖥️ only)'] = data.appInstallUrl;
  if (data.appScopes !== undefined) fields['all-selected-scopes'] = JSON.stringify(data.appScopes || []);
  if (data.appAvatarAltText !== undefined) fields['App Avatar Alt Text'] = data.appAvatarAltText;
  if (data.paymentType !== undefined) fields['ℹ️💲Payment Types'] = data.paymentType;
  if (data.visibility !== undefined) fields['ℹ️Visibility (🖥️ only)'] = data.visibility || null;
  if (data.appCategory !== undefined) fields['ℹ️🪣Categories (Text)'] = data.appCategory;
  if (data.creatorName !== undefined) fields['🎨Creator Name'] = data.creatorName;
  if (data.creatorWebsite !== undefined) {
    fields['👀🎨📧 Creator WF Account Email (Override)'] = data.creatorWebsite;
  }
  if (data.creatorContactEmail !== undefined) fields['🎨📧 Creator Email'] = data.creatorContactEmail;
  if (data.appFeaturesOverview !== undefined) {
    fields['❓ℹ️✨Features Text (MIGRATE TO LINKED FIELD)'] = buildFeaturesField(
      data.appFeaturesOverview
    );
  }
  if (data.appDeveloperNotes !== undefined) fields['Developer Notes'] = data.appDeveloperNotes;
  if (data.appAccessCredentials !== undefined) fields['ℹ️Credentials'] = data.appAccessCredentials;
  if (data.appVideoUrl !== undefined) fields['🔗Promo Video URL (🖥️ only)'] = data.appVideoUrl;
  if (data.appDemoVideoUrl !== undefined) fields['🔗Demo Video URL'] = data.appDemoVideoUrl;
  if (data.appPrivacyPolicyUrl !== undefined) {
    fields['🔗Privacy Policy URL'] = data.appPrivacyPolicyUrl;
  }
  if (data.appSupportEmail !== undefined || data.appSupportUrl !== undefined) {
    fields['🔗Support Email/URL'] = buildSupportField(
      data.appSupportEmail ?? currentAsset?.appSupportEmail,
      data.appSupportUrl ?? currentAsset?.appSupportUrl
    );
  }
  if (data.appTermsUrl !== undefined) fields['🔗Terms & Conditions URL'] = data.appTermsUrl;
  if (data.appScreenshotAltTexts !== undefined) {
    const altTexts = data.appScreenshotAltTexts.slice(0, 5);
    for (let index = 0; index < 5; index += 1) {
      fields[`Alt Text Screenshot ${index + 1}`] = altTexts[index] || '';
    }
  }
  if (data.thumbnailUrl !== undefined) {
    fields['fld43LxLHMZb2yF7F'] = data.thumbnailUrl ? [{ url: data.thumbnailUrl }] : [];
  }
  if (data.secondaryThumbnails !== undefined) {
    fields['fldzKxNCXcgCnEwxu'] = data.secondaryThumbnails
      .filter(Boolean)
      .map((url) => ({ url }));
  } else if (data.secondaryThumbnailUrl !== undefined) {
    fields['fldzKxNCXcgCnEwxu'] = data.secondaryThumbnailUrl
      ? [{ url: data.secondaryThumbnailUrl }]
      : [];
  }
  if (data.carouselImages !== undefined) {
    fields['fldneaPyoRXBAVtS1'] = data.carouselImages.filter(Boolean).map((url) => ({ url }));
  }

  return fields;
}

export function getAirtableClient(env: AirtableEnvLike | undefined) {
  if (!env?.AIRTABLE_API_KEY || !env?.AIRTABLE_BASE_ID) {
    throw new Error('Airtable configuration missing');
  }

  const base = new Airtable({ apiKey: env.AIRTABLE_API_KEY }).base(env.AIRTABLE_BASE_ID);
  type MutationFields = Record<string, unknown>;

  async function updateRecords(tableId: string, records: Array<{ id: string; fields: MutationFields }>) {
    return (await (base(tableId) as any).update(records)) as Airtable.Record<Airtable.FieldSet>[];
  }

  async function createRecords(tableId: string, records: Array<{ fields: MutationFields }>) {
    return (await (base(tableId) as any).create(records)) as Airtable.Record<Airtable.FieldSet>[];
  }

  const debugEnabled = env.DEBUG_AIRTABLE === 'true';
  const debugLog = (...args: unknown[]) => {
    if (debugEnabled) {
      console.log(...args);
    }
  };

  return {
    async findUserByEmail(email: string): Promise<{ id: string; email: string } | null> {
      const escapedEmail = escapeAirtableString(email);
      const records = await base(TABLES.USERS)
        .select({
          filterByFormula: `{Email} = '${escapedEmail}'`
        })
        .firstPage();

      if (records.length === 0) return null;

      return {
        id: records[0].id,
        email: records[0].fields['Email'] as string
      };
    },

    async createUserByEmail(email: string, creatorId?: string): Promise<{ id: string; email: string }> {
      const normalizedEmail = validateEmail(email);
      const fields: Record<string, unknown> = {
        Email: normalizedEmail
      };

      if (creatorId) {
        fields['🎨Creators'] = [creatorId];
      }

      const records = await createRecords(TABLES.USERS, [{ fields }]);
      const record = records[0];

      return {
        id: record.id,
        email: (record.fields['Email'] as string) || normalizedEmail
      };
    },

    async setVerificationToken(userId: string, token: string, expirationTime: Date): Promise<void> {
      await base(TABLES.USERS).update([
        {
          id: userId,
          fields: {
            [FIELDS.VERIFICATION_TOKEN]: token,
            [FIELDS.TOKEN_EXPIRATION]: expirationTime.toISOString()
          }
        }
      ]);
    },

    async triggerVerificationEmailAutomation(
      userId: string,
      token: string,
      expirationTime: Date
    ): Promise<void> {
      await base(TABLES.USERS).update([
        {
          id: userId,
          fields: {
            [FIELDS.VERIFICATION_TOKEN]: null as unknown as string,
            [FIELDS.TOKEN_EXPIRATION]: null as unknown as string
          }
        }
      ]);

      await base(TABLES.USERS).update([
        {
          id: userId,
          fields: {
            [FIELDS.VERIFICATION_TOKEN]: token,
            [FIELDS.TOKEN_EXPIRATION]: expirationTime.toISOString()
          }
        }
      ]);
    },

    async verifyToken(token: string): Promise<{ email: string; expired: boolean } | null> {
      const escapedToken = escapeAirtableString(token);
      const records = await base(TABLES.USERS)
        .select({
          filterByFormula: `{${FIELDS.VERIFICATION_TOKEN}} = '${escapedToken}'`
        })
        .firstPage();

      if (records.length === 0) return null;

      const record = records[0];
      const email = record.fields['Email'] as string;
      const expiration = record.fields[FIELDS.TOKEN_EXPIRATION] as string | undefined;

      let expired = false;
      if (expiration) {
        expired = new Date(expiration) < new Date();
      }

      return { email, expired };
    },

    async clearVerificationToken(userId: string): Promise<void> {
      await base(TABLES.USERS).update([
        {
          id: userId,
          fields: {
            [FIELDS.TOKEN_EXPIRATION]: null as unknown as string,
            [FIELDS.VERIFICATION_TOKEN]: null as unknown as string
          }
        }
      ]);
    },

    async getAssetsByEmail(email: string): Promise<Asset[]> {
      const formula = buildAssetListFormula(email);

      const records = await base(TABLES.ASSETS)
        .select({
          view: VIEWS.ASSETS,
          filterByFormula: formula
        })
        .all();

      return records.map(mapAssetRecord);
    },

    async getAsset(id: string): Promise<Asset | null> {
      try {
        const record = await base(TABLES.ASSETS).find(id);
        return mapAssetRecord(record);
      } catch {
        return null;
      }
    },

    async updateAsset(id: string, data: AssetUpdateData): Promise<Asset | null> {
      const currentAsset = requiresCurrentSupportRecord(data) ? await this.getAsset(id) : null;
      const fields = buildAssetUpdateFields(data, currentAsset);

      if (Object.keys(fields).length === 0) {
        return null;
      }

      try {
        const records = await updateRecords(TABLES.ASSETS, [{ id, fields }]);
        return mapAssetRecord(records[0]);
      } catch {
        return null;
      }
    },

    async updateAssetWithImages(id: string, data: AssetUpdateData): Promise<Asset | null> {
      debugLog('[Airtable] updateAssetWithImages', { id, keys: Object.keys(data) });
      const currentAsset = requiresCurrentSupportRecord(data) ? await this.getAsset(id) : null;
      const fields = buildAssetUpdateFields(data, currentAsset);

      if (Object.keys(fields).length === 0) {
        return null;
      }

      try {
        const records = await updateRecords(TABLES.ASSETS, [{ id, fields }]);
        return mapAssetRecord(records[0]);
      } catch (error) {
        console.error('[Airtable] Error updating asset with images:', error);
        return null;
      }
    },

    async verifyAssetOwnership(assetId: string, email: string): Promise<boolean> {
      const normalizedEmail = email.toLowerCase();
      const escapedAssetId = escapeAirtableString(assetId);

      try {
        const dashboardLikeFormula = `AND(
          RECORD_ID() = '${escapedAssetId}',
          ${buildCreatorEmailMatchFormula(normalizedEmail)}
        )`;
        const dashboardMatches = await base(TABLES.ASSETS)
          .select({ filterByFormula: dashboardLikeFormula, maxRecords: 1 })
          .firstPage();
        if (dashboardMatches.length > 0) return true;
      } catch {
        // Continue.
      }

      try {
        const record = await base(TABLES.ASSETS).find(assetId);
        const emailFields = [
          '🎨📧 Creator Email',
          '🎨📧 Creator WF Account Email',
          '📧Emails (from 🎨Creator)'
        ];

        for (const field of emailFields) {
          const fieldValue = record.fields[field];
          if (!fieldValue) continue;

          if (Array.isArray(fieldValue)) {
            if (fieldValue.some((value) => String(value).toLowerCase().includes(normalizedEmail))) {
              return true;
            }
          } else if (typeof fieldValue === 'string') {
            if (fieldValue.toLowerCase().includes(normalizedEmail)) {
              return true;
            }
          }
        }
      } catch {
        // Continue.
      }

      try {
        const formula = `AND(
          RECORD_ID() = '${escapedAssetId}',
          ${buildCreatorEmailMatchFormula(normalizedEmail)}
        )`;
        const matches = await base(TABLES.ASSETS)
          .select({ filterByFormula: formula, maxRecords: 1 })
          .firstPage();
        return matches.length > 0;
      } catch {
        return false;
      }
    },

    async debugAssetOwnership(
      assetId: string,
      email: string
    ): Promise<{
      isOwner: boolean;
      debug: {
        assetId: string;
        userEmailHash: string;
        emailFields: Record<
          string,
          { present: boolean; type: 'array' | 'string' | 'other'; matched: boolean; length?: number }
        >;
        formulaMatched: boolean;
        dashboardLikeFormulaMatched: boolean;
      };
    }> {
      const normalizedEmail = email.toLowerCase();
      const userEmailHash = createHash('sha256').update(normalizedEmail).digest('hex').slice(0, 12);

      const emailFields = [
        '🎨📧 Creator Email',
        '🎨📧 Creator WF Account Email',
        '📧Emails (from 🎨Creator)'
      ] as const;

      const fieldDiagnostics: Record<
        string,
        { present: boolean; type: 'array' | 'string' | 'other'; matched: boolean; length?: number }
      > = {};

      let record: Airtable.Record<Airtable.FieldSet> | null = null;
      try {
        record = await base(TABLES.ASSETS).find(assetId);
      } catch {
        record = null;
      }

      let anyFieldMatched = false;
      for (const field of emailFields) {
        const value = record?.fields?.[field];
        if (!value) {
          fieldDiagnostics[field] = { present: false, type: 'other', matched: false };
          continue;
        }

        if (Array.isArray(value)) {
          const matched = value.some((item) => String(item).toLowerCase().includes(normalizedEmail));
          fieldDiagnostics[field] = { present: true, type: 'array', matched, length: value.length };
          if (matched) anyFieldMatched = true;
        } else if (typeof value === 'string') {
          const matched = value.toLowerCase().includes(normalizedEmail);
          fieldDiagnostics[field] = { present: true, type: 'string', matched, length: value.length };
          if (matched) anyFieldMatched = true;
        } else {
          fieldDiagnostics[field] = { present: true, type: 'other', matched: false };
        }
      }

      const escapedAssetId = escapeAirtableString(assetId);

      let dashboardLikeFormulaMatched = false;
      try {
        const dashboardLikeFormula = `AND(
          RECORD_ID() = '${escapedAssetId}',
          ${buildCreatorEmailMatchFormula(normalizedEmail)}
        )`;
        const matches = await base(TABLES.ASSETS)
          .select({ filterByFormula: dashboardLikeFormula, maxRecords: 1 })
          .firstPage();
        dashboardLikeFormulaMatched = matches.length > 0;
      } catch {
        dashboardLikeFormulaMatched = false;
      }

      let formulaMatched = false;
      try {
        const formula = `AND(
          RECORD_ID() = '${escapedAssetId}',
          ${buildCreatorEmailMatchFormula(normalizedEmail)}
        )`;
        const matches = await base(TABLES.ASSETS)
          .select({ filterByFormula: formula, maxRecords: 1 })
          .firstPage();
        formulaMatched = matches.length > 0;
      } catch {
        formulaMatched = false;
      }

      return {
        isOwner: anyFieldMatched || dashboardLikeFormulaMatched || formulaMatched,
        debug: {
          assetId,
          userEmailHash,
          emailFields: fieldDiagnostics,
          formulaMatched,
          dashboardLikeFormulaMatched
        }
      };
    },

    async archiveAsset(id: string): Promise<{ success: boolean; error?: string }> {
      try {
        const record = await base(TABLES.ASSETS).find(id);
        const currentName = (record.fields['Name'] as string) || '';
        const uniqueCode = randomBytes(4).toString('hex').toUpperCase();

        await base(TABLES.ASSETS).update([
          {
            id,
            fields: {
              Name: `${currentName} Archived ${uniqueCode}`,
              '🚀Marketplace Status': '4️⃣Delisted☠️',
              '🥞CMS Status': 'Archived'
            }
          }
        ]);

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    },

    async checkAssetNameUniqueness(
      name: string,
      excludeId?: string
    ): Promise<{ unique: boolean; existingId?: string }> {
      const escapedName = escapeAirtableString(name.trim());
      let formula = `LOWER({Name}) = LOWER('${escapedName}')`;

      if (excludeId) {
        formula = `AND(${formula}, RECORD_ID() != '${escapeAirtableString(excludeId)}')`;
      }

      const records = await base(TABLES.ASSETS)
        .select({
          filterByFormula: formula,
          maxRecords: 1,
          fields: ['Name']
        })
        .firstPage();

      if (records.length === 0) {
        return { unique: true };
      }

      return { unique: false, existingId: records[0].id };
    },

    async getCreatorByEmail(email: string): Promise<Creator | null> {
      try {
        const formula = `OR(FIND("${email}", ARRAYJOIN({📧Email}, ",")) > 0, FIND("${email}", ARRAYJOIN({📧WF Account Email}, ",")) > 0, FIND("${email}", ARRAYJOIN({📧Emails}, ",")) > 0)`;

        const records = await base(TABLES.CREATORS)
          .select({
            filterByFormula: formula
          })
          .firstPage();

        if (records.length === 0) return null;

        const record = records[0];
        return {
          id: record.id,
          name: (record.fields['Name'] as string) || '',
          email,
          emails: (record.fields['📧Emails'] as string | undefined)
            ?.split(',')
            .map((value) => value.trim())
            .filter(Boolean),
          avatarUrl: (record.fields['🖼️Avatar (Primary)'] as { url: string }[] | undefined)?.[0]?.url,
          biography: record.fields['ℹ️Biography'] as string,
          legalName: record.fields['ℹ️Legal Name'] as string,
          websiteUrl: record.fields['🔗Personal Site'] as string
        };
      } catch {
        return null;
      }
    },

    async updateCreator(
      id: string,
      data: Partial<Pick<Creator, 'name' | 'biography' | 'legalName' | 'avatarUrl' | 'websiteUrl'>>
    ): Promise<Creator | null> {
      const fields: Record<string, unknown> = {};

      if (data.name !== undefined) fields['Name'] = data.name;
      if (data.biography !== undefined) fields['ℹ️Biography'] = data.biography;
      if (data.legalName !== undefined) fields['ℹ️Legal Name'] = data.legalName;
      if (data.websiteUrl !== undefined) fields['🔗Personal Site'] = data.websiteUrl;
      if (data.avatarUrl !== undefined) {
        fields['fldyddTon9Lu8BR8G'] = data.avatarUrl ? [{ url: data.avatarUrl }] : [];
      }

      if (Object.keys(fields).length === 0) {
        return null;
      }

      try {
        const records = await updateRecords(TABLES.CREATORS, [{ id, fields }]);
        const record = records[0];
        return {
          id: record.id,
          name: (record.fields['Name'] as string) || '',
          email: ((record.fields['📧Emails'] as string | undefined) || '').split(',')[0]?.trim() || '',
          emails: (record.fields['📧Emails'] as string | undefined)
            ?.split(',')
            .map((value) => value.trim())
            .filter(Boolean),
          avatarUrl: (record.fields['🖼️Avatar (Primary)'] as { url: string }[] | undefined)?.[0]?.url,
          biography: record.fields['ℹ️Biography'] as string,
          legalName: record.fields['ℹ️Legal Name'] as string,
          websiteUrl: record.fields['🔗Personal Site'] as string
        };
      } catch {
        return null;
      }
    },

    async createCreator(data: CreateCreatorInput): Promise<Creator> {
      const emails = dedupeEmails(data.email, data.webflowEmail);
      const fields: Record<string, unknown> = {
        Name: data.name.trim(),
        '📧Email': data.email.trim().toLowerCase(),
        '📧WF Account Email': data.webflowEmail.trim().toLowerCase(),
        '📧Emails': emails.join(', '),
        'ℹ️Biography': data.biography.trim(),
        'ℹ️Legal Name': data.legalName.trim()
      };

      if (data.websiteUrl) {
        fields['🔗Personal Site'] = data.websiteUrl.trim();
      }

      if (data.avatarUrl) {
        fields['fldyddTon9Lu8BR8G'] = [{ url: data.avatarUrl }];
      }

      const records = await createRecords(TABLES.CREATORS, [{ fields }]);
      const record = records[0];

      return {
        id: record.id,
        name: (record.fields['Name'] as string) || '',
        email: data.email.trim().toLowerCase(),
        emails,
        avatarUrl: (record.fields['🖼️Avatar (Primary)'] as { url: string }[] | undefined)?.[0]?.url,
        biography: record.fields['ℹ️Biography'] as string,
        legalName: record.fields['ℹ️Legal Name'] as string,
        websiteUrl: record.fields['🔗Personal Site'] as string
      };
    },

    async createTemplateSubmission(
      data: CreateTemplateSubmissionInput
    ): Promise<TemplateSubmissionRecord> {
      const submittedAt = new Date().toISOString();
      const emails = dedupeEmails(data.creatorEmail, data.creatorWebflowEmail);
      const metadataSummary = buildSubmissionSummary(data.metadata);
      const fields: Record<string, unknown> = {
        '🆎Type': 'Template🏗️',
        '⚙️🆎Type (Text)': 'Template🏗️',
        Name: data.name.trim(),
        '📝Description': metadataSummary || data.description || '',
        'ℹ️Description (Short)': data.descriptionShort || '',
        'ℹ️Description (Long).html': data.descriptionLongHtml || '',
        '🔗Website URL': data.websiteUrl || '',
        '🔗Preview Site URL': data.previewUrl || '',
        '🚀Marketplace Status': '🆕Ready for Review',
        '📅Submitted Date': submittedAt,
        '🥞💲Template Price String (🏗️ only)': data.priceString || '',
        '🎨📧 Creator Email': data.creatorEmail.trim().toLowerCase(),
        '🎨📧 Creator WF Account Email': (data.creatorWebflowEmail || data.creatorEmail)
          .trim()
          .toLowerCase(),
        '📧Emails (from 🎨Creator)': emails.join(', ')
      };

      if (data.thumbnailUrl !== undefined) {
        fields['fld43LxLHMZb2yF7F'] = data.thumbnailUrl ? [{ url: data.thumbnailUrl }] : [];
      }

      if (data.secondaryThumbnails !== undefined) {
        fields['fldzKxNCXcgCnEwxu'] = data.secondaryThumbnails
          .filter(Boolean)
          .map((url) => ({ url }));
      } else if (data.secondaryThumbnailUrl !== undefined) {
        fields['fldzKxNCXcgCnEwxu'] = data.secondaryThumbnailUrl
          ? [{ url: data.secondaryThumbnailUrl }]
          : [];
      }

      if (data.carouselImages !== undefined) {
        fields['fldneaPyoRXBAVtS1'] = data.carouselImages.filter(Boolean).map((url) => ({ url }));
      }

      const assetRecords = await createRecords(TABLES.ASSETS, [{ fields }]);
      const assetRecord = assetRecords[0];

      let versionId: string | undefined;
      let warning: string | undefined;

      try {
        const versionRecords = await createRecords(TABLES.ASSET_VERSIONS, [
          {
            fields: {
              '👛Asset': [assetRecord.id],
              '⚙️👛Asset Record ID': assetRecord.id,
              'ℹ️Version #': 1,
              '📅Submission Datetime': submittedAt,
              '📝Review Status': '🆕Ready for Review'
            }
          }
        ]);
        versionId = versionRecords[0]?.id;
      } catch (error) {
        warning =
          error instanceof Error
            ? `Asset created, but review queue version creation failed: ${error.message}`
            : 'Asset created, but review queue version creation failed.';
      }

      return {
        asset: mapAssetRecord(assetRecord),
        versionId,
        warning
      };
    },

    async generateApiKey(
      creatorEmail: string,
      name: string,
      scopes: string[]
    ): Promise<{ key: string; apiKey: ApiKey }> {
      const rawKey = randomBytes(32).toString('hex');
      const fullKey = `wfd_${rawKey}`;
      const keyHash = createHash('sha256').update(fullKey).digest('hex');

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

      const records = await base(TABLES.API_KEYS).create([
        {
          fields: {
            Name: name,
            'Key Hash': keyHash,
            'Key Prefix': fullKey.substring(0, 12),
            'Creator Email': creatorEmail,
            Scopes: scopes.join(','),
            Status: 'Active',
            'Created At': now.toISOString(),
            'Expires At': expiresAt.toISOString()
          }
        }
      ]);

      const record = records[0];
      return {
        key: fullKey,
        apiKey: {
          id: record.id,
          name: record.fields['Name'] as string,
          createdAt: record.fields['Created At'] as string,
          expiresAt: record.fields['Expires At'] as string,
          scopes,
          status: 'Active'
        }
      };
    },

    async listApiKeys(creatorEmail: string): Promise<ApiKey[]> {
      const escapedEmail = escapeAirtableString(creatorEmail);
      const records = await base(TABLES.API_KEYS)
        .select({
          filterByFormula: `{Creator Email} = '${escapedEmail}'`,
          sort: [{ field: 'Created At', direction: 'desc' }]
        })
        .all();

      return records.map((record) => {
        const expiresAt = record.fields['Expires At'] as string | undefined;
        const status = (record.fields['Status'] as string) || 'Active';

        let finalStatus: ApiKey['status'] = status as ApiKey['status'];
        if (status === 'Active' && expiresAt && new Date(expiresAt) < new Date()) {
          finalStatus = 'Expired';
        }

        return {
          id: record.id,
          name: (record.fields['Name'] as string) || 'Unnamed Key',
          createdAt: record.fields['Created At'] as string,
          expiresAt,
          lastUsedAt: record.fields['Last Used At'] as string | undefined,
          scopes: ((record.fields['Scopes'] as string) || '').split(',').filter(Boolean),
          status: finalStatus
        };
      });
    },

    async revokeApiKey(keyId: string, creatorEmail: string): Promise<boolean> {
      try {
        const record = await base(TABLES.API_KEYS).find(keyId);
        const recordEmail = record.fields['Creator Email'] as string;

        if (recordEmail.toLowerCase() !== creatorEmail.toLowerCase()) {
          return false;
        }

        await base(TABLES.API_KEYS).update([
          {
            id: keyId,
            fields: {
              Status: 'Revoked',
              'Revoked At': new Date().toISOString()
            }
          }
        ]);

        return true;
      } catch {
        return false;
      }
    },

    async validateApiKey(
      key: string
    ): Promise<{ valid: boolean; email?: string; scopes?: string[] }> {
      if (!key.startsWith('wfd_')) {
        return { valid: false };
      }

      const keyHash = createHash('sha256').update(key).digest('hex');
      const escapedHash = escapeAirtableString(keyHash);

      const records = await base(TABLES.API_KEYS)
        .select({
          filterByFormula: `AND({Key Hash} = '${escapedHash}', {Status} = 'Active')`,
          maxRecords: 1
        })
        .firstPage();

      if (records.length === 0) {
        return { valid: false };
      }

      const record = records[0];
      const expiresAt = record.fields['Expires At'] as string | undefined;
      if (expiresAt && new Date(expiresAt) < new Date()) {
        return { valid: false };
      }

      void base(TABLES.API_KEYS)
        .update([
          {
            id: record.id,
            fields: { 'Last Used At': new Date().toISOString() }
          }
        ])
        .catch(() => {});

      return {
        valid: true,
        email: record.fields['Creator Email'] as string,
        scopes: ((record.fields['Scopes'] as string) || '').split(',').filter(Boolean)
      };
    },

    async getLeaderboard(): Promise<{
      records: Array<{
        templateName: string;
        category: string;
        creatorEmail: string;
        totalSales30d: number;
        totalRevenue30d: number;
        avgRevenuePerSale: number;
        salesRank: number;
        revenueRank: number;
      }>;
      freshness: MarketplaceFreshnessMetadata;
    }> {
      const records = await base(TABLES.LEADERBOARD)
        .select({
          view: VIEWS.LEADERBOARD,
          maxRecords: 50,
          sort: [{ field: 'SALES_RANK', direction: 'asc' }]
        })
        .all();

      return {
        records: records.map((record) => ({
          templateName: (record.fields['TEMPLATE_NAME'] as string) || '',
          category: (record.fields['CATEGORY'] as string) || '',
          creatorEmail: (record.fields['CREATOR_EMAIL'] as string) || '',
          totalSales30d: Number(record.fields['TOTAL_SALES_30D']) || 0,
          totalRevenue30d: Number(record.fields['TOTAL_REVENUE_30D']) || 0,
          avgRevenuePerSale: Number(record.fields['AVG_REVENUE_PER_SALE']) || 0,
          salesRank: Number(record.fields['SALES_RANK']) || 0,
          revenueRank: Number(record.fields['REVENUE_RANK']) || 0
        })),
        freshness: extractMarketplaceFreshness(records)
      };
    },

    async getCategoryPerformance(): Promise<{
      records: Array<{
        category: string;
        subcategory: string;
        templatesInSubcategory: number;
        totalSales30d: number;
        totalRevenue30d: number;
        avgRevenuePerTemplate: number;
        revenueRank: number;
      }>;
      freshness: MarketplaceFreshnessMetadata;
    }> {
      const records = await base(TABLES.CATEGORY_PERFORMANCE)
        .select({
          view: VIEWS.CATEGORY_PERFORMANCE,
          sort: [{ field: 'REVENUE_RANK', direction: 'asc' }]
        })
        .all();

      return {
        records: records.map((record) => ({
          category: (record.fields['CATEGORY'] as string) || '',
          subcategory: (record.fields['SUBCATEGORY'] as string) || '',
          templatesInSubcategory: Number(record.fields['TEMPLATES_IN_SUBCATEGORY']) || 0,
          totalSales30d: Number(record.fields['TOTAL_SALES_30D']) || 0,
          totalRevenue30d: Number(record.fields['TOTAL_REVENUE_30D']) || 0,
          avgRevenuePerTemplate: Number(record.fields['AVG_REVENUE_PER_TEMPLATE']) || 0,
          revenueRank: Number(record.fields['REVENUE_RANK']) || 0
        })),
        freshness: extractMarketplaceFreshness(records)
      };
    },

    async createAssetVersion(
      assetId: string,
      createdBy: string,
      changes: Record<string, unknown> | string
    ): Promise<AssetVersion | null> {
      debugLog('[Airtable] createAssetVersion', {
        assetId,
        createdBy,
        changesType: typeof changes
      });

      try {
        const asset = await this.getAsset(assetId);
        if (!asset) {
          return null;
        }

        const cleanStatus = asset.status.replace(/^\d️⃣/u, '').replace(/🆕|🚀/gu, '').trim();
        if (cleanStatus === 'Upcoming') {
          return null;
        }

        const existingVersions = await base(TABLES.ASSET_VERSIONS)
          .select({
            filterByFormula: `{fldknoYakli2sqznT} = '${escapeAirtableString(assetId)}'`
          })
          .all();

        const nextVersion = existingVersions.length + 1;

        const snapshot: AssetVersionSnapshot = {
          name: asset.name,
          description: asset.description,
          descriptionShort: asset.descriptionShort,
          descriptionLongHtml: asset.descriptionLongHtml,
          websiteUrl: asset.websiteUrl,
          previewUrl: asset.previewUrl,
          thumbnailUrl: asset.thumbnailUrl,
          secondaryThumbnailUrl: asset.secondaryThumbnailUrl,
          secondaryThumbnails: asset.secondaryThumbnails,
          carouselImages: asset.carouselImages,
          appCapabilities: asset.appCapabilities,
          appInstallUrl: asset.appInstallUrl,
          appScopes: asset.appScopes,
          appAvatarAltText: asset.appAvatarAltText,
          paymentType: asset.paymentType,
          visibility: asset.visibility,
          appCategory: asset.appCategory,
          creatorName: asset.creatorName,
          creatorWebsite: asset.creatorWebsite,
          creatorContactEmail: asset.creatorContactEmail,
          appFeaturesOverview: asset.appFeaturesOverview,
          appDeveloperNotes: asset.appDeveloperNotes,
          appAccessCredentials: asset.appAccessCredentials,
          appVideoUrl: asset.appVideoUrl,
          appDemoVideoUrl: asset.appDemoVideoUrl,
          appPrivacyPolicyUrl: asset.appPrivacyPolicyUrl,
          appSupportEmail: asset.appSupportEmail,
          appSupportUrl: asset.appSupportUrl,
          appTermsUrl: asset.appTermsUrl,
          appScreenshotAltTexts: asset.appScreenshotAltTexts
        };

        if (typeof changes === 'object' && Object.keys(changes).length === 0) {
          return null;
        }

        const changesJson =
          typeof changes === 'string'
            ? JSON.stringify({ changes, snapshot, createdBy })
            : JSON.stringify(changes);

        const record = await base(TABLES.ASSET_VERSIONS).create({
          fldemWilqCQcOCh5s: [assetId],
          fldn2ImbgwKfCdWWA: nextVersion,
          fldjYFJMGTerFYlol: 'Meta Update',
          fldc999gbJ8LWWoTC: changesJson,
          fldLEIZMEjZvH5n23: ['zendesk']
        });

        return {
          id: record.id,
          assetId,
          versionNumber: nextVersion,
          createdAt: new Date().toISOString(),
          createdBy,
          changes: typeof changes === 'string' ? changes : JSON.stringify(changes),
          snapshot
        };
      } catch (error) {
        console.error('[Airtable] Error creating asset version:', error);
        return null;
      }
    },

    async getAssetVersions(assetId: string): Promise<AssetVersion[]> {
      try {
        const records = await base(TABLES.ASSET_VERSIONS)
          .select({
            filterByFormula: `{Asset ID} = '${escapeAirtableString(assetId)}'`,
            sort: [{ field: 'Version Number', direction: 'desc' }]
          })
          .all();

        return records.map((record) => ({
          id: record.id,
          assetId: firstString(record.fields['Asset ID']) || assetId,
          versionNumber: Number(record.fields['Version Number']) || 0,
          createdAt: firstString(record.fields['Created At']) || '',
          createdBy: firstString(record.fields['Created By']) || '',
          changes: firstString(record.fields['Changes']) || '',
          snapshot: JSON.parse((record.fields['Snapshot'] as string) || '{}') as AssetVersionSnapshot
        }));
      } catch (error) {
        console.error('[Airtable] Error getting asset versions:', error);
        return [];
      }
    },

    async getAssetVersion(versionId: string): Promise<AssetVersion | null> {
      try {
        const record = await base(TABLES.ASSET_VERSIONS).find(versionId);
        return {
          id: record.id,
          assetId: firstString(record.fields['Asset ID']) || '',
          versionNumber: Number(record.fields['Version Number']) || 0,
          createdAt: firstString(record.fields['Created At']) || '',
          createdBy: firstString(record.fields['Created By']) || '',
          changes: firstString(record.fields['Changes']) || '',
          snapshot: JSON.parse((record.fields['Snapshot'] as string) || '{}') as AssetVersionSnapshot
        };
      } catch {
        return null;
      }
    },

    async rollbackAssetToVersion(
      assetId: string,
      versionId: string,
      rolledBackBy: string
    ): Promise<Asset | null> {
      try {
        const version = await this.getAssetVersion(versionId);
        if (!version || version.assetId !== assetId) {
          return null;
        }

        await this.createAssetVersion(
          assetId,
          rolledBackBy,
          `Rollback to version ${version.versionNumber}`
        );

        return this.updateAssetWithImages(assetId, version.snapshot);
      } catch (error) {
        console.error('[Airtable] Error rolling back asset:', error);
        return null;
      }
    },

    async getCreatorCategorySplit(): Promise<{
      assetsProcessed: number;
      assetsWithoutCreator: number;
      assetsWithoutCategory: number;
      totalCreators: number;
      creatorsWithoutCategory: number;
      singleCategoryCreators: number;
      multiCategoryCreators: number;
      singleCategoryPct: number;
      multiCategoryPct: number;
      topCategories: Array<{ category: string; creatorCount: number }>;
    }> {
      const records = await base(TABLES.ASSETS)
        .select({
          view: VIEWS.ASSETS,
          filterByFormula: `{🆎Type} = 'Template🏗️'`
        })
        .all();

      const creatorsSeen = new Set<string>();
      const creatorCategories = new Map<string, Set<string>>();
      const categoryCreatorCounts = new Map<string, number>();

      let assetsWithoutCreator = 0;
      let assetsWithoutCategory = 0;

      for (const record of records) {
        const creatorEmail = extractCreatorEmailFromAsset(record.fields);
        if (!creatorEmail) {
          assetsWithoutCreator += 1;
          continue;
        }

        creatorsSeen.add(creatorEmail);

        const categories = extractCategoryValues(record.fields, CATEGORY_FIELDS_PRIORITY, 'category');
        if (categories.length === 0) {
          assetsWithoutCategory += 1;
          continue;
        }

        const existingCategories = creatorCategories.get(creatorEmail) ?? new Set<string>();
        for (const category of categories) {
          existingCategories.add(category);
        }
        creatorCategories.set(creatorEmail, existingCategories);
      }

      for (const categories of creatorCategories.values()) {
        for (const category of categories) {
          categoryCreatorCounts.set(category, (categoryCreatorCounts.get(category) ?? 0) + 1);
        }
      }

      const totalCreators = creatorCategories.size;
      const singleCategoryCreators = [...creatorCategories.values()].filter(
        (categories) => categories.size === 1
      ).length;
      const multiCategoryCreators = [...creatorCategories.values()].filter(
        (categories) => categories.size > 1
      ).length;

      const singleCategoryPct =
        totalCreators > 0 ? Math.round((singleCategoryCreators / totalCreators) * 1000) / 10 : 0;
      const multiCategoryPct =
        totalCreators > 0 ? Math.round((multiCategoryCreators / totalCreators) * 1000) / 10 : 0;

      const topCategories = [...categoryCreatorCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([category, creatorCount]) => ({ category, creatorCount }));

      return {
        assetsProcessed: records.length,
        assetsWithoutCreator,
        assetsWithoutCategory,
        totalCreators,
        creatorsWithoutCategory: Math.max(0, creatorsSeen.size - creatorCategories.size),
        singleCategoryCreators,
        multiCategoryCreators,
        singleCategoryPct,
        multiCategoryPct,
        topCategories
      };
    }
  };
}
