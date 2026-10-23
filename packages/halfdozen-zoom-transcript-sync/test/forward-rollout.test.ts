import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import worker, { ingestionTestExports } from '../src/index.ts';
import { initSchema, discoverTranscript } from '../src/db.ts';
import { atOrAfter, ledgerAdmitted, rolloutCutoff } from '../src/rollout.ts';
import { selectRendition, meetingKey } from '../src/ingestion-state.ts';
import { syncTranscriptToNotion } from '../src/notion.ts';
import { planTranscript } from '../src/indexed-transcript.ts';
import { parseTranscript } from '../src/zoom.ts';
import type { Env, TranscriptCandidate, LedgerRow } from '../src/types.ts';

function database() {
  const sql = new DatabaseSync(':memory:');
  const db = { prepare(query: string) {
    let args: any[] = [];
    const stmt = {
      bind(...values: any[]) { args = values; return stmt; },
      async run() { const r = sql.prepare(query).run(...args); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; },
      async first() { return sql.prepare(query).get(...args) ?? null; },
      async all() { return { results: sql.prepare(query).all(...args) }; },
    }; return stmt;
  } } as unknown as D1Database;
  return { db, sql };
}
function fixture(start: string, key = 'legacy'): TranscriptCandidate {
  return { dedupKey: `${key}::transcript`, canonicalMeetingKey: `zoom-meeting-uuid:${key}`, meetingId: '1', meetingUuid: key,
    meetingTitle: key === 'legacy' ? 'OD x DM (synthetic exclusion fixture)' : 'New synthetic meeting',
    meetingDate: start.slice(0, 10), startTime: start,
    sourceUrl: `https://example.test/#occurrence=${key}`, originalSourceUrl: 'https://example.test/transcript',
    transcriptDownloadUrl: 'https://example.test/transcript', transcriptFileId: 'transcript', transcriptFileType: 'TRANSCRIPT',
    transcriptFileExtension: 'vtt', hostId: null };
}

test('rollout requires an explicit valid UTC instant; missing or malformed never falls back', () => {
  for (const value of [undefined, '', '2026-10-23', '2026-02-30T12:00:00Z', '2026-10-23T12:00:00+00:00']) {
    assert.throws(() => rolloutCutoff({ INDEXED_INGESTION_NOT_BEFORE: value } as Env));
  }
  assert.equal(rolloutCutoff({ INDEXED_INGESTION_NOT_BEFORE: '2026-10-23T12:00:00Z' } as Env), '2026-10-23T12:00:00.000Z');
  assert.equal(atOrAfter('2026-10-23T12:00:00.000Z', '2026-10-23T12:00:00.000Z'), true);
  assert.equal(atOrAfter('2026-10-23T11:59:59.999Z', '2026-10-23T12:00:00.000Z'), false);
  assert.equal(atOrAfter('2026-10-23T13:00:00+01:00', '2026-10-23T12:00:00.000Z'), true);
  assert.equal(atOrAfter('2026-10-23', '2026-10-23T00:00:00Z'), false);
  assert.equal(atOrAfter('2026-02-30T12:00:00Z', '2026-01-01T00:00:00Z'), false);
});

test('admission requires both recording start and original ledger first_seen at or after cutoff', () => {
  const cutoff = '2026-10-23T12:00:00Z';
  const row = { recording_start_time: cutoff, first_seen_at: cutoff } as LedgerRow;
  assert.equal(ledgerAdmitted(row, cutoff), true);
  assert.equal(ledgerAdmitted({ ...row, first_seen_at: '2026-10-23T11:59:59Z' }, cutoff), false);
  assert.equal(ledgerAdmitted({ ...row, recording_start_time: null }, cutoff), false);
  assert.equal(ledgerAdmitted({ ...row, recording_start_time: '2026-10-22T12:00:00Z' }, cutoff), false);
});

