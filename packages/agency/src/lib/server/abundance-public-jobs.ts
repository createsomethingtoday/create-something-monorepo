import type { PublicJob, PublicJobIngestionRun, PublicJobSearchFilters } from '$lib/types/abundance';
import {
	buildPublicJobUpsert,
	normalizeBrightDataJobRecord,
	parseBrightDataJobsResponse
} from '$lib/abundance/public-jobs';

export type BrightDataJobsFilter = {
	query?: string;
	location?: string;
	state?: string;
	posted_after?: string;
	source_system?: string;
	limit?: number;
};

export type BrightDataJobsFetchResult = {
	records: Record<string, unknown>[];
	snapshotId?: string;
	snapshotStatus?: string;
	rawResponse: unknown;
};

export type BrightDataSnapshotOptions = {
	waitForSnapshot?: boolean;
	snapshotTimeoutMs?: number;
	snapshotPollIntervalMs?: number;
};

type BrightDataEnv = {
	BRIGHT_DATA_API_TOKEN?: string;
	ABUNDANCE_BRIGHT_DATA_JOBS_DATASET_ID?: string;
	BRIGHT_DATA_JOBS_DATASET_ID?: string;
};

export async function fetchBrightDataJobs(
	env: BrightDataEnv,
	filters: BrightDataJobsFilter,
	options: BrightDataSnapshotOptions = {}
): Promise<BrightDataJobsFetchResult> {
	const token = env.BRIGHT_DATA_API_TOKEN?.trim();
	const datasetId = env.ABUNDANCE_BRIGHT_DATA_JOBS_DATASET_ID?.trim() ?? env.BRIGHT_DATA_JOBS_DATASET_ID?.trim();

	if (!token) {
		throw new Error('BRIGHT_DATA_API_TOKEN is not configured.');
	}

	if (!datasetId) {
		throw new Error('ABUNDANCE_BRIGHT_DATA_JOBS_DATASET_ID or BRIGHT_DATA_JOBS_DATASET_ID is not configured.');
	}

	const body = buildBrightDataFilterRequest(datasetId, filters);

	const response = await fetch('https://api.brightdata.com/datasets/filter', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(body)
	});

	const text = await response.text();
	const payload = parseJsonBody(text);

	if (!response.ok) {
		throw new Error(`Bright Data jobs filter failed with HTTP ${response.status}: ${text.slice(0, 500)}`);
	}

	const parsed = parseBrightDataJobsResponse(payload);
	if (parsed.snapshotId && parsed.records.length === 0 && options.waitForSnapshot) {
		return fetchBrightDataJobsSnapshot(env, parsed.snapshotId, options, payload);
	}

	return {
		...parsed,
		snapshotStatus: parsed.snapshotId ? extractSnapshotStatus(payload) ?? 'running' : undefined,
		rawResponse: payload
	};
}

export async function fetchBrightDataJobsSnapshot(
	env: BrightDataEnv,
	snapshotId: string,
	options: BrightDataSnapshotOptions = {},
	initialResponse?: unknown
): Promise<BrightDataJobsFetchResult> {
	const token = env.BRIGHT_DATA_API_TOKEN?.trim();
	const cleanedSnapshotId = snapshotId.trim();

	if (!token) {
		throw new Error('BRIGHT_DATA_API_TOKEN is not configured.');
	}

	if (!cleanedSnapshotId) {
		throw new Error('Bright Data snapshot_id is required.');
	}

	const progress = options.waitForSnapshot
		? await waitForBrightDataSnapshot(token, cleanedSnapshotId, options)
		: await getBrightDataSnapshotProgress(token, cleanedSnapshotId);
	const snapshotStatus = extractSnapshotStatus(progress) ?? 'unknown';

	if (!isSnapshotReady(snapshotStatus)) {
		if (isSnapshotFailed(snapshotStatus)) {
			throw new Error(`Bright Data snapshot ${cleanedSnapshotId} failed with status "${snapshotStatus}".`);
		}

		return {
			records: [],
			snapshotId: cleanedSnapshotId,
			snapshotStatus,
			rawResponse: {
				initial_response: initialResponse,
				progress
			}
		};
	}

	const download = await downloadBrightDataSnapshot(token, cleanedSnapshotId, options);
	if (!download.ready) {
		return {
			records: [],
			snapshotId: cleanedSnapshotId,
			snapshotStatus: 'download_pending',
			rawResponse: {
				initial_response: initialResponse,
				progress,
				download: download.payload
			}
		};
	}

	const parsed = parseBrightDataJobsResponse(download.payload);

	return {
		records: parsed.records,
		snapshotId: parsed.snapshotId ?? cleanedSnapshotId,
		snapshotStatus,
		rawResponse: {
			initial_response: initialResponse,
			progress,
			download: download.payload
		}
	};
}

