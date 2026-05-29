/**
 * Abundance public jobs API.
 *
 * GET reads the normalized provider-independent job table.
 * POST imports records or triggers a Bright Data filter run behind the same contract.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { ApiResponse, PaginatedResponse, PublicJob, PublicJobStatus } from '$lib/types/abundance';
import {
	createPublicJobIngestionRun,
	fetchBrightDataJobs,
	fetchBrightDataJobsSnapshot,
	listPublicJobs,
	normalizeBrightDataRecordsForAbundance,
	upsertPublicJobs,
	type BrightDataJobsFilter
} from '$lib/server/abundance-public-jobs';

type PublicJobsIngestRequest = {
	provider?: 'bright_data';
	records?: Record<string, unknown>[];
	query?: string;
	location?: string;
	state?: string;
	posted_after?: string;
	source_system?: string;
	snapshot_id?: string;
	wait_for_snapshot?: boolean;
	snapshot_timeout_ms?: number;
	snapshot_poll_interval_ms?: number;
	limit?: number;
	raw_payload_expires_at?: string;
};

const VALID_STATUSES: PublicJobStatus[] = ['open', 'closed', 'expired', 'unknown'];

export const GET: RequestHandler = async ({ url, platform }) => {
	try {
		if (!platform?.env?.DB) {
			throw error(500, 'Database not available');
		}

		const status = url.searchParams.get('status') as PublicJobStatus | null;
		if (status && !VALID_STATUSES.includes(status)) {
			return json({ success: false, error: `status must be one of: ${VALID_STATUSES.join(', ')}` } as ApiResponse<never>, { status: 400 });
		}

		const result = await listPublicJobs(platform.env.DB, {
			provider: valueOrUndefined(url.searchParams.get('provider')),
			source_system: valueOrUndefined(url.searchParams.get('source_system')),
			status: status ?? undefined,
			state: valueOrUndefined(url.searchParams.get('state')),
			specialty: valueOrUndefined(url.searchParams.get('specialty')),
			query: valueOrUndefined(url.searchParams.get('query')),
			limit: parseInteger(url.searchParams.get('limit')),
			offset: parseInteger(url.searchParams.get('offset'))
		});

		return json({
			success: true,
			data: result.jobs,
			limit: result.limit,
			offset: result.offset
		} as PaginatedResponse<PublicJob>);
	} catch (err) {
		console.error('Public jobs list error:', err);
		if (err instanceof Response) throw err;
		return json(
			{ success: false, error: `Error listing public jobs: ${err instanceof Error ? err.message : 'Unknown error'}` } as ApiResponse<never>,
			{ status: 500 }
		);
	}
};

export const POST: RequestHandler = async ({ request, platform }) => {
	const startedAt = new Date().toISOString();

	try {
		if (!platform?.env?.DB) {
			throw error(500, 'Database not available');
		}

		const body = (await request.json()) as PublicJobsIngestRequest;
		const provider = body.provider ?? 'bright_data';

		if (provider !== 'bright_data') {
			return json({ success: false, error: 'Only provider="bright_data" is currently supported.' } as ApiResponse<never>, { status: 400 });
		}

		const filters: BrightDataJobsFilter = {
			query: body.query,
			location: body.location,
			state: body.state,
			posted_after: body.posted_after,
			source_system: body.source_system,
			limit: body.limit
		};

		const directRecords = Array.isArray(body.records) ? body.records : undefined;
		const waitForSnapshot = body.wait_for_snapshot ?? Boolean(body.snapshot_id);
		const snapshotOptions = {
			waitForSnapshot,
			snapshotTimeoutMs: body.snapshot_timeout_ms,
			snapshotPollIntervalMs: body.snapshot_poll_interval_ms
		};
		const providerResult = directRecords
			? { records: directRecords, snapshotId: undefined, snapshotStatus: undefined, rawResponse: { imported_records: directRecords.length } }
			: body.snapshot_id
				? await fetchBrightDataJobsSnapshot(platform.env as unknown as Record<string, string | undefined>, body.snapshot_id, snapshotOptions)
				: await fetchBrightDataJobs(platform.env as unknown as Record<string, string | undefined>, filters, snapshotOptions);

		const jobs = await normalizeBrightDataRecordsForAbundance({
			records: providerResult.records,
			filters,
			fetchedAt: startedAt,
			snapshotId: providerResult.snapshotId,
			rawPayloadExpiresAt: body.raw_payload_expires_at
		});

		const upserted = await upsertPublicJobs(platform.env.DB, jobs);
		const finishedAt = new Date().toISOString();
		const run = await createPublicJobIngestionRun(platform.env.DB, {
			id: `abjobrun_${crypto.randomUUID()}`,
			provider,
			sourceSystem: body.source_system,
			status: providerResult.snapshotId && upserted === 0 && providerResult.snapshotStatus !== 'ready'
				? 'snapshot_pending'
				: 'succeeded',
			providerSnapshotId: providerResult.snapshotId,
			requestedFilters: filters as Record<string, unknown>,
			resultCount: upserted,
			metadata: {
				raw_response_shape: Array.isArray(providerResult.rawResponse) ? 'array' : typeof providerResult.rawResponse,
				direct_record_import: Boolean(directRecords),
				requested_snapshot_id: body.snapshot_id,
				snapshot_status: providerResult.snapshotStatus,
				waited_for_snapshot: waitForSnapshot
			},
			startedAt,
			finishedAt
		});

		return json({
			success: true,
			data: {
				run,
				jobs
			}
		} as ApiResponse<{ run: typeof run; jobs: PublicJob[] }>, { status: providerResult.snapshotId && upserted === 0 && providerResult.snapshotStatus !== 'ready' ? 202 : 201 });
	} catch (err) {
		console.error('Public jobs ingest error:', err);

		if (platform?.env?.DB) {
			await createPublicJobIngestionRun(platform.env.DB, {
				id: `abjobrun_${crypto.randomUUID()}`,
				provider: 'bright_data',
				status: 'failed',
				requestedFilters: {},
				error: err instanceof Error ? err.message : String(err),
				startedAt,
				finishedAt: new Date().toISOString()
			}).catch((runError) => console.error('Failed to record public job ingestion failure:', runError));
		}

		if (err instanceof Response) throw err;
		return json(
			{ success: false, error: `Error ingesting public jobs: ${err instanceof Error ? err.message : 'Unknown error'}` } as ApiResponse<never>,
			{ status: 500 }
		);
	}
};

function valueOrUndefined(value: string | null): string | undefined {
	const trimmed = value?.trim();
	return trimmed ? trimmed : undefined;
}

function parseInteger(value: string | null): number | undefined {
	if (!value) return undefined;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? Math.trunc(parsed) : undefined;
}
