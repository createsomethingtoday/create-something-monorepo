import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { artifactMarker, blockText, ensureArtifact, planTranscript, textBlock, type Block, type WriteJournal } from '../src/indexed-transcript.ts';
import { claimIngestion, meetingKey, selectRendition } from '../src/ingestion-state.ts';
import { discoverTranscript, initSchema } from '../src/db.ts';
import { ingestionTestExports } from '../src/index.ts';
import type { Env, TranscriptCandidate } from '../src/types.ts';
import { parseTranscript } from '../src/zoom.ts';

function model() {
  const rows = new Map<string, Block[]>([['page', []]]);
  const reserved = new Set<string>();
  let sends = 0;
  let commit = true;
  let timeout = false;
  let owner = true;
  const journal: WriteJournal = {
    async assertOwner() { if (!owner) throw new Error('ownership lost'); },
    async reserve(key) { if (reserved.has(key)) return false; reserved.add(key); return true; },
  };
  const transport = {
    async list(id: string) { return structuredClone(rows.get(id) ?? []); },
    async append(parent: string, blocks: Block[]) {
      sends++;
      if (commit) for (const block of blocks) {
        const id = `block-${sends}`;
        const stored = structuredClone({ ...block, id, has_children: true });
        rows.set(id, stored.toggle.children);
        delete stored.toggle.children;
        rows.get(parent)!.push(stored);
      }
      if (timeout) throw new Error('unknown outcome');
    },
  };
  return { rows, journal, transport, sends: () => sends,
    setCommit: (value: boolean) => { commit = value; },
    setTimeout: (value: boolean) => { timeout = value; },
    loseOwner: () => { owner = false; },
  };
}

const artifact = { key: 'part:1', title: 'Part 1/1', chunks: ['00:00\nRepeated speech', '\n00:01\nRepeated speech'] };

test('independent: committed timeout reconciles exact children without a second append', async () => {
  const m = model();
  m.setTimeout(true);
  await assert.rejects(ensureArtifact(m.transport, m.journal, 'page', 'v1', artifact), /unknown outcome/);
  m.setTimeout(false);
  assert.equal(await ensureArtifact(m.transport, m.journal, 'page', 'v1', artifact), 'block-1');
  assert.equal(m.sends(), 1);
});

test('independent: absent uncertain append is never resent', async () => {
  const m = model();
  m.setCommit(false);
  m.setTimeout(true);
  await assert.rejects(ensureArtifact(m.transport, m.journal, 'page', 'v1', artifact), /unknown outcome/);
  m.setCommit(true);
  m.setTimeout(false);
  await assert.rejects(ensureArtifact(m.transport, m.journal, 'page', 'v1', artifact), /requires reconciliation/);
  assert.equal(m.sends(), 1);
});

test('independent: retry rejects missing or duplicated canonical child blocks without rewriting', async () => {
  for (const mutate of [(rows: Block[]) => rows.pop(), (rows: Block[]) => rows.push(structuredClone(rows[0]!))]) {
    const m = model();
    const id = await ensureArtifact(m.transport, m.journal, 'page', 'v1', artifact);
    mutate(m.rows.get(id)!);
    await assert.rejects(ensureArtifact(m.transport, m.journal, 'page', 'v1', artifact), /Incomplete or changed artifact/);
    assert.equal(m.sends(), 1);
  }
});

test('independent: duplicate artifact markers reject even when both children match', async () => {
  const m = model();
  await ensureArtifact(m.transport, m.journal, 'page', 'v1', artifact);
  m.rows.get('page')!.push(structuredClone(m.rows.get('page')![0]!));
  await assert.rejects(ensureArtifact(m.transport, m.journal, 'page', 'v1', artifact), /Duplicate artifact/);
  assert.equal(m.sends(), 1);
});

test('independent: lease loss while reconciling does not authorize another append', async () => {
  const m = model();
  m.loseOwner();
  await assert.rejects(ensureArtifact(m.transport, m.journal, 'page', 'v1', artifact), /ownership lost/);
  assert.equal(m.sends(), 0);
});

