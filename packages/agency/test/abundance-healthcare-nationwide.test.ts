import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

import type { HealthcareProvider } from '../src/lib/abundance/healthcare-providers.ts';
import {
	applyNationwideChunk,
	beginNationwideRun,
	finalizeNationwideRun,
	queryNationwideCoverage
} from '../src/lib/server/abundance-healthcare-nationwide.ts';

test('monthly full snapshots become visible only after complete finalization', async () => {
	const fixture = await createDatabase();
	try {
		await beginNationwideRun(fixture.db, {
			id: 'abnationalrun_monthly', sourceKind: 'monthly_full', sourceFile: 'monthly.zip',
			sourceUrl: 'https://download.cms.gov/monthly.zip', startedAt: '2026-09-02T00:00:00Z'
		});
		await applyNationwideChunk(fixture.db, {
			runId: 'abnationalrun_monthly', providers: [provider('1000000001', 'MO', 'Springfield')],
			removeNpis: [], processedRowCount: 10, rejectedCount: 0
		});
		await assert.rejects(queryNationwideCoverage(fixture.db, {}), /no successful nationwide/i);
		await assert.rejects(finalizeNationwideRun(fixture.db, {
			runId: 'abnationalrun_monthly', finishedAt: '2026-09-02T01:00:00Z',
			sourceSha256: 'a'.repeat(64), expectedProcessedRowCount: 11
		}), /processed 10 of 11/i);
		await finalizeNationwideRun(fixture.db, {
			runId: 'abnationalrun_monthly', finishedAt: '2026-09-02T01:00:00Z',
			sourceSha256: 'a'.repeat(64), expectedProcessedRowCount: 10
		});
		const result = await queryNationwideCoverage(fixture.db, { state: 'MO', city: 'Springfield' });
		assert.equal(result.total, 1);
		assert.equal(result.run.source_kind, 'monthly_full');
		assert.equal(result.report.source.coverage_limit_reached, false);
	} finally { fixture.database.close(); }
});

test('weekly increments copy the last successful snapshot then add and remove NPIs', async () => {
	const fixture = await createDatabase();
	try {
		await beginNationwideRun(fixture.db, {
			id: 'abnationalrun_base', sourceKind: 'monthly_full', sourceFile: 'base.zip',
			sourceUrl: 'https://download.cms.gov/base.zip', startedAt: '2026-09-01T00:00:00Z'
		});
		await applyNationwideChunk(fixture.db, {
			runId: 'abnationalrun_base', providers: [provider('1000000001', 'MO', 'Springfield')],
			removeNpis: [], processedRowCount: 1, rejectedCount: 0
		});
		await finalizeNationwideRun(fixture.db, {
			runId: 'abnationalrun_base', finishedAt: '2026-09-01T01:00:00Z', sourceSha256: 'b'.repeat(64), expectedProcessedRowCount: 1
		});
		await beginNationwideRun(fixture.db, {
			id: 'abnationalrun_weekly', sourceKind: 'weekly_incremental', sourceFile: 'weekly.zip',
			sourceUrl: 'https://download.cms.gov/weekly.zip', startedAt: '2026-09-08T00:00:00Z'
		});
		await applyNationwideChunk(fixture.db, {
			runId: 'abnationalrun_weekly', providers: [provider('1000000002', 'TX', 'Arlington')],
			removeNpis: ['1000000001'], processedRowCount: 2, rejectedCount: 0
		});
		await finalizeNationwideRun(fixture.db, {
			runId: 'abnationalrun_weekly', finishedAt: '2026-09-08T01:00:00Z', sourceSha256: 'c'.repeat(64), expectedProcessedRowCount: 2
		});
		assert.equal((await queryNationwideCoverage(fixture.db, { state: 'MO' })).total, 0);
		const arlington = await queryNationwideCoverage(fixture.db, { state: 'TX', city: 'Arlington' });
		assert.equal(arlington.total, 1);
		assert.equal(arlington.providers[0].npi, '1000000002');
		await beginNationwideRun(fixture.db, {
			id: 'abnationalrun_weekly2', sourceKind: 'weekly_incremental', sourceFile: 'weekly2.zip',
			sourceUrl: 'https://download.cms.gov/weekly2.zip', startedAt: '2026-09-15T00:00:00Z'
		});
		await applyNationwideChunk(fixture.db, {
			runId: 'abnationalrun_weekly2', providers: [provider('1000000003', 'CA', 'Oakland')],
			removeNpis: [], processedRowCount: 1, rejectedCount: 0
		});
		await finalizeNationwideRun(fixture.db, {
			runId: 'abnationalrun_weekly2', finishedAt: '2026-09-15T01:00:00Z', sourceSha256: 'e'.repeat(64), expectedProcessedRowCount: 1
		});
		const retained = fixture.database.prepare("SELECT count(*) AS count FROM abundance_healthcare_nationwide_runs WHERE status = 'succeeded'").get() as { count: number };
		assert.equal(retained.count, 2);
		const oldMemberships = fixture.database.prepare("SELECT count(*) AS count FROM abundance_healthcare_nationwide_memberships WHERE run_id = 'abnationalrun_base'").get() as { count: number };
		assert.equal(oldMemberships.count, 0);
	} finally { fixture.database.close(); }
});

