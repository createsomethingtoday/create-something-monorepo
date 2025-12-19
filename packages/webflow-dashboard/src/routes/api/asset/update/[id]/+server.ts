import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { getAirtableClient } from '$lib/server/airtable';

interface UpdateAssetBody {
	name?: string;
	description?: string;
	descriptionShort?: string;
	websiteUrl?: string;
	previewUrl?: string;
}

export const PATCH: RequestHandler = async ({ params, request, locals, platform }) => {
	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	if (!platform?.env) {
		throw error(500, 'Server configuration error');
	}

	const { id } = params;
	if (!id) {
		throw error(400, 'Asset ID is required');
	}

	let body: UpdateAssetBody;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	// Validate input
	if (body.name !== undefined) {
		if (typeof body.name !== 'string' || body.name.trim().length === 0) {
			throw error(400, 'Name must be a non-empty string');
		}
		if (body.name.length > 100) {
			throw error(400, 'Name must be 100 characters or less');
		}
	}

	if (body.description !== undefined && typeof body.description !== 'string') {
		throw error(400, 'Description must be a string');
	}

	if (body.descriptionShort !== undefined) {
		if (typeof body.descriptionShort !== 'string') {
			throw error(400, 'Short description must be a string');
		}
		if (body.descriptionShort.length > 500) {
			throw error(400, 'Short description must be 500 characters or less');
		}
	}

	if (body.websiteUrl !== undefined && body.websiteUrl !== '') {
		if (typeof body.websiteUrl !== 'string') {
			throw error(400, 'Website URL must be a string');
		}
		try {
			new URL(body.websiteUrl);
		} catch {
			throw error(400, 'Website URL must be a valid URL');
		}
	}

	if (body.previewUrl !== undefined && body.previewUrl !== '') {
		if (typeof body.previewUrl !== 'string') {
			throw error(400, 'Preview URL must be a string');
		}
		try {
			new URL(body.previewUrl);
		} catch {
			throw error(400, 'Preview URL must be a valid URL');
		}
	}

	try {
		const airtable = getAirtableClient(platform.env);

		// Verify ownership
		const isOwner = await airtable.verifyAssetOwnership(id, locals.user.email);
		if (!isOwner) {
			throw error(403, 'You do not have permission to edit this asset');
		}

		// Check name uniqueness if name is being updated
		if (body.name) {
			const nameCheck = await airtable.checkAssetNameUniqueness(body.name, id);
			if (!nameCheck.unique) {
				throw error(409, 'An asset with this name already exists');
			}
		}

		// Update the asset
		const updatedAsset = await airtable.updateAsset(id, {
			name: body.name?.trim(),
			description: body.description,
			descriptionShort: body.descriptionShort,
			websiteUrl: body.websiteUrl,
			previewUrl: body.previewUrl
		});

		if (!updatedAsset) {
			throw error(400, 'No fields to update');
		}

		return json({ asset: updatedAsset });
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('Failed to update asset:', err);
		throw error(500, 'Failed to update asset');
	}
};
