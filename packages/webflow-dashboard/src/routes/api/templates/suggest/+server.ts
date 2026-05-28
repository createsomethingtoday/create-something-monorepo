import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Proxy to the webflow-template-search worker's /api/templates/suggest endpoint.
 * Replaces the archived wf-search-suggestion Vercel API.
 *
 * GET /api/templates/suggest?q=arch&limit=5
 * Returns: { q, items: [{ name, template_slug, url, category_group_name, is_free, price, highlight }] }
 */
export const GET: RequestHandler = async ({ url, locals, platform }) => {
	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	const workerUrl: string =
		(platform?.env as Record<string, string> | undefined)?.TEMPLATE_SEARCH_WORKER_URL ?? '';

	if (!workerUrl) {
		throw error(503, 'Template search service is not configured.');
	}

	const params = new URLSearchParams();
	const q = url.searchParams.get('q') ?? url.searchParams.get('query') ?? '';
	if (q) params.set('q', q);
	const limit = url.searchParams.get('limit');
	if (limit) params.set('limit', limit);

	try {
		const response = await fetch(`${workerUrl}/api/templates/suggest?${params.toString()}`, {
			headers: { Accept: 'application/json' },
			signal: AbortSignal.timeout(8_000)
		});

		if (!response.ok) throw error(response.status, 'Suggest service returned an error.');

		return json(await response.json());
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) throw err;
		throw error(500, 'Suggest request failed.');
	}
};
