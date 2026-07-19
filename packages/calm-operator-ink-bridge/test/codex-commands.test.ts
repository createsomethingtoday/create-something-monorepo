import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CODEX_PAGER_FOLLOW_UP,
  CodexCommandError,
  claimCodexCommand,
  completeCodexCommand,
  createCodexCommand,
  normalizeCodexSnapshot,
  toDeviceCodexView
} from '../src/codex-commands.js';

const NOW = Date.parse('2026-07-19T16:00:00.000Z');

function snapshotInput(overrides: Record<string, unknown> = {}) {
  return {
    runner_id: 'runner-macbook',
    device_id: 'core-ink',
    task_id: 'disposable-task-1',
    task: 'Core Ink disposable verifier',
    state: 'complete',
    action_id: 'disposable-task-1:follow_up:complete:1',
    action_type: 'follow_up',
    action_risk: 'safe',
    requires_confirmation: false,
    observed_at: new Date(NOW).toISOString(),
    version: 'complete:1',
    ...overrides
  };
}

function readySnapshot() {
  return normalizeCodexSnapshot(snapshotInput(), NOW);
}

function queuedCommand() {
  return createCodexCommand(
    {
      device_id: 'core-ink',
      device_nonce: 'boot-7:press-1',
      task_id: 'disposable-task-1',
      action_id: 'disposable-task-1:follow_up:complete:1',
      confirmed: true
    },
    readySnapshot(),
    NOW,
    () => 'request-1'
  );
}

describe('Core Ink Codex command contract', () => {
  it('publishes only a fresh safe follow-up snapshot for the selected device', () => {
    const snapshot = readySnapshot();
    assert.equal(snapshot.status, 'ready');
    assert.equal(snapshot.action_type, 'follow_up');
    assert.equal(snapshot.action_risk, 'safe');

    assert.throws(
      () => normalizeCodexSnapshot(snapshotInput({ action_risk: 'review' }), NOW),
      (error: unknown) => contractError(error, 'unsupported_action', 400)
    );
    assert.throws(
      () =>
        normalizeCodexSnapshot(
          snapshotInput({ observed_at: new Date(NOW - 10 * 60_000).toISOString() }),
          NOW
        ),
      (error: unknown) => contractError(error, 'stale_snapshot', 410)
    );
  });

  it('creates one bounded queued command only for the exact confirmed snapshot', () => {
    const command = queuedCommand();
    assert.deepEqual(
      {
        request_id: command.request_id,
        runner_id: command.runner_id,
        type: command.type,
        text: command.text,
        status: command.status,
        expires_at: command.expires_at
      },
      {
        request_id: 'request-1',
        runner_id: 'runner-macbook',
        type: 'follow_up',
        text: CODEX_PAGER_FOLLOW_UP,
        status: 'queued',
        expires_at: NOW + 2 * 60_000
      }
    );

    for (const input of [
      { confirmed: false },
      { task_id: 'another-task' },
      { action_id: 'stale-action' }
    ]) {
      assert.throws(
        () =>
          createCodexCommand(
            {
              device_id: 'core-ink',
              device_nonce: 'boot-7:press-2',
              task_id: 'disposable-task-1',
              action_id: 'disposable-task-1:follow_up:complete:1',
              confirmed: true,
              ...input
            },
            readySnapshot(),
            NOW,
            () => 'never-created'
          ),
        (error: unknown) => error instanceof CodexCommandError
      );
    }
  });

  it('allows the selected runner to claim exactly once and never auto-requeues ambiguity', () => {
    const claimed = claimCodexCommand(queuedCommand(), 'runner-macbook', NOW + 1_000);
    assert.equal(claimed.status, 'claimed');
    assert.equal(claimed.claimed_by, 'runner-macbook');

    assert.throws(
      () => claimCodexCommand(claimed, 'runner-macbook', NOW + 90_000),
      (error: unknown) => contractError(error, 'already_claimed', 409)
    );
    assert.throws(
      () => claimCodexCommand(queuedCommand(), 'other-runner', NOW + 1_000),
      (error: unknown) => contractError(error, 'wrong_runner', 403)
    );
    assert.throws(
      () => claimCodexCommand(queuedCommand(), 'runner-macbook', NOW + 3 * 60_000),
      (error: unknown) => contractError(error, 'expired_command', 410)
    );
  });

  it('accepts a terminal receipt only from the claiming runner with exact identifiers', () => {
    const claimed = claimCodexCommand(queuedCommand(), 'runner-macbook', NOW + 1_000);
    const completed = completeCodexCommand(
      claimed,
      'runner-macbook',
      {
        request_id: 'request-1',
        task_id: 'disposable-task-1',
        action_id: 'disposable-task-1:follow_up:complete:1',
        status: 'accepted',
        upstream_status: 202,
        detail: 'Follow-up accepted.'
      },
      NOW + 2_000
    );
    assert.equal(completed.status, 'accepted');
    assert.equal(completed.receipt?.detail, 'Follow-up accepted.');

    assert.throws(
      () =>
        completeCodexCommand(
          claimed,
          'other-runner',
          {
            request_id: 'request-1',
            task_id: 'disposable-task-1',
            action_id: 'disposable-task-1:follow_up:complete:1',
            status: 'accepted'
          },
          NOW + 2_000
        ),
      (error: unknown) => contractError(error, 'wrong_runner', 403)
    );
  });

  it('returns a device view without runner internals or arbitrary prompt input', () => {
    const command = queuedCommand();
    const view = toDeviceCodexView(readySnapshot(), command, NOW + 500);
    assert.deepEqual(view, {
      ok: true,
      status: 'queued',
      task_id: 'disposable-task-1',
      task: 'Core Ink disposable verifier',
      action_id: 'disposable-task-1:follow_up:complete:1',
      request_id: 'request-1',
      expires_at: NOW + 2 * 60_000,
      receipt: null
    });
    assert.equal(JSON.stringify(view).includes('runner-macbook'), false);
    assert.equal(JSON.stringify(view).includes(CODEX_PAGER_FOLLOW_UP), false);
  });
});

function contractError(error: unknown, code: string, status: number): boolean {
  return error instanceof CodexCommandError && error.code === code && error.status === status;
}
