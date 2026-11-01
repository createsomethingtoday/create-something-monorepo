import assert from 'node:assert/strict';
import test from 'node:test';
import { createGuideDecisionObserver } from '../src/guide-decision-observer.js';
import { MemoryDecisionRepository } from '../src/decisions.js';
import { getAgentDefinition } from '../src/definitions.js';

test('shadow selection binds public capabilities and terminal run without storing query or asserting quality', async () => {
  const repository = new MemoryDecisionRepository();
  const query = 'How do I compare host MCP setup? private-placeholder-do-not-persist';
  const observer = createGuideDecisionObserver({ repository, selectorForQuery(evidence) {
    assert.equal(evidence, query);
    return { provider: 'fixture', model: 'fixture', version: '1', async select(request) {
      assert.equal(request.question.includes(query), false);
      assert.deepEqual(request.candidates.map(item => item.id),
        ['ordinary', 'create-something', 'three-tier-framework', 'playbook', 'no_tools']);
      return { choice: 'playbook' };
    } };
  } });
  await observer.observe({ definition: getAgentDefinition('create-something-guide-agent')!,
    query, conversationId: 'conversation', runId: 'run' }, Promise.resolve({ status: 'completed', durationMs: 80 }));
  const decision = await repository.getDecision('public-guide:create-something-guide-agent', 'run');
  const outcome = await repository.getOutcome('public-guide:create-something-guide-agent', 'run');
  assert.equal(decision?.selectedId, 'playbook');
  assert.equal(outcome?.status, 'unknown');
  assert.equal(outcome?.evidenceRef, 'agent-run:run:completed');
  assert.equal(JSON.stringify({ decision, outcome }).includes('private-placeholder'), false);
});

test('provider failure records fallback and unrecorded terminal cannot manufacture an outcome', async () => {
  const repository = new MemoryDecisionRepository();
  const observer = createGuideDecisionObserver({ repository, selectorForQuery() {
    return { provider: 'fixture', model: 'fixture', version: '1', async select() { throw new Error('provider unavailable'); } };
  } });
  await observer.observe({ definition: getAgentDefinition('create-something-guide-agent')!,
    query: 'Explain public framework', conversationId: 'conversation', runId: 'run' },
    Promise.resolve({ status: 'unrecorded', durationMs: 80 }));
  assert.equal((await repository.getDecision('public-guide:create-something-guide-agent', 'run'))?.fallback, true);
  assert.equal(await repository.getOutcome('public-guide:create-something-guide-agent', 'run'), undefined);
});
