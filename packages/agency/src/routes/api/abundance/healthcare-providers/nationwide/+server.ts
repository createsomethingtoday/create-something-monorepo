import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { HealthcareProvider } from '$lib/abundance/healthcare-providers';
import {
	applyNationwideChunk,
	beginNationwideRun,
	failNationwideRun,
	finalizeNationwideRun,
	listAppliedNationwideSources,
	pruneNationwideSnapshots,
	queryNationwideCoverage,
	reapStaleNationwideRuns
} from '$lib/server/abundance-healthcare-nationwide';

export const GET: RequestHandler = async ({ url, platform }) => {
	if (!platform?.env?.DB) throw error(500, 'Database not available');
	try {
		if (url.searchParams.get('runs') === 'true') {
			return json({ success: true, data: { runs: await listAppliedNationwideSources(platform.env.DB) } });
		}
		const result = await queryNationwideCoverage(platform.env.DB, {
			state: optional(url.searchParams.get('state')),
			city: optional(url.searchParams.get('city')),
			name: optional(url.searchParams.get('name')),
			npi: optional(url.searchParams.get('npi')),
			updatedSince: optional(url.searchParams.get('updated_since')),
			limit: integer(url.searchParams.get('limit'), 25),
			offset: integer(url.searchParams.get('offset'), 0)
		});
		return json({ success: true, data: result });
	} catch (cause) {
		return json({ success: false, error: message(cause) }, { status: 503 });
	}
};

export const POST: RequestHandler = async ({ request, platform }) => {
	if (!platform?.env?.DB) throw error(500, 'Database not available');
	let body: Record<string, unknown>;
	try {
		body = await request.json() as Record<string, unknown>;
		const action = requiredString(body.action, 'action');
		if (action === 'begin') {
			if (body.source_kind !== 'monthly_full' && body.source_kind !== 'weekly_incremental') {
				throw new TypeError('source_kind must be monthly_full or weekly_incremental.');
			}
			const run = await beginNationwideRun(platform.env.DB, {
				id: requiredString(body.run_id, 'run_id'),
				sourceKind: body.source_kind,
				sourceFile: requiredString(body.source_file, 'source_file'),
				sourceUrl: requiredString(body.source_url, 'source_url'),
				sourcePublishedAt: optionalString(body.source_published_at),
				startedAt: requiredString(body.started_at, 'started_at')
			});
			return json({ success: true, data: { run } }, { status: 201 });
		}
		if (action === 'chunk') {
			await applyNationwideChunk(platform.env.DB, {
				runId: requiredString(body.run_id, 'run_id'),
				providers: array(body.providers) as HealthcareProvider[],
				removeNpis: array(body.remove_npis).map((value) => requiredString(value, 'remove_npis[]')),
				processedRowCount: nonNegativeInteger(body.processed_row_count, 'processed_row_count'),
				rejectedCount: nonNegativeInteger(body.rejected_count, 'rejected_count')
			});
			return json({ success: true, data: { accepted: true } });
		}
		if (action === 'finalize') {
			const run = await finalizeNationwideRun(platform.env.DB, {
				runId: requiredString(body.run_id, 'run_id'),
				finishedAt: requiredString(body.finished_at, 'finished_at'),
				sourceSha256: requiredString(body.source_sha256, 'source_sha256'),
				expectedProcessedRowCount: nonNegativeInteger(body.expected_processed_row_count, 'expected_processed_row_count')
			});
			return json({ success: true, data: { run } });
		}
		if (action === 'fail') {
			await failNationwideRun(platform.env.DB, requiredString(body.run_id, 'run_id'), requiredString(body.error, 'error'));
			return json({ success: true, data: { failed: true } });
		}
		if (action === 'maintenance') {
			const reaped_run_ids = await reapStaleNationwideRuns(platform.env.DB);
			const pruned_run_ids = await pruneNationwideSnapshots(platform.env.DB, 2);
			return json({ success: true, data: { reaped_run_ids, pruned_run_ids } });
		}
		throw new TypeError('action must be begin, chunk, finalize, fail, or maintenance.');
	} catch (cause) {
		return json({ success: false, error: message(cause) }, { status: cause instanceof TypeError ? 400 : 409 });
	}
};

function optional(value: string | null): string | undefined { return value?.trim() || undefined; }
function optionalString(value: unknown): string | undefined { return typeof value === 'string' && value.trim() ? value.trim() : undefined; }
function requiredString(value: unknown, field: string): string {
	if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${field} is required.`);
	return value.trim();
}
function array(value: unknown): unknown[] {
	if (!Array.isArray(value)) throw new TypeError('providers and remove_npis must be arrays.');
	return value;
}
function nonNegativeInteger(value: unknown, field: string): number {
	if (!Number.isInteger(value) || (value as number) < 0) throw new TypeError(`${field} must be a non-negative integer.`);
	return value as number;
}
function integer(value: string | null, fallback: number): number {
	if (value === null) return fallback;
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed < 0) throw new TypeError('Pagination values must be non-negative integers.');
	return parsed;
}
function message(cause: unknown): string { return cause instanceof Error ? cause.message : String(cause); }
