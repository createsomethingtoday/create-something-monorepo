/**
 * Content API - Fetch and update page content from KV
 * GET /api/content/[page] - Fetch page content (public)
 * PUT /api/content/[page] - Update page content (requires auth)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSession } from '$lib/server/auth';

const VALID_PAGES = ['home', 'petrox', 'lithx', 'dme', 'news', 'global'];

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
		if ((e as { status?: number }).status) throw e;
		console.error('Content fetch error:', e);
		throw error(500, 'Failed to fetch content');
	}
};

export const PUT: RequestHandler = async ({ params, request, cookies, platform }) => {
	const { page } = params;

	if (!page || !VALID_PAGES.includes(page)) {
		throw error(400, 'Invalid page');
	}

	// Require authentication for writes
	const sessionId = cookies.get('maverick_session');
	if (!sessionId) {
		throw error(401, 'Authentication required');
	}

	const sessions = platform?.env?.SESSIONS;
	if (!sessions) {
		throw error(500, 'Sessions not available');
	}

	const session = await validateSession(sessionId, sessions);
	if (!session) {
		throw error(401, 'Invalid or expired session');
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
		if ((e as { status?: number }).status) throw e;
		console.error('Content update error:', e);
		throw error(500, 'Failed to update content');
	}
};
