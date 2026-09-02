import type {
	HealthcareProvider,
	HealthcareProviderCoverageReport,
	NursingPersonaCoverageQuery
} from '$lib/abundance/healthcare-providers';
import {
	assessHealthcareProviderCoverage,
	buildHealthcareProviderBulkUpsert,
	filterHealthcareProvidersForPersona,
	normalizeNppesProvider
} from '$lib/abundance/healthcare-providers';

const NPPES_API_URL = 'https://npiregistry.cms.hhs.gov/api/';
const NPPES_PAGE_LIMIT = 200;
const NPPES_MAX_SKIP = 1000;
const NPPES_MAX_RECORDS = 1200;
const D1_BATCH_STATEMENT_LIMIT = 100;

export interface NppesProviderFilters {
	taxonomy_description: string;
	state?: string;
	city?: string;
	postal_code?: string;
	enumeration_type?: 'NPI-1' | 'NPI-2';
	max_records?: number;
}

export interface NppesProviderFetchResult {
	records: Record<string, unknown>[];
	source_records_scanned: number;
	pages_fetched: number;
	coverage_limit_reached: boolean;
	fetched_at: string;
}

export class NppesProviderFetchError extends Error {
	constructor(
		message: string,
		readonly progress: NppesProviderFetchResult
	) {
		super(message);
		this.name = 'NppesProviderFetchError';
	}
}

export function buildNppesProviderUrl(
	filters: NppesProviderFilters,
	page: { limit: number; skip: number }
): string {
	const taxonomyDescription = filters.taxonomy_description?.trim();
	if (!taxonomyDescription) {
		throw new Error('taxonomy_description is required.');
	}
	if (![filters.state, filters.city, filters.postal_code].some((value) => value?.trim())) {
		throw new Error('At least one of state, city, or postal_code is required.');
	}
	if (!Number.isInteger(page.limit) || page.limit < 1 || page.limit > NPPES_PAGE_LIMIT) {
		throw new Error(`NPPES page limit must be between 1 and ${NPPES_PAGE_LIMIT}.`);
	}
	if (!Number.isInteger(page.skip) || page.skip < 0 || page.skip > NPPES_MAX_SKIP) {
		throw new Error(`NPPES skip must be between 0 and ${NPPES_MAX_SKIP}.`);
	}

	const url = new URL(NPPES_API_URL);
	url.searchParams.set('version', '2.1');
	url.searchParams.set('enumeration_type', filters.enumeration_type ?? 'NPI-1');
	url.searchParams.set('taxonomy_description', nppesTaxonomySearchTerm(taxonomyDescription));
	if (filters.state?.trim()) url.searchParams.set('state', filters.state.trim().toUpperCase());
	if (filters.city?.trim()) url.searchParams.set('city', filters.city.trim());
	if (filters.postal_code?.trim()) url.searchParams.set('postal_code', filters.postal_code.trim());
	url.searchParams.set('limit', String(page.limit));
	url.searchParams.set('skip', String(page.skip));
	return url.toString();
}

