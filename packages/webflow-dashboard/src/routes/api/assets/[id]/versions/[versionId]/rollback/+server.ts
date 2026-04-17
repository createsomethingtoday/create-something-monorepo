import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAirtableClient } from '$lib/server/airtable';

// POST - Rollback to a specific version
export const POST: RequestHandler = async ({ params, locals, platform }) => {
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
		throw error(403, 'You do not have permission to modify this asset');
	}

	const version = await airtable.getAssetVersion(params.versionId);
	if (!version) {
		throw error(404, 'Version not found');
	}

	if (version.assetId !== params.id) {
		throw error(400, 'Version does not belong to this asset');
	}

	if (!version.canRollback) {
		throw error(409, version.rollbackReason || 'Rollback is unavailable for this version');
	}

	const asset = await airtable.rollbackAssetToVersion(
		params.id,
		params.versionId,
		locals.user.email
	);

	if (!asset) {
		throw error(500, 'Failed to rollback asset');
	}

	return json({ asset, success: true });
};
