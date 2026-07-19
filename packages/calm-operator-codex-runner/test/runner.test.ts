import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CODEX_PAGER_FOLLOW_UP,
  CodexPagerRunner,
  MemoryRunnerJournal,
  RunnerSafetyError
} from '../src/index.js';

const TASK_ID = 'disposable-task-1';
const ACTION_ID = `${TASK_ID}:follow_up:complete:1`;

function presenceCard(overrides: Record<string, unknown> = {}) {
  return {
    taskId: TASK_ID,
    task: 'Core Ink disposable verifier',
    state: 'complete',
    attention: 'quiet',
    operatorRequired: false,
    summary: 'Disposable task completed.',
    reason: 'Ready for follow-up.',
    actions: [
      {
        id: ACTION_ID,
        type: 'follow_up',
        label: 'Follow up',
        risk: 'safe',
        requiresConfirmation: false
      }
    ],
    observedAt: '2026-07-19T18:00:00.000Z',
    version: 'complete:1',
    freshness: 'fresh',
    source: { kind: 'codex_rollout', path: '/tmp/disposable.jsonl' },
    ...overrides
  };
}

function queuedCommand(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    request_id: 'request-1',
    runner_id: 'runner-macbook',
    device_id: 'core-ink',
    device_nonce: 'boot-7:press-1',
    task_id: TASK_ID,
    action_id: ACTION_ID,
    type: 'follow_up',
    text: CODEX_PAGER_FOLLOW_UP,
    status: 'queued',
    created_at: Date.parse('2026-07-19T18:00:01.000Z'),
    expires_at: Date.parse('2026-07-19T18:02:01.000Z'),
    claimed_at: null,
    claimed_by: null,
    receipt: null,
    ...overrides
  };
}

