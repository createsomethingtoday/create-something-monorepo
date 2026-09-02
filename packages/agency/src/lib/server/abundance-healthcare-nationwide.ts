import {
	assessHealthcareProviderCoverage,
	assessHealthcareRecruitingReadiness,
	type HealthcareProvider,
	type HealthcareRecruitingReadiness,
	type NursingPersonaCoverageQuery
} from '$lib/abundance/healthcare-providers';
import { readHealthcareRecruitingEvidence, upsertHealthcareProviders } from './abundance-healthcare-providers';

export const FAMILY_NP_TAXONOMY_CODE = '363LF0000X';
export const NATIONAL_FAMILY_NP_PERSONA: NursingPersonaCoverageQuery = {
	id: 'npg-family-np-nationwide',
	label: 'Family nurse practitioners nationwide',
	taxonomy_description: 'Nurse Practitioner, Family'
};

export type NationwideRunKind = 'monthly_full' | 'weekly_incremental';

export interface NationwideRun {
	id: string;
	source_kind: NationwideRunKind;
	source_file: string;
	source_url: string;
	source_published_at?: string;
	base_run_id?: string;
	status: 'running' | 'succeeded' | 'failed';
	started_at: string;
	finished_at?: string;
	processed_row_count: number;
	included_count: number;
	removed_count: number;
	rejected_count: number;
	provider_count?: number;
}

export async function beginNationwideRun(db: D1Database, input: {
	id: string;
	sourceKind: NationwideRunKind;
	sourceFile: string;
	sourceUrl: string;
	sourcePublishedAt?: string;
	startedAt: string;
}): Promise<NationwideRun> {
	if (!/^abnationalrun_[a-zA-Z0-9_-]+$/.test(input.id)) throw new TypeError('Invalid nationwide run id.');
	if (!input.sourceFile.trim()) throw new TypeError('source_file is required.');
	const latest = await latestSuccessfulNationwideRun(db);
	if (input.sourceKind === 'weekly_incremental' && !latest) {
		throw new Error('A weekly incremental requires a successful nationwide base snapshot.');
	}
	const insert = db.prepare(`
		INSERT INTO abundance_healthcare_nationwide_runs (
			id, source_kind, source_file, source_url, source_published_at,
			base_run_id, status, started_at
		) VALUES (?, ?, ?, ?, ?, ?, 'running', ?)
	`).bind(
		input.id,
		input.sourceKind,
		input.sourceFile,
		input.sourceUrl,
		input.sourcePublishedAt ?? null,
		input.sourceKind === 'weekly_incremental' ? latest?.id ?? null : null,
		input.startedAt
	);
	const statements = [insert];
	if (input.sourceKind === 'weekly_incremental' && latest) {
		statements.push(db.prepare(`
			INSERT INTO abundance_healthcare_nationwide_memberships (
				run_id, provider_npi, provider_snapshot_json, practice_state,
				practice_city, last_updated_date, provider_status, primary_taxonomy_code,
				practice_has_location, practice_has_phone, license_has_fields, endpoint_count, name_search
			)
			SELECT ?, provider_npi, provider_snapshot_json, practice_state,
				practice_city, last_updated_date, provider_status, primary_taxonomy_code,
				practice_has_location, practice_has_phone, license_has_fields, endpoint_count, name_search
			FROM abundance_healthcare_nationwide_memberships
			WHERE run_id = ?
		`).bind(input.id, latest.id));
	}
	await db.batch(statements);
	return (await readNationwideRun(db, input.id))!;
}

