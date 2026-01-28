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
	console.log('[Versions API] POST request received for asset:', params.id);
	
	if (!locals.user?.email) {
		console.log('[Versions API] Unauthorized - no user email');
		throw error(401, 'Unauthorized');
	}
	console.log('[Versions API] User:', locals.user.email);

	if (!platform?.env) {
		console.log('[Versions API] Platform environment not available');
		throw error(500, 'Platform environment not available');
	}

	const airtable = getAirtableClient(platform.env);

	// Verify ownership
	console.log('[Versions API] Verifying ownership...');
	const isOwner = await airtable.verifyAssetOwnership(params.id, locals.user.email);
	if (!isOwner) {
		console.log('[Versions API] Ownership verification failed');
		throw error(403, 'You do not have permission to modify this asset');
	}
	console.log('[Versions API] Ownership verified');

	const body = (await request.json()) as {
		changes: string;
	};
	console.log('[Versions API] Request body:', JSON.stringify(body));

	if (!body.changes || typeof body.changes !== 'string') {
		console.log('[Versions API] Invalid changes description');
		throw error(400, 'Changes description is required');
	}

	console.log('[Versions API] Creating version with changes:', body.changes);
	try {
		const version = await airtable.createAssetVersion(
			params.id,
			locals.user.email,
			body.changes
		);

		if (!version) {
			console.log('[Versions API] createAssetVersion returned null');
			throw error(500, 'Failed to create version');
		}

		console.log('[Versions API] Version created successfully:', version.id);
		return json({ version });
	} catch (err) {
		console.error('[Versions API] Error creating version:', err);
		throw error(500, `Failed to create version: ${err instanceof Error ? err.message : 'Unknown error'}`);
	}
};
