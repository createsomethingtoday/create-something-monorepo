/**
 * Single Collection Item API
 *
 * Operations on a specific item in a collection.
 * PATCH: Update item (note, position)
 * DELETE: Remove item from collection
 *
 * Philosophy: Annotation reveals understanding.
 * Canon: The note transforms viewing into study.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	updateCollectionItem,
	removeItemFromCollection,
	type UpdateItemInput,
} from '$lib/taste/collections';
import {
	getTokenFromRequest,
	validateToken,
	type AuthEnv,
} from '@create-something/components/auth/server';

export const PATCH: RequestHandler = async ({ params, request, platform }) => {
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

	const itemId = params.itemId;

	let body: {
		note?: string | null;
		position?: number;
	};

	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	// Validate position if provided
	if (body.position !== undefined && (typeof body.position !== 'number' || body.position < 0)) {
		throw error(400, 'position must be a non-negative number');
	}

	try {
		const input: UpdateItemInput = {};

		if (body.note !== undefined) input.note = body.note;
		if (body.position !== undefined) input.position = body.position;

		const item = await updateCollectionItem(db, itemId, user.id, input);

		if (!item) {
			throw error(404, 'Item not found or access denied');
		}

		return json({ item });
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) throw err;
		console.error('Update collection item error:', err);
		return json({ error: 'Failed to update item' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, request, platform }) => {
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

	const itemId = params.itemId;

	try {
		const deleted = await removeItemFromCollection(db, itemId, user.id);

		if (!deleted) {
			throw error(404, 'Item not found or access denied');
		}

		return json({ success: true });
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) throw err;
		console.error('Remove collection item error:', err);
		return json({ error: 'Failed to remove item' }, { status: 500 });
	}
};
