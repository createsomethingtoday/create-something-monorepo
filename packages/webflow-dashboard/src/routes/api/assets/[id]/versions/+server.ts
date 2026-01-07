import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAirtableClient } from '$lib/server/airtable';

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
		changes: string;
	};

	if (!body.changes || typeof body.changes !== 'string') {
		throw error(400, 'Changes description is required');
	}

	const version = await airtable.createAssetVersion(
		params.id,
		locals.user.email,
		body.changes
	);

	if (!version) {
		throw error(500, 'Failed to create version');
	}

	return json({ version });
};
