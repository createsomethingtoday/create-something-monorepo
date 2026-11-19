import type { RequestHandler } from './$types';
import {
	creatorApiJson,
	creatorApiMeta,
	creatorApiRequestError,
	creatorApiRoute,
	loadCreatorAssets,
	parseAssetListQuery
} from '$lib/server/creator-api';

/** GET /api/v1/creator/assets — the assets of the key's creator, newest first. */
export const GET: RequestHandler = creatorApiRoute('read:assets', async (event, context, env) => {
	const parsed = parseAssetListQuery(event.url.searchParams);
	if (!parsed.ok) {
		return creatorApiRequestError(400, 'INVALID_PARAMETER', parsed.message, context);
	}
	const { status, type, limit, offset } = parsed.query;

	const { value: assets, cached } = await loadCreatorAssets(env, context.key.creatorIds, (promise) =>
		event.platform?.context?.waitUntil(promise)
	);
	const matches = assets.filter(
		(asset) => (!status || asset.status === status) && (!type || asset.type === type)
	);

	return creatorApiJson(
		{
			data: matches.slice(offset, offset + limit),
			pagination: {
				total: matches.length,
				limit,
				offset,
				hasMore: offset + limit < matches.length
			},
			meta: creatorApiMeta(cached)
		},
		context
	);
});