test('cron, replay, and stale queued payloads cannot mutate synthetic OD x DM or legacy records', async () => {
  const { db, sql } = database(); await initSchema(db);
  const cutoff = new Date(Date.now() - 60_000).toISOString();
  const legacy = fixture(new Date(Date.now() - 86_400_000).toISOString());
  await discoverTranscript(db, legacy);
  await db.prepare("UPDATE transcript_sync_ledger SET first_seen_at = ?, status = 'synced', notion_page_id = 'protected-page'")
    .bind(legacy.startTime).run();
  await selectRendition(db, meetingKey(legacy), legacy.dedupKey);
  await db.prepare("UPDATE transcript_ingestion SET ready_version = 'legacy-ready', version = 'legacy-ready'").run();
  const beforeLedger = sql.prepare('SELECT * FROM transcript_sync_ledger').all();
  const beforeIngestion = sql.prepare('SELECT * FROM transcript_ingestion').all();
  let sends = 0; let acked = 0; let retries = 0;
  const env = { DB: db, INDEXED_INGESTION_NOT_BEFORE: cutoff, SYNC_API_KEY: 'fake', ZOOM_ACCESS_TOKEN: 'fake',
    SYNC_QUEUE: { send: async () => { sends++; } } } as unknown as Env;
  const savedFetch = globalThis.fetch;
  globalThis.fetch = async input => {
    assert.match(String(input), /^https:\/\/api.zoom.us\/v2\//, 'no transcript download or Notion operation is permitted');
    return Response.json({ meetings: [{ id: '1', uuid: 'legacy', topic: legacy.meetingTitle, start_time: legacy.startTime,
      recording_files: [{ id: 'transcript', file_type: 'TRANSCRIPT', file_extension: 'vtt', status: 'completed',
        download_url: 'https://example.test/transcript' }] }] });
  };
  try {
    await worker.scheduled({} as ScheduledEvent, env, {} as ExecutionContext);
    const replay = await worker.fetch(new Request(`https://worker.test/replay/${encodeURIComponent(legacy.dedupKey)}`,
      { method: 'POST', headers: { Authorization: 'Bearer fake' } }), env, {} as ExecutionContext);
    assert.equal(replay.status, 409);
    // A post-cutoff timestamp forged into an old queue envelope must not override D1.
    await worker.queue({ messages: [{ body: { ...legacy, startTime: new Date().toISOString(), rolloutCutoff: cutoff, replay: true, runId: 999 },
      attempts: 3, ack() { acked++; }, retry() { retries++; } }] } as unknown as MessageBatch<any>, env);
    assert.equal(sends, 0); assert.equal(acked, 1); assert.equal(retries, 0);
    assert.deepEqual(sql.prepare('SELECT * FROM transcript_sync_ledger').all(), beforeLedger);
    assert.deepEqual(sql.prepare('SELECT * FROM transcript_ingestion').all(), beforeIngestion);
    assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM transcript_write_journal').get()!.n, 0);
  } finally { globalThis.fetch = savedFetch; sql.close(); }
});

test('newly discovered pre-cutoff meetings produce no ledger or queued work', async () => {
  const { db, sql } = database(); await initSchema(db);
  const cutoff = new Date(Date.now() - 60_000).toISOString();
  const savedFetch = globalThis.fetch;
  let sends = 0;
  globalThis.fetch = async () => Response.json({ meetings: [{ id: '1', uuid: 'old-unseen', topic: 'Old unseen synthetic',
    start_time: new Date(Date.now() - 86_400_000).toISOString(), recording_files: [{ id: 'file', file_type: 'TRANSCRIPT',
      file_extension: 'vtt', status: 'completed', download_url: 'https://example.test/transcript' }] }] });
  try {
    await ingestionTestExports.executeDiscoveryRun({ DB: db, INDEXED_INGESTION_NOT_BEFORE: cutoff, ZOOM_ACCESS_TOKEN: 'fake',
      SYNC_QUEUE: { send: async () => { sends++; } } } as unknown as Env, 'test');
    assert.equal(sends, 0);
    assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM transcript_sync_ledger').get()!.n, 0);
    assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM transcript_ingestion').get()!.n, 0);
  } finally { globalThis.fetch = savedFetch; sql.close(); }
});

test('post-cutoff newly admitted recording is queued, without rewriting schedule or trigger configuration', async () => {
  const { db, sql } = database(); await initSchema(db);
  const cutoff = new Date(Date.now() - 60_000).toISOString();
  const savedFetch = globalThis.fetch; const sent: any[] = [];
  globalThis.fetch = async () => Response.json({ meetings: [{ id: '1', uuid: 'new', topic: 'New synthetic',
    start_time: new Date(Date.now() - 1000).toISOString(), recording_files: [{ id: 'file', file_type: 'TRANSCRIPT',
      file_extension: 'vtt', status: 'completed', download_url: 'https://example.test/transcript' }] }] });
  try {
    await ingestionTestExports.executeDiscoveryRun({ DB: db, INDEXED_INGESTION_NOT_BEFORE: cutoff, ZOOM_ACCESS_TOKEN: 'fake',
      SYNC_QUEUE: { send: async (message: any) => { sent.push(message); } } } as unknown as Env, 'test');
    assert.equal(sent.length, 1);
    assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM transcript_sync_ledger').get()!.n, 1);
    assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM transcript_ingestion').get()!.n, 1);
  } finally { globalThis.fetch = savedFetch; sql.close(); }
});

test('matching pre-cutoff Notion page is never updated or appended for an admitted recording', async () => {
  const cutoff = '2026-10-23T12:00:00Z';
  const candidate = fixture('2026-10-23T13:00:00Z', 'new');
  const parsed = parseTranscript('WEBVTT\n\n1\n00:00:01.000 --> 00:00:02.000\nSynthetic\n\n', 'vtt');
  const plan = await planTranscript(parsed); let mutations = 0;
  const savedFetch = globalThis.fetch;
  globalThis.fetch = async (_input, init) => {
    if (init?.method !== 'POST') { mutations++; throw new Error('mutation attempted'); }
    const body = JSON.parse(String(init.body));
    assert.ok(body.filter, 'only read-only database query is allowed');
    return Response.json({ results: [{ id: 'legacy-page', created_time: '2026-10-22T00:00:00.000Z',
      properties: { Item: { title: [{ plain_text: candidate.meetingTitle }] }, Date: { date: { start: candidate.meetingDate } },
        'Source URL': { url: candidate.sourceUrl } } }] });
  };
  try {
    await assert.rejects(syncTranscriptToNotion({ INDEXED_INGESTION_NOT_BEFORE: cutoff, NOTION_API_KEY: 'fake',
      NOTION_DATABASE_ID: 'fake' } as Env, candidate, parsed, plan,
      { reserve: async () => { mutations++; return true; }, assertOwner: async () => {} }), /forward-only rollout boundary/);
    assert.equal(mutations, 0);
  } finally { globalThis.fetch = savedFetch; }
});

test('missing cutoff stops cron and queues before D1 access; health stays read-only', async () => {
  let databaseCalls = 0;
  const db = { prepare() { databaseCalls++; throw new Error('D1 access forbidden'); } } as unknown as D1Database;
  const env = { DB: db } as Env;
  await assert.rejects(worker.scheduled({} as ScheduledEvent, env, {} as ExecutionContext), /approved explicit UTC instant/);
  await assert.rejects(worker.queue({ messages: [] } as unknown as MessageBatch<any>, env), /approved explicit UTC instant/);
  const health = await worker.fetch(new Request('https://worker.test/health'), env, {} as ExecutionContext);
  assert.equal(health.status, 200);
  assert.equal((await health.json() as any).indexed_ingestion_not_before, null);
  assert.equal(databaseCalls, 0);
});
