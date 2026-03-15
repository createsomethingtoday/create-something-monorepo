import assert from 'node:assert/strict';
import test from 'node:test';

import { SymphonyService } from '../src/orchestrator.js';

test('SymphonyService does not dispatch blocked ready issues', () => {
  const service = new SymphonyService();
  service.current_config = {
    tracker: {
      kind: 'loom',
      active_states: ['ready', 'claimed'],
      terminal_states: ['done', 'cancelled'],
    },
    agent: {
      max_concurrent_agents: 1,
      max_concurrent_agents_by_state: {},
    },
  };

  const should_dispatch = service.should_dispatch(
    {
      id: 'lm-blocked-1',
      identifier: 'lm-blocked-1',
      title: 'Blocked code-quality task',
      description: null,
      priority: 2,
      state: 'ready',
      branch_name: null,
      url: null,
      labels: ['code-quality'],
      blocked_by: [{ id: 'lm-blocker-1', identifier: 'lm-blocker-1', state: 'claimed' }],
      created_at: '2026-03-14T00:00:00.000Z',
      updated_at: '2026-03-14T00:00:00.000Z',
    },
    false,
  );

  assert.equal(should_dispatch, false);
});

test('SymphonyService filters candidates by explicit task id', () => {
  const service = new SymphonyService({
    task_id_filter: 'lm-target',
  });

  const filtered = service.filter_candidate_issues([
    {
      id: 'lm-other',
      identifier: 'lm-other',
    },
    {
      id: 'lm-target',
      identifier: 'lm-target',
    },
  ]);

  assert.deepEqual(filtered, [
    {
      id: 'lm-target',
      identifier: 'lm-target',
    },
  ]);
});

test('SymphonyService derives retry workspace paths from the sanitized workspace key', () => {
  const service = new SymphonyService();
  service.retry_attempts.set('lm target/1', {
    entry: {
      issue_id: 'lm-target-1',
      identifier: 'lm target/1',
      attempt: 2,
      due_at_ms: Date.now() + 5_000,
      error: {
        class: 'StalledSessionError',
        message: 'stalled session',
        retryable: true,
      },
    },
  });

  const with_root = service.get_issue_snapshot('lm target/1');
  assert.equal(with_root.workspace.path, 'lm_target_1');

  service.current_config = {
    workspace: {
      root: '/tmp/symphony-workspaces',
    },
  };

  const snapshot = service.get_issue_snapshot('lm target/1');
  assert.equal(snapshot.workspace.path, '/tmp/symphony-workspaces/lm_target_1');
});
