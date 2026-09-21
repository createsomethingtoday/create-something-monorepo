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
  snapshot: 'tblSnapshotTest01'
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
      '#!/usr/bin/env node\nprocess.stdout.write(' +
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
