import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAirtableClient } from '$lib/server/airtable';
import { compareAssetVersions } from '$lib/server/versioning';

// GET - Compare two versions
export const GET: RequestHandler = async ({ params, url, locals, platform }) => {
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

	const fromVersionId = url.searchParams.get('from');
	const toVersionId = url.searchParams.get('to');

	if (!fromVersionId || !toVersionId) {
		throw error(400, 'Both from and to version IDs are required');
	}

	const [fromVersion, toVersion] = await Promise.all([
		airtable.getAssetVersion(fromVersionId),
		airtable.getAssetVersion(toVersionId)
	]);

	if (!fromVersion || !toVersion) {
		throw error(404, 'One or both versions not found');
	}

	if (fromVersion.assetId !== params.id || toVersion.assetId !== params.id) {
		throw error(400, 'Versions do not belong to this asset');
	}

	const differences = compareAssetVersions(fromVersion, toVersion);

	return json({
		fromVersion,
		toVersion,
		differences
	});
};
