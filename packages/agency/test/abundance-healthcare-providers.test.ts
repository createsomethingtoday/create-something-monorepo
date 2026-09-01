import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

import {
	assessHealthcareProviderCoverage,
	buildHealthcareProviderBulkUpsert,
	buildHealthcareProviderUpsert,
	filterHealthcareProvidersForPersona,
	normalizeNppesProvider
} from '../src/lib/abundance/healthcare-providers.ts';
import {
	buildNppesProviderUrl,
	createHealthcareProviderIngestionRun,
	fetchNppesProviders,
	NppesProviderFetchError,
	readHealthcareProviderCoverage,
	upsertHealthcareProviders
} from '../src/lib/server/abundance-healthcare-providers.ts';
import { NPG_NURSING_PERSONA_COVERAGE } from '../src/lib/abundance/npg-healthcare-personas.ts';
import { POST as refreshHealthcareProviderCoverage } from '../src/routes/api/abundance/healthcare-providers/+server.ts';

const fetchedAt = '2026-09-01T18:00:00.000Z';

test('NPPES records normalize into a provider-independent healthcare coverage shape', async () => {
	const provider = await normalizeNppesProvider(
		{
			number: '1528597564',
			enumeration_type: 'NPI-1',
			basic: {
				first_name: 'JESSICA',
				middle_name: 'L',
				last_name: 'ACRE',
				credential: 'RN',
				status: 'A',
				enumeration_date: '2017-06-05',
				last_updated: '2026-04-09',
				certification_date: '2026-04-09'
			},
			taxonomies: [
				{
					code: '363LF0000X',
					desc: 'Nurse Practitioner, Family',
					license: '2017023106',
					state: 'MO',
					primary: true
				}
			],
			addresses: [
				{
					address_purpose: 'LOCATION',
					address_1: '1965 S FREMONT AVE STE 100',
					city: 'SPRINGFIELD',
					state: 'MO',
					postal_code: '658042299',
					country_code: 'US',
					telephone_number: '417-820-3800'
				}
			],
			endpoints: []
		},
		{ fetchedAt }
	);

	assert.equal(provider.id, 'abprovider_1528597564');
	assert.equal(provider.npi, '1528597564');
	assert.equal(provider.name, 'Jessica L Acre');
	assert.equal(provider.status, 'active');
	assert.equal(provider.primary_taxonomy_code, '363LF0000X');
	assert.equal(provider.primary_taxonomy_description, 'Nurse Practitioner, Family');
	assert.equal(provider.license_state, 'MO');
	assert.equal(provider.practice_city, 'Springfield');
	assert.equal(provider.practice_postal_code, '65804');
	assert.equal(provider.practice_phone, '417-820-3800');
	assert.equal(provider.source_fetched_at, fetchedAt);
	assert.match(provider.source_payload_hash, /^[a-f0-9]{64}$/);
});

test('coverage health separates fresh market evidence from outreach eligibility', async () => {
	const providers = await Promise.all([
		fixtureProvider({ npi: '1000000001', lastUpdated: '2026-08-20', phone: '417-555-0101' }),
		fixtureProvider({ npi: '1000000002', lastUpdated: '2024-08-20', phone: undefined }),
		fixtureProvider({ npi: '1000000003', lastUpdated: '2018-01-10', status: 'D', phone: '417-555-0103' })
	]);

	const report = assessHealthcareProviderCoverage(providers, {
		evaluatedAt: '2026-09-01T20:00:00.000Z',
		persona: {
			id: 'family-np-springfield-mo',
			label: 'Family nurse practitioners in Springfield, Missouri',
			taxonomy_description: 'Nurse Practitioner, Family',
			city: 'Springfield',
			state: 'MO'
		},
		source: {
			latest_fetched_at: fetchedAt,
			coverage_limit_reached: false
		}
	});

	assert.equal(report.market_coverage_status, 'degraded');
	assert.ok(report.market_coverage_reasons.some((reason) => /fewer than 80%.*active/i.test(reason)));
	assert.equal(report.direct_outreach_status, 'blocked');
	assert.equal(report.provider_count, 3);
	assert.equal(report.active_count, 2);
	assert.equal(report.administrative_recency.updated_within_1_year_count, 1);
	assert.equal(report.administrative_recency.updated_within_3_years_count, 2);
	assert.equal(report.completeness.practice_phone_count, 2);
	assert.equal(report.completeness.primary_taxonomy_count, 3);
	assert.ok(report.limitations.some((limitation) => /does not verify current licensure/i.test(limitation)));
	assert.ok(report.limitations.some((limitation) => /does not provide recruiting consent/i.test(limitation)));
});

