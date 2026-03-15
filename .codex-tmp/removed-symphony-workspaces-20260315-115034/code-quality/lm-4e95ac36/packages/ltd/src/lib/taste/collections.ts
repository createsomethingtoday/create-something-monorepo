/**
 * Taste Collections
 *
 * CRUD operations for user-curated taste collections.
 * Collections allow users to organize taste references into named groups
 * with visibility controls, ordering, and annotations.
 *
 * Philosophy: Taste is cultivated through curation.
 * The act of selecting and organizing reveals understanding.
 *
 * @packageDocumentation
 */

// =============================================================================
// TYPES
// =============================================================================

export type CollectionVisibility = 'private' | 'public' | 'unlisted';

export interface Collection {
	id: string;
	userId: string;
	name: string;
	description: string | null;
	visibility: CollectionVisibility;
	tags: string[];
	itemCount: number;
	createdAt: string;
	updatedAt: string;
}

export interface CollectionItem {
	id: string;
	collectionId: string;
	referenceId: string;
	referenceType: 'example' | 'resource';
	position: number;
	note: string | null;
	addedAt: string;
	// Joined reference data (optional, from examples/resources tables)
	title?: string;
	description?: string;
	imageUrl?: string;
	url?: string;
	year?: number;
	channel?: string;
}

export interface CreateCollectionInput {
	userId: string;
	name: string;
	description?: string | null;
	visibility?: CollectionVisibility;
	tags?: string[];
}

export interface UpdateCollectionInput {
	name?: string;
	description?: string | null;
	visibility?: CollectionVisibility;
	tags?: string[];
}

export interface AddItemInput {
	referenceId: string;
	referenceType: 'example' | 'resource';
	note?: string | null;
	position?: number; // If not provided, adds at end
}

export interface UpdateItemInput {
	note?: string | null;
	position?: number;
}

// =============================================================================
// D1 DATABASE TYPES
// =============================================================================

interface D1Result<T> {
	results?: T[];
	meta?: {
		changes?: number;
	};
}

interface D1PreparedStatement {
	bind(...args: unknown[]): D1PreparedStatement;
	first<T>(): Promise<T | null>;
	all<T>(): Promise<D1Result<T>>;
	run(): Promise<D1Result<unknown>>;
}

interface D1Database {
	prepare(query: string): D1PreparedStatement;
	batch(statements: D1PreparedStatement[]): Promise<D1Result<unknown>[]>;
}

// =============================================================================
// ROW TYPES (Database schema)
// =============================================================================

interface CollectionRow {
	id: string;
	user_id: string;
	name: string;
	description: string | null;
	visibility: string;
	tags: string | null;
	item_count: number;
	created_at: string;
	updated_at: string;
}

interface CollectionItemRow {
	id: string;
	collection_id: string;
	reference_id: string;
	reference_type: string;
	position: number;
	note: string | null;
	added_at: string;
	title?: string;
	description?: string;
	image_url?: string;
	url?: string;
	year?: number;
	channel?: string;
}

// =============================================================================
// ID GENERATION
// =============================================================================

/**
 * Generate a unique ID for collections and items
 * Uses crypto.randomUUID for uniqueness
 */
function generateId(prefix: string): string {
	const uuid = crypto.randomUUID();
	return `${prefix}_${uuid.replace(/-/g, '').slice(0, 16)}`;
}

// =============================================================================
// ROW TO MODEL CONVERSION
// =============================================================================

