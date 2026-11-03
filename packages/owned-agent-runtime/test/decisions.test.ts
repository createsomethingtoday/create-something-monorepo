import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createDecisionService, decisionRequestHash, MemoryDecisionRepository,
  type DecisionRequest, type DecisionSelector
} from '../src/decisions.js';

const request = (): DecisionRequest => ({
  id: 'decision-1', scope: 'workspace-a', policyVersion: 'policy-1', stateVersion: 'state-1',
  question: 'Which evidence should the host inspect first?', mode: 'fresh', fallbackId: 'inspect',
  candidates: [{ id: 'inspect', description: 'Inspect existing evidence' },
    { id: 'verify', description: 'Run the existing verifier' }]
});
const selector = (select: DecisionSelector['select']): DecisionSelector => ({
  provider: 'fixture', model: 'fixture', version: '1', select
});

test('records a validated advisory decision and immutable observed outcome', async () => {
  const repository = new MemoryDecisionRepository();
  const service = createDecisionService({ repository, selector: selector(async () => ({ choice: 'verify' })) });
  const receipt = await service.decide(request(), async () => request());
  assert.equal(receipt.selectedId, 'verify');
  assert.equal(receipt.authority, 'advisory_only');
  assert.equal(receipt.reason, 'selected');
  const outcome = { decisionId: 'decision-1', scope: 'workspace-a', requestHash: receipt.requestHash,
    status: 'verified_success' as const, evidenceRef: 'test:verifier-1', durationMs: 20, retries: 0 };
  await service.observe(outcome);
  await service.observe(outcome);
  await assert.rejects(service.observe({ ...outcome, status: 'verified_failure' }), /conflict/);
  await assert.rejects(service.observe({ ...outcome, scope: 'workspace-b' }), /same scope/);
  await assert.rejects(service.observe({ ...outcome, requestHash: '0'.repeat(64) }), /same scope/);
  receipt.request.candidates[0].description = 'mutated';
  assert.equal((await repository.getDecision('workspace-a', 'decision-1'))?.request.candidates[0].description,
    'Inspect existing evidence');
  assert.equal(await repository.getDecision('workspace-b', 'decision-1'), undefined);
  await assert.rejects(service.decide(request(), async () => request()), /already exists/);
});

for (const [name, response, reason] of [
  ['unknown choice', { choice: 'grant_permissions' }, 'invalid_response'],
  ['extra instructions', { choice: 'verify', tools: ['shell'] }, 'invalid_response'],
  ['malformed', 'verify', 'invalid_response'],
  ['abstention', { choice: null }, 'abstained']
] as const) {
  test(`${name} uses the explicit fallback without admitting tools`, async () => {
    const service = createDecisionService({ repository: new MemoryDecisionRepository(),
      selector: selector(async () => response) });
    const receipt = await service.decide(request(), async () => request());
    assert.equal(receipt.selectedId, 'inspect');
    assert.equal(receipt.reason, reason);
    assert.equal(receipt.fallback, true);
    assert.equal('tools' in receipt, false);
  });
}

test('selector absence and failure use distinct recorded fallback reasons', async () => {
  for (const configured of [false, true]) {
    const service = createDecisionService({ repository: new MemoryDecisionRepository(),
      selector: configured ? selector(async () => { throw new Error('secret provider details'); }) : undefined });
    const receipt = await service.decide(request(), async () => request());
    assert.equal(receipt.selectedId, 'inspect');
    assert.equal(receipt.reason, configured ? 'selector_failed' : 'unavailable');
    assert.equal(JSON.stringify(receipt).includes('secret provider details'), false);
  }
});

test('deadline cancels a hanging selector and returns no stale fallback', async () => {
  let signal: AbortSignal | undefined;
  const service = createDecisionService({ repository: new MemoryDecisionRepository(), timeoutMs: 5,
    selector: selector(async (_request, suppliedSignal) => {
      signal = suppliedSignal;
      return new Promise(() => {});
    }) });
  const receipt = await service.decide(request(), async () => request());
  assert.equal(receipt.reason, 'timeout');
  assert.equal(receipt.selectedId, null);
  assert.equal(signal?.aborted, true);
});

test('changed state, candidate, scope or policy invalidates selection and fallback', async () => {
  for (const change of [
    { stateVersion: 'state-2' }, { scope: 'workspace-b' }, { policyVersion: 'policy-2' },
    { candidates: [{ id: 'inspect', description: 'Changed tool schema' }] }
  ]) {
    const service = createDecisionService({ repository: new MemoryDecisionRepository(),
      selector: selector(async () => ({ choice: 'verify' })) });
    const receipt = await service.decide(request(), async () => ({ ...request(), ...change }));
    assert.equal(receipt.selectedId, null);
    assert.equal(receipt.reason, 'state_changed');
    assert.equal(receipt.fallback, false);
  }
});

test('pinned and resumed work bypass selection and preserve the fixed choice', async () => {
  for (const mode of ['pinned', 'resumed'] as const) {
    const value = { ...request(), mode, fixedChoiceId: 'verify' };
    const service = createDecisionService({ repository: new MemoryDecisionRepository(),
      selector: selector(async () => { assert.fail('must bypass selector'); }) });
    const receipt = await service.decide(value, async () => value);
    assert.equal(receipt.selectedId, 'verify');
    assert.equal(receipt.reason, mode);
    assert.equal(receipt.selector, null);
  }
});

test('failed receipt persistence returns no decision and does not dispatch work', async () => {
  const repository = new MemoryDecisionRepository();
  repository.putDecision = async () => { throw new Error('storage unavailable'); };
  const service = createDecisionService({ repository });
  await assert.rejects(service.decide(request(), async () => request()), /storage unavailable/);
});

test('rejects invalid menus, oversized evidence and invalid deadlines before selection', async () => {
  const value = request();
  await assert.rejects(decisionRequestHash({ ...value, candidates: [value.candidates[0], value.candidates[0]] }));
  await assert.rejects(decisionRequestHash({ ...value, mode: 'resumed' }));
  await assert.rejects(decisionRequestHash({ ...value, candidates: Array.from({ length: 16 }, (_, id) =>
    ({ id: String(id), description: 'x'.repeat(2000) })), fallbackId: '0' }), /20 KB/);
  assert.throws(() => createDecisionService({ repository: new MemoryDecisionRepository(), timeoutMs: Infinity }));
});