test('coverage health is degraded when the source result cap is reached', async () => {
	const providers = await Promise.all([
		fixtureProvider({ npi: '1000000004', lastUpdated: '2026-08-20', phone: '417-555-0104' })
	]);

	const report = assessHealthcareProviderCoverage(providers, {
		evaluatedAt: '2026-09-01T20:00:00.000Z',
		persona: {
			id: 'missouri-np',
			label: 'Missouri nurse practitioners',
			taxonomy_description: 'Nurse Practitioner',
			state: 'MO'
		},
		source: {
			latest_fetched_at: fetchedAt,
			coverage_limit_reached: true
		}
	});

	assert.equal(report.market_coverage_status, 'degraded');
	assert.ok(report.market_coverage_reasons.some((reason) => /result limit/i.test(reason)));
});

test('coverage is blocked when a cohort has no active providers', async () => {
	const provider = await fixtureProvider({
		npi: '1000000014',
		lastUpdated: '2018-08-20',
		status: 'D'
	});
	const incompleteProvider = {
		...provider,
		primary_taxonomy_code: undefined,
		practice_city: undefined,
		practice_state: undefined
	};
	const report = assessHealthcareProviderCoverage([incompleteProvider], {
		evaluatedAt: '2026-09-01T20:00:00.000Z',
		persona: NPG_NURSING_PERSONA_COVERAGE[0],
		source: { latest_fetched_at: fetchedAt }
	});
	assert.equal(report.market_coverage_status, 'blocked');
	assert.ok(report.market_coverage_reasons.some((reason) => /no active provider/i.test(reason)));
});

test('malformed refresh JSON returns a client error', async () => {
	const response = await refreshHealthcareProviderCoverage({
		request: new Request('https://createsomething.agency/api/abundance/healthcare-providers', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: '{broken'
		}),
		platform: { env: { DB: {} as D1Database } }
	} as never);

	assert.equal(response.status, 400);
});

test('persona coverage excludes mailing-address and taxonomy false positives', async () => {
	const springfieldFamily = await fixtureProvider({ npi: '1000000011', lastUpdated: '2026-08-20' });
	const otherCity = { ...springfieldFamily, npi: '1000000012', practice_city: 'Branson' };
	const otherTaxonomy = {
		...springfieldFamily,
		npi: '1000000013',
		primary_taxonomy_description: 'Nurse Practitioner, Acute Care'
	};
	const filtered = filterHealthcareProvidersForPersona(
		[springfieldFamily, otherCity, otherTaxonomy],
		NPG_NURSING_PERSONA_COVERAGE[0]
	);
	assert.deepEqual(filtered.map((provider) => provider.npi), ['1000000011']);
});

test('provider upsert keeps NPI as the stable source boundary', async () => {
	const provider = await fixtureProvider({ npi: '1000000005', lastUpdated: '2026-08-20' });
	const statement = buildHealthcareProviderUpsert(provider);

	assert.match(statement.sql, /ON CONFLICT\(npi\)/);
	assert.equal(statement.args[1], '1000000005');
});

test('provider upserts stay under D1 bind and query budgets at the public maximum', async () => {
	const base = await fixtureProvider({ npi: '1000000005', lastUpdated: '2026-08-20' });
	const providers = Array.from({ length: 1200 }, (_, index) => ({
		...base,
		id: `abprovider_${String(index).padStart(10, '0')}`,
		npi: String(index).padStart(10, '0')
	}));
	const captured: Array<{ sql: string; args: unknown[] }> = [];
	const batchSizes: number[] = [];
	const db = {
		prepare(sql: string) {
			return {
				bind(...args: unknown[]) {
					const statement = { sql, args };
					captured.push(statement);
					return statement;
				}
			};
		},
		async batch(statements: unknown[]) {
			batchSizes.push(statements.length);
			return statements;
		}
	} as unknown as D1Database;

	await upsertHealthcareProviders(db, providers);
	assert.equal(captured.length, 400);
	assert.deepEqual(batchSizes, [100, 100, 100, 100]);
	assert.ok(captured.every((statement) => statement.args.length <= 100));
	assert.equal(buildHealthcareProviderBulkUpsert(providers.slice(0, 3)).args.length, 84);
});