export function buildBrightDataFilterRequest(datasetId: string, filters: BrightDataJobsFilter) {
	const recordsLimit = clampLimit(filters.limit ?? 50, 1, 1000);
	const clauses: Array<{ name: string; operator: string; value: string | string[] }> = [];

	if (filters.query?.trim()) {
		clauses.push({ name: 'job_title', operator: 'includes', value: filters.query.trim() });
	}

	if (filters.location?.trim()) {
		clauses.push({ name: 'location', operator: 'includes', value: filters.location.trim() });
	}

	if (filters.state?.trim()) {
		clauses.push({ name: 'location', operator: 'includes', value: filters.state.trim().toUpperCase() });
	}

	if (filters.posted_after?.trim()) {
		clauses.push({ name: 'date_posted_parsed', operator: '>=', value: normalizeBrightDataDateFilter(filters.posted_after) });
	}

	if (clauses.length === 0) {
		throw new Error('At least one Bright Data filter is required to avoid unbounded paid collection.');
	}

	return {
		dataset_id: datasetId,
		records_limit: recordsLimit,
		filter: clauses.length === 1 ? clauses[0] : { operator: 'and', filters: clauses }
	};
}

export async function normalizeBrightDataRecordsForAbundance(input: {
	records: Record<string, unknown>[];
	filters: BrightDataJobsFilter;
	fetchedAt?: string;
	snapshotId?: string;
	rawPayloadExpiresAt?: string;
}): Promise<PublicJob[]> {
	const fetchedAt = input.fetchedAt ?? new Date().toISOString();

	return Promise.all(
		input.records.map((record) =>
			normalizeBrightDataJobRecord(record, {
				sourceSystem: input.filters.source_system,
				fetchedAt,
				providerSnapshotId: input.snapshotId,
				rawPayloadExpiresAt: input.rawPayloadExpiresAt,
				metadata: {
					abundance_pipeline: 'public_jobs',
					requested_filters: input.filters
				}
			})
		)
	);
}

export async function upsertPublicJobs(db: D1Database, jobs: PublicJob[]): Promise<number> {
	for (const job of jobs) {
		const statement = buildPublicJobUpsert(job);
		await db.prepare(statement.sql).bind(...statement.args).run();
	}

	return jobs.length;
}

export async function createPublicJobIngestionRun(
	db: D1Database,
	input: {
		id: string;
		provider: string;
		sourceSystem?: string;
		status: PublicJobIngestionRun['status'];
		providerSnapshotId?: string;
		requestedFilters: Record<string, unknown>;
		resultCount?: number;
		error?: string;
		metadata?: Record<string, unknown>;
		startedAt?: string;
		finishedAt?: string;
	}
): Promise<PublicJobIngestionRun> {
	const startedAt = input.startedAt ?? new Date().toISOString();
	const resultCount = input.resultCount ?? 0;

	await db.prepare(`
		INSERT INTO abundance_public_job_ingestion_runs (
			id, provider, source_system, status, provider_snapshot_id, requested_filters_json,
			result_count, error, metadata_json, started_at, finished_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`).bind(
		input.id,
		input.provider,
		input.sourceSystem ?? null,
		input.status,
		input.providerSnapshotId ?? null,
		JSON.stringify(input.requestedFilters),
		resultCount,
		input.error ?? null,
		JSON.stringify(input.metadata ?? {}),
		startedAt,
		input.finishedAt ?? null
	).run();

	return {
		id: input.id,
		provider: input.provider,
		source_system: input.sourceSystem,
		status: input.status,
		provider_snapshot_id: input.providerSnapshotId,
		requested_filters_json: JSON.stringify(input.requestedFilters),
		result_count: resultCount,
		error: input.error,
		metadata_json: JSON.stringify(input.metadata ?? {}),
		started_at: startedAt,
		finished_at: input.finishedAt
	};
}

export async function listPublicJobs(
	db: D1Database,
	filters: PublicJobSearchFilters
): Promise<{ jobs: PublicJob[]; limit: number; offset: number }> {
	const limit = clampLimit(filters.limit ?? 20, 1, 100);
	const offset = Math.max(0, filters.offset ?? 0);
	const where: string[] = [];
	const args: unknown[] = [];

	if (filters.provider) {
		where.push('provider = ?');
		args.push(filters.provider);
	}

	if (filters.source_system) {
		where.push('source_system = ?');
		args.push(filters.source_system);
	}

	if (filters.status) {
		where.push('status = ?');
		args.push(filters.status);
	}

	if (filters.state) {
		where.push('upper(state) = ?');
		args.push(filters.state.toUpperCase());
	}

	if (filters.specialty) {
		where.push('lower(specialty) = lower(?)');
		args.push(filters.specialty);
	}

	if (filters.query) {
		where.push('(title LIKE ? OR employer LIKE ? OR location_text LIKE ?)');
		const query = `%${filters.query}%`;
		args.push(query, query, query);
	}

	const sql = `
		SELECT * FROM abundance_public_jobs
		${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
		ORDER BY last_seen_at DESC, posted_at DESC
		LIMIT ? OFFSET ?
	`;

	const { results } = await db.prepare(sql).bind(...args, limit, offset).all<PublicJob>();
	return { jobs: results, limit, offset };
}

