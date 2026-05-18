import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAirtableClient } from '$lib/server/airtable';

export const GET: RequestHandler = async ({ locals, platform }) => {
	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	try {
		const airtable = getAirtableClient(platform?.env);
		const apiKeys = await airtable.listApiKeys(locals.user.email);
		const keys = apiKeys.map((apiKey) => ({
			keyId: apiKey.id,
			keyName: apiKey.name,
			keyPrefix: apiKey.keyPrefix || 'N/A',
			status: apiKey.status,
			scopes: apiKey.scopes,
			createdAt: apiKey.createdAt || null,
			lastUsed: apiKey.lastUsedAt || null,
			expiresAt: apiKey.expiresAt || null,
			requestCount: apiKey.requestCount || 0
		}));

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
