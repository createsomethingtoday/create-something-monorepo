import type { RequestHandler } from './$types';
import { creatorApiError } from '$lib/server/creator-api';

/** Unknown v1 paths answer in JSON, like the rest of the API, not with an HTML page. */
export const fallback: RequestHandler = async () =>
	creatorApiError(404, 'NOT_FOUND', 'This API endpoint does not exist.', crypto.randomUUID());
