import { StorefrontError } from './errors';
import type { ReadModel } from './ports';
import type { ApplyResult, ReadModelRow, StorefrontSnapshotV1 } from './types';

interface Row {
	creator_slug: string;
	creator_id: string;
	revision: number;
	state: ReadModelRow['state'];
	snapshot_json: string | null;
	payload_hash: string;
}

async function payloadHash(row: ReadModelRow): Promise<string> {
	const bytes = new TextEncoder().encode(JSON.stringify({ state: row.state, snapshot: row.snapshot }));
	const digest = await crypto.subtle.digest('SHA-256', bytes);
	return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function toRow(row: Row): ReadModelRow {
	return {
		creatorSlug: row.creator_slug,
		creatorId: row.creator_id,
		revision: row.revision,
		state: row.state,
		snapshot: row.snapshot_json ? (JSON.parse(row.snapshot_json) as StorefrontSnapshotV1) : null
	};
}

/**
 * D1 read model (migrations/0001_storefront_public.sql). Rows are never
 * deleted: unpublish, suspend and slug moves write tombstones.
 *
 * Stale-operation rule (CONTRACT.md §7), applied in one statement:
 *   apply      same Creator and incoming.revision > stored.revision
 *   idempotent same Creator, same revision, same payload
 *   stale      same Creator, older revision, or same revision with a different payload
 *   conflict   the slug belongs to another Creator, live or tombstone
 *
 * Revisions are per Creator, so they are never compared across Creators.
 * Reusing a slug for another Creator needs a separate, verified
 * ownership-transfer operation (not in this slice).
 */
export class D1ReadModel implements ReadModel {
	constructor(private readonly db: D1Database) {}

	async apply(row: ReadModelRow): Promise<ApplyResult> {
		const hash = await payloadHash(row);
		try {
			const result = await this.db
				.prepare(
					`INSERT INTO storefront_public (creator_slug, creator_id, revision, state, snapshot_json, payload_hash, updated_at)
					 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
					 ON CONFLICT (creator_slug) DO UPDATE SET
					   creator_id = excluded.creator_id,
					   revision = excluded.revision,
					   state = excluded.state,
					   snapshot_json = excluded.snapshot_json,
					   payload_hash = excluded.payload_hash,
					   updated_at = excluded.updated_at
					 WHERE storefront_public.creator_id = excluded.creator_id
					   AND excluded.revision > storefront_public.revision`
				)
				.bind(
					row.creatorSlug,
					row.creatorId,
					row.revision,
					row.state,
					row.snapshot ? JSON.stringify(row.snapshot) : null,
					hash,
					new Date().toISOString()
				)
				.run();
			if ((result.meta?.changes ?? 0) > 0) return 'applied';

			const stored = await this.db
				.prepare('SELECT creator_id, revision, payload_hash, state FROM storefront_public WHERE creator_slug = ?1')
				.bind(row.creatorSlug)
				.first<Pick<Row, 'creator_id' | 'revision' | 'payload_hash' | 'state'>>();
			if (!stored) return 'stale';
			if (stored.creator_id !== row.creatorId) return 'conflict';
			if (stored.revision === row.revision && stored.payload_hash === hash) return 'idempotent';
			return 'stale';
		} catch (error) {
			throw new StorefrontError('upstream_unavailable', 'Read model write failed', { cause: error });
		}
	}

	async get(creatorSlug: string): Promise<ReadModelRow | null> {
		try {
			const row = await this.db
				.prepare(
					'SELECT creator_slug, creator_id, revision, state, snapshot_json, payload_hash FROM storefront_public WHERE creator_slug = ?1'
				)
				.bind(creatorSlug)
				.first<Row>();
			return row ? toRow(row) : null;
		} catch (error) {
			throw new StorefrontError('upstream_unavailable', 'Read model read failed', { cause: error });
		}
	}
}
