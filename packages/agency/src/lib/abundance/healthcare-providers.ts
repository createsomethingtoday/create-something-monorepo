export type HealthcareProviderStatus = 'active' | 'deactivated' | 'unknown';
export type HealthcareCoverageStatus = 'ready' | 'degraded' | 'blocked';

export interface HealthcareProvider {
	id: string;
	npi: string;
	enumeration_type: string;
	name: string;
	first_name?: string;
	middle_name?: string;
	last_name?: string;
	credential?: string;
	status: HealthcareProviderStatus;
	enumeration_date?: string;
	last_updated_date?: string;
	certification_date?: string;
	primary_taxonomy_code?: string;
	primary_taxonomy_description?: string;
	license_state?: string;
	license_number?: string;
	taxonomies_json: string;
	practice_address_1?: string;
	practice_address_2?: string;
	practice_city?: string;
	practice_state?: string;
	practice_postal_code?: string;
	practice_country?: string;
	practice_phone?: string;
	endpoint_count: number;
	source_system: 'nppes_npi_registry_v2_1';
	source_payload_hash: string;
	source_fetched_at: string;
	created_at?: string;
	updated_at?: string;
}

export interface NursingPersonaCoverageQuery {
	id: string;
	label: string;
	taxonomy_description: string;
	state?: string;
	city?: string;
	postal_code?: string;
}

export interface HealthcareProviderCoverageReport {
	persona: NursingPersonaCoverageQuery;
	evaluated_at: string;
	market_coverage_status: HealthcareCoverageStatus;
	market_coverage_reasons: string[];
	direct_outreach_status: 'blocked';
	direct_outreach_reasons: string[];
	provider_count: number;
	active_count: number;
	deactivated_count: number;
	unknown_status_count: number;
	administrative_recency: {
		updated_within_1_year_count: number;
		updated_within_3_years_count: number;
		older_than_3_years_count: number;
		unknown_count: number;
	};
	completeness: {
		primary_taxonomy_count: number;
		practice_location_count: number;
		practice_phone_count: number;
		license_field_count: number;
		endpoint_count: number;
	};
	source: {
		latest_fetched_at?: string;
		snapshot_age_days?: number;
		coverage_limit_reached: boolean;
	};
	limitations: string[];
}

export interface SqlStatement {
	sql: string;
	args: unknown[];
}

type NppesRecord = Record<string, unknown>;

export async function normalizeNppesProvider(
	record: NppesRecord,
	options: { fetchedAt?: string } = {}
): Promise<HealthcareProvider> {
	const npi = cleanString(record.number);
	if (!npi || !/^\d{10}$/.test(npi)) {
		throw new Error('NPPES provider record requires a 10-digit NPI number.');
	}

	const basic = asRecord(record.basic);
	const taxonomies = asRecordArray(record.taxonomies);
	const addresses = asRecordArray(record.addresses);
	const endpoints = asRecordArray(record.endpoints);
	const primaryTaxonomy = taxonomies.find((taxonomy) => taxonomy.primary === true);
	const practiceAddress =
		addresses.find((address) => cleanString(address.address_purpose)?.toUpperCase() === 'LOCATION') ??
		addresses[0];
	const firstName = cleanNamePart(basic.first_name);
	const middleName = cleanNamePart(basic.middle_name);
	const lastName = cleanNamePart(basic.last_name);
	const organizationName = cleanNamePart(basic.organization_name);
	const name = [firstName, middleName, lastName].filter(Boolean).join(' ') || organizationName || `NPI ${npi}`;
	const fetchedAt = options.fetchedAt ?? new Date().toISOString();

	return {
		id: `abprovider_${npi}`,
		npi,
		enumeration_type: cleanString(record.enumeration_type) ?? 'unknown',
		name,
		first_name: firstName,
		middle_name: middleName,
		last_name: lastName,
		credential: cleanString(basic.credential),
		status: normalizeProviderStatus(basic.status),
		enumeration_date: cleanDate(basic.enumeration_date),
		last_updated_date: cleanDate(basic.last_updated),
		certification_date: cleanDate(basic.certification_date),
		primary_taxonomy_code: cleanString(primaryTaxonomy?.code),
		primary_taxonomy_description: cleanString(primaryTaxonomy?.desc),
		license_state: cleanString(primaryTaxonomy?.state)?.toUpperCase(),
		license_number: cleanString(primaryTaxonomy?.license),
		taxonomies_json: canonicalJson(
			taxonomies.map((taxonomy) => ({
				code: cleanString(taxonomy.code),
				description: cleanString(taxonomy.desc),
				license_state: cleanString(taxonomy.state)?.toUpperCase(),
				license_number: cleanString(taxonomy.license),
				primary: taxonomy.primary === true
			}))
		),
		practice_address_1: cleanNamePart(practiceAddress?.address_1),
		practice_address_2: cleanNamePart(practiceAddress?.address_2),
		practice_city: cleanNamePart(practiceAddress?.city),
		practice_state: cleanString(practiceAddress?.state)?.toUpperCase(),
		practice_postal_code: normalizePostalCode(practiceAddress?.postal_code, practiceAddress?.country_code),
		practice_country: cleanString(practiceAddress?.country_code)?.toUpperCase(),
		practice_phone: cleanString(practiceAddress?.telephone_number),
		endpoint_count: endpoints.length,
		source_system: 'nppes_npi_registry_v2_1',
		source_payload_hash: await sha256(canonicalJson(record)),
		source_fetched_at: fetchedAt
	};
}

