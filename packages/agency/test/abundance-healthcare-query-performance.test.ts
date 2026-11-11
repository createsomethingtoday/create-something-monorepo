import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import {
  REQUIRED_RECRUITING_EVIDENCE_KINDS,
  type HealthcareProvider,
  type HealthcareRecruitingEvidenceKind,
  type HealthcareRecruitingEvidenceSource
} from '../src/lib/abundance/healthcare-providers.ts';
import { queryNationwideCoverage } from '../src/lib/server/abundance-healthcare-nationwide.ts';
import {
  parseSourcingQuery,
  querySourcing,
  exportSourcingCsv
} from '../src/lib/server/abundance-sourcing.ts';

const RUN_ID = 'abnationalrun_query_performance';
const FAMILY = '363LF0000X';
const ADULT = '363LA2200X';
type ObservedQuery = { sql: string; plan: string[] };

function fixture() {
  const sqlite = new DatabaseSync(':memory:');
  for (const name of [
    '0044_abundance_healthcare_provider_coverage.sql',
    '0045_abundance_healthcare_recruiting_evidence.sql',
    '0046_abundance_healthcare_nationwide_coverage.sql',
    '0048_abundance_sourcing_geocodes.sql',
    '0049_abundance_sourcing_geocode_versions.sql',
    '0053_abundance_np_taxonomy_scope.sql',
    '0063_npg_healthcare_query_indexes.sql'
  ]) {
    sqlite.exec(readFileSync(new URL('../migrations/' + name, import.meta.url), 'utf8'));
  }
  sqlite.prepare(`INSERT INTO abundance_healthcare_nationwide_runs
    (id,source_kind,source_file,source_url,status,started_at,finished_at,source_published_at,taxonomy_scope)
    VALUES(?, 'monthly_full', 'fixture.zip', 'https://download.cms.gov/fixture.zip',
      'succeeded', '2026-09-14T00:00:00Z', '2026-09-15T00:00:00Z',
      '2026-09-14T00:00:00Z', 'all_np_taxonomies')`).run(RUN_ID);
  const observed: ObservedQuery[] = [];
  class Statement {
    constructor(readonly sql: string, readonly args: unknown[] = []) {}
    bind(...args: unknown[]) { return new Statement(this.sql, args); }
    inspect() {
      const values = this.args as SQLInputValue[];
      observed.push({
        sql: this.sql,
        plan: sqlite.prepare('EXPLAIN QUERY PLAN ' + this.sql).all(...values)
          .map((row) => String(row.detail))
      });
      return values;
    }
    async first<T>() {
      return (sqlite.prepare(this.sql).get(...this.inspect()) ?? null) as T | null;
    }
    async all<T>() {
      return { results: sqlite.prepare(this.sql).all(...this.inspect()) as T[] };
    }
  }
  const add = (npi: string, overrides: Partial<HealthcareProvider> = {}) => {
    const provider: HealthcareProvider = {
      id: 'abprovider_' + npi, npi, enumeration_type: 'NPI-1', name: 'Fixture provider ' + npi,
      status: 'active', primary_taxonomy_code: FAMILY,
      primary_taxonomy_description: 'Nurse Practitioner, Family',
      taxonomies_json: '[]', practice_state: 'TX', practice_city: 'Arlington',
      practice_address_1: '12 Fixture Street', practice_country: 'US',
      source_system: 'nppes_npi_registry_v2_1', source_payload_hash: 'a'.repeat(64),
      source_fetched_at: '2026-09-14T00:00:00Z', last_updated_date: '2026-09-01',
      endpoint_count: 0, ...overrides
    };
    sqlite.prepare(`INSERT INTO abundance_healthcare_providers
      (id,npi,name,status,source_system,source_payload_hash,source_fetched_at)
      VALUES(?,?,?,?,?,?,?)`).run(provider.id, npi, provider.name, provider.status,
      provider.source_system, provider.source_payload_hash, provider.source_fetched_at);
    sqlite.prepare(`INSERT INTO abundance_healthcare_nationwide_memberships
      (run_id,provider_npi,provider_snapshot_json,practice_state,practice_city,last_updated_date,
       provider_status,primary_taxonomy_code,practice_has_location,practice_has_phone,
       license_has_fields,endpoint_count,name_search)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(RUN_ID, npi, JSON.stringify(provider),
      provider.practice_state ?? null, provider.practice_city?.toLowerCase() ?? null,
      provider.last_updated_date ?? null, provider.status, provider.primary_taxonomy_code ?? null,
      provider.practice_address_1 ? 1 : 0, provider.practice_phone ? 1 : 0,
      provider.license_state || provider.license_number ? 1 : 0, provider.endpoint_count,
      provider.name.toLowerCase());
    return provider;
  };
  return {
    sqlite, observed, add,
    db: { prepare: (sql: string) => new Statement(sql) } as unknown as D1Database
  };
}

function assertGeographicPagePlans(queries: ObservedQuery[]) {
  const pages = queries.filter(({ sql }) => /ORDER BY m\.provider_npi LIMIT/.test(sql));
  assert.ok(pages.length > 0, 'the public sourcing operation exercised an ordered page');
  for (const page of pages) {
    const membership = page.plan.find((detail) => /SEARCH m /.test(detail));
    assert.match(membership ?? '', /run_id=\? AND practice_state=\? AND practice_city=\?/,
      'city pages must constrain the membership scan to the selected run, state and city');
  }
}

test('city sourcing pages stay geographically bounded while preserving secondary taxonomy matches and provenance', async () => {
  const f = fixture();
  try {
    for (let i = 0; i < 40; i++) {
      f.add(String(1000000000 + i), { practice_state: 'NY', practice_city: 'Albany' });
    }
    f.add('2000000001');
    f.add('2000000002', {
      primary_taxonomy_code: '163W00000X',
      taxonomies_json: JSON.stringify([{ code: FAMILY }, { code: ADULT }])
    });
    f.add('2000000003', { primary_taxonomy_code: '163W00000X' });
    const query = parseSourcingQuery(new URLSearchParams(
      'state=TX&city=Arlington&taxonomy_code=' + FAMILY + ',' + ADULT + '&limit=1'
    ));
    const first = await querySourcing(f.db, query);
    const second = await querySourcing(f.db, { ...query, runId: first.run_id, offset: 1 });
    assert.equal(first.total, 2);
    assert.equal(second.total, 2);
    assert.deepEqual([first.results[0].npi, second.results[0].npi], ['2000000001', '2000000002']);
    assert.equal(first.next_offset, 1);
    assert.equal(second.next_offset, undefined);
    assert.equal(first.unresolved_address_count, 2);
    assert.equal(first.run_id, RUN_ID);
    assert.equal(first.source_published_at, '2026-09-14T00:00:00Z');
    assert.equal(first.completeness, 'all_matching_records_in_selected_snapshot');
    assert.equal(first.results[0].contact_route_status, 'public_registry_unverified');
    assert.equal(first.results[0].clinical_verification_status, 'recruiter_verification_required');
    assertGeographicPagePlans(f.observed);
  } finally {
    f.sqlite.close();
  }
});

test('geographic CSV keyset reads export every primary or secondary match across batches despite UI pagination', async () => {
  const f = fixture();
  try {
    const expected = Array.from({ length: 1002 }, (_, i) => String(2000000000 + i));
    for (const [i, npi] of expected.entries()) {
      f.add(npi, i % 2 === 0 ? {} : {
        primary_taxonomy_code: '163W00000X',
        taxonomies_json: JSON.stringify([{ code: ADULT }, { code: FAMILY }])
      });
    }
    f.add('1000000001', { practice_state: 'NY', practice_city: 'Albany' });
    f.add('1000000002', { practice_city: 'Dallas' });
    f.add('1000000003', { primary_taxonomy_code: '163W00000X' });
    const query = parseSourcingQuery(new URLSearchParams(
      'state=TX&city=Arlington&taxonomy_code=' + FAMILY + ',' + ADULT + '&limit=1&offset=100'
    ));
    const response = await exportSourcingCsv(f.db, query);
    const lines = (await response.text()).trim().split('\r\n');
    assert.equal(lines.length, expected.length + 1);
    assert.deepEqual(lines.slice(1).map((line) => /^"(\d+)"/.exec(line)?.[1]), expected);
    assert.equal(response.headers.get('X-NPG-Snapshot'), RUN_ID);
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
    assert.match(lines[0], /Registry Updated/);
    assert.match(lines[1], /public_registry_unverified/);
    assert.match(lines[1], /Human review required/);
    assert.ok(f.observed.filter(({ sql }) => /ORDER BY m\.provider_npi LIMIT/.test(sql)).length >= 2);
    assertGeographicPagePlans(f.observed);
  } finally {
    f.sqlite.close();
  }
});

test('national coverage counts use an index-only cohort scan and ordered pages retain complete counts and source dates', async () => {
  const f = fixture();
  try {
    f.add('2000000001', { practice_phone: '5550100', license_state: 'TX', endpoint_count: 1 });
    f.add('2000000002', { status: 'deactivated', practice_address_1: undefined });
    f.add('2000000003', { status: 'unknown', last_updated_date: '2022-01-01' });
    f.add('2000000004', { last_updated_date: undefined });
    f.add('2000000005', { last_updated_date: '' });
    f.add('2000000006', { practice_state: 'NY', practice_city: 'Albany', last_updated_date: '2026-08-01' });
    f.add('2000000007', { primary_taxonomy_code: ADULT });
    const input = { limit: 2, evaluatedAt: '2026-11-11T00:00:00Z' };
    const first = await queryNationwideCoverage(f.db, input);
    const second = await queryNationwideCoverage(f.db, { ...input, offset: 2 });
    const third = await queryNationwideCoverage(f.db, { ...input, offset: 4 });
    assert.deepEqual([first, second, third].flatMap((page) => page.providers.map((p) => p.npi)),
      ['2000000001', '2000000002', '2000000006', '2000000003', '2000000004', '2000000005']);
    for (const page of [first, second, third]) {
      assert.equal(page.total, 6);
      assert.equal(page.report.provider_count, 6);
      assert.equal(page.report.active_count, 4);
      assert.equal(page.report.deactivated_count, 1);
      assert.equal(page.report.unknown_status_count, 1);
      assert.equal(page.report.source.latest_fetched_at, '2026-09-14T00:00:00Z');
      assert.equal(page.report.source.coverage_limit_reached, false);
      assert.equal(page.report.market_coverage_status, 'degraded');
      assert.equal(page.report.recruiting_pipeline.recruiter_ready_count, 0);
      assert.deepEqual(page.report.administrative_recency, {
        updated_within_1_year_count: 3, updated_within_3_years_count: 3,
        older_than_3_years_count: 2, unknown_count: 1
      });
      assert.deepEqual(page.report.completeness, {
        primary_taxonomy_count: 6, practice_location_count: 5,
        practice_phone_count: 1, license_field_count: 1, endpoint_count: 1
      });
    }
    const aggregates = f.observed.filter(({ sql }) => /AS active_count/.test(sql));
    assert.equal(aggregates.length, 3);
    for (const query of aggregates) {
      assert.ok(query.plan.some((detail) => /USING COVERING INDEX/.test(detail) &&
        /run_id=\? AND primary_taxonomy_code=\?/.test(detail)),
      'national statistics must read the narrow cohort index rather than wide snapshot rows');
    }
    const pages = f.observed.filter(({ sql }) => /ORDER BY coalesce\(m\.last_updated_date/.test(sql));
    assert.equal(pages.length, 3);
    for (const query of pages) {
      assert.ok(query.plan.some((detail) => /SEARCH m /.test(detail) &&
        /run_id=\? AND primary_taxonomy_code=\?/.test(detail)));
      assert.ok(!query.plan.some((detail) => /TEMP B-TREE/.test(detail)),
        'ordered national pages must not sort the entire snapshot');
    }
  } finally {
    f.sqlite.close();
  }
});

test('readiness starts with evidence and probes exact snapshot membership while retaining all seven latest-valid gates', async () => {
  const f = fixture();
  try {
    f.add('1000000000');
    for (let i = 1; i <= 8; i++) f.add(String(2000000000 + i),
      i === 6 ? { practice_state: 'NY', practice_city: 'Albany' } :
      i === 7 ? { primary_taxonomy_code: ADULT } : {});
    f.sqlite.prepare(`INSERT INTO abundance_healthcare_nationwide_runs
      (id,source_kind,source_file,source_url,status,started_at,finished_at,source_published_at,taxonomy_scope)
      VALUES('abnationalrun_older', 'monthly_full', 'older.zip', 'https://download.cms.gov/older.zip',
        'succeeded', '2026-08-01', '2026-08-02', '2026-08-01', 'all_np_taxonomies')`).run();
    f.sqlite.prepare('UPDATE abundance_healthcare_nationwide_memberships SET run_id=? WHERE provider_npi=?')
      .run('abnationalrun_older', '2000000008');
    const input = { state: 'TX', city: 'Arlington', evaluatedAt: '2026-11-11T00:00:00Z' };
    const emptyEvidence = await queryNationwideCoverage(f.db, { ...input, limit: 1 });
    assert.equal(emptyEvidence.report.recruiting_pipeline.recruiter_ready_count, 0);
    const sources: Record<HealthcareRecruitingEvidenceKind, HealthcareRecruitingEvidenceSource> = {
      license_or_privilege: 'missouri_board_or_nursys', discipline: 'missouri_board_or_nursys',
      exclusion: 'oig_leie', practice_or_employment: 'cms_doctors_and_clinicians',
      contact_route: 'npg_first_party', outreach_authority: 'npg_first_party',
      recruiter_approval: 'npg_first_party'
    };
    const evidence = (npi: string, kind: HealthcareRecruitingEvidenceKind,
      outcome = 'passed', verified = '2026-11-01T00:00:00Z', validThrough = '2026-12-01T00:00:00Z') => {
      f.sqlite.prepare(`INSERT INTO abundance_healthcare_provider_recruiting_evidence
        (id,provider_npi,evidence_kind,source_system,outcome,verified_at,valid_through)
        VALUES(?,?,?,?,?,?,?)`).run(npi + kind + verified, npi, kind, sources[kind],
        outcome, verified, validThrough);
    };
    for (let i = 1; i <= 8; i++) {
      for (const kind of REQUIRED_RECRUITING_EVIDENCE_KINDS) {
        if (i !== 4 || kind !== 'recruiter_approval') evidence(String(2000000000 + i), kind);
      }
    }
    evidence('2000000002', 'discipline', 'failed', '2026-11-10T00:00:00Z');
    evidence('2000000003', 'license_or_privilege', 'passed', '2026-11-09T00:00:00Z', '2026-11-10T00:00:00Z');
    evidence('2000000005', 'contact_route', 'passed', '2026-11-12T00:00:00Z');
    const first = await queryNationwideCoverage(f.db, { ...input, limit: 1 });
    const cohort = await queryNationwideCoverage(f.db, input);
    const national = await queryNationwideCoverage(f.db, { evaluatedAt: input.evaluatedAt });
    assert.equal(first.providers[0].npi, '1000000000');
    assert.equal(first.readiness[0].stage, 'coverage_candidate');
    assert.equal(first.report.recruiting_pipeline.recruiter_ready_count, 1,
      'readiness counts include the eligible provider beyond the displayed page');
    assert.equal(cohort.total, 6);
    assert.equal(cohort.report.recruiting_pipeline.recruiter_ready_count, 1);
    assert.equal(cohort.report.recruiting_pipeline.coverage_candidate_count, 5);
    assert.equal(national.report.recruiting_pipeline.recruiter_ready_count, 2,
      'ready providers outside the requested city count only in the national cohort');
    assert.equal(cohort.run.id, RUN_ID);
    const readyByNpi = new Map(cohort.readiness.map((r) => [r.npi, r]));
    assert.equal(readyByNpi.get('2000000001')?.stage, 'recruiter_ready');
    for (const [npi, kind, status] of [
      ['2000000002', 'discipline', 'failed'],
      ['2000000003', 'license_or_privilege', 'expired'],
      ['2000000004', 'recruiter_approval', 'missing'],
      ['2000000005', 'contact_route', 'not_yet_valid']
    ]) {
      assert.equal(readyByNpi.get(npi)?.stage, 'coverage_candidate');
      assert.equal(readyByNpi.get(npi)?.gates.find((g) => g.kind === kind)?.status, status);
    }
    const readinessQueries = f.observed.filter(({ sql }) => /WITH latest_evidence AS/.test(sql));
    assert.equal(readinessQueries.length, 4);
    for (const query of readinessQueries) {
      assert.ok(query.plan.some((detail) => /SEARCH m/.test(detail) &&
        /run_id=\? AND provider_npi=\?/.test(detail)),
      'readiness must inspect evidence and probe exact membership instead of enumerating the snapshot');
    }
  } finally {
    f.sqlite.close();
  }
});
