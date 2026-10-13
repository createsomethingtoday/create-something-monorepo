/**
 * The Marketplace Insights Airtable tables (📊 Category Performance and the
 * Top Templates leaderboard) are append-only in practice: each weekly writer
 * adds a fresh set of rows stamped with SNAPSHOT_AT and nobody deletes the
 * previous week's. Reading the view whole therefore returns several weeks
 * stacked on top of each other, and any sum across it multiplies the real
 * 30-day figure. Keep only the rows from the newest snapshot.
 */
export const SNAPSHOT_AT_FIELD = 'SNAPSHOT_AT';

export interface SnapshotStampedRecord {
	fields: Record<string, unknown>;
}

function snapshotTime(record: SnapshotStampedRecord): number | null {
	const raw = record.fields[SNAPSHOT_AT_FIELD];
	const value = Array.isArray(raw) ? raw[0] : raw;
	if (typeof value !== 'string' || !value.trim()) return null;
	const parsed = Date.parse(value);
	return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Rows from the newest SNAPSHOT_AT only. Rows without a parseable stamp are
 * dropped when any stamped row exists; a table with no stamps at all is
 * returned unchanged so legacy single-snapshot tables keep working.
 */
export function latestSnapshotRecords<T extends SnapshotStampedRecord>(records: readonly T[]): T[] {
	let latest: number | null = null;
	for (const record of records) {
		const time = snapshotTime(record);
		if (time !== null && (latest === null || time > latest)) latest = time;
	}
	if (latest === null) return [...records];
	return records.filter((record) => snapshotTime(record) === latest);
}
