import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAirtableClient } from '$lib/server/airtable';
import { invalidateAssetsCache } from '$lib/server/assets-cache';
import { APP_UPDATE_GUIDANCE, isAppAssetType } from '$lib/utils/asset-actions';

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
	const { asset: existingAsset, isOwner } = await airtable.getAssetForOwner(
		params.id,
		locals.user.email
	);
	if (!existingAsset) {
		throw error(404, 'Asset not found');
	}
	if (!isOwner) {
		throw error(403, 'You do not have permission to modify this asset');
	}
	// A rollback rewrites the listing, so apps are excluded like any other direct write.
	if (isAppAssetType(existingAsset.type)) {
		throw error(409, APP_UPDATE_GUIDANCE);
	}

	// A listing-edit version records what changed, not a full snapshot, so it
	// cannot be restored. Say so instead of failing as a server error.
	const version = await airtable.getAssetVersion(params.versionId);
	if (!version || version.assetId !== params.id) {
		throw error(404, 'Version not found for this asset');
	}
	if (!version.snapshot) {
		throw error(409, 'This version has no stored snapshot to roll back to');
	}

	const asset = await airtable.rollbackAssetToVersion(
		params.id,
		params.versionId,
		locals.user.email
	);

	if (!asset) {
		throw error(500, 'Failed to rollback asset');
	}

	await invalidateAssetsCache(platform.env.SESSIONS, locals.user.email);

	return json({ asset, success: true });
};
