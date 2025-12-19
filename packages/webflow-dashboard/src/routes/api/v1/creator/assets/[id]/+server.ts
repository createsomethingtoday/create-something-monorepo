import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { getAirtableClient } from '$lib/server/airtable';
import { validateApiKeyFromRequest } from '$lib/server/apiKeyAuth';

export const GET: RequestHandler = async ({ params, request, platform }) => {
	// Validate API key with read:assets scope
	const auth = await validateApiKeyFromRequest(request, platform, 'read:assets');

	if (!platform?.env) {
		throw error(500, 'Server configuration error');
	}

	const { id } = params;
	if (!id) {
		throw error(400, 'Asset ID is required');
	}

	try {
		const airtable = getAirtableClient(platform.env);

		// Verify the user owns this asset
		const isOwner = await airtable.verifyAssetOwnership(id, auth.email);
		if (!isOwner) {
			throw error(403, 'You do not have access to this asset');
		}

		const asset = await airtable.getAsset(id);
		if (!asset) {
			throw error(404, 'Asset not found');
		}

		// Return full asset data for owner
		return json({
			asset: {
				id: asset.id,
				name: asset.name,
				description: asset.description,
				descriptionShort: asset.descriptionShort,
				type: asset.type,
				status: asset.status,
				thumbnailUrl: asset.thumbnailUrl,
				carouselImages: asset.carouselImages,
				websiteUrl: asset.websiteUrl,
				previewUrl: asset.previewUrl,
				marketplaceUrl: asset.marketplaceUrl,
				submittedDate: asset.submittedDate,
				publishedDate: asset.publishedDate,
				priceString: asset.priceString
			}
		});
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('Failed to fetch asset:', err);
		throw error(500, 'Failed to fetch asset');
	}
};
