import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildAgentConsole,
  leaseAgentDecisions,
  normalizeAgentProgress,
  prepareAgentDecision,
  transitionAgentDecision
} from '../src/agent-console.js';
import type {
  AgentDecisionInput,
  AgentProgressInput,
  StoredAgentDecision,
  StoredAgentProgress
} from '../src/agent-console.js';

const NOW = Date.parse('2026-08-07T18:00:00.000Z');

function progressInput(overrides: Partial<AgentProgressInput> = {}): AgentProgressInput {
  return {
    agent_id: 'claude:session-123',
    provider: 'claude',
    label: 'Auth investigation',
    status: 'waiting',
    phase: 'Tests reproduced',
    summary: 'Two agents finished; one needs direction.',
    detail: 'Choose whether to fix the test or inspect the implementation.',
    progress_version: 17,
    needs_input: true,
    decisions: [
      {
        id: 'focus-test',
        kind: 'redirect',
        label: 'Focus on test',
        description: 'Fix the failing test before implementation changes.',
        requires_confirmation: true,
        requires_text: false,
        remote_safe: true
      },
      {
        id: 'custom-redirect',
        kind: 'redirect',
        label: 'Speak redirect',
        requires_confirmation: true,
        requires_text: true,
        remote_safe: true
      },
      {
        id: 'deploy-production',
        kind: 'approve',
        label: 'Deploy production',
        requires_confirmation: true,
        requires_text: false,
        remote_safe: false
      }
    ],
    ...overrides
  };
}

function storedProgress(overrides: Partial<StoredAgentProgress> = {}): StoredAgentProgress {
  const result = normalizeAgentProgress(progressInput(), NOW);
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error(result.error);
  return { ...result.progress, ...overrides };
}

function decisionInput(overrides: Partial<AgentDecisionInput> = {}): AgentDecisionInput {
  return {
    agent_id: 'claude:session-123',
    progress_version: 17,
    decision_id: 'focus-test',
    confirmed: true,
    idempotency_key: 'core-ink:decision-1',
    ...overrides
  };
}

function storedDecision(overrides: Partial<StoredAgentDecision> = {}): StoredAgentDecision {
  const result = prepareAgentDecision({
    input: decisionInput(),
    progress: storedProgress(),
    now: NOW,
    id: 'decision-1'
  });
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error(result.error);
  return { ...result.decision, ...overrides };
}

