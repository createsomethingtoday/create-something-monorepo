/**
 * Single Collection API
 *
 * Operations on a specific collection.
 * GET: Get collection details
 * PATCH: Update collection
 * DELETE: Delete collection
 *
 * Philosophy: Ownership grants control.
 * Canon: Privacy is not a feature—it's respect for the user's autonomy.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getCollection,
	updateCollection,
	deleteCollection,
	type UpdateCollectionInput,
	type CollectionVisibility,
} from '$lib/taste/collections';
import {
	getTokenFromRequest,
	validateToken,
	type AuthEnv,
} from '@create-something/canon/auth/server';

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
		const collection = await getCollection(db, collectionId, user?.id);

		if (!collection) {
			throw error(404, 'Collection not found');
		}

		return json({ collection });
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) throw err;
		console.error('Get collection error:', err);
		return json({ error: 'Failed to get collection' }, { status: 500 });
	}
};

export const PATCH: RequestHandler = async ({ params, request, platform }) => {
	const db = platform?.env?.DB;

	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	// Auth required for updates
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
		name?: string;
		description?: string | null;
		visibility?: CollectionVisibility;
		tags?: string[];
	};

	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	// Validate visibility if provided
	const validVisibilities: CollectionVisibility[] = ['private', 'public', 'unlisted'];
	if (body.visibility && !validVisibilities.includes(body.visibility)) {
		throw error(400, `Visibility must be one of: ${validVisibilities.join(', ')}`);
	}

	// Validate tags if provided
	if (body.tags !== undefined && !Array.isArray(body.tags)) {
		throw error(400, 'Tags must be an array');
	}

	// Validate name if provided
	if (body.name !== undefined && (typeof body.name !== 'string' || body.name.trim().length === 0)) {
		throw error(400, 'Name must be a non-empty string');
	}

	try {
		const input: UpdateCollectionInput = {};

		if (body.name !== undefined) input.name = body.name.trim();
		if (body.description !== undefined) input.description = body.description;
		if (body.visibility !== undefined) input.visibility = body.visibility;
		if (body.tags !== undefined) input.tags = body.tags;

		const collection = await updateCollection(db, collectionId, user.id, input);

		if (!collection) {
			throw error(404, 'Collection not found or access denied');
		}

		return json({ collection });
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) throw err;
		console.error('Update collection error:', err);
		return json({ error: 'Failed to update collection' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, request, platform }) => {
	const db = platform?.env?.DB;

	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	// Auth required for deletion
	const token = getTokenFromRequest(request);
	if (!token) {
		throw error(401, 'Authentication required');
	}

	const user = await validateToken(token, platform?.env as AuthEnv | undefined);
	if (!user) {
		throw error(401, 'Invalid or expired token');
	}

	const collectionId = params.id;

	try {
		const deleted = await deleteCollection(db, collectionId, user.id);

		if (!deleted) {
			throw error(404, 'Collection not found or access denied');
		}

		return json({ success: true });
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) throw err;
		console.error('Delete collection error:', err);
		return json({ error: 'Failed to delete collection' }, { status: 500 });
	}
};
