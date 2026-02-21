#!/usr/bin/env node
/**
 * Daily Asset Link Cleanup
 *
 * Removes archived linked records from an Assets table link field.
 *
 * Criteria for removing a linked record:
 * - Linked record status field `fldQRpdwNXArAOYFA` is "Archived" (case-insensitive), OR
 * - Linked record primary field value contains "archived" (case-insensitive)
 *
 * Target:
 * - Base:  appMoIgXMTTTNIc3p
 * - Table: tblRwzpWoLgE9MrUm
 * - View:  viwk5QUSeUhz5ys4s
 * - Link field on assets: fldByR4rgaKy7VZMU
 */

const AIRTABLE_API_BASE = 'https://api.airtable.com/v0';

const BASE_ID = 'appMoIgXMTTTNIc3p';
const ASSETS_TABLE_ID = 'tblRwzpWoLgE9MrUm';
const VIEW_ID = 'viwk5QUSeUhz5ys4s';

const ASSET_LINK_FIELD_ID = 'fldByR4rgaKy7VZMU';
const LINKED_STATUS_FIELD_ID = 'fldQRpdwNXArAOYFA';

const token = process.env.AIRTABLE_API_TOKEN || process.env.AIRTABLE_API_KEY;
if (!token) {
	console.error('Missing AIRTABLE_API_TOKEN (or AIRTABLE_API_KEY) in env.');
	process.exit(1);
}

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

async function airtableFetch(url, init = {}, { tries = 6 } = {}) {
	let attempt = 0;
	let lastErr;
	while (attempt < tries) {
		attempt += 1;
		try {
			const res = await fetch(url, {
				...init,
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json',
					...(init.headers || {})
				}
			});

			if (res.status === 429 || res.status >= 500) {
				const retryAfter = res.headers.get('retry-after');
				const backoffMs = retryAfter
					? Number(retryAfter) * 1000
					: Math.min(30_000, 500 * 2 ** (attempt - 1));
				await sleep(backoffMs);
				continue;
			}

			if (!res.ok) {
				const text = await res.text().catch(() => '');
				throw new Error(`HTTP ${res.status} ${res.statusText}: ${text.slice(0, 800)}`);
			}

			return res;
		} catch (err) {
			lastErr = err;
			await sleep(Math.min(10_000, 250 * 2 ** (attempt - 1)));
		}
	}
	throw lastErr || new Error('Unknown airtableFetch failure');
}

function chooseLikelyNameField(fields) {
	if (!fields || typeof fields !== 'object') return null;
	if (typeof fields.Name === 'string' && fields.Name.trim()) return 'Name';
	const keyByLower = new Map(Object.keys(fields).map(k => [k.toLowerCase(), k]));
	if (keyByLower.has('name')) return keyByLower.get('name');
	// Heuristic fallback: first short-ish non-empty string field.
	for (const [k, v] of Object.entries(fields)) {
		if (typeof v === 'string') {
			const s = v.trim();
			if (s && s.length <= 200) return k;
		}
	}
	return null;
}

async function listViewRecords(tableId, viewId) {
	const records = [];
	let offset = undefined;
	do {
		const params = new URLSearchParams();
		params.set('view', viewId);
		params.set('pageSize', '100');
		params.set('returnFieldsByFieldId', 'true');
		if (offset) params.set('offset', offset);
		const url = `${AIRTABLE_API_BASE}/${BASE_ID}/${tableId}?${params.toString()}`;
		const res = await airtableFetch(url, { method: 'GET' });
		const data = await res.json();
		if (Array.isArray(data.records)) records.push(...data.records);
		offset = data.offset;
	} while (offset);
	return records;
}

async function getRecord(tableId, recordId) {
	const params = new URLSearchParams();
	params.set('returnFieldsByFieldId', 'true');
	const url = `${AIRTABLE_API_BASE}/${BASE_ID}/${tableId}/${recordId}?${params.toString()}`;
	const res = await airtableFetch(url, { method: 'GET' });
	return res.json();
}

async function getRecordByNames(tableId, recordId) {
	const url = `${AIRTABLE_API_BASE}/${BASE_ID}/${tableId}/${recordId}`;
	const res = await airtableFetch(url, { method: 'GET' });
	return res.json();
}

function normalizeString(v) {
	if (v == null) return '';
	if (Array.isArray(v)) return v.map(normalizeString).join(' ');
	if (typeof v === 'object') return JSON.stringify(v);
	return String(v);
}

function isArchivedStatus(statusValue) {
	const s = normalizeString(statusValue).trim().toLowerCase();
	return s === 'archived';
}

function nameContainsArchived(nameValue) {
	const s = normalizeString(nameValue).toLowerCase();
	return s.includes('archived');
}

