import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { exportTravelCsv } from '../src/lib/server/abundance-travel-export.ts';
import { calculateSourcingTravel } from '../src/lib/server/abundance-sourcing-travel.ts';
test('snapshot routing preserves unresolved practices and reuses a report without rebilling', async () => {
  const sqlite = new DatabaseSync(':memory:');
  try {
    sqlite.exec(`CREATE TABLE abundance_healthcare_nationwide_runs(id TEXT,status TEXT,finished_at TEXT,taxonomy_scope TEXT,source_published_at TEXT);
 CREATE TABLE abundance_healthcare_nationwide_memberships(run_id TEXT,provider_npi TEXT,provider_snapshot_json TEXT);
 INSERT INTO abundance_healthcare_nationwide_runs VALUES('abnationalrun_test','succeeded','2026-09-11','all_np_taxonomies','2026-09-07'),('abnationalrun_newer_family','succeeded','2026-09-12','primary_family_np','2026-09-07');
 INSERT INTO abundance_healthcare_nationwide_memberships VALUES('abnationalrun_test','1000000001','{"source_payload_hash":"one"}'),('abnationalrun_test','1000000002','{"source_payload_hash":"two"}');`);
    for (const file of [
      '0048_abundance_sourcing_geocodes',
      '0049_abundance_sourcing_geocode_versions',
      '0050_abundance_travel_quota',
      '0051_abundance_travel_reports',
      '0052_abundance_travel_claims'
    ])
      sqlite.exec(readFileSync(new URL(`../migrations/${file}.sql`, import.meta.url), 'utf8'));
    sqlite.exec(
      "INSERT INTO abundance_healthcare_geocodes(provider_npi,source_payload_hash,status,latitude,longitude,unit_x,unit_y,unit_z,fetched_at) VALUES('1000000001','one','matched',42.65,-73.75,1,0,0,'2026-09-11')"
    );
    const db = {
      prepare: (sql: string) => ({
        bind: (...args: SQLInputValue[]) => ({
          first: async () => sqlite.prepare(sql).get(...args) ?? null,
          all: async () => ({ results: sqlite.prepare(sql).all(...args) }),
          run: async () => sqlite.prepare(sql).run(...args)
        })
      })
    } as unknown as D1Database;
    let drivingCalls = 0;
    const fetchFn: typeof fetch = async (url) => {
      if (String(url).includes('geocoding.geo.census.gov'))
        return Response.json({
          result: {
            addressMatches: [
              { matchedAddress: '12 MAIN ST, ALBANY, NY', coordinates: { x: -73.8, y: 42.7 } }
            ]
          }
        });
      drivingCalls++;
      return Response.json({
        mode: 'driving',
        results: [
          {
            origin: { id: 'o0' },
            destinations: [{ id: 'c0', distance_miles: 10, duration_seconds: 2000 }]
          }
        ]
      });
    };
    const input = {
      npis: ['1000000001', '1000000002'],
      clinics: [{ id: 'clinic', address: '12 Main St, Albany, NY' }],
      max_minutes: 45,
      clinic_match: 'all'
    };
    const first = await calculateSourcingTravel(db, input, 'test', fetchFn);
    assert.equal(first.run_id,'abnationalrun_test','travel uses the same broad snapshot as sourcing');
    assert.equal(first.unresolved_geocode_count, 1);
    assert.equal(first.results[0].match, 'within_limit');
    assert.equal(first.results[1].match, 'unresolved');
    assert.equal(first.scope, 'selected_npis_only');
    const repeat = await calculateSourcingTravel(db, input, 'test', fetchFn);
    assert.equal(repeat.id, first.id);
    assert.equal(repeat.cache_hit, true);
    assert.equal(drivingCalls, 1);
    const parallel = await Promise.allSettled([
      calculateSourcingTravel(db, { ...input, max_minutes: 30 }, 'test', fetchFn),
      calculateSourcingTravel(db, { ...input, max_minutes: 30 }, 'test', fetchFn)
    ]);
    assert.equal(drivingCalls, 2, 'identical overlapping requests must make one paid call');
    assert.ok(parallel.some((r) => r.status === 'fulfilled'));
    await assert.rejects(
      calculateSourcingTravel(
        db,
        { ...input, clinics: [{ id: 'city', address: 'Albany, NY 12205' }] },
        'test',
        fetchFn
      ),
      /street/
    );

    const csvResponse = await exportTravelCsv(db, first.id);
    const csv = await csvResponse.text();
    assert.equal(csv.trim().split('\r\n').length, 3);
    assert.match(csv, /within_limit/);
    assert.match(csv, /unresolved/);
    assert.match(csv, /registered_practice_to_clinic_typical_traffic/);
    assert.equal(csvResponse.headers.get('X-NPG-Snapshot'), 'abnationalrun_test');
    assert.equal(
      sqlite
        .prepare('SELECT sum(credits) AS credits FROM abundance_travel_credit_reservations')
        .get()?.credits,
      4
    );
    await assert.rejects(
      calculateSourcingTravel(db, { ...input, npis: ['1000000003'] }, 'test', fetchFn),
      /absent/
    );
  } finally {
    sqlite.close();
  }
});
