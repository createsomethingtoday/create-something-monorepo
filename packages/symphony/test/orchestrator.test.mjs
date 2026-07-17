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
    completion: {
      mode: 'evidence_only',
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

test('completed workers hand off evidence without completing Linear or removing the workspace', async () => {
  const service = createService();
  const issue = createIssue({ id: 'issue-1', identifier: 'CRE-1300', state: 'claimed' });
  const calls = { complete: 0, comments: [], remove: 0 };
  service.started = true;
  service.tracker = {
    async complete_issue() {
      calls.complete += 1;
    },
    async comment_issue(_issueId, body) {
      calls.comments.push(body);
    },
  };
  service.workspace_manager = {
    async remove_workspace() {
      calls.remove += 1;
    },
  };
  service.claimed.add(issue.id);
  service.running.set(issue.id, {
    entry: {
      issue,
      started_at: new Date().toISOString(),
      retry_attempt: null,
      turn_count: 1,
      last_codex_message: 'Worker says the patch is ready.',
    },
    run: {},
    workspace_path: '/tmp/symphony/CRE-1300',
    workspace_metadata_path: '/tmp/symphony/CRE-1300/.symphony-workspace.json',
    stop_behavior: { mode: 'default' },
  });

  await service.on_worker_exit(issue.id, {
    status: 'completed',
    turn_count: 2,
    final_message: 'Targeted tests passed; ready for independent review.',
  });

  assert.equal(calls.complete, 0);
  assert.equal(calls.remove, 0);
  assert.equal(calls.comments.length, 1);
  assert.match(calls.comments[0], /Symphony evidence-only handoff/);
  assert.match(calls.comments[0], /\/tmp\/symphony\/CRE-1300/);
  assert.match(calls.comments[0], /Targeted tests passed; ready for independent review\./);
  assert.equal(service.claimed.has(issue.id), false);
  assert.equal(service.awaiting_completion.has(issue.id), true);
  assert.equal(service.should_dispatch(issue, false), false);
  assert.equal(service.retry_attempts.has(issue.id), false);
  assert.deepEqual(service.get_issue_snapshot(issue.identifier).completion_handoff, {
    issue_id: issue.id,
    issue_identifier: issue.identifier,
    workspace_path: '/tmp/symphony/CRE-1300',
    workspace_metadata_path: '/tmp/symphony/CRE-1300/.symphony-workspace.json',
    evidence_recorded: true,
    comment_attempts: 1,
    last_error: null,
  });
});

test('evidence-only handoff retries a transient comment failure without rerunning the worker', async () => {
  const service = createService();
  const issue = createIssue({ id: 'issue-transient', identifier: 'CRE-TRANSIENT', state: 'claimed' });
  const calls = { comments: 0 };
  service.started = true;
  service.evidence_handoff_retry_delay_ms = () => 0;
  service.tracker = {
    async comment_issue() {
      calls.comments += 1;
      if (calls.comments === 1) {
        throw new Error('temporary Linear outage');
      }
    },
  };
  service.workspace_manager = {
    async remove_workspace() {
      assert.fail('evidence-only handoff must preserve the workspace');
    },
  };
  service.claimed.add(issue.id);
  service.running.set(issue.id, {
    entry: {
      issue,
      started_at: new Date().toISOString(),
      retry_attempt: null,
      turn_count: 1,
      last_codex_message: 'Worker completed before Linear recovered.',
    },
    run: {},
    workspace_path: '/tmp/symphony/CRE-TRANSIENT',
    workspace_metadata_path: '/tmp/symphony/CRE-TRANSIENT/.symphony-workspace.json',
    stop_behavior: { mode: 'default' },
  });

  await service.on_worker_exit(issue.id, {
    status: 'completed',
    turn_count: 1,
    final_message: 'Ready for evidence handoff.',
  });

  assert.equal(calls.comments, 2);
  assert.equal(service.awaiting_completion.has(issue.id), true);
  assert.equal(service.claimed.has(issue.id), false);
  assert.equal(service.retry_attempts.has(issue.id), false);
  assert.equal(service.should_dispatch(issue, false), false);
  assert.equal(service.get_issue_snapshot(issue.identifier).completion_handoff.evidence_recorded, true);
  assert.equal(service.get_issue_snapshot(issue.identifier).last_error, null);
});

test('evidence-only handoff keeps dispatch suppressed when comment retries are exhausted', async () => {
  const service = createService();
  const issue = createIssue({ id: 'issue-outage', identifier: 'CRE-OUTAGE', state: 'claimed' });
  const calls = { comments: 0 };
  service.started = true;
  service.evidence_handoff_retry_delay_ms = () => 0;
  service.tracker = {
    async comment_issue() {
      calls.comments += 1;
      throw new Error('Linear remains unavailable');
    },
  };
  service.workspace_manager = {
    async remove_workspace() {
      assert.fail('evidence-only handoff must preserve the workspace');
    },
  };
  service.claimed.add(issue.id);
  service.running.set(issue.id, {
    entry: {
      issue,
      started_at: new Date().toISOString(),
      retry_attempt: null,
      turn_count: 1,
      last_codex_message: 'Worker completed while Linear was unavailable.',
    },
    run: {},
    workspace_path: '/tmp/symphony/CRE-OUTAGE',
    workspace_metadata_path: '/tmp/symphony/CRE-OUTAGE/.symphony-workspace.json',
    stop_behavior: { mode: 'default' },
  });

  await service.on_worker_exit(issue.id, {
    status: 'completed',
    turn_count: 1,
    final_message: 'Ready for evidence handoff.',
  });

  assert.equal(calls.comments, 3);
  assert.equal(service.awaiting_completion.has(issue.id), true);
  assert.equal(service.claimed.has(issue.id), false);
  assert.equal(service.retry_attempts.has(issue.id), false);
  assert.equal(service.should_dispatch(issue, false), false);
  assert.equal(service.get_issue_snapshot(issue.identifier).completion_handoff.evidence_recorded, false);
  assert.equal(service.get_issue_snapshot(issue.identifier).last_error, 'Linear remains unavailable');
});

test('legacy worker-exit completion is explicit and comments the gate bypass', async () => {
  const service = createService();
  const issue = createIssue({ id: 'issue-legacy', identifier: 'CRE-LEGACY', state: 'claimed' });
  const calls = { complete: 0, comments: [], remove: 0 };
  service.current_config.completion.mode = 'worker_exit_legacy';
  service.started = true;
  service.tracker = {
    async complete_issue() {
      calls.complete += 1;
    },
    async comment_issue(_issueId, body) {
      calls.comments.push(body);
    },
  };
  service.workspace_manager = {
    async remove_workspace() {
      calls.remove += 1;
    },
  };
  service.claimed.add(issue.id);
  service.running.set(issue.id, {
    entry: {
      issue,
      started_at: new Date().toISOString(),
      retry_attempt: null,
      turn_count: 1,
      last_codex_message: 'Legacy worker finished.',
    },
    run: {},
    workspace_path: '/tmp/symphony/CRE-LEGACY',
    workspace_metadata_path: '/tmp/symphony/CRE-LEGACY/.symphony-workspace.json',
    stop_behavior: { mode: 'default' },
  });

  await service.on_worker_exit(issue.id, {
    status: 'completed',
    turn_count: 1,
    final_message: 'Legacy worker finished.',
  });

  assert.equal(calls.complete, 1);
  assert.equal(calls.remove, 1);
  assert.equal(calls.comments.length, 1);
  assert.match(calls.comments[0], /legacy worker-exit completion bypassed the canonical evidence gate/i);
  assert.equal(service.claimed.has(issue.id), false);
});
