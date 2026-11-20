import assert from 'node:assert/strict';
import test from 'node:test';
import { parseTranscript } from '../src/zoom.ts';
import { ProviderSimulator, startRuntime, syntheticVtt, retrieveVerified, blockText, runtimeVersions } from './runtime-support.mjs';

async function waitFor(predicate) {
  const end = Date.now() + 5000;
  while (Date.now() < end) { if (predicate()) return; await new Promise(resolve => setTimeout(resolve, 10)); }
  assert.fail('Timed out waiting for local queue capture');
}
const freshStart = () => new Date(Date.now() - 10 * 60_000).toISOString();
const keyOf = message => JSON.stringify([message.canonicalMeetingKey, message.meetingDate]);
async function discover(runtime, id, raw = syntheticVtt(30), alternate = false) {
  runtime.simulator.addRecording(id, freshStart(), raw, alternate);
  const count = runtime.simulator.queued.length;
  await runtime.cron(); await waitFor(() => runtime.simulator.queued.slice(count).some(message => message.meetingUuid === id));
  return runtime.simulator.queued.slice(count).find(message => message.meetingUuid === id);
}

test('local workerd + D1 validation, deterministic provider simulator, no real providers', { timeout: 90_000 }, async t => {
  const sim = new ProviderSimulator(); const runtime = await startRuntime(sim);
  t.diagnostic(`Wrangler ${runtimeVersions.wrangler}; Miniflare ${runtimeVersions.miniflare}; Worker compatibility 2026-03-10; all outbound intercepted`);
  try {
    await t.test('health is non-mutating on the actual Worker runtime', async () => {
      const mutations = sim.mutations; const requests = sim.requests.length;
      const health = await runtime.worker.fetch('https://worker.test/health');
      assert.equal(health.status, 200); assert.equal((await health.json()).indexed_ingestion_not_before, runtime.cutoff);
      assert.equal(sim.mutations, mutations); assert.equal(sim.requests.length, requests);
    });
    const raw = syntheticVtt(478);
    const message = await discover(runtime, 'long-primary', raw, true); const key = keyOf(message);
    await t.test('cron selects primary VTT, queue writes bounded parts/index, exact original and canonical reconstruct', async () => {
      assert.equal(message.transcriptFileType, 'TRANSCRIPT'); assert.ok(!message.transcriptDownloadUrl.endsWith('/cc'));
      const result = await runtime.delivery(message); assert.equal(result.retryMessages.length, 0);
      const retrieved = await retrieveVerified(runtime, key);
      assert.equal(retrieved.original, raw); assert.equal(retrieved.canonical, parseTranscript(raw, 'vtt').plainText);
      assert.equal(retrieved.blocks, 478); assert.ok(retrieved.parts > 1);
      assert.ok(!retrieved.canonical.includes('WRONG ALTERNATE'));
    });
    await t.test('duplicate verification preserves operator Status and causes no provider mutations', async () => {
      const ready = await runtime.state(key);
      const page = sim.pages.get(ready.page_id);
      page.properties.Status = { select: { name: 'Operator reviewed' } };
      const preservedProperties = structuredClone(page.properties);
      const appends = sim.appends; const pages = sim.pages.size; const mutations = sim.mutations;
      const version = ready.ready_version;
      await runtime.delivery(message); await runtime.delivery(message);
      assert.equal(sim.appends, appends); assert.equal(sim.pages.size, pages); assert.equal((await runtime.state(key)).ready_version, version);
      assert.equal(sim.mutations, mutations, 'Unchanged verification must not emit property or body mutations');
      assert.deepEqual(page.properties, preservedProperties, 'Operator metadata must survive repeated verification');
    });
    await t.test('partial write with lost response resumes receipts, keeps original version, publishes only verified update', async () => {
      const old = await retrieveVerified(runtime, key); sim.recordings.get('long-primary').raw = syntheticVtt(478, ' correction');
      const preservedProperties = structuredClone(sim.pages.get((await runtime.state(key)).page_id).properties);
      const propertyPatchCount = () => sim.requests.filter(([method, url]) => method === 'PATCH' && new URL(url).pathname.startsWith('/v1/pages/')).length;
      const beforePropertyPatches = propertyPatchCount();
      sim.failAppendAt = sim.appends + 2;
      const first = await runtime.delivery(message);
      assert.equal(first.retryMessages.length, 1); assert.equal((await runtime.state(key)).ready_version, null);
      sim.failAppendAt = Infinity; const retry = await runtime.delivery(message, 2); assert.equal(retry.retryMessages.length, 0);
      const next = await retrieveVerified(runtime, key); assert.notEqual(next.version, old.version);
      assert.equal(next.original, sim.recordings.get('long-primary').raw);
      const parent = sim.blocks.get((await runtime.state(key)).page_id);
      const markers = sim.blocks.get(parent.find(b=>blockText(b)==='Source archive').id).map(blockText); assert.equal(new Set(markers).size, markers.length);
      assert.ok(markers.some(marker => marker.includes(old.version))); assert.equal([...sim.pages.values()].filter(p=>p.parent?.database_id).length, 1);
      assert.equal(propertyPatchCount(), beforePropertyPatches, 'Source corrections must not PATCH existing page properties');
      assert.deepEqual(sim.pages.get((await runtime.state(key)).page_id).properties, preservedProperties);
    });
    await t.test('same-version Notion tampering and downstream pre/post version races reject consumption', async () => {
      const before = await runtime.state(key); const part = sim.blocks.get(sim.blocks.get(before.page_id).find(b=>blockText(b)==='Source archive').id).find(block => blockText(block).includes(`| ${before.version} | part:1 |`));
      const child = sim.blocks.get(part.id)[0]; const saved = structuredClone(child);
      child.paragraph.rich_text[0].plain_text += ' tamper';
      await assert.rejects(retrieveVerified(runtime, key), /Reconstructed content must match version|Visible transcript/);
      Object.assign(child, saved);
      await assert.rejects(retrieveVerified(runtime, key, { betweenReads: async () => {
        await runtime.db.prepare("UPDATE transcript_ingestion SET ready_version = NULL WHERE meeting_key = ?").bind(key).run();
      } }), /Snapshot changed|Readiness cleared/);
      await runtime.delivery(message);
      await assert.rejects(retrieveVerified(runtime, key, { betweenReads: async () => {
        await runtime.db.prepare("UPDATE transcript_ingestion SET version = 'changed', ready_version = 'changed' WHERE meeting_key = ?").bind(key).run();
      } }), /Snapshot changed/);
      await runtime.delivery(message); await retrieveVerified(runtime, key);
    });
    await t.test('lease expiry during a write withholds readiness, stale owner cannot restore it, retry reconciles', async () => {
      sim.recordings.get('long-primary').raw = syntheticVtt(478, ' later update');
      let expired = false;
      sim.onAppend = async () => {
        if (!expired) { expired = true; await runtime.db.prepare("UPDATE transcript_ingestion SET expires_at = '2000-01-01T00:00:00.000Z' WHERE meeting_key = ?").bind(key).run(); }
      };
      const result = await runtime.delivery(message);
      assert.equal(result.retryMessages.length, 1); assert.equal((await runtime.state(key)).ready_version, null);
      sim.onAppend = null; await runtime.delivery(message, 2); await retrieveVerified(runtime, key);
    });
    await t.test('simultaneous duplicate deliveries serialize through real D1 without duplicate artifacts', async () => {
      const count = sim.appends;
      const results = await Promise.all([runtime.delivery(message), runtime.delivery(message)]);
      assert.ok(results.some(result => result.retryMessages.length === 0));
      assert.equal(sim.appends, count); await retrieveVerified(runtime, key);
    });
    await t.test('source changes during ingestion clear readiness and retry verifies the corrected source', async () => {
      const changing = await discover(runtime, 'source-changing'); const changingKey = keyOf(changing);
      const beforeReads = sim.sourceReads;
      sim.onSourceRead = async (_url, count) => {
        if (count === beforeReads + 2) sim.recordings.get('source-changing').raw = syntheticVtt(30, ' changed during write');
      };
      const result = await runtime.delivery(changing); assert.equal(result.retryMessages.length, 1);
      assert.equal((await runtime.state(changingKey)).ready_version, null);
      sim.onSourceRead = null; await runtime.delivery(changing, 2);
      assert.equal((await retrieveVerified(runtime, changingKey)).original, sim.recordings.get('source-changing').raw);
    });
    await t.test('missing or duplicate persisted child blocks reject both downstream retrieval and repeated ingestion', async () => {
      await runtime.delivery(message); const ready = await runtime.state(key);
      const part = sim.blocks.get(sim.blocks.get(ready.page_id).find(b=>blockText(b)==='Source archive').id).find(block => blockText(block).includes(`| ${ready.version} | part:1 |`));
      const children = sim.blocks.get(part.id); const saved = structuredClone(children);
      children.pop();
      await assert.rejects(retrieveVerified(runtime, key), /Reconstructed content|Artifact children|Visible transcript/);
      let result = await runtime.delivery(message); assert.equal(result.retryMessages.length, 1);
      assert.equal((await runtime.state(key)).ready_version, null);
      sim.blocks.set(part.id, structuredClone(saved)); await runtime.delivery(message);
      sim.blocks.get(part.id).push(structuredClone(saved[0]));
      await assert.rejects(retrieveVerified(runtime, key), /Reconstructed content|Part is bounded|Visible transcript/);
      result = await runtime.delivery(message); assert.equal(result.retryMessages.length, 1);
      assert.equal((await runtime.state(key)).ready_version, null);
      sim.blocks.set(part.id, saved); await runtime.delivery(message);
    });
    await t.test('unknown absent append remains single-send and never becomes ready', async () => {
      const blocked = await discover(runtime, 'uncertain-absent'); const blockedKey = keyOf(blocked);
      sim.failAppendAt = sim.appends + 1; sim.failBeforeCommit = true;
      const first = await runtime.delivery(blocked); assert.equal(first.retryMessages.length, 1);
      const count = sim.appends; sim.failAppendAt = Infinity;
      const retry = await runtime.delivery(blocked, 2); assert.equal(retry.retryMessages.length, 1);
      assert.equal(sim.appends, count); assert.equal((await runtime.state(blockedKey)).ready_version, null);
      sim.failBeforeCommit = false;
    });
    await t.test('2,000-cue update verifies Worker and proposed consumer pagination across more than 100 persisted artifacts', async () => {
      const paginated = await discover(runtime, 'paginated', syntheticVtt(2000)); const paginatedKey = keyOf(paginated);
      await runtime.delivery(paginated); await retrieveVerified(runtime, paginatedKey);
      sim.recordings.get('paginated').raw = syntheticVtt(2000, ' revised');
      await runtime.delivery(paginated);
      const state = await runtime.state(paginatedKey);
      assert.ok(sim.blocks.get(state.page_id).length > 100);
      const offset = sim.requests.length; const received = await retrieveVerified(runtime, paginatedKey);
      assert.equal(received.blocks, 2000); assert.equal(received.original, sim.recordings.get('paginated').raw);
      assert.ok(sim.requests.slice(offset).some(([, url]) => url.includes('start_cursor=')), 'Consumer must traverse persisted pagination');
    });
    await t.test('legacy cron/replay/stale queues do not mutate pre-cutoff record or protected Notion page', async () => {
      const legacy = { ...message, dedupKey: 'synthetic-legacy', canonicalMeetingKey: 'synthetic-legacy', meetingTitle: 'OD x DM synthetic role only',
        startTime: new Date(Date.parse(runtime.cutoff) - 1000).toISOString() };
      await runtime.db.prepare(`INSERT INTO transcript_sync_ledger
        (dedup_key, canonical_meeting_key, meeting_title, meeting_date, recording_start_time, transcript_download_url, first_seen_at,last_seen_at,updated_at,status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`).bind(legacy.dedupKey, legacy.canonicalMeetingKey, legacy.meetingTitle, legacy.meetingDate,
          legacy.startTime, legacy.transcriptDownloadUrl, legacy.startTime, legacy.startTime, legacy.startTime).run();
      const before = await runtime.db.prepare('SELECT * FROM transcript_sync_ledger WHERE dedup_key = ?').bind(legacy.dedupKey).first();
      const appends = sim.appends; const mutations = sim.mutations;
      const response = await runtime.worker.fetch(`https://worker.test/replay/${legacy.dedupKey}`, { method: 'POST', headers: { Authorization: 'Bearer synthetic-key' } });
      assert.equal(response.status, 409); await runtime.delivery({ ...legacy, rolloutCutoff: undefined, runId: null });
      await runtime.delivery({ ...legacy, startTime: freshStart(), runId: null });
      assert.equal(sim.appends, appends); assert.equal(sim.mutations, mutations);
      assert.deepEqual(await runtime.db.prepare('SELECT * FROM transcript_sync_ledger WHERE dedup_key = ?').bind(legacy.dedupKey).first(), before);
      sim.addRecording('pre-cutoff-unseen', legacy.startTime, syntheticVtt(1));
      await runtime.cron();
      assert.equal(await runtime.db.prepare("SELECT COUNT(*) AS n FROM transcript_sync_ledger WHERE zoom_meeting_uuid = 'pre-cutoff-unseen'").first('n'), 0);
      const pageBlocked = await discover(runtime, 'old-page');
      const fakeId = sim.id(); sim.pages.set(fakeId, { id: fakeId, url: `https://www.notion.so/${fakeId}`, created_time: legacy.startTime,
        properties: { Item: { title: [{ plain_text: pageBlocked.meetingTitle }] }, Date: { date: { start: pageBlocked.meetingDate } },
          'Source URL': { url: pageBlocked.sourceUrl } } }); sim.blocks.set(fakeId, []);
      const oldPage = structuredClone(sim.pages.get(fakeId)); const mutationCount = sim.mutations;
      const result = await runtime.delivery(pageBlocked); assert.equal(result.retryMessages.length, 1);
      assert.equal(sim.mutations, mutationCount); assert.deepEqual(sim.pages.get(fakeId), oldPage); assert.deepEqual(sim.blocks.get(fakeId), []);
    });
    assert.deepEqual(sim.deniedNetwork, []);
  } finally { await runtime.dispose(); }
});
