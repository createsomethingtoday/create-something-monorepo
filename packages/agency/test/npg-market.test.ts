import test from 'node:test';
import assert from 'node:assert/strict';
import { marketLocale, summarizeMarket } from '../src/lib/server/npg/market.ts';
test('canonical locale never persists candidate names or street addresses', () => {
  assert.equal(
    marketLocale({ city: ' Springfield ', state: 'mo', name: 'Private Person' }),
    'Springfield, MO'
  );
  assert.equal(
    marketLocale({ center_address: '123 Private Street', radius_miles: 30 }),
    'Radius search (30 mi)'
  );
  assert.equal(marketLocale({ name: 'Private Person' }), 'Unspecified locale');
  assert.equal(marketLocale({ city: 'SPRINGFIELD', state: 'mo' }), 'Springfield, MO');
});
test('duplicate event IDs are counted once, missing counts remain unknown, not zero', () => {
  const source = {
    tool: 'search_registry_sourcing',
    market: { id: 'one', at: 123, locale: 'Springfield, MO' },
    data: { total: 10, source_fetched_at: '2026-11-01', results: [{ name: 'PRIVATE' }] }
  };
  const result = summarizeMarket(
    [
      {
        id: 'c',
        updated_at: 999,
        state_json: JSON.stringify({
          sources: [source, source, { tool: 'search_registry_sourcing', data: {} }]
        })
      }
    ],
    [],
    1000
  );
  assert.equal(result.totals.searches, 2);
  assert.equal(result.totals.matchingResults, 10);
  assert.equal(result.totals.unknownResultCounts, 1);
  assert.equal(JSON.stringify(result).includes('PRIVATE'), false);
});
test('legacy canonical links recover locale but external links do not; exports label response preparation', () => {
  const sources = [
    {
      tool: 'search_registry_sourcing',
      data: {
        total: 0,
        csv_download_url:
          'https://createsomething.agency/delivery/abundance/sourcing.csv?city=Austin&state=TX'
      }
    },
    {
      tool: 'search_registry_sourcing',
      data: {
        csv_download_url: 'https://evil.test/delivery/abundance/sourcing.csv?city=Fake&state=TX'
      }
    }
  ];
  const result = summarizeMarket(
    [{ id: 'c', updated_at: 999, state_json: JSON.stringify({ sources }) }],
    [{ locale: 'Austin, TX', status: 'prepared', requested_at: 100 }],
    1000
  );
  assert.equal(result.locales.find((x) => x.locale === 'Austin, TX')?.exportsPrepared, 1);
  assert.equal(
    result.locales.some((x) => x.locale === 'Fake, TX'),
    false
  );
  assert.equal(result.locales.find((x) => x.locale === 'Austin, TX')?.latestSearchAt, null);
  assert.equal(result.totals.exportsRequested, 1);
});
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { readMarketActivity } from '../src/lib/server/npg/market.ts';
const require = createRequire(import.meta.url);
const { Miniflare } = createRequire(require.resolve('wrangler/package.json'))('miniflare');
test('D1 analytics excludes other owners and candidate payloads; migration is repeatable', async () => {
  const mf = new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("ok")}}',
    compatibilityDate: '2025-11-15',
    d1Databases: ['DB']
  });
  try {
    const db = await mf.getD1Database('DB');
    for (const sql of readFileSync(
      new URL('../migrations/0062_npg_private_analyst.sql', import.meta.url),
      'utf8'
    ).match(/CREATE TRIGGER[\s\S]*?END;|CREATE (?:TABLE|INDEX)[\s\S]*?;/g) ?? [])
      await db.prepare(sql).run();
    const migration = readFileSync(
      new URL('../migrations/0067_npg_registry_export_events.sql', import.meta.url),
      'utf8'
    );
    for (let i = 0; i < 2; i++)
      for (const sql of migration.match(/CREATE (?:TABLE|INDEX)[\s\S]*?;/g) ?? [])
        await db.prepare(sql).run();
    const state = JSON.stringify({
      sources: [
        {
          tool: 'search_registry_sourcing',
          market: { id: 'unique', at: 123, locale: 'Austin, TX' },
          data: {
            total: 15,
            source_published_at: '2026-11-01',
            completeness: 'all_matching_records_in_selected_snapshot',
            results: [{ name: 'PRIVATE PERSON' }]
          }
        }
      ]
    });
    for (const [id, owner] of [
      ['a', 'alice'],
      ['b', 'bob']
    ])
      await db
        .prepare(
          'INSERT INTO npg_analyst_conversations(id,owner_id,created_at,updated_at,state_json) VALUES(?,?,0,0,?)'
        )
        .bind(id, owner, state)
        .run();
    await db
      .prepare(
        "INSERT INTO npg_registry_export_events VALUES('exp','bob','Dallas, TX',123,'prepared')"
      )
      .run();
    await db
      .prepare(
        "INSERT INTO npg_registry_export_events VALUES('alice-1','alice','Austin, TX',123,'prepared'),('alice-2','alice','Austin, TX',124,'requested')"
      )
      .run();
    await db
      .prepare(
        'INSERT INTO npg_analyst_conversations(id,owner_id,created_at,updated_at,state_json) VALUES(?,?,0,0,?)'
      )
      .bind(
        'coverage',
        'alice',
        JSON.stringify({
          sources: [
            {
              tool: 'search_coverage_candidates',
              data: {
                market_id: 'npg-family-np-nationwide',
                location: { scope: 'derived_locale', state: 'MO', city: 'Springfield' },
                source_latest_fetched_at: '2026-11-18',
                total: 231,
                limit: 25,
                offset: 0,
                next_offset: 25,
                results: [{ name: 'PRIVATE PERSON' }]
              }
            }
          ]
        })
      )
      .run();
    const result = await readMarketActivity(db, 'alice', 1000);
    assert.equal(result.totals.searches, 2);
    assert.equal(result.totals.matchingResults, 246);
    assert.equal(result.totals.exportsRequested, 2);
    assert.equal(result.totals.exportsPrepared, 1);
    assert.equal(
      result.locales.find((row) => row.locale === 'Austin, TX')?.sourceFetchedAt,
      '2026-11-01'
    );
    assert.equal(
      result.locales.find((row) => row.locale === 'Springfield, MO')?.sourceFetchedAt,
      '2026-11-18'
    );
    assert.equal(result.locales[0].incompleteSearches, 0);
    assert.equal(JSON.stringify(result).includes('PRIVATE PERSON'), false);
  } finally {
    await mf.dispose();
  }
});
test('long sourcing history stops after 20 metadata pages and reports partial totals', async () => {
  let queries = 0;
  const db = {
    prepare(sql: string) {
      return {
        bind() {
          return this;
        },
        async all() {
          queries++;
          return {
            results: sql.includes('json_each')
              ? Array.from({ length: 250 }, (_, i) => ({
                  id: 'c',
                  source_index: (queries - 1) * 250 + i,
                  state_json: JSON.stringify({
                    sources: [{ tool: 'search_registry_sourcing', data: { total: 1 } }]
                  })
                }))
              : []
          };
        }
      };
    }
  };
  const result = await readMarketActivity(db as any, 'alice', 1000);
  assert.equal(queries, 21);
  assert.equal(result.totals.searches, 5000);
  assert.match(result.limitations[0], /Partial history/);
});
test('exact coverage candidate envelopes retain upstream total, not readiness-filtered page length', () => {
  const source = {
    tool: 'search_coverage_candidates',
    data: {
      market_id: 'npg-family-np-nationwide',
      location: {
        scope: 'derived_locale',
        label: 'SPRINGFIELD, MO',
        state: 'MO',
        city: 'SPRINGFIELD'
      },
      source_latest_fetched_at: '2026-11-18T10:00:00Z',
      direct_outreach_status: 'human_review_required',
      total: 231,
      limit: 25,
      offset: 25,
      next_offset: 50,
      results: [{ npi: '1234567890', name: 'PRIVATE' }],
      readiness_filter_note:
        'Readiness is evaluated on the returned bounded page; recruiter_ready is fail-closed.'
    }
  };
  const result = summarizeMarket(
    [
      {
        id: 'c',
        updated_at: 999,
        state_json: JSON.stringify({
          sources: [
            source,
            { tool: 'get_healthcare_coverage', data: { total: 9999 } },
            {
              tool: 'search_coverage_candidates',
              data: { market_id: 'npg-family-np-arlington-tx', total: 7 }
            },
            {
              tool: 'search_coverage_candidates',
              data: { market_id: 'npg-family-np-nationwide', total: 10 }
            },
            { tool: 'search_coverage_candidates', data: { results: [] } }
          ]
        })
      }
    ],
    [],
    1000
  );
  assert.equal(result.totals.searches, 4);
  assert.equal(result.totals.matchingResults, 248);
  assert.equal(result.totals.unknownResultCounts, 1);
  assert.equal(
    result.locales.find((row) => row.locale === 'Springfield, MO')?.matchingResults,
    231
  );
  assert.equal(
    result.locales.find((row) => row.locale === 'Springfield, MO')?.sourceFetchedAt,
    '2026-11-18T10:00:00Z'
  );
  assert.equal(result.locales.find((row) => row.locale === 'Nationwide')?.searches, 1);
  assert.equal(result.locales.find((row) => row.locale === 'Arlington, TX')?.searches, 1);
  assert.equal(result.locales.find((row) => row.locale === 'Unspecified locale')?.searches, 1);
  assert.equal(JSON.stringify(result).includes('PRIVATE'), false);
  assert.ok(result.limitations.some((line) => line.includes('readiness-qualified')));
  assert.equal(marketLocale({}, true), 'Nationwide');
});
