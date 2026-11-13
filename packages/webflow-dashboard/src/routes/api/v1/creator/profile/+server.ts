import type { RequestHandler } from './$types';
import {
	creatorApiJson,
	creatorApiMeta,
	creatorApiRequestError,
	creatorApiRoute,
	loadCreatorProfile
} from '$lib/server/creator-api';

/** GET /api/v1/creator/profile — the public profile of the key's creator. */
export const GET: RequestHandler = creatorApiRoute('read:profile', async (_event, context, env) => {
	const { value: profile, cached } = await loadCreatorProfile(env, context.key.creatorIds[0]);

	if (!profile) {
		return creatorApiRequestError(
			404,
			'PROFILE_NOT_FOUND',
			'No creator profile is linked to this API key.',
			context
		);
	}

	return creatorApiJson({ ...profile, meta: creatorApiMeta(cached) }, context);
});
