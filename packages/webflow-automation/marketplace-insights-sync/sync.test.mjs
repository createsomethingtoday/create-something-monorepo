import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  mkdirSync,
  copyFileSync,
  writeFileSync,
  readFileSync,
  rmSync,
  existsSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const here = dirname(fileURLToPath(import.meta.url));
const tables = {
  assets: 'tblRwzpWoLgE9MrUm',
  categories: 'tblSygBX7adZ4VNjK',
  creators: 'tbljt0plqxdMARZXb',
  snapshot: 'tblSnapshotTest01',
  sellers: 'tblkyKZ5nGOcEqb5r'
};
const fixture = () => ({
  sellers: [
    {
      TEMPLATE_ID: 'a'.repeat(24),
      MRP_ID: 'b'.repeat(24),
      NAME: 'Template',
      SALES_30D: 3,
      REVENUE_30D: 150
    }
  ],
  records: {
    [tables.assets]: [
      {
        id: 'recAsset',
        fields: {
          fldmfcD7pebc82EuN: ['recA2YsPEHSuAHOLD'],
          fldFeWROxzwzCo84b: 'a'.repeat(24),
          fldBv3YTf6Bd5HDXN: ['Agency'],
          fldHhxmfSNMp117SP: ['fixture@example.test']
        }
      }
    ],
    [tables.categories]: [
      {
        id: 'recTaxonomy',
        fields: { fldWQDQuXlqwWxORG: 'Agency', fldDSMRYPV8KBIeX7: ['Business'] }
      }
    ]
  }
});
function run(data, args = ['--execute'], configured = true) {
  const root = mkdtempSync(join(tmpdir(), 'insights-contract-'));
  try {
    const dir = join(root, 'packages/webflow-automation/marketplace-insights-sync');
    mkdirSync(dir, { recursive: true });
    const core = join(root, 'packages/webflow-dashboard-core/src');
    mkdirSync(core, { recursive: true });
    copyFileSync(join(here, 'sync.mjs'), join(dir, 'sync.mjs'));
    copyFileSync(
      join(here, '../../webflow-dashboard-core/src/marketplace-snapshot.mjs'),
      join(core, 'marketplace-snapshot.mjs')
    );
    mkdirSync(join(root, 'bin'));
    writeFileSync(
      join(root, 'bin/uvx'),
      data.noSnowflake
        ? '#!/usr/bin/env node\nprocess.stderr.write("snowflake must not be called");process.exit(9);\n'
        : '#!/usr/bin/env node\nprocess.stdout.write(' +
            JSON.stringify(JSON.stringify(data.sellers)) +
            ');\n',
      { mode: 0o755 }
    );
    writeFileSync(join(root, 'fixture.json'), JSON.stringify(data));
    writeFileSync(
      join(root, 'mock.mjs'),
      `import fs from 'node:fs';
const data=JSON.parse(fs.readFileSync(process.env.FIXTURE_FILE,'utf8'));let saved;
globalThis.fetch=async(input,options={})=>{
 const url=new URL(input);const parts=url.pathname.split('/');const table=parts[3];const method=options.method??'GET';const body=options.body?JSON.parse(options.body):null;
 if(url.hostname!=='api.airtable.com')throw Error('Unexpected provider');
 fs.appendFileSync(process.env.MOCK_CALLS,JSON.stringify({table,method,body})+'\\n');
 if(method==='GET'&&table in data.records)return Response.json({records:data.records[table]});
 if(table!=='tblSnapshotTest01')throw Error('Legacy/output table must not be touched');
 if(method==='PATCH'){saved=body.records[0].fields;return Response.json({records:[{id:'recSnapshotTest01',fields:saved}]});}
 if(method==='GET')return Response.json({id:'recSnapshotTest01',fields:data.badReadback?{}:saved});
 throw Error('Unexpected operation');
};`
    );
    const result = spawnSync(
      process.execPath,
      [
        '--import',
        join(root, 'mock.mjs'),
        join(dir, 'sync.mjs'),
        '--as-of',
        '2026-09-21T16:00:00Z',
        ...args
      ],
      {
        encoding: 'utf8',
        timeout: 10000,
        env: {
          PATH: join(root, 'bin') + ':' + process.env.PATH,
          AIRTABLE_API_KEY: 'fixture-only',
          ...(configured ? { MARKETPLACE_INSIGHTS_SNAPSHOT_TABLE_ID: tables.snapshot } : {}),
          FIXTURE_FILE: join(root, 'fixture.json'),
          MOCK_CALLS: join(root, 'calls.jsonl')
        }
      }
    );
    const calls = existsSync(join(root, 'calls.jsonl'))
      ? readFileSync(join(root, 'calls.jsonl'), 'utf8')
          .trim()
          .split('\n')
          .filter(Boolean)
          .map(JSON.parse)
      : [];
    const path = join(dir, 'runs/snapshot-2026-09-21.json');
    return {
      ...result,
      calls,
      writes: calls.filter((x) => x.method !== 'GET'),
      snapshot: existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null
    };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
test('publishes one complete snapshot and reads it back without legacy writes', () => {
  const result = run(fixture());
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(
    result.writes.map((x) => [x.method, x.table]),
    [['PATCH', tables.snapshot]]
  );
  assert.equal(result.snapshot.summary.totalSales, 3);
});
test('dry-run writes only a local review artifact', () => {
  const result = run(fixture(), [], false);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.writes.length, 0);
  assert.equal(result.snapshot.summary.totalSales, 3);
});
test('execution requires approved snapshot destination before accessing providers', () => {
  const result = run(fixture(), ['--execute'], false);
  assert.equal(result.status, 1);
  assert.equal(result.calls.length, 0);
});
for (const name of ['sellers', 'assets', 'categories'])
  test(`empty ${name} cannot mutate any output`, () => {
    const data = fixture();
    if (name === 'sellers') data.sellers = [];
    else data.records[tables[name]] = [];
    const result = run(data);
    assert.equal(result.status, 1, result.stderr);
    assert.equal(result.writes.length, 0);
  });
test('duplicate names preserve stable IDs and creator attribution', () => {
  const data = fixture();
  data.sellers.push({
    TEMPLATE_ID: 'c'.repeat(24),
    MRP_ID: 'd'.repeat(24),
    NAME: 'Template',
    SALES_30D: 2,
    REVENUE_30D: 100
  });
  data.records[tables.assets].push({
    id: 'recOther',
    fields: {
      fldmfcD7pebc82EuN: ['recA2YsPEHSuAHOLD'],
      fldFeWROxzwzCo84b: 'c'.repeat(24),
      fldBv3YTf6Bd5HDXN: ['Agency'],
      fldHhxmfSNMp117SP: ['other@example.test']
    }
  });
  const result = run(data);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(
    result.snapshot.leaderboard.map((x) => [x.templateId, x.creatorEmail]),
    [
      ['a'.repeat(24), 'fixture@example.test'],
      ['c'.repeat(24), 'other@example.test']
    ]
  );
});
test('multiple tags keep the unique marketplace aggregate', () => {
  const data = fixture();
  data.records[tables.assets][0].fields.fldBv3YTf6Bd5HDXN.push('Portfolio');
  data.records[tables.categories].push({
    fields: { fldWQDQuXlqwWxORG: 'Portfolio', fldDSMRYPV8KBIeX7: ['Business'] }
  });
  const result = run(data);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.snapshot.summary.totalSales, 3);
  assert.equal(result.snapshot.categories.length, 2);
});
test('unmapped sellers fail before publication', () => {
  const data = fixture();
  data.sellers[0].TEMPLATE_ID = 'f'.repeat(24);
  const result = run(data);
  assert.equal(result.status, 1);
  assert.equal(result.writes.length, 0);
});
test('failed publication readback never reports completion', () => {
  const data = fixture();
  data.badReadback = true;
  const result = run(data);
  assert.equal(result.status, 1);
  assert.equal(result.writes.length, 1);
  assert.doesNotMatch(result.stdout, /"mode":"execute"/);
});

