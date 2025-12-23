/**
 * Collection Reorder API
 *
 * Reorder items within a collection.
 * POST: Accept an ordered list of item IDs
 *
 * Philosophy: Order reveals meaning.
 * Canon: Position within a collection encodes curatorial intent.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { reorderCollectionItems } from '$lib/taste/collections';
import {
	getTokenFromRequest,
	validateToken,
	type AuthEnv,
} from '@create-something/components/auth/server';

export const POST: RequestHandler = async ({ params, request, platform }) => {
	const db = platform?.env?.DB;

	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	// Auth required
	const token = getTokenFromRequest(request);
	if (!token) {
		throw error(401, 'Authentication required');
	}

	const user = await validateToken(token, platform?.env as AuthEnv | undefined);
	if (!user) {
		throw error(401, 'Invalid or expired token');
	}

	const collectionId = params.id;

	let body: {
		itemIds?: string[];
	};

	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	// Validate itemIds
	if (!body.itemIds || !Array.isArray(body.itemIds)) {
		throw error(400, 'itemIds must be an array of item IDs');
	}

	if (body.itemIds.length === 0) {
		throw error(400, 'itemIds must not be empty');
	}

	// Validate all items are strings
	if (!body.itemIds.every((id) => typeof id === 'string')) {
		throw error(400, 'All itemIds must be strings');
	}

	try {
		const success = await reorderCollectionItems(db, collectionId, user.id, body.itemIds);

		if (!success) {
			throw error(404, 'Collection not found or access denied');
		}

		return json({ success: true });
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) throw err;
		console.error('Reorder collection items error:', err);
		return json({ error: 'Failed to reorder items' }, { status: 500 });
	}
};
