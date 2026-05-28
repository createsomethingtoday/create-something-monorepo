import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Proxy to the webflow-template-search Cloudflare Worker.
 *
 * Set TEMPLATE_SEARCH_WORKER_URL in wrangler.jsonc vars or as a secret.
 * Falls back to the workers.dev default subdomain if not configured.
 *
 * Passes through all query params the Worker understands:
 *   q, scope, category_group_slug, child_category_slug,
 *   styles, types, free_only, sort, page, page_size
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

	// Forward only the params the Worker accepts
	const allowed = new Set([
		'q', 'query', 'search',
		'scope', 'category_group_slug', 'child_category_slug',
		'styles', 'types', 'free_only', 'sort', 'page', 'page_size',
		'featured', 'pricing'
	]);

	const forwardParams = new URLSearchParams();
	url.searchParams.forEach((value, key) => {
		if (allowed.has(key)) forwardParams.append(key, value);
	});

	const targetUrl = `${workerUrl}/api/templates/search?${forwardParams.toString()}`;

	try {
		const response = await fetch(targetUrl, {
			headers: { 'Accept': 'application/json' },
			signal: AbortSignal.timeout(15_000)
		});

		if (!response.ok) {
			throw error(response.status, 'Template search returned an error.');
		}

		const data = await response.json();
		return json(data);
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) throw err;
		throw error(500, 'Template search request failed.');
	}
};
