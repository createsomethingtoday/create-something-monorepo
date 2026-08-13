import type { RequestHandler } from './$types';
import { agencyApiCatalog } from '$lib/server/agent-discovery';

/** RFC 9727 linkset for the public, documented .agency agent interfaces. */
export const GET: RequestHandler = async () =>
	new Response(JSON.stringify(agencyApiCatalog), {
		headers: {
			'content-type': 'application/linkset+json; charset=utf-8',
			'cache-control': 'public, max-age=300'
		}
	});