export function assessHealthcareProviderCoverage(
	providers: HealthcareProvider[],
	options: {
		evaluatedAt?: string;
		persona: NursingPersonaCoverageQuery;
		source?: {
			latest_fetched_at?: string;
			coverage_limit_reached?: boolean;
		};
	}
): HealthcareProviderCoverageReport {
	const evaluatedAt = options.evaluatedAt ?? new Date().toISOString();
	const evaluatedAtMs = Date.parse(evaluatedAt);
	const sourceFetchedAt = options.source?.latest_fetched_at;
	const sourceAgeDays = sourceFetchedAt
		? Math.max(0, (evaluatedAtMs - Date.parse(sourceFetchedAt)) / 86_400_000)
		: undefined;
	const coverageLimitReached = options.source?.coverage_limit_reached ?? false;

	let activeCount = 0;
	let deactivatedCount = 0;
	let unknownStatusCount = 0;
	let updatedWithin1YearCount = 0;
	let updatedWithin3YearsCount = 0;
	let olderThan3YearsCount = 0;
	let unknownRecencyCount = 0;
	let primaryTaxonomyCount = 0;
	let practiceLocationCount = 0;
	let practicePhoneCount = 0;
	let licenseFieldCount = 0;
	let endpointCount = 0;

	for (const provider of providers) {
		if (provider.status === 'active') activeCount += 1;
		else if (provider.status === 'deactivated') deactivatedCount += 1;
		else unknownStatusCount += 1;

		if (provider.last_updated_date) {
			const ageDays = (evaluatedAtMs - Date.parse(provider.last_updated_date)) / 86_400_000;
			if (ageDays <= 365) updatedWithin1YearCount += 1;
			if (ageDays <= 365 * 3) updatedWithin3YearsCount += 1;
			else olderThan3YearsCount += 1;
		} else {
			unknownRecencyCount += 1;
		}

		if (provider.primary_taxonomy_code) primaryTaxonomyCount += 1;
		if (provider.practice_city && provider.practice_state) practiceLocationCount += 1;
		if (provider.practice_phone) practicePhoneCount += 1;
		if (provider.license_state && provider.license_number) licenseFieldCount += 1;
		if (provider.endpoint_count > 0) endpointCount += 1;
	}

	const reasons: string[] = [];
	let marketCoverageStatus: HealthcareCoverageStatus = 'ready';
	if (providers.length === 0) {
		marketCoverageStatus = 'blocked';
		reasons.push('No provider records were available for this persona and geography.');
	}
	if (providers.length > 0 && activeCount === 0) {
		marketCoverageStatus = 'blocked';
		reasons.push('No active provider records were available for this persona and geography.');
	} else if (providers.length > 0 && activeCount / providers.length < 0.8) {
		marketCoverageStatus = 'degraded';
		reasons.push('Fewer than 80% of records are active in NPPES.');
	}
	if (coverageLimitReached && marketCoverageStatus !== 'blocked') {
		marketCoverageStatus = 'degraded';
		reasons.push('The NPPES result limit was reached, so the observed provider count is a lower bound.');
	}
	if (sourceAgeDays === undefined && marketCoverageStatus !== 'blocked') {
		marketCoverageStatus = 'degraded';
		reasons.push('The latest source fetch time is unknown.');
	} else if (sourceAgeDays !== undefined && sourceAgeDays > 7 && marketCoverageStatus !== 'blocked') {
		marketCoverageStatus = 'degraded';
		reasons.push('The latest source fetch is more than seven days old.');
	}
	if (providers.length > 0 && primaryTaxonomyCount / providers.length < 0.9 && marketCoverageStatus !== 'blocked') {
		marketCoverageStatus = 'degraded';
		reasons.push('Fewer than 90% of records have a primary taxonomy.');
	}
	if (providers.length > 0 && practiceLocationCount / providers.length < 0.8 && marketCoverageStatus !== 'blocked') {
		marketCoverageStatus = 'degraded';
		reasons.push('Fewer than 80% of records have a usable practice location.');
	}
	if (providers.length > 0 && olderThan3YearsCount / providers.length > 0.5 && marketCoverageStatus !== 'blocked') {
		marketCoverageStatus = 'degraded';
		reasons.push('More than half of the cohort has not received an NPPES administrative update in over three years.');
	}
	if (providers.length > 0 && unknownRecencyCount > 0 && marketCoverageStatus !== 'blocked') {
		marketCoverageStatus = 'degraded';
		reasons.push('Administrative update recency is unknown for one or more records.');
	}
	if (reasons.length === 0) {
		reasons.push('The source snapshot is current and the cohort has sufficient taxonomy and location coverage for market analysis.');
	}

	return {
		persona: options.persona,
		evaluated_at: evaluatedAt,
		market_coverage_status: marketCoverageStatus,
		market_coverage_reasons: reasons,
		direct_outreach_status: 'blocked',
		direct_outreach_reasons: [
			'NPPES does not provide recruiting consent, personal contact details, or current employment availability.',
			'A recruiter must validate the person, role fit, contact route, and outreach authority before promotion.'
		],
		provider_count: providers.length,
		active_count: activeCount,
		deactivated_count: deactivatedCount,
		unknown_status_count: unknownStatusCount,
		administrative_recency: {
			updated_within_1_year_count: updatedWithin1YearCount,
			updated_within_3_years_count: updatedWithin3YearsCount,
			older_than_3_years_count: olderThan3YearsCount,
			unknown_count: unknownRecencyCount
		},
		completeness: {
			primary_taxonomy_count: primaryTaxonomyCount,
			practice_location_count: practiceLocationCount,
			practice_phone_count: practicePhoneCount,
			license_field_count: licenseFieldCount,
			endpoint_count: endpointCount
		},
		source: {
			latest_fetched_at: sourceFetchedAt,
			snapshot_age_days: sourceAgeDays === undefined ? undefined : round(sourceAgeDays),
			coverage_limit_reached: coverageLimitReached
		},
		limitations: [
			'NPPES administrative recency does not establish current employment or availability.',
			'An NPI does not verify current licensure, credentials, sanctions, or fitness for a role.',
			'Practice telephone numbers are organization-level routes and may not reach the named provider.',
			'NPPES does not provide recruiting consent or a personal outreach channel.'
		]
	};
}

