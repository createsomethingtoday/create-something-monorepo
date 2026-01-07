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
	ASSET_VERSIONS: 'tblAssetVersionHistory'
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

// ==================== TYPES ====================

export interface Asset {
	id: string;
	name: string;
	description?: string;
	descriptionShort?: string;
	descriptionLongHtml?: string;
	type: 'Template' | 'Library' | 'App';
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
	qualityScore?: number;
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
		 * CRITICAL: Uses two-step process to trigger Airtable automation:
		 * 1. Clear old token (set to null)
		 * 2. Set new token (transition from null → value triggers automation)
		 *
		 * The Airtable automation watches for this field transition to send the email.
		 */
		async setVerificationToken(userId: string, token: string, expirationTime: Date): Promise<void> {
			// Step 1: Clear old token (required to trigger automation on next update)
			await base(TABLES.USERS).update([{
				id: userId,
				fields: {
					[FIELDS.VERIFICATION_TOKEN]: null as unknown as string,
					[FIELDS.TOKEN_EXPIRATION]: null as unknown as string
				}
			}]);

			// Step 2: Set new token (this transition triggers the Airtable automation)
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
				const cleanedStatus = rawStatus
					.replace(/^\d*️⃣/u, '')
					.replace(/🆕/u, '')
					.replace(/📅/u, '')
					.replace(/🚀/u, '')
					.replace(/☠️/u, '')
					.replace(/❌/u, '')
					.trim() as Asset['status'];

				return {
					id: record.id,
					name: record.fields['Name'] as string || '',
					description: record.fields['📝Description'] as string || '',
					type: 'Template' as Asset['type'],
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
		 * Get single asset by ID.
		 */
		async getAsset(id: string): Promise<Asset | null> {
			try {
				const record = await base(TABLES.ASSETS).find(id);
				const carouselImages = (record.fields['🖼️Carousel Images'] as { url: string }[] | undefined)?.map(img => img.url) || [];
				const rawStatus = record.fields['🚀Marketplace Status'] as string || 'Draft';
				const cleanedStatus = rawStatus.replace(/[^\w\s]/g, '').trim() as Asset['status'];

				return {
					id: record.id,
					name: record.fields['Name'] as string || '',
					description: record.fields['📝Description'] as string || '',
					descriptionShort: record.fields['ℹ️Description (Short)'] as string || '',
					descriptionLongHtml: record.fields['ℹ️Description (Long).html'] as string || '',
					type: record.fields['🆎Type'] as Asset['type'] || 'Template',
					status: cleanedStatus,
					thumbnailUrl: (record.fields['🖼️Thumbnail Image'] as { url: string }[] | undefined)?.[0]?.url,
					secondaryThumbnailUrl: (record.fields['fldzKxNCXcgCnEwxu'] as { url: string }[] | undefined)?.[0]?.url,
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
					qualityScore: record.fields['🖌️Initial Quality Score'] as number,
					priceString: record.fields['🥞💲Template Price String (🏗️ only)'] as string
				};
			} catch {
				return null;
			}
		},

		/**
		 * Update an asset (text fields only).
		 */
		async updateAsset(id: string, data: Partial<Pick<Asset, 'name' | 'description' | 'descriptionShort' | 'websiteUrl' | 'previewUrl'>>): Promise<Asset | null> {
			const fields: Record<string, string> = {};

			if (data.name !== undefined) fields['Name'] = data.name;
			if (data.description !== undefined) fields['📝Description'] = data.description;
			if (data.descriptionShort !== undefined) fields['ℹ️Description (Short)'] = data.descriptionShort;
			if (data.websiteUrl !== undefined) fields['🔗Website URL'] = data.websiteUrl;
			if (data.previewUrl !== undefined) fields['🔗Preview Site URL'] = data.previewUrl;

			if (Object.keys(fields).length === 0) {
				return null;
			}

			try {
				const records = await base(TABLES.ASSETS).update([{ id, fields }]);
				const record = records[0];
				const rawStatus = record.fields['🚀Marketplace Status'] as string || 'Draft';
				const cleanedStatus = rawStatus.replace(/[^\w\s]/g, '').trim() as Asset['status'];

				return {
					id: record.id,
					name: record.fields['Name'] as string || '',
					description: record.fields['📝Description'] as string || '',
					descriptionShort: record.fields['ℹ️Description (Short)'] as string || '',
					type: record.fields['🆎Type'] as Asset['type'] || 'Template',
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
				websiteUrl?: string;
				previewUrl?: string;
				thumbnailUrl?: string | null;
				secondaryThumbnailUrl?: string | null;
				carouselImages?: string[];
			}
		): Promise<Asset | null> {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const fields: Record<string, any> = {};

			// Text fields
			if (data.name !== undefined) fields['Name'] = data.name;
			if (data.description !== undefined) fields['📝Description'] = data.description;
			if (data.descriptionShort !== undefined) fields['ℹ️Description (Short)'] = data.descriptionShort;
			if (data.websiteUrl !== undefined) fields['🔗Website URL'] = data.websiteUrl;
			if (data.previewUrl !== undefined) fields['🔗Preview Site URL'] = data.previewUrl;

			// Image fields - Airtable expects array of { url: string }
			if (data.thumbnailUrl !== undefined) {
				fields['🖼️Thumbnail Image'] = data.thumbnailUrl
					? [{ url: data.thumbnailUrl }]
					: [];
			}
			if (data.secondaryThumbnailUrl !== undefined) {
				fields['fldzKxNCXcgCnEwxu'] = data.secondaryThumbnailUrl
					? [{ url: data.secondaryThumbnailUrl }]
					: [];
			}
			if (data.carouselImages !== undefined) {
				fields['🖼️Carousel Images'] = data.carouselImages.map(url => ({ url }));
			}

			if (Object.keys(fields).length === 0) {
				return null;
			}

			try {
				const records = await base(TABLES.ASSETS).update([{ id, fields }]);
				const record = records[0];
				const rawStatus = record.fields['🚀Marketplace Status'] as string || 'Draft';
				const cleanedStatus = rawStatus.replace(/[^\w\s]/g, '').trim() as Asset['status'];
				const carouselImages = (record.fields['🖼️Carousel Images'] as { url: string }[] | undefined)?.map(img => img.url) || [];

				return {
					id: record.id,
					name: record.fields['Name'] as string || '',
					description: record.fields['📝Description'] as string || '',
					descriptionShort: record.fields['ℹ️Description (Short)'] as string || '',
					descriptionLongHtml: record.fields['ℹ️Description (Long).html'] as string || '',
					type: record.fields['🆎Type'] as Asset['type'] || 'Template',
					status: cleanedStatus,
					thumbnailUrl: (record.fields['🖼️Thumbnail Image'] as { url: string }[] | undefined)?.[0]?.url,
					secondaryThumbnailUrl: (record.fields['fldzKxNCXcgCnEwxu'] as { url: string }[] | undefined)?.[0]?.url,
					carouselImages,
					websiteUrl: record.fields['🔗Website URL'] as string,
					previewUrl: record.fields['🔗Preview Site URL'] as string,
					marketplaceUrl: record.fields['🔗Marketplace URL'] as string
				};
			} catch (err) {
				console.error('Error updating asset with images:', err);
				return null;
			}
		},

		/**
		 * Verify asset ownership by email.
		 * Matches the original Next.js logic which checks multiple email fields.
		 */
		async verifyAssetOwnership(assetId: string, email: string): Promise<boolean> {
			try {
				const record = await base(TABLES.ASSETS).find(assetId);
				const normalizedEmail = email.toLowerCase();

				// Check all possible creator email fields (matching original Next.js implementation)
				const emailFields = [
					'🎨📧 Creator Email',
					'🎨📧 Creator WF Account Email',
					'📧Emails (from 🎨Creator)'
				];

				for (const field of emailFields) {
					const fieldValue = record.fields[field];
					if (!fieldValue) continue;

					// Handle array format (linked records)
					if (Array.isArray(fieldValue)) {
						if (fieldValue.some(e => String(e).toLowerCase().includes(normalizedEmail))) {
							return true;
						}
					}
					// Handle string format
					else if (typeof fieldValue === 'string') {
						if (fieldValue.toLowerCase().includes(normalizedEmail)) {
							return true;
						}
					}
				}

				return false;
			} catch {
				return false;
			}
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
		 */
		async getCreatorByEmail(email: string): Promise<Creator | null> {
			const escapedEmail = escapeAirtableString(email);
			const records = await base(TABLES.CREATORS)
				.select({
					filterByFormula: `OR(
						FIND('${escapedEmail}', LOWER({📧Emails})),
						{📧Emails} = '${escapedEmail}'
					)`
				})
				.firstPage();

			if (records.length === 0) return null;

			const record = records[0];
			return {
				id: record.id,
				name: record.fields['🎨Name'] as string || '',
				email: email,
				emails: (record.fields['📧Emails'] as string)?.split(',').map(e => e.trim()),
				avatarUrl: (record.fields['🖼️Avatar'] as { url: string }[] | undefined)?.[0]?.url,
				biography: record.fields['📝Biography'] as string,
				legalName: record.fields['📜Legal Name'] as string
			};
		},

		/**
		 * Update creator profile.
		 */
		async updateCreator(id: string, data: Partial<Pick<Creator, 'name' | 'biography' | 'legalName'>>): Promise<Creator | null> {
			const fields: Record<string, string> = {};

			if (data.name !== undefined) fields['🎨Name'] = data.name;
			if (data.biography !== undefined) fields['📝Biography'] = data.biography;
			if (data.legalName !== undefined) fields['📜Legal Name'] = data.legalName;

			if (Object.keys(fields).length === 0) {
				return null;
			}

			try {
				const records = await base(TABLES.CREATORS).update([{ id, fields }]);
				const record = records[0];
				return {
					id: record.id,
					name: record.fields['🎨Name'] as string || '',
					email: (record.fields['📧Emails'] as string)?.split(',')[0]?.trim() || '',
					emails: (record.fields['📧Emails'] as string)?.split(',').map(e => e.trim()),
					avatarUrl: (record.fields['🖼️Avatar'] as { url: string }[] | undefined)?.[0]?.url,
					biography: record.fields['📝Biography'] as string,
					legalName: record.fields['📜Legal Name'] as string
				};
			} catch {
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
		 * Get leaderboard data (top 50 templates by sales).
		 */
		async getLeaderboard(): Promise<Array<{
			templateName: string;
			category: string;
			creatorEmail: string;
			totalSales30d: number;
			totalRevenue30d: number;
			avgRevenuePerSale: number;
			salesRank: number;
			revenueRank: number;
		}>> {
			const records = await base(TABLES.LEADERBOARD)
				.select({
					view: VIEWS.LEADERBOARD,
					maxRecords: 50,
					sort: [{ field: 'SALES_RANK', direction: 'asc' }]
				})
				.all();

			return records.map(record => ({
				templateName: record.fields['TEMPLATE_NAME'] as string || '',
				category: record.fields['CATEGORY'] as string || '',
				creatorEmail: record.fields['CREATOR_EMAIL'] as string || '',
				totalSales30d: Number(record.fields['TOTAL_SALES_30D']) || 0,
				totalRevenue30d: Number(record.fields['TOTAL_REVENUE_30D']) || 0,
				avgRevenuePerSale: Number(record.fields['AVG_REVENUE_PER_SALE']) || 0,
				salesRank: Number(record.fields['SALES_RANK']) || 0,
				revenueRank: Number(record.fields['REVENUE_RANK']) || 0
			}));
		},

		/**
		 * Get category performance data.
		 */
		async getCategoryPerformance(): Promise<Array<{
			category: string;
			subcategory: string;
			templatesInSubcategory: number;
			totalSales30d: number;
			avgRevenuePerTemplate: number;
			revenueRank: number;
		}>> {
			const records = await base(TABLES.CATEGORY_PERFORMANCE)
				.select({
					view: VIEWS.CATEGORY_PERFORMANCE,
					sort: [{ field: 'REVENUE_RANK', direction: 'asc' }]
				})
				.all();

			return records.map(record => ({
				category: record.fields['CATEGORY'] as string || '',
				subcategory: record.fields['SUBCATEGORY'] as string || '',
				templatesInSubcategory: Number(record.fields['TEMPLATES_IN_SUBCATEGORY']) || 0,
				totalSales30d: Number(record.fields['TOTAL_SALES_30D']) || 0,
				avgRevenuePerTemplate: Number(record.fields['AVG_REVENUE_PER_TEMPLATE']) || 0,
				revenueRank: Number(record.fields['REVENUE_RANK']) || 0
			}));
		},

		// ==================== ASSET VERSIONS ====================

		/**
		 * Create a new version of an asset.
		 * Captures current state as a snapshot before any changes are made.
		 */
		async createAssetVersion(
			assetId: string,
			createdBy: string,
			changes: string
		): Promise<AssetVersion | null> {
			try {
				// Get current asset state
				const asset = await this.getAsset(assetId);
				if (!asset) return null;

				// Get the next version number
				const existingVersions = await base(TABLES.ASSET_VERSIONS)
					.select({
						filterByFormula: `{Asset ID} = '${escapeAirtableString(assetId)}'`,
						sort: [{ field: 'Version Number', direction: 'desc' }],
						maxRecords: 1
					})
					.firstPage();

				const nextVersion = existingVersions.length > 0
					? (Number(existingVersions[0].fields['Version Number']) || 0) + 1
					: 1;

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

				// Create version record
				const records = await base(TABLES.ASSET_VERSIONS).create([{
					fields: {
						'Asset ID': assetId,
						'Version Number': nextVersion,
						'Created By': createdBy,
						'Changes': changes,
						'Snapshot': JSON.stringify(snapshot),
						'Created At': new Date().toISOString()
					}
				}]);

				const record = records[0];
				return {
					id: record.id,
					assetId: record.fields['Asset ID'] as string,
					versionNumber: record.fields['Version Number'] as number,
					createdAt: record.fields['Created At'] as string,
					createdBy: record.fields['Created By'] as string,
					changes: record.fields['Changes'] as string,
					snapshot: JSON.parse(record.fields['Snapshot'] as string)
				};
			} catch (err) {
				console.error('Error creating asset version:', err);
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
