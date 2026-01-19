/**
 * Collections API
 *
 * CRUD operations for taste collections.
 * GET: List user's collections (auth required) or public collections
 * POST: Create a new collection (auth required)
 *
 * Philosophy: Taste is cultivated through curation.
 * Canon: Privacy is not a feature—it's respect for the user's autonomy.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	createCollection,
	listUserCollections,
	listPublicCollections,
	type CreateCollectionInput,
	type CollectionVisibility
} from '$lib/taste/collections';
import {
	getTokenFromRequest,
	validateToken,
	type AuthEnv
} from '@create-something/components/auth/server';
import { createLogger, validateStringField } from '@create-something/components/utils';

const logger = createLogger('CollectionsAPI');

export const GET: RequestHandler = async ({ request, platform, url }) => {
	const db = platform?.env?.DB;

	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	// Check for public collections request
	const publicOnly = url.searchParams.get('public') === 'true';
	const tags = url.searchParams.get('tags')?.split(',').filter(Boolean);
	const limit = parseInt(url.searchParams.get('limit') ?? '50', 10);
	const offset = parseInt(url.searchParams.get('offset') ?? '0', 10);

	if (publicOnly) {
		// Public collections don't require auth
		const collections = await listPublicCollections(db, { limit, offset, tags });
		return json({ collections });
	}

	// User's collections require auth
	const token = getTokenFromRequest(request);
	if (!token) {
		throw error(401, 'Authentication required');
	}

	const user = await validateToken(token, platform?.env as AuthEnv | undefined);
	if (!user) {
		throw error(401, 'Invalid or expired token');
	}

	try {
		const collections = await listUserCollections(db, user.id, {
			includePrivate: true,
			limit,
			offset
		});

		return json({ collections });
	} catch (err) {
		logger.error('Failed to list collections', { userId: user.id, error: err });
		return json({ error: 'Failed to list collections' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, platform }) => {
	const db = platform?.env?.DB;

	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	// Auth required for creating collections
	const token = getTokenFromRequest(request);
	if (!token) {
		throw error(401, 'Authentication required');
	}

	const user = await validateToken(token, platform?.env as AuthEnv | undefined);
	if (!user) {
		throw error(401, 'Invalid or expired token');
	}

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

	// Validate required fields
	const nameValidation = validateStringField(body.name, 'name', { required: true });
	if (!nameValidation.valid) {
		throw error(400, nameValidation.error);
	}

	// Validate visibility
	const validVisibilities: CollectionVisibility[] = ['private', 'public', 'unlisted'];
	if (body.visibility && !validVisibilities.includes(body.visibility)) {
		throw error(400, `Visibility must be one of: ${validVisibilities.join(', ')}`);
	}

	// Validate tags
	if (body.tags && !Array.isArray(body.tags)) {
		throw error(400, 'Tags must be an array');
	}

	try {
		const input: CreateCollectionInput = {
			userId: user.id,
			name: nameValidation.value,
			description: body.description ?? null,
			visibility: body.visibility ?? 'private',
			tags: body.tags ?? []
		};

		const collection = await createCollection(db, input);

		logger.info('Collection created', { userId: user.id, collectionId: collection.id });
		return json({ collection }, { status: 201 });
	} catch (err) {
		logger.error('Failed to create collection', { userId: user.id, error: err });
		return json({ error: 'Failed to create collection' }, { status: 500 });
	}
};
