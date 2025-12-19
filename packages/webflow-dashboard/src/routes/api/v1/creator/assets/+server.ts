import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { getAirtableClient } from '$lib/server/airtable';
import { validateApiKeyFromRequest } from '$lib/server/apiKeyAuth';

export const GET: RequestHandler = async ({ request, url, platform }) => {
	// Validate API key with read:assets scope
	const auth = await validateApiKeyFromRequest(request, platform, 'read:assets');

	if (!platform?.env) {
		throw error(500, 'Server configuration error');
	}

	// Parse optional limit for response filtering
	const limitParam = url.searchParams.get('limit');
	let limit = 50;
	if (limitParam) {
		const parsed = parseInt(limitParam, 10);
		if (!isNaN(parsed) && parsed > 0) {
			limit = Math.min(parsed, 100);
		}
	}

	try {
		const airtable = getAirtableClient(platform.env);
		// getAssetsByEmail returns all assets for the email, we limit in response
		const allAssets = await airtable.getAssetsByEmail(auth.email);
		const assets = allAssets.slice(0, limit);

		// Return public-safe asset data
		return json({
			assets: assets.map(asset => ({
				id: asset.id,
				name: asset.name,
				description: asset.description,
				type: asset.type,
				status: asset.status,
				thumbnailUrl: asset.thumbnailUrl,
				websiteUrl: asset.websiteUrl,
				marketplaceUrl: asset.marketplaceUrl,
				submittedDate: asset.submittedDate,
				publishedDate: asset.publishedDate
				// Exclude metrics for public API
			})),
			count: assets.length
		});
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('Failed to fetch assets:', err);
		throw error(500, 'Failed to fetch assets');
	}
};
