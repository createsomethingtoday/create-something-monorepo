/**
 * TEND Database Queries
 *
 * D1 database access layer for items, sources, and tenants.
 */

import type { DataItem, ItemQuery, Source, Tenant, ItemStatus, CurationAction } from '../sdk/types.js';

type D1Database = {
	prepare: (query: string) => {
		bind: (...values: unknown[]) => {
			first: <T>() => Promise<T | null>;
			all: <T>() => Promise<{ results: T[] }>;
			run: () => Promise<{ success: boolean }>;
		};
		first: <T>() => Promise<T | null>;
		all: <T>() => Promise<{ results: T[] }>;
		run: () => Promise<{ success: boolean }>;
	};
};

// =============================================================================
// ROW TYPES (Database schema)
// =============================================================================

interface ItemRow {
	id: string;
	tenant_id: string;
	source_id: string;
	title: string;
	body: string | null;
	source_type: string;
	source_item_id: string | null;
	source_timestamp: string | null;
	ingested_at: string;
	metadata: string;
	score: number;
	score_breakdown: string;
	status: string;
	curated_by: string | null;
	curated_at: string | null;
	snooze_until: string | null;
}

interface SourceRow {
	id: string;
	tenant_id: string;
	type: string;
	name: string;
	status: string;
	config: string;
	last_sync_at: string | null;
}

interface TenantRow {
	id: string;
	name: string;
	slug: string;
	tier: string;
	settings: string;
}

// =============================================================================
// MAPPERS
// =============================================================================

function mapItemRow(row: ItemRow): DataItem {
	return {
		id: row.id,
		tenantId: row.tenant_id,
		sourceId: row.source_id,
		title: row.title,
		body: row.body ?? undefined,
		sourceType: row.source_type,
		sourceItemId: row.source_item_id ?? undefined,
		sourceTimestamp: row.source_timestamp ? new Date(row.source_timestamp) : undefined,
		ingestedAt: new Date(row.ingested_at),
		metadata: JSON.parse(row.metadata || '{}'),
		score: row.score,
		scoreBreakdown: JSON.parse(row.score_breakdown || '{}'),
		status: row.status as ItemStatus,
		curatedBy: row.curated_by ?? undefined,
		curatedAt: row.curated_at ? new Date(row.curated_at) : undefined,
		snoozeUntil: row.snooze_until ? new Date(row.snooze_until) : undefined,
	};
}

function mapSourceRow(row: SourceRow): Source {
	return {
		id: row.id,
		tenantId: row.tenant_id,
		type: row.type as Source['type'],
		name: row.name,
		status: row.status as Source['status'],
		config: JSON.parse(row.config || '{}'),
		lastSyncAt: row.last_sync_at ? new Date(row.last_sync_at) : undefined,
	};
}

function mapTenantRow(row: TenantRow): Tenant {
	return {
		id: row.id,
		name: row.name,
		slug: row.slug,
		tier: row.tier as Tenant['tier'],
		settings: JSON.parse(row.settings || '{}'),
	};
}

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get a tenant by slug.
 */
export async function getTenantBySlug(db: D1Database, slug: string): Promise<Tenant | null> {
	const row = await db.prepare('SELECT * FROM tenants WHERE slug = ?').bind(slug).first<TenantRow>();
	return row ? mapTenantRow(row) : null;
}

/**
 * Get a tenant by ID.
 */
export async function getTenantById(db: D1Database, id: string): Promise<Tenant | null> {
	const row = await db.prepare('SELECT * FROM tenants WHERE id = ?').bind(id).first<TenantRow>();
	return row ? mapTenantRow(row) : null;
}

/**
 * Get sources for a tenant.
 */
export async function getSourcesForTenant(db: D1Database, tenantId: string): Promise<Source[]> {
	const { results } = await db
		.prepare('SELECT * FROM sources WHERE tenant_id = ? ORDER BY name')
		.bind(tenantId)
		.all<SourceRow>();
	return results.map(mapSourceRow);
}

/**
 * Get items with flexible query options.
 */
