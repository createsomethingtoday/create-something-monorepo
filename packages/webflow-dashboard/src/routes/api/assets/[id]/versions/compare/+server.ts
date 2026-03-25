import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAirtableClient, type AssetVersionSnapshot } from '$lib/server/airtable';

interface VersionDiff {
	field: string;
	oldValue: unknown;
	newValue: unknown;
	changed: boolean;
}

function compareVersions(
	oldSnapshot: AssetVersionSnapshot,
	newSnapshot: AssetVersionSnapshot
): VersionDiff[] {
	const oldRecord = oldSnapshot as Record<string, unknown>;
	const newRecord = newSnapshot as Record<string, unknown>;
	const fields = new Set([...Object.keys(oldRecord), ...Object.keys(newRecord)]);
	const diffs: VersionDiff[] = [];

	for (const field of fields) {
		const oldValue = oldRecord[field];
		const newValue = newRecord[field];

		// Deep comparison for arrays
		let changed = false;
		if (Array.isArray(oldValue) && Array.isArray(newValue)) {
			changed = JSON.stringify(oldValue) !== JSON.stringify(newValue);
		} else {
			changed = oldValue !== newValue;
		}

		diffs.push({
			field,
			oldValue,
			newValue,
			changed
		});
	}

	return diffs.filter((diff) => diff.changed);
}

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

	const differences = compareVersions(fromVersion.snapshot, toVersion.snapshot);

	return json({
		fromVersion,
		toVersion,
		differences
	});
};