export function filterHealthcareProvidersForPersona(
	providers: HealthcareProvider[],
	persona: NursingPersonaCoverageQuery
): HealthcareProvider[] {
	const taxonomy = persona.taxonomy_description.trim().toLowerCase();
	const state = persona.state?.trim().toUpperCase();
	const city = persona.city?.trim().toLowerCase();
	const postalCode = persona.postal_code?.trim().slice(0, 5);
	return providers.filter((provider) => {
		if (provider.primary_taxonomy_description?.trim().toLowerCase() !== taxonomy) return false;
		if (state && provider.practice_state?.toUpperCase() !== state) return false;
		if (city && provider.practice_city?.toLowerCase() !== city) return false;
		if (postalCode && !provider.practice_postal_code?.startsWith(postalCode)) return false;
		return true;
	});
}

export function buildHealthcareProviderUpsert(provider: HealthcareProvider): SqlStatement {
	return buildHealthcareProviderBulkUpsert([provider]);
}

export function buildHealthcareProviderBulkUpsert(providers: HealthcareProvider[]): SqlStatement {
	if (providers.length < 1 || providers.length > 3) {
		throw new Error('Healthcare provider bulk upserts require between one and three providers.');
	}
	const valueRows = providers.map(() => `(${HEALTHCARE_PROVIDER_COLUMNS.map(() => '?').join(', ')})`);
	return {
		sql: `
			INSERT INTO abundance_healthcare_providers (
				${HEALTHCARE_PROVIDER_COLUMNS.join(', ')}
			) VALUES ${valueRows.join(', ')}
			ON CONFLICT(npi) DO UPDATE SET
				${HEALTHCARE_PROVIDER_UPDATE_COLUMNS.map((column) => `${column} = excluded.${column}`).join(',\n\t\t\t\t')},
				updated_at = datetime('now')
		`.trim(),
		args: providers.flatMap(healthcareProviderArgs)
	};
}