test('coverage health and outreach are derived from the full cohort, not the first page', async () => {
	const fixture = await createDatabase();
	try {
		const providers = Array.from({ length: 35 }, (_, index) => ({
			...provider(String(2_000_000_000 + index), 'TX', 'Arlington'),
			status: index < 25 ? 'active' as const : 'deactivated' as const,
			last_updated_date: index < 25 ? '2026-09-01' : '2016-01-01'
		}));
		await beginNationwideRun(fixture.db, {
			id: 'abnationalrun_health', sourceKind: 'monthly_full', sourceFile: 'health.zip',
			sourceUrl: 'https://download.cms.gov/health.zip', startedAt: '2026-09-02T00:00:00Z'
		});
		await applyNationwideChunk(fixture.db, {
			runId: 'abnationalrun_health', providers, removeNpis: [], processedRowCount: 35, rejectedCount: 0
		});
		await finalizeNationwideRun(fixture.db, {
			runId: 'abnationalrun_health', finishedAt: '2026-09-02T01:00:00Z', sourceSha256: 'f'.repeat(64), expectedProcessedRowCount: 35
		});
		const result = await queryNationwideCoverage(fixture.db, { state: 'TX', city: 'Arlington', limit: 25, evaluatedAt: '2026-09-02T02:00:00Z' });
		assert.equal(result.providers.length, 25);
		assert.equal(result.report.provider_count, 35);
		assert.equal(result.report.active_count, 25);
		assert.equal(result.report.market_coverage_status, 'degraded');
		assert.match(result.report.market_coverage_reasons.join(' '), /fewer than 80%.*active/i);
		assert.equal(result.report.direct_outreach_status, 'blocked');
		assert.equal(result.report.recruiting_pipeline.recruiter_ready_count, 0);
	} finally { fixture.database.close(); }
});

test('nationwide migration records provenance and immutable membership snapshots', async () => {
	const migration = await readFile(new URL('../migrations/0046_abundance_healthcare_nationwide_coverage.sql', import.meta.url), 'utf8');
	assert.match(migration, /source_kind TEXT NOT NULL/);
	assert.match(migration, /monthly_full.*weekly_incremental/);
	assert.match(migration, /provider_snapshot_json TEXT NOT NULL/);
	assert.match(migration, /WHERE status = 'succeeded'/);
	assert.doesNotMatch(migration, /personal_email|outreach_consent/i);
});

function provider(npi: string, state: string, city: string): HealthcareProvider {
	return {
		id: `abprovider_${npi}`, npi, enumeration_type: 'NPI-1', name: `Provider ${npi}`,
		status: 'active', last_updated_date: '2026-09-01', primary_taxonomy_code: '363LF0000X',
		primary_taxonomy_description: 'Nurse Practitioner, Family', taxonomies_json: '[]',
		practice_city: city, practice_state: state, practice_country: 'US', endpoint_count: 0,
		source_system: 'nppes_npi_registry_v2_1', source_payload_hash: 'd'.repeat(64),
		source_fetched_at: '2026-09-02T00:00:00Z'
	};
}

async function createDatabase(): Promise<{ database: DatabaseSync; db: D1Database }> {
	const database = new DatabaseSync(':memory:');
	for (const name of ['0044_abundance_healthcare_provider_coverage.sql', '0045_abundance_healthcare_recruiting_evidence.sql', '0046_abundance_healthcare_nationwide_coverage.sql']) {
		database.exec(await readFile(new URL(`../migrations/${name}`, import.meta.url), 'utf8'));
	}
	class BoundStatement {
		constructor(readonly sql: string, readonly args: unknown[] = []) {}
		bind(...args: unknown[]) { return new BoundStatement(this.sql, args); }
		async first<T>() { return (database.prepare(this.sql).get(...this.args as SQLInputValue[]) ?? null) as T | null; }
		async all<T>() { return { results: database.prepare(this.sql).all(...this.args as SQLInputValue[]) as T[] }; }
		async run() { database.prepare(this.sql).run(...this.args as SQLInputValue[]); return { success: true }; }
	}
	const db = {
		prepare(sql: string) { return new BoundStatement(sql); },
		async batch(statements: BoundStatement[]) {
			for (const statement of statements) database.prepare(statement.sql).run(...statement.args as SQLInputValue[]);
			return statements.map(() => ({ success: true }));
		}
	} as unknown as D1Database;
	return { database, db };
}
