import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAirtableClient } from '$lib/server/airtable';

// GET - Get a specific version
export const GET: RequestHandler = async ({ params, locals, platform }) => {
	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	if (!platform?.env) {
		throw error(500, 'Platform environment not available');
	}

	const airtable = getAirtableClient(platform.env);

	// Verify ownership
	const isOwner = await airtable.verifyAssetOwnership(params.id, locals.user.email);
	if (!isOwner) {
		throw error(403, 'You do not have permission to view this asset');
	}

	const version = await airtable.getAssetVersion(params.versionId);
	if (!version) {
		throw error(404, 'Version not found');
	}

	if (version.assetId !== params.id) {
		throw error(400, 'Version does not belong to this asset');
	}

	return json({ version });
};