const HEALTHCARE_PROVIDER_COLUMNS = [
	'id', 'npi', 'enumeration_type', 'name', 'first_name', 'middle_name', 'last_name',
	'credential', 'status', 'enumeration_date', 'last_updated_date', 'certification_date',
	'primary_taxonomy_code', 'primary_taxonomy_description', 'license_state', 'license_number',
	'taxonomies_json', 'practice_address_1', 'practice_address_2', 'practice_city',
	'practice_state', 'practice_postal_code', 'practice_country', 'practice_phone',
	'endpoint_count', 'source_system', 'source_payload_hash', 'source_fetched_at'
] as const;

const HEALTHCARE_PROVIDER_UPDATE_COLUMNS = HEALTHCARE_PROVIDER_COLUMNS.filter(
	(column) => column !== 'id' && column !== 'npi'
);

function healthcareProviderArgs(provider: HealthcareProvider): unknown[] {
	return [
		provider.id, provider.npi, provider.enumeration_type, provider.name,
		provider.first_name ?? null, provider.middle_name ?? null, provider.last_name ?? null,
		provider.credential ?? null, provider.status, provider.enumeration_date ?? null,
		provider.last_updated_date ?? null, provider.certification_date ?? null,
		provider.primary_taxonomy_code ?? null, provider.primary_taxonomy_description ?? null,
		provider.license_state ?? null, provider.license_number ?? null, provider.taxonomies_json,
		provider.practice_address_1 ?? null, provider.practice_address_2 ?? null,
		provider.practice_city ?? null, provider.practice_state ?? null,
		provider.practice_postal_code ?? null, provider.practice_country ?? null,
		provider.practice_phone ?? null, provider.endpoint_count, provider.source_system,
		provider.source_payload_hash, provider.source_fetched_at
	];
}

function normalizeProviderStatus(value: unknown): HealthcareProviderStatus {
	const status = cleanString(value)?.toUpperCase();
	if (status === 'A') return 'active';
	if (status === 'D') return 'deactivated';
	return 'unknown';
}

function normalizePostalCode(value: unknown, country: unknown): string | undefined {
	const postalCode = cleanString(value)?.replace(/\s+/g, '');
	if (!postalCode) return undefined;
	return cleanString(country)?.toUpperCase() === 'US' ? postalCode.slice(0, 5) : postalCode;
}

function cleanDate(value: unknown): string | undefined {
	const candidate = cleanString(value);
	if (!candidate || Number.isNaN(Date.parse(candidate))) return undefined;
	return candidate.slice(0, 10);
}

function cleanNamePart(value: unknown): string | undefined {
	const candidate = cleanString(value);
	if (!candidate) return undefined;
	return candidate
		.toLocaleLowerCase('en-US')
		.replace(/(^|[\s'-])\p{L}/gu, (letter) => letter.toLocaleUpperCase('en-US'));
}

function cleanString(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const candidate = value.trim();
	return candidate || undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === 'object' && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
	return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}

function canonicalJson(value: unknown): string {
	return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(sortValue);
	if (value && typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value as Record<string, unknown>)
				.sort(([left], [right]) => left.localeCompare(right))
				.map(([key, item]) => [key, sortValue(item)])
		);
	}
	return value;
}

async function sha256(value: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function round(value: number): number {
	return Math.round(value * 100) / 100;
}
