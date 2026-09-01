import {
	assessHealthcareProviderCoverage,
	filterHealthcareProvidersForPersona
} from '../src/lib/abundance/healthcare-providers.ts';
import { NPG_NURSING_PERSONA_COVERAGE } from '../src/lib/abundance/npg-healthcare-personas.ts';
import {
	fetchNppesProviders,
	normalizeNppesRecordsForAbundance
} from '../src/lib/server/abundance-healthcare-providers.ts';

const evaluatedAt = new Date().toISOString();
const reports = [];

for (const persona of NPG_NURSING_PERSONA_COVERAGE) {
	const fetched = await fetchNppesProviders({
		taxonomy_description: persona.taxonomy_description,
		state: persona.state,
		city: persona.city,
		postal_code: persona.postal_code
	}, { fetchedAt: evaluatedAt });
	const normalized = await normalizeNppesRecordsForAbundance(fetched.records, evaluatedAt);
	if (fetched.records.length > 0 && normalized.providers.length === 0) {
		throw new Error(`Every NPPES source record failed provider normalization for ${persona.id}.`);
	}
	const providers = filterHealthcareProvidersForPersona(normalized.providers, persona);
	const excludedCount = fetched.source_records_scanned - fetched.records.length +
		normalized.providers.length - providers.length;
	const report = assessHealthcareProviderCoverage(providers, {
		persona,
		evaluatedAt,
		source: {
			latest_fetched_at: evaluatedAt,
			coverage_limit_reached: fetched.coverage_limit_reached
		}
	});

	reports.push({
		...report,
		ingestion: {
			pages_fetched: fetched.pages_fetched,
			source_result_count: fetched.source_records_scanned,
			normalized_count: providers.length,
			rejected_count: normalized.rejected_count,
			excluded_count: excludedCount
		}
	});
}

process.stdout.write(`${JSON.stringify({
	client: 'The NP Group / NPG',
	source: 'CMS NPPES NPI Registry API v2.1',
	evaluated_at: evaluatedAt,
	reports
}, null, 2)}\n`);
