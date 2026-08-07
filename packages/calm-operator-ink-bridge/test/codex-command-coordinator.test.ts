import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CodexCommandCoordinator,
  MemoryCodexCommandStorage
} from '../src/codex-command-coordinator.js';
import { CodexCommandError } from '../src/codex-commands.js';

const NOW = Date.parse('2026-07-19T17:00:00.000Z');

function snapshot() {
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
    version: 'complete:1'
  };
}

describe('Codex command coordinator', () => {
  it('exchanges one idempotent device command and terminal runner receipt', async () => {
    let nextId = 1;
    const coordinator = new CodexCommandCoordinator(new MemoryCodexCommandStorage(), {
      now: () => NOW,
      requestId: () => `request-${nextId++}`
    });

    await coordinator.publishSnapshot(snapshot());
    assert.equal((await coordinator.deviceView('core-ink')).status, 'ready');

    const input = {
      device_id: 'core-ink',
      device_nonce: 'boot-7:press-1',
      task_id: 'disposable-task-1',
      action_id: 'disposable-task-1:follow_up:complete:1',
      confirmed: true
    };
    const first = await coordinator.createCommand(input);
    const replay = await coordinator.createCommand(input);
    assert.equal(first.request_id, 'request-1');
    assert.deepEqual(replay, first);

    const queued = await coordinator.nextCommand('runner-macbook');
    assert.equal(queued?.request_id, first.request_id);
    const claimed = await coordinator.claimCommand(first.request_id, 'runner-macbook');
    assert.equal(claimed.status, 'claimed');
    assert.equal(await coordinator.nextCommand('runner-macbook'), null);

    const accepted = await coordinator.completeCommand(first.request_id, 'runner-macbook', {
      request_id: first.request_id,
      task_id: first.task_id,
      action_id: first.action_id,
      status: 'accepted',
      upstream_status: 202,
      detail: 'Follow-up accepted.'
    });
    assert.equal(accepted.status, 'accepted');
    assert.equal(
      (await coordinator.deviceCommand(first.request_id, 'core-ink')).status,
      'accepted'
    );
    assert.equal((await coordinator.deviceView('core-ink')).receipt?.status, 'accepted');
  });

  it('returns to ready when Presence advances beyond the accepted action', async () => {
    const coordinator = new CodexCommandCoordinator(new MemoryCodexCommandStorage(), {
      now: () => NOW,
      requestId: () => 'request-1'
    });
    await coordinator.publishSnapshot(snapshot());
    const command = await coordinator.createCommand({
      device_id: 'core-ink',
      device_nonce: 'boot-7:press-1',
      task_id: 'disposable-task-1',
      action_id: 'disposable-task-1:follow_up:complete:1',
      confirmed: true
    });
    await coordinator.claimCommand(command.request_id, 'runner-macbook');
    await coordinator.completeCommand(command.request_id, 'runner-macbook', {
      request_id: command.request_id,
      task_id: command.task_id,
      action_id: command.action_id,
      status: 'accepted'
    });

    await coordinator.publishSnapshot({
      ...snapshot(),
      action_id: 'disposable-task-1:follow_up:complete:2',
      observed_at: new Date(NOW + 1_000).toISOString(),
      version: 'complete:2'
    });

    const view = await coordinator.deviceView('core-ink');
    assert.equal(view.status, 'ready');
    assert.equal(view.action_id, 'disposable-task-1:follow_up:complete:2');
    assert.equal(view.request_id, 'request-1');
    assert.equal(view.receipt?.status, 'accepted');
  });

  it('keeps other devices and runners outside the command boundary', async () => {
    const coordinator = new CodexCommandCoordinator(new MemoryCodexCommandStorage(), {
      now: () => NOW,
      requestId: () => 'request-1'
    });
    await coordinator.publishSnapshot(snapshot());
    const command = await coordinator.createCommand({
      device_id: 'core-ink',
      device_nonce: 'boot-7:press-1',
      task_id: 'disposable-task-1',
      action_id: 'disposable-task-1:follow_up:complete:1',
      confirmed: true
    });

    await assert.rejects(
      () => coordinator.deviceCommand(command.request_id, 'other-device'),
      (error: unknown) => contractError(error, 'wrong_device', 403)
    );
    await assert.rejects(
      () => coordinator.claimCommand(command.request_id, 'other-runner'),
      (error: unknown) => contractError(error, 'wrong_runner', 403)
    );
  });
});

function contractError(error: unknown, code: string, status: number): boolean {
  return error instanceof CodexCommandError && error.code === code && error.status === status;
}
