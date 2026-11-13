import { json, error, isHttpError } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAirtableClient } from '$lib/server/airtable';
import { markApiKeyRevoked } from '$lib/server/creator-api';

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	let body: { keyId?: unknown };
	try {
		body = (await request.json()) as typeof body;
	} catch {
		throw error(400, 'Request body must be JSON');
	}

	const keyId = body?.keyId;
	if (!keyId || typeof keyId !== 'string') {
		throw error(400, 'Key ID is required');
	}

	try {
		const airtable = getAirtableClient(platform?.env);
		const revoked = await airtable.revokeApiKey(keyId, locals.user.email);

		if (!revoked) {
			throw error(404, 'API key not found or you do not have permission to revoke it');
		}

		// Replace the cached verification with a revoked marker, so the key fails
		// on its next request. If this throws, the revoke is reported as failed:
		// until the marker is written the key can still work. Trying again is
		// safe, because revoking a revoked key only writes the marker.
		if (platform?.env?.DB && revoked.keyHash) {
			await markApiKeyRevoked(platform.env.DB, revoked.keyHash);
		}

		return json({ success: true });
	} catch (err) {
		if (isHttpError(err)) throw err;
		console.error('[API Keys] Revoke failed:', err);
		throw error(500, 'Failed to revoke API key');
	}
};
