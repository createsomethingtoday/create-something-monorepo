import assert from 'node:assert/strict';
import test from 'node:test';

import { SymphonyService } from '../src/orchestrator.js';

function createService() {
  const service = new SymphonyService();
  service.current_config = {
    tracker: {
      active_states: ['ready', 'claimed'],
      terminal_states: ['done', 'cancelled'],
    },
    agent: {
      max_concurrent_agents: 1,
      max_concurrent_agents_by_state: {},
    },
  };
  return service;
}

function createIssue(overrides = {}) {
  return {
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
    ...overrides,
  };
}

test('SymphonyService does not dispatch blocked ready issues', () => {
  const service = createService();
  const should_dispatch = service.should_dispatch(
    createIssue(),
    false,
  );

  assert.equal(should_dispatch, false);
});

test('SymphonyService does not dispatch blocked in-progress issues', () => {
  const service = createService();
  const should_dispatch = service.should_dispatch(
    createIssue({ state: 'claimed' }),
    false,
  );

  assert.equal(should_dispatch, false);
});
