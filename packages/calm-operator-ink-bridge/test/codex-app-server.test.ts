import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  assertCodexDecisionAuthorized,
  buildCodexTaskProgress,
  dispatchCodexDecision,
  listCodexTaskProgress,
  type CodexRpcClient,
  type CodexRpcNotification,
  type CodexThreadSummary
} from '../src/codex-app-server.js';
import type { StoredAgentDecision } from '../src/agent-console.js';

function thread(overrides: Partial<CodexThreadSummary> = {}): CodexThreadSummary {
  return {
    id: '01a-thread',
    name: 'Fix checkout regression',
    preview: 'Reproduce the failing checkout test and repair it.',
    historyMode: 'legacy',
    updatedAt: 1_787_278_000,
    cwd: '/workspace/create-something-monorepo',
    status: { type: 'idle' },
    ...overrides
  };
}

function decision(overrides: Partial<StoredAgentDecision> = {}): StoredAgentDecision {
  return {
    id: 'decision-1',
    idempotency_key: 'stopwatch:decision-1',
    agent_id: 'codex:new',
    provider: 'codex',
    progress_version: 1,
    decision_id: 'start',
    kind: 'continue',
    label: 'Start new task',
    message: 'Review the checkout regression and fix the failing test.',
    device_id: 'stopwatch',
    state: 'leased',
    created_at: 1,
    updated_at: 1,
    lease_owner: 'laptop',
    lease_expires_at: 60_000,
    attempts: 1,
    result_summary: '',
    error: '',
    payload: {},
    ...overrides
  };
}

class FakeRpc implements CodexRpcClient {
  readonly calls: Array<{ method: string; params: unknown }> = [];
  private listeners = new Set<(notification: CodexRpcNotification) => void>();

  constructor(
    private readonly responder: (
      method: string,
      params: unknown,
      rpc: FakeRpc
    ) => unknown | Promise<unknown>
  ) {}

  async request<T>(method: string, params: unknown = {}): Promise<T> {
    this.calls.push({ method, params });
    return (await this.responder(method, params, this)) as T;
  }