test('bulk provider upsert executes against the healthcare coverage migration', async () => {
	const providers = await Promise.all([
		fixtureProvider({ npi: '1000000021', lastUpdated: '2026-08-20' }),
		fixtureProvider({ npi: '1000000022', lastUpdated: '2025-08-20' }),
		fixtureProvider({ npi: '1000000023', lastUpdated: '2024-08-20' })
	]);
	const migration = await readFile(
		new URL('../migrations/0044_abundance_healthcare_provider_coverage.sql', import.meta.url),
		'utf8'
	);
	const database = new DatabaseSync(':memory:');
	try {
		database.exec('PRAGMA foreign_keys = ON;');
		database.exec(migration);
		const upsert = buildHealthcareProviderBulkUpsert(providers);
		database.prepare(upsert.sql).run(...upsert.args as SQLInputValue[]);
		const result = database.prepare('SELECT count(*) AS count FROM abundance_healthcare_providers').get() as { count: number };
		assert.equal(result.count, 3);
	} finally {
		database.close();
	}
});

test('snapshot membership writes stay within the D1 100-bind ceiling', async () => {
	const base = await fixtureProvider({ npi: '1000000031', lastUpdated: '2026-08-20' });
	const providers = Array.from({ length: 1200 }, (_, index) => ({
		...base,
		id: `abprovider_${String(index).padStart(10, '0')}`,
		npi: String(index).padStart(10, '0')
	}));
	const captured: Array<{ sql: string; args: unknown[] }> = [];
	const db = {
		prepare(sql: string) {
			return {
				bind(...args: unknown[]) {
					const statement = { sql, args };
					captured.push(statement);
					return statement;
				}
			};
		},
		async batch(statements: unknown[]) { return statements; }
	} as unknown as D1Database;

	await createHealthcareProviderIngestionRun(db, {
		id: 'run_maximum',
		persona: NPG_NURSING_PERSONA_COVERAGE[1],
		status: 'succeeded',
		fetchedAt,
		pagesFetched: 6,
		sourceResultCount: 1200,
		normalizedCount: 1200,
		rejectedCount: 0,
		excludedCount: 0,
		coverageLimitReached: true,
		providers
	});

	assert.equal(captured.length, 41);
	assert.ok(captured.every((statement) => statement.args.length <= 100));
	assert.equal(JSON.parse(String(captured[1].args[2])).practice_state, 'MO');
});

test('stored coverage reads immutable run snapshots instead of mutable provider rows', async () => {
	const historical = await fixtureProvider({ npi: '1000000041', lastUpdated: '2024-08-20' });
	const db = {
		prepare(sql: string) {
			return {
				bind() {
					return sql.includes('FROM abundance_healthcare_provider_ingestion_runs')
						? { async first() { return { id: 'historical_run', fetched_at: fetchedAt, coverage_limit_reached: 0 }; } }
						: { async all() { return { results: [{ provider_snapshot_json: JSON.stringify(historical) }] }; } };
				}
			};
		}
	} as unknown as D1Database;

	const result = await readHealthcareProviderCoverage(db, NPG_NURSING_PERSONA_COVERAGE[0], { evaluatedAt: fetchedAt });
	assert.equal(result.providers[0].practice_state, 'MO');
	assert.equal(result.providers[0].last_updated_date, '2024-08-20');
});

test('stored coverage reads require exact nullable geography', async () => {
	let runQuery: { sql: string; args: unknown[] } | undefined;
	const db = {
		prepare(sql: string) {
			return {
				bind(...args: unknown[]) {
					runQuery = { sql, args };
					return { async first() { return null; } };
				}
			};
		}
	} as unknown as D1Database;

	await readHealthcareProviderCoverage(db, NPG_NURSING_PERSONA_COVERAGE[1], { evaluatedAt: fetchedAt });
	assert.match(runQuery?.sql ?? '', /coalesce\(upper\(state\), ''\) = coalesce\(upper\(\?\), ''\)/);
	assert.match(runQuery?.sql ?? '', /coalesce\(lower\(city\), ''\) = coalesce\(lower\(\?\), ''\)/);
	assert.deepEqual(runQuery?.args, [
		'npg-family-np-missouri',
		'Nurse Practitioner, Family',
		'MO',
		null,
		null
	]);
});

