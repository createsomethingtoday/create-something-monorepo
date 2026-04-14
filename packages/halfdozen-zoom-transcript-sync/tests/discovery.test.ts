import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';

import {
  EMPTY_TRANSCRIPT_REASON,
  discoverTranscript,
  getLedgerByDedupKey,
  initSchema,
  markLedgerSkipped,
} from '../src/db.ts';
import type { TranscriptCandidate } from '../src/types.ts';

type StatementResult = { meta: { last_row_id: number } };

class SqliteD1Statement {
  constructor(
    private readonly db: DatabaseSync,
    private readonly sql: string,
    private readonly values: unknown[] = [],
  ) {}

  bind(...values: unknown[]): SqliteD1Statement {
    return new SqliteD1Statement(this.db, this.sql, values);
  }

  async run(): Promise<StatementResult> {
    const statement = this.db.prepare(this.sql);
    statement.run(...this.values);

    const row = this.db.prepare('SELECT last_insert_rowid() AS id').get() as { id?: number | bigint } | undefined;
    const lastRowId = typeof row?.id === 'bigint' ? Number(row.id) : (row?.id ?? 0);

    return { meta: { last_row_id: lastRowId } };
  }

  async first<T>(): Promise<T | null> {
    const statement = this.db.prepare(this.sql);
    const row = statement.get(...this.values) as T | undefined;
    return row ?? null;
  }

  async all<T>(): Promise<{ results: T[] }> {
    const statement = this.db.prepare(this.sql);
    const rows = statement.all(...this.values) as T[];
    return { results: rows };
  }
}

class SqliteD1Database {
  #db = new DatabaseSync(':memory:');

  prepare(sql: string): SqliteD1Statement {
    return new SqliteD1Statement(this.#db, sql);
  }
}

function makeCandidate(overrides: Partial<TranscriptCandidate> = {}): TranscriptCandidate {
  return {
    dedupKey: 'zoom-meeting:123456789::file-1',
    canonicalMeetingKey: 'zoom-meeting:123456789',
    meetingId: '123456789',
    meetingUuid: 'meeting-uuid',
    meetingTitle: 'Internal LLM Sync',
    meetingDate: '2026-04-14',
    startTime: '2026-04-14T15:00:00.000Z',
    sourceUrl: 'https://us06web.zoom.us/recording/management/detail?meeting_id=123456789',
    originalSourceUrl: 'https://us06web.zoom.us/rec/download/file-1',
    transcriptDownloadUrl: 'https://us06web.zoom.us/rec/download/transcript-file-1',
    transcriptFileId: 'file-1',
    transcriptFileType: 'TRANSCRIPT',
    transcriptFileExtension: 'vtt',
    hostId: 'host-1',
    ...overrides,
  };
}

test('empty transcript skips retry on later discovery for the same file identity', async () => {
  const db = new SqliteD1Database() as unknown as D1Database;
  await initSchema(db);

  const firstCandidate = makeCandidate();
  const initialDiscovery = await discoverTranscript(db, firstCandidate);
  assert.equal(initialDiscovery.shouldEnqueue, true);

  await markLedgerSkipped(
    db,
    firstCandidate.dedupKey,
    null,
    null,
    null,
    EMPTY_TRANSCRIPT_REASON,
  );

  const sameFileCandidate = makeCandidate({
    originalSourceUrl: 'https://us06web.zoom.us/rec/download/file-1?retry=1',
    transcriptDownloadUrl: 'https://us06web.zoom.us/rec/download/transcript-file-1?retry=1',
  });

  const laterDiscovery = await discoverTranscript(db, sameFileCandidate);
  const ledger = await getLedgerByDedupKey(db, firstCandidate.dedupKey);

  assert.equal(ledger?.status, 'discovered');
  assert.equal(
    laterDiscovery.shouldEnqueue,
    true,
    'expected same-file transcripts to retry after an empty first fetch',
  );
});

test('non-empty skipped transcripts remain terminal for the same file identity', async () => {
  const db = new SqliteD1Database() as unknown as D1Database;
  await initSchema(db);

  const firstCandidate = makeCandidate();
  const initialDiscovery = await discoverTranscript(db, firstCandidate);
  assert.equal(initialDiscovery.shouldEnqueue, true);

  await markLedgerSkipped(
    db,
    firstCandidate.dedupKey,
    'page_123',
    'https://notion.so/page_123',
    'sha256-value',
    'Transcript hash sha256-value already present in page body',
  );

  const sameFileCandidate = makeCandidate({
    originalSourceUrl: 'https://us06web.zoom.us/rec/download/file-1?retry=2',
    transcriptDownloadUrl: 'https://us06web.zoom.us/rec/download/transcript-file-1?retry=2',
  });

  const laterDiscovery = await discoverTranscript(db, sameFileCandidate);
  const ledger = await getLedgerByDedupKey(db, firstCandidate.dedupKey);

  assert.equal(ledger?.status, 'skipped');
  assert.equal(laterDiscovery.shouldEnqueue, false);
});
