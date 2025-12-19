import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAirtableClient } from '$lib/server/airtable';

// GET /api/assets/[id] - Get single asset
export const GET: RequestHandler = async ({ params, locals, platform }) => {
	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	if (!platform?.env) {
		throw error(500, 'Server configuration error');
	}

	try {
		const airtable = getAirtableClient(platform.env);
		const asset = await airtable.getAsset(params.id);

		if (!asset) {
			throw error(404, 'Asset not found');
		}

		return json({ asset });
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('Failed to fetch asset:', err);
		throw error(500, 'Failed to fetch asset');
	}
};

// PATCH /api/assets/[id] - Update asset
export const PATCH: RequestHandler = async ({ params, request, locals, platform }) => {
	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	if (!platform?.env) {
		throw error(500, 'Server configuration error');
	}

	let body: { name?: string; description?: string; websiteUrl?: string };
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid request body');
	}

	try {
		const airtable = getAirtableClient(platform.env);
		const asset = await airtable.updateAsset(params.id, body);

		if (!asset) {
			throw error(404, 'Asset not found');
		}

		return json({ asset });
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('Failed to update asset:', err);
		throw error(500, 'Failed to update asset');
	}
};