test('NPPES query builder requires a nursing taxonomy and geography', () => {
	assert.throws(
		() => buildNppesProviderUrl({ taxonomy_description: 'Nurse Practitioner' }, { limit: 10, skip: 0 }),
		/state, city, or postal_code/
	);

	const url = new URL(
		buildNppesProviderUrl(
			{
				taxonomy_description: 'Nurse Practitioner, Family',
				state: 'mo',
				city: 'Springfield'
			},
			{ limit: 200, skip: 0 }
		)
	);

	assert.equal(url.origin, 'https://npiregistry.cms.hhs.gov');
	assert.equal(url.searchParams.get('version'), '2.1');
	assert.equal(url.searchParams.get('enumeration_type'), 'NPI-1');
	assert.equal(url.searchParams.get('taxonomy_description'), 'Nurse Practitioner');
	assert.equal(url.searchParams.get('state'), 'MO');
	assert.equal(url.searchParams.get('city'), 'Springfield');
	assert.equal(url.searchParams.get('limit'), '200');
});

test('NPPES fetch broadens source syntax but keeps only the requested canonical taxonomy', async () => {
	const calls: string[] = [];
	const result = await fetchNppesProviders(
		{
			taxonomy_description: 'Nurse Practitioner, Family',
			city: 'Springfield',
			state: 'MO',
			max_records: 10
		},
		{
			fetchFn: async (input) => {
				calls.push(String(input));
				return jsonResponse({
					result_count: 2,
					results: [
						{ number: '1111111111', taxonomies: [{ desc: 'Nurse Practitioner, Family', primary: true }] },
						{ number: '2222222222', taxonomies: [{ desc: 'Nurse Practitioner, Acute Care', primary: true }] }
					]
				});
			}
		}
	);

	assert.equal(new URL(calls[0]).searchParams.get('taxonomy_description'), 'Nurse Practitioner');
	assert.equal(result.source_records_scanned, 2);
	assert.deepEqual(result.records.map((record) => record.number), ['1111111111']);
});

test('NPPES fetch paginates within the public API limit and reports truncation', async () => {
	const requests: URL[] = [];
	const fetchFn: typeof fetch = async (input) => {
		const url = new URL(String(input));
		requests.push(url);
		const limit = Number(url.searchParams.get('limit'));
		const skip = Number(url.searchParams.get('skip'));
		return jsonResponse({
			result_count: limit,
			results: Array.from({ length: limit }, (_, index) => ({
				number: String(1000000000 + skip + index),
				basic: { status: 'A' }
			}))
		});
	};

	const result = await fetchNppesProviders(
		{
			taxonomy_description: 'Nurse Practitioner',
			state: 'MO',
			max_records: 450
		},
		{ fetchFn, fetchedAt: fetchedAt }
	);

	assert.equal(result.records.length, 450);
	assert.equal(result.pages_fetched, 3);
	assert.equal(result.coverage_limit_reached, true);
	assert.equal(result.fetched_at, fetchedAt);
	assert.deepEqual(
		requests.map((url) => [url.searchParams.get('skip'), url.searchParams.get('limit')]),
		[['0', '200'], ['200', '200'], ['400', '50']]
	);
});

test('NPPES fetch stops when a page is shorter than requested', async () => {
	let requestCount = 0;
	const fetchFn: typeof fetch = async () => {
		requestCount += 1;
		return jsonResponse({
			result_count: 2,
			results: [{ number: '1000000001' }, { number: '1000000002' }]
		});
	};

	const result = await fetchNppesProviders(
		{
			taxonomy_description: 'Registered Nurse',
			city: 'Springfield',
			state: 'MO',
			max_records: 1200
		},
		{ fetchFn }
	);

	assert.equal(requestCount, 1);
	assert.equal(result.records.length, 2);
	assert.equal(result.coverage_limit_reached, false);
});

test('NPPES fetch failures preserve completed-page progress', async () => {
	let callCount = 0;
	await assert.rejects(
		fetchNppesProviders(
			{
				taxonomy_description: 'Nurse Practitioner',
				state: 'MO',
				max_records: 400
			},
			{
				fetchFn: async () => {
					callCount += 1;
					return callCount === 1
						? jsonResponse({ results: Array.from({ length: 200 }, (_, index) => ({ number: String(index) })) })
						: new Response('upstream unavailable', { status: 503 });
				}
			}
		),
		(error: unknown) => {
			assert.ok(error instanceof NppesProviderFetchError);
			assert.equal(error.progress.pages_fetched, 1);
			assert.equal(error.progress.source_records_scanned, 200);
			assert.equal(error.progress.records.length, 200);
			return true;
		}
	);
});

