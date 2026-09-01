/**
 * Nursing-persona provider coverage and data-health API.
 *
 * GET evaluates the latest stored NPPES snapshot. POST refreshes a bounded
 * persona/geography cohort from NPPES, stores provenance, and returns aggregate
 * health. NPPES records are market evidence, not outreach authorization.
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { ApiResponse } from '$lib/types/abundance';
import type {
	HealthcareProvider,
	HealthcareProviderCoverageReport,
	NursingPersonaCoverageQuery
} from '$lib/abundance/healthcare-providers';
import {
	assessHealthcareProviderCoverage,
	filterHealthcareProvidersForPersona
} from '$lib/abundance/healthcare-providers';
import {
	createHealthcareProviderIngestionRun,
	fetchNppesProviders,
	NppesProviderFetchError,
	normalizeNppesRecordsForAbundance,
	readHealthcareProviderCoverage,
	upsertHealthcareProviders
} from '$lib/server/abundance-healthcare-providers';

type CoverageResponse = {
	report: HealthcareProviderCoverageReport;
	providers?: HealthcareProvider[];
	ingestion?: {
		pages_fetched: number;
		source_result_count: number;
		normalized_count: number;
		rejected_count: number;
		excluded_count: number;
		coverage_limit_reached: boolean;
	};
};

type CoverageRefreshRequest = Partial<NursingPersonaCoverageQuery> & {
	max_records?: number;
	include_records?: boolean;
};

export const GET: RequestHandler = async ({ url, platform }) => {
	if (!platform?.env?.DB) throw error(500, 'Database not available');

	try {
		const persona = personaFromSearchParams(url.searchParams);
		const result = await readHealthcareProviderCoverage(platform.env.DB, persona);
		return json({
			success: true,
			data: {
				report: result.report,
				...(url.searchParams.get('include_records') === 'true' ? { providers: result.providers } : {})
			}
		} as ApiResponse<CoverageResponse>);
	} catch (err) {
		if (err instanceof Response) throw err;
		return validationOrServerError(err, 'reading healthcare provider coverage');
	}
};

export const POST: RequestHandler = async ({ request, platform }) => {
	if (!platform?.env?.DB) throw error(500, 'Database not available');

	const fetchedAt = new Date().toISOString();
	let persona: NursingPersonaCoverageQuery | undefined;
	let progress = {
		pagesFetched: 0,
		sourceResultCount: 0,
		normalizedCount: 0,
		rejectedCount: 0,
		excludedCount: 0,
		coverageLimitReached: false
	};
	try {
		const body = (await request.json()) as CoverageRefreshRequest;
		persona = validatePersona(body);
		const fetched = await fetchNppesProviders({
			taxonomy_description: persona.taxonomy_description,
			state: persona.state,
			city: persona.city,
			postal_code: persona.postal_code,
			max_records: body.max_records
		}, { fetchedAt });
		progress = {
			...progress,
			pagesFetched: fetched.pages_fetched,
			sourceResultCount: fetched.source_records_scanned,
			coverageLimitReached: fetched.coverage_limit_reached
		};
		const normalized = await normalizeNppesRecordsForAbundance(fetched.records, fetchedAt);
		const providers = filterHealthcareProvidersForPersona(normalized.providers, persona);
		const excludedCount = normalized.providers.length - providers.length;
		progress = {
			...progress,
			normalizedCount: providers.length,
			rejectedCount: normalized.rejected_count,
			excludedCount
		};
		await upsertHealthcareProviders(platform.env.DB, providers);
		await createHealthcareProviderIngestionRun(platform.env.DB, {
			id: `abproviderrun_${crypto.randomUUID()}`,
			persona,
			status: 'succeeded',
			fetchedAt,
			pagesFetched: fetched.pages_fetched,
			sourceResultCount: fetched.source_records_scanned,
			normalizedCount: providers.length,
			rejectedCount: normalized.rejected_count,
			excludedCount,
			providers,
			coverageLimitReached: fetched.coverage_limit_reached
		});

		const report = assessHealthcareProviderCoverage(providers, {
			persona,
			source: {
				latest_fetched_at: fetchedAt,
				coverage_limit_reached: fetched.coverage_limit_reached
			}
		});
		const data: CoverageResponse = {
			report,
			ingestion: {
				pages_fetched: fetched.pages_fetched,
				source_result_count: fetched.source_records_scanned,
				normalized_count: providers.length,
				rejected_count: normalized.rejected_count,
				excluded_count: excludedCount,
				coverage_limit_reached: fetched.coverage_limit_reached
			},
			...(body.include_records ? { providers } : {})
		};
		return json({ success: true, data } as ApiResponse<CoverageResponse>, { status: 201 });
	} catch (err) {
		if (err instanceof NppesProviderFetchError) {
			progress = {
				...progress,
				pagesFetched: err.progress.pages_fetched,
				sourceResultCount: err.progress.source_records_scanned,
				coverageLimitReached: err.progress.coverage_limit_reached
			};
		}
		if (persona) {
			await createHealthcareProviderIngestionRun(platform.env.DB, {
				id: `abproviderrun_${crypto.randomUUID()}`,
				persona,
				status: 'failed',
				fetchedAt,
				...progress,
				providers: [],
				error: err instanceof Error ? err.message : String(err)
			}).catch((runError) => console.error('Failed to record healthcare provider ingestion failure:', runError));
		}
		if (err instanceof Response) throw err;
		return validationOrServerError(err, 'refreshing healthcare provider coverage');
	}
};

function personaFromSearchParams(params: URLSearchParams): NursingPersonaCoverageQuery {
	return validatePersona({
		id: params.get('persona_id') ?? undefined,
		label: params.get('label') ?? undefined,
		taxonomy_description: params.get('taxonomy_description') ?? undefined,
		state: params.get('state') ?? undefined,
		city: params.get('city') ?? undefined,
		postal_code: params.get('postal_code') ?? undefined
	});
}

function validatePersona(value: Partial<NursingPersonaCoverageQuery>): NursingPersonaCoverageQuery {
	const id = clean(value.id);
	const label = clean(value.label);
	const taxonomyDescription = clean(value.taxonomy_description);
	const state = clean(value.state)?.toUpperCase();
	const city = clean(value.city);
	const postalCode = clean(value.postal_code);
	if (!id || !label || !taxonomyDescription) {
		throw new TypeError('persona_id/id, label, and taxonomy_description are required.');
	}
	if (!state && !city && !postalCode) {
		throw new TypeError('At least one of state, city, or postal_code is required.');
	}
	if (state && !/^[A-Z]{2}$/.test(state)) {
		throw new TypeError('state must be a two-letter code.');
	}
	return {
		id,
		label,
		taxonomy_description: taxonomyDescription,
		state,
		city,
		postal_code: postalCode
	};
}

function clean(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function validationOrServerError(err: unknown, action: string): Response {
	const isValidation = err instanceof SyntaxError || err instanceof TypeError ||
		(err instanceof Error && /required|must be|between/.test(err.message));
	return json(
		{ success: false, error: `Error ${action}: ${err instanceof Error ? err.message : 'Unknown error'}` } as ApiResponse<never>,
		{ status: isValidation ? 400 : 500 }
	);
}
