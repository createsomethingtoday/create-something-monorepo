import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import worker from '../src/index.ts';
import { discoverTranscript, initSchema } from '../src/db.ts';
import { claimIngestion, meetingKey, selectRendition } from '../src/ingestion-state.ts';
import type { Env, TranscriptCandidate, TranscriptQueueMessage } from '../src/types.ts';

function database() {
  const sql = new DatabaseSync(':memory:');
  const db = { prepare(query: string) {
    let args: any[] = [];
    const statement = {
      bind(...values: any[]) { args = values; return statement; },
      async first() { return sql.prepare(query).get(...args) ?? null; },
      async all() { return { results: sql.prepare(query).all(...args) }; },
      async run() { return { meta: { changes: Number(sql.prepare(query).run(...args).changes) } }; },
    };
    return statement;
  } } as unknown as D1Database;
  return { db, sql };
}

test('queue lock-busy retry waits beyond the retained lease and the next delivery can claim after expiry', async () => {
  const { db, sql } = database();
  const now = Date.now();
  const cutoff = new Date(now - 60 * 60_000).toISOString();
  const candidate: TranscriptCandidate = {
    dedupKey: 'synthetic-lock::primary', canonicalMeetingKey: 'synthetic-lock', meetingUuid: 'synthetic-lock',
    meetingId: '1', meetingTitle: 'Synthetic lock recovery', meetingDate: new Date(now).toISOString().slice(0, 10),
    startTime: new Date(now - 10 * 60_000).toISOString(),
    sourceUrl: null, originalSourceUrl: null, transcriptDownloadUrl: 'https://synthetic.invalid/locked-source',
    transcriptFileId: 'primary', transcriptFileType: 'TRANSCRIPT', transcriptFileExtension: 'vtt', hostId: null,
  };
  const body: TranscriptQueueMessage = { ...candidate, rolloutCutoff: cutoff, replay: true, runId: null };
  const env = { DB: db, INDEXED_INGESTION_NOT_BEFORE: cutoff, ZOOM_ACCESS_TOKEN: 'synthetic-only' } as Env;
  const savedFetch = globalThis.fetch;
  let fetchCalls = 0;
  let ownerAtSourceRead: string | undefined;
  globalThis.fetch = async () => {
    fetchCalls++;
    ownerAtSourceRead = sql.prepare('SELECT owner FROM transcript_ingestion').get()!.owner as string;
    throw new Error('Synthetic stop after successful claim; all provider calls denied');
  };
  const deliver = async (attempts: number) => {
    const retries: QueueRetryOptions[] = [];
    let acks = 0;
    await worker.queue({ queue: 'synthetic-only', messages: [{ id: `synthetic-${attempts}`, timestamp: new Date(),
      body, attempts, ack() { acks++; }, retry(options: QueueRetryOptions) { retries.push(options); } }],
      ackAll() { assert.fail('Unexpected batch acknowledgement'); }, retryAll() { assert.fail('Unexpected batch retry'); },
    } as unknown as MessageBatch<TranscriptQueueMessage>, env);
    return { retries, acks };
  };
  try {
    await initSchema(db); await discoverTranscript(db, candidate);
    const key = meetingKey(candidate); await selectRendition(db, key, candidate.dedupKey);
    const interrupted = await claimIngestion(db, key, candidate.dedupKey);
    await interrupted.begin('synthetic-pending-version'); await interrupted.reserve('synthetic-preserved-reservation');
    // Model abrupt cancellation: deliberately retain ownership rather than release it.
    const before = sql.prepare('SELECT * FROM transcript_ingestion').get()!;
    const journal = sql.prepare('SELECT * FROM transcript_write_journal').all();
    const ledger = sql.prepare('SELECT * FROM transcript_sync_ledger').get();
    const result = await deliver(2);
    assert.equal(result.acks, 0); assert.equal(result.retries.length, 1);
    assert.ok(result.retries[0]!.delaySeconds! * 1000 > Date.parse(before.expires_at as string) - Date.now(),
      'Busy retry must wait beyond the full remaining lease instead of consuming attempts every minute');
    assert.equal(fetchCalls, 0);
    assert.deepEqual(sql.prepare('SELECT * FROM transcript_ingestion').get(), before);
    assert.deepEqual(sql.prepare('SELECT * FROM transcript_write_journal').all(), journal);
    assert.deepEqual(sql.prepare('SELECT * FROM transcript_sync_ledger').get(), ledger);
    assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM transcript_inline_projection').get()!.n, 0);

    sql.prepare('UPDATE transcript_ingestion SET expires_at = ? WHERE meeting_key = ?')
      .run('2000-01-01T00:00:00.000Z', key);
    await deliver(1);
    assert.equal(fetchCalls, 1); assert.ok(ownerAtSourceRead); assert.notEqual(ownerAtSourceRead, before.owner);
    assert.equal(sql.prepare('SELECT ready_version FROM transcript_ingestion').get()!.ready_version, null);
    assert.deepEqual(sql.prepare('SELECT * FROM transcript_write_journal').all(), journal);
  } finally { globalThis.fetch = savedFetch; sql.close(); }
});