test('normalizes progress and exposes only remote-safe decisions to the device', () => {
  const result = normalizeAgentProgress(
    progressInput({
      payload: {
        workspace_label: 'create-something-monorepo',
        control_reason: 'settled-legacy-thread',
        authority: 'dual-surface',
        private_note: 'must not reach the device'
      }
    }),
    NOW
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const console = buildAgentConsole([result.progress], NOW);
  assert.equal(console.agents.length, 1);
  assert.equal(console.agents[0]?.progress_version, 17);
  assert.deepEqual(console.agents[0]?.operator_context, {
    workspace_label: 'create-something-monorepo',
    control_reason: 'settled-legacy-thread',
    authority: 'dual-surface'
  });
  assert.equal('private_note' in console.agents[0]!.operator_context, false);
  assert.deepEqual(
    console.agents[0]?.decisions.map((decision) => decision.id),
    ['focus-test', 'custom-redirect']
  );
});

test('rejects stale, unadvertised, unsafe, unconfirmed, and incomplete decisions', () => {
  const progress = storedProgress();

  assert.deepEqual(
    prepareAgentDecision({
      input: decisionInput({ progress_version: 16 }),
      progress,
      now: NOW,
      id: 'stale'
    }),
    { ok: false, status: 409, error: 'Agent progress changed. Refresh before steering.' }
  );
  assert.deepEqual(
    prepareAgentDecision({
      input: decisionInput({ decision_id: 'not-offered' }),
      progress,
      now: NOW,
      id: 'unadvertised'
    }),
    { ok: false, status: 400, error: 'Decision is not offered by this agent.' }
  );
  assert.deepEqual(
    prepareAgentDecision({
      input: decisionInput({ decision_id: 'deploy-production' }),
      progress,
      now: NOW,
      id: 'unsafe'
    }),
    { ok: false, status: 403, error: 'Decision requires the desktop operator surface.' }
  );
  assert.deepEqual(
    prepareAgentDecision({
      input: decisionInput({ confirmed: false }),
      progress,
      now: NOW,
      id: 'unconfirmed'
    }),
    { ok: false, status: 400, error: 'Decision requires explicit confirmation.' }
  );
  assert.deepEqual(
    prepareAgentDecision({
      input: decisionInput({ decision_id: 'custom-redirect', message: '' }),
      progress,
      now: NOW,
      id: 'missing-message'
    }),
    { ok: false, status: 400, error: 'Decision requires a steering message.' }
  );
});

test('creates one bounded queued decision with a device-safe receipt', () => {
  const result = prepareAgentDecision({
    input: decisionInput({ device_id: 'core-ink' }),
    progress: storedProgress(),
    now: NOW,
    id: 'decision-1'
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.decision.state, 'queued');
  assert.equal(result.decision.kind, 'redirect');
  assert.equal(result.decision.label, 'Focus on test');
  assert.equal(result.decision.device_id, 'core-ink');
  assert.equal(result.decision.message, '');
});

test('leases provider-matched commands and supports acknowledged terminal receipts', () => {
  const queued = storedDecision();
  const otherProvider = storedDecision({
    id: 'decision-2',
    agent_id: 'codex:task-456',
    provider: 'codex',
    idempotency_key: 'core-ink:decision-2'
  });

  const leased = leaseAgentDecisions({
    decisions: [queued, otherProvider],
    input: { relay_id: 'mac-mini', providers: ['claude'], limit: 5, lease_ms: 30_000 },
    now: NOW
  });

  assert.equal(leased.ok, true);
  assert.equal(leased.decisions.length, 1);
  assert.equal(leased.decisions[0]?.id, 'decision-1');
  assert.equal(leased.decisions[0]?.state, 'leased');
  assert.equal(leased.decisions[0]?.lease_owner, 'mac-mini');

  const acknowledged = transitionAgentDecision({
    decision: leased.decisions[0]!,
    input: { relay_id: 'mac-mini', state: 'acknowledged', summary: 'Delivered to Claude session.' },
    now: NOW + 1_000
  });
  assert.equal(acknowledged.ok, true);
  if (!acknowledged.ok) return;
  assert.equal(acknowledged.decision.state, 'acknowledged');

  const completed = transitionAgentDecision({
    decision: acknowledged.decision,
    input: { relay_id: 'mac-mini', state: 'completed', summary: 'Agent accepted redirect.' },
    now: NOW + 2_000
  });
  assert.equal(completed.ok, true);
  if (!completed.ok) return;
  assert.equal(completed.decision.state, 'completed');
  assert.equal(completed.decision.result_summary, 'Agent accepted redirect.');
});

test('rejects a receipt from a relay that does not own the lease', () => {
  const result = transitionAgentDecision({
    decision: storedDecision({
      state: 'leased',
      lease_owner: 'mac-mini',
      lease_expires_at: NOW + 30_000
    }),
    input: { relay_id: 'other-relay', state: 'failed', error: 'No session.' },
    now: NOW + 1_000
  });

  assert.deepEqual(result, {
    ok: false,
    status: 409,
    error: 'Decision is leased by another relay.'
  });
});

test('recovers an acknowledged decision after its relay lease expires', () => {
  const abandoned = storedDecision({
    state: 'acknowledged',
    lease_owner: 'offline-relay',
    lease_expires_at: NOW - 1,
    attempts: 1
  });
  const result = leaseAgentDecisions({
    decisions: [abandoned],
    input: { relay_id: 'replacement-relay', providers: ['claude'] },
    now: NOW
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.decisions[0]?.state, 'leased');
  assert.equal(result.decisions[0]?.lease_owner, 'replacement-relay');
  assert.equal(result.decisions[0]?.attempts, 2);
});
