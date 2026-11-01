import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { Gate, GATE_FIELDS, GATE_SCHEMA, gateCreationProperties, gateToken, propertyText } from '../src/readiness-gate.ts';
import { INGESTION_SCHEMA, claimIngestion, selectRendition } from '../src/ingestion-state.ts';
import { PAGE_FORMAT } from '../src/page-transcript.ts';
import { planTranscript } from '../src/indexed-transcript.ts';
import { parseTranscript } from '../src/zoom.ts';
import { initSchema } from '../src/db.ts';
import { invalidateNotionReadiness, publishNotionReadiness, syncTranscriptToNotion } from '../src/notion.ts';
import type { Env, TranscriptCandidate } from '../src/types.ts';
import { ProviderSimulator, startRuntime, syntheticVtt } from './runtime-support.mjs';

const hash = 'a'.repeat(64);
const rich = (content: string) => ({ rich_text: [{ text: { content } }] });
function database() {
  const sql = new DatabaseSync(':memory:');
  for (const statement of [...INGESTION_SCHEMA, GATE_SCHEMA]) sql.exec(statement);
  const db = { prepare(query: string) { let values: any[] = []; const statement = {
    bind(...args: any[]) { values = args; return statement; },
    async first() { return sql.prepare(query).get(...values) ?? null; },
    async run() { return { meta: { changes: Number(sql.prepare(query).run(...values).changes) } }; },
  }; return statement; } } as unknown as D1Database;
  return { sql, db };
}

test('independent readiness: an expired owner cannot cancel an unsent intent; its successor cancels without sending Ready', async () => {
  const { sql, db } = database();
  try {
    await selectRendition(db, 'meeting', 'file');
    const prior = await claimIngestion(db, 'meeting', 'file');
    const properties = gateCreationProperties(hash);
    const pending = JSON.stringify({ key: 'unsent-ready', properties: { [GATE_FIELDS.ready]: rich(gateToken(hash, 1)) } });
    sql.prepare('INSERT INTO transcript_gate_intent VALUES (?, ?)').run('page', pending);
    let sends = 0;
    const transport = { async getPage() { return { properties }; }, async updatePage() { sends++; } };
    sql.prepare("UPDATE transcript_ingestion SET expires_at = '2000-01-01T00:00:00.000Z'").run();
    await assert.rejects(new Gate(db, transport, prior, 'page').reconcile(), /ownership lost/);
    assert.equal(sql.prepare('SELECT pending FROM transcript_gate_intent').get()!.pending, pending);
    const successor = await claimIngestion(db, 'meeting', 'file');
    await new Gate(db, transport, successor, 'page').reconcile();
    assert.equal(sql.prepare('SELECT pending FROM transcript_gate_intent').get()!.pending, null);
    assert.equal(sends, 0);
    assert.equal(propertyText(properties[GATE_FIELDS.ready]), '');
  } finally { sql.close(); }
});

test('independent readiness: reserved Ready blocks recovery until a matching receipt, without initiating a stale publish', async () => {
  const { sql, db } = database();
  try {
    await selectRendition(db, 'meeting', 'file');
    const lease = await claimIngestion(db, 'meeting', 'file');
    const properties = gateCreationProperties(hash);
    const target = { [GATE_FIELDS.ready]: rich(gateToken(hash, 1)), [GATE_FIELDS.index]: { url: 'https://www.notion.so/page#index' } };
    const pending = JSON.stringify({ key: 'reserved-ready', properties: target });
    sql.prepare('INSERT INTO transcript_gate_intent VALUES (?, ?)').run('page', pending);
    await lease.reserve('reserved-ready');
    let sends = 0;
    const transport = { async getPage() { return { properties }; }, async updatePage() { sends++; } };
    const gate = new Gate(db, transport, lease, 'page');
    await assert.rejects(gate.invalidate(), /Uncertain readiness/);
    await assert.rejects(gate.prepare(gateToken('b'.repeat(64), 2), true), /Uncertain readiness/);
    assert.equal(sends, 0);
    Object.assign(properties, target); // The one original provider request finally commits.
    await gate.reconcile();
    assert.equal(sql.prepare('SELECT pending FROM transcript_gate_intent').get()!.pending, null);
    assert.equal(sends, 0);
  } finally { sql.close(); }
});