function rowToCollection(row: CollectionRow): Collection {
	let tags: string[] = [];
	if (row.tags) {
		try {
			tags = JSON.parse(row.tags);
		} catch {
			tags = [];
		}
	}

	return {
		id: row.id,
		userId: row.user_id,
		name: row.name,
		description: row.description,
		visibility: row.visibility as CollectionVisibility,
		tags,
		itemCount: row.item_count,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function rowToCollectionItem(row: CollectionItemRow): CollectionItem {
	return {
		id: row.id,
		collectionId: row.collection_id,
		referenceId: row.reference_id,
		referenceType: row.reference_type as 'example' | 'resource',
		position: row.position,
		note: row.note,
		addedAt: row.added_at,
		title: row.title,
		description: row.description,
		imageUrl: row.image_url,
		url: row.url,
		year: row.year,
		channel: row.channel,
	};
}

// =============================================================================
// COLLECTION CRUD
// =============================================================================

/**
 * Create a new collection
 */
export async function createCollection(
	db: D1Database,
	input: CreateCollectionInput
): Promise<Collection> {
	const id = generateId('col');
	const now = new Date().toISOString();
	const tagsJson = input.tags ? JSON.stringify(input.tags) : null;

	await db
		.prepare(
			`
			INSERT INTO taste_collections (id, user_id, name, description, visibility, tags, item_count, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
		`
		)
		.bind(
			id,
			input.userId,
			input.name,
			input.description ?? null,
			input.visibility ?? 'private',
			tagsJson,
			now,
			now
		)
		.run();

	// Update user's collection count in profile
	await db
		.prepare(
			`
			INSERT INTO taste_profiles (user_id, collection_count, created_at, updated_at)
			VALUES (?, 1, ?, ?)
			ON CONFLICT(user_id) DO UPDATE SET
				collection_count = collection_count + 1,
				updated_at = ?
		`
		)
		.bind(input.userId, now, now, now)
		.run();

	return {
		id,
		userId: input.userId,
		name: input.name,
		description: input.description ?? null,
		visibility: input.visibility ?? 'private',
		tags: input.tags ?? [],
		itemCount: 0,
		createdAt: now,
		updatedAt: now,
	};
}

/**
 * Get a collection by ID
 * Returns null if not found or user doesn't have access
 */
export async function getCollection(
	db: D1Database,
	collectionId: string,
	userId?: string
): Promise<Collection | null> {
	const row = await db
		.prepare(
			`
			SELECT * FROM taste_collections WHERE id = ?
		`
		)
		.bind(collectionId)
		.first<CollectionRow>();

	if (!row) return null;

	// Check visibility/ownership
	if (row.visibility === 'private' && row.user_id !== userId) {
		return null;
	}

	return rowToCollection(row);
}

/**
 * List collections for a user
 */
export async function listUserCollections(
	db: D1Database,
	userId: string,
	options?: {
		includePrivate?: boolean;
		limit?: number;
		offset?: number;
	}
): Promise<Collection[]> {
	const { includePrivate = true, limit = 50, offset = 0 } = options ?? {};

	let query = `
		SELECT * FROM taste_collections
		WHERE user_id = ?
	`;

	if (!includePrivate) {
		query += ` AND visibility != 'private'`;
	}

	query += ` ORDER BY updated_at DESC LIMIT ? OFFSET ?`;

	const result = await db.prepare(query).bind(userId, limit, offset).all<CollectionRow>();

	return (result.results ?? []).map(rowToCollection);
}

/**
 * List public collections (for discovery)
 */
export async function listPublicCollections(
	db: D1Database,
	options?: {
		limit?: number;
		offset?: number;
		tags?: string[];
	}
): Promise<Collection[]> {
	const { limit = 50, offset = 0, tags } = options ?? {};

	let query = `
		SELECT * FROM taste_collections
		WHERE visibility = 'public'
	`;

	const params: unknown[] = [];

	// Tag filtering using JSON functions
	if (tags && tags.length > 0) {
		// SQLite JSON contains check for each tag
		const tagClauses = tags.map(() => `tags LIKE ?`);
		query += ` AND (${tagClauses.join(' OR ')})`;
		tags.forEach((tag) => params.push(`%"${tag}"%`));
	}

	query += ` ORDER BY updated_at DESC LIMIT ? OFFSET ?`;
	params.push(limit, offset);

	const result = await db.prepare(query).bind(...params).all<CollectionRow>();

	return (result.results ?? []).map(rowToCollection);
}

/**
 * Update a collection
 */
export async function updateCollection(
	db: D1Database,
	collectionId: string,
	userId: string,
	input: UpdateCollectionInput
): Promise<Collection | null> {
	// First verify ownership
	const existing = await db
		.prepare(`SELECT * FROM taste_collections WHERE id = ? AND user_id = ?`)
		.bind(collectionId, userId)
		.first<CollectionRow>();

	if (!existing) return null;

	const now = new Date().toISOString();
	const updates: string[] = [];
	const params: unknown[] = [];

	if (input.name !== undefined) {
		updates.push('name = ?');
		params.push(input.name);
	}

	if (input.description !== undefined) {
		updates.push('description = ?');
		params.push(input.description);
	}

	if (input.visibility !== undefined) {
		updates.push('visibility = ?');
		params.push(input.visibility);
	}

	if (input.tags !== undefined) {
		updates.push('tags = ?');
		params.push(JSON.stringify(input.tags));
	}

	if (updates.length === 0) {
		return rowToCollection(existing);
	}

	updates.push('updated_at = ?');
	params.push(now);
	params.push(collectionId, userId);

	await db
		.prepare(
			`
			UPDATE taste_collections
			SET ${updates.join(', ')}
			WHERE id = ? AND user_id = ?
		`
		)
		.bind(...params)
		.run();

	// Fetch updated row
	const updated = await db
		.prepare(`SELECT * FROM taste_collections WHERE id = ?`)
		.bind(collectionId)
		.first<CollectionRow>();

	return updated ? rowToCollection(updated) : null;
}

/**
 * Delete a collection and all its items
 */
export async function deleteCollection(
	db: D1Database,
	collectionId: string,
	userId: string
): Promise<boolean> {
	// Verify ownership
	const existing = await db
		.prepare(`SELECT id FROM taste_collections WHERE id = ? AND user_id = ?`)
		.bind(collectionId, userId)
		.first<{ id: string }>();

	if (!existing) return false;

	const now = new Date().toISOString();

	// Delete collection (items cascade due to foreign key)
	await db
		.prepare(`DELETE FROM taste_collections WHERE id = ? AND user_id = ?`)
		.bind(collectionId, userId)
		.run();

	// Update user's collection count
	await db
		.prepare(
			`
			UPDATE taste_profiles
			SET collection_count = MAX(0, collection_count - 1), updated_at = ?
			WHERE user_id = ?
		`
		)
		.bind(now, userId)
		.run();

	return true;
}

// =============================================================================
// COLLECTION ITEMS CRUD
// =============================================================================

/**
 * Add an item to a collection
 */
export async function addItemToCollection(
	db: D1Database,
	collectionId: string,
	userId: string,
	input: AddItemInput
): Promise<CollectionItem | null> {
	// Verify ownership
	const collection = await db
		.prepare(`SELECT id FROM taste_collections WHERE id = ? AND user_id = ?`)
		.bind(collectionId, userId)
		.first<{ id: string }>();

	if (!collection) return null;

	// Check if item already exists
	const existing = await db
		.prepare(
			`SELECT id FROM taste_collection_items WHERE collection_id = ? AND reference_id = ?`
		)
		.bind(collectionId, input.referenceId)
		.first<{ id: string }>();

	if (existing) {
		// Return existing item
		const row = await db
			.prepare(`SELECT * FROM taste_collection_items WHERE id = ?`)
			.bind(existing.id)
			.first<CollectionItemRow>();
		return row ? rowToCollectionItem(row) : null;
	}

	// Get position for new item
	let position = input.position;
	if (position === undefined) {
		const maxPos = await db
			.prepare(
				`SELECT MAX(position) as max_pos FROM taste_collection_items WHERE collection_id = ?`
			)
			.bind(collectionId)
			.first<{ max_pos: number | null }>();
		position = (maxPos?.max_pos ?? -1) + 1;
	}

	const id = generateId('ci');
	const now = new Date().toISOString();

	await db
		.prepare(
			`
			INSERT INTO taste_collection_items (id, collection_id, reference_id, reference_type, position, note, added_at)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`
		)
		.bind(id, collectionId, input.referenceId, input.referenceType, position, input.note ?? null, now)
		.run();

	// Update item count
	await db
		.prepare(
			`
			UPDATE taste_collections
			SET item_count = item_count + 1, updated_at = ?
			WHERE id = ?
		`
		)
		.bind(now, collectionId)
		.run();

	return {
		id,
		collectionId,
		referenceId: input.referenceId,
		referenceType: input.referenceType,
		position,
		note: input.note ?? null,
		addedAt: now,
	};
}

/**
 * Get items in a collection with reference details
 */
export async function getCollectionItems(
	db: D1Database,
	collectionId: string,
	userId?: string
): Promise<CollectionItem[]> {
	// Check if user can access this collection
	const collection = await db
		.prepare(`SELECT visibility, user_id FROM taste_collections WHERE id = ?`)
		.bind(collectionId)
		.first<{ visibility: string; user_id: string }>();

	if (!collection) return [];

	// Private collections only accessible by owner
	if (collection.visibility === 'private' && collection.user_id !== userId) {
		return [];
	}

	const result = await db
		.prepare(
			`
			SELECT
				ci.id,
				ci.collection_id,
				ci.reference_id,
				ci.reference_type,
				ci.position,
				ci.note,
				ci.added_at,
				COALESCE(e.title, r.title) as title,
				COALESCE(e.description, r.description) as description,
				e.image_url,
				r.url,
				COALESCE(e.year, r.year) as year,
				e.channel
			FROM taste_collection_items ci
			LEFT JOIN examples e ON ci.reference_type = 'example' AND ci.reference_id = e.id
			LEFT JOIN resources r ON ci.reference_type = 'resource' AND ci.reference_id = r.id
			WHERE ci.collection_id = ?
			ORDER BY ci.position ASC
		`
		)
		.bind(collectionId)
		.all<CollectionItemRow>();

	return (result.results ?? []).map(rowToCollectionItem);
}

/**
 * Update an item in a collection (note or position)
 */
export async function updateCollectionItem(
	db: D1Database,
	itemId: string,
	userId: string,
	input: UpdateItemInput
): Promise<CollectionItem | null> {
	// Verify ownership through collection
	const item = await db
		.prepare(
			`
			SELECT ci.*, tc.user_id as owner_id
			FROM taste_collection_items ci
			JOIN taste_collections tc ON ci.collection_id = tc.id
			WHERE ci.id = ?
		`
		)
		.bind(itemId)
		.first<CollectionItemRow & { owner_id: string }>();

	if (!item || item.owner_id !== userId) return null;

	const updates: string[] = [];
	const params: unknown[] = [];

	if (input.note !== undefined) {
		updates.push('note = ?');
		params.push(input.note);
	}

	if (input.position !== undefined) {
		updates.push('position = ?');
		params.push(input.position);
	}

	if (updates.length === 0) {
		return rowToCollectionItem(item);
	}

	params.push(itemId);

	await db
		.prepare(
			`
			UPDATE taste_collection_items
			SET ${updates.join(', ')}
			WHERE id = ?
		`
		)
		.bind(...params)
		.run();

	// Update collection's updated_at timestamp
	const now = new Date().toISOString();
	await db
		.prepare(`UPDATE taste_collections SET updated_at = ? WHERE id = ?`)
		.bind(now, item.collection_id)
		.run();

	// Fetch updated item
	const updated = await db
		.prepare(`SELECT * FROM taste_collection_items WHERE id = ?`)
		.bind(itemId)
		.first<CollectionItemRow>();

	return updated ? rowToCollectionItem(updated) : null;
}

/**
 * Remove an item from a collection
 */
export async function removeItemFromCollection(
	db: D1Database,
	itemId: string,
	userId: string
): Promise<boolean> {
	// Verify ownership through collection
	const item = await db
		.prepare(
			`
			SELECT ci.collection_id, tc.user_id as owner_id
			FROM taste_collection_items ci
			JOIN taste_collections tc ON ci.collection_id = tc.id
			WHERE ci.id = ?
		`
		)
		.bind(itemId)
		.first<{ collection_id: string; owner_id: string }>();

	if (!item || item.owner_id !== userId) return false;

	await db.prepare(`DELETE FROM taste_collection_items WHERE id = ?`).bind(itemId).run();

	// Update item count
	const now = new Date().toISOString();
	await db
		.prepare(
			`
			UPDATE taste_collections
			SET item_count = MAX(0, item_count - 1), updated_at = ?
			WHERE id = ?
		`
		)
		.bind(now, item.collection_id)
		.run();

	return true;
}

/**
 * Reorder items in a collection
 * Accepts an array of item IDs in the new order
 */
export async function reorderCollectionItems(
	db: D1Database,
	collectionId: string,
	userId: string,
	itemIds: string[]
): Promise<boolean> {
	// Verify ownership
	const collection = await db
		.prepare(`SELECT id FROM taste_collections WHERE id = ? AND user_id = ?`)
		.bind(collectionId, userId)
		.first<{ id: string }>();

	if (!collection) return false;

	// Update positions in batch
	const statements = itemIds.map((itemId, index) =>
		db
			.prepare(`UPDATE taste_collection_items SET position = ? WHERE id = ? AND collection_id = ?`)
			.bind(index, itemId, collectionId)
	);

	await db.batch(statements);

	// Update collection's updated_at
	const now = new Date().toISOString();
	await db
		.prepare(`UPDATE taste_collections SET updated_at = ? WHERE id = ?`)
		.bind(now, collectionId)
		.run();

	return true;
}
