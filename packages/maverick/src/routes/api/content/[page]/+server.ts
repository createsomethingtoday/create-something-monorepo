/**
 * Content API - Fetch and update page content from KV
 * GET /api/content/[page] - Fetch page content
 * PUT /api/content/[page] - Update page content
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const VALID_PAGES = ['home', 'petrox', 'lithx', 'dme', 'news', 'about', 'global'];

export const GET: RequestHandler = async ({ params, platform }) => {
	const { page } = params;

	if (!page || !VALID_PAGES.includes(page)) {
		throw error(400, 'Invalid page');
	}

	const kv = platform?.env?.CONTENT;
	if (!kv) {
		throw error(500, 'KV not available');
	}

	try {
		const content = await kv.get(`content:${page}`, { type: 'json' });

		if (!content) {
			throw error(404, 'Content not found');
		}

		return json(content);
	} catch (e) {
		console.error('Content fetch error:', e);
		throw error(500, 'Failed to fetch content');
	}
};

export const PUT: RequestHandler = async ({ params, request, platform }) => {
	const { page } = params;

	if (!page || !VALID_PAGES.includes(page)) {
		throw error(400, 'Invalid page');
	}

	const kv = platform?.env?.CONTENT;
	if (!kv) {
		throw error(500, 'KV not available');
	}

	try {
		const content = await request.json();
		await kv.put(`content:${page}`, JSON.stringify(content));

		return json({ success: true });
	} catch (e) {
		console.error('Content update error:', e);
		throw error(500, 'Failed to update content');
	}
};
