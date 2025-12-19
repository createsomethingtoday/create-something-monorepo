import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAirtableClient } from '$lib/server/airtable';

// GET - Fetch single asset
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

	const asset = await airtable.getAsset(params.id);
	if (!asset) {
		throw error(404, 'Asset not found');
	}

	return json({ asset });
};

// PATCH - Update asset
export const PATCH: RequestHandler = async ({ params, request, locals, platform }) => {
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
		throw error(403, 'You do not have permission to edit this asset');
	}

	const body = (await request.json()) as {
		name?: string;
		description?: string;
		descriptionShort?: string;
		websiteUrl?: string;
		previewUrl?: string;
	};

	// Check name uniqueness if name is being changed
	if (body.name) {
		const nameCheck = await airtable.checkAssetNameUniqueness(body.name, params.id);
		if (!nameCheck.unique) {
			throw error(400, 'An asset with this name already exists');
		}
	}

	const updatedAsset = await airtable.updateAsset(params.id, body);
	if (!updatedAsset) {
		throw error(500, 'Failed to update asset');
	}

	return json({ asset: updatedAsset });
};
