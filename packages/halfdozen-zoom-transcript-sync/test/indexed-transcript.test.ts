import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { planTranscript, writeIndexedTranscript, blockText, PART_CHAR_BUDGET, type Block, type WriteJournal } from '../src/indexed-transcript.ts';
import { INGESTION_SCHEMA, claimIngestion, selectRendition } from '../src/ingestion-state.ts';
import { parseTranscript, selectCanonicalRendition } from '../src/zoom.ts';
import { discoverTranscript, initSchema } from '../src/db.ts';
import { ingestionTestExports } from '../src/index.ts';
import type { TranscriptCandidate, Env } from '../src/types.ts';

export const candidate: TranscriptCandidate = {
  dedupKey: 'meeting::primary', canonicalMeetingKey: 'meeting', meetingId: '1', meetingUuid: 'uuid',
  meetingTitle: 'Synthetic', meetingDate: '2026-10-23', startTime: '2026-10-23T10:00:00Z',
  sourceUrl: 'https://example.test/#occurrence=uuid', originalSourceUrl: 'https://example.test/transcript',
  transcriptDownloadUrl: 'https://example.test/transcript', transcriptFileId: 'primary',
  transcriptFileType: 'TRANSCRIPT', transcriptFileExtension: 'vtt', hostId: 'host',
};
export function vtt(count: number, suffix = ''): string {
  return 'WEBVTT\r\n\r\n' + Array.from({ length: count }, (_, i) =>
    `${i + 1}\r\n00:${String(Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}.000 --> 01:59:59.000\r\nSpeaker: ${i} ${'testing 🦊 '.repeat(12)}${suffix}\r\n\r\n`).join('');
}
class MemoryNotion {
  nodes = new Map<string, Block[]>([['parent', []]]);
  calls = 0;
  failAt = Infinity;
  failBefore = false;
  list = async (id: string) => structuredClone(this.nodes.get(id) ?? []);
  append = async (id: string, blocks: Block[]) => {
    this.calls++;
    if (this.calls === this.failAt && this.failBefore) throw new Error('timeout before commit');
    for (const block of structuredClone(blocks)) {
      block.id = `block-${this.calls}`;
      const children = block[block.type].children;
      delete block[block.type].children;
      block.has_children = !!children?.length;
      this.nodes.set(block.id, children ?? []);
      this.nodes.get(id)!.push(block);
    }
    if (this.calls === this.failAt) throw new Error('timeout after commit');
  };
}
function memoryJournal(): WriteJournal {
  const keys = new Set<string>();
  return { assertOwner: async () => {}, reserve: async key => { if (keys.has(key)) return false; keys.add(key); return true; } };
}
// Real SQLite executes the SQL, rather than a fake matching query strings.
export function sqliteDb() {
  const sql = new DatabaseSync(':memory:');
  const db = { prepare(query: string) {
    let args: any[] = [];
    const statement = {
      bind(...values: any[]) { args = values; return statement; },
      async run() { const result = sql.prepare(query).run(...args); return { meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } }; },
      async first() { return sql.prepare(query).get(...args) ?? null; },
      async all() { return { results: sql.prepare(query).all(...args) }; },
    };
    return statement;
  } } as unknown as D1Database;
  return { db, sql };
}

test('478 timestamp blocks reconstruct exactly across bounded parts and originals', async () => {
  const raw = vtt(478);
  const parsed = parseTranscript(raw, 'vtt');
  const plan = await planTranscript(parsed);
  assert.equal(plan.blockCount, 478);
  const parts = plan.artifacts.filter(a => a.key.startsWith('part:'));
  assert.ok(parts.length > 11);
  assert.ok(parts.every(a => a.chunks.join('').length <= PART_CHAR_BUDGET));
  assert.equal(parts.map(a => a.chunks.join('')).join('\n'), parsed.plainText);
  assert.equal(plan.artifacts.filter(a => a.key.startsWith('original:')).flatMap(a => a.chunks).join(''), raw);
  const notion = new MemoryNotion();
  const journal = memoryJournal();
  await writeIndexedTranscript(notion, journal, 'parent', plan);
  const calls = notion.calls;
  await writeIndexedTranscript(notion, journal, 'parent', plan);
  assert.equal(notion.calls, calls);
  const index = notion.nodes.get('parent')!.at(-1)!;
  assert.ok(blockText(index).includes(plan.version));
  const text = notion.nodes.get(index.id)!.map(blockText).join('');
  assert.ok(text.indexOf('Part 0001/') < text.indexOf('Part 0002/'));
});

test('partial append with lost response reconciles on retry without duplicates', async () => {
  const plan = await planTranscript(parseTranscript(vtt(100), 'vtt'));
  const notion = new MemoryNotion(); notion.failAt = 3;
  const journal = memoryJournal();
  await assert.rejects(writeIndexedTranscript(notion, journal, 'parent', plan), /timeout after commit/);
  notion.failAt = Infinity;
  await writeIndexedTranscript(notion, journal, 'parent', plan);
  assert.equal(notion.nodes.get('parent')!.length, plan.artifacts.length + 1);
});

