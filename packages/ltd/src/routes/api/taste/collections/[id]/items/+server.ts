/**
 * Collection Items API
 *
 * Operations on items within a collection.
 * GET: List items in a collection
 * POST: Add an item to the collection
 *
 * Philosophy: Curation is selection with intention.
 * Canon: Position reveals hierarchy of understanding.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getCollectionItems,
	addItemToCollection,
	type AddItemInput,
} from '$lib/taste/collections';
import {
	getTokenFromRequest,
	validateToken,
	type AuthEnv,
} from '@create-something/components/auth/server';

export const GET: RequestHandler = async ({ params, request, platform }) => {
	const db = platform?.env?.DB;

	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const collectionId = params.id;

	// Optional auth - needed for private collections
	const token = getTokenFromRequest(request);
	const user = token ? await validateToken(token, platform?.env as AuthEnv | undefined) : null;

	try {
		const items = await getCollectionItems(db, collectionId, user?.id);

		return json({ items });
	} catch (err) {
		console.error('Get collection items error:', err);
		return json({ error: 'Failed to get collection items' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ params, request, platform }) => {
	const db = platform?.env?.DB;

	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	// Auth required for adding items
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
		referenceId?: string;
		referenceType?: 'example' | 'resource';
		note?: string | null;
		position?: number;
	};

	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	// Validate required fields
	if (!body.referenceId || typeof body.referenceId !== 'string') {
		throw error(400, 'referenceId is required');
	}

	const validTypes = ['example', 'resource'];
	if (!body.referenceType || !validTypes.includes(body.referenceType)) {
		throw error(400, `referenceType must be one of: ${validTypes.join(', ')}`);
	}

	// Validate position if provided
	if (body.position !== undefined && (typeof body.position !== 'number' || body.position < 0)) {
		throw error(400, 'position must be a non-negative number');
	}

	try {
		const input: AddItemInput = {
			referenceId: body.referenceId,
			referenceType: body.referenceType,
			note: body.note ?? null,
			position: body.position,
		};

		const item = await addItemToCollection(db, collectionId, user.id, input);

		if (!item) {
			throw error(404, 'Collection not found or access denied');
		}

		return json({ item }, { status: 201 });
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) throw err;
		console.error('Add item to collection error:', err);
		return json({ error: 'Failed to add item to collection' }, { status: 500 });
	}
};