export async function applyNationwideChunk(db: D1Database, input: {
	runId: string;
	providers: HealthcareProvider[];
	removeNpis: string[];
	processedRowCount: number;
	rejectedCount: number;
}): Promise<void> {
	const run = await requireRunningRun(db, input.runId);
	void run;
	if (!Number.isInteger(input.processedRowCount) || input.processedRowCount < 0) {
		throw new TypeError('processed_row_count must be a non-negative integer.');
	}
	if (input.providers.length > 50 || input.removeNpis.length > 100) {
		throw new TypeError('A nationwide chunk accepts at most 50 providers and 100 removals.');
	}
	for (const provider of input.providers) {
		if (provider.primary_taxonomy_code !== FAMILY_NP_TAXONOMY_CODE) {
			throw new TypeError(`Provider ${provider.npi} is not a primary Family Nurse Practitioner.`);
		}
	}
	await upsertHealthcareProviders(db, input.providers);
	const statements = input.providers.map((provider) => db.prepare(`
		INSERT INTO abundance_healthcare_nationwide_memberships (
			run_id, provider_npi, provider_snapshot_json, practice_state,
			practice_city, last_updated_date, provider_status, primary_taxonomy_code,
			practice_has_location, practice_has_phone, license_has_fields, endpoint_count, name_search
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(run_id, provider_npi) DO UPDATE SET
			provider_snapshot_json = excluded.provider_snapshot_json,
			practice_state = excluded.practice_state,
			practice_city = excluded.practice_city,
			last_updated_date = excluded.last_updated_date,
			provider_status = excluded.provider_status,
			primary_taxonomy_code = excluded.primary_taxonomy_code,
			practice_has_location = excluded.practice_has_location,
			practice_has_phone = excluded.practice_has_phone,
			license_has_fields = excluded.license_has_fields,
			endpoint_count = excluded.endpoint_count,
			name_search = excluded.name_search
	`).bind(
		input.runId,
		provider.npi,
		JSON.stringify(provider),
		provider.practice_state?.toUpperCase() ?? null,
		provider.practice_city?.toLowerCase() ?? null,
		provider.last_updated_date ?? null,
		provider.status,
		provider.primary_taxonomy_code ?? null,
		provider.practice_city && provider.practice_state ? 1 : 0,
		provider.practice_phone ? 1 : 0,
		provider.license_state && provider.license_number ? 1 : 0,
		provider.endpoint_count,
		provider.name.toLowerCase()
	));
	for (let index = 0; index < input.removeNpis.length; index += 90) {
		const chunk = [...new Set(input.removeNpis.slice(index, index + 90))];
		if (chunk.length > 0) {
			statements.push(db.prepare(`
				DELETE FROM abundance_healthcare_nationwide_memberships
				WHERE run_id = ? AND provider_npi IN (${chunk.map(() => '?').join(', ')})
			`).bind(input.runId, ...chunk));
		}
	}
	statements.push(db.prepare(`
		UPDATE abundance_healthcare_nationwide_runs
		SET processed_row_count = processed_row_count + ?,
			included_count = included_count + ?,
			removed_count = removed_count + ?,
			rejected_count = rejected_count + ?
		WHERE id = ? AND status = 'running'
	`).bind(
		input.processedRowCount,
		input.providers.length,
		input.removeNpis.length,
		input.rejectedCount,
		input.runId
	));
	for (let index = 0; index < statements.length; index += 75) {
		await db.batch(statements.slice(index, index + 75));
	}
}

export async function finalizeNationwideRun(db: D1Database, input: {
	runId: string;
	finishedAt: string;
	sourceSha256: string;
	expectedProcessedRowCount: number;
}): Promise<NationwideRun> {
	const run = await requireRunningRun(db, input.runId);
	if (!/^[a-f0-9]{64}$/.test(input.sourceSha256)) throw new TypeError('source_sha256 must be a lowercase SHA-256 digest.');
	if (run.processed_row_count !== input.expectedProcessedRowCount) {
		throw new Error(`Nationwide run is incomplete: processed ${run.processed_row_count} of ${input.expectedProcessedRowCount} rows.`);
	}
	const count = await db.prepare(`
		SELECT count(*) AS provider_count
		FROM abundance_healthcare_nationwide_memberships
		WHERE run_id = ?
	`).bind(input.runId).first<{ provider_count: number }>();
	if (!count?.provider_count) throw new Error('Nationwide run cannot succeed with zero Family Nurse Practitioners.');
	await db.prepare(`
		UPDATE abundance_healthcare_nationwide_runs
		SET status = 'succeeded', finished_at = ?, source_sha256 = ?, provider_count = ?
		WHERE id = ? AND status = 'running'
	`).bind(input.finishedAt, input.sourceSha256, count.provider_count, input.runId).run();
	return (await readNationwideRun(db, input.runId))!;
}

