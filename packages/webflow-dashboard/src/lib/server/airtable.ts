import Airtable from 'airtable';
import { randomBytes, createHash } from 'node:crypto';
import { isLongDescriptionOnlyAssetVersionChange } from '../utils/asset-version-changes';
import { isRecoveryOfferStrategy } from '../utils/template-lifecycle-policy';

// Airtable table IDs
const TABLES = {
	USERS: 'tbldQNGszIyOjt9a1',
	CREATORS: 'tbljt0plqxdMARZXb',
	ASSETS: 'tblRwzpWoLgE9MrUm',
	TEMPLATE_FULFILLMENT_LINKS: 'tbl0QjLG8p4bsOsJj',
	TEMPLATE_OFFERS: 'tblq5116AUP0kSmwe',
	API_KEYS: 'tblU5rI3WiQerozvX',
	TAGS: '🏷️Tags (Free Form)',
	CATEGORY_PERFORMANCE: 'tblDU1oUiobNfMQP9',
	LEADERBOARD: 'tblcXLVLYobhNmrg6',
	ASSET_VERSIONS: 'tblHxZ2hgSFLZxsZu'
} as const;

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
 * Escapes user input for safe use in Airtable formulas.
 * Prevents formula injection attacks by doubling single quotes.
 */
export function escapeAirtableString(input: string): string {
	if (typeof input !== 'string') {
		throw new Error('Input must be a string');
	}
	return input.replace(/'/g, "''");
}

/**
 * Builds a robust Airtable formula that matches creator emails across the
 * lookup and direct-email fields used by dashboard auth and ownership checks.
 */
export function buildCreatorEmailMatchFormula(email: string): string {
	const normalizedEmail = email.trim().toLowerCase();
	const escapedEmail = escapeAirtableString(normalizedEmail);
	const clauses = CREATOR_EMAIL_FORMULA_FIELDS.map(
		(field) => `FIND('${escapedEmail}', LOWER(ARRAYJOIN({${field}}, ","))) > 0`
	);

	return `OR(${clauses.join(', ')})`;
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
function recordMatchesCreatorEmail(
	record: Airtable.Record<Airtable.FieldSet>,
	email: string
): boolean {
	const normalizedEmail = email.trim().toLowerCase();

	for (const field of CREATOR_EMAIL_FORMULA_FIELDS) {
		const fieldValue = record.fields[field];
		if (!fieldValue) continue;

		if (Array.isArray(fieldValue)) {
			if (fieldValue.some((e) => String(e).toLowerCase().includes(normalizedEmail))) return true;
		} else if (typeof fieldValue === 'string') {
			if (fieldValue.toLowerCase().includes(normalizedEmail)) return true;
		}
	}

	return false;
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
	qualifiedSales30d?: number;
	recoveryOfferUsed?: boolean;
	activeOfferLabel?: string;
	activeOfferPrice?: number;
	activeOfferEndsAt?: string;
	activeOfferCtaUrl?: string;
	activeOfferVisibility?: string;
	activeOfferMode?: string;
	activeOfferStrategy?: string;
	offerPruneReviewAt?: string;
	postOfferAction?: string;
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

export type TemplateOfferStrategy =
	| 'Limited-time sale'
	| 'Creator-managed price test'
	| 'Prune recovery test'
	| 'Exit sale before delist'
	| 'Retention save';

export type TemplateOfferPostOfferAction =
	| 'Return to standard checkout'
	| 'Review search visibility after expiry'
	| 'Move to detail-only after expiry'
	| 'Delist / archive after expiry';

export interface TemplateOfferRequestInput {
	creatorEmail: string;
	offerLabel: string;
	offerPrice: number;
	fulfillmentUrl: string;
	startsAt?: string;
	endsAt: string;
	offerStrategy: TemplateOfferStrategy;
	postOfferAction: TemplateOfferPostOfferAction;
	notes?: string;
	termsAcceptedAt: string;
	visibilityTermsAcceptedAt?: string;
}

export interface TemplateOfferRequestResult {
	offerId: string;
	fulfillmentLinkId: string;
	approvalStatus: 'Approved' | 'Pending';
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

function parseCurrencyAmount(value?: string): number | undefined {
	if (!value) return undefined;
	const match = value.replace(/,/g, '').match(/\$?\s*(\d+(?:\.\d{1,2})?)/);
	if (!match) return undefined;
	const amount = Number(match[1]);
	return Number.isFinite(amount) ? amount : undefined;
}

function firstNumber(...values: unknown[]): number | undefined {
	for (const value of values) {
		if (typeof value === 'number' && Number.isFinite(value)) return value;
		const raw = firstString(value);
		if (!raw) continue;
		const parsed = Number(raw.replace(/,/g, ''));
		if (Number.isFinite(parsed)) return parsed;
	}
	return undefined;
}

function firstBoolean(...values: unknown[]): boolean | undefined {
	for (const value of values) {
		if (typeof value === 'boolean') return value;
		if (typeof value === 'number') return value > 0;
		const raw = firstString(value)?.toLowerCase();
		if (!raw) continue;
		if (['true', 'yes', 'used', 'complete', 'completed', '1'].includes(raw)) return true;
		if (['false', 'no', 'unused', 'not used', '0'].includes(raw)) return false;
	}
	return undefined;
}

function addDaysIso(dateValue: string, days: number): string {
	const date = new Date(dateValue);
	if (Number.isNaN(date.getTime())) {
		return new Date().toISOString();
	}
	date.setUTCDate(date.getUTCDate() + days);
	return date.toISOString();
}

function approvalStatusForPostOfferAction(
	action: TemplateOfferPostOfferAction
): TemplateOfferRequestResult['approvalStatus'] {
	return action === 'Delist / archive after expiry' ? 'Pending' : 'Approved';
}

function linkedRecordIds(value: unknown): string[] {
	if (Array.isArray(value)) {
		return value.flatMap((entry) => linkedRecordIds(entry));
	}

	if (typeof value === 'string') {
		const trimmed = value.trim();
		return /^rec[A-Za-z0-9]+$/.test(trimmed) ? [trimmed] : [];
	}

	if (value && typeof value === 'object') {
		const record = value as Record<string, unknown>;
		return linkedRecordIds(record.id ?? record.recordId);
	}

	return [];
}

function dateTimestamp(value: unknown): number | null {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	const raw = firstString(value);
	if (!raw) return null;
	const timestamp = Date.parse(raw);
	return Number.isFinite(timestamp) ? timestamp : null;
}

function normalizedFieldText(value: unknown): string {
	return firstString(value)?.trim().toLowerCase() ?? '';
}

function isApprovedLikeTemplateOffer(record: Airtable.Record<Airtable.FieldSet>): boolean {
	const status = normalizedFieldText(record.fields['⚙️Approval Status']);
	return status === 'approved' || status === 'live';
}

function isResolvedTemplateOffer(record: Airtable.Record<Airtable.FieldSet>): boolean {
	const status = normalizedFieldText(record.fields['⚙️Approval Status']);
	return ['approved', 'live', 'expired', 'complete', 'completed'].includes(status);
}

function isPublicActiveTemplateOffer(
	record: Airtable.Record<Airtable.FieldSet>,
	now = new Date()
): boolean {
	if (!isApprovedLikeTemplateOffer(record)) return false;
	if (!firstString(record.fields['🔗Public CTA URL'])) return false;

	const nowTime = now.getTime();
	const startsAt = dateTimestamp(record.fields['📅Starts At']);
	if (startsAt !== null && startsAt > nowTime) return false;

	const endsAt = dateTimestamp(record.fields['📅Ends At']);
	if (endsAt !== null && endsAt <= nowTime) return false;

	const visibility = normalizedFieldText(record.fields['👁️Visibility']);
	if (visibility.includes('hidden') || visibility.includes('internal')) return false;

	return true;
}

function isRecoveryTemplateOffer(record: Airtable.Record<Airtable.FieldSet>): boolean {
	return isResolvedTemplateOffer(record) && isRecoveryOfferStrategy(firstString(record.fields['⚙️Offer Strategy']));
}

function activeOfferModeKey(record: Airtable.Record<Airtable.FieldSet>): 'marketplace' | 'fulfillment_link' {
	const mode = normalizedFieldText(record.fields['⚙️Offer Mode']);
	return mode.includes('fulfillment') ? 'fulfillment_link' : 'marketplace';
}

function compareActiveTemplateOffers(
	a: Airtable.Record<Airtable.FieldSet>,
	b: Airtable.Record<Airtable.FieldSet>
): number {
	const aStatus = normalizedFieldText(a.fields['⚙️Approval Status']);
	const bStatus = normalizedFieldText(b.fields['⚙️Approval Status']);
	if (aStatus !== bStatus) {
		if (aStatus === 'live') return -1;
		if (bStatus === 'live') return 1;
	}

	const aEndsAt = dateTimestamp(a.fields['📅Ends At']) ?? Number.POSITIVE_INFINITY;
	const bEndsAt = dateTimestamp(b.fields['📅Ends At']) ?? Number.POSITIVE_INFINITY;
	if (aEndsAt !== bEndsAt) return aEndsAt - bEndsAt;

	return a.id.localeCompare(b.id);
}

function selectActiveTemplateOffer(
	records: readonly Airtable.Record<Airtable.FieldSet>[],
	now = new Date()
): Airtable.Record<Airtable.FieldSet> | null {
	return records
		.filter((record) => isPublicActiveTemplateOffer(record, now))
		.sort(compareActiveTemplateOffers)[0] ?? null;
}

function buildTemplateOfferMirrorFields(
	activeOffer: Airtable.Record<Airtable.FieldSet> | null,
	recoveryOfferUsed: boolean,
	generatedAt?: string | null
): Record<string, AirtableWritableValue> {
	const publicCtaUrl = activeOffer ? firstString(activeOffer.fields['🔗Public CTA URL']) : undefined;
	const offerPrice = activeOffer ? firstNumber(activeOffer.fields['💲Offer Price']) : undefined;

	return {
		'✅Active Offer Enabled (🏗️ only)': Boolean(activeOffer),
		'⚙️Active Offer Mode (🏗️ only)': activeOffer ? activeOfferModeKey(activeOffer) : null,
		'🎟️Active Offer Label (🏗️ only)': activeOffer
			? firstString(activeOffer.fields['🏷️Offer Label']) || 'Limited offer'
			: null,
		'🎟️Active Offer Price (🏗️ only)': activeOffer && offerPrice !== undefined ? offerPrice : null,
		'📅Active Offer Ends At (🏗️ only)': activeOffer ? firstString(activeOffer.fields['📅Ends At']) || null : null,
		'🔗Active Offer CTA URL (🏗️ only)': publicCtaUrl || null,
		'👁️Active Offer Visibility (🏗️ only)': activeOffer ? firstString(activeOffer.fields['👁️Visibility']) || null : null,
		'⚙️Post-Offer Action (🏗️ only)': activeOffer
			? firstString(activeOffer.fields['⚙️Post-Offer Action']) || null
			: null,
		'⚙️Active Offer Strategy (🏗️ only)': activeOffer
			? firstString(activeOffer.fields['⚙️Offer Strategy']) || null
			: null,
		'📅Offer Prune Review At (🏗️ only)': activeOffer
			? firstString(activeOffer.fields['📅Prune Review At']) || null
			: null,
		'🔗Active Fulfillment Link (🏗️ only)': publicCtaUrl || null,
		'📅Active Fulfillment Link Generated At (🏗️ only)': activeOffer ? generatedAt || null : null,
		'✅Recovery Offer Used (🏗️ only)': recoveryOfferUsed
	};
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
	return Array.from({ length: 5 }, (_, index) => firstString(fields[`Alt Text Screenshot ${index + 1}`]) || '');
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
	const activeOfferPriceRaw = record.fields['🎟️Active Offer Price (🏗️ only)'];
	const activeOfferPrice =
		typeof activeOfferPriceRaw === 'number' ? activeOfferPriceRaw : Number(activeOfferPriceRaw);
	const priceAmountRaw = record.fields['🥞💲Template Price Filter (🏗️ only)'];
	const priceAmount = typeof priceAmountRaw === 'number' ? priceAmountRaw : Number(priceAmountRaw);
	const activeOfferStrategy = firstString(record.fields['⚙️Active Offer Strategy (🏗️ only)']);
	const qualifiedSales30d = firstNumber(
		record.fields['✅Qualified Sales 30d (🏗️ only)'],
		record.fields['✅Qualified Sales (30d) (🏗️ only)'],
		record.fields['Qualified Sales 30d'],
		record.fields['📋 Cumulative Purchases'],
		record.fields['TOTAL_SALES_30D']
	);
	const recoveryOfferUsed =
		firstBoolean(
			record.fields['✅Recovery Offer Used (🏗️ only)'],
			record.fields['Recovery Offer Used'],
			record.fields['recovery_offer_used']
		) ??
		Boolean(
			activeOfferStrategy &&
				(activeOfferStrategy.toLowerCase().includes('recovery') ||
					activeOfferStrategy.toLowerCase().includes('exit sale'))
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
		publishedDate:
			firstString(record.fields['🚀📅Published Date']) ||
			firstString(record.fields['📅Published Date']),
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
		priceAmount: Number.isFinite(priceAmount) ? priceAmount : undefined,
		searchVisibility:
			firstString(record.fields['👁️Search Visibility (🏗️ only)']) ||
			firstString(record.fields['Search Visibility']) ||
			firstString(record.fields['search_visibility']),
		qualifiedSales30d,
		recoveryOfferUsed,
		activeOfferLabel: firstString(record.fields['🎟️Active Offer Label (🏗️ only)']),
		activeOfferPrice: Number.isFinite(activeOfferPrice) ? activeOfferPrice : undefined,
		activeOfferEndsAt: firstString(record.fields['📅Active Offer Ends At (🏗️ only)']),
		activeOfferCtaUrl: firstString(record.fields['🔗Active Offer CTA URL (🏗️ only)']),
		activeOfferVisibility: firstString(record.fields['👁️Active Offer Visibility (🏗️ only)']),
		activeOfferMode: firstString(record.fields['⚙️Active Offer Mode (🏗️ only)']),
		activeOfferStrategy,
		offerPruneReviewAt: firstString(record.fields['📅Offer Prune Review At (🏗️ only)']),
		postOfferAction: firstString(record.fields['⚙️Post-Offer Action (🏗️ only)']),
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

function requiresCurrentSupportRecord(data: AssetUpdateData): boolean {
	const isSupportUpdate = data.appSupportEmail !== undefined || data.appSupportUrl !== undefined;
	return isSupportUpdate && (data.appSupportEmail === undefined || data.appSupportUrl === undefined);
}

function buildAssetUpdateFields(
	data: AssetUpdateData,
	currentAsset?: Asset | null
): Record<string, AirtableWritableValue> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const fields: Record<string, any> = {};

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
		 * Stamp Asset-level offer mirror fields from linked Template Offers.
		 *
		 * Webflow and Whalesync consume scalar fields on Assets, while the dashboard keeps
		 * the normalized offer records in linked tables. This bridge keeps the CMS-facing
		 * surface simple and avoids relying on Airtable rollups that cannot be created via
		 * the metadata API.
		 */
		async syncTemplateOfferMirrors(
			assetId: string,
			additionalOfferIds: string[] = []
		): Promise<Asset | null> {
			try {
				const assetRecord = await base(TABLES.ASSETS).find(assetId);
				const offerIds = Array.from(
					new Set([
						...linkedRecordIds(assetRecord.fields['🎟️Template Offers']),
						...additionalOfferIds.filter((id) => /^rec[A-Za-z0-9]+$/.test(id))
					])
				);

				const offerRecords = (
					await Promise.all(
						offerIds.map(async (offerId) => {
							try {
								return await base(TABLES.TEMPLATE_OFFERS).find(offerId);
							} catch {
								return null;
							}
						})
					)
				).filter((record): record is Airtable.Record<Airtable.FieldSet> => Boolean(record));

				const activeOffer = selectActiveTemplateOffer(offerRecords);
				const existingRecoveryOfferUsed =
					firstBoolean(
						assetRecord.fields['✅Recovery Offer Used (🏗️ only)'],
						assetRecord.fields['Recovery Offer Used'],
						assetRecord.fields['recovery_offer_used']
					) ?? false;
				const recoveryOfferUsed =
					existingRecoveryOfferUsed || offerRecords.some((record) => isRecoveryTemplateOffer(record));

				let generatedAt: string | null = null;
				if (activeOffer) {
					const fulfillmentLinkId = linkedRecordIds(activeOffer.fields['🔗Fulfillment Link'])[0];
					if (fulfillmentLinkId) {
						try {
							const fulfillmentRecord = await base(TABLES.TEMPLATE_FULFILLMENT_LINKS).find(
								fulfillmentLinkId
							);
							generatedAt =
								firstString(fulfillmentRecord.fields['📅Generated At (future sync)']) ||
								firstString(fulfillmentRecord.fields['📅Generated At']) ||
								null;
						} catch {
							generatedAt = null;
						}
					}
				}

				const records = (await base(TABLES.ASSETS).update([
					{
						id: assetId,
						fields: buildTemplateOfferMirrorFields(
							activeOffer,
							recoveryOfferUsed,
							generatedAt
						) as Airtable.FieldSet
					}
				])) as Airtable.Record<Airtable.FieldSet>[];

				return mapAssetRecord(records[0]);
			} catch (err) {
				console.error('[Airtable] Error syncing template offer mirror fields:', err);
				return null;
			}
		},

		/**
		 * Create a creator-submitted limited-offer request for a template.
		 *
		 * Guardrail-approved offers immediately sync Asset-level mirror fields. Archive/delist
		 * outcomes stay pending until marketplace review approves them.
		 */
		async createTemplateOfferRequest(
			assetId: string,
			input: TemplateOfferRequestInput
		): Promise<TemplateOfferRequestResult | null> {
			const asset = await this.getAsset(assetId);
			if (!asset || asset.type !== 'Template') {
				return null;
			}
			if (isRecoveryOfferStrategy(input.offerStrategy) && asset.recoveryOfferUsed) {
				return null;
			}

			const normalizedLabel = input.offerLabel.trim() || 'Limited offer';
			const offerName = `${asset.name || assetId} · ${normalizedLabel}`;
			const submittedAt = new Date().toISOString();
			const startsAt = input.startsAt || submittedAt;
			const pruneReviewAt = addDaysIso(input.endsAt, 7);
			const marketplacePrice = asset.priceAmount ?? parseCurrencyAmount(asset.priceString);
			const approvalStatus = approvalStatusForPostOfferAction(input.postOfferAction);
			const notes = [
				`Creator email: ${input.creatorEmail}`,
				`Submitted from Asset Dashboard: ${submittedAt}`,
				`Post-offer action: ${input.postOfferAction}`,
				input.visibilityTermsAcceptedAt
					? `Visibility terms accepted: ${input.visibilityTermsAcceptedAt}`
					: '',
				input.notes?.trim() ? `Creator notes: ${input.notes.trim()}` : '',
				approvalStatus === 'Approved'
					? 'Offer passed creator self-service guardrails. Public active-offer mirror fields still update through the offer lifecycle sync.'
					: 'Archive or delist outcomes require marketplace review before public active-offer mirror fields change.'
			]
				.filter(Boolean)
				.join('\n');

			try {
				const fulfillmentRecords = (await base(TABLES.TEMPLATE_FULFILLMENT_LINKS).create([
					{
						fields: {
							Name: offerName,
							'👛Asset': [assetId],
							'🔗Fulfillment URL': input.fulfillmentUrl,
							'⚙️Status': 'Active',
							'⚙️Source': 'Creator submitted',
							'📅Last Checked At': submittedAt,
							'📝Notes': notes
						} as Airtable.FieldSet
					}
				])) as Airtable.Record<Airtable.FieldSet>[];

				const fulfillmentLinkId = fulfillmentRecords[0].id;

				const offerFields: Record<string, AirtableWritableValue | string[]> = {
					Name: offerName,
					'👛Asset': [assetId],
					'🔗Fulfillment Link': [fulfillmentLinkId],
					'⚙️Approval Status': approvalStatus,
					'⚙️Offer Mode': 'Fulfillment link',
					'⚙️Offer Strategy': input.offerStrategy,
					'⚙️Post-Offer Action': input.postOfferAction,
					'👁️Visibility': 'Detail only',
					'🏷️Offer Label': normalizedLabel,
					'💲Offer Price': input.offerPrice,
					'🔗Public CTA URL': input.fulfillmentUrl,
					'📅Starts At': startsAt,
					'📅Ends At': input.endsAt,
					'📅Prune Review At': pruneReviewAt,
					'✅Terms Accepted At': input.termsAcceptedAt,
					'📝Notes': notes
				};

				if (marketplacePrice !== undefined) {
					offerFields['💲Marketplace Price'] = marketplacePrice;
				}

				const offerRecords = (await base(TABLES.TEMPLATE_OFFERS).create([
					{
						fields: offerFields as Airtable.FieldSet
					}
				])) as Airtable.Record<Airtable.FieldSet>[];

				if (approvalStatus === 'Approved') {
					await this.syncTemplateOfferMirrors(assetId, [offerRecords[0].id]);
				}

				return {
					fulfillmentLinkId,
					offerId: offerRecords[0].id,
					approvalStatus
				};
			} catch (err) {
				console.error('[Airtable] Error creating template offer request:', err);
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
				const records = (await base(TABLES.ASSETS).update([
					{ id, fields: fields as Airtable.FieldSet }
				])) as Airtable.Record<Airtable.FieldSet>[];
				return mapAssetRecord(records[0]);
			} catch {
				return null;
			}
		},

		/**
		 * Update the template search visibility policy field used by marketplace search sync.
		 */
		async updateTemplateSearchVisibility(
			id: string,
			searchVisibility: string
		): Promise<Asset | null> {
			try {
				const records = (await base(TABLES.ASSETS).update([
					{
						id,
						fields: {
							'👁️Search Visibility (🏗️ only)': searchVisibility
						} as Airtable.FieldSet
					}
				])) as Airtable.Record<Airtable.FieldSet>[];
				return mapAssetRecord(records[0]);
			} catch (err) {
				console.error('[Airtable] Error updating template search visibility:', err);
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
				const records = (await base(TABLES.ASSETS).update([
					{ id, fields: fields as Airtable.FieldSet }
				])) as Airtable.Record<Airtable.FieldSet>[];
				debugLog('[Airtable] Update successful, record id:', records[0].id);
				return mapAssetRecord(records[0]);
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
			const escapedAssetId = escapeAirtableString(assetId);

			// 1) Fast path: if the asset appears in the user's dashboard list, they should be able to fetch it.
			// This uses the same formula shape as getAssetsByEmail(), scoped to a single record.
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
						RECORD_ID() = '${escapeAirtableString(assetId)}',
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
					const matched = value.some((e) => String(e).toLowerCase().includes(normalizedEmail));
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

			// Formula fallback (robust to Airtable field types / lookup vs string)
			const formula = `AND(
				RECORD_ID() = '${escapeAirtableString(assetId)}',
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
					RECORD_ID() = '${escapeAirtableString(assetId)}',
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
			const escapedName = escapeAirtableString(name.trim());
			let formula = `LOWER({Name}) = LOWER('${escapedName}')`;

			if (excludeId) {
				const escapedId = escapeAirtableString(excludeId);
				formula = `AND(${formula}, RECORD_ID() != '${escapedId}')`;
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
				
				// Single-line formula to avoid any whitespace issues
				const formula = `OR(FIND("${email}", ARRAYJOIN({📧Email}, ",")) > 0, FIND("${email}", ARRAYJOIN({📧WF Account Email}, ",")) > 0, FIND("${email}", ARRAYJOIN({📧Emails}, ",")) > 0)`;
				
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
			const escapedEmail = escapeAirtableString(creatorEmail);
			const records = await base(TABLES.API_KEYS)
				.select({
					filterByFormula: `{Creator Email} = '${escapedEmail}'`,
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
							filterByFormula: `{fldknoYakli2sqznT} = '${escapeAirtableString(asset.id)}'`,
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
						filterByFormula: `{Asset ID} = '${escapeAirtableString(assetId)}'`,
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
