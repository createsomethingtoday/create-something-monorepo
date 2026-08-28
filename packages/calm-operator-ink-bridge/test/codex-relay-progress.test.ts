import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildAgentConsole, normalizeAgentProgress } from '../src/agent-console.js';
import {
  buildCodexRelayActiveProgress,
  buildCodexRelayTerminalProgress,
  publishCodexTerminalProgressBestEffort
} from '../src/codex-relay-progress.js';
import type { StoredAgentDecision } from '../src/agent-console.js';

function decision(overrides: Partial<StoredAgentDecision> = {}): StoredAgentDecision {
  return {
    id: 'decision-1',
    idempotency_key: 'stopwatch:decision-1',
    agent_id: 'codex:01a-source',
    provider: 'codex',
    progress_version: 1,
    decision_id: 'fork',
    kind: 'redirect',
    label: 'Continue in new task',
    message: 'Reply exactly: fork check complete.',
    device_id: 'stopwatch',
    state: 'acknowledged',
    created_at: 1,
    updated_at: 1,
    lease_owner: 'laptop',
    lease_expires_at: 660_000,
    attempts: 1,
    result_summary: '',
    error: '',
    payload: {},
    ...overrides
  };
}

test('renews quiet Codex progress until its terminal receipt is posted', () => {
  const first = buildCodexRelayActiveProgress({
    decision: decision(),
    update: {
      threadId: '01a-child',
      turnId: 'turn-1',
      phase: 'Codex working',
      summary: 'Forked child 01a-child. Codex started.'
    },
    now: 1_000,
    ttlMs: 30_000
  });
  const renewed = buildCodexRelayActiveProgress({
    decision: decision(),
    update: {
      threadId: '01a-child',
      turnId: 'turn-1',
      phase: 'Codex working',
      summary: 'Forked child 01a-child. Codex started.'
    },
    now: 26_000,
    ttlMs: 30_000
  });
  const normalized = normalizeAgentProgress(renewed, 26_000);
  assert.equal(normalized.ok, true);
  if (!normalized.ok) return;

  const console = buildAgentConsole([normalized.progress], 35_000);
  assert.deepEqual(console.agents.map((agent) => agent.agent_id), ['codex:01a-child']);
  assert.equal(console.agents[0]?.status, 'working');
  assert.equal(first.expires_at, 31_000);
  assert.equal(renewed.expires_at, 56_000);

  const terminal = buildCodexRelayTerminalProgress({
    decision: decision(),
    result: {
      threadId: '01a-child',
      turnId: 'turn-1',
      status: 'completed',
      summary: 'Forked child 01a-child: fork check complete.'
    },
    now: 40_000,
    ttlMs: 30_000
  });
  assert.deepEqual(
    { status: terminal.status, phase: terminal.phase, expires_at: terminal.expires_at },
    { status: 'completed', phase: 'Codex completed', expires_at: 70_000 }
  );
});

test('keeps a completed Codex result successful when terminal progress publication fails', async () => {
  assert.equal(
    await publishCodexTerminalProgressBestEffort(async () => {
      throw new Error('temporary bridge outage');
    }),
    false
  );
  assert.equal(await publishCodexTerminalProgressBestEffort(async () => undefined), true);
});
