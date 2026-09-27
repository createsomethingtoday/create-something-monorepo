import assert from 'node:assert/strict';
import test from 'node:test';

import {
  conversationMessages,
  eventWorkState,
  mergeWorkspaceEvents,
  pendingWorkspaceApprovals,
  previewWorkState,
  sessionWorkState,
  type BrowserWorkspaceEvent
} from '../src/lib/client/workspace-view.js';

test('conversation is reconstructed in order from persisted and live receipt events', () => {
  const events = [
    event(1, 'session.ready'),
    { ...event(2, 'user.message'), message: 'Change the heading.' },
    { ...event(3, 'agent.message'), message: 'Changed the heading.' },
    { ...event(4, 'user.message'), message: 'Check the diff.' }
  ];

  assert.deepEqual(conversationMessages(events), [
    { sequence: 2, author: 'user', text: 'Change the heading.' },
    { sequence: 3, author: 'agent', text: 'Changed the heading.' },
    { sequence: 4, author: 'user', text: 'Check the diff.' }
  ]);
});

const event = (
  sequence: number,
  type: BrowserWorkspaceEvent['type'],
  approvalId?: string
): BrowserWorkspaceEvent => ({
  sequence,
  at: '2026-07-15T12:00:00.000Z',
  type,
  message: type,
  ...(approvalId ? { approvalId } : {})
});

test('browser event model merges receipt history with live events exactly once', () => {
  const merged = mergeWorkspaceEvents(
    [event(1, 'session.ready'), event(2, 'turn.started')],
    [event(2, 'turn.started'), event(3, 'agent.message')]
  );

  assert.deepEqual(
    merged.map((item) => item.sequence),
    [1, 2, 3]
  );
});

test('browser event model exposes only unresolved approvals', () => {
  const events = [
    event(1, 'approval.requested', 'approval-a'),
    event(2, 'approval.requested', 'approval-b'),
    event(3, 'approval.resolved', 'approval-a')
  ];

  assert.deepEqual(
    pendingWorkspaceApprovals(events).map((item) => item.approvalId),
    ['approval-b']
  );
});

test('browser view maps agent, tool, approval, preview, and outcome states to Canon roles', () => {
  assert.equal(sessionWorkState('opening', false), 'planning');
  assert.equal(sessionWorkState('running', false), 'running');
  assert.equal(sessionWorkState('running', true), 'approval');
  assert.equal(sessionWorkState('completed', false), 'success');
  assert.equal(sessionWorkState('failed', false), 'failure');

  assert.equal(previewWorkState('starting'), 'planning');
  assert.equal(previewWorkState('ready'), 'success');
  assert.equal(previewWorkState('blocked'), 'warning');
  assert.equal(previewWorkState('crashed'), 'failure');

  assert.equal(eventWorkState({ ...event(4, 'command.started'), status: 'running' }), 'running');
  assert.equal(eventWorkState(event(5, 'approval.requested', 'approval-c')), 'approval');
  assert.equal(eventWorkState({ ...event(6, 'turn.completed'), status: 'completed' }), 'success');
  assert.equal(eventWorkState({ ...event(7, 'runtime.error'), status: 'failed' }), 'failure');
});
