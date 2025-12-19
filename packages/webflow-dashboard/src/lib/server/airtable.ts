import Airtable from 'airtable';
import type { Asset, Creator, ApiKey } from '$lib/types';

// Airtable table IDs
const TABLES = {
	USERS: 'tbldQNGszIyOjt9a1',
	CREATORS: 'tbljt0plqxdMARZXb',
	ASSETS: 'tblRwzpWoLgE9MrUm',
	API_KEYS: 'tblU5rI3WiQerozvX',
	TAGS: '🏷️Tags (Free Form)',
	CATEGORY_PERFORMANCE: 'tblDU1oUiobNfMQP9'
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
			await base(TABLES.USERS).update([{
				id: userId,
				fields: {
					[FIELDS.VERIFICATION_TOKEN]: null,
					[FIELDS.TOKEN_EXPIRATION]: null
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
					[FIELDS.TOKEN_EXPIRATION]: null,
					[FIELDS.VERIFICATION_TOKEN]: null
				}
			}]);
		},

		// ==================== ASSETS ====================

		/**
		 * Get all assets for a user by email
		 */
		async getAssetsByEmail(email: string, options?: { limit?: number }): Promise<Asset[]> {
			const escapedEmail = escapeAirtableString(email);
			// Assets are linked via Creator, which has multiple email fields
			const formula = `OR(
				FIND('${escapedEmail}', LOWER({📧Emails (from 🎨Creator)})),
				{📧Emails (from 🎨Creator)} = '${escapedEmail}'
			)`;

			const records = await base(TABLES.ASSETS)
				.select({
					filterByFormula: formula,
					maxRecords: options?.limit || 100,
					sort: [{ field: 'Created', direction: 'desc' }]
				})
				.all();

			return records.map(record => ({
				id: record.id,
				name: record.fields['🆎Name'] as string || '',
				description: record.fields['📝Description'] as string || '',
				type: record.fields['🆎Type'] as Asset['type'] || 'Template',
				status: record.fields['🚀Marketplace Status'] as Asset['status'] || 'Draft',
				thumbnailUrl: (record.fields['🖼️Thumbnail Image'] as unknown as { url: string }[] | undefined)?.[0]?.url,
				websiteUrl: record.fields['🔗Website URL'] as string,
				marketplaceUrl: record.fields['🔗Marketplace URL'] as string,
				submittedDate: record.fields['📅Submitted Date'] as string,
				publishedDate: record.fields['📅Published Date'] as string,
				uniqueViewers: record.fields['📋 Unique Viewers'] as number,
				cumulativePurchases: record.fields['📋 Cumulative Purchases'] as number,
				cumulativeRevenue: record.fields['📋 Cumulative Revenue'] as number
			}));
		},

		/**
		 * Get single asset by ID
		 */
		async getAsset(id: string): Promise<Asset | null> {
			try {
				const record = await base(TABLES.ASSETS).find(id);

				return {
					id: record.id,
					name: record.fields['🆎Name'] as string || '',
					description: record.fields['📝Description'] as string || '',
					type: record.fields['🆎Type'] as Asset['type'] || 'Template',
					status: record.fields['🚀Marketplace Status'] as Asset['status'] || 'Draft',
					thumbnailUrl: (record.fields['🖼️Thumbnail Image'] as unknown as { url: string }[] | undefined)?.[0]?.url,
					websiteUrl: record.fields['🔗Website URL'] as string,
					marketplaceUrl: record.fields['🔗Marketplace URL'] as string,
					submittedDate: record.fields['📅Submitted Date'] as string,
					publishedDate: record.fields['📅Published Date'] as string,
					uniqueViewers: record.fields['📋 Unique Viewers'] as number,
					cumulativePurchases: record.fields['📋 Cumulative Purchases'] as number,
					cumulativeRevenue: record.fields['📋 Cumulative Revenue'] as number
				};
			} catch {
				return null;
			}
		},

		/**
		 * Update an asset
		 */
		async updateAsset(id: string, data: Partial<Asset>): Promise<Asset | null> {
			const fields: Record<string, string> = {};

			if (data.name !== undefined) fields['🆎Name'] = data.name;
			if (data.description !== undefined) fields['📝Description'] = data.description;
			if (data.websiteUrl !== undefined) fields['🔗Website URL'] = data.websiteUrl;

			try {
				const records = await base(TABLES.ASSETS).update([{ id, fields }]);
				const record = records[0];
				return {
					id: record.id,
					name: record.fields['🆎Name'] as string || '',
					description: record.fields['📝Description'] as string || '',
					type: record.fields['🆎Type'] as Asset['type'] || 'Template',
					status: record.fields['🚀Marketplace Status'] as Asset['status'] || 'Draft',
					thumbnailUrl: (record.fields['🖼️Thumbnail Image'] as unknown as { url: string }[] | undefined)?.[0]?.url,
					websiteUrl: record.fields['🔗Website URL'] as string,
					marketplaceUrl: record.fields['🔗Marketplace URL'] as string
				};
			} catch {
				return null;
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

		// ==================== ANALYTICS ====================

		/**
		 * Get category performance data
		 */
		async getCategoryPerformance(): Promise<{ category: string; revenue: number; count: number }[]> {
			const records = await base(TABLES.CATEGORY_PERFORMANCE).select().all();
			return records.map(r => ({
				category: r.fields['Category'] as string || '',
				revenue: r.fields['Revenue'] as number || 0,
				count: r.fields['Template Count'] as number || 0
			}));
		}
	};
}

export type AirtableClient = ReturnType<typeof getAirtableClient>;