test('independent readiness: disabling new gate admission preserves existing managed-page invalidation and body fencing', async () => {
  const { sql, db } = database(); const sim = new ProviderSimulator(); const originalFetch = globalThis.fetch;
  let correcting = false, correctionBodyWrites = 0; let page: any; let expectedToken = '';
  globalThis.fetch = (async (input: any, options: any) => {
    const request = new Request(input, options);
    if (correcting && request.method === 'PATCH' && new URL(request.url).pathname.startsWith('/v1/blocks/')) {
      correctionBodyWrites++;
      assert.equal(propertyText(page.properties[GATE_FIELDS.ready]), '', 'Managed readiness must clear before any body mutation with admission disabled');
      assert.equal(propertyText(page.properties[GATE_FIELDS.current]), expectedToken);
    }
    return sim.handle(request);
  }) as typeof fetch;
  try {
    await initSchema(db);
    const now = new Date().toISOString();
    const candidate: TranscriptCandidate = {
      dedupKey: 'flag-off-file', canonicalMeetingKey: 'flag-off-meeting', meetingId: '1', meetingUuid: 'flag-off-meeting',
      meetingTitle: 'Synthetic managed flag off', meetingDate: now.slice(0, 10), startTime: now,
      sourceUrl: 'https://synthetic.invalid/flag-off#occurrence=1', originalSourceUrl: null,
      transcriptDownloadUrl: 'https://synthetic.invalid/transcript/flag-off', transcriptFileId: 'flag-off-file',
      transcriptFileType: 'TRANSCRIPT', transcriptFileExtension: 'vtt', hostId: null,
    };
    const env = { DB: db, NOTION_API_KEY: 'synthetic-only', NOTION_DATABASE_ID: 'synthetic-only',
      NOTION_TRANSCRIPT_GATE_ENABLED: 'true', INDEXED_INGESTION_NOT_BEFORE: new Date(Date.now() - 60_000).toISOString() } as Env;
    await selectRendition(db, 'flag-off-key', candidate.dedupKey);
    const original = parseTranscript(syntheticVtt(2), 'vtt'), originalPlan = await planTranscript(original);
    const firstLease = await claimIngestion(db, 'flag-off-key', candidate.dedupKey);
    let first;
    try {
      await firstLease.begin(originalPlan.version);
      first = await syncTranscriptToNotion(env, candidate, original, originalPlan, firstLease);
      await firstLease.ready(originalPlan.version, first.pageId, first.indexBlockId!);
      await publishNotionReadiness(env, first, firstLease);
    } finally { await firstLease.release(); }
    page = sim.pages.get(first.pageId); assert.equal(propertyText(page.properties[GATE_FIELDS.ready]), gateToken(originalPlan.version, 1));
    assert.ok(sql.prepare('SELECT page_id FROM transcript_gate_intent WHERE page_id = ?').get(first.pageId));
    page.properties.Reviewed = { checkbox: true }; page.properties.Contacts = { relation: [{ id: 'human-contact' }] };

    env.NOTION_TRANSCRIPT_GATE_ENABLED = 'false';
    const changed = parseTranscript(syntheticVtt(3, 'corrected with flag off'), 'vtt'), changedPlan = await planTranscript(changed);
    expectedToken = gateToken(changedPlan.version, 2); correcting = true;
    const nextLease = await claimIngestion(db, 'flag-off-key', candidate.dedupKey);
    try {
      await nextLease.begin(changedPlan.version);
      const next = await syncTranscriptToNotion(env, candidate, changed, changedPlan, nextLease, { pageId: first.pageId, pageUrl: first.pageUrl });
      assert.ok(correctionBodyWrites > 0); assert.equal(next.gateVersion, expectedToken);
      await nextLease.ready(changedPlan.version, next.pageId, next.indexBlockId!);
      await publishNotionReadiness(env, next, nextLease);
      assert.equal(propertyText(page.properties[GATE_FIELDS.ready]), expectedToken);
      await nextLease.invalidateReady(); await invalidateNotionReadiness(env, first.pageId, nextLease);
      assert.equal(propertyText(page.properties[GATE_FIELDS.ready]), ''); assert.equal(page.properties[GATE_FIELDS.index].url, null);
      assert.equal(sql.prepare('SELECT ready_version FROM transcript_ingestion WHERE meeting_key = ?').get('flag-off-key')!.ready_version, null);
    } finally { await nextLease.release(); }
    assert.equal(page.properties.Reviewed.checkbox, true); assert.deepEqual(page.properties.Contacts.relation, [{ id: 'human-contact' }]);
    assert.equal(sim.deniedNetwork.length, 0); assert.equal(sim.pages.size, 1);
  } finally { globalThis.fetch = originalFetch; sql.close(); }
});