function parseJsonBody(text: string): unknown {
	if (!text.trim()) return null;

	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
}

async function waitForBrightDataSnapshot(
	token: string,
	snapshotId: string,
	options: BrightDataSnapshotOptions
): Promise<unknown> {
	const timeoutMs = clampLimit(options.snapshotTimeoutMs ?? 45_000, 1_000, 240_000);
	const intervalMs = clampLimit(options.snapshotPollIntervalMs ?? 2_500, 500, 30_000);
	const startedAt = Date.now();
	let latest: unknown;

	do {
		latest = await getBrightDataSnapshotProgress(token, snapshotId);
		const status = extractSnapshotStatus(latest);
		if (status && (isSnapshotReady(status) || isSnapshotFailed(status))) {
			return latest;
		}

		await sleep(intervalMs);
	} while (Date.now() - startedAt < timeoutMs);

	return latest ?? { id: snapshotId, status: 'timeout' };
}

async function getBrightDataSnapshotProgress(token: string, snapshotId: string): Promise<unknown> {
	const encodedSnapshotId = encodeURIComponent(snapshotId);
	const candidates = [
		`https://api.brightdata.com/datasets/snapshots/${encodedSnapshotId}`,
		`https://api.brightdata.com/datasets/v3/progress/${encodedSnapshotId}`
	];

	for (const url of candidates) {
		const response = await fetch(url, {
			headers: {
				Authorization: `Bearer ${token}`
			}
		});
		const text = await response.text();
		const payload = parseJsonBody(text);

		if (response.status === 404 && url !== candidates.at(-1)) {
			continue;
		}

		if (!response.ok) {
			throw new Error(`Bright Data snapshot status failed with HTTP ${response.status}: ${text.slice(0, 500)}`);
		}

		return payload;
	}

	throw new Error(`Bright Data snapshot ${snapshotId} was not found.`);
}

async function downloadBrightDataSnapshot(
	token: string,
	snapshotId: string,
	options: BrightDataSnapshotOptions
): Promise<{ payload: unknown; ready: boolean }> {
	const encodedSnapshotId = encodeURIComponent(snapshotId);
	const candidates = [
		`https://api.brightdata.com/datasets/snapshots/${encodedSnapshotId}/download?format=json`,
		`https://api.brightdata.com/datasets/v3/snapshot/${encodedSnapshotId}?format=json`
	];
	const timeoutMs = options.waitForSnapshot ? clampLimit(options.snapshotTimeoutMs ?? 45_000, 1_000, 240_000) : 0;
	const intervalMs = clampLimit(options.snapshotPollIntervalMs ?? 2_500, 500, 30_000);
	const startedAt = Date.now();
	let latestPayload: unknown;

	do {
		for (const url of candidates) {
			const response = await fetch(url, {
				headers: {
					Authorization: `Bearer ${token}`
				}
			});
			const text = await response.text();
			const payload = parseJsonBody(text);

			if (response.status === 404 && url !== candidates.at(-1)) {
				continue;
			}

			if (response.status === 202) {
				latestPayload = payload;
				break;
			}

			if (!response.ok) {
				throw new Error(`Bright Data snapshot download failed with HTTP ${response.status}: ${text.slice(0, 500)}`);
			}

			return { payload, ready: true };
		}

		if (!options.waitForSnapshot) {
			return { payload: latestPayload, ready: false };
		}

		await sleep(intervalMs);
	} while (Date.now() - startedAt < timeoutMs);

	return { payload: latestPayload, ready: false };
}

function extractSnapshotStatus(payload: unknown): string | undefined {
	if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return undefined;

	for (const key of ['status', 'state', 'snapshot_status']) {
		const value = (payload as Record<string, unknown>)[key];
		if (typeof value === 'string' && value.trim()) return value.trim().toLowerCase();
	}

	return undefined;
}

function isSnapshotReady(status: string): boolean {
	return ['ready', 'done', 'completed'].includes(status.toLowerCase());
}

function isSnapshotFailed(status: string): boolean {
	return ['failed', 'error', 'canceled', 'cancelled'].includes(status.toLowerCase());
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeBrightDataDateFilter(value: string): string {
	const trimmed = value.trim();
	if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
		return `${trimmed}T00:00:00.000Z`;
	}

	return trimmed;
}

function clampLimit(value: number, min: number, max: number): number {
	if (!Number.isFinite(value)) return min;
	return Math.max(min, Math.min(max, Math.trunc(value)));
}
