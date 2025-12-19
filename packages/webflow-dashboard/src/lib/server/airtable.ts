import Airtable from 'airtable';
import type { Asset, Creator, ApiKey, RelatedAsset } from '$lib/types';
import { randomBytes, createHash } from 'node:crypto';

// Airtable table IDs
const TABLES = {
	USERS: 'tbldQNGszIyOjt9a1',
	CREATORS: 'tbljt0plqxdMARZXb',
	ASSETS: 'tblRwzpWoLgE9MrUm',
	API_KEYS: 'tblU5rI3WiQerozvX',
	TAGS: '🏷️Tags (Free Form)',
	CATEGORY_PERFORMANCE: 'tblDU1oUiobNfMQP9',
	LEADERBOARD: 'tblcXLVLYobhNmrg6'
} as const;

// Airtable view IDs
const VIEWS = {
	CATEGORY_PERFORMANCE: 'viw5EUGpK0xDMcBga',
	LEADERBOARD: 'viwEaYTAux1ADl5C5',
	SLA_OVER: 'viwPPsq6O9tKDg9oZ'
} as const;

// Airtable field IDs
const FIELDS = {
	VERIFICATION_TOKEN: 'fldI8NZzmJSEVly4D',
	TOKEN_EXPIRATION: 'fldbK6n1sooEQaoWg'
} as const;

interface AirtableEnv {
	AIRTABLE_API_KEY: string;
	AIRTABLE_BASE_ID: string;
}

/**
 * Escapes user input for safe use in Airtable formulas
 * Prevents formula injection attacks
 */