test('independent readiness: actual local Worker holds body behind uncertain Current and invalidates empty or ambiguous sources', { timeout: 90_000 }, async t => {
  const sim = new ProviderSimulator();
  const runtime = await startRuntime(sim, { NOTION_TRANSCRIPT_GATE_ENABLED: 'true' });
  try {
    sim.addRecording('independent-gate', new Date(Date.now() - 10 * 60_000).toISOString(), syntheticVtt(3));
    await runtime.cron();
    for (let wait = 0; wait < 100 && !sim.queued.length; wait++) await new Promise(resolve => setTimeout(resolve, 10));
    const message = sim.queued.find((item: any) => item.meetingUuid === 'independent-gate'); assert.ok(message);
    const key = JSON.stringify([message.canonicalMeetingKey, message.meetingDate]);
    await runtime.delivery(message);
    const initial = await runtime.state(key); const page = sim.pages.get(initial.page_id);
    assert.ok(propertyText(page.properties[GATE_FIELDS.ready]));
    page.properties.Categorized = { checkbox: false }; page.properties.Reviewed = { checkbox: true };

    await t.test('reserved absent Current blocks every body mutation across retries', async () => {
      const changedSource = syntheticVtt(4, 'changed');
      const nextPlan = await planTranscript(parseTranscript(changedSource, 'vtt'), PAGE_FORMAT);
      const pending = JSON.stringify({ key: 'independent-absent-current', properties: {
        [GATE_FIELDS.current]: rich(gateToken(nextPlan.version, 2)), [GATE_FIELDS.ready]: { rich_text: [] }, [GATE_FIELDS.index]: { url: null },
      } });
      await runtime.db.prepare('UPDATE transcript_gate_intent SET pending = ? WHERE page_id = ?').bind(pending, initial.page_id).run();
      await runtime.db.prepare('INSERT INTO transcript_write_journal VALUES (?, ?)').bind('independent-absent-current', new Date().toISOString()).run();
      const body = JSON.stringify([...sim.blocks.entries()]); const mutations = sim.mutations;
      sim.recordings.get('independent-gate').raw = changedSource;
      for (let retry = 0; retry < 2; retry++) {
        const outcome = await runtime.delivery(message); assert.equal(outcome.retryMessages.length, 1);
        assert.equal(sim.mutations, mutations); assert.equal(JSON.stringify([...sim.blocks.entries()]), body);
        assert.equal((await runtime.state(key)).ready_version, null);
      }
      // End this synthetic blocked scenario with a simulated provider receipt.
      Object.assign(page.properties, JSON.parse(pending).properties);
      await runtime.delivery(message); assert.ok(propertyText(page.properties[GATE_FIELDS.ready]));
      assert.equal((await runtime.db.prepare('SELECT pending FROM transcript_gate_intent WHERE page_id = ?').bind(initial.page_id).first()).pending, null);
    });
    await t.test('empty source clears both gates without changing human fields', async () => {
      sim.recordings.get('independent-gate').raw = '';
      const outcome = await runtime.delivery(message); assert.equal(outcome.retryMessages.length, 1);
      assert.equal((await runtime.state(key)).ready_version, null);
      assert.equal(propertyText(page.properties[GATE_FIELDS.ready]), ''); assert.equal(page.properties[GATE_FIELDS.index].url, null);
      assert.equal(page.properties.Reviewed.checkbox, true); assert.equal(page.properties.Categorized.checkbox, false);
      sim.recordings.get('independent-gate').raw = syntheticVtt(4, 'changed');
      await runtime.delivery(message); assert.ok(propertyText(page.properties[GATE_FIELDS.ready]));
    });
    await t.test('ambiguous current renditions clear Notion readiness during discovery', async () => {
      const meeting = sim.recordings.get('independent-gate').meeting;
      meeting.recording_files.push({ ...meeting.recording_files[0], id: 'equally-ranked-second' });
      await runtime.cron();
      assert.equal((await runtime.state(key)).ready_version, null);
      assert.equal(propertyText(page.properties[GATE_FIELDS.ready]), '');
      assert.equal(page.properties.Reviewed.checkbox, true);
    });
    assert.equal(sim.deniedNetwork.length, 0);
  } finally { await runtime.dispose(); }
});
