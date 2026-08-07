import assert from 'node:assert/strict';
import { test } from 'node:test';

import { adapterCommand, steeringPrompt } from '../src/agent-relay.js';
import type { StoredAgentDecision } from '../src/agent-console.js';

function decision(overrides: Partial<StoredAgentDecision> = {}): StoredAgentDecision {
  return {
    id: 'decision-1',
    idempotency_key: 'core-ink:1',
    agent_id: 'claude:session-123',
    provider: 'claude',
    progress_version: 17,
    decision_id: 'focus-test',
    kind: 'redirect',
    label: 'Focus on test',
    message: 'Fix the failing test first.',
    device_id: 'core-ink',
    state: 'leased',
    created_at: 1,
    updated_at: 1,
    lease_owner: 'mac-mini',
    lease_expires_at: 2,
    attempts: 1,
    result_summary: '',
    error: '',
    payload: {},
    ...overrides
  };
}

test('builds a bounded steering prompt from the structured decision', () => {
  assert.equal(
    steeringPrompt(decision()),
    'Operator steering from Core Ink: redirect — Focus on test\n\nFix the failing test first.\n\nAcknowledge this direction briefly, then continue within the existing permissions and approval policy.'
  );
});

test('builds Claude and Codex resume commands without shell interpolation', () => {
  assert.deepEqual(adapterCommand(decision(), {}), {
    executable: 'claude',
    args: [
      '--resume',
      'session-123',
      '--print',
      '--output-format',
      'json',
      steeringPrompt(decision())
    ]
  });

  const codexDecision = decision({ provider: 'codex', agent_id: 'codex:019f-task' });
  assert.deepEqual(adapterCommand(codexDecision, {}), {
    executable: 'codex',
    args: ['exec', '--json', 'resume', '019f-task', steeringPrompt(codexDecision)]
  });
});

test('supports explicit executable paths without changing adapter arguments', () => {
  const command = adapterCommand(decision(), { claudeExecutable: '/opt/local/bin/claude' });
  assert.equal(command.executable, '/opt/local/bin/claude');
  assert.equal(command.args[0], '--resume');
});

test('rejects unsupported providers and malformed session references', () => {
  assert.throws(
    () => adapterCommand(decision({ provider: 'other', agent_id: 'other:session-1' }), {}),
    /Unsupported agent provider/
  );
  assert.throws(
    () => adapterCommand(decision({ agent_id: 'claude:session with spaces' }), {}),
    /safe resumable session reference/
  );
});
