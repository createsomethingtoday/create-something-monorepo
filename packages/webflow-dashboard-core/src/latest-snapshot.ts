/**
 * The Marketplace Insights Airtable tables (📊 Category Performance and the
 * Top Templates leaderboard) are append-only in practice: the weekly Fivetran
 * activation adds a fresh set of rows stamped with SNAPSHOT_AT and nobody
 * deletes the previous week's. Reading the view whole therefore returns
 * several weeks stacked on top of each other, and any sum across it multiplies
 * the real 30-day figure. Keep only the rows from the newest snapshot.
 */
export const SNAPSHOT_AT_FIELD = 'SNAPSHOT_AT';

export interface SnapshotStampedRecord {
	fields: Record<string, unknown>;
}

/** The subset of an Airtable `Query` these helpers need. */
export interface PagedQuery<T> {
	eachPage(
		pageCallback: (records: readonly T[], fetchNextPage: () => void) => void,
		done: (error?: Error | null) => void
	): void;
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

/**
 * Same result as `latestSnapshotRecords`, but bounded: the caller sorts the
 * query by SNAPSHOT_AT descending (then whatever rank order it wants), and
 * paging stops at the first row from an older snapshot. The read therefore
 * costs one snapshot's worth of pages however many weeks the table holds.
 */
export function selectLatestSnapshotRecords<T extends SnapshotStampedRecord>(
	query: PagedQuery<T>
): Promise<T[]> {
	return new Promise((resolve, reject) => {
		const kept: T[] = [];
		let latest: number | null = null;
		let sawOlder = false;
		query.eachPage(
			(records, fetchNextPage) => {
				for (const record of records) {
					const time = snapshotTime(record);
					if (time === null) {
						// Unstamped legacy rows only count when nothing stamped exists.
						if (latest === null) kept.push(record);
						continue;
					}
					if (latest === null) {
						latest = time;
						kept.length = 0; // drop any unstamped rows seen before the first stamp
					}
					if (time === latest) kept.push(record);
					else if (time < latest) {
						sawOlder = true;
						break;
					} else {
						// Caller did not sort descending; fall back to a full scan.
						latest = time;
						kept.length = 0;
						kept.push(record);
					}
				}
				if (sawOlder) resolve(kept);
				else fetchNextPage();
			},
			(error) => {
				if (error) reject(error);
				else if (!sawOlder) resolve(kept);
			}
		);
	});
}