  subscribe(listener: (notification: CodexRpcNotification) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(notification: CodexRpcNotification): void {
    for (const listener of this.listeners) listener(notification);
  }
}

test('projects recent Codex threads and a new-task action into the existing Stopwatch console', () => {
  const progress = buildCodexTaskProgress(
    [
      thread(),
      thread({
        id: '01a-paginated',
        name: 'Current desktop task',
        historyMode: 'paginated',
        status: { type: 'notLoaded' }
      })
    ],
    {
      cwd: '/workspace/create-something-monorepo',
      now: 1_787_278_100_000,
      ttlMs: 30_000,
      minimumIdleMs: 60_000
    }
  );

  assert.equal(progress.length, 3);
  assert.deepEqual(progress[0], {
    agent_id: 'codex:new',
    provider: 'codex',
    label: 'New Codex task',
    status: 'waiting',
    phase: 'Laptop ready',
    summary: 'Speak a prompt to start in create-something-monorepo.',
    detail: '/workspace/create-something-monorepo',
    progress_version: 1,
    needs_input: true,
    decisions: [
      {
        id: 'start',
        kind: 'continue',
        label: 'Start new task',
        description: 'Review a spoken prompt, then start a local Codex task.',
        requires_confirmation: true,
        requires_text: true,
        remote_safe: true
      }
    ],
    expires_at: 1_787_278_130_000,
    payload: { authority: 'local-codex-app-server', history_mode: 'legacy' }
  });

  assert.equal(progress[1]?.agent_id, 'codex:01a-thread');
  assert.equal(progress[1]?.label, 'Fix checkout regression');
  assert.equal(progress[1]?.phase, 'Ready for prompt');
  assert.equal(progress[1]?.progress_version, 1_787_278_000);
  assert.deepEqual(progress[1]?.decisions, [
      {
        id: 'fork',
        kind: 'redirect',
        label: 'Continue in new task',
        description: 'Copy completed task history, then continue from a reviewed spoken prompt.',
      requires_confirmation: true,
      requires_text: true,
      remote_safe: true
    }
  ]);

  assert.equal(progress[2]?.agent_id, 'codex:01a-paginated');
  assert.equal(progress[2]?.phase, 'Read-only history');
  assert.equal(progress[2]?.needs_input, false);
  assert.deepEqual(progress[2]?.decisions, []);
});

test('withholds device authority while a desktop task is active or recently changed', () => {
  const progress = buildCodexTaskProgress(
    [
      thread({
        id: 'active',
        updatedAt: 1_787_278_000,
        status: { type: 'active', activeFlags: [] }
      }),
      thread({ id: 'recent', updatedAt: 1_787_278_090, status: { type: 'notLoaded' } }),
      thread({ id: 'settled', updatedAt: 1_787_277_900, status: { type: 'notLoaded' } })
    ],
    {
      cwd: '/workspace/create-something-monorepo',
      now: 1_787_278_100_000,
      ttlMs: 30_000
    }
  );

  assert.equal(progress[1]?.phase, 'Codex working');
  assert.deepEqual(progress[1]?.decisions, []);
  assert.equal(progress[2]?.phase, 'Recent desktop activity');
  assert.deepEqual(progress[2]?.decisions, []);
  assert.equal(progress[3]?.phase, 'Ready for prompt');
  assert.deepEqual(
    progress[3]?.decisions.map((item) => item.id),
    ['fork']
  );
});

test('offers a settled desktop task a fork-and-continue action instead of direct prompting', () => {
  const progress = buildCodexTaskProgress([thread()], {
    cwd: '/workspace/create-something-monorepo',
    now: 1_787_278_300_000,
    minimumIdleMs: 60_000
  });

  assert.deepEqual(progress[1]?.decisions, [
    {
      id: 'fork',
      kind: 'redirect',
      label: 'Continue in new task',
      description: 'Copy completed task history, then continue from a reviewed spoken prompt.',
      requires_confirmation: true,
      requires_text: true,
      remote_safe: true
    }
  ]);
  assert.equal(progress[1]?.payload.authority, 'fork-and-continue');
});

test('revalidates the exact task version and action before dispatch', () => {
  const progress = buildCodexTaskProgress([thread()], {
    cwd: '/workspace/create-something-monorepo',
    now: 1_787_278_300_000
  });
  const approved = decision({
    agent_id: 'codex:01a-thread',
    progress_version: 1_787_278_000,
    decision_id: 'fork'
  });

  assert.doesNotThrow(() => assertCodexDecisionAuthorized(progress, approved));
  assert.throws(
    () => assertCodexDecisionAuthorized(progress, { ...approved, progress_version: 1 }),
    /changed after the Stopwatch rendered it/
  );
  assert.throws(
    () => assertCodexDecisionAuthorized(progress, { ...approved, decision_id: 'start' }),
    /no longer exposes that action/
  );
});

test('starts a new local Codex task and returns streamed completion to the Stopwatch relay', async () => {
  const progress: string[] = [];
  const rpc = new FakeRpc((method, _params, client) => {
    if (method === 'thread/start') return { thread: { id: '01a-new', turns: [] } };
    if (method === 'turn/start') {
      queueMicrotask(() => {
        client.emit({
          method: 'item/agentMessage/delta',
          params: { threadId: '01a-new', turnId: 'turn-1', delta: 'Checkout fixed.' }
        });
        client.emit({
          method: 'turn/completed',
          params: {
            threadId: '01a-new',
            turn: { id: 'turn-1', status: 'completed', items: [] }
          }
        });
      });
      return { turn: { id: 'turn-1', status: 'inProgress', items: [] } };
    }
    throw new Error(`Unexpected method: ${method}`);
  });

  const result = await dispatchCodexDecision(rpc, decision(), {
    cwd: '/workspace/create-something-monorepo',
    timeoutMs: 1_000,
    onProgress: (update) => progress.push(update.summary)
  });

  assert.deepEqual(
    rpc.calls.map((call) => call.method),
    ['thread/start', 'turn/start']
  );
  assert.deepEqual(rpc.calls[0]?.params, {
    cwd: '/workspace/create-something-monorepo',
    approvalPolicy: 'never',
    sandbox: 'workspace-write',
    serviceName: 'calm_operator_stopwatch'
  });
  assert.deepEqual(rpc.calls[1]?.params, {
    threadId: '01a-new',
    input: [
      {
        type: 'text',
        text: 'Operator prompt from stopwatch:\n\nReview the checkout regression and fix the failing test.\n\nWork within the current sandbox and approval policy. If broader authority or user input is required, stop with a clear handoff.'
      }
    ],
    approvalPolicy: 'never'
  });
  assert.deepEqual(progress, ['Checkout fixed.']);
  assert.deepEqual(result, {
    threadId: '01a-new',
    turnId: 'turn-1',
    status: 'completed',
    summary: 'Checkout fixed.'
  });
});

test('reads back terminal turn state when the app-server completion notification is missed', async () => {
  const rpc = new FakeRpc((method) => {
    if (method === 'thread/start') return { thread: { id: '01a-polled', turns: [] } };
    if (method === 'turn/start') {
      return { turn: { id: 'turn-polled', status: 'inProgress', items: [] } };
    }
    if (method === 'thread/read') {
      return {
        thread: {
          id: '01a-polled',
          turns: [
            {
              id: 'turn-polled',
              status: 'completed',
              items: [{ type: 'agentMessage', text: 'Stopwatch Codex authority ready.' }]
            }
          ]
        }
      };
    }
    throw new Error(`Unexpected method: ${method}`);
  });

  const result = await dispatchCodexDecision(rpc, decision(), {
    cwd: '/workspace/create-something-monorepo',
    timeoutMs: 1_000,
    completionPollMs: 25
  });

  assert.deepEqual(
    rpc.calls.map((call) => call.method),
    ['thread/start', 'turn/start', 'thread/read']
  );
  assert.deepEqual(rpc.calls[2]?.params, {
    threadId: '01a-polled',
    includeTurns: true
  });
  assert.deepEqual(result, {
    threadId: '01a-polled',
    turnId: 'turn-polled',
    status: 'completed',
    summary: 'Stopwatch Codex authority ready.'
  });
});

test('resumes an idle legacy task and starts its next turn', async () => {
  const rpc = new FakeRpc((method, _params, client) => {
    if (method === 'thread/resume') {
      return { thread: { id: '01a-existing', turns: [] } };
    }
    if (method === 'turn/start') {
      queueMicrotask(() => {
        client.emit({
          method: 'turn/completed',
          params: {
            threadId: '01a-existing',
            turn: { id: 'turn-2', status: 'completed', items: [] }
          }
        });
      });
      return { turn: { id: 'turn-2', status: 'inProgress', items: [] } };
    }
    throw new Error(`Unexpected method: ${method}`);
  });

  const result = await dispatchCodexDecision(
    rpc,
    decision({
      agent_id: 'codex:01a-existing',
      progress_version: 7,
      decision_id: 'prompt',
      kind: 'redirect',
      label: 'Prompt task',
      message: 'Run the focused test and continue.'
    }),
    { cwd: '/workspace/create-something-monorepo', timeoutMs: 1_000 }
  );

  assert.deepEqual(
    rpc.calls.map((call) => call.method),
    ['thread/resume', 'turn/start']
  );
  assert.deepEqual(rpc.calls[0]?.params, {
    threadId: '01a-existing',
    approvalPolicy: 'never'
  });
  assert.equal(result.threadId, '01a-existing');
  assert.equal(result.status, 'completed');
});

test('forks a settled desktop task through its last completed turn before prompting the child', async () => {
  const rpc = new FakeRpc((method, _params, client) => {
    if (method === 'thread/read') {
      return {
        thread: {
          id: '01a-desktop',
          turns: [
            { id: 'turn-earlier', status: 'completed', items: [] },
            { id: 'turn-completed', status: 'completed', items: [] }
          ]
        }
      };
    }
    if (method === 'thread/fork') return { thread: { id: '01a-child', turns: [] } };
    if (method === 'turn/start') {
      queueMicrotask(() => {
        client.emit({
          method: 'turn/completed',
          params: {
            threadId: '01a-child',
            turn: { id: 'turn-child', status: 'completed', items: [] }
          }
        });
      });
      return { turn: { id: 'turn-child', status: 'inProgress', items: [] } };
    }
    throw new Error(`Unexpected method: ${method}`);
  });

  const result = await dispatchCodexDecision(
    rpc,
    decision({
      agent_id: 'codex:01a-desktop',
      progress_version: 7,
      decision_id: 'fork',
      kind: 'redirect',
      label: 'Continue in new task',
      message: 'Run the focused test and continue.'
    }),
    { cwd: '/workspace/create-something-monorepo', timeoutMs: 1_000 }
  );

  assert.deepEqual(
    rpc.calls.map((call) => call.method),
    ['thread/read', 'thread/fork', 'turn/start']
  );
  assert.deepEqual(rpc.calls[0]?.params, {
    threadId: '01a-desktop',
    includeTurns: true
  });
  assert.deepEqual(rpc.calls[1]?.params, {
    threadId: '01a-desktop',
    lastTurnId: 'turn-completed'
  });
  assert.equal(rpc.calls[2]?.params?.threadId, '01a-child');
  assert.deepEqual(result, {
    threadId: '01a-child',
    turnId: 'turn-child',
    status: 'completed',
    summary: 'Forked child 01a-child: Codex completed the task.'
  });
});

test('refuses a fork when source readback finds an active turn', async () => {
  const rpc = new FakeRpc((method) => {
    if (method === 'thread/read') {
      return {
        thread: {
          id: '01a-desktop',
          turns: [{ id: 'turn-active', status: 'inProgress', items: [] }]
        }
      };
    }
    throw new Error(`Unexpected method: ${method}`);
  });

  await assert.rejects(
    dispatchCodexDecision(
      rpc,
      decision({
        agent_id: 'codex:01a-desktop',
        progress_version: 7,
        decision_id: 'fork',
        kind: 'redirect',
        label: 'Continue in new task',
        message: 'Run the focused test and continue.'
      }),
      { cwd: '/workspace/create-something-monorepo', timeoutMs: 1_000 }
    ),
    /Source task became active/
  );
  assert.deepEqual(
    rpc.calls.map((call) => call.method),
    ['thread/read']
  );
});

test('steers a turn owned by the relay app-server when it is still active', async () => {
  const rpc = new FakeRpc((method, _params, client) => {
    if (method === 'thread/resume') {
      return {
        thread: {
          id: '01a-existing',
          turns: [{ id: 'turn-active', status: 'inProgress', items: [] }]
        }
      };
    }
    if (method === 'turn/steer') {
      queueMicrotask(() => {
        client.emit({
          method: 'turn/completed',
          params: {
            threadId: '01a-existing',
            turn: { id: 'turn-active', status: 'completed', items: [] }
          }
        });
      });
      return { turnId: 'turn-active' };
    }
    throw new Error(`Unexpected method: ${method}`);
  });

  const result = await dispatchCodexDecision(
    rpc,
    decision({
      agent_id: 'codex:01a-existing',
      progress_version: 7,
      decision_id: 'prompt',
      message: 'Add the focused regression test.'
    }),
    { cwd: '/workspace/create-something-monorepo', timeoutMs: 1_000 }
  );

  assert.deepEqual(
    rpc.calls.map((call) => call.method),
    ['thread/resume', 'turn/steer']
  );
  assert.equal(result.status, 'completed');
});

test('lists recent top-level task state without repairing or mutating rollout history', async () => {
  const rpc = new FakeRpc((method) => {
    assert.equal(method, 'thread/list');
    return {
      data: [
        thread(),
        thread({ id: 'subagent', parentThreadId: '01a-parent' }),
        thread({ id: 'ephemeral', ephemeral: true })
      ],
      nextCursor: null
    };
  });

  const progress = await listCodexTaskProgress(rpc, {
    cwd: '/workspace/create-something-monorepo',
    now: 1_787_278_100_000,
    ttlMs: 30_000,
    limit: 7
  });

  assert.deepEqual(rpc.calls, [
    {
      method: 'thread/list',
      params: {
        cursor: null,
        limit: 7,
        sortKey: 'recency_at',
        sortDirection: 'desc',
        archived: false,
        useStateDbOnly: true
      }
    }
  ]);
  assert.deepEqual(
    progress.map((item) => item.agent_id),
    ['codex:new', 'codex:01a-thread']
  );
});