export async function failNationwideRun(db: D1Database, runId: string, error: string): Promise<void> {
	await db.prepare(`
		UPDATE abundance_healthcare_nationwide_runs
		SET status = 'failed', finished_at = datetime('now'), error = ?
		WHERE id = ? AND status = 'running'
	`).bind(error.slice(0, 500), runId).run();
}

export async function queryNationwideCoverage(db: D1Database, input: {
	state?: string;
	city?: string;
	name?: string;
	npi?: string;
	updatedSince?: string;
	limit?: number;
	offset?: number;
	evaluatedAt?: string;
}): Promise<{
	run: NationwideRun;
	report: ReturnType<typeof assessHealthcareProviderCoverage>;
	providers: HealthcareProvider[];
	readiness: HealthcareRecruitingReadiness[];
	total: number;
	limit: number;
	offset: number;
}> {
	const run = await latestSuccessfulNationwideRun(db);
	if (!run) throw new Error('No successful nationwide healthcare snapshot is available.');
	const limit = Math.min(Math.max(input.limit ?? 25, 1), 25);
	const offset = Math.min(Math.max(input.offset ?? 0, 0), 1_000_000);
	const filters = ['run_id = ?'];
	const args: unknown[] = [run.id];
	if (input.state) { filters.push('practice_state = upper(?)'); args.push(input.state); }
	if (input.city) { filters.push('practice_city = lower(?)'); args.push(input.city); }
	if (input.name) { filters.push('name_search LIKE ?'); args.push(`%${input.name.toLowerCase()}%`); }
	if (input.npi) { filters.push('provider_npi = ?'); args.push(input.npi); }
	if (input.updatedSince) { filters.push('last_updated_date >= ?'); args.push(input.updatedSince); }
	const where = filters.join(' AND ');
	const evaluatedAt = input.evaluatedAt ?? new Date().toISOString();
	const [aggregate, rows] = await Promise.all([
		db.prepare(`
			SELECT count(*) AS total,
				sum(CASE WHEN provider_status = 'active' THEN 1 ELSE 0 END) AS active_count,
				sum(CASE WHEN provider_status = 'deactivated' THEN 1 ELSE 0 END) AS deactivated_count,
				sum(CASE WHEN provider_status = 'unknown' THEN 1 ELSE 0 END) AS unknown_status_count,
				sum(CASE WHEN last_updated_date >= date(?, '-1 year') THEN 1 ELSE 0 END) AS updated_1y,
				sum(CASE WHEN last_updated_date >= date(?, '-3 years') THEN 1 ELSE 0 END) AS updated_3y,
				sum(CASE WHEN last_updated_date < date(?, '-3 years') THEN 1 ELSE 0 END) AS older_3y,
				sum(CASE WHEN last_updated_date IS NULL THEN 1 ELSE 0 END) AS unknown_recency,
				sum(CASE WHEN primary_taxonomy_code IS NOT NULL THEN 1 ELSE 0 END) AS taxonomy_count,
				sum(practice_has_location) AS location_count,
				sum(practice_has_phone) AS phone_count,
				sum(license_has_fields) AS license_count,
				sum(CASE WHEN endpoint_count > 0 THEN 1 ELSE 0 END) AS endpoint_count
			FROM abundance_healthcare_nationwide_memberships WHERE ${where}
		`).bind(evaluatedAt.slice(0, 10), evaluatedAt.slice(0, 10), evaluatedAt.slice(0, 10), ...args).first<{
			total: number; active_count: number; deactivated_count: number; unknown_status_count: number;
			updated_1y: number; updated_3y: number; older_3y: number; unknown_recency: number;
			taxonomy_count: number; location_count: number; phone_count: number; license_count: number; endpoint_count: number;
		}>(),
		db.prepare(`
			SELECT provider_snapshot_json
			FROM abundance_healthcare_nationwide_memberships
			WHERE ${where}
			ORDER BY coalesce(last_updated_date, '') DESC, provider_npi ASC
			LIMIT ? OFFSET ?
		`).bind(...args, limit, offset).all<{ provider_snapshot_json: string }>()
	]);
	const providers = (rows.results ?? []).map((row) => JSON.parse(row.provider_snapshot_json) as HealthcareProvider);
	const evidence = await readHealthcareRecruitingEvidence(db, providers.map((provider) => provider.npi));
	const readiness = providers.map((provider) => assessHealthcareRecruitingReadiness(provider.npi, evidence, { evaluatedAt }));
	const persona: NursingPersonaCoverageQuery = {
		...NATIONAL_FAMILY_NP_PERSONA,
		...(input.state ? { state: input.state.toUpperCase() } : {}),
		...(input.city ? { city: input.city } : {})
	};
	const total = aggregate?.total ?? 0;
	const report = assessHealthcareProviderCoverage(providers, {
		persona,
		evaluatedAt,
		source: {
			latest_fetched_at: run.finished_at,
			coverage_limit_reached: false,
			normalized_count: run.included_count,
			rejected_count: run.rejected_count
		},
		recruiting_evidence: evidence
	});
	report.provider_count = total;
	report.active_count = aggregate?.active_count ?? 0;
	report.deactivated_count = aggregate?.deactivated_count ?? 0;
	report.unknown_status_count = aggregate?.unknown_status_count ?? 0;
	report.administrative_recency = {
		updated_within_1_year_count: aggregate?.updated_1y ?? 0,
		updated_within_3_years_count: aggregate?.updated_3y ?? 0,
		older_than_3_years_count: aggregate?.older_3y ?? 0,
		unknown_count: aggregate?.unknown_recency ?? 0
	};
	report.completeness = {
		primary_taxonomy_count: aggregate?.taxonomy_count ?? 0,
		practice_location_count: aggregate?.location_count ?? 0,
		practice_phone_count: aggregate?.phone_count ?? 0,
		license_field_count: aggregate?.license_count ?? 0,
		endpoint_count: aggregate?.endpoint_count ?? 0
	};
	report.recruiting_pipeline.coverage_candidate_count = Math.max(0, total - report.recruiting_pipeline.recruiter_ready_count);
	return { run, report, providers, readiness, total, limit, offset };
}

