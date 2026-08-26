import Airtable from 'airtable';
import { randomBytes, createHash } from 'node:crypto';
import { isLongDescriptionOnlyAssetVersionChange } from '../utils/asset-version-changes';
import { hasReviewRoundBeenReleased } from '../utils/review-status';

// Airtable table IDs
const TABLES = {
	USERS: 'tbldQNGszIyOjt9a1',
	CREATORS: 'tbljt0plqxdMARZXb',
	ASSETS: 'tblRwzpWoLgE9MrUm',
	API_KEYS: 'tblU5rI3WiQerozvX',
	TAGS: '🏷️Tags (Free Form)',
	CATEGORY_PERFORMANCE: 'tblDU1oUiobNfMQP9',
	LEADERBOARD: 'tblcXLVLYobhNmrg6',
	ASSET_VERSIONS: 'tblHxZ2hgSFLZxsZu',
	// ⚖️Exceptions — per-item app-review exception ledger. Queried by field ID
	// (returnFieldsByFieldId) because display names in this table are volatile.
	EXCEPTIONS: 'tblnbaaIbIulWl0b7'
} as const;

// ⚖️Exceptions field IDs (see webflow-app-review-mcp schema — the canonical map).
const EXCEPTIONS_FIELD_IDS = {
	item: 'fldmJcVJCytD1VY1r',
	type: 'fldUqjcnkOUO7RRKS',
	decisionDatetime: 'fldhqW4RSpazA6421',
	// Formula: 1 only when ⚖️Status = ❌Denied. Denied = "fix required" —
	// a denied exception waives nothing, the finding must be fixed.
	denied: 'fldJXVOBAeKLACZtc',
	versionLink: 'fldqVk39RERL1tVPP',
	// Lookup of the linked version's asset-record-ID rollup — lets us filter
	// exception rows by asset without knowing display names.
	assetRecordIdLookup: 'fld2v3CWkknayjbjA'
} as const;

// 🤝Partnership App checkbox on Assets (CRM-synced daily by partner-flag-sync).
const ASSETS_PARTNERSHIP_APP_FIELD_ID = 'fldzZ2Zo8a7vtIMT3';

// Version Number and 📝Review Status on 🖌️Asset Versions.
const ASSET_VERSIONS_VERSION_NUMBER_FIELD_ID = 'fldn2ImbgwKfCdWWA';
const ASSET_VERSIONS_REVIEW_STATUS_FIELD_ID = 'flde8Huk5NRIdm2wZ';

// Airtable field IDs for authentication
const FIELDS = {
	VERIFICATION_TOKEN: 'fldI8NZzmJSEVly4D',
	TOKEN_EXPIRATION: 'fldbK6n1sooEQaoWg'
} as const;

// Airtable view IDs
const VIEWS = {
	ASSETS: 'viwETCKXDaVHbEnZQ',
	CATEGORY_PERFORMANCE: 'viw5EUGpK0xDMcBga',
	LEADERBOARD: 'viwEaYTAux1ADl5C5'
} as const;

interface AirtableEnv {
	AIRTABLE_API_KEY: string;
	AIRTABLE_BASE_ID: string;
	ENVIRONMENT?: string;
	DEBUG_AIRTABLE?: string;
}

export interface MarketplaceFreshnessMetadata {
	timestamp: string | null;
	source: 'field' | 'record-created-time' | 'none';
	fieldName?: string;
}

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

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const CREATOR_EMAIL_FIELDS_PRIORITY = [
	'🎨📧 Creator Email',
	'🎨📧 Creator WF Account Email',
	'📧Emails (from 🎨Creator)',
	'CREATOR_EMAIL'
] as const;

// Only include fields that are guaranteed to exist in the Airtable base when
// constructing filter formulas. Referencing optional/legacy field names causes
// Airtable to reject the entire query with INVALID_FILTER_BY_FORMULA.
const CREATOR_EMAIL_FORMULA_FIELDS = [
	'🎨📧 Creator Email',
	'🎨📧 Creator WF Account Email',
	'📧Emails (from 🎨Creator)'
] as const;

// Email fields on the Creators table (the Assets table fields above are lookups
// of these). Used for profile reads/writes keyed by the session email.
const CREATOR_RECORD_EMAIL_FIELDS = ['📧Email', '📧WF Account Email', '📧Emails'] as const;

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
		// Handle Unix seconds or milliseconds.
		const ms = value > 1_000_000_000_000 ? value : value > 1_000_000_000 ? value * 1000 : null;
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

// ==================== SECURITY UTILITIES ====================

/**
 * Renders a value as a quoted Airtable formula literal.
 *
 * Airtable has no parameter binding, so every embedded value has to be quoted
 * here rather than at the call site. We pick the quote character the value does
 * not contain instead of relying on escape sequences, and reject values holding
 * both quote characters or control characters — a rejected value makes the query
 * fail closed instead of altering the formula.
 */
export function airtableFormulaValue(input: string): string {
	if (typeof input !== 'string') {
		throw new Error('Input must be a string');
	}

	// eslint-disable-next-line no-control-regex
	if (/[\u0000-\u001f\u007f]/.test(input)) {
		throw new Error('Value contains control characters');
	}

	const hasSingleQuote = input.includes("'");
	const hasDoubleQuote = input.includes('"');

	if (hasSingleQuote && hasDoubleQuote) {
		throw new Error('Value cannot contain both single and double quotes');
	}

	return hasSingleQuote ? `"${input}"` : `'${input}'`;
}

/**
 * Splits an Airtable email field value into individual addresses.
 * Lookup and rollup fields arrive as comma/semicolon/newline-joined strings.
 */
function splitEmailList(value: string): string[] {
	return value
		.toLowerCase()
		.split(/[,;\s<>]+/)
		.map((entry) => entry.trim())
		.filter(Boolean);
}

/**
 * Exact-match one email against an Airtable field value.
 *
 * Substring matching here would grant one creator access to another whose
 * address merely contains theirs (`webflow@x.com` inside `team+webflow@x.com`),
 * so every comparison is against a whole address.
 */
function fieldContainsEmail(fieldValue: unknown, normalizedEmail: string): boolean {
	if (Array.isArray(fieldValue)) {
		return fieldValue.some((entry) => splitEmailList(String(entry)).includes(normalizedEmail));
	}

	if (typeof fieldValue === 'string') {
		return splitEmailList(fieldValue).includes(normalizedEmail);
	}

	return false;
}

/**
 * Builds an exact-match clause for one Airtable email field.
 *
 * ARRAYJOIN turns the field into a comma-separated list, so both sides are
 * comma-wrapped to anchor the match to a whole address. Spaces are stripped
 * because string fields may be written as "a@x.com, b@x.com".
 */
function buildEmailFieldMatchClause(field: string, emailLiteral: string): string {
	const joined = `LOWER(ARRAYJOIN({${field}}, ","))`;
	// Normalize the field into a comma-delimited list: strip spaces and treat
	// display-name brackets ("Name <a@x.com>") as delimiters so an exact match
	// still finds the address.
	const normalized = `SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(${joined}, " ", ""), "<", ","), ">", ",")`;
	const haystack = `',' & ${normalized} & ','`;
	return `FIND(',' & ${emailLiteral} & ',', ${haystack}) > 0`;
}

function buildEmailMatchFormula(fields: readonly string[], email: string): string {
	const emailLiteral = airtableFormulaValue(email.trim().toLowerCase());
	const clauses = fields.map((field) => buildEmailFieldMatchClause(field, emailLiteral));

	return `OR(${clauses.join(', ')})`;
}

/**
 * Matches creator emails across the lookup and direct-email fields on the
 * Assets table used by dashboard auth and ownership checks.
 */
export function buildCreatorEmailMatchFormula(email: string): string {
	return buildEmailMatchFormula(CREATOR_EMAIL_FORMULA_FIELDS, email);
}

/**
 * Matches creator emails across the email fields on the Creators table.
 */
export function buildCreatorRecordEmailMatchFormula(email: string): string {
	return buildEmailMatchFormula(CREATOR_RECORD_EMAIL_FIELDS, email);
}

export function buildAssetListFormula(email: string): string {
	return buildCreatorEmailMatchFormula(email);
}