test('independent: malformed timing cue is rejected rather than silently canonicalized', async () => {
  const raw = 'WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nFirst\n\ninvalid --> end\nSecond\n';
  await assert.rejects(planTranscript(parseTranscript(raw, 'vtt')), /Unsupported or incomplete VTT/);
});

test('independent: an empty VTT cue cannot disappear from canonical block count', async () => {
  const raw = 'WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nFirst\n\n00:00:01.000 --> 00:00:02.000\n\n';
  await assert.rejects(planTranscript(parseTranscript(raw, 'vtt')), /Unsupported or incomplete VTT/);
});

test('independent: malformed VTT orphan speech is rejected instead of omitted from canonical text', async () => {
  const raw = 'WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nFirst\n\nOrphan speech without a timestamp\n';
  await assert.rejects(planTranscript(parseTranscript(raw, 'vtt')), /Unsupported|incomplete|orphan|Unparsed/i);
});

test('independent: repeated cues remain distinct and original text preserves CRLF and emoji', async () => {
  const raw = 'WEBVTT\r\n\r\n1\r\n00:00:00.000 --> 00:00:01.000\r\nSame 😀\r\n\r\n2\r\n00:00:01.000 --> 00:00:02.000\r\nSame 😀\r\n';
  const plan = await planTranscript(parseTranscript(raw, 'vtt'));
  assert.equal(plan.blockCount, 2);
  assert.equal(plan.canonical, '00:00\nSame 😀\n00:01\nSame 😀');
  assert.equal(plan.artifacts.filter(a => a.key.startsWith('original:')).flatMap(a => a.chunks).join(''), raw);
  assert.equal(blockText(textBlock(artifactMarker(plan.version, artifact))), artifactMarker(plan.version, artifact));
});

test('independent: disappearance discovery revokes in-flight and queued old selection', async () => {
  const sql = new DatabaseSync(':memory:');
  const db = { prepare(query: string) {
    let args: any[] = [];
    const statement = {
      bind(...values: any[]) { args = values; return statement; },
      async run() {
        const result = sql.prepare(query).run(...args);
        return { meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } };
      },
      async first() { return sql.prepare(query).get(...args) ?? null; },
      async all() { return { results: sql.prepare(query).all(...args) }; },
    };
    return statement;
  } } as unknown as D1Database;
  const candidate: TranscriptCandidate = {
    dedupKey: 'gone::primary', canonicalMeetingKey: 'gone', meetingId: '1', meetingUuid: 'gone',
    meetingTitle: 'Disappeared synthetic recording', meetingDate: new Date().toISOString().slice(0, 10),
    startTime: null, sourceUrl: null, originalSourceUrl: null, transcriptDownloadUrl: 'https://example.test/gone',
    transcriptFileId: 'primary', transcriptFileType: 'TRANSCRIPT', transcriptFileExtension: 'vtt', hostId: null,
  };
  await initSchema(db);
  await discoverTranscript(db, candidate);
  const key = meetingKey(candidate);
  await selectRendition(db, key, candidate.dedupKey);
  const oldLease = await claimIngestion(db, key, candidate.dedupKey);
  await oldLease.begin('old-version');
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async input => {
    assert.match(String(input), /^https:\/\/api.zoom.us\/v2\//);
    return Response.json({ meetings: [], next_page_token: '' });
  };
  try {
    await ingestionTestExports.executeDiscoveryRun({ DB: db, ZOOM_ACCESS_TOKEN: 'synthetic' } as Env, 'independent-test');
    await assert.rejects(oldLease.ready('old-version', 'page', 'index'), /ownership lost/i);
    await oldLease.release();
    await assert.rejects(claimIngestion(db, key, candidate.dedupKey), /no longer selected|busy/i);
    assert.equal(sql.prepare('SELECT ready_version FROM transcript_ingestion').get()!.ready_version, null);
  } finally { globalThis.fetch = originalFetch; sql.close(); }
});
