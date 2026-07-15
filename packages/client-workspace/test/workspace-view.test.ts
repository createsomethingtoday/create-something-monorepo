import assert from 'node:assert/strict';
import test from 'node:test';

import {
  mergeWorkspaceEvents,
  pendingWorkspaceApprovals,
  type BrowserWorkspaceEvent
} from '../src/lib/client/workspace-view.js';

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
