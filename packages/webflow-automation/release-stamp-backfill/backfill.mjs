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

	for (let i = 0; i < rows.length; i += WRITE_BATCH) {
		const batch = rows.slice(i, i + WRITE_BATCH).map((row) => {
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

	console.log(`RECEIPT: stamped ${written} versions (${snapshots} with snapshots) at ${stampedAt}.`);
}

main().catch((error) => {
	console.error(error.message);
	process.exit(1);
});
