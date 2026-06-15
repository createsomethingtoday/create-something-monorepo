import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAirtableClient } from '$lib/server/airtable';
import {
	isLongDescriptionOnlyAssetVersionChange,
	shouldCreateAssetVersionForChanges
} from '$lib/utils/asset-version-changes';

// GET - List all versions for an asset
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

	const versions = await airtable.getAssetVersions(params.id);
	return json({ versions });
};

// POST - Create a new version (snapshot current state)
export const POST: RequestHandler = async ({ params, request, locals, platform }) => {
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

	const body = (await request.json()) as {
		changes: Record<string, unknown> | string;
	};

	if (!body.changes) {
		throw error(400, 'Changes are required');
	}

	if (isLongDescriptionOnlyAssetVersionChange(body.changes)) {
		return json({ version: null, skipped: true, reason: 'long_description_only' });
	}

	if (!shouldCreateAssetVersionForChanges(body.changes)) {
		throw error(400, 'Changes are required');
	}

	// Support both structured changes (new format) and string description (legacy)
	const changes = typeof body.changes === 'string' 
		? body.changes 
		: body.changes;

	try {
		const version = await airtable.createAssetVersion(
			params.id,
			locals.user.email,
			changes
		);

		if (!version) {
			throw error(500, 'Failed to create version');
		}

		return json({ version });
	} catch (err) {
		console.error('[Versions API] Error creating version:', err);
		throw error(500, `Failed to create version: ${err instanceof Error ? err.message : 'Unknown error'}`);
	}
};
