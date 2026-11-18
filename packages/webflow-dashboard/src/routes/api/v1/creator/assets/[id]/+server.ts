import type { RequestHandler } from './$types';
import {
	creatorApiJson,
	creatorApiMeta,
	creatorApiRequestError,
	creatorApiRoute,
	loadCreatorAssets,
	parseListingUpdate,
	toCreatorApiAsset,
	toCreatorApiListing,
	updateCreatorListing
} from '$lib/server/creator-api';

/**
 * GET /api/v1/creator/assets/{id} — one asset of the key's creator.
 *
 * The asset is read from the creator's own list. An ID that belongs to another
 * creator gets the same 404 as an ID that does not exist.
 */
export const GET: RequestHandler = creatorApiRoute('read:assets', async (event, context, env) => {
	const { value: assets, cached } = await loadCreatorAssets(env, context.key.creatorIds, (promise) =>
		event.platform?.context?.waitUntil(promise)
	);
	const asset = assets.find((candidate) => candidate.id === event.params.id);

	if (!asset) {
		return creatorApiRequestError(
			404,
			'ASSET_NOT_FOUND',
			'No asset with this ID belongs to the creator of this API key.',
			context
		);
	}

	return creatorApiJson({ ...asset, meta: creatorApiMeta(cached) }, context);
});

/**
 * PATCH /api/v1/creator/assets/{id} — change the listing text of a published template.
 *
 * The change is saved the way the dashboard editor saves it, and a Meta Update
 * version is recorded for the review team. Images are not supported here: they
 * must pass the dashboard's upload checks.
 */
export const PATCH: RequestHandler = creatorApiRoute('write:assets', async (event, context, env) => {
	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		return creatorApiRequestError(400, 'INVALID_BODY', 'The request body is not valid JSON.', context);
	}

	const parsed = parseListingUpdate(body);
	if (!parsed.ok) return creatorApiRequestError(400, 'INVALID_BODY', parsed.message, context);

	const result = await updateCreatorListing(env, context.key, event.params.id, parsed.update);

	switch (result.outcome) {
		case 'not_found':
			return creatorApiRequestError(
				404,
				'ASSET_NOT_FOUND',
				'No asset with this ID belongs to the creator of this API key.',
				context
			);
		case 'not_editable':
			return creatorApiRequestError(
				409,
				'ASSET_NOT_EDITABLE',
				'Only a published template can be changed through the API.',
				context
			);
		case 'name_taken':
			return creatorApiRequestError(
				409,
				'NAME_TAKEN',
				'Another asset already has this name.',
				context
			);
		case 'unchanged':
			return creatorApiJson(
				{
					...toCreatorApiAsset(result.asset),
					listing: toCreatorApiListing(result.asset),
					update: { changedFields: [], reviewRecorded: false },
					meta: creatorApiMeta(false)
				},
				context
			);
		case 'updated':
			return creatorApiJson(
				{
					...toCreatorApiAsset(result.asset),
					listing: toCreatorApiListing(result.asset),
					update: { changedFields: result.changedFields, reviewRecorded: result.reviewRecorded },
					meta: creatorApiMeta(false)
				},
				context
			);
	}
});
