import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAirtableClient } from '$lib/server/airtable';
import { invalidateAssetsCache } from '$lib/server/assets-cache';
import { hasAdminAccess } from '$lib/server/security';

export const POST: RequestHandler = async ({ params, locals, platform }) => {
	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	if (!platform?.env) {
		throw error(500, 'Platform environment not available');
	}

	const airtable = getAirtableClient(platform.env);
	const isAdmin = hasAdminAccess(locals.user.email, {
		adminEmailsCsv: platform.env.ADMIN_EMAILS,
		environment: platform.env.ENVIRONMENT
	});

	const { asset, isOwner } = isAdmin
		? { asset: await airtable.getAsset(params.id), isOwner: true }
		: await airtable.getAssetForOwner(params.id, locals.user.email);

	if (!asset) {
		throw error(404, 'Asset not found');
	}
	if (!isOwner) {
		throw error(403, 'You do not have permission to sync this template offer');
	}
	if (asset.type !== 'Template') {
		throw error(400, 'Offer sync is only available for templates');
	}

	const updatedAsset = await airtable.syncTemplateOfferMirrors(params.id);
	if (!updatedAsset) {
		throw error(500, 'Failed to sync template offer fields');
	}

	await invalidateAssetsCache(platform.env.SESSIONS, locals.user.email);

	return json({ success: true, asset: updatedAsset });
};
