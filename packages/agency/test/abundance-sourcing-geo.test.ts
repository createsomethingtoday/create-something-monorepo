import test from 'node:test';
import assert from 'node:assert/strict';
import {
  geocodeStreetAddress,
  unitVector,
  distanceMiles,
  parseSourcingQuery
} from '../src/lib/server/abundance-sourcing.ts';

test('radius inputs cannot silently degrade to city matches or commute estimates', () => {
  assert.throws(() => parseSourcingQuery(new URLSearchParams('radius_miles=30')), /center/);
  assert.throws(
    () => parseSourcingQuery(new URLSearchParams('center_address=Albany&radius_miles=30')),
    /street/
  );
  assert.throws(() => parseSourcingQuery(new URLSearchParams('commute_minutes=45')), /Unsupported/);
  assert.throws(
    () => parseSourcingQuery(new URLSearchParams('radius_miles=NaN&center_address=12+Main+St')),
    /radius/
  );
});
test('address geocoder accepts a single address-range match, never an ambiguous match', async () => {
  const result = await geocodeStreetAddress('12 Main St, Albany, NY', async () =>
    Response.json({
      result: {
        addressMatches: [
          { matchedAddress: '12 MAIN ST, ALBANY, NY', coordinates: { x: -73.75, y: 42.65 } }
        ]
      }
    })
  );
  assert.equal(result.latitude, 42.65);
  assert.equal(result.precision, 'address_range_interpolated');
  await assert.rejects(
    geocodeStreetAddress('12 Main St, Albany, NY', async () =>
      Response.json({ result: { addressMatches: [] } })
    ),
    /not uniquely/
  );
});
test('spherical distance agrees at zero and across longitude boundary', () => {
  const a = unitVector(42.65, -73.75);
  assert.ok(distanceMiles(a, a) < 0.001);
  assert.ok(distanceMiles(unitVector(0, 179.9), unitVector(0, -179.9)) < 14);
});

import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import {
  querySourcing,
  exportSourcingCsv,
  geocodeSourcingBatch
} from '../src/lib/server/abundance-sourcing.ts';
function fixture() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(`CREATE TABLE abundance_healthcare_nationwide_runs(id TEXT, status TEXT, source_published_at TEXT, finished_at TEXT);
 CREATE TABLE abundance_healthcare_nationwide_memberships(run_id TEXT,provider_npi TEXT,provider_snapshot_json TEXT,primary_taxonomy_code TEXT,practice_state TEXT,practice_city TEXT,name_search TEXT);`);
  sqlite.exec(
    readFileSync(
      new URL('../migrations/0048_abundance_sourcing_geocodes.sql', import.meta.url),
      'utf8'
    )
  );
  sqlite.exec(
    readFileSync(
      new URL('../migrations/0049_abundance_sourcing_geocode_versions.sql', import.meta.url),
      'utf8'
    )
  );
  sqlite.exec(
    "INSERT INTO abundance_healthcare_nationwide_runs VALUES('abnationalrun_test','succeeded','2026-09-01','2026-09-02')"
  );
  const add = (npi: string, lat?: number, hash = 'hash') => {
    sqlite
      .prepare('INSERT INTO abundance_healthcare_nationwide_memberships VALUES(?,?,?,?,?,?,?)')
      .run(
        'abnationalrun_test',
        npi,
        JSON.stringify({
          npi,
          name: 'Provider ' + npi,
          source_payload_hash: 'hash',
          practice_address_1: '12 Main St',
          practice_phone: '5185550100'
        }),
        '363LF0000X',
        'NY',
        'albany',
        'provider'
      );
    if (lat !== undefined) {
      const v = unitVector(lat, -73.75);
      sqlite
        .prepare(
          'INSERT INTO abundance_healthcare_geocodes(provider_npi,source_payload_hash,status,latitude,longitude,unit_x,unit_y,unit_z,fetched_at) VALUES(?,?,?,?,?,?,?,?,?)'
        )
        .run(npi, hash, 'matched', lat, -73.75, v.x, v.y, v.z, '2026-09-11');
    }
  };
  class Statement {
    constructor(
      readonly sql: string,
      readonly args: unknown[] = []
    ) {}
    bind(...args: unknown[]) {
      return new Statement(this.sql, args);
    }
    async first() {
      return sqlite.prepare(this.sql).get(...(this.args as SQLInputValue[])) ?? null;
    }
    async run() {
      return sqlite.prepare(this.sql).run(...(this.args as SQLInputValue[]));
    }
    async all() {
      return { results: sqlite.prepare(this.sql).all(...(this.args as SQLInputValue[])) };
    }
  }
  return {
    sqlite,
    add,
    db: { prepare: (sql: string) => new Statement(sql) } as unknown as D1Database
  };
}
const geocoder: typeof fetch = async () =>
  Response.json({
    result: {
      addressMatches: [
        { matchedAddress: '12 MAIN ST, ALBANY, NY', coordinates: { x: -73.75, y: 42.65 } }
      ]
    }
  });
test('radius selection excludes same-city outside points and invalidates stale geocodes', async () => {
  const f = fixture();
  try {
    f.add('1000000001', 42.65);
    f.add('1000000002', 44);
    f.add('1000000003');
    f.add('1000000004', 42.65, 'old-hash');
    const q = parseSourcingQuery(
      new URLSearchParams('center_address=12+Main+St,+Albany,+NY&radius_miles=10')
    );
    const result = await querySourcing(f.db, q, geocoder);
    assert.equal(result.total, 1);
    assert.equal(result.results[0].npi, '1000000001');
    assert.equal(result.unresolved_address_count, 2);
    const unresolved = await querySourcing(f.db, { ...q, locationMode: 'unresolved' }, geocoder);
    assert.equal(unresolved.total, 2);
    assert.equal(unresolved.results[0].distance_miles, undefined);
  } finally {
    f.sqlite.close();
  }
});
test('CSV export ignores UI pagination and exports beyond one database batch', async () => {
  const f = fixture();
  try {
    for (let i = 0; i < 1002; i++) f.add(String(1000000000 + i));
    const response = await exportSourcingCsv(
      f.db,
      parseSourcingQuery(new URLSearchParams('state=NY&limit=1&offset=100'))
    );
    const csv = await response.text();
    assert.equal(csv.trim().split('\r\n').length, 1003);
    assert.match(csv, /1000000000/);
    assert.match(csv, /1000001001/);
    assert.equal(response.headers.get('X-NPG-Snapshot'), 'abnationalrun_test');
  } finally {
    f.sqlite.close();
  }
});

test('unsupported specialties fail explicitly rather than looking like zero matches', () => {
  assert.throws(
    () => parseSourcingQuery(new URLSearchParams('taxonomy_code=363LA2200X')),
    /broader completed import/
  );
});

test('warming a changed snapshot preserves the earlier geocode version', async () => {
  const f = fixture();
  try {
    f.add('1000000001', 42.65, 'older-hash');
    await geocodeSourcingBatch(f.db, 'NY', geocoder);
    const versions = f.sqlite
      .prepare(
        'SELECT source_payload_hash FROM abundance_healthcare_geocodes ORDER BY source_payload_hash'
      )
      .all();
    assert.deepEqual(
      versions.map((row) => row.source_payload_hash),
      ['hash', 'older-hash']
    );
  } finally {
    f.sqlite.close();
  }
});