test('unknown absent write fails closed on retry, never appends again', async () => {
  const plan = await planTranscript(parseTranscript(vtt(20), 'vtt'));
  const notion = new MemoryNotion(); notion.failAt = 2; notion.failBefore = true;
  const journal = memoryJournal();
  await assert.rejects(writeIndexedTranscript(notion, journal, 'parent', plan), /timeout before commit/);
  notion.failAt = Infinity;
  await assert.rejects(writeIndexedTranscript(notion, journal, 'parent', plan), /requires reconciliation/);
  assert.equal(notion.calls, 2);
});

test('changed transcript creates a new version and leaves prior originals intact', async () => {
  const first = await planTranscript(parseTranscript(vtt(30), 'vtt'));
  const second = await planTranscript(parseTranscript(vtt(30, ' corrected'), 'vtt'));
  assert.notEqual(first.version, second.version);
  const notion = new MemoryNotion(); const journal = memoryJournal();
  await writeIndexedTranscript(notion, journal, 'parent', first);
  const prior = structuredClone(notion.nodes.get('parent'));
  await writeIndexedTranscript(notion, journal, 'parent', second);
  assert.deepEqual(notion.nodes.get('parent')!.slice(0, prior!.length), prior);
});

test('duplicate or changed parts cannot produce an index', async () => {
  const plan = await planTranscript(parseTranscript(vtt(20), 'vtt'));
  const notion = new MemoryNotion(); const journal = memoryJournal();
  await writeIndexedTranscript(notion, journal, 'parent', plan);
  const part = notion.nodes.get('parent')!.find(b => blockText(b).includes('| part:1 |'))!;
  notion.nodes.get(part.id)![0].paragraph.rich_text[0].text.content = 'missing';
  await assert.rejects(writeIndexedTranscript(notion, journal, 'parent', plan), /Incomplete or changed/);
  notion.nodes.get('parent')!.push(structuredClone(part));
  await assert.rejects(writeIndexedTranscript(notion, journal, 'parent', plan), /Duplicate artifact/);
});

test('concurrent writers reserve each artifact once', async () => {
  const plan = await planTranscript(parseTranscript(vtt(20), 'vtt'));
  const notion = new MemoryNotion(); const journal = memoryJournal();
  const result = await Promise.allSettled([writeIndexedTranscript(notion, journal, 'parent', plan), writeIndexedTranscript(notion, journal, 'parent', plan)]);
  assert.ok(result.some(r => r.status === 'fulfilled'));
  assert.equal(notion.nodes.get('parent')!.length, plan.artifacts.length + 1);
});

test('readiness clears on claims, stale lease cannot publish or release successor', async () => {
  const { db, sql } = sqliteDb();
  for (const statement of INGESTION_SCHEMA) await db.prepare(statement).run();
  await selectRendition(db, 'meeting', 'file');
  const first = await claimIngestion(db, 'meeting', 'file');
  await first.begin('v1'); await first.ready('v1', 'page', 'index');
  assert.equal(sql.prepare('SELECT ready_version FROM transcript_ingestion').get()!.ready_version, 'v1');
  await assert.rejects(claimIngestion(db, 'meeting', 'file'), /busy/);
  sql.exec("UPDATE transcript_ingestion SET expires_at = '2000-01-01'");
  const second = await claimIngestion(db, 'meeting', 'file');
  assert.equal(sql.prepare('SELECT ready_version FROM transcript_ingestion').get()!.ready_version, null);
  await assert.rejects(first.ready('v1', 'page', 'index'), /ownership lost/);
  await first.release(); await second.assertOwner();
  await second.begin('v2');
  await selectRendition(db, 'meeting', 'different-file');
  await assert.rejects(second.ready('v2', 'page', 'index'), /ownership lost/);
});

test('canonical rendition selection refuses ties and prefers primary VTT', () => {
  const cc = { ...candidate, dedupKey: 'cc', transcriptFileType: 'CC' };
  assert.equal(selectCanonicalRendition([cc, candidate]), candidate);
  assert.equal(selectCanonicalRendition([candidate, { ...candidate, dedupKey: 'second' }]), null);
});

test('same-file completed ledger is rechecked, ephemeral URL changes do not change identity', async () => {
  const { db } = sqliteDb(); await initSchema(db);
  await discoverTranscript(db, candidate);
  await db.prepare("UPDATE transcript_sync_ledger SET status = 'synced', transcript_sha256 = 'old'").run();
  assert.equal((await discoverTranscript(db, { ...candidate, transcriptDownloadUrl: 'https://example.test/new-url' })).shouldEnqueue, true);
});