async function patchRecords(tableId, recordUpdates) {
	// Airtable API allows up to 10 records per request.
	const url = `${AIRTABLE_API_BASE}/${BASE_ID}/${tableId}`;
	const body = JSON.stringify({ records: recordUpdates, typecast: false });
	const res = await airtableFetch(url, { method: 'PATCH', body });
	return res.json();
}

async function main() {
	const startedAt = new Date().toISOString();
	console.log(JSON.stringify({
		startedAt,
		baseId: BASE_ID,
		assetsTableId: ASSETS_TABLE_ID,
		viewId: VIEW_ID,
		assetLinkFieldId: ASSET_LINK_FIELD_ID,
		linkedStatusFieldId: LINKED_STATUS_FIELD_ID
	}, null, 2));

	const assets = await listViewRecords(ASSETS_TABLE_ID, VIEW_ID);
	console.log(`Fetched ${assets.length} asset records from view.`);

	// Without schema permissions, infer the primary "name" field by fetching a sample record by field names.
	let linkedNameFieldName = null;
	for (const r of assets) {
		const links = r.fields?.[ASSET_LINK_FIELD_ID];
		if (Array.isArray(links) && links[0]) {
			const sample = await getRecordByNames(ASSETS_TABLE_ID, links[0]);
			linkedNameFieldName = chooseLikelyNameField(sample.fields);
			break;
		}
	}
	if (!linkedNameFieldName) {
		// If there are no linked records at all, this run is a no-op; proceed anyway.
		linkedNameFieldName = 'Name';
	}
	console.log(`Inferred linked record name field: ${linkedNameFieldName}`);

	const linkedCache = new Map(); // recordId -> { statusValue, nameValue }
	const missing = new Set();

	for (const r of assets) {
		const links = r.fields?.[ASSET_LINK_FIELD_ID];
		if (!Array.isArray(links) || links.length === 0) continue;
		for (const linkedId of links) {
			if (!linkedCache.has(linkedId)) missing.add(linkedId);
		}
	}

	const linkedIds = Array.from(missing);
	console.log(`Unique linked records to evaluate: ${linkedIds.length}`);

	// Fetch linked records with limited concurrency.
	const concurrency = 6;
	let idx = 0;
	async function worker() {
		while (idx < linkedIds.length) {
			const i = idx;
			idx += 1;
			const id = linkedIds[i];
			try {
				// First fetch by field IDs to read the authoritative status field.
				const recById = await getRecord(ASSETS_TABLE_ID, id);
				const statusValue = recById.fields?.[LINKED_STATUS_FIELD_ID];
				let nameValue = null;

				// Only fetch name if we need it (status not Archived).
				if (!isArchivedStatus(statusValue)) {
					const recByName = await getRecordByNames(ASSETS_TABLE_ID, id);
					nameValue = recByName.fields?.[linkedNameFieldName];
				}

				linkedCache.set(id, { statusValue, nameValue });
			} catch (err) {
				// If a linked record is missing or inaccessible, do not remove it.
				linkedCache.set(id, { statusValue: null, nameValue: null, error: String(err?.message || err) });
			}
		}
	}

	await Promise.all(Array.from({ length: concurrency }, () => worker()));

	let recordsUpdated = 0;
	let linksRemoved = 0;
	const sampleUpdatedRecordIds = [];

	const updates = [];
	for (const asset of assets) {
		const assetId = asset.id;
		const links = asset.fields?.[ASSET_LINK_FIELD_ID];
		if (!Array.isArray(links) || links.length === 0) continue;

		const kept = [];
		let removedForAsset = 0;
		for (const linkedId of links) {
			const info = linkedCache.get(linkedId);
			const archived = isArchivedStatus(info?.statusValue) || nameContainsArchived(info?.nameValue);
			if (archived) {
				removedForAsset += 1;
			} else {
				kept.push(linkedId);
			}
		}

		if (removedForAsset > 0) {
			linksRemoved += removedForAsset;
			updates.push({
				id: assetId,
				fields: {
					[ASSET_LINK_FIELD_ID]: kept
				}
			});
			if (sampleUpdatedRecordIds.length < 10) sampleUpdatedRecordIds.push(assetId);
		}
	}

	console.log(`Assets needing update: ${updates.length}`);

	// Apply updates in batches of 10.
	for (let i = 0; i < updates.length; i += 10) {
		const batch = updates.slice(i, i + 10);
		await patchRecords(ASSETS_TABLE_ID, batch);
		recordsUpdated += batch.length;
	}

	const finishedAt = new Date().toISOString();
	const result = {
		startedAt,
		finishedAt,
		recordsScanned: assets.length,
		recordsUpdated,
		linksRemoved,
		sampleUpdatedRecordIds
	};

	console.log(JSON.stringify(result, null, 2));
	return result;
}

main().catch(err => {
	console.error(err?.stack || String(err));
	process.exit(1);
});
