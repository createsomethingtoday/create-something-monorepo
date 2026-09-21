import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const tables = {
  assets: 'tblRwzpWoLgE9MrUm', categories: 'tblSygBX7adZ4VNjK',
  leaderboard: 'tblcXLVLYobhNmrg6', performance: 'tblDU1oUiobNfMQP9'
};
function fixture() {
  return {
    sellers: [{ NAME: 'Template', SALES_30D: 3, REVENUE_30D: 150, TEMPLATE_IDS: 1 }],
    records: {
      [tables.assets]: [{ id: 'recAsset', fields: { fldUzJBor3Gnkykjc: 'Template', fldBv3YTf6Bd5HDXN: ['Agency'], fldHhxmfSNMp117SP: ['fixture@example.test'] } }],
      [tables.categories]: [{ id: 'recTaxonomy', fields: { fldWQDQuXlqwWxORG: 'Agency', fldDSMRYPV8KBIeX7: ['Business'] } }],
      [tables.leaderboard]: [{ id: 'recLeaderboard', fields: { fldpoyuACf0AWUZNn: 'Template' } }],
      [tables.performance]: [{ id: 'recPerformance', fields: { fld2p5qf0mCZJUHjM: 'Business::Agency' } }]
    }
  };
}
function run(data, args = ['--execute']) {
  const directory = mkdtempSync(join(tmpdir(), 'insights-contract-'));
  try {
    for (const name of ['sync.mjs', 'plan-guard.mjs']) copyFileSync(join(here, name), join(directory, name));
    mkdirSync(join(directory, 'bin'));
    writeFileSync(join(directory, 'bin/uvx'), '#!/usr/bin/env node\nprocess.stdout.write(' + JSON.stringify(JSON.stringify(data.sellers)) + ');\n', { mode: 0o755 });
    writeFileSync(join(directory, 'fixture.json'), JSON.stringify(data));
    writeFileSync(join(directory, 'mock.mjs'), `import fs from 'node:fs';
const data=JSON.parse(fs.readFileSync(process.env.FIXTURE_FILE,'utf8'));
globalThis.fetch=async(input,options={})=>{
 const url=new URL(input); const table=url.pathname.split('/').at(-1); const method=options.method??'GET';
 if(url.hostname!=='api.airtable.com'||!(table in data.records))throw Error('Unexpected target');
 const body=options.body?JSON.parse(options.body):null;
 fs.appendFileSync(process.env.MOCK_CALLS,JSON.stringify({method,table,body})+'\\n');
 if(method==='GET')return Response.json({records:data.records[table]});
 if(method==='PATCH')return Response.json({createdRecords:[],updatedRecords:body.records.map((_,i)=>'rec'+i)});
 if(method==='DELETE')return Response.json({records:[]});
 throw Error('Unexpected method');
};`);
    const result = spawnSync(process.execPath, ['--import', join(directory, 'mock.mjs'), join(directory, 'sync.mjs'), '--as-of', '2026-09-14T16:00:00Z', ...args], {
      encoding: 'utf8', timeout: 10_000,
      env: { PATH: join(directory, 'bin') + ':' + process.env.PATH, AIRTABLE_API_KEY: 'fixture-only', FIXTURE_FILE: join(directory, 'fixture.json'), MOCK_CALLS: join(directory, 'calls.jsonl') }
    });
    let calls = [];
    try { calls = readFileSync(join(directory, 'calls.jsonl'), 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    return { ...result, calls, writes: calls.filter(call => call.method !== 'GET') };
  } finally { rmSync(directory, { recursive: true, force: true }); }
}
function blocked(result, text) {
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, text);
  assert.equal(result.writes.length, 0, 'No table may be mutated before both plans are validated');
}

test('empty warehouse results cannot erase existing snapshots', () => {
  const data = fixture(); data.sellers = [];
  blocked(run(data), /sellers source is empty/);
});
for (const source of ['assets', 'categories']) {
  test(`empty ${source} input cannot replace snapshots`, () => {
    const data = fixture(); data.records[tables[source]] = [];
    blocked(run(data), new RegExp(source + ' source is empty'));
  });
}
test('unmatched sellers cannot clear category snapshots after writing the leaderboard', () => {
  const data = fixture(); data.records[tables.assets][0].fields.fldUzJBor3Gnkykjc = 'Another template';
  blocked(run(data), /categories would be empty/);
});
for (const [table, field, label] of [['leaderboard', 'fldpoyuACf0AWUZNn', 'leaderboard'], ['performance', 'fld2p5qf0mCZJUHjM', 'categories']]) {
  test(`large ${label} deletion is blocked before any write`, () => {
    const data = fixture();
    for (let i = 0; i < 4; i++) data.records[tables[table]].push({ id: 'recOld' + i, fields: { [field]: 'Old' + i } });
    blocked(run(data), /exceeding the 25% limit/);
  });
}
test('healthy plans preserve the existing sales and revenue projection', () => {
  const result = run(fixture());
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.writes.map(call => call.method), ['PATCH', 'PATCH']);
  const fields = result.writes[0].body.records[0].fields;
  assert.equal(fields.fldk5PCuevvbB8uQG, 3);
  assert.equal(fields.fldbhCby5W5JWKDP6, 150);
  assert.equal(fields.fldxEWdeV5DWZ6Hyi, '2026-09-14T16:00:00.000Z');
});
test('a first complete snapshot can populate empty destinations', () => {
  const data = fixture(); data.records[tables.leaderboard] = []; data.records[tables.performance] = [];
  const result = run(data); assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.writes.map(call => call.method), ['PATCH', 'PATCH']);
});
test('dry-run never mutates even when a replacement would remove existing rows', () => {
  const data = fixture(); data.records[tables.performance][0].fields.fld2p5qf0mCZJUHjM = 'Old';
  const result = run(data, []); assert.equal(result.status, 0, result.stderr); assert.equal(result.writes.length, 0);
});
test('an explicit reviewed limit permits a nonempty large replacement', () => {
  const data = fixture(); data.records[tables.performance][0].fields.fld2p5qf0mCZJUHjM = 'Old';
  const result = run(data, ['--execute', '--max-delete-fraction', '1']);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.writes.map(call => call.method), ['PATCH', 'PATCH', 'DELETE']);
});
test('invalid deletion limits fail before contacting providers', () => {
  const result = run(fixture(), ['--execute', '--max-delete-fraction', '2']);
  blocked(result, /requires a number from 0 to 1/); assert.equal(result.calls.length, 0);
});