test('failed refresh ledger retains partial NPPES progress', async () => {
	const originalFetch = globalThis.fetch;
	let callCount = 0;
	const captured: Array<{ sql: string; args: unknown[] }> = [];
	globalThis.fetch = (async () => {
		callCount += 1;
		return callCount === 1
			? jsonResponse({ results: Array.from({ length: 200 }, (_, index) => ({ number: String(index) })) })
			: new Response('upstream unavailable', { status: 503 });
	}) as typeof fetch;
	const db = {
		prepare(sql: string) {
			return {
				bind(...args: unknown[]) {
					const statement = { sql, args };
					captured.push(statement);
					return statement;
				}
			};
		},
		async batch(statements: unknown[]) { return statements; }
	} as unknown as D1Database;

	try {
		const response = await refreshHealthcareProviderCoverage({
			request: new Request('https://createsomething.agency/api/abundance/healthcare-providers', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...NPG_NURSING_PERSONA_COVERAGE[1],
					max_records: 400
				})
			}),
			platform: { env: { DB: db } }
		} as never);
		assert.equal(response.status, 500);
		const runStatement = captured.find((statement) => /INSERT INTO abundance_healthcare_provider_ingestion_runs/.test(statement.sql));
		assert.equal(runStatement?.args[7], 'failed');
		assert.equal(runStatement?.args[9], 1);
		assert.equal(runStatement?.args[10], 200);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test('healthcare provider migration preserves provenance and ingestion evidence', async () => {
	const migration = await readFile(
		new URL('../migrations/0044_abundance_healthcare_provider_coverage.sql', import.meta.url),
		'utf8'
	);

	assert.match(migration, /CREATE TABLE IF NOT EXISTS abundance_healthcare_providers/);
	assert.match(migration, /npi TEXT NOT NULL UNIQUE/);
	assert.match(migration, /source_payload_hash TEXT NOT NULL/);
	assert.match(migration, /CREATE TABLE IF NOT EXISTS abundance_healthcare_provider_ingestion_runs/);
	assert.match(migration, /CREATE TABLE IF NOT EXISTS abundance_healthcare_provider_ingestion_memberships/);
	assert.match(migration, /PRIMARY KEY \(run_id, provider_npi\)/);
	assert.match(migration, /provider_snapshot_json TEXT NOT NULL/);
	assert.match(migration, /coverage_limit_reached INTEGER NOT NULL/);
	assert.match(migration, /excluded_count INTEGER NOT NULL/);
	assert.doesNotMatch(migration, /social_security|date_of_birth|personal_email/i);
});

test('NPG persona coverage mirrors the client sourcing question without inventing roles', () => {
	assert.deepEqual(NPG_NURSING_PERSONA_COVERAGE, [
		{
			id: 'npg-family-np-springfield-mo',
			label: 'Family nurse practitioners in Springfield, Missouri',
			taxonomy_description: 'Nurse Practitioner, Family',
			city: 'Springfield',
			state: 'MO'
		},
		{
			id: 'npg-family-np-missouri',
			label: 'Family nurse practitioners in Missouri',
			taxonomy_description: 'Nurse Practitioner, Family',
			state: 'MO'
		}
	]);
});

async function fixtureProvider(input: {
	npi: string;
	lastUpdated: string;
	status?: string;
	phone?: string;
}) {
	return normalizeNppesProvider(
		{
			number: input.npi,
			enumeration_type: 'NPI-1',
			basic: {
				first_name: 'TEST',
				last_name: 'PROVIDER',
				credential: 'APRN',
				status: input.status ?? 'A',
				enumeration_date: '2018-01-01',
				last_updated: input.lastUpdated
			},
			taxonomies: [
				{
					code: '363LF0000X',
					desc: 'Nurse Practitioner, Family',
					license: 'LICENSE',
					state: 'MO',
					primary: true
				}
			],
			addresses: [
				{
					address_purpose: 'LOCATION',
					address_1: '100 TEST ST',
					city: 'SPRINGFIELD',
					state: 'MO',
					postal_code: '65801',
					country_code: 'US',
					telephone_number: input.phone
				}
			],
			endpoints: []
		},
		{ fetchedAt }
	);
}

function jsonResponse(body: unknown, init?: ResponseInit): Response {
	return new Response(JSON.stringify(body), {
		...init,
		headers: { 'Content-Type': 'application/json' }
	});
}