test('oversized cue fails without truncation; no empty transcript can become ready', async () => {
  await assert.rejects(planTranscript(parseTranscript(vtt(1).replace('Speaker:', 'x'.repeat(7000)), 'vtt')), /exceeds/);
  await assert.rejects(planTranscript(parseTranscript('WEBVTT\n\n', 'vtt')), /Empty/);
});

test('worker integration verifies readback, resumes failed writes, rechecks edits and withholds readiness', async () => {
  const { db, sql } = sqliteDb(); await initSchema(db);
  await discoverTranscript(db, candidate);
  await selectRendition(db, JSON.stringify([candidate.canonicalMeetingKey, candidate.meetingDate]), candidate.dedupKey);
  let raw = vtt(2000);
  let failAppend = 3;
  let appendCalls = 0;
  let mutateOnDownload = false;
  let downloads = 0;
  let created = false;
  const notion = new MemoryNotion();
  const page = { id: 'parent', url: 'https://www.notion.so/parent', properties: {
    Item: { title: [{ plain_text: candidate.meetingTitle }] },
    Date: { date: { start: candidate.meetingDate } },
    'Source URL': { url: candidate.sourceUrl },
  } };
  const savedFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.startsWith('https://example.test/transcript')) {
      downloads++;
      return new Response(mutateOnDownload && downloads % 2 === 0 ? raw + 'changed' : raw);
    }
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    if (url.endsWith('/query')) return Response.json({ results: created ? [page] : [] });
    if (url.endsWith('/pages') && init?.method === 'POST') { created = true; return Response.json(page); }
    if (url.includes('/pages/parent')) return Response.json(page);
    const match = new URL(url).pathname.match(/\/blocks\/([^/]+)\/children/);
    if (match) {
      if (init?.method === 'PATCH') {
        appendCalls++;
        await notion.append(match[1]!, body.children);
        if (appendCalls === failAppend) throw new Error('lost response');
        return Response.json({ results: [] });
      }
      const blocks = await notion.list(match[1]!);
      const start = Number(new URL(url).searchParams.get('start_cursor') ?? 0);
      const end = start + 100;
      return Response.json({ results: blocks.slice(start, end), has_more: end < blocks.length,
        next_cursor: end < blocks.length ? String(end) : null });
    }
    throw new Error(`Unexpected test request: ${url}`);
  };
  const env = { DB: db, NOTION_DATABASE_ID: 'database', NOTION_API_KEY: 'fake', ZOOM_ACCESS_TOKEN: 'fake' } as Env;
  const message = { ...candidate, replay: false, runId: null };
  try {
    await assert.rejects(ingestionTestExports.processTranscriptMessage(env, message), /lost response/);
    assert.equal(sql.prepare('SELECT ready_version FROM transcript_ingestion').get()!.ready_version, null);
    failAppend = Infinity;
    await ingestionTestExports.processTranscriptMessage(env, message);
    const ready = sql.prepare('SELECT ready_version FROM transcript_ingestion').get()!.ready_version;
    assert.equal(typeof ready, 'string');
    const calls = appendCalls;
    await ingestionTestExports.processTranscriptMessage(env, message);
    assert.equal(appendCalls, calls);
    raw = vtt(2000, 'correction');
    await ingestionTestExports.processTranscriptMessage(env, message);
    assert.notEqual(sql.prepare('SELECT ready_version FROM transcript_ingestion').get()!.ready_version, ready);
    mutateOnDownload = true; downloads = 0;
    await assert.rejects(ingestionTestExports.processTranscriptMessage(env, message), /changed during ingestion/);
    assert.equal(sql.prepare('SELECT ready_version FROM transcript_ingestion').get()!.ready_version, null);
    mutateOnDownload = false; raw = 'WEBVTT\n\n';
    await assert.rejects(ingestionTestExports.processTranscriptMessage(env, message), /Empty/);
    assert.equal(sql.prepare('SELECT ready_version FROM transcript_ingestion').get()!.ready_version, null);
  } finally { globalThis.fetch = savedFetch; }
});

test('discovery invalidates a disappeared selected file in the scanned window', async () => {
  const { db, sql } = sqliteDb(); await initSchema(db);
  const today = new Date().toISOString().slice(0, 10);
  const current = { ...candidate, meetingDate: today };
  await discoverTranscript(db, current);
  const key = JSON.stringify([current.canonicalMeetingKey, today]);
  await selectRendition(db, key, current.dedupKey);
  const lease = await claimIngestion(db, key, current.dedupKey);
  await lease.begin('verified'); await lease.ready('verified', 'page', 'index'); await lease.release();
  const savedFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ meetings: [] });
  try {
    await ingestionTestExports.executeDiscoveryRun({ DB: db, ZOOM_ACCESS_TOKEN: 'fake' } as Env, 'test');
    assert.equal(sql.prepare('SELECT ready_version FROM transcript_ingestion').get()!.ready_version, null);
  } finally { globalThis.fetch = savedFetch; }
});