/**
 * Checks a fetched Airtable record's creator-email fields for a match.
 * JS-side equivalent of buildCreatorEmailMatchFormula(), letting callers
 * verify ownership from a record they already hold instead of issuing
 * another Airtable query.
 */
export function recordMatchesCreatorEmail(
	record: Pick<Airtable.Record<Airtable.FieldSet>, 'fields'>,
	email: string
): boolean {
	const normalizedEmail = email.trim().toLowerCase();
	if (!normalizedEmail) return false;

	return CREATOR_EMAIL_FORMULA_FIELDS.some((field) =>
		fieldContainsEmail(record.fields[field], normalizedEmail)
	);
}

/**
 * Validates and sanitizes email input.
 */
export function validateEmail(email: string): string {
	if (!email || typeof email !== 'string') {
		throw new Error('Email must be a non-empty string');
	}

	const trimmedEmail = email.trim().toLowerCase();
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

	if (!emailRegex.test(trimmedEmail)) {
		throw new Error('Invalid email format');
	}

	// Quoted local parts are legal but undeliverable in practice, and they are the
	// only email shape that could reach an Airtable formula as a quote character.
	// Apostrophes stay allowed (o'connor@example.com) — the formula-literal helper
	// quotes those safely.
	if (/["\\]/.test(trimmedEmail)) {
		throw new Error('Invalid email format');
	}

	if (trimmedEmail.length > 254) {
		throw new Error('Email too long');
	}

	return trimmedEmail;
}

/**
 * Validates UUID token format.
 */
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

/**
 * Clean Airtable status field by removing emoji prefixes and keycap numbers.
 * Airtable statuses often include prefixes like "3️⃣🚀Published" or "1️⃣🆕Upcoming"
 * This extracts just the status name (e.g., "Published", "Upcoming")
 */
export function cleanMarketplaceStatus(rawStatus: unknown): string {
	const normalizedStatus = firstString(rawStatus) || '';

	if (!normalizedStatus) {
		return '';
	}

	return normalizedStatus
		// Remove keycap number prefix (e.g., "3️⃣" = digit + variation selector + combining enclosing keycap)
		.replace(/^\d[\uFE0F]?[\u20E3]?/u, '')
		// Remove any remaining leading digits
		.replace(/^[0-9]+/u, '')
		// Remove common emoji prefixes
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
		const candidates = [record.name, record.label, record.value, record.title]
			.filter((item): item is string => typeof item === 'string')
			.map((item) => item.trim())
			.filter(Boolean);

		return candidates;
	}

	return [];
}

function isAirtableRecordId(value: string): boolean {
	return /^(rec|tbl|viw|fld)[A-Za-z0-9]{10,}$/.test(value);
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

		if (value.includes('library')) {
			return 'Library';
		}

		if (value.includes('app')) {
			return 'App';
		}

		if (value.includes('template')) {
			return 'Template';
		}
	}

	return null;
}

