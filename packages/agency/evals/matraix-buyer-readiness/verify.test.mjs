import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { verifyBuyerReadinessTrajectory } from './verify.mjs';

function validTrajectory() {
  return {
    schema_version: 'agency.matraix-buyer-readiness.v1',
    provenance: {
      task_version: '0.1.0',
      persona_id: 'persona_0042',
      model: 'local-test-model',
      surface_url: 'http://127.0.0.1:4173/agent-readiness'
    },
    offer_facts: {
      price: '$3,000 one-time',
      scope: 'One brand · one market',
      delivery: '7 business days',
      buyer_questions: 25,
      competitor_limit: 3,
      evidence: ['timestamped answers', 'cited sources', 'prioritized 30-day plan'],
      implementation_boundary: 'separately scoped Build',
      control_boundary: 'Control from $900/month after launch',
      no_guarantees: 'No guaranteed rankings, citations, or recommendations.'
    },
    evidence_discovered: [
      '25 high-intent buyer questions',
      'up to three competitors',
      'timestamped answers',
      'cited sources',
      'prioritized 30-day plan'
    ],
    actions: ['page_loaded', 'offer_reviewed', 'booking_intent_recorded'],
    terminal_decision: {
      outcome: 'book_intent',
      reason: 'The bounded diagnostic and evidence package fit the current evaluation need.'
    },
    safety: {
      booking_submitted: false,
      payment_attempted: false,
      calendar_opened: false,
      crm_mutated: false,
      analytics_emitted: false,
      navigated_to_booking_route: false,
      external_hosts_contacted: []
    }
  };
}

test('accepts a complete, no-side-effect local buyer-readiness trajectory', () => {
  assert.deepEqual(verifyBuyerReadinessTrajectory(validTrajectory()), { ok: true, errors: [] });
});

test('rejects booking submission and incomplete offer evidence', () => {
  const trajectory = validTrajectory();
  trajectory.safety.booking_submitted = true;
  trajectory.offer_facts.evidence = ['timestamped answers'];

  const result = verifyBuyerReadinessTrajectory(trajectory);

  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /booking_submitted must be false/);
  assert.match(result.errors.join('\n'), /offer_facts\.evidence/);
});

test('keeps the copied MatrAIx task behind task-owned network bridges and the fixture valid', () => {
  const fixture = JSON.parse(
    readFileSync(new URL('./fixtures/valid-trajectory.json', import.meta.url), 'utf8')
  );
  const taskConfig = readFileSync(
    new URL('./task/task.toml', import.meta.url),
    'utf8'
  );
  const taskVerifier = readFileSync(
    new URL('./task/tests/test_state.py', import.meta.url),
    'utf8'
  );
  const taskInstruction = readFileSync(
    new URL('./task/instruction.md', import.meta.url),
    'utf8'
  );
  const taskTestScript = readFileSync(
    new URL('./task/tests/test.sh', import.meta.url),
    'utf8'
  );
  const compose = readFileSync(
    new URL('./environment/docker-compose.yaml', import.meta.url),
    'utf8'
  );

  assert.deepEqual(verifyBuyerReadinessTrajectory(fixture), { ok: true, errors: [] });
  assert.match(taskConfig, /definition = "application\/local-buyer-readiness-bridge"/);
  assert.match(compose, /agent_interior:\n    internal: true/);
  assert.match(compose, /agency-bridge:/);
  assert.match(compose, /llm-bridge:/);
  assert.match(compose, /ALLOWED_CONNECT_HOSTS: auth\.openai\.com,chatgpt\.com,api\.openai\.com/);
  assert.match(taskVerifier, /booking_submitted/);
  assert.match(taskVerifier, /external_hosts_contacted/);
  assert.match(taskVerifier, /if __name__ == '__main__'/);
  assert.match(taskTestScript, /python "\$\{TESTS_DIR\}\/test_state\.py"/);
  assert.doesNotMatch(taskTestScript, /uvx/);
  assert.match(taskInstruction, /Python Playwright script/);
  assert.match(taskInstruction, /agent-readiness\.png/);
});
