import assert from 'node:assert/strict';
import test from 'node:test';
import { ProviderSimulator, startRuntime, syntheticVtt, retrieveVerified } from './runtime-support.mjs';
const value = p => (p?.rich_text ?? []).map(x => x.plain_text ?? x.text?.content ?? '').join('');
test('actual local Worker/D1 readiness gate with intercepted providers only', { timeout: 90_000 }, async t => {
  const sim = new ProviderSimulator();
  const runtime = await startRuntime(sim, { NOTION_TRANSCRIPT_GATE_ENABLED: 'true' });
  try {
    sim.addRecording('gated', new Date(Date.now() - 10 * 60_000).toISOString(), syntheticVtt(478));
    await runtime.cron();
    for (let i = 0; i < 100 && !sim.queued.length; i++) await new Promise(resolve => setTimeout(resolve, 10));
    const message = sim.queued.find(x => x.meetingUuid === 'gated'); assert.ok(message);
    const key = JSON.stringify([message.canonicalMeetingKey, message.meetingDate]);
    await t.test('creation is excluded from page-added categorization; ready is published only after verification', async () => {
      let creations = 0, publications = 0, bodyWrites = 0;
      sim.onPageCreate = page => {
        creations++;
        assert.match(value(page.properties['Transcript Version']), /^[a-f0-9]{64}:1$/);
        assert.equal(value(page.properties['Transcript Ready Version']), '');
      };
      sim.onAppend = () => {
        bodyWrites++;
        assert.equal(value([...sim.pages.values()][0].properties['Transcript Ready Version']), '');
      };
      sim.onPagePatch = async (page, properties) => {
        const ready = value(properties['Transcript Ready Version']);
        if (!ready) return;
        publications++;
        const state = await runtime.state(key);
        assert.equal(state.ready_version, state.version);
        assert.equal(ready, `${state.version}:1`);
        await retrieveVerified(runtime, key);
      };
      const result = await runtime.delivery(message); assert.equal(result.retryMessages.length, 0);
      assert.equal(creations, 1); assert.equal(publications, 1); assert.ok(bodyWrites > 1);
      sim.onPageCreate = null; sim.onAppend = null; sim.onPagePatch = null;
      const state = await runtime.state(key); const page = sim.pages.get(state.page_id); assert.ok(page);
      assert.equal(value(page.properties['Transcript Version']), `${state.version}:1`);
      assert.equal(value(page.properties['Transcript Ready Version']), `${state.version}:1`);
      assert.ok(page.properties['Transcript Retrieval Index'].url.endsWith(state.index_block_id.replaceAll('-', '')));
      await retrieveVerified(runtime, key);
      const creates = sim.requests.filter(([method, url]) => method === 'POST' && new URL(url).pathname === '/v1/pages');
      assert.equal(creates.length, 1);
    });
    const page = sim.pages.get((await runtime.state(key)).page_id);
    page.properties.Reviewed = { checkbox: true }; page.properties.Categorized = { checkbox: true };
    page.properties.Contacts = { relation: [{ id: 'operator-owned-contact' }] };
    await t.test('unchanged verification emits zero mutations and preserves human workflow state', async () => {
      const before = sim.mutations; await runtime.delivery(message); assert.equal(sim.mutations, before);
      assert.equal(page.properties.Reviewed.checkbox, true); assert.equal(page.properties.Categorized.checkbox, true);
      assert.deepEqual(page.properties.Contacts.relation, [{ id: 'operator-owned-contact' }]);
    });
    await t.test('source correction increments generation and leaves categorization stale without resetting flags', async () => {
      const old = value(page.properties['Transcript Version']);
      page.properties['Categorized Transcript Version'] = { rich_text: [{ text: { content: old } }] };
      sim.recordings.get('gated').raw = syntheticVtt(18, 'corrected'); await runtime.delivery(message);
      const state = await runtime.state(key); const current = value(page.properties['Transcript Version']);
      assert.equal(current, `${state.version}:2`); assert.equal(value(page.properties['Transcript Ready Version']), current);
      assert.equal(value(page.properties['Categorized Transcript Version']), old); assert.equal(page.properties.Categorized.checkbox, true);
      await retrieveVerified(runtime, key);
    });
    await t.test('known source read failure clears Notion and D1 readiness', async () => {
      sim.onSourceRead = () => { throw Error('synthetic download failure'); };
      await runtime.delivery(message); sim.onSourceRead = null;
      assert.equal((await runtime.state(key)).ready_version, null);
      assert.equal(value(page.properties['Transcript Ready Version']), '');
      await runtime.delivery(message); assert.ok(value(page.properties['Transcript Ready Version']));
    });
    await t.test('source changes on verification read withhold both ready signals', async () => {
      const at = sim.sourceReads + 2;
      sim.onSourceRead = (_, count) => { if (count === at) sim.recordings.get('gated').raw = syntheticVtt(20, 'new source'); };
      await runtime.delivery(message); sim.onSourceRead = null;
      assert.equal((await runtime.state(key)).ready_version, null); assert.equal(value(page.properties['Transcript Ready Version']), '');
      await runtime.delivery(message); await retrieveVerified(runtime, key);
    });
    await t.test('disappeared source clears managed readiness without touching human properties', async () => {
      sim.recordings.clear(); await runtime.cron();
      assert.equal(value(page.properties['Transcript Ready Version']), ''); assert.equal((await runtime.state(key)).ready_version, null);
      assert.equal(page.properties.Reviewed.checkbox, true); assert.deepEqual(page.properties.Contacts.relation, [{ id: 'operator-owned-contact' }]);
    });
    assert.equal(sim.deniedNetwork.length, 0);
  } finally { await runtime.dispose(); }
});