describe('Core Ink outbound Codex runner', () => {
  it('publishes, revalidates, claims, executes, journals, and receipts one command', async () => {
    const calls: Array<{ url: string; method: string; body: Record<string, unknown> }> = [];
    const fetchImpl: typeof fetch = async (input, init = {}) => {
      const url = String(input);
      const method = init.method ?? 'GET';
      const body = init.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {};
      calls.push({ url, method, body });

      if (url.endsWith('/v1/cards')) return response({ cards: [presenceCard()] });
      if (url.endsWith('/ink/codex/snapshot')) return response({ ok: true }, 201);
      if (url.includes('/ink/codex/commands/next')) return response(queuedCommand());
      if (url.endsWith('/claim')) return response({ ...queuedCommand(), status: 'claimed' });
      if (url.endsWith('/v1/actions')) {
        return response({
          requestId: 'request-1',
          taskId: TASK_ID,
          actionId: ACTION_ID,
          type: 'follow_up',
          status: 'accepted',
          createdAt: '2026-07-19T18:00:02.000Z',
          upstreamStatus: 202,
          detail: 'Session disposable-task-1'
        }, 202);
      }
      if (url.endsWith('/receipt')) return response({ ...queuedCommand(), status: 'accepted' });
      throw new Error(`Unexpected request ${method} ${url}`);
    };
    const journal = new MemoryRunnerJournal();
    const runner = new CodexPagerRunner(options(fetchImpl, journal));

    const result = await runner.runOnce();
    assert.deepEqual(result, { status: 'accepted', request_id: 'request-1' });
    assert.equal((await journal.get('request-1'))?.state, 'terminal');

    const actionCall = calls.find((call) => call.url.endsWith('/v1/actions'));
    assert.deepEqual(actionCall?.body, {
      requestId: 'request-1',
      taskId: TASK_ID,
      actionId: ACTION_ID,
      type: 'follow_up',
      text: CODEX_PAGER_FOLLOW_UP,
      confirmed: true
    });
    assert.equal(calls.filter((call) => call.url.endsWith('/v1/actions')).length, 1);
  });

  it('rejects a non-disposable selected task before publishing or claiming', async () => {
    const fetchImpl: typeof fetch = async (input) => {
      if (String(input).endsWith('/v1/cards')) {
        return response({ cards: [presenceCard({ task: 'Production release task' })] });
      }
      throw new Error(`Unexpected request ${String(input)}`);
    };
    const runner = new CodexPagerRunner(options(fetchImpl, new MemoryRunnerJournal()));

    await assert.rejects(
      () => runner.runOnce(),
      (error: unknown) => safetyError(error, 'non_disposable_task')
    );
  });

  it('fails closed on a claimed journal entry after restart without re-executing', async () => {
    const journal = new MemoryRunnerJournal();
    await journal.put({
      request_id: 'request-ambiguous',
      state: 'claimed',
      task_id: TASK_ID,
      action_id: ACTION_ID,
      updated_at: '2026-07-19T18:00:00.000Z'
    });
    let calls = 0;
    const runner = new CodexPagerRunner(options(async () => {
      calls += 1;
      throw new Error('Network must not be reached for ambiguity.');
    }, journal));

    await assert.rejects(
      () => runner.runOnce(),
      (error: unknown) => safetyError(error, 'ambiguous_claim')
    );
    assert.equal(calls, 0);
  });

  for (const scenario of [
    { name: 'stale action', override: { action_id: 'stale-action' }, code: 'command_mismatch' },
    { name: 'altered prompt', override: { text: 'Run an arbitrary command.' }, code: 'command_mismatch' },
    {
      name: 'expired command',
      override: { expires_at: Date.parse('2026-07-19T18:00:00.000Z') },
      code: 'command_expired'
    }
  ]) {
    it(`rejects a ${scenario.name} before claim`, async () => {
      let claimCalls = 0;
      const fetchImpl: typeof fetch = async (input) => {
        const url = String(input);
        if (url.endsWith('/v1/cards')) return response({ cards: [presenceCard()] });
        if (url.endsWith('/ink/codex/snapshot')) return response({ ok: true }, 201);
        if (url.includes('/ink/codex/commands/next')) {
          return response(queuedCommand(scenario.override));
        }
        if (url.endsWith('/claim')) claimCalls += 1;
        throw new Error(`Unexpected request ${url}`);
      };
      const runner = new CodexPagerRunner(options(fetchImpl, new MemoryRunnerJournal()));

      await assert.rejects(
        () => runner.runOnce(),
        (error: unknown) => safetyError(error, scenario.code)
      );
      assert.equal(claimCalls, 0);
    });
  }

  it('recovers an executed receipt after restart without calling Presence again', async () => {
    const journal = new MemoryRunnerJournal();
    await journal.put({
      request_id: 'request-executed',
      state: 'executed',
      task_id: TASK_ID,
      action_id: ACTION_ID,
      updated_at: '2026-07-19T18:00:00.000Z',
      receipt: {
        request_id: 'request-executed',
        task_id: TASK_ID,
        action_id: ACTION_ID,
        status: 'accepted',
        upstream_status: 202
      }
    });
    const calls: string[] = [];
    const runner = new CodexPagerRunner(options(async (input) => {
      const url = String(input);
      calls.push(url);
      if (url.endsWith('/receipt')) return response({ ok: true, status: 'accepted' });
      throw new Error(`Unexpected request ${url}`);
    }, journal));

    assert.deepEqual(await runner.runOnce(), {
      status: 'recovered',
      request_id: 'request-executed'
    });
    assert.equal(calls.length, 1);
    assert.equal(calls.some((url) => url.endsWith('/v1/actions')), false);
    assert.equal((await journal.get('request-executed'))?.state, 'terminal');
  });
});

function options(fetchImpl: typeof fetch, journal: MemoryRunnerJournal) {
  return {
    bridgeOrigin: 'https://ink.example.test',
    bridgeToken: 'runner-token',
    presenceOrigin: 'http://127.0.0.1:4782',
    presenceToken: 'presence-token',
    runnerId: 'runner-macbook',
    deviceId: 'core-ink',
    taskId: TASK_ID,
    fetchImpl,
    journal,
    now: () => Date.parse('2026-07-19T18:00:01.000Z')
  };
}

function response(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

function safetyError(error: unknown, code: string): boolean {
  return error instanceof RunnerSafetyError && error.code === code;
}
