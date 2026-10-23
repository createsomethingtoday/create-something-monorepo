import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { discoverTranscript, initSchema } from '../src/db.ts';
import { ingestionTestExports } from '../src/index.ts';
import { meetingKey, selectRendition } from '../src/ingestion-state.ts';
import { atOrAfter, rolloutCutoff } from '../src/rollout.ts';
import type { Env, TranscriptCandidate } from '../src/types.ts';

const cutoff = '2026-10-23T00:00:00.000Z';
function database() {
  const sql = new DatabaseSync(':memory:');
  const hintLookups: unknown[][] = [];
  const db = { prepare(query: string) {
    let args: any[] = [];
    const statement = {
      bind(...values: any[]) { args = values; return statement; },
      async run() {
        const result = sql.prepare(query).run(...args);
        return { meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } };
      },
      async first() {
        if (query.includes('notion_page_id AS pageId')) { hintLookups.push(args); throw new Error('hint lookup intercepted'); }
        return sql.prepare(query).get(...args) ?? null;
      },
      async all() { return { results: sql.prepare(query).all(...args) }; },
    };
    return statement;
  } } as unknown as D1Database;
  return { sql, db, hintLookups };
}

function candidate(): TranscriptCandidate {
  return {
    dedupKey: 'authoritative::primary', canonicalMeetingKey: 'authoritative', meetingId: '1', meetingUuid: 'authoritative',
    meetingTitle: 'Synthetic forward recording', meetingDate: '2026-10-23', startTime: '2026-10-23T01:00:00Z',
    sourceUrl: 'https://example.test/#occurrence=authoritative', originalSourceUrl: 'https://example.test/transcript',
    transcriptDownloadUrl: 'https://example.test/transcript', transcriptFileId: 'primary', transcriptFileType: 'TRANSCRIPT',
    transcriptFileExtension: 'vtt', hostId: null,
  };
}

test('independent forward: cutoff rejects absent, normalized-invalid and non-UTC configurations', () => {
  for (const value of [undefined, '', '2026-10-23', '2026-02-30T00:00:00Z', '2026-10-23T24:00:00Z', '2026-10-23T00:00:00+00:00']) {
    assert.throws(() => rolloutCutoff({ INDEXED_INGESTION_NOT_BEFORE: value } as Env));
  }
  assert.equal(rolloutCutoff({ INDEXED_INGESTION_NOT_BEFORE: '2026-10-23T00:00:00Z' } as Env), cutoff);
  assert.equal(atOrAfter('2026-10-22T23:59:59.999Z', cutoff), false);
  assert.equal(atOrAfter(cutoff, cutoff), true);
  assert.equal(atOrAfter('2026-10-23T01:00:00+01:00', cutoff), true);
});

test('independent forward: forged admitted payload cannot bypass authoritative old first-seen time', async () => {
  const m = database();
  await initSchema(m.db);
  const file = candidate();
  await discoverTranscript(m.db, file);
  m.sql.prepare('UPDATE transcript_sync_ledger SET first_seen_at = ?').run('2026-10-22T23:59:59.999Z');
  await selectRendition(m.db, meetingKey(file), file.dedupKey);
  const before = m.sql.prepare('SELECT * FROM transcript_ingestion').get();
  const savedFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('excluded item must not fetch'); };
  try {
    assert.equal(await ingestionTestExports.processTranscriptMessage({ DB: m.db, INDEXED_INGESTION_NOT_BEFORE: cutoff } as Env,
      { ...file, startTime: '2099-01-01T00:00:00Z', rolloutCutoff: cutoff, replay: true, runId: null }), 'excluded');
    assert.deepEqual(m.sql.prepare('SELECT * FROM transcript_ingestion').get(), before);
  } finally { globalThis.fetch = savedFetch; m.sql.close(); }
});

test('independent forward: forged queue identity is excluded and valid envelope uses authoritative page hint identity', async () => {
  const m = database();
  await initSchema(m.db);
  const file = candidate();
  await discoverTranscript(m.db, file);
  await selectRendition(m.db, meetingKey(file), file.dedupKey);
  const savedFetch = globalThis.fetch;
  globalThis.fetch = async input => {
    assert.equal(String(input), file.transcriptDownloadUrl);
    return new Response('WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nSynthetic speech\n');
  };
  try {
    assert.equal(await ingestionTestExports.processTranscriptMessage({ DB: m.db, INDEXED_INGESTION_NOT_BEFORE: cutoff,
      ZOOM_ACCESS_TOKEN: 'synthetic' } as Env, { ...file, canonicalMeetingKey: 'forged', meetingDate: '2000-01-01',
      rolloutCutoff: cutoff, replay: true, runId: null }), 'excluded');
    assert.deepEqual(m.hintLookups, []);
    for (const rolloutCutoff of [undefined, '2026-10-22T00:00:00.000Z']) {
      assert.equal(await ingestionTestExports.processTranscriptMessage({ DB: m.db, INDEXED_INGESTION_NOT_BEFORE: cutoff,
        ZOOM_ACCESS_TOKEN: 'synthetic' } as Env, { ...file, rolloutCutoff, replay: true, runId: null }), 'excluded');
    }
    await assert.rejects(ingestionTestExports.processTranscriptMessage({ DB: m.db, INDEXED_INGESTION_NOT_BEFORE: cutoff,
      ZOOM_ACCESS_TOKEN: 'synthetic' } as Env, { ...file, rolloutCutoff: cutoff, replay: true, runId: null }),
      /hint lookup intercepted/);
    assert.deepEqual(m.hintLookups, [[file.canonicalMeetingKey, file.meetingDate]]);
  } finally { globalThis.fetch = savedFetch; m.sql.close(); }
});

test('independent forward: invalid ledger timestamps remain untouched by discovery invalidation', async () => {
  const m = database();
  await initSchema(m.db);
  const file = candidate();
  await discoverTranscript(m.db, file);
  m.sql.prepare('UPDATE transcript_sync_ledger SET recording_start_time = ?').run('2026-10-23T24:00:00Z');
  assert.equal(atOrAfter('2026-10-23T24:00:00Z', cutoff), false);
  await selectRendition(m.db, meetingKey(file), file.dedupKey);
  m.sql.prepare("UPDATE transcript_ingestion SET ready_version='old-ready', index_block_id='old-index'").run();
  const before = m.sql.prepare('SELECT * FROM transcript_ingestion').get();
  const savedFetch = globalThis.fetch;
  globalThis.fetch = async input => {
    assert.match(String(input), /^https:\/\/api.zoom.us\/v2\//);
    return Response.json({ meetings: [], next_page_token: '' });
  };
  try {
    await ingestionTestExports.executeDiscoveryRun({ DB: m.db, INDEXED_INGESTION_NOT_BEFORE: cutoff,
      ZOOM_ACCESS_TOKEN: 'synthetic' } as Env, 'independent-forward-test');
    assert.deepEqual(m.sql.prepare('SELECT * FROM transcript_ingestion').get(), before);
  } finally { globalThis.fetch = savedFetch; m.sql.close(); }
});