export function escapeAirtableString(input: string): string {
	if (typeof input !== 'string') {
		throw new Error('Input must be a string');
	}
	// Escape single quotes by doubling them (Airtable formula syntax)
	return input.replace(/'/g, "''");
}

/**
 * Validates email format
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
 * Validates UUID token format
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
 * Creates an Airtable client with typed methods
 */
export function getAirtableClient(env: AirtableEnv | undefined) {
	if (!env?.AIRTABLE_API_KEY || !env?.AIRTABLE_BASE_ID) {
		throw new Error('Airtable configuration missing');
	}

	const base = new Airtable({ apiKey: env.AIRTABLE_API_KEY }).base(env.AIRTABLE_BASE_ID);

	return {
		// ==================== AUTH ====================

		/**
		 * Find user by email for login
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
		 * Set verification token for user
		 * Uses two-step process to trigger Airtable automation:
		 * 1. Clear old token (set to null)
		 * 2. Set new token (transition from null → value triggers automation)
		 */
		async setVerificationToken(userId: string, token: string, expirationTime: Date): Promise<void> {
			// Step 1: Clear old token
			// Note: null is required to clear fields and trigger Airtable automation
			await base(TABLES.USERS).update([{
				id: userId,
				fields: {
					[FIELDS.VERIFICATION_TOKEN]: null as unknown as string,
					[FIELDS.TOKEN_EXPIRATION]: null as unknown as string
				}
			}]);

			// Step 2: Set new token (this transition triggers the Airtable automation to send email)
			await base(TABLES.USERS).update([{
				id: userId,
				fields: {
					[FIELDS.VERIFICATION_TOKEN]: token,
					[FIELDS.TOKEN_EXPIRATION]: expirationTime.toISOString()
				}
			}]);
		},

		/**
		 * Verify token and get user email
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

			// Check expiration
			let expired = false;
			if (expiration) {
				const expirationDate = new Date(expiration);
				expired = expirationDate < new Date();
			}

			return { email, expired };
		},

		/**
		 * Clear verification token after successful login
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
		 * Get all assets for a user by email
		 * Uses same view and formula as original implementation
		 */
		async getAssetsByEmail(email: string): Promise<Asset[]> {
			const escapedEmail = escapeAirtableString(email.toLowerCase());

			// Case-insensitive search: FIND on lowercased email in lowercased creator emails field
			// Filter to Templates only (🆎Type = 'Template🏗️')
			const formula = `AND(FIND('${escapedEmail}', LOWER({📧Emails (from 🎨Creator)})), {🆎Type} = 'Template🏗️')`;

			console.log('[Airtable] getAssetsByEmail:', {
				email,
				escapedEmail,
				formula,
				table: TABLES.ASSETS,
				view: 'viwETCKXDaVHbEnZQ'
			});

			const records = await base(TABLES.ASSETS)
				.select({
					view: 'viwETCKXDaVHbEnZQ', // Original view
					filterByFormula: formula
				})
				.all();

			console.log('[Airtable] Query returned', records.length, 'records');

			return records.map(record => {
				// Clean status string (remove emoji prefixes like "2️⃣Published" → "Published")
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
					type: 'Template' as Asset['type'], // Already filtered to templates
					status: cleanedStatus || 'Draft',
					thumbnailUrl: (record.fields['🖼️Thumbnail Image'] as unknown as { url: string }[] | undefined)?.[0]?.url,
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
		 * Get single asset by ID with all fields
		 */
		async getAsset(id: string): Promise<Asset | null> {
			try {
				const record = await base(TABLES.ASSETS).find(id);

				// Extract carousel images
				const carouselImages = (record.fields['🖼️Carousel Images'] as unknown as { url: string }[] | undefined)?.map(img => img.url) || [];

				// Clean status string (remove emojis)
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
					thumbnailUrl: (record.fields['🖼️Thumbnail Image'] as unknown as { url: string }[] | undefined)?.[0]?.url,
					secondaryThumbnailUrl: (record.fields['fldzKxNCXcgCnEwxu'] as unknown as { url: string }[] | undefined)?.[0]?.url,
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
					// Review fields
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
		 * Get related assets (other published templates, excluding current)
		 */
		async getRelatedAssets(assetId: string, limit: number = 6): Promise<RelatedAsset[]> {
			try {
				const escapedAssetId = escapeAirtableString(assetId);
				const records = await base(TABLES.ASSETS)
					.select({
						filterByFormula: `AND(RECORD_ID() != '${escapedAssetId}', {🚀Marketplace Status} = 'Published')`,
						maxRecords: limit,
						fields: ['Name', '🆎Type', '🖼️Thumbnail Image']
					})
					.firstPage();

				return records.map(record => ({
					id: record.id,
					name: record.fields['Name'] as string || 'Untitled',
					type: record.fields['🆎Type'] as string || 'Template',
					thumbnailUrl: (record.fields['🖼️Thumbnail Image'] as unknown as { url: string }[] | undefined)?.[0]?.url
				}));
			} catch (err) {
				console.error('Error fetching related assets:', err);
				return [];
			}
		},

		/**
		 * Update an asset
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

				// Clean status string (remove emojis)
				const rawStatus = record.fields['🚀Marketplace Status'] as string || 'Draft';
				const cleanedStatus = rawStatus.replace(/[^\w\s]/g, '').trim() as Asset['status'];

				return {
					id: record.id,
					name: record.fields['Name'] as string || '',
					description: record.fields['📝Description'] as string || '',
					descriptionShort: record.fields['ℹ️Description (Short)'] as string || '',
					type: record.fields['🆎Type'] as Asset['type'] || 'Template',
					status: cleanedStatus,
					thumbnailUrl: (record.fields['🖼️Thumbnail Image'] as unknown as { url: string }[] | undefined)?.[0]?.url,
					websiteUrl: record.fields['🔗Website URL'] as string,
					previewUrl: record.fields['🔗Preview Site URL'] as string,
					marketplaceUrl: record.fields['🔗Marketplace URL'] as string
				};
			} catch {
				return null;
			}
		},

		/**
		 * Check if user owns an asset (by email match)
		 */
		async verifyAssetOwnership(assetId: string, email: string): Promise<boolean> {
			try {
				const record = await base(TABLES.ASSETS).find(assetId);
				const creatorEmails = record.fields['📧Emails (from 🎨Creator)'] as string | undefined;
				if (!creatorEmails) return false;
				return creatorEmails.toLowerCase().includes(email.toLowerCase());
			} catch {
				return false;
			}
		},

		// ==================== CREATORS ====================

		/**
		 * Get creator profile by email
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
				avatarUrl: (record.fields['🖼️Avatar'] as unknown as { url: string }[] | undefined)?.[0]?.url,
				biography: record.fields['📝Biography'] as string,
				legalName: record.fields['📜Legal Name'] as string
			};
		},

		/**
		 * Update creator profile
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
					avatarUrl: (record.fields['🖼️Avatar'] as unknown as { url: string }[] | undefined)?.[0]?.url,
					biography: record.fields['📝Biography'] as string,
					legalName: record.fields['📜Legal Name'] as string
				};
			} catch {
				return null;
			}
		},

		/**
		 * Check if an asset name is unique (excluding a specific asset ID)
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

		// ==================== TAGS ====================

		/**
		 * Get all available tags
		 */
		async getTags(): Promise<{ id: string; name: string }[]> {
			const records = await base(TABLES.TAGS).select().all();
			return records.map(r => ({
				id: r.id,
				name: r.fields['Name'] as string || ''
			}));
		},

		// ==================== SLA ====================

		/**
		 * Get assets over SLA from the "All Assets SLA Over" view
		 * Used by SLA notifications worker and manual triggers
		 *
		 * SLA Logic:
		 * - 3 days exactly → "warning" (approaching SLA)
		 * - >3 days → "overdue" (over SLA)
		 */
		async getSlaAssets(): Promise<{ warning: number; overdue: number }> {
			const DAYS_FIELD = '⏱️Days in Current Review Stage';

			const records = await base(TABLES.ASSETS)
				.select({
					view: VIEWS.SLA_OVER,
					fields: ['Name', DAYS_FIELD]
				})
				.all();

			let warning = 0;
			let overdue = 0;

			for (const record of records) {
				const days = record.fields[DAYS_FIELD] as number | undefined;

				if (days === undefined || days === null) {
					continue;
				}

				if (days === 3) {
					warning++;
				} else if (days > 3) {
					overdue++;
				}
			}

			return { warning, overdue };
		},

		// ==================== ANALYTICS ====================

		/**
		 * Get category performance data
		 */
		async getCategoryPerformance(): Promise<{
			category: string;
			revenue: number;
			count: number;
			avgRevenue: number;
			ranking: number;
		}[]> {
			const records = await base(TABLES.CATEGORY_PERFORMANCE)
				.select({
					view: VIEWS.CATEGORY_PERFORMANCE
				})
				.all();

			const data = records.map(r => ({
				category: r.fields['Category'] as string || '',
				revenue: r.fields['Revenue'] as number || 0,
				count: r.fields['Template Count'] as number || 0,
				avgRevenue: 0,
				ranking: 0
			}));

			// Calculate average revenue and assign rankings
			data.forEach(item => {
				item.avgRevenue = item.count > 0 ? Math.round(item.revenue / item.count) : 0;
			});

			// Sort by revenue descending and assign rankings
			data.sort((a, b) => b.revenue - a.revenue);
			data.forEach((item, index) => {
				item.ranking = index + 1;
			});

			return data;
		},

		/**
		 * Get top templates leaderboard
		 */
		async getLeaderboard(limit: number = 20): Promise<{
			id: string;
			name: string;
			category: string;
			revenue: number;
			purchases: number;
			ranking: number;
			thumbnailUrl?: string;
		}[]> {
			const records = await base(TABLES.LEADERBOARD)
				.select({
					view: VIEWS.LEADERBOARD,
					maxRecords: limit
				})
				.all();

			return records.map((r, index) => ({
				id: r.id,
				name: r.fields['Name'] as string || '',
				category: r.fields['Category'] as string || '',
				revenue: r.fields['Revenue'] as number || 0,
				purchases: r.fields['Purchases'] as number || 0,
				ranking: index + 1,
				thumbnailUrl: (r.fields['Thumbnail'] as unknown as { url: string }[] | undefined)?.[0]?.url
			}));
		},

		// ==================== API KEYS ====================

		/**
		 * Generate a new API key for a creator
		 */
		async generateApiKey(creatorEmail: string, name: string, scopes: string[]): Promise<{ key: string; apiKey: ApiKey }> {
			// Generate a secure random key
			const rawKey = randomBytes(32).toString('hex');
			const keyPrefix = 'wfd_'; // webflow dashboard prefix
			const fullKey = `${keyPrefix}${rawKey}`;

			// Hash the key for storage (never store raw keys)
			const keyHash = createHash('sha256').update(fullKey).digest('hex');

			const now = new Date();
			const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year

			const records = await base(TABLES.API_KEYS).create([{
				fields: {
					'Name': name,
					'Key Hash': keyHash,
					'Key Prefix': fullKey.substring(0, 12), // Store prefix for identification
					'Creator Email': creatorEmail,
					'Scopes': scopes.join(','),
					'Status': 'Active',
					'Created At': now.toISOString(),
					'Expires At': expiresAt.toISOString()
				}
			}]);

			const record = records[0];
			return {
				key: fullKey, // Only returned once at creation
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
		 * List API keys for a creator (without the actual key values)
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

				// Check if expired
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
		 * Revoke an API key
		 */
		async revokeApiKey(keyId: string, creatorEmail: string): Promise<boolean> {
			// First verify ownership
			try {
				const record = await base(TABLES.API_KEYS).find(keyId);
				const recordEmail = record.fields['Creator Email'] as string;

				if (recordEmail.toLowerCase() !== creatorEmail.toLowerCase()) {
					return false; // Not owner
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
		 * Validate an API key and return the associated creator email
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

			// Check expiration
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
		}
	};
}

export type AirtableClient = ReturnType<typeof getAirtableClient>;
