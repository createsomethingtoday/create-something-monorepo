import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareWikiRoute, resolveWikiRoute, routeWiki } from '../scripts/agent-wiki-route.mjs';

test('routing retrieves bounded source passages and rejects invented Jev choices', () => {
  const packet = prepareWikiRoute('Which operations require approval before production mutation?');
  assert.ok(packet.request.state.candidates.length > 1);
  assert.ok(packet.request.state.candidates.length <= 6);
  assert.ok(Buffer.byteLength(JSON.stringify(packet.request)) <= 20000);
  assert.ok(packet.request.questions.first.criteria.no_match);
  for (const candidate of packet.request.state.candidates) {
    assert.ok(candidate.path.startsWith('packages/database-layer/docs/agent-wiki/'));
    assert.ok(candidate.line >= 1);
    assert.ok(candidate.contentHash);
  }
  const result = resolveWikiRoute(packet, { model: 'jev-1.13.0', answers: { first: { type: 'choice', choice: '../../evil' } } });
  assert.equal(result.status, 'fallback');
  assert.equal(result.authority, 'advisory_only');
  assert.deepEqual(result.candidates, packet.request.state.candidates);
});

function answer(packet, choice) {
  return { model: packet.request.model, answers: { first: { type: 'choice', choice, confidence: 1, probabilities: Object.fromEntries(Object.keys(packet.request.questions.first.criteria).map((id) => [id, id === choice ? 1 : 0])) } } };
}

test('routing suggests only an observed passage and preserves every fallback candidate', () => {
  const packet = prepareWikiRoute('Which operations require approval?');
  const chosen = packet.request.state.candidates[0];
  const result = resolveWikiRoute(packet, answer(packet, chosen.id));
  assert.equal(result.status, 'suggested');
  assert.deepEqual(result.selected, chosen);
  assert.equal(result.requiresSourceInspection, true);
  assert.equal(result.usefulness, 'not_evaluated');
  assert.equal(resolveWikiRoute(packet, answer(packet, 'no_match')).reason, 'no_match');
  assert.equal(resolveWikiRoute(packet, { isError: true }).reason, 'service_error');
  assert.equal(resolveWikiRoute({ ...packet, requestHash: 'changed' }, answer(packet, chosen.id)).reason, 'request_or_sources_changed');
  const invalid = answer(packet, chosen.id);
  invalid.answers.first.probabilities[chosen.id] = 0.2;
  assert.equal(resolveWikiRoute(packet, invalid).reason, 'invalid_response');
});

test('routing bounds UTF-8 input and returns no candidates for an absent term', () => {
  assert.throws(() => prepareWikiRoute('😀'.repeat(501)), /2000 UTF-8 bytes/);
  const packet = prepareWikiRoute('zzzzabsentfromwikizzzz');
  assert.equal(packet.needsJev, false);
  assert.equal(packet.request.state.candidates.length, 0);
});


test('configured evaluate adapter is bounded and failures retain source inspection', async () => {
  let calls = 0;
  const result = await routeWiki('Which operations require approval?', async (request) => {
    calls++;
    return answer({ request }, request.state.candidates[0].id);
  });
  assert.equal(calls, 1);
  assert.equal(result.status, 'suggested');
  assert.ok(Number.isFinite(result.elapsedMs));
  const timeout = await routeWiki('Which operations require approval?', () => new Promise(() => {}), { timeoutMs: 5 });
  assert.equal(timeout.status, 'fallback');
  assert.equal(timeout.reason, 'service_failure_or_timeout');
  assert.ok(timeout.candidates.length > 0);
  assert.equal((await routeWiki('zzzzabsentfromwikizzzz', () => { throw new Error('must not run'); })).reason, 'no_candidates');
});

// A real navigation question must expose the complete related operations, with
// the column meanings intact, rather than three unrelated table fragments.
test('approval routing keeps every required operation with its table header', () => {
  const packet = prepareWikiRoute('Which write operations require approval?');
  const passage = packet.request.state.candidates.find((candidate) =>
    candidate.excerpt.includes('database_layer_record_operator_approval') &&
    candidate.excerpt.includes('database_layer_propose_operating_slice_promotion') &&
    candidate.excerpt.includes('database_layer_write_receipt'));
  assert.ok(passage, 'one candidate must contain all three approval-required operations');
  assert.match(passage.excerpt, /^\| Method \| API path \| MCP tool \| Agent command \| Approval required \|\n/);
  assert.equal(passage.tableGroup.value, 'yes');
  assert.ok(passage.sourceLines.length > 2);
});
