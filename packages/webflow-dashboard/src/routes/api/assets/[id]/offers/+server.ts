import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAirtableClient } from '$lib/server/airtable';
import {
	normalizeTemplateOfferRequestBody,
	type TemplateOfferRequestBody
} from '$lib/server/template-offer-requests';

export const POST: RequestHandler = async ({ params, request, locals, platform }) => {
	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	if (!platform?.env) {
		throw error(500, 'Platform environment not available');
	}

	const airtable = getAirtableClient(platform.env);

	const isOwner = await airtable.verifyAssetOwnership(params.id, locals.user.email);
	if (!isOwner) {
		throw error(403, 'You do not have permission to request offers for this asset');
	}

	const asset = await airtable.getAsset(params.id);
	if (!asset) {
		throw error(404, 'Asset not found');
	}

	if (asset.type !== 'Template') {
		throw error(400, 'Limited offers are only available for templates');
	}

	if (asset.status !== 'Published') {
		throw error(400, 'Limited offers can only be requested for published templates');
	}

	const body = (await request.json()) as TemplateOfferRequestBody;
	const input = normalizeTemplateOfferRequestBody(body, locals.user.email);
	const result = await airtable.createTemplateOfferRequest(params.id, input);

	if (!result) {
		throw error(500, 'Failed to submit offer request');
	}

	return json({ success: true, ...result });
};
