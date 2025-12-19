import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { getAirtableClient } from '$lib/server/airtable';

export const POST: RequestHandler = async ({ params, locals, platform }) => {
	// Require authentication
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
		throw error(403, 'You do not have permission to archive this asset');
	}

	// Archive the asset
	const result = await airtable.archiveAsset(params.id);

	if (!result.success) {
		throw error(500, result.error || 'Failed to archive asset');
	}

	return json({ success: true, message: 'Asset archived successfully' });
};