export async function fetchNppesProviders(
	filters: NppesProviderFilters,
	options: { fetchFn?: typeof fetch; fetchedAt?: string } = {}
): Promise<NppesProviderFetchResult> {
	const fetchFn = options.fetchFn ?? fetch;
	const fetchedAt = options.fetchedAt ?? new Date().toISOString();
	const maxRecords = normalizeMaxRecords(filters.max_records);
	const records: Record<string, unknown>[] = [];
	let sourceRecordsScanned = 0;
	let pagesFetched = 0;
	let lastPageWasFull = false;
	const sourceTaxonomy = nppesTaxonomySearchTerm(filters.taxonomy_description);
	const requiresCanonicalFilter = sourceTaxonomy !== filters.taxonomy_description.trim();

	while (sourceRecordsScanned < maxRecords) {
		const skip = sourceRecordsScanned;
		if (skip > NPPES_MAX_SKIP) break;
		const limit = Math.min(NPPES_PAGE_LIMIT, maxRecords - sourceRecordsScanned);
		try {
			const response = await fetchFn(buildNppesProviderUrl(filters, { limit, skip }), {
				headers: { Accept: 'application/json' }
			});
			const text = await response.text();
			if (!response.ok) {
				throw new Error(`NPPES provider query failed with HTTP ${response.status}: ${text.slice(0, 500)}`);
			}

			const payload = parseJsonObject(text);
			if (!Array.isArray(payload.results)) {
				const upstreamError = cleanString(payload.error) ?? cleanString(payload.message) ??
					(payload.Errors === undefined ? undefined : JSON.stringify(payload.Errors).slice(0, 500));
				throw new Error(`NPPES provider query returned no results array${upstreamError ? `: ${upstreamError}` : '.'}`);
			}
			if (payload.results.some((record) => !isRecord(record))) {
				throw new Error('NPPES provider query returned a malformed results array.');
			}
			const pageRecords = payload.results.filter(isRecord);
			if (pageRecords.some((record) =>
				!Array.isArray(record.taxonomies) ||
				record.taxonomies.some((taxonomy) => !isRecord(taxonomy)) ||
				record.taxonomies.every((taxonomy) => !isRecord(taxonomy) || !cleanString(taxonomy.desc)) ||
				record.taxonomies.some((taxonomy) => !isRecord(taxonomy) || typeof taxonomy.primary !== 'boolean') ||
				!record.taxonomies.some((taxonomy) =>
					isRecord(taxonomy) && taxonomy.primary === true && Boolean(cleanString(taxonomy.desc))
				))) {
				throw new Error('NPPES provider query returned malformed taxonomy data.');
			}
			if (pageRecords.some((record) => {
				if (!Array.isArray(record.addresses) || record.addresses.length === 0) return true;
				return record.addresses.some((address) => {
					if (!isRecord(address)) return true;
					const purpose = cleanString(address.address_purpose)?.toUpperCase();
					if (purpose !== 'LOCATION' && purpose !== 'MAILING') return true;
					if (purpose !== 'LOCATION') return false;
					if (filters.state && !cleanString(address.state)) return true;
					if (filters.city && !cleanString(address.city)) return true;
					if (filters.postal_code && !cleanString(address.postal_code)) return true;
					return false;
				});
			})) {
				throw new Error('NPPES provider query returned malformed address data.');
			}
			pagesFetched += 1;
			sourceRecordsScanned += pageRecords.length;
			records.push(...(requiresCanonicalFilter
				? pageRecords.filter((record) => hasCanonicalTaxonomy(record, filters.taxonomy_description))
				: pageRecords));
			lastPageWasFull = pageRecords.length >= limit;
			if (pageRecords.length < limit) break;
		} catch (error) {
			throw new NppesProviderFetchError(
				error instanceof Error ? error.message : String(error),
				{
					records: [...records],
					source_records_scanned: sourceRecordsScanned,
					pages_fetched: pagesFetched,
					coverage_limit_reached: false,
					fetched_at: fetchedAt
				}
			);
		}
	}

	return {
		records,
		source_records_scanned: sourceRecordsScanned,
		pages_fetched: pagesFetched,
		coverage_limit_reached: sourceRecordsScanned >= maxRecords && lastPageWasFull,
		fetched_at: fetchedAt
	};
}

function nppesTaxonomySearchTerm(taxonomyDescription: string): string {
	return taxonomyDescription.split(',', 1)[0].trim();
}

function hasCanonicalTaxonomy(record: Record<string, unknown>, taxonomyDescription: string): boolean {
	const target = taxonomyDescription.trim().toLowerCase();
	return asRecordArray(record.taxonomies).some(
		(taxonomy) => cleanString(taxonomy.desc)?.toLowerCase() === target
	);
}

export async function normalizeNppesRecordsForAbundance(
	records: Record<string, unknown>[],
	fetchedAt: string
): Promise<{ providers: HealthcareProvider[]; rejected_count: number }> {
	const providers: HealthcareProvider[] = [];
	let rejectedCount = 0;
	for (const record of records) {
		try {
			providers.push(await normalizeNppesProvider(record, { fetchedAt }));
		} catch {
			rejectedCount += 1;
		}
	}
	return { providers, rejected_count: rejectedCount };
}

export async function upsertHealthcareProviders(db: D1Database, providers: HealthcareProvider[]): Promise<number> {
	if (providers.length === 0) return 0;
	const statements = [];
	for (let index = 0; index < providers.length; index += 3) {
		const statement = buildHealthcareProviderBulkUpsert(providers.slice(index, index + 3));
		statements.push(db.prepare(statement.sql).bind(...statement.args));
	}
	for (let index = 0; index < statements.length; index += D1_BATCH_STATEMENT_LIMIT) {
		await db.batch(statements.slice(index, index + D1_BATCH_STATEMENT_LIMIT));
	}
	return providers.length;
}

