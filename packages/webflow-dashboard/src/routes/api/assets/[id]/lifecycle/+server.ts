import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAirtableClient } from '$lib/server/airtable';
import { invalidateAssetsCache } from '$lib/server/assets-cache';
import {
	planTemplateLifecycleAction,
	type TemplateLifecycleActionBody
} from '$lib/server/template-lifecycle-actions';
import { hasAdminAccess } from '$lib/server/security';

export const POST: RequestHandler = async ({ params, request, locals, platform }) => {
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

	const body = (await request.json()) as TemplateLifecycleActionBody;
	const requestedAction = body.action;
	const canUseAdminPath = isAdmin && requestedAction === 'approve_search_reentry';
	const { asset, isOwner } = canUseAdminPath
		? { asset: await airtable.getAsset(params.id), isOwner: true }
		: await airtable.getAssetForOwner(params.id, locals.user.email);

	if (!asset) {
		throw error(404, 'Asset not found');
	}
	if (!isOwner) {
		throw error(403, 'You do not have permission to update this asset lifecycle');
	}

	const lifecycle = planTemplateLifecycleAction(asset, body, { isAdmin });
	const updatedAsset = await airtable.updateTemplateSearchVisibility(
		params.id,
		lifecycle.searchVisibility
	);

	if (!updatedAsset) {
		throw error(500, 'Failed to update template lifecycle');
	}

	await invalidateAssetsCache(platform.env.SESSIONS, locals.user.email);

	return json({ asset: updatedAsset, lifecycle });
};
