import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { getAirtableClient } from '$lib/server/airtable';

export const GET: RequestHandler = async ({ locals, platform }) => {
	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	if (!platform?.env) {
		throw error(500, 'Server configuration error');
	}

	try {
		const airtable = getAirtableClient(platform.env);
		const apiKeys = await airtable.listApiKeys(locals.user.email);

		// Count by status
		const active = apiKeys.filter(k => k.status === 'Active').length;
		const revoked = apiKeys.filter(k => k.status === 'Revoked').length;
		const expired = apiKeys.filter(k => k.status === 'Expired').length;

		return json({
			apiKeys,
			summary: {
				total: apiKeys.length,
				active,
				revoked,
				expired
			}
		});
	} catch (err) {
		console.error('Failed to list API keys:', err);
		throw error(500, 'Failed to list API keys');
	}
};
