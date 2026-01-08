import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Airtable from 'airtable';

const CREATORS_TABLE = 'tbljt0plqxdMARZXb';
const API_KEYS_TABLE = 'tblU5rI3WiQerozvX';

export const GET: RequestHandler = async ({ locals, platform }) => {
	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	if (!platform?.env?.AIRTABLE_API_KEY || !platform?.env?.AIRTABLE_BASE_ID) {
		throw error(500, 'Server configuration error');
	}

	const email = locals.user.email;
	const base = new Airtable({ apiKey: platform.env.AIRTABLE_API_KEY }).base(platform.env.AIRTABLE_BASE_ID);

	try {
		// First, find the creator to get their record ID
		const creatorFormula = `OR(FIND("${email}", ARRAYJOIN({📧Email}, ",")) > 0, FIND("${email}", ARRAYJOIN({📧WF Account Email}, ",")) > 0, FIND("${email}", ARRAYJOIN({📧Emails}, ",")) > 0)`;
		const creatorRecords = await base(CREATORS_TABLE)
			.select({ filterByFormula: creatorFormula })
			.firstPage();

		if (creatorRecords.length === 0) {
			return json({ keys: [], total: 0, active: 0, revoked: 0 });
		}

		const creatorId = creatorRecords[0].id;

		// Fetch all API keys and filter by creator (matching original implementation)
		const allKeyRecords = await base(API_KEYS_TABLE).select({
			sort: [{ field: 'Created Date', direction: 'desc' }]
		}).all();

		// Filter keys belonging to this creator
		const keyRecords = allKeyRecords.filter(record => {
			const creators = record.get('Creator') as string[] || [];
			return creators.includes(creatorId);
		});

		// Transform records
		const keys = keyRecords.map(record => ({
			keyId: record.id,
			keyName: (record.get('Key Name') as string) || 'Unnamed Key',
			keyPrefix: (record.get('Key Prefix') as string) || 'N/A',
			status: (record.get('Status') as string) || 'Unknown',
			scopes: (record.get('Scopes') as string[]) || [],
			createdAt: record.get('Created Date') as string || null,
			lastUsed: record.get('Last Used') as string || null,
			expiresAt: record.get('Expiration Date') as string || null,
			requestCount: (record.get('Request Count') as number) || 0
		}));

		// Calculate statistics
		const stats = keys.reduce((acc, key) => {
			acc.total++;
			if (key.status === 'Active') acc.active++;
			if (key.status === 'Revoked') acc.revoked++;
			if (key.status === 'Expired') acc.expired++;
			return acc;
		}, { total: 0, active: 0, revoked: 0, expired: 0 });

		return json({ keys, ...stats });
	} catch (err) {
		console.error('[API Keys] Error:', err);
		throw error(500, 'Failed to list API keys');
	}
};
