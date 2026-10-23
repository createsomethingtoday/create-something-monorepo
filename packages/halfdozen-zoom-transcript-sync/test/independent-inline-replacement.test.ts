import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { INLINE_SCHEMA } from '../src/inline-transcript.ts';
import { planTranscript, type WriteJournal } from '../src/indexed-transcript.ts';
import { syncTranscriptToNotion } from '../src/notion.ts';
import { parseTranscript } from '../src/zoom.ts';
import type { Env, TranscriptCandidate } from '../src/types.ts';
import { ProviderSimulator } from './runtime-support.mjs';

async function fixture(flag: 'archived' | 'in_trash', failure?: 'before' | 'after', archiveAfterInitialCheck = false) {
  const sql = new DatabaseSync(':memory:');
  sql.exec(INLINE_SCHEMA);
  const db = { prepare(query: string) {
    let args: any[] = [];
    const statement = {
      bind(...values: any[]) { args = values; return statement; },
      async first() { return sql.prepare(query).get(...args) ?? null; },
      async run() { return { meta: { changes: Number(sql.prepare(query).run(...args).changes) } }; },
    };
    return statement;
  } } as unknown as D1Database;
  const candidate: TranscriptCandidate = {
    dedupKey: 'synthetic-replacement::primary', canonicalMeetingKey: 'synthetic-replacement',
    meetingId: '1', meetingUuid: 'synthetic-replacement', meetingTitle: 'Synthetic replacement',
    meetingDate: '2026-10-23', startTime: '2026-10-23T10:00:00.000Z',
    sourceUrl: 'https://synthetic.invalid/occurrence#one', originalSourceUrl: null,
    transcriptDownloadUrl: 'https://synthetic.invalid/transcript/one',
    transcriptFileId: 'primary', transcriptFileType: 'TRANSCRIPT', transcriptFileExtension: 'vtt', hostId: null,
  };
  const simulator = new ProviderSimulator();
  const oldId = simulator.id();
  const oldPage = { id: oldId, url: `https://www.notion.so/${oldId}`, [flag]: !archiveAfterInitialCheck,
    created_time: '2026-10-23T10:00:00.000Z', properties: {
      Item: { title: [{ plain_text: candidate.meetingTitle }] }, Date: { date: { start: candidate.meetingDate } },
      'Source URL': { url: candidate.sourceUrl }, Status: { select: { name: 'Operator reviewed' } },
    } };
  simulator.pages.set(oldId, structuredClone(oldPage));
  simulator.blocks.set(oldId, simulator.richBlocks([{ object: 'block', type: 'paragraph',
    paragraph: { rich_text: [{ type: 'text', text: { content: 'Existing protected source' } }] } }]));
  const oldBody = structuredClone(simulator.blocks.get(oldId));
  const originalFetch = globalThis.fetch;
  let failOnce = Boolean(failure);
  let createAttempts = 0;
  let priorPageReads = 0;
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    assert.equal(url.hostname, 'api.notion.com', 'Only the synthetic Notion interceptor may be used');
    if (request.method === 'GET' && url.pathname === `/v1/pages/${oldId}`) {
      priorPageReads++;
      if (archiveAfterInitialCheck && priorPageReads === 2) {
        // An operator archives the active page after the initial authorization GET.
        simulator.pages.get(oldId)[flag] = true;
        oldPage[flag] = true;
      }
    }
    const create = request.method === 'POST' && url.pathname === '/v1/pages';
    if (create) {
      createAttempts++;
      if (failOnce && failure === 'before') {
        failOnce = false;
        return new Response('Synthetic unknown absent create', { status: 503 });
      }
    }
    const response = await simulator.handle(request);
    if (url.pathname.endsWith('/query')) {
      const payload = await response.json();
      // Real database queries exclude archived/trashed pages; retain GET access.
      return Response.json({ ...payload, results: payload.results.filter((page: any) => !page.archived && !page.in_trash) });
    }
    if (create && failOnce && failure === 'after') {
      failOnce = false;
      throw new Error('Synthetic committed create response lost');
    }
    return response;
  };
  const creationKey = `meeting-page:${candidate.canonicalMeetingKey}:${candidate.meetingDate}`;
  const replacementKey = `${creationKey}:replacement:${oldId}`;
  const reserved = new Set([creationKey]);
  const journal: WriteJournal = { async assertOwner() {}, async reserve(key) {
    if (reserved.has(key)) return false;
    reserved.add(key); return true;
  } };
  const env = { DB: db, INDEXED_INGESTION_NOT_BEFORE: '2026-10-23T00:00:00.000Z',
    NOTION_API_KEY: 'synthetic-key', NOTION_DATABASE_ID: 'synthetic-database' } as Env;
  const parsed = parseTranscript('WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nSynthetic replacement\n', 'vtt');
  const plan = await planTranscript(parsed);
  const hint = { pageId: oldId, pageUrl: oldPage.url };
  return { simulator, sql, reserved, creationKey, replacementKey, oldId,
    createAttempts: () => createAttempts,
    priorPageReads: () => priorPageReads,
    sync: (allowReplacement?: boolean) => syncTranscriptToNotion(env, candidate, parsed, plan, journal, hint, allowReplacement),
    assertOldUnchanged() {
      assert.deepEqual(simulator.pages.get(oldId), oldPage);
      assert.deepEqual(simulator.blocks.get(oldId), oldBody);
    },
    close() { globalThis.fetch = originalFetch; sql.close(); },
  };
}

