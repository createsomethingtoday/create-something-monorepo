import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const artifacts = new Set(['nodes', 'edges', 'metadata']);

export const GET: RequestHandler = async ({ fetch, params }) => {
	if (!artifacts.has(params.artifact)) throw error(404, 'Graph source not found');

	const source = await fetch(`/.graph/${params.artifact}.json`);
	if (!source.ok || !source.body) throw error(503, 'Graph source is temporarily unavailable');

	return new Response(source.body, {
		headers: {
			'content-type': 'application/json; charset=utf-8',
			'cache-control': 'public, max-age=300'
		}
	});
};
