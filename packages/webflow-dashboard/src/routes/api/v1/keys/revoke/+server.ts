import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { getAirtableClient } from '$lib/server/airtable';

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	if (!platform?.env) {
		throw error(500, 'Server configuration error');
	}

	let body: { keyId?: string };
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const keyId = body.keyId?.trim();
	if (!keyId) {
		throw error(400, 'keyId is required');
	}

	try {
		const airtable = getAirtableClient(platform.env);
		const success = await airtable.revokeApiKey(keyId, locals.user.email);

		if (!success) {
			throw error(404, 'API key not found or you do not have permission to revoke it');
		}

		return json({ success: true, message: 'API key revoked successfully' });
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('Failed to revoke API key:', err);
		throw error(500, 'Failed to revoke API key');
	}
};