export async function latestSuccessfulNationwideRun(db: D1Database): Promise<NationwideRun | null> {
	return db.prepare(`
		SELECT id, source_kind, source_file, source_url, source_published_at,
			base_run_id, status, started_at, finished_at, processed_row_count,
			included_count, removed_count, rejected_count, provider_count
		FROM abundance_healthcare_nationwide_runs
		WHERE status = 'succeeded'
		ORDER BY finished_at DESC
		LIMIT 1
	`).first<NationwideRun>();
}

export async function listSuccessfulNationwideRuns(db: D1Database, limit = 24): Promise<NationwideRun[]> {
	const result = await db.prepare(`
		SELECT id, source_kind, source_file, source_url, source_published_at,
			base_run_id, status, started_at, finished_at, processed_row_count,
			included_count, removed_count, rejected_count, provider_count
		FROM abundance_healthcare_nationwide_runs
		WHERE status = 'succeeded'
		ORDER BY finished_at DESC
		LIMIT ?
	`).bind(Math.min(Math.max(limit, 1), 60)).all<NationwideRun>();
	return result.results ?? [];
}

async function readNationwideRun(db: D1Database, id: string): Promise<NationwideRun | null> {
	return db.prepare(`
		SELECT id, source_kind, source_file, source_url, source_published_at,
			base_run_id, status, started_at, finished_at, processed_row_count,
			included_count, removed_count, rejected_count, provider_count
		FROM abundance_healthcare_nationwide_runs WHERE id = ?
	`).bind(id).first<NationwideRun>();
}

async function requireRunningRun(db: D1Database, id: string): Promise<NationwideRun> {
	const run = await readNationwideRun(db, id);
	if (!run || run.status !== 'running') throw new Error(`Nationwide run ${id} is not running.`);
	return run;
}