export function cleanMarketplaceType(rawType: unknown): Asset['type'] {
	return detectMarketplaceType(rawType) || 'Template';
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
		const rawValues = toStringArray(fields[fieldName]);
		for (const value of rawValues) {
			const cleaned = cleanCategoryToken(value);
			if (!cleaned) continue;
			categories.add(cleaned);
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

const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

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

// ==================== TYPES ====================

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
	secondaryThumbnailUrl?: string; // First secondary thumbnail (backward compat)
	secondaryThumbnails?: string[]; // All secondary thumbnails as array
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
	priceAmount?: number;
	searchVisibility?: string;
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

export type AssetVersionChanges = Record<string, unknown> | string;

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
	assetVersionChanges?: AssetVersionChanges;
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

export interface ApiKey {
	id: string;
	name: string;
	keyPrefix?: string;
	createdAt: string;
	expiresAt?: string;
	lastUsedAt?: string;
	scopes: string[];
	status: 'Active' | 'Revoked' | 'Expired';
	requestCount?: number;
}

export interface CreatorCategorySplit {
	assetsProcessed: number;
	assetsWithoutCreator: number;
	assetsWithoutCategory: number;
	totalCreators: number;
	creatorsWithoutCategory: number;
	singleCategoryCreators: number;
	multiCategoryCreators: number;
	singleCategoryPct: number;
	multiCategoryPct: number;
	topCategories: Array<{
		category: string;
		creatorCount: number;
	}>;
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

export function buildAssetVersionSnapshot(asset: Asset): AssetVersionSnapshot {
	return {
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
}

type AirtableWritableValue =
	| string
	| number
	| boolean
	| readonly string[]
	| readonly { url: string }[]
	| null
	| undefined;

export function buildAssetVersionCreateFields(
	assetId: string,
	versionNumber: number,
	changes: AssetVersionChanges,
	snapshot: AssetVersionSnapshot,
	createdBy: string
): Record<string, AirtableWritableValue> {
	const changesJson =
		typeof changes === 'string'
			? JSON.stringify({ changes, snapshot, createdBy })
			: JSON.stringify(changes);

	return {
		'fldemWilqCQcOCh5s': [assetId],
		'fldn2ImbgwKfCdWWA': versionNumber,
		'fldjYFJMGTerFYlol': 'Meta Update',
		'fldc999gbJ8LWWoTC': changesJson,
		'fldLEIZMEjZvH5n23': ['zendesk'],
		Snapshot: JSON.stringify(snapshot)
	};
}

function parseAssetVersionSnapshot(record: Airtable.Record<Airtable.FieldSet>): AssetVersionSnapshot | null {
	const snapshotField = record.fields['Snapshot'];
	if (typeof snapshotField === 'string' && snapshotField.trim()) {
		try {
			return JSON.parse(snapshotField) as AssetVersionSnapshot;
		} catch {
			return null;
		}
	}

	const changesField = record.fields['Changes'];
	if (typeof changesField === 'string' && changesField.trim()) {
		try {
			const parsed = JSON.parse(changesField) as { snapshot?: AssetVersionSnapshot };
			if (parsed && typeof parsed === 'object' && parsed.snapshot) {
				return parsed.snapshot;
			}
		} catch {
			return null;
		}
	}

	return null;
}

function mapAssetVersionRecord(record: Airtable.Record<Airtable.FieldSet>): AssetVersion | null {
	const snapshot = parseAssetVersionSnapshot(record);
	if (!snapshot) return null;

	return {
		id: record.id,
		assetId: record.fields['Asset ID'] as string,
		versionNumber: record.fields['Version Number'] as number,
		createdAt: record.fields['Created At'] as string,
		createdBy: record.fields['Created By'] as string,
		changes: record.fields['Changes'] as string,
		snapshot
	};
}

/**
 * A ❌Denied app-review exception item — a finding that was evaluated for an
 * exception and ruled "fix required". Shown to partnership-app creators only,
 * and only after the review round's feedback has been released to them.
 *
 * Deliberately excludes rationale and decision notes: those fields carry
 * internal deliberation and must never reach a creator surface.
 */
export interface RequiredFixExceptionItem {
	id: string;
	item: string;
	type?: string;
	decidedAt?: string;
	versionRecordId?: string;
	versionNumber?: number;
}

/**
 * Formula for ❌Denied exception rows belonging to one asset. Uses `{fldXxx}`
 * field-ID references so it is immune to display-name changes.
 */
export function buildRequiredFixExceptionsFormula(assetRecordId: string): string {
	return `AND({${EXCEPTIONS_FIELD_IDS.denied}} = 1, FIND(${airtableFormulaValue(
		assetRecordId
	)}, ARRAYJOIN({${EXCEPTIONS_FIELD_IDS.assetRecordIdLookup}})) > 0)`;
}

/**
 * Map an ⚖️Exceptions record fetched with returnFieldsByFieldId. Returns null
 * for rows without an item name (nothing meaningful to show).
 */
export function mapRequiredFixExceptionRecord(
	record: Airtable.Record<Airtable.FieldSet>
): RequiredFixExceptionItem | null {
	const item = firstString(record.fields[EXCEPTIONS_FIELD_IDS.item]);
	if (!item) return null;

	const versionLinks = record.fields[EXCEPTIONS_FIELD_IDS.versionLink];
	const versionRecordId =
		Array.isArray(versionLinks) && typeof versionLinks[0] === 'string'
			? versionLinks[0]
			: undefined;

	return {
		id: record.id,
		item,
		type: firstString(record.fields[EXCEPTIONS_FIELD_IDS.type]),
		decidedAt: firstString(record.fields[EXCEPTIONS_FIELD_IDS.decisionDatetime]),
		versionRecordId
	};
}

export interface RequiredFixVersionInfo {
	versionNumber?: number;
	reviewStatus?: string;
}

/**
 * Per-version release gate for exception items. The exceptions query is
 * asset-wide, but each item may only surface once ITS OWN review round has
 * been released to the creator — an item from a round still on hold or in a
 * silent state must not ride a later round's release. Fail-closed: items
 * without a resolvable, released version are dropped.
 */
export function gateRequiredFixesByVersion(
	items: RequiredFixExceptionItem[],
	versions: Map<string, RequiredFixVersionInfo>
): RequiredFixExceptionItem[] {
	const gated: RequiredFixExceptionItem[] = [];

	for (const item of items) {
		if (!item.versionRecordId) continue;
		const version = versions.get(item.versionRecordId);
		if (!version || !hasReviewRoundBeenReleased(version.reviewStatus)) continue;

		gated.push(
			Number.isFinite(version.versionNumber)
				? { ...item, versionNumber: version.versionNumber }
				: item
		);
	}

	return gated;
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

export function resolveAssetType(fields: Airtable.FieldSet): Asset['type'] {
	const candidates = [
		fields['⚙️🆎Type (Text)'],
		fields['🆎Type'],
		fields['Type'],
		fields['type']
	];

	for (const candidate of candidates) {
		const resolvedType = detectMarketplaceType(candidate);
		if (resolvedType) {
			return resolvedType;
		}
	}

	return 'Template';
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
	// Reads come back keyed by field name; writes use the field ID.
	const raw = firstString(fields['🖼️Carousel Images Alt Text']) || '';
	const lines = raw ? raw.split('\n') : [];
	return Array.from({ length: 5 }, (_, index) => (lines[index] || '').trim());
}

export function mapAssetRecord(record: Airtable.Record<Airtable.FieldSet>): Asset {
	const cleanedStatus = cleanMarketplaceStatus(record.fields['🚀Marketplace Status']) as Asset['status'];
	const category = extractPrimaryCategory(record.fields);
	const subcategory = extractPrimarySubcategory(record.fields);
	const thumbnailImages = extractAttachmentUrls(record.fields['🖼️Thumbnail Image']);
	const secondaryThumbnails = extractAttachmentUrls(record.fields['🖼️Thumbnail Image (Secondary)']);
	const carouselImages = extractAttachmentUrls(record.fields['🖼️Carousel Images']);
	const support = parseSupportField(record.fields['🔗Support Email/URL']);
	const type = resolveAssetType(record.fields);
	const priceAmountRaw = record.fields['🥞💲Template Price Filter (🏗️ only)'];
	const priceAmount = typeof priceAmountRaw === 'number' ? priceAmountRaw : Number(priceAmountRaw);

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
		marketplaceUrl: firstString(record.fields['🔗Listing URL']),
		submittedDate: firstString(record.fields['📅Submitted Date']),
		publishedDate:
			firstString(record.fields['🚀📅Published Date']) ||
			firstString(record.fields['👀📅Published Date (Override)']),
		decisionDate: firstString(record.fields['🚀📅Decision Date']),
		uniqueViewers: Number(record.fields['📋 Unique Viewers']) || 0,
		cumulativePurchases: Number(record.fields['📋 Cumulative Purchases']) || 0,
		cumulativeRevenue: Number(record.fields['📋 Cumulative Revenue']) || 0,
		latestReviewStatus: firstString(record.fields['📝Latest Review Status']),
		latestReviewDate: firstString(record.fields['🚀📅Latest Version Review Status LMT']),
		latestReviewFeedback: firstString(record.fields['🖌️📝Latest Review Feedback']),
		rejectionFeedback:
			firstString(record.fields['🚩Rejection Feedback']) ||
			firstString(record.fields['🖌Rejection Feedback']),
		rejectionFeedbackHtml:
			firstString(record.fields['🚩Rejection Feedback.html']) ||
			firstString(record.fields['🖌Rejection Feedback.html']),
		qualityScore: firstString(record.fields['🖌️Initial Quality Score']),
		priceString: firstString(record.fields['🥞💲Template Price String (🏗️ only)']),
		priceAmount: Number.isFinite(priceAmount) ? priceAmount : undefined,
		searchVisibility:
			firstString(record.fields['👁️Search Visibility (🏗️ only)']) ||
			firstString(record.fields['Search Visibility']) ||
			firstString(record.fields['search_visibility']),
		appCapabilities: firstString(record.fields['ℹ️Capabilities (🖥️ only)']),
		appInstallUrl: firstString(record.fields['🔗Install URL (🖥️ only)']),
		appScopes: parseScopesField(record.fields['⚙️Scope(s)']),
		appAvatarAltText: firstString(record.fields['🖼️Thumbnail Alt Text']),
		paymentType: parseDelimitedStringArray(record.fields['ℹ️💲Payment Types']),
		visibility: firstString(record.fields['ℹ️Visibility (🖥️ only)']),
		appCategory: parseDelimitedStringArray(record.fields['ℹ️🪣Categories (Text)']),
		creatorName: firstString(record.fields['🎨Creator Name']),
		creatorWebsite: firstString(record.fields['👀🎨📧 Creator WF Account Email (Override)']),
		creatorContactEmail: firstString(record.fields['🎨📧 Creator Email']),
		appFeaturesOverview: parseFeaturesField(
			record.fields['❓ℹ️✨Features Text (MIGRATE TO LINKED FIELD)']
		),
		appDeveloperNotes: firstString(record.fields['ℹ️Notes']),
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

/**
 * Airtable's update endpoint is expected to return the record it wrote. Do not
 * trust that SDK response at the UI boundary: a null or empty batch response
 * otherwise turns a failed cover update into `Cannot read properties of null
 * (reading 'id')` while we log a successful update.
 */
export function firstUpdatedAirtableRecord(
	records: unknown
): Airtable.Record<Airtable.FieldSet> | null {
	if (!Array.isArray(records)) return null;

	const record = records[0];
	if (!record || typeof record !== 'object') return null;

	const candidate = record as Partial<Airtable.Record<Airtable.FieldSet>>;
	if (typeof candidate.id !== 'string' || !candidate.fields || typeof candidate.fields !== 'object') {
		return null;
	}

	return candidate as Airtable.Record<Airtable.FieldSet>;
}

function requiresCurrentSupportRecord(data: AssetUpdateData): boolean {
	const isSupportUpdate = data.appSupportEmail !== undefined || data.appSupportUrl !== undefined;
	return isSupportUpdate && (data.appSupportEmail === undefined || data.appSupportUrl === undefined);
}

export function buildAssetUpdateFields(
	data: AssetUpdateData,
	currentAsset?: Asset | null
): Record<string, AirtableWritableValue> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const fields: Record<string, any> = {};

	if (data.name !== undefined) fields['Name'] = data.name;
	if (data.descriptionShort !== undefined) fields['ℹ️Description (Short)'] = data.descriptionShort;
	if (data.descriptionLongHtml !== undefined) fields['ℹ️Description (Long).html'] = data.descriptionLongHtml;
	if (data.websiteUrl !== undefined) fields['🔗Website URL'] = data.websiteUrl;
	if (data.previewUrl !== undefined) fields['🔗Preview Site URL'] = data.previewUrl;
	if (data.appCapabilities !== undefined) {
		fields['ℹ️Capabilities (🖥️ only)'] = data.appCapabilities || null;
	}
	if (data.appInstallUrl !== undefined) fields['🔗Install URL (🖥️ only)'] = data.appInstallUrl;
	// Airtable field IDs are stable; the display names carry emoji and have been
	// renamed before, which is what silently broke every App-asset save.
	if (data.appScopes !== undefined) {
		// '⚙️Scope(s)' is rich text read back by splitting on newlines/commas.
		fields['fldlFsAqNvG8uAftq'] = (data.appScopes || []).join('\n');
	}
	if (data.appAvatarAltText !== undefined) {
		fields['fldKG132fWtKXhwsH'] = data.appAvatarAltText; // '🖼️Thumbnail Alt Text'
	}
	if (data.paymentType !== undefined) fields['ℹ️💲Payment Types'] = data.paymentType;
	if (data.visibility !== undefined) fields['ℹ️Visibility (🖥️ only)'] = data.visibility || null;
	// appCategory and creatorName are deliberately not written. Both are derived
	// on the Assets table — '🎨Creator Name' is a rollup off the linked Creator
	// record and 'ℹ️🪣Categories (Text)' is a lookup off the '🪣Categories' link
	// field — so Airtable rejects any write and takes the whole update with it.
	// Editing them needs a link-field write, tracked as follow-up work.
	if (data.creatorWebsite !== undefined) {
		fields['👀🎨📧 Creator WF Account Email (Override)'] = data.creatorWebsite;
	}
	if (data.creatorContactEmail !== undefined) {
		// The read-only '🎨📧 Creator Email' rollup resolves from this override.
		fields['fldjCdCvHOy7dVwss'] = data.creatorContactEmail;
	}
	if (data.appFeaturesOverview !== undefined) {
		fields['❓ℹ️✨Features Text (MIGRATE TO LINKED FIELD)'] = buildFeaturesField(
			data.appFeaturesOverview
		);
	}
	if (data.appDeveloperNotes !== undefined) {
		fields['fldBVKHOno8aJlnox'] = data.appDeveloperNotes; // 'ℹ️Notes'
	}
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
		// A single '🖼️Carousel Images Alt Text' field holds all five, one per
		// line, so position in the list is what ties an alt text to an image.
		const altTexts = data.appScreenshotAltTexts.slice(0, 5);
		fields['fldJ2HQ8HgScYomuE'] = Array.from({ length: 5 }, (_, index) => altTexts[index] || '')
			.join('\n')
			.trimEnd();
	}

	return fields;
}

// ==================== AIRTABLE CLIENT ====================

/**
 * Creates an Airtable client with typed methods.
 */
export function getAirtableClient(env: AirtableEnv | undefined) {
	if (!env?.AIRTABLE_API_KEY || !env?.AIRTABLE_BASE_ID) {
		throw new Error('Airtable configuration missing');
	}

	const base = new Airtable({ apiKey: env.AIRTABLE_API_KEY }).base(env.AIRTABLE_BASE_ID);
	const debugEnabled = env.DEBUG_AIRTABLE === 'true';
	const debugLog = (...args: unknown[]) => {
		if (debugEnabled) {
			console.log(...args);
		}
	};

	return {
		// ==================== AUTH ====================

		/**
		 * Find user by email for login.
		 */
		async findUserByEmail(email: string): Promise<{ id: string; email: string } | null> {
			const emailLiteral = airtableFormulaValue(email.trim().toLowerCase());
			const records = await base(TABLES.USERS)
				.select({
					filterByFormula: `LOWER({Email}) = ${emailLiteral}`
				})
				.firstPage();

			if (records.length === 0) return null;

			return {
				id: records[0].id,
				email: records[0].fields['Email'] as string
			};
		},

		/**
		 * Create a login-capable user record for email verification.
		 */
		async createUserByEmail(email: string, creatorId?: string): Promise<{ id: string; email: string }> {
			const normalizedEmail = validateEmail(email);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const fields: Record<string, any> = {
				Email: normalizedEmail
			};

			if (creatorId) {
				fields['🎨Creators'] = [creatorId];
			}

			const records = await base(TABLES.USERS).create([{ fields }]);
			const record = records[0];

			return {
				id: record.id,
				email: (record.fields['Email'] as string) || normalizedEmail
			};
		},

		/**
		 * Set verification token for user.
		 *
		 * Stores token in Airtable for verification. Delivery is handled by the
		 * external automation path, so this is purely for token storage.
		 */
		async setVerificationToken(userId: string, token: string, expirationTime: Date): Promise<void> {
			await base(TABLES.USERS).update([{
				id: userId,
				fields: {
					[FIELDS.VERIFICATION_TOKEN]: token,
					[FIELDS.TOKEN_EXPIRATION]: expirationTime.toISOString()
				}
			}]);
		},

		/**
		 * Trigger Airtable automation to send verification email.
		 *
		 * Uses two-step process to trigger Airtable automation:
		 * 1. Clear token (set to null)
		 * 2. Set new token (null → value transition triggers automation)
		 */
		async triggerVerificationEmailAutomation(userId: string, token: string, expirationTime: Date): Promise<void> {
			// Step 1: Clear token to reset automation trigger
			await base(TABLES.USERS).update([{
				id: userId,
				fields: {
					[FIELDS.VERIFICATION_TOKEN]: null as unknown as string,
					[FIELDS.TOKEN_EXPIRATION]: null as unknown as string
				}
			}]);

			// Step 2: Set new token (triggers Airtable automation)
			await base(TABLES.USERS).update([{
				id: userId,
				fields: {
					[FIELDS.VERIFICATION_TOKEN]: token,
					[FIELDS.TOKEN_EXPIRATION]: expirationTime.toISOString()
				}
			}]);
		},

		/**
		 * Verify token and get user email.
		 */
		async verifyToken(token: string): Promise<{ email: string; expired: boolean } | null> {
			const tokenLiteral = airtableFormulaValue(token);
			const records = await base(TABLES.USERS)
				.select({
					filterByFormula: `{${FIELDS.VERIFICATION_TOKEN}} = ${tokenLiteral}`
				})
				.firstPage();

			if (records.length === 0) return null;

			const record = records[0];
			const email = record.fields['Email'] as string;
			const expiration = record.fields[FIELDS.TOKEN_EXPIRATION] as string | undefined;

			let expired = false;
			if (expiration) {
				const expirationDate = new Date(expiration);
				expired = expirationDate < new Date();
			}

			return { email, expired };
		},

		/**
		 * Clear verification token after successful login.
		 */
		async clearVerificationToken(userId: string): Promise<void> {
			await base(TABLES.USERS).update([{
				id: userId,
				fields: {
					[FIELDS.TOKEN_EXPIRATION]: null as unknown as string,
					[FIELDS.VERIFICATION_TOKEN]: null as unknown as string
				}
			}]);
		},

		// ==================== ASSETS ====================

		/**
		 * Get all assets for a user by email.
		 */
		async getAssetsByEmail(email: string): Promise<Asset[]> {
			const formula = buildAssetListFormula(email);

			const records = await base(TABLES.ASSETS)
				.select({
					view: VIEWS.ASSETS,
					filterByFormula: formula
				})
				.all();

			return records.flatMap((record) => {
				try {
					return [mapAssetRecord(record)];
				} catch (error) {
					console.error('[Airtable] Failed to map asset record for dashboard', {
						email,
						recordId: record.id,
						marketplaceStatus: record.fields['🚀Marketplace Status'],
						assetType: record.fields['⚙️🆎Type (Text)'] ?? record.fields['🆎Type'],
						error: error instanceof Error ? error.message : String(error)
					});
					return [];
				}
			});
		},

		/**
		 * Determine whether a user owns at least one template asset.
		 */
		async hasTemplateAssetByEmail(email: string): Promise<boolean> {
			const formula = `AND(${buildCreatorEmailMatchFormula(email)}, {🆎Type} = 'Template🏗️')`;

			const records = await base(TABLES.ASSETS)
				.select({
					view: VIEWS.ASSETS,
					filterByFormula: formula,
					fields: ['Name'],
					maxRecords: 1
				})
				.all();

			return records.length > 0;
		},

		/**
		 * Get all assets for analytics snapshots (any asset that has been published).
		 * Used by the cron job to capture daily metrics.
		 */
		async getAllAssetsForSnapshot(): Promise<Pick<Asset, 'id' | 'name' | 'uniqueViewers' | 'cumulativePurchases' | 'cumulativeRevenue'>[]> {
			// Get all templates that have analytics data (published or have metrics)
			const formula = `AND({🆎Type} = 'Template🏗️', OR({📋 Unique Viewers} > 0, {📋 Cumulative Purchases} > 0, {📋 Cumulative Revenue} > 0))`;

			const records = await base(TABLES.ASSETS)
				.select({
					view: VIEWS.ASSETS,
					filterByFormula: formula,
					fields: ['Name', '📋 Unique Viewers', '📋 Cumulative Purchases', '📋 Cumulative Revenue']
				})
				.all();

			return records.map(record => ({
				id: record.id,
				name: record.fields['Name'] as string || '',
				uniqueViewers: record.fields['📋 Unique Viewers'] as number || 0,
				cumulativePurchases: record.fields['📋 Cumulative Purchases'] as number || 0,
				cumulativeRevenue: record.fields['📋 Cumulative Revenue'] as number || 0
			}));
		},

		/**
		 * Get single asset by ID.
		 */
		async getAsset(id: string): Promise<Asset | null> {
			try {
				const record = await base(TABLES.ASSETS).find(id);
				return mapAssetRecord(record);
			} catch {
				return null;
			}
		},

		/**
		 * Update an asset (text fields only).
		 */
		async updateAsset(
			id: string,
			data: AssetUpdateData
		): Promise<Asset | null> {
			const currentAsset = requiresCurrentSupportRecord(data) ? await this.getAsset(id) : null;
			const fields = buildAssetUpdateFields(data, currentAsset);

			if (Object.keys(fields).length === 0) {
				return null;
			}

			try {
				const records = await base(TABLES.ASSETS).update([
					{ id, fields: fields as Airtable.FieldSet }
				]);
				const record = firstUpdatedAirtableRecord(records);
				if (!record) return null;
				return mapAssetRecord(record);
			} catch {
				return null;
			}
		},

		/**
		 * Update an asset with images.
		 * Images should be passed as arrays of URLs.
		 */
		async updateAssetWithImages(
			id: string,
			data: AssetUpdateData
		): Promise<Asset | null> {
			debugLog('[Airtable] updateAssetWithImages called for id:', id);
			debugLog('[Airtable] Input data:', JSON.stringify({
				...data,
				thumbnailUrl: data.thumbnailUrl ? `${data.thumbnailUrl.substring(0, 80)}...` : data.thumbnailUrl
			}));
			
			const currentAsset = requiresCurrentSupportRecord(data) ? await this.getAsset(id) : null;
			const fields = buildAssetUpdateFields(data, currentAsset);

			// Image fields - Airtable expects array of { url: string }
			// Use field IDs (not names) to match old dashboard exactly
			if (data.thumbnailUrl !== undefined) {
				debugLog('[Airtable] Setting thumbnail field fld43LxLHMZb2yF7F to:', data.thumbnailUrl ? `[{ url: "${data.thumbnailUrl.substring(0, 50)}..." }]` : '[]');
				fields['fld43LxLHMZb2yF7F'] = data.thumbnailUrl
					? [{ url: data.thumbnailUrl }]
					: [];
			}
		// Handle secondary thumbnails - prefer array over single URL for multiple image support
		if (data.secondaryThumbnails !== undefined) {
			// Use the array format - supports multiple secondary thumbnails
			fields['fldzKxNCXcgCnEwxu'] = data.secondaryThumbnails
				.filter(url => url) // Filter out empty strings
				.map(url => ({ url }));
		} else if (data.secondaryThumbnailUrl !== undefined) {
			// Fallback to single URL for backward compatibility
			fields['fldzKxNCXcgCnEwxu'] = data.secondaryThumbnailUrl
				? [{ url: data.secondaryThumbnailUrl }]
				: [];
		}
			if (data.carouselImages !== undefined) {
				fields['fldneaPyoRXBAVtS1'] = data.carouselImages.map(url => ({ url }));
			}

			debugLog('[Airtable] Fields to update:', Object.keys(fields));

			if (Object.keys(fields).length === 0) {
				debugLog('[Airtable] No fields to update, returning null');
				return null;
			}

			try {
				debugLog('[Airtable] Calling base.update with fields...');
				const records = await base(TABLES.ASSETS).update([
					{ id, fields: fields as Airtable.FieldSet }
				]);
				const record = firstUpdatedAirtableRecord(records);
				if (!record) {
					console.error('[Airtable] Update returned no record');
					return null;
				}
				debugLog('[Airtable] Update successful, record id:', record.id);
				return mapAssetRecord(record);
			} catch (err) {
				console.error('[Airtable] Error updating asset with images:', err);
				console.error('[Airtable] Error details:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
				return null;
			}
		},

		/**
		 * Verify asset ownership by email.
		 * Matches the original Next.js logic which checks multiple email fields.
		 */
		async verifyAssetOwnership(assetId: string, email: string): Promise<boolean> {
			const normalizedEmail = email.toLowerCase();
			const assetIdLiteral = airtableFormulaValue(assetId);

			// 1) Fast path: if the asset appears in the user's dashboard list, they should be able to fetch it.
			// This uses the same formula shape as getAssetsByEmail(), scoped to a single record.
			try {
				const dashboardLikeFormula = `AND(
					RECORD_ID() = ${assetIdLiteral},
					${buildCreatorEmailMatchFormula(normalizedEmail)}
				)`;
				const dashboardMatches = await base(TABLES.ASSETS)
					.select({ filterByFormula: dashboardLikeFormula, maxRecords: 1 })
					.firstPage();
				if (dashboardMatches.length > 0) return true;
			} catch {
				// continue to next check
			}

			// 2) Field-based fallback: works when the record can be fetched and the email fields are present.
			try {
				const record = await base(TABLES.ASSETS).find(assetId);
				if (recordMatchesCreatorEmail(record, normalizedEmail)) return true;
			} catch {
				// fall through
			}

			return false;
		},

		/**
		 * Fetch an asset and verify ownership in a single Airtable call.
		 * Use instead of verifyAssetOwnership() + getAsset() when the caller
		 * needs the asset anyway — halves (or better) the Airtable round-trips.
		 */
		async getAssetForOwner(
			assetId: string,
			email: string
		): Promise<{ asset: Asset | null; isOwner: boolean }> {
			let record: Airtable.Record<Airtable.FieldSet>;
			try {
				record = await base(TABLES.ASSETS).find(assetId);
			} catch {
				return { asset: null, isOwner: false };
			}

			let isOwner = recordMatchesCreatorEmail(record, email);

			// Formula fallback for field shapes the JS check can't read (e.g. collaborator objects).
			if (!isOwner) {
				try {
					const formula = `AND(
						RECORD_ID() = ${airtableFormulaValue(assetId)},
						${buildCreatorEmailMatchFormula(email.toLowerCase())}
					)`;
					const matches = await base(TABLES.ASSETS)
						.select({ filterByFormula: formula, maxRecords: 1 })
						.firstPage();
					isOwner = matches.length > 0;
				} catch {
					// keep isOwner = false
				}
			}

			return { asset: mapAssetRecord(record), isOwner };
		},

		/**
		 * ❌Denied (fix-required) exception items for a partnership app.
		 *
		 * Returns null unless the asset carries the 🤝Partnership App flag —
		 * fail-closed: any error also returns null. Each item is release-gated
		 * by its own version's review status; the caller's asset-level check
		 * (isReviewFeedbackReleased on latestReviewStatus) is only a cheap
		 * pre-gate. Caller remains responsible for ownership.
		 */
		async getPartnerRequiredFixes(assetId: string): Promise<RequiredFixExceptionItem[] | null> {
			if (!/^rec[A-Za-z0-9]{14}$/.test(assetId)) return null;

			try {
				// Gate: the CRM-synced 🤝Partnership App checkbox, read by field ID.
				const assetRows = await base(TABLES.ASSETS)
					.select({
						filterByFormula: `RECORD_ID() = ${airtableFormulaValue(assetId)}`,
						fields: [ASSETS_PARTNERSHIP_APP_FIELD_ID],
						returnFieldsByFieldId: true,
						maxRecords: 1
					})
					.firstPage();

				if (assetRows[0]?.fields?.[ASSETS_PARTNERSHIP_APP_FIELD_ID] !== true) {
					return null;
				}

				const rows = await base(TABLES.EXCEPTIONS)
					.select({
						filterByFormula: buildRequiredFixExceptionsFormula(assetId),
						fields: [
							EXCEPTIONS_FIELD_IDS.item,
							EXCEPTIONS_FIELD_IDS.type,
							EXCEPTIONS_FIELD_IDS.decisionDatetime,
							EXCEPTIONS_FIELD_IDS.versionLink
						],
						returnFieldsByFieldId: true,
						sort: [{ field: EXCEPTIONS_FIELD_IDS.decisionDatetime, direction: 'desc' }]
					})
					.all();

				const items = rows
					.map(mapRequiredFixExceptionRecord)
					.filter((entry): entry is RequiredFixExceptionItem => entry !== null);

				if (items.length === 0) return items;

				// Each item is gated by ITS OWN version's review status, so the
				// version fetch is mandatory — if it fails, nothing is shown.
				// Chunk the RECORD_ID() OR-formula to stay under Airtable's
				// URL/formula limits; never truncate the ledger.
				const versionIds = [
					...new Set(items.map((entry) => entry.versionRecordId).filter(Boolean))
				] as string[];
				if (versionIds.length === 0) return [];

				const versions = new Map<string, RequiredFixVersionInfo>();
				const chunkSize = 50;
				for (let i = 0; i < versionIds.length; i += chunkSize) {
					const chunk = versionIds.slice(i, i + chunkSize);
					const versionRows = await base(TABLES.ASSET_VERSIONS)
						.select({
							filterByFormula: `OR(${chunk
								.map((id) => `RECORD_ID() = ${airtableFormulaValue(id)}`)
								.join(', ')})`,
							fields: [
								ASSET_VERSIONS_VERSION_NUMBER_FIELD_ID,
								ASSET_VERSIONS_REVIEW_STATUS_FIELD_ID
							],
							returnFieldsByFieldId: true
						})
						.all();

					for (const row of versionRows) {
						versions.set(row.id, {
							versionNumber: Number(row.fields[ASSET_VERSIONS_VERSION_NUMBER_FIELD_ID]),
							reviewStatus: firstString(row.fields[ASSET_VERSIONS_REVIEW_STATUS_FIELD_ID])
						});
					}
				}

				return gateRequiredFixesByVersion(items, versions);
			} catch (err) {
				console.error('[Airtable] getPartnerRequiredFixes failed:', {
					assetId,
					statusCode: (err as { statusCode?: number })?.statusCode
				});
				return null;
			}
		},

		/**
		 * Debuggable ownership check.
		 *
		 * IMPORTANT: Returns diagnostics without exposing any creator emails from Airtable.
		 * Use for troubleshooting 403s on /api/assets/[id] while authenticated.
		 */
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
					const matched = fieldContainsEmail(value, normalizedEmail);
					fieldDiagnostics[field] = { present: true, type: 'array', matched, length: value.length };
					if (matched) anyFieldMatched = true;
				} else if (typeof value === 'string') {
					const matched = fieldContainsEmail(value, normalizedEmail);
					fieldDiagnostics[field] = { present: true, type: 'string', matched, length: value.length };
					if (matched) anyFieldMatched = true;
				} else {
					fieldDiagnostics[field] = { present: true, type: 'other', matched: false };
				}
			}

			// Formula fallback (robust to Airtable field types / lookup vs string)
			const formula = `AND(
				RECORD_ID() = ${airtableFormulaValue(assetId)},
				${buildCreatorEmailMatchFormula(normalizedEmail)}
			)`;

			let formulaMatched = false;
			try {
				const matches = await base(TABLES.ASSETS)
					.select({ filterByFormula: formula, maxRecords: 1 })
					.firstPage();
				formulaMatched = matches.length > 0;
			} catch {
				formulaMatched = false;
			}

			// Dashboard-like fallback (same as getAssetsByEmail logic, but scoped to one record)
			let dashboardLikeFormulaMatched = false;
			try {
				const dashboardLikeFormula = `AND(
					RECORD_ID() = ${airtableFormulaValue(assetId)},
					${buildCreatorEmailMatchFormula(normalizedEmail)}
				)`;
				const matches = await base(TABLES.ASSETS)
					.select({ filterByFormula: dashboardLikeFormula, maxRecords: 1 })
					.firstPage();
				dashboardLikeFormulaMatched = matches.length > 0;
			} catch {
				dashboardLikeFormulaMatched = false;
			}

			const isOwner = anyFieldMatched || formulaMatched || dashboardLikeFormulaMatched;

			return {
				isOwner,
				debug: {
					assetId,
					userEmailHash,
					emailFields: fieldDiagnostics,
					formulaMatched,
					dashboardLikeFormulaMatched
				}
			};
		},

		/**
		 * Archive an asset (change status to Delisted).
		 */
		async archiveAsset(id: string): Promise<{ success: boolean; error?: string }> {
			try {
				const record = await base(TABLES.ASSETS).find(id);
				const currentName = record.fields['Name'] as string || '';
				const uniqueCode = randomBytes(4).toString('hex').toUpperCase();

				await base(TABLES.ASSETS).update([{
					id,
					fields: {
						'Name': `${currentName} Archived ${uniqueCode}`,
						'🚀Marketplace Status': '4️⃣Delisted☠️',
						'🥞CMS Status': 'Archived'
					}
				}]);

				return { success: true };
			} catch (err) {
				console.error('Error archiving asset:', err);
				return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
			}
		},

		/**
		 * Check asset name uniqueness.
		 */
		async checkAssetNameUniqueness(name: string, excludeId?: string): Promise<{ unique: boolean; existingId?: string }> {
			const nameLiteral = airtableFormulaValue(name.trim());
			let formula = `LOWER({Name}) = LOWER(${nameLiteral})`;

			if (excludeId) {
				formula = `AND(${formula}, RECORD_ID() != ${airtableFormulaValue(excludeId)})`;
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

		// ==================== CREATORS ====================

		/**
		 * Get creator profile by email.
		 * Matches the original Next.js implementation by searching across multiple email fields.
		 */
		async getCreatorByEmail(email: string): Promise<Creator | null> {
			try {
				debugLog('[Airtable] Searching for creator with email:', email);
				debugLog('[Airtable] Using table ID:', TABLES.CREATORS);
				
				// Exact-match across the Creators email fields, quoted by the shared
				// formula-literal helper so the email can never alter the formula.
				const formula = buildCreatorRecordEmailMatchFormula(email);
				
				debugLog('[Airtable] Formula:', formula);
				
				const records = await base(TABLES.CREATORS)
					.select({
						filterByFormula: formula
					})
					.firstPage();

				debugLog('[Airtable] Query completed. Found records:', records.length);
				
				if (records.length === 0) {
					debugLog('[Airtable] No creator found for email:', email);
					return null;
				}

				const record = records[0];
				debugLog('[Airtable] Record field keys:', Object.keys(record.fields));
				
				// Use the exact field names from the original Next.js implementation
				const creator = {
					id: record.id,
					name: (record.fields['Name'] as string) || '', // Match original: 'Name' not '🎨Name'
					email: email,
					emails: (record.fields['📧Emails'] as string)?.split(',').map(e => e.trim()),
					avatarUrl: (record.fields['🖼️Avatar (Primary)'] as { url: string }[] | undefined)?.[0]?.url,
					biography: (record.fields['ℹ️Biography'] as string), // Match original: 'ℹ️Biography' not '📝Biography'
					legalName: (record.fields['ℹ️Legal Name'] as string), // Match original: 'ℹ️Legal Name' not '📜Legal Name'
					websiteUrl: (record.fields['🔗Personal Site'] as string)
				};
				
				debugLog('[Airtable] Returning creator:', {
					id: creator.id,
					name: creator.name,
					hasAvatar: !!creator.avatarUrl,
					hasBio: !!creator.biography,
					hasLegalName: !!creator.legalName
				});
				
				return creator;
			} catch (err) {
				console.error('[Airtable] Error fetching creator by email:', err);
				console.error('[Airtable] Error details:', {
					message: (err as Error).message,
					stack: (err as Error).stack
				});
				return null;
			}
		},

		/**
		 * Update creator profile.
		 * Uses the same field names as the original Next.js implementation.
		 */
		async updateCreator(id: string, data: Partial<Pick<Creator, 'name' | 'biography' | 'legalName' | 'avatarUrl' | 'websiteUrl'>>): Promise<Creator | null> {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const fields: Record<string, any> = {};

			// Match original Next.js field names
			if (data.name !== undefined) fields['Name'] = data.name;
			if (data.biography !== undefined) fields['ℹ️Biography'] = data.biography;
			if (data.legalName !== undefined) fields['ℹ️Legal Name'] = data.legalName;
			if (data.websiteUrl !== undefined) fields['🔗Personal Site'] = data.websiteUrl;
			// Airtable attachment fields require array of {url} objects
			// Use field ID (fldyddTon9Lu8BR8G) to match original Next.js dashboard exactly
			if (data.avatarUrl !== undefined) {
				fields['fldyddTon9Lu8BR8G'] = data.avatarUrl ? [{ url: data.avatarUrl }] : [];
			}

			if (Object.keys(fields).length === 0) {
				debugLog('[Airtable] updateCreator: No fields to update');
				return null;
			}

			debugLog('[Airtable] updateCreator called:', {
				creatorId: id,
				fieldKeys: Object.keys(fields),
				hasAvatar: 'fldyddTon9Lu8BR8G' in fields,
				avatarUrl: data.avatarUrl ? `${data.avatarUrl.substring(0, 80)}...` : data.avatarUrl
			});

			try {
				const records = await base(TABLES.CREATORS).update([{ id, fields }]) as Airtable.Records<Airtable.FieldSet>;
				const record = records[0];
				debugLog('[Airtable] updateCreator success:', { creatorId: record.id });
				return {
					id: record.id,
					name: (record.fields['Name'] as string) || '', // Match original field name
					email: (record.fields['📧Emails'] as string)?.split(',')[0]?.trim() || '',
					emails: (record.fields['📧Emails'] as string)?.split(',').map(e => e.trim()),
					avatarUrl: (record.fields['🖼️Avatar (Primary)'] as { url: string }[] | undefined)?.[0]?.url,
					biography: (record.fields['ℹ️Biography'] as string), // Match original field name
					legalName: (record.fields['ℹ️Legal Name'] as string), // Match original field name
					websiteUrl: (record.fields['🔗Personal Site'] as string)
				};
			} catch (err) {
				console.error('[Airtable] Error updating creator:', err);
				console.error('[Airtable] updateCreator error details:', {
					creatorId: id,
					fieldKeys: Object.keys(fields),
					errorMessage: err instanceof Error ? err.message : String(err),
					errorType: err?.constructor?.name,
					// Airtable errors often have statusCode and error properties
					statusCode: (err as { statusCode?: number })?.statusCode,
					airtableError: (err as { error?: string })?.error
				});
				return null;
			}
		},

		/**
		 * Create a new creator profile.
		 */
		async createCreator(data: CreateCreatorInput): Promise<Creator> {
			const email = validateEmail(data.email);
			const webflowEmail = validateEmail(data.webflowEmail);
			const emails = dedupeEmails(email, webflowEmail);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const fields: Record<string, any> = {
				Name: data.name.trim(),
				'📧Email': email,
				'📧WF Account Email': webflowEmail,
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

			const records = await base(TABLES.CREATORS).create([{ fields }]);
			const record = records[0];

			return {
				id: record.id,
				name: (record.fields['Name'] as string) || '',
				email,
				emails,
				avatarUrl: (record.fields['🖼️Avatar (Primary)'] as { url: string }[] | undefined)?.[0]?.url,
				biography: (record.fields['ℹ️Biography'] as string),
				legalName: (record.fields['ℹ️Legal Name'] as string),
				websiteUrl: (record.fields['🔗Personal Site'] as string)
			};
		},

		// ==================== API KEYS ====================

		/**
		 * Generate a new API key.
		 */
		async generateApiKey(creatorEmail: string, name: string, scopes: string[]): Promise<{ key: string; apiKey: ApiKey }> {
			const rawKey = randomBytes(32).toString('hex');
			const keyPrefix = 'wfd_';
			const fullKey = `${keyPrefix}${rawKey}`;
			const keyHash = createHash('sha256').update(fullKey).digest('hex');

			const now = new Date();
			const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

			const records = await base(TABLES.API_KEYS).create([{
				fields: {
					'Name': name,
					'Key Hash': keyHash,
					'Key Prefix': fullKey.substring(0, 12),
					'Creator Email': creatorEmail,
					'Scopes': scopes.join(','),
					'Status': 'Active',
					'Created At': now.toISOString(),
					'Expires At': expiresAt.toISOString()
				}
			}]);

			const record = records[0];
			return {
				key: fullKey,
				apiKey: {
					id: record.id,
					name: record.fields['Name'] as string,
					keyPrefix: record.fields['Key Prefix'] as string,
					createdAt: record.fields['Created At'] as string,
					expiresAt: record.fields['Expires At'] as string,
					scopes: scopes,
					status: 'Active'
				}
			};
		},

		/**
		 * List API keys for a creator.
		 */
		async listApiKeys(creatorEmail: string): Promise<ApiKey[]> {
			const emailLiteral = airtableFormulaValue(creatorEmail.trim().toLowerCase());
			const records = await base(TABLES.API_KEYS)
				.select({
					filterByFormula: `LOWER({Creator Email}) = ${emailLiteral}`,
					sort: [{ field: 'Created At', direction: 'desc' }]
				})
				.all();

			return records.map(r => {
				const expiresAt = r.fields['Expires At'] as string | undefined;
				const status = r.fields['Status'] as string || 'Active';

				let finalStatus: ApiKey['status'] = status as ApiKey['status'];
				if (status === 'Active' && expiresAt && new Date(expiresAt) < new Date()) {
					finalStatus = 'Expired';
				}

				return {
					id: r.id,
					name: r.fields['Name'] as string || 'Unnamed Key',
					keyPrefix: r.fields['Key Prefix'] as string | undefined,
					createdAt: r.fields['Created At'] as string,
					expiresAt: expiresAt,
					lastUsedAt: r.fields['Last Used At'] as string | undefined,
					scopes: (r.fields['Scopes'] as string || '').split(',').filter(Boolean),
					status: finalStatus,
					requestCount: r.fields['Request Count'] as number | undefined
				};
			});
		},

		/**
		 * Revoke an API key.
		 */
		async revokeApiKey(keyId: string, creatorEmail: string): Promise<boolean> {
			try {
				const record = await base(TABLES.API_KEYS).find(keyId);
				const recordEmail = record.fields['Creator Email'] as string;

				if (recordEmail.toLowerCase() !== creatorEmail.toLowerCase()) {
					return false;
				}

				await base(TABLES.API_KEYS).update([{
					id: keyId,
					fields: {
						'Status': 'Revoked',
						'Revoked At': new Date().toISOString()
					}
				}]);

				return true;
			} catch {
				return false;
			}
		},

		/**
		 * Validate an API key.
		 */
		async validateApiKey(key: string): Promise<{ valid: boolean; email?: string; scopes?: string[] }> {
			if (!key.startsWith('wfd_')) {
				return { valid: false };
			}

			const keyHash = createHash('sha256').update(key).digest('hex');
			const keyHashLiteral = airtableFormulaValue(keyHash);

			const records = await base(TABLES.API_KEYS)
				.select({
					filterByFormula: `AND({Key Hash} = ${keyHashLiteral}, {Status} = 'Active')`,
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

			// Update last used timestamp (fire and forget)
			base(TABLES.API_KEYS).update([{
				id: record.id,
				fields: { 'Last Used At': new Date().toISOString() }
			}]).catch(() => { /* ignore errors */ });

			return {
				valid: true,
				email: record.fields['Creator Email'] as string,
				scopes: (record.fields['Scopes'] as string || '').split(',').filter(Boolean)
			};
		},

		// ==================== ANALYTICS ====================

		/**
		 * Compute creator category concentration from assets data.
		 *
		 * This supports the "single category vs multiple categories" business question.
		 */
		async getCreatorCategorySplit(): Promise<CreatorCategorySplit> {
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
		},

		/**
		 * Get leaderboard data ordered by marketplace sales rank.
		 * Defaults to the top 50 rows for the UI; snapshot jobs can pass `null`
		 * to capture every ranked row exposed by Airtable.
		 */
		async getLeaderboard(options: { maxRecords?: number | null } = {}): Promise<{
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
			const maxRecords = options.maxRecords === undefined ? 50 : options.maxRecords;
			const records = await base(TABLES.LEADERBOARD)
				.select({
					view: VIEWS.LEADERBOARD,
					...(typeof maxRecords === 'number' ? { maxRecords } : {}),
					sort: [{ field: 'SALES_RANK', direction: 'asc' }]
				})
				.all();

			return {
				records: records.map(record => ({
					templateName: record.fields['TEMPLATE_NAME'] as string || '',
					category: record.fields['CATEGORY'] as string || '',
					creatorEmail: record.fields['CREATOR_EMAIL'] as string || '',
					totalSales30d: Number(record.fields['TOTAL_SALES_30D']) || 0,
					totalRevenue30d: Number(record.fields['TOTAL_REVENUE_30D']) || 0,
					avgRevenuePerSale: Number(record.fields['AVG_REVENUE_PER_SALE']) || 0,
					salesRank: Number(record.fields['SALES_RANK']) || 0,
					revenueRank: Number(record.fields['REVENUE_RANK']) || 0
				})),
				freshness: extractMarketplaceFreshness(records)
			};
		},

		/**
		 * Get category performance data.
		 */
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
				records: records.map(record => ({
					category: record.fields['CATEGORY'] as string || '',
					subcategory: record.fields['SUBCATEGORY'] as string || '',
					templatesInSubcategory: Number(record.fields['TEMPLATES_IN_SUBCATEGORY']) || 0,
					totalSales30d: Number(record.fields['TOTAL_SALES_30D']) || 0,
					totalRevenue30d: Number(record.fields['TOTAL_REVENUE_30D']) || 0,
					avgRevenuePerTemplate: Number(record.fields['AVG_REVENUE_PER_TEMPLATE']) || 0,
					revenueRank: Number(record.fields['REVENUE_RANK']) || 0
				})),
				freshness: extractMarketplaceFreshness(records)
			};
		},

		// ==================== ASSET VERSIONS ====================

		/**
		 * Create a new version of an asset.
		 * Captures current state as a snapshot before any changes are made.
		 * 
		 * Field IDs from old dashboard:
		 * - fldemWilqCQcOCh5s: Asset link (linked record to assets table)
		 * - fldn2ImbgwKfCdWWA: Version Number
		 * - fldjYFJMGTerFYlol: Type (e.g., 'Meta Update')
		 * - fldc999gbJ8LWWoTC: Changes JSON
		 * - fldknoYakli2sqznT: Asset ID (for filtering)
		 */
			async createAssetVersion(
				assetId: string,
				createdBy: string,
				changes: AssetVersionChanges
			): Promise<AssetVersion | null> {
				debugLog('[Airtable] createAssetVersion called:', { assetId, createdBy, changesType: typeof changes });
				debugLog('[Airtable] Using ASSET_VERSIONS table:', TABLES.ASSET_VERSIONS);

				try {
					// Get current asset state
					debugLog('[Airtable] Fetching asset state...');
					const asset = await this.getAsset(assetId);
					if (!asset) {
						debugLog('[Airtable] Asset not found:', assetId);
						return null;
					}
					debugLog('[Airtable] Asset found:', asset.name);
					return await this.createAssetVersionFromAsset(asset, createdBy, changes);
				} catch (err) {
					console.error('[Airtable] Error creating asset version:', err);
					console.error('[Airtable] Error details:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
					return null;
				}
			},

			async createAssetVersionFromAsset(
				asset: Asset,
				createdBy: string,
				changes: AssetVersionChanges
			): Promise<AssetVersion | null> {
				try {
					// Check if asset is "Upcoming" - don't create versions for upcoming assets
					// Matches v1 logic: pages/api/asset/createVersion/[id].js lines 50-57
					const cleanStatus = asset.status.replace(/^\d️⃣/u, '').replace(/🆕|🚀/gu, '').trim();
					if (cleanStatus === 'Upcoming') {
						debugLog('[Airtable] Asset is Upcoming, skipping version creation');
						return null;
					}

					// Get the next version number by counting existing versions
					// Matches v1 logic exactly: pages/api/asset/createVersion/[id].js lines 62-64
					// Only the count is needed, so fetch a single field instead of full records.
					debugLog('[Airtable] Querying existing versions...');
					const existingVersions = await base(TABLES.ASSET_VERSIONS)
						.select({
							filterByFormula: `{fldknoYakli2sqznT} = ${airtableFormulaValue(asset.id)}`,
							fields: ['fldknoYakli2sqznT']
						})
						.all();

					const nextVersion = existingVersions.length + 1;
					debugLog('[Airtable] Existing versions count:', existingVersions.length, '-> Next version:', nextVersion);

					// Create snapshot of current state
					const snapshot = buildAssetVersionSnapshot(asset);

					// For structured changes, check if there are significant changes
					// Matches v1 logic: pages/api/asset/createVersion/[id].js lines 90-98
					if (typeof changes === 'object') {
						if (Object.keys(changes).length === 0) {
							debugLog('[Airtable] No significant changes detected, skipping version creation');
							return null;
						}
						if (isLongDescriptionOnlyAssetVersionChange(changes)) {
							debugLog('[Airtable] Long-description-only change detected, skipping version creation');
							return null;
						}
					}

					const fields = buildAssetVersionCreateFields(
						asset.id,
						nextVersion,
						changes,
						snapshot,
						createdBy
					);

					debugLog('[Airtable] Creating version record with fields:', {
						...fields,
						fldc999gbJ8LWWoTC: String(fields.fldc999gbJ8LWWoTC).substring(0, 100) + '...',
						Snapshot: String(fields.Snapshot).substring(0, 100) + '...'
					});
					const records = await base(TABLES.ASSET_VERSIONS).create(
						fields as Partial<Airtable.FieldSet>
					);
					debugLog('[Airtable] Version record created:', records.id);

					const changesStr = typeof changes === 'string' ? changes : JSON.stringify(changes);
					return {
						id: records.id,
						assetId: asset.id,
						versionNumber: nextVersion,
						createdAt: new Date().toISOString(),
						createdBy: createdBy,
						changes: changesStr,
						snapshot: snapshot
					};
				} catch (err) {
					console.error('[Airtable] Error creating asset version:', err);
					console.error('[Airtable] Error details:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
					return null;
				}
			},

		/**
		 * Get all versions for an asset.
		 */
		async getAssetVersions(assetId: string): Promise<AssetVersion[]> {
			try {
				const records = await base(TABLES.ASSET_VERSIONS)
					.select({
						filterByFormula: `{Asset ID} = ${airtableFormulaValue(assetId)}`,
						sort: [{ field: 'Version Number', direction: 'desc' }]
					})
					.all();

				return records
					.map(mapAssetVersionRecord)
					.filter((version): version is AssetVersion => version !== null);
			} catch (err) {
				console.error('Error getting asset versions:', err);
				return [];
			}
		},

		/**
		 * Get a specific version by ID.
		 */
		async getAssetVersion(versionId: string): Promise<AssetVersion | null> {
			try {
				const record = await base(TABLES.ASSET_VERSIONS).find(versionId);
				return mapAssetVersionRecord(record);
			} catch {
				return null;
			}
		},

		/**
		 * Rollback an asset to a previous version.
		 * Creates a new version entry documenting the rollback.
		 */
		async rollbackAssetToVersion(
			assetId: string,
			versionId: string,
			rolledBackBy: string
		): Promise<Asset | null> {
			try {
				// Get the version to rollback to
				const version = await this.getAssetVersion(versionId);
				if (!version) return null;

				// Verify it's for the correct asset
				if (version.assetId !== assetId) return null;

				// Create a version of the current state before rollback
				await this.createAssetVersion(
					assetId,
					rolledBackBy,
					`Rollback to version ${version.versionNumber}`
				);

				// Apply the snapshot
				const updatedAsset = await this.updateAssetWithImages(assetId, version.snapshot);
				return updatedAsset;
			} catch (err) {
				console.error('Error rolling back asset:', err);
				return null;
			}
		}
	};
}

export type AirtableClient = ReturnType<typeof getAirtableClient>;
