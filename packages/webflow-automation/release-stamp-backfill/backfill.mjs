#!/usr/bin/env node
/**
 * Release-evidence backfill (CRE-1874).
 *
 * Stamps 📅Feedback Released At and snapshots 📝Review Feedback into
 * 🌐Released Feedback (Snapshot) for every 🖌️Asset Versions row whose
 * 📝Review Status sits in a notification-released state (📤Changes Requested
 * or ❌Rejected — never the "(No Notification)" variants, which are
 * deliberately silent) and which the release-evidence automation
 * (wflnGkIDBgGGpKru9) predates.
 *
 * Idempotent: only unstamped rows match the filter, so reruns are safe and a
 * crash mid-run resumes by rerunning. Writes touch ONLY the two new fields —
 * never a status — so no notification automation can fire.
 *
 * Usage:
 *   AIRTABLE_API_TOKEN=... node backfill.mjs --dry-run   # count only
 *   AIRTABLE_API_TOKEN=... node backfill.mjs             # stamp
 */

const BASE_ID = 'appMoIgXMTTTNIc3p';
const VERSIONS_TABLE_ID = 'tblHxZ2hgSFLZxsZu';

const FIELD = {
	reviewStatus: 'flde8Huk5NRIdm2wZ',
	reviewFeedback: 'fldHxIGHMHn4xb9U4',
	releasedAt: 'flddzMIDaAO9TSbKT',
	releasedFeedbackSnapshot: 'fldd1FbAW3sVFw0UU'
};

// Exact released statuses. "(No Notification)" variants are excluded on
// purpose — the partnership shield and silent paths must stay unstamped.
const RELEASED_STATUSES = ['📤Changes Requested', '❌Rejected'];

const API = 'https://api.airtable.com/v0';
const TOKEN = process.env.AIRTABLE_API_TOKEN;
const DRY_RUN = process.argv.includes('--dry-run');
const PACE_MS = 250; // < 5 requests/sec/base
const WRITE_BATCH = 10; // Airtable REST maximum per PATCH

