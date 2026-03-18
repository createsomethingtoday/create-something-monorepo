import Airtable from 'airtable';
import { randomBytes, createHash } from 'node:crypto';

// Airtable table IDs
const TABLES = {
	USERS: 'tbldQNGszIyOjt9a1',
	CREATORS: 'tbljt0plqxdMARZXb',
	ASSETS: 'tblRwzpWoLgE9MrUm',
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
export function cleanMarketplaceStatus(rawStatus: string): string {
	return rawStatus
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
}

export interface Creator {
	id: string;
	name: string;
	email: string;
	emails?: string[];
	avatarUrl?: string;
	biography?: string;
	legalName?: string;
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
	snapshot: {
		name?: string;
		description?: string;
		descriptionShort?: string;
		websiteUrl?: string;
		previewUrl?: string;
		thumbnailUrl?: string;
		secondaryThumbnailUrl?: string;
		carouselImages?: string[];
	};
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
			const escapedEmail = escapeAirtableString(email.toLowerCase());
			const formula = `AND(FIND('${escapedEmail}', LOWER({📧Emails (from 🎨Creator)})), {🆎Type} = 'Template🏗️')`;

			const records = await base(TABLES.ASSETS)
				.select({
					view: VIEWS.ASSETS,
					filterByFormula: formula
				})
				.all();

			return records.map(record => {
				const rawStatus = record.fields['🚀Marketplace Status'] as string || 'Draft';
				const cleanedStatus = cleanMarketplaceStatus(rawStatus) as Asset['status'];
				const category = extractPrimaryCategory(record.fields);
				const subcategory = extractPrimarySubcategory(record.fields);

				return {
					id: record.id,
					name: record.fields['Name'] as string || '',
					description: record.fields['📝Description'] as string || '',
					type: 'Template' as Asset['type'],
					category,
					subcategory,
					status: cleanedStatus || 'Draft',
					thumbnailUrl: (record.fields['🖼️Thumbnail Image'] as { url: string }[] | undefined)?.[0]?.url,
					websiteUrl: record.fields['🔗Website URL'] as string,
					marketplaceUrl: record.fields['🔗Marketplace URL'] as string,
					submittedDate: record.fields['📅Submitted Date'] as string,
					publishedDate: record.fields['📅Published Date'] as string,
					uniqueViewers: record.fields['📋 Unique Viewers'] as number,
					cumulativePurchases: record.fields['📋 Cumulative Purchases'] as number,
					cumulativeRevenue: record.fields['📋 Cumulative Revenue'] as number
				};
			});
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
				const carouselImages = (record.fields['🖼️Carousel Images'] as { url: string }[] | undefined)?.map(img => img.url) || [];
				const rawStatus = record.fields['🚀Marketplace Status'] as string || 'Draft';
				const cleanedStatus = cleanMarketplaceStatus(rawStatus) as Asset['status'];
				const category = extractPrimaryCategory(record.fields);
				const subcategory = extractPrimarySubcategory(record.fields);

				// Read all secondary thumbnails from Airtable (supports multiple attachments)
				const secondaryThumbnailImages = record.fields['🖼️Thumbnail Image (Secondary)'] as { url: string }[] | undefined;
				const secondaryThumbnails = secondaryThumbnailImages?.map(img => img.url) || [];

				return {
					id: record.id,
					name: record.fields['Name'] as string || '',
					description: record.fields['📝Description'] as string || '',
					descriptionShort: record.fields['ℹ️Description (Short)'] as string || '',
					descriptionLongHtml: record.fields['ℹ️Description (Long).html'] as string || '',
					type: record.fields['🆎Type'] as Asset['type'] || 'Template',
					category,
					subcategory,
					status: cleanedStatus,
					thumbnailUrl: (record.fields['🖼️Thumbnail Image'] as { url: string }[] | undefined)?.[0]?.url,
					// Return both single URL (backward compat) and full array
					secondaryThumbnailUrl: secondaryThumbnails[0],
					secondaryThumbnails,
					carouselImages,
					websiteUrl: record.fields['🔗Website URL'] as string,
					previewUrl: record.fields['🔗Preview Site URL'] as string || record.fields['fldROrXCnuZyKNCxW'] as string,
					marketplaceUrl: record.fields['🔗Marketplace URL'] as string,
					submittedDate: record.fields['📅Submitted Date'] as string,
					publishedDate: record.fields['📅Published Date'] as string,
					decisionDate: record.fields['🚀📅Decision Date'] as string,
					uniqueViewers: record.fields['📋 Unique Viewers'] as number,
					cumulativePurchases: record.fields['📋 Cumulative Purchases'] as number,
					cumulativeRevenue: record.fields['📋 Cumulative Revenue'] as number,
					latestReviewStatus: record.fields['📝Latest Review Status'] as string,
					latestReviewDate: record.fields['📝Latest Review Date'] as string,
					latestReviewFeedback: (record.fields['🖌️📝Latest Review Feedback'] as string[] | undefined)?.[0],
					rejectionFeedback: record.fields['🚩Rejection Feedback'] as string || record.fields['🖌Rejection Feedback'] as string,
					rejectionFeedbackHtml: record.fields['🚩Rejection Feedback.html'] as string || record.fields['🖌Rejection Feedback.html'] as string,
					qualityScore: record.fields['🖌️Initial Quality Score'] as string,
					priceString: record.fields['🥞💲Template Price String (🏗️ only)'] as string
				};
			} catch {
				return null;
			}
		},

		/**
		 * Update an asset (text fields only).
		 */
		async updateAsset(
			id: string,
			data: Partial<Pick<Asset, 'name' | 'description' | 'descriptionShort' | 'descriptionLongHtml' | 'websiteUrl' | 'previewUrl'>>
		): Promise<Asset | null> {
			const fields: Record<string, string> = {};

			if (data.name !== undefined) fields['Name'] = data.name;
			if (data.description !== undefined) fields['📝Description'] = data.description;
			if (data.descriptionShort !== undefined) fields['ℹ️Description (Short)'] = data.descriptionShort;
			if (data.descriptionLongHtml !== undefined) fields['ℹ️Description (Long).html'] = data.descriptionLongHtml;
			if (data.websiteUrl !== undefined) fields['🔗Website URL'] = data.websiteUrl;
			if (data.previewUrl !== undefined) fields['🔗Preview Site URL'] = data.previewUrl;

			if (Object.keys(fields).length === 0) {
				return null;
			}

			try {
				const records = await base(TABLES.ASSETS).update([{ id, fields }]);
				const record = records[0];
				const rawStatus = record.fields['🚀Marketplace Status'] as string || 'Draft';
				const cleanedStatus = cleanMarketplaceStatus(rawStatus) as Asset['status'];
				const category = extractPrimaryCategory(record.fields);
				const subcategory = extractPrimarySubcategory(record.fields);

				return {
					id: record.id,
					name: record.fields['Name'] as string || '',
					description: record.fields['📝Description'] as string || '',
					descriptionShort: record.fields['ℹ️Description (Short)'] as string || '',
					descriptionLongHtml: record.fields['ℹ️Description (Long).html'] as string || '',
					type: record.fields['🆎Type'] as Asset['type'] || 'Template',
					category,
					subcategory,
					status: cleanedStatus,
					thumbnailUrl: (record.fields['🖼️Thumbnail Image'] as { url: string }[] | undefined)?.[0]?.url,
					websiteUrl: record.fields['🔗Website URL'] as string,
					previewUrl: record.fields['🔗Preview Site URL'] as string,
					marketplaceUrl: record.fields['🔗Marketplace URL'] as string
				};
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
			data: {
				name?: string;
				description?: string;
				descriptionShort?: string;
				descriptionLongHtml?: string;
				websiteUrl?: string;
				previewUrl?: string;
				thumbnailUrl?: string | null;
				secondaryThumbnailUrl?: string | null;
				secondaryThumbnails?: string[]; // Support multiple secondary thumbnails
				carouselImages?: string[];
			}
		): Promise<Asset | null> {
			debugLog('[Airtable] updateAssetWithImages called for id:', id);
			debugLog('[Airtable] Input data:', JSON.stringify({
				...data,
				thumbnailUrl: data.thumbnailUrl ? `${data.thumbnailUrl.substring(0, 80)}...` : data.thumbnailUrl
			}));
			
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const fields: Record<string, any> = {};

			// Text fields
			if (data.name !== undefined) fields['Name'] = data.name;
			if (data.description !== undefined) fields['📝Description'] = data.description;
			if (data.descriptionShort !== undefined) fields['ℹ️Description (Short)'] = data.descriptionShort;
			if (data.descriptionLongHtml !== undefined) fields['ℹ️Description (Long).html'] = data.descriptionLongHtml;
			if (data.websiteUrl !== undefined) fields['🔗Website URL'] = data.websiteUrl;
			if (data.previewUrl !== undefined) fields['🔗Preview Site URL'] = data.previewUrl;

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
				const records = await base(TABLES.ASSETS).update([{ id, fields }]);
				debugLog('[Airtable] Update successful, record id:', records[0].id);
				const record = records[0];
				const rawStatus = record.fields['🚀Marketplace Status'] as string || 'Draft';
				const cleanedStatus = cleanMarketplaceStatus(rawStatus) as Asset['status'];
				const category = extractPrimaryCategory(record.fields);
				const subcategory = extractPrimarySubcategory(record.fields);
				const carouselImages = (record.fields['🖼️Carousel Images'] as { url: string }[] | undefined)?.map(img => img.url) || [];
				
				// Read all secondary thumbnails from returned record
				const secondaryThumbnailImages = record.fields['🖼️Thumbnail Image (Secondary)'] as { url: string }[] | undefined;
				const secondaryThumbnails = secondaryThumbnailImages?.map(img => img.url) || [];

				return {
					id: record.id,
					name: record.fields['Name'] as string || '',
					description: record.fields['📝Description'] as string || '',
					descriptionShort: record.fields['ℹ️Description (Short)'] as string || '',
					descriptionLongHtml: record.fields['ℹ️Description (Long).html'] as string || '',
					type: record.fields['🆎Type'] as Asset['type'] || 'Template',
					category,
					subcategory,
					status: cleanedStatus,
					thumbnailUrl: (record.fields['🖼️Thumbnail Image'] as { url: string }[] | undefined)?.[0]?.url,
					// Return both single URL (backward compat) and full array
					secondaryThumbnailUrl: secondaryThumbnails[0],
					secondaryThumbnails,
					carouselImages,
					websiteUrl: record.fields['🔗Website URL'] as string,
					previewUrl: record.fields['🔗Preview Site URL'] as string,
					marketplaceUrl: record.fields['🔗Marketplace URL'] as string
				};
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
			const escapedEmail = escapeAirtableString(normalizedEmail);
			const escapedAssetId = escapeAirtableString(assetId);

			// 1) Fast path: if the asset appears in the user's dashboard list, they should be able to fetch it.
			// This uses the same field + formula shape as getAssetsByEmail(), scoped to a single record.
			try {
				const dashboardLikeFormula = `AND(
					RECORD_ID() = '${escapedAssetId}',
					FIND('${escapedEmail}', LOWER({📧Emails (from 🎨Creator)}))
				)`;
				const dashboardMatches = await base(TABLES.ASSETS)
					.select({ filterByFormula: dashboardLikeFormula, maxRecords: 1 })
					.firstPage();
				if (dashboardMatches.length > 0) return true;
			} catch {
				// continue to next checks
			}

			// 2) Field-based check (best-effort): works when the record can be fetched and the email fields are present.
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
						if (fieldValue.some((e) => String(e).toLowerCase().includes(normalizedEmail))) return true;
					} else if (typeof fieldValue === 'string') {
						if (fieldValue.toLowerCase().includes(normalizedEmail)) return true;
					}
				}
			} catch {
				// continue to next checks
			}

			// 3) Robust formula check (best-effort): handles mixed Airtable field types.
			try {
				const formula = `AND(
					RECORD_ID() = '${escapedAssetId}',
					OR(
						FIND('${escapedEmail}', IFERROR(LOWER(ARRAYJOIN({🎨📧 Creator Email}, ",")), IFERROR(LOWER({🎨📧 Creator Email}), ""))) > 0,
						FIND('${escapedEmail}', IFERROR(LOWER(ARRAYJOIN({🎨📧 Creator WF Account Email}, ",")), IFERROR(LOWER({🎨📧 Creator WF Account Email}), ""))) > 0,
						FIND('${escapedEmail}', IFERROR(LOWER(ARRAYJOIN({📧Emails (from 🎨Creator)}, ",")), IFERROR(LOWER({📧Emails (from 🎨Creator)}), ""))) > 0
					)
				)`;
				const matches = await base(TABLES.ASSETS)
					.select({ filterByFormula: formula, maxRecords: 1 })
					.firstPage();
				if (matches.length > 0) return true;
			} catch {
				// fall through
			}

			return false;
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
			const escapedEmail = escapeAirtableString(normalizedEmail);
			const formula = `AND(
				RECORD_ID() = '${escapeAirtableString(assetId)}',
				OR(
					FIND('${escapedEmail}', IFERROR(LOWER(ARRAYJOIN({🎨📧 Creator Email}, ",")), IFERROR(LOWER({🎨📧 Creator Email}), ""))) > 0,
					FIND('${escapedEmail}', IFERROR(LOWER(ARRAYJOIN({🎨📧 Creator WF Account Email}, ",")), IFERROR(LOWER({🎨📧 Creator WF Account Email}), ""))) > 0,
					FIND('${escapedEmail}', IFERROR(LOWER(ARRAYJOIN({📧Emails (from 🎨Creator)}, ",")), IFERROR(LOWER({📧Emails (from 🎨Creator)}), ""))) > 0
				)
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
					FIND('${escapedEmail}', LOWER({📧Emails (from 🎨Creator)}))
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
					legalName: (record.fields['ℹ️Legal Name'] as string) // Match original: 'ℹ️Legal Name' not '📜Legal Name'
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
		async updateCreator(id: string, data: Partial<Pick<Creator, 'name' | 'biography' | 'legalName' | 'avatarUrl'>>): Promise<Creator | null> {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const fields: Record<string, any> = {};

			// Match original Next.js field names
			if (data.name !== undefined) fields['Name'] = data.name;
			if (data.biography !== undefined) fields['ℹ️Biography'] = data.biography;
			if (data.legalName !== undefined) fields['ℹ️Legal Name'] = data.legalName;
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
					legalName: (record.fields['ℹ️Legal Name'] as string) // Match original field name
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
					createdAt: r.fields['Created At'] as string,
					expiresAt: expiresAt,
					lastUsedAt: r.fields['Last Used At'] as string | undefined,
					scopes: (r.fields['Scopes'] as string || '').split(',').filter(Boolean),
					status: finalStatus
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
		 * Get leaderboard data (top 50 templates by sales).
		 */
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
			changes: Record<string, unknown> | string
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

				// Check if asset is "Upcoming" - don't create versions for upcoming assets
				// Matches v1 logic: pages/api/asset/createVersion/[id].js lines 50-57
				const cleanStatus = asset.status.replace(/^\d️⃣/u, '').replace(/🆕|🚀/gu, '').trim();
				if (cleanStatus === 'Upcoming') {
					debugLog('[Airtable] Asset is Upcoming, skipping version creation');
					return null;
				}

			// Get the next version number by counting existing versions
			// Matches v1 logic exactly: pages/api/asset/createVersion/[id].js lines 62-64
			debugLog('[Airtable] Querying existing versions...');
			const existingVersions = await base(TABLES.ASSET_VERSIONS)
				.select({
					filterByFormula: `{fldknoYakli2sqznT} = '${escapeAirtableString(assetId)}'`
				})
				.all();
			
			const nextVersion = existingVersions.length + 1;
			debugLog('[Airtable] Existing versions count:', existingVersions.length, '-> Next version:', nextVersion);

				// Create snapshot of current state
				const snapshot = {
					name: asset.name,
					description: asset.description,
					descriptionShort: asset.descriptionShort,
					websiteUrl: asset.websiteUrl,
					previewUrl: asset.previewUrl,
					thumbnailUrl: asset.thumbnailUrl,
					secondaryThumbnailUrl: asset.secondaryThumbnailUrl,
					carouselImages: asset.carouselImages
				};

				// For structured changes, check if there are significant changes
				// Matches v1 logic: pages/api/asset/createVersion/[id].js lines 90-98
				if (typeof changes === 'object') {
					const hasSignificantChanges = Object.keys(changes).some(key => 
						key === 'ℹ️Description (Short)' || 
						(key === 'fld43LxLHMZb2yF7F' && (changes[key] as { added?: unknown[] })?.added?.length) ||
						(key === 'fldzKxNCXcgCnEwxu' && (changes[key] as { added?: unknown[] })?.added?.length)
					);
					
					if (!hasSignificantChanges) {
						debugLog('[Airtable] No significant changes detected, skipping version creation');
						return null;
					}
				}

				// Create version record using field IDs from old dashboard
				// Matches exactly: pages/api/asset/createVersion/[id].js lines 101-107
				// IMPORTANT: Store changes in same format as v1 - just the structured changes object
				// The Airtable automation expects: {"fld43LxLHMZb2yF7F":{"added":[...],"removed":0},...}
				const changesJson = typeof changes === 'string' 
					? JSON.stringify({ changes, snapshot, createdBy })  // Legacy format for string changes
					: JSON.stringify(changes);  // V1 format - just the structured changes
				
				debugLog('[Airtable] Creating version record with fields:', {
					'fldemWilqCQcOCh5s': [assetId],
					'fldn2ImbgwKfCdWWA': nextVersion,
					'fldjYFJMGTerFYlol': 'Meta Update',
					'fldc999gbJ8LWWoTC': changesJson.substring(0, 100) + '...',
					'fldLEIZMEjZvH5n23': ['zendesk']
				});
				const records = await base(TABLES.ASSET_VERSIONS).create({
					'fldemWilqCQcOCh5s': [assetId], // Linked record to asset
					'fldn2ImbgwKfCdWWA': nextVersion, // Version number
					'fldjYFJMGTerFYlol': 'Meta Update', // Type
					'fldc999gbJ8LWWoTC': changesJson, // Changes JSON - matches v1 format
					'fldLEIZMEjZvH5n23': ['zendesk'] // Source - must match existing linked record
				});
				debugLog('[Airtable] Version record created:', records.id);

				const changesStr = typeof changes === 'string' ? changes : JSON.stringify(changes);
				return {
					id: records.id,
					assetId: assetId,
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

				return records.map(record => ({
					id: record.id,
					assetId: record.fields['Asset ID'] as string,
					versionNumber: record.fields['Version Number'] as number,
					createdAt: record.fields['Created At'] as string,
					createdBy: record.fields['Created By'] as string,
					changes: record.fields['Changes'] as string,
					snapshot: JSON.parse(record.fields['Snapshot'] as string)
				}));
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
				return {
					id: record.id,
					assetId: record.fields['Asset ID'] as string,
					versionNumber: record.fields['Version Number'] as number,
					createdAt: record.fields['Created At'] as string,
					createdBy: record.fields['Created By'] as string,
					changes: record.fields['Changes'] as string,
					snapshot: JSON.parse(record.fields['Snapshot'] as string)
				};
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
