import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAirtableClient } from '$lib/server/airtable';

export const GET: RequestHandler = async ({ locals, platform }) => {
	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	const airtable = getAirtableClient(platform?.env);
	const keys = await airtable.listApiKeys(locals.user.email);

	return json({
		keys: keys.map(key => ({
			keyId: key.id,
			keyName: key.name,
			keyPrefix: key.id.substring(0, 8), // Show partial ID as prefix
			createdAt: key.createdAt,
			expiresAt: key.expiresAt,
			lastUsed: key.lastUsedAt,
			scopes: key.scopes,
			status: key.status,
			requestCount: 0 // Not tracked in current implementation
		}))
	});
};