export async function readHealthcareProviderCoverage(
	db: D1Database,
	persona: NursingPersonaCoverageQuery,
	options: { evaluatedAt?: string; limit?: number } = {}
): Promise<{ report: HealthcareProviderCoverageReport; providers: HealthcareProvider[] }> {
	const limit = Math.min(Math.max(options.limit ?? NPPES_MAX_RECORDS, 1), NPPES_MAX_RECORDS);
	const run = await db
		.prepare(`
			SELECT id, fetched_at, coverage_limit_reached
			FROM abundance_healthcare_provider_ingestion_runs
			WHERE persona_id = ?
				AND lower(taxonomy_description) = lower(?)
				AND coalesce(upper(state), '') = coalesce(upper(?), '')
				AND coalesce(lower(city), '') = coalesce(lower(?), '')
				AND coalesce(postal_code, '') = coalesce(?, '')
				AND status = 'succeeded'
			ORDER BY fetched_at DESC
			LIMIT 1
		`)
		.bind(
			persona.id,
			persona.taxonomy_description,
			persona.state ?? null,
			persona.city ?? null,
			persona.postal_code ?? null
		)
		.first<{ id?: string; fetched_at?: string; coverage_limit_reached?: number }>();
	const result = run?.id
		? await db
			.prepare(`
				SELECT provider_snapshot_json
				FROM abundance_healthcare_provider_ingestion_memberships
				WHERE run_id = ?
				ORDER BY provider_npi ASC
				LIMIT ?
			`)
			.bind(run.id, limit)
			.all<{ provider_snapshot_json: string }>()
		: { results: [] as Array<{ provider_snapshot_json: string }> };
	const providers = filterHealthcareProvidersForPersona(
		(result.results ?? []).map((row) => parseHealthcareProviderSnapshot(row.provider_snapshot_json)),
		persona
	);

	return {
		providers,
		report: assessHealthcareProviderCoverage(providers, {
			persona,
			evaluatedAt: options.evaluatedAt,
			source: {
				latest_fetched_at: run?.fetched_at,
				coverage_limit_reached: run?.coverage_limit_reached === 1
			}
		})
	};
}

export async function createHealthcareProviderIngestionRun(
	db: D1Database,
	input: {
		id: string;
		persona: NursingPersonaCoverageQuery;
		status: 'succeeded' | 'failed';
		fetchedAt: string;
		pagesFetched: number;
		sourceResultCount: number;
		normalizedCount: number;
		rejectedCount: number;
		excludedCount: number;
		coverageLimitReached: boolean;
		error?: string;
		providers?: HealthcareProvider[];
	}
): Promise<void> {
	const runStatement = db
		.prepare(`
			INSERT INTO abundance_healthcare_provider_ingestion_runs (
				id, persona_id, persona_label, taxonomy_description, state, city, postal_code,
				status, fetched_at, pages_fetched, source_result_count, normalized_count,
				rejected_count, excluded_count, coverage_limit_reached, error, finished_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
		`)
		.bind(
			input.id,
			input.persona.id,
			input.persona.label,
			input.persona.taxonomy_description,
			input.persona.state ?? null,
			input.persona.city ?? null,
			input.persona.postal_code ?? null,
			input.status,
			input.fetchedAt,
			input.pagesFetched,
			input.sourceResultCount,
			input.normalizedCount,
			input.rejectedCount,
			input.excludedCount,
			input.coverageLimitReached ? 1 : 0,
			input.error ?? null
		);

	const providers = [...new Map((input.providers ?? []).map((provider) => [provider.npi, provider])).values()];
	const statements = [runStatement];
	if (providers.length > 0) {
		for (let index = 0; index < providers.length; index += 30) {
			const chunk = providers.slice(index, index + 30);
			const placeholders = chunk.map(() => '(?, ?, ?)').join(', ');
			statements.push(
				db.prepare(`
					INSERT INTO abundance_healthcare_provider_ingestion_memberships (
						run_id, provider_npi, provider_snapshot_json
					)
					VALUES ${placeholders}
					ON CONFLICT(run_id, provider_npi) DO NOTHING
				`).bind(...chunk.flatMap((provider) => [input.id, provider.npi, JSON.stringify(provider)]))
			);
		}
	}
	await db.batch(statements);
}

function parseHealthcareProviderSnapshot(value: string): HealthcareProvider {
	const parsed = parseJsonObject(value);
	if (!cleanString(parsed.npi) || !cleanString(parsed.name) || !cleanString(parsed.source_system)) {
		throw new Error('Stored healthcare provider snapshot is missing required provenance fields.');
	}
	return parsed as unknown as HealthcareProvider;
}

function normalizeMaxRecords(value: number | undefined): number {
	if (value === undefined) return NPPES_MAX_RECORDS;
	if (!Number.isInteger(value) || value < 1 || value > NPPES_MAX_RECORDS) {
		throw new Error(`max_records must be an integer between 1 and ${NPPES_MAX_RECORDS}.`);
	}
	return value;
}

function parseJsonObject(value: string): Record<string, unknown> {
	try {
		const parsed = JSON.parse(value);
		if (isRecord(parsed)) return parsed;
	} catch {
		// Fall through to the bounded error below.
	}
	throw new Error('NPPES returned an invalid JSON object.');
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
	return Array.isArray(value) ? value.filter(isRecord) : [];
}

function cleanString(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
