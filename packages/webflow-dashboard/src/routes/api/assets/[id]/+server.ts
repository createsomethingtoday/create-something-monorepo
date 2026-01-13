import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAirtableClient } from '$lib/server/airtable';

// GET - Fetch single asset
export const GET: RequestHandler = async ({ params, locals, platform, url }) => {
	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	if (!platform?.env) {
		throw error(500, 'Platform environment not available');
	}

	const airtable = getAirtableClient(platform.env);

	// Verify ownership
	const debug = url.searchParams.get('debug') === '1';
	const isOwner = await airtable.verifyAssetOwnership(params.id, locals.user.email);
	if (!isOwner) {
		if (debug) {
			const details = await airtable.debugAssetOwnership(params.id, locals.user.email);
			console.error('[Asset API] Ownership denied', details.debug);
			return json(
				{
					error: 'Forbidden',
					message: 'You do not have permission to view this asset',
					debug: details.debug
				},
				{ status: 403 }
			);
		}
		throw error(403, 'You do not have permission to view this asset');
	}

	const asset = await airtable.getAsset(params.id);
	if (!asset) {
		throw error(404, 'Asset not found');
	}

	return json({ asset });
};

// PATCH - Update asset (text fields only, legacy)
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
		descriptionShort?: string;
		descriptionLongHtml?: string;
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

// PUT - Update asset with images
export const PUT: RequestHandler = async ({ params, request, locals, platform }) => {
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
		descriptionShort?: string;
		descriptionLongHtml?: string;
		websiteUrl?: string;
		previewUrl?: string;
		thumbnailUrl?: string | null;
		secondaryThumbnailUrl?: string | null;
		carouselImages?: string[];
	};

	// Validate required fields
	if (body.name !== undefined && typeof body.name !== 'string') {
		throw error(400, 'Name must be a string');
	}
	if (body.descriptionShort !== undefined && typeof body.descriptionShort !== 'string') {
		throw error(400, 'Short description must be a string');
	}
	if (body.descriptionLongHtml !== undefined && typeof body.descriptionLongHtml !== 'string') {
		throw error(400, 'Long description must be a string');
	}

	// Check name uniqueness if name is being changed
	if (body.name) {
		const nameCheck = await airtable.checkAssetNameUniqueness(body.name, params.id);
		if (!nameCheck.unique) {
			throw error(400, 'An asset with this name already exists');
		}
	}

	// Validate image arrays
	if (body.carouselImages !== undefined) {
		if (!Array.isArray(body.carouselImages)) {
			throw error(400, 'Carousel images must be an array');
		}
		if (body.carouselImages.some((url) => typeof url !== 'string')) {
			throw error(400, 'All carousel image URLs must be strings');
		}
	}

	const updatedAsset = await airtable.updateAssetWithImages(params.id, body);
	if (!updatedAsset) {
		throw error(500, 'Failed to update asset');
	}

	return json({ asset: updatedAsset });
};