test('independent inline replacement: normal archived or trashed page hint cannot create or mutate', async () => {
  for (const flag of ['archived', 'in_trash'] as const) {
    const f = await fixture(flag);
    try {
      await assert.rejects(f.sync(), /replacement requires explicit replay/);
      await assert.rejects(f.sync(false), /replacement requires explicit replay/);
      assert.equal(f.createAttempts(), 0); assert.equal(f.simulator.mutations, 0);
      assert.ok(f.simulator.requests.every(([method]: string[]) => method === 'GET'));
      assert.deepEqual([...f.reserved], [f.creationKey]);
      assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM transcript_inline_projection').get()!.n, 0);
      f.assertOldUnchanged();
    } finally { f.close(); }
  }
});

test('independent inline replacement: explicit replay retains old journal and reconciles committed replacement creation once', async () => {
  for (const flag of ['archived', 'in_trash'] as const) {
    const f = await fixture(flag, 'after');
    try {
      await assert.rejects(f.sync(true), /committed create response lost/);
      assert.ok(f.reserved.has(f.creationKey)); assert.ok(f.reserved.has(f.replacementKey));
      assert.equal(f.simulator.pages.size, 2);
      const receipt = await f.sync(true);
      assert.notEqual(receipt.pageId, f.oldId); assert.ok(receipt.indexBlockId);
      assert.equal(f.createAttempts(), 1); assert.equal(f.simulator.pages.size, 2);
      const mutations = f.simulator.mutations;
      await f.sync(true);
      assert.equal(f.simulator.mutations, mutations); assert.equal(f.createAttempts(), 1);
      f.assertOldUnchanged();
    } finally { f.close(); }
  }
});

test('independent inline replacement: explicit replay never resends an uncertain absent page creation', async () => {
  const f = await fixture('archived', 'before');
  try {
    await assert.rejects(f.sync(true), /Notion API error \(503\)/);
    await assert.rejects(f.sync(true), /Uncertain Notion page creation requires reconciliation/);
    assert.equal(f.createAttempts(), 1); assert.equal(f.simulator.pages.size, 1);
    assert.equal(f.simulator.mutations, 0); assert.ok(f.reserved.has(f.replacementKey));
    assert.ok(f.reserved.has(f.creationKey)); f.assertOldUnchanged();
  } finally { f.close(); }
});

test('independent inline replacement: an active page archived after the first GET still requires explicit replay', async () => {
  for (const flag of ['archived', 'in_trash'] as const) {
    for (const allowReplacement of [undefined, false]) {
      const f = await fixture(flag, undefined, true);
      try {
        await assert.rejects(f.sync(allowReplacement), /replacement requires explicit replay/);
        assert.equal(f.priorPageReads(), 3, 'Reach the later creation-key authorization decision');
        assert.equal(f.createAttempts(), 0); assert.equal(f.simulator.mutations, 0);
        assert.equal(f.simulator.pages.size, 1);
        assert.deepEqual([...f.reserved], [f.creationKey], 'Do not reserve a replacement intent without authorization');
        assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM transcript_inline_projection').get()!.n, 0);
        f.assertOldUnchanged();
      } finally { f.close(); }
    }
  }
});