export async function getItems(db: D1Database, query: ItemQuery): Promise<DataItem[]> {
	const conditions: string[] = ['tenant_id = ?'];
	const params: unknown[] = [query.tenantId];

	// Status filter
	if (query.status) {
		const statuses = Array.isArray(query.status) ? query.status : [query.status];
		conditions.push(`status IN (${statuses.map(() => '?').join(', ')})`);
		params.push(...statuses);
	}

	// Source type filter
	if (query.sourceType) {
		const types = Array.isArray(query.sourceType) ? query.sourceType : [query.sourceType];
		conditions.push(`source_type IN (${types.map(() => '?').join(', ')})`);
		params.push(...types);
	}

	// Score filters
	if (query.minScore !== undefined) {
		conditions.push('score >= ?');
		params.push(query.minScore);
	}
	if (query.maxScore !== undefined) {
		conditions.push('score <= ?');
		params.push(query.maxScore);
	}

	// Search
	if (query.search) {
		conditions.push('(title LIKE ? OR body LIKE ?)');
		const searchTerm = `%${query.search}%`;
		params.push(searchTerm, searchTerm);
	}

	// Build query
	const sortBy = query.sortBy || 'sourceTimestamp';
	const sortColumn =
		sortBy === 'sourceTimestamp'
			? 'source_timestamp'
			: sortBy === 'ingestedAt'
				? 'ingested_at'
				: 'score';
	const sortOrder = query.sortOrder || 'desc';

	const limit = query.limit || 50;
	const offset = query.offset || 0;

	const sql = `
    SELECT * FROM items
    WHERE ${conditions.join(' AND ')}
    ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}
    LIMIT ? OFFSET ?
  `;

	params.push(limit, offset);

	const { results } = await db.prepare(sql).bind(...params).all<ItemRow>();
	return results.map(mapItemRow);
}

/**
 * Get a single item by ID.
 */
export async function getItemById(
	db: D1Database,
	tenantId: string,
	itemId: string
): Promise<DataItem | null> {
	const row = await db
		.prepare('SELECT * FROM items WHERE tenant_id = ? AND id = ?')
		.bind(tenantId, itemId)
		.first<ItemRow>();
	return row ? mapItemRow(row) : null;
}

/**
 * Update item curation status.
 */
export async function curateItem(
	db: D1Database,
	tenantId: string,
	action: CurationAction
): Promise<boolean> {
	const now = new Date().toISOString();

	let status: ItemStatus;
	switch (action.action) {
		case 'approve':
			status = 'approved';
			break;
		case 'dismiss':
			status = 'dismissed';
			break;
		case 'snooze':
			status = 'snoozed';
			break;
		case 'archive':
			status = 'archived';
			break;
		case 'restore':
			status = 'inbox';
			break;
	}

	const snoozeUntil = action.snoozeUntil?.toISOString() ?? null;

	const result = await db
		.prepare(
			`
      UPDATE items 
      SET status = ?, curated_at = ?, snooze_until = ?, updated_at = ?
      WHERE tenant_id = ? AND id = ?
    `
		)
		.bind(status, now, snoozeUntil, now, tenantId, action.itemId)
		.run();

	return result.success;
}

/**
 * Get item counts by status.
 */
export async function getItemCounts(
	db: D1Database,
	tenantId: string
): Promise<Record<ItemStatus | 'total', number>> {
	const { results } = await db
		.prepare(
			`
      SELECT status, COUNT(*) as count 
      FROM items 
      WHERE tenant_id = ? 
      GROUP BY status
    `
		)
		.bind(tenantId)
		.all<{ status: string; count: number }>();

	const counts: Record<string, number> = {
		inbox: 0,
		approved: 0,
		dismissed: 0,
		snoozed: 0,
		archived: 0,
		total: 0,
	};

	for (const row of results) {
		counts[row.status] = row.count;
		counts.total += row.count;
	}

	return counts as Record<ItemStatus | 'total', number>;
}

/**
 * Get item counts by source.
 */
export async function getItemCountsBySource(
	db: D1Database,
	tenantId: string
): Promise<Record<string, number>> {
	const { results } = await db
		.prepare(
			`
      SELECT source_type, COUNT(*) as count 
      FROM items 
      WHERE tenant_id = ? 
      GROUP BY source_type
    `
		)
		.bind(tenantId)
		.all<{ source_type: string; count: number }>();

	const counts: Record<string, number> = {};
	for (const row of results) {
		counts[row.source_type] = row.count;
	}
	return counts;
}
