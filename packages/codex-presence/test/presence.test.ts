import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { listPresenceCards, readPresenceCard } from '../src/index';

describe('Codex presence public contract', () => {
  it('reports a live rollout turn as working instead of idle', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'codex-presence-'));
    const rolloutPath = join(directory, 'rollout-2026-07-17T00-00-00-thread-live.jsonl');
    await writeFile(
      rolloutPath,
      [
        event('2026-07-17T05:00:00.000Z', 'session_meta', {
          id: 'thread-live',
          cwd: '/workspace/project'
        }),
        event('2026-07-17T05:00:01.000Z', 'event_msg', { type: 'task_started' }),
        event('2026-07-17T05:00:02.000Z', 'event_msg', {
          type: 'agent_reasoning',
          text: 'Inspecting the current implementation.'
        })
      ].join('\n') + '\n'
    );

    const card = await readPresenceCard({
      rolloutPath,
      title: 'Build Codex Presence',
      now: new Date('2026-07-17T05:00:03.000Z')
    });

    assert.equal(card.taskId, 'thread-live');
    assert.equal(card.task, 'Build Codex Presence');
    assert.equal(card.state, 'working');
    assert.equal(card.attention, 'quiet');
    assert.equal(card.operatorRequired, false);
    assert.equal(card.freshness, 'fresh');
    assert.equal(card.observedAt, '2026-07-17T05:00:02.000Z');
    assert.deepEqual(card.actions.map((action) => action.type), ['inspect', 'follow_up', 'interrupt']);
  });

  it('surfaces a recent completed turn as a notice with a follow-up action', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'codex-presence-'));
    const rolloutPath = join(directory, 'rollout-2026-07-17T00-00-00-thread-done.jsonl');
    await writeFile(
      rolloutPath,
      [
        event('2026-07-17T05:00:00.000Z', 'session_meta', { id: 'thread-done' }),
        event('2026-07-17T05:00:01.000Z', 'event_msg', { type: 'task_started' }),
        event('2026-07-17T05:00:02.000Z', 'event_msg', {
          type: 'agent_message',
          message: 'Implemented the presence contract and the tests pass.'
        }),
        event('2026-07-17T05:00:03.000Z', 'event_msg', { type: 'task_complete' })
      ].join('\n') + '\n'
    );

    const card = await readPresenceCard({
      rolloutPath,
      title: 'Build Codex Presence',
      now: new Date('2026-07-17T05:00:04.000Z')
    });

    assert.equal(card.state, 'complete');
    assert.equal(card.attention, 'notice');
    assert.equal(card.operatorRequired, false);
    assert.equal(card.summary, 'Implemented the presence contract and the tests pass.');
    assert.deepEqual(card.actions.map((action) => action.type), ['inspect', 'follow_up', 'dismiss']);
  });

  it('requires an answer while the latest user-input call is unresolved', async () => {
    const card = await fixtureCard('thread-question', [
      event('2026-07-17T05:00:01.000Z', 'event_msg', { type: 'task_started' }),
      responseCall('2026-07-17T05:00:02.000Z', 'request_user_input', 'call-question')
    ]);

    assert.equal(card.state, 'needs_input');
    assert.equal(card.attention, 'decision');
    assert.equal(card.operatorRequired, true);
    assert.deepEqual(card.actions.map((action) => action.type), ['inspect', 'answer']);
  });

  it('requires a confirmed decision for an unresolved approval request', async () => {
    const card = await fixtureCard('thread-approval', [
      event('2026-07-17T05:00:01.000Z', 'event_msg', { type: 'task_started' }),
      event('2026-07-17T05:00:02.000Z', 'event_msg', {
        type: 'exec_approval_request',
        request_id: 'approval-1'
      })
    ]);

    assert.equal(card.state, 'approval');
    assert.equal(card.attention, 'decision');
    assert.equal(card.operatorRequired, true);
    assert.deepEqual(card.actions.map((action) => [action.type, action.requiresConfirmation]), [
      ['inspect', false],
      ['approve', true],
      ['deny', true]
    ]);
  });

  it('surfaces explicit errors and aborts as urgent states', async () => {
    const failed = await fixtureCard('thread-failed', [
      event('2026-07-17T05:00:01.000Z', 'event_msg', { type: 'task_started' }),
      event('2026-07-17T05:00:02.000Z', 'event_msg', { type: 'error', message: 'Tool failed.' })
    ]);
    const blocked = await fixtureCard('thread-blocked', [
      event('2026-07-17T05:00:01.000Z', 'event_msg', { type: 'task_started' }),
      event('2026-07-17T05:00:02.000Z', 'event_msg', { type: 'turn_aborted', reason: 'interrupted' })
    ]);

    assert.equal(failed.state, 'failed');
    assert.equal(failed.attention, 'urgent');
    assert.equal(blocked.state, 'blocked');
    assert.equal(blocked.attention, 'urgent');
  });

  it('keeps prior evidence readable when the final JSONL line is truncated', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'codex-presence-'));
    const rolloutPath = join(directory, 'rollout-2026-07-17T00-00-00-thread-stale.jsonl');
    await writeFile(
      rolloutPath,
      [
        event('2026-07-17T04:50:00.000Z', 'session_meta', { id: 'thread-stale' }),
        event('2026-07-17T04:50:01.000Z', 'event_msg', { type: 'task_started' }),
        '{"timestamp":"2026-07-17T04:50:02.000Z","type":"event_msg"'
      ].join('\n')
    );

    const card = await readPresenceCard({
      rolloutPath,
      now: new Date('2026-07-17T05:00:03.000Z')
    });

    assert.equal(card.state, 'stale');
    assert.equal(card.freshness, 'stale');
    assert.equal(card.taskId, 'thread-stale');
  });

  it('discovers named tasks from Codex home and ranks operator decisions first', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'codex-home-'));
    const sessionDirectory = join(codexHome, 'sessions', '2026', '07', '17');
    await mkdir(sessionDirectory, { recursive: true });
    await writeFile(
      join(codexHome, 'session_index.jsonl'),
      [
        JSON.stringify({ id: 'thread-working', thread_name: 'Working task', updated_at: '2026-07-17T05:00:02Z' }),
        JSON.stringify({ id: 'thread-question', thread_name: 'Question task', updated_at: '2026-07-17T05:00:01Z' })
      ].join('\n') + '\n'
    );
    await writeFile(
      join(sessionDirectory, 'rollout-2026-07-17T00-00-00-thread-working.jsonl'),
      [
        event('2026-07-17T05:00:00.000Z', 'session_meta', { id: 'thread-working' }),
        event('2026-07-17T05:00:02.000Z', 'event_msg', { type: 'task_started' })
      ].join('\n') + '\n'
    );
    await writeFile(
      join(sessionDirectory, 'rollout-2026-07-17T00-00-00-thread-question.jsonl'),
      [
        event('2026-07-17T05:00:00.000Z', 'session_meta', { id: 'thread-question' }),
        event('2026-07-17T05:00:01.000Z', 'event_msg', { type: 'task_started' }),
        responseCall('2026-07-17T05:00:02.000Z', 'request_user_input', 'call-question')
      ].join('\n') + '\n'
    );

    const cards = await listPresenceCards({
      codexHome,
      now: new Date('2026-07-17T05:00:03.000Z')
    });

    assert.deepEqual(cards.map((card) => [card.task, card.state]), [
      ['Question task', 'needs_input'],
      ['Working task', 'working']
    ]);
  });
});

async function fixtureCard(taskId: string, events: string[]) {
  const directory = await mkdtemp(join(tmpdir(), 'codex-presence-'));
  const rolloutPath = join(directory, `rollout-2026-07-17T00-00-00-${taskId}.jsonl`);
  await writeFile(
    rolloutPath,
    [event('2026-07-17T05:00:00.000Z', 'session_meta', { id: taskId }), ...events].join('\n') + '\n'
  );
  return readPresenceCard({ rolloutPath, now: new Date('2026-07-17T05:00:03.000Z') });
}

function event(timestamp: string, type: string, payload: Record<string, unknown>): string {
  return JSON.stringify({ timestamp, type, payload });
}

function responseCall(timestamp: string, name: string, callId: string): string {
  return event(timestamp, 'response_item', {
    type: 'function_call',
    name,
    call_id: callId,
    arguments: '{}'
  });
}
