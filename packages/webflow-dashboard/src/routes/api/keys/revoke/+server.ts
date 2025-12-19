import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAirtableClient } from '$lib/server/airtable';

interface RevokeKeyRequest {
	keyId: string;
}

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	const { keyId } = (await request.json()) as RevokeKeyRequest;

	if (!keyId || typeof keyId !== 'string') {
		throw error(400, 'Key ID is required');
	}

	const airtable = getAirtableClient(platform?.env);
	const success = await airtable.revokeApiKey(keyId, locals.user.email);

	if (!success) {
		throw error(404, 'API key not found or you do not have permission to revoke it');
	}

	return json({ success: true });
};
