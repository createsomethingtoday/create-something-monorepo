import type { RequestHandler } from './$types';
import {
	creatorApiJson,
	creatorApiMeta,
	creatorApiRequestError,
	creatorApiRoute,
	loadCreatorAssets
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