if (!TOKEN) {
	console.error('AIRTABLE_API_TOKEN is required');
	process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function airtableRequest(path, options = {}, attempt = 1) {
	const response = await fetch(`${API}${path}`, {
		...options,
		headers: {
			Authorization: `Bearer ${TOKEN}`,
			'Content-Type': 'application/json',
			...options.headers
		}
	});

	if (response.status === 429 || response.status >= 500) {
		if (attempt > 4) {
			throw new Error(`Airtable ${response.status} after ${attempt} attempts on ${path}`);
		}
		const waitMs = response.status === 429 ? 31_000 : 2_000 * attempt;
		console.log(`  ${response.status} — waiting ${waitMs / 1000}s (attempt ${attempt})`);
		await sleep(waitMs);
		return airtableRequest(path, options, attempt + 1);
	}

	if (!response.ok) {
		throw new Error(`Airtable ${response.status}: ${await response.text()}`);
	}

	return response.json();
}

async function collectUnstampedReleasedVersions() {
	const statusClauses = RELEASED_STATUSES.map(
		(status) => `{${FIELD.reviewStatus}} = '${status}'`
	).join(', ');
	const formula = `AND(OR(${statusClauses}), {${FIELD.releasedAt}} = BLANK())`;

	const rows = [];
	let offset;

	do {
		const params = new URLSearchParams({
			filterByFormula: formula,
			returnFieldsByFieldId: 'true',
			pageSize: '100'
		});
		params.append('fields[]', FIELD.reviewFeedback);
		if (offset) params.set('offset', offset);

		const page = await airtableRequest(`/${BASE_ID}/${VERSIONS_TABLE_ID}?${params}`);
		rows.push(...page.records);
		offset = page.offset;

		if (rows.length % 1000 < 100) console.log(`  scanned ${rows.length} rows…`);
		await sleep(PACE_MS);
	} while (offset);

	return rows;
}

/**
 * Re-fetch a batch immediately before writing it. Live records change during
 * the multi-minute run — e.g. the partnership shield converting a transient
 * ❌Rejected into ❌Rejected (No Notification) — and a stale row must not be
 * stamped. Returns only rows STILL unstamped and STILL in a released status,
 * with fresh feedback for the snapshot.
 */
async function revalidateBatch(ids) {
	const idClauses = ids.map((id) => `RECORD_ID() = '${id}'`).join(', ');
	const statusClauses = RELEASED_STATUSES.map(
		(status) => `{${FIELD.reviewStatus}} = '${status}'`
	).join(', ');

	const params = new URLSearchParams({
		filterByFormula: `AND(OR(${idClauses}), OR(${statusClauses}), {${FIELD.releasedAt}} = BLANK())`,
		returnFieldsByFieldId: 'true',
		pageSize: '100'
	});
	params.append('fields[]', FIELD.reviewFeedback);

	const page = await airtableRequest(`/${BASE_ID}/${VERSIONS_TABLE_ID}?${params}`);
	return page.records;
}

async function main() {
	console.log(`Collecting unstamped released versions${DRY_RUN ? ' (dry run)' : ''}…`);
	const rows = await collectUnstampedReleasedVersions();
	const withFeedback = rows.filter(
		(row) => typeof row.fields[FIELD.reviewFeedback] === 'string' && row.fields[FIELD.reviewFeedback].trim()
	);

	console.log(`Found ${rows.length} unstamped released versions (${withFeedback.length} carry feedback).`);
	if (DRY_RUN || rows.length === 0) return;

	const stampedAt = new Date().toISOString();
	let written = 0;
	let snapshots = 0;
	let skippedStale = 0;

	for (let i = 0; i < rows.length; i += WRITE_BATCH) {
		const chunkIds = rows.slice(i, i + WRITE_BATCH).map((row) => row.id);

		// Time-of-check/time-of-use guard: only stamp rows that are still
		// eligible RIGHT NOW, using their fresh feedback for the snapshot.
		const fresh = await revalidateBatch(chunkIds);
		skippedStale += chunkIds.length - fresh.length;
		await sleep(PACE_MS);
		if (fresh.length === 0) continue;

		const batch = fresh.map((row) => {
			const feedback = row.fields[FIELD.reviewFeedback];
			const fields = { [FIELD.releasedAt]: stampedAt };
			if (typeof feedback === 'string' && feedback.trim()) {
				fields[FIELD.releasedFeedbackSnapshot] = feedback;
				snapshots += 1;
			}
			return { id: row.id, fields };
		});

		await airtableRequest(`/${BASE_ID}/${VERSIONS_TABLE_ID}`, {
			method: 'PATCH',
			body: JSON.stringify({ records: batch })
		});

		written += batch.length;
		if (written % 500 < WRITE_BATCH) console.log(`  stamped ${written}/${rows.length}…`);
		await sleep(PACE_MS);
	}

	console.log(
		`RECEIPT: stamped ${written} versions (${snapshots} with snapshots, ${skippedStale} skipped as stale) at ${stampedAt}.`
	);

	await sweepSilencedStamps(stampedAt);
}

/**
 * Compensating sweep for the irreducible write race: Airtable's REST API has
 * no conditional writes, so a row can shield-convert to a "(No Notification)"
 * status in the instant between revalidation and its PATCH. After all writes,
 * find rows stamped BY THIS RUN that now sit in a silenced status and clear
 * their evidence. Clearing is conservative-safe: the dashboard hides silenced
 * rounds regardless, unstamped rows fall back to status gating, and a genuine
 * re-release re-stamps via the automation. Stamps from other runs or the
 * automation are never touched.
 */
async function sweepSilencedStamps(stampedAt) {
	const silencedStatuses = [
		'📤Changes Requested (No Notification)',
		'❌Rejected (No Notification)',
		'✅Approved (No Notification)'
	];
	const statusClauses = silencedStatuses
		.map((status) => `{${FIELD.reviewStatus}} = '${status}'`)
		.join(', ');

	// Paginate: older/organic stamps can legitimately sit in silenced
	// statuses, and a race victim must be found even beyond the first page.
	const silencedStamped = [];
	let offset;
	do {
		const params = new URLSearchParams({
			filterByFormula: `AND({${FIELD.releasedAt}} != BLANK(), OR(${statusClauses}))`,
			returnFieldsByFieldId: 'true',
			pageSize: '100'
		});
		params.append('fields[]', FIELD.releasedAt);
		if (offset) params.set('offset', offset);

		const page = await airtableRequest(`/${BASE_ID}/${VERSIONS_TABLE_ID}?${params}`);
		silencedStamped.push(...page.records);
		offset = page.offset;
		await sleep(PACE_MS);
	} while (offset);

	const raceVictims = silencedStamped.filter(
		(row) => row.fields[FIELD.releasedAt] === stampedAt
	);

	if (raceVictims.length === 0) {
		console.log('SWEEP: no silenced rows carry this run’s stamp — clean.');
		return;
	}

	let cleared = 0;
	for (let i = 0; i < raceVictims.length; i += WRITE_BATCH) {
		const chunkIds = raceVictims.slice(i, i + WRITE_BATCH).map((row) => row.id);

		// Re-check right before clearing: a victim that flipped back to a
		// released status and was re-stamped by the automation carries a NEWER
		// timestamp — its legitimate evidence must not be erased.
		const idClauses = chunkIds.map((id) => `RECORD_ID() = '${id}'`).join(', ');
		const recheckParams = new URLSearchParams({
			filterByFormula: `AND(OR(${idClauses}), OR(${statusClauses}))`,
			returnFieldsByFieldId: 'true',
			pageSize: '100'
		});
		recheckParams.append('fields[]', FIELD.releasedAt);
		const recheck = await airtableRequest(`/${BASE_ID}/${VERSIONS_TABLE_ID}?${recheckParams}`);
		await sleep(PACE_MS);

		const stillVictims = recheck.records.filter(
			(row) => row.fields[FIELD.releasedAt] === stampedAt
		);
		if (stillVictims.length === 0) continue;

		const batch = stillVictims.map((row) => ({
			id: row.id,
			fields: { [FIELD.releasedAt]: null, [FIELD.releasedFeedbackSnapshot]: null }
		}));
		await airtableRequest(`/${BASE_ID}/${VERSIONS_TABLE_ID}`, {
			method: 'PATCH',
			body: JSON.stringify({ records: batch })
		});
		cleared += batch.length;
		console.log(`SWEEP: cleared ${batch.map((row) => row.id).join(', ')}`);
		await sleep(PACE_MS);
	}

	console.log(`SWEEP: cleared ${cleared} race-stamped silenced rows.`);
}

main().catch((error) => {
	console.error(error.message);
	process.exit(1);
});