test('library records cannot supply template attribution even with overlapping IDs', () => {
 const data = fixture();
 data.records[tables.assets].push({id:'recLibrary',fields:{fldmfcD7pebc82EuN:['recU07tAbkf8OjzXO'],fldFeWROxzwzCo84b:'a'.repeat(24),fldHhxmfSNMp117SP:['wrong@example.test']}});
 const result = run(data);
 assert.equal(result.status,0,result.stderr);
 assert.equal(result.snapshot.leaderboard[0].creatorEmail,'fixture@example.test');
});

test('a subcategory with two parent groups uses the first and is noted in the receipt', () => {
 const data = fixture();
 data.records[tables.categories][0].fields.fldDSMRYPV8KBIeX7 = ['Business', 'Creative'];
 const result = run(data);
 assert.equal(result.status, 0, result.stderr);
 assert.equal(result.snapshot.leaderboard[0].category, 'Business');
 assert.match(result.stdout, /"kind":"dual-parent"/);
});
test('a published subcategory with no parent group falls back to its siblings group, else Other', () => {
 const data = fixture();
 data.records[tables.assets][0].fields.fldBv3YTf6Bd5HDXN = ['Agency', 'Orphan'];
 data.records[tables.categories].push({ id: 'recOrphan', fields: { fldWQDQuXlqwWxORG: 'Orphan', fldDSMRYPV8KBIeX7: [] } });
 const result = run(data);
 assert.equal(result.status, 0, result.stderr);
 assert.ok(result.snapshot.categories.some((c) => c.subcategory === 'Orphan' && c.category === 'Business'));
 assert.match(result.stdout, /"kind":"unmapped"/);
});
test('a missing creator email rollup falls back to the creator record and is noted', () => {
 const data = fixture();
 data.records[tables.assets][0].fields.fldHhxmfSNMp117SP = [];
 data.records[tables.assets][0].fields.fldGDWo2VfnTbSUiL = ['recCreator'];
 data.records[tables.creators] = [{ id: 'recCreator', fields: { fld5AtQoz6Af7jdos: 'owner@example.test' } }];
 const result = run(data);
 assert.equal(result.status, 0, result.stderr);
 assert.equal(result.snapshot.leaderboard[0].creatorEmail, 'owner@example.test');
 assert.match(result.stdout, /creatorEmailNotes":\[\{/);
});
test('repeated identical taxonomy parents remain unambiguous', () => {
 const data = fixture();
 data.records[tables.categories][0].fields.fldDSMRYPV8KBIeX7 = ['Business', 'Business'];
 const result = run(data);
 assert.equal(result.status,0,result.stderr);
});

// Fivetran → Airtable seller source. The window under test ends 2026-09-21T16:00Z.
const sellerRow = (overrides = {}) => ({
  id: 'recSeller' + Math.random().toString(36).slice(2, 8),
  fields: {
    fldgZHXYZqlX2HSag: 'a'.repeat(24),
    fldA9ZA24286DtNyZ: 'b'.repeat(24),
    fldgO5x1KhpKkL0QP: 'Template',
    fldXU6c3ERnqBbvSp: 3,
    fldxVd61LWea9SlEF: 150,
    fldLJlqsFaukWP4Jq: '2026-09-21T16:00:00.000Z',
    fldkJiQBUdfWUMP7Q: 1,
    fld31oTda0kji5IDi: 3,
    fldzB6kawJH32fDmA: 150,
    ...overrides
  }
});
const airtableFixture = (rows) => {
  const data = fixture();
  data.noSnowflake = true;
  data.records[tables.sellers] = rows;
  return data;
};
test('airtable source publishes the requested window without calling Snowflake', () => {
  const stale = sellerRow({ fldgZHXYZqlX2HSag: 'c'.repeat(24), fldLJlqsFaukWP4Jq: '2026-09-14T16:00:00.000Z', fldkJiQBUdfWUMP7Q: 9, fld31oTda0kji5IDi: 99 });
  const result = run(airtableFixture([sellerRow(), stale]), ['--execute', '--source', 'airtable']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.snapshot.summary.totalSales, 3);
  assert.equal(result.snapshot.summary.sellingTemplates, 1);
  assert.match(result.stdout, /"source":"airtable"/);
});
test('airtable source fails when the activation has not written the window', () => {
  const result = run(
    airtableFixture([sellerRow({ fldLJlqsFaukWP4Jq: '2026-09-14T16:00:00.000Z' })]),
    ['--execute', '--source', 'airtable']
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /no rows for window 2026-09-21T16:00:00.000Z/);
  assert.equal(result.writes.length, 0);
});
test('airtable source fails when the window is only partly written', () => {
  const result = run(
    airtableFixture([sellerRow({ fldkJiQBUdfWUMP7Q: 2, fld31oTda0kji5IDi: 5 })]),
    ['--execute', '--source', 'airtable']
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /incomplete/);
  assert.equal(result.writes.length, 0);
});
test('unknown source is rejected before any provider access', () => {
  const result = run(fixture(), ['--source', 'warehouse']);
  assert.equal(result.status, 1);
  assert.equal(result.calls.length, 0);
});
test('airtable source fails when revenue does not match the window total', () => {
  const result = run(airtableFixture([sellerRow({ fldxVd61LWea9SlEF: 149.99 })]), ['--execute', '--source', 'airtable']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /incomplete/);
  assert.equal(result.writes.length, 0);
});
