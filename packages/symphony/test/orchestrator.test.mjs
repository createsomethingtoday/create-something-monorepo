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
    codex: {
      stall_timeout_ms: 0,
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
    handoff: {
      schema_version: 'symphony-evidence-handoff.v1',
      issue: issue.identifier,
      status: 'worker_completed_evidence_only',
      eligible_for_done: false,
      workspace_path: '/tmp/symphony/CRE-1300',
      turn_count: 2,
      worker_message: 'Targeted tests passed; ready for independent review.',
      next_decision: 'Inspect the preserved workspace and attach independently verified completion evidence before moving Linear to a terminal state.',
    },
  });
});

test('evidence-only handoff retries a transient comment failure without rerunning the worker', async () => {
  const service = createService();
  const issue = createIssue({ id: 'issue-transient', identifier: 'CRE-TRANSIENT', state: 'claimed' });
  const calls = { comments: 0, persisted_attempts: [] };
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
    async write_completion_handoff(_identifier, state) {
      calls.persisted_attempts.push(state.comment_attempts);
      return state;
    },
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
  assert.deepEqual(calls.persisted_attempts, [0, 1, 2]);
  assert.equal(service.awaiting_completion.has(issue.id), true);
  assert.equal(service.claimed.has(issue.id), false);
  assert.equal(service.retry_attempts.has(issue.id), false);
  assert.equal(service.should_dispatch(issue, false), false);
  assert.equal(service.get_issue_snapshot(issue.identifier).completion_handoff.evidence_recorded, true);
  assert.equal(service.get_issue_snapshot(issue.identifier).last_error, null);
});

test('marker persistence failure falls back to a non-active Linear handoff state', async () => {
  const service = createService();
  const issue = createIssue({ id: 'issue-persistence', identifier: 'CRE-PERSISTENCE', state: 'claimed' });
  const calls = { comments: 0, handoffs: 0 };
  service.started = true;
  service.tracker = {
    async handoff_issue(received) {
      assert.equal(received.id, issue.id);
      calls.handoffs += 1;
      return { ...received, state: 'In Review' };
    },
    async comment_issue() {
      calls.comments += 1;
    },
  };
  service.workspace_manager = {
    async write_completion_handoff() {
      throw new Error('metadata directory is read-only');
    },
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
      last_codex_message: 'Worker completed before marker persistence failed.',
    },
    run: {},
    workspace_path: '/tmp/symphony/CRE-PERSISTENCE',
    workspace_metadata_path: '/tmp/symphony/.metadata/CRE-PERSISTENCE.json',
    stop_behavior: { mode: 'default' },
  });

  await service.on_worker_exit(issue.id, {
    status: 'completed',
    turn_count: 1,
    final_message: 'Ready for independent review.',
  });

  assert.equal(calls.handoffs, 1);
  assert.equal(calls.comments, 1);
  assert.equal(service.awaiting_completion.get(issue.id).fail_closed_state, 'In Review');
  assert.equal(service.claimed.has(issue.id), false);
  assert.equal(service.should_dispatch(issue, false), false);
});

test('dispatch halts when both marker persistence and Linear handoff fail', async () => {
  const service = createService();
  const issue = createIssue({ id: 'issue-dual-failure', identifier: 'CRE-DUAL-FAILURE', state: 'claimed' });
  service.tracker = {
    async handoff_issue() {
      throw new Error('Linear state update failed');
    },
  };
  service.workspace_manager = {
    async write_completion_handoff() {
      throw new Error('metadata directory is read-only');
    },
  };

  await assert.rejects(
    () => service.persist_completion_handoff(issue, {
      issue_id: issue.id,
      issue_identifier: issue.identifier,
      evidence_recorded: false,
      comment_attempts: 0,
      last_error: null,
    }),
    /persistence and Linear fallback both failed/,
  );

  assert.equal(service.dispatch_halted, true);
  assert.equal(service.get_snapshot().dispatch_halted, true);
  assert.equal(service.should_dispatch(issue, false), false);
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

test('a restarted service restores a durable evidence handoff before dispatch', async () => {
  const service = createService();
  const issue = createIssue({ id: 'issue-restart', identifier: 'CRE-RESTART', state: 'claimed' });
  service.workspace_manager = {
    async read_completion_handoff(identifier) {
      assert.equal(identifier, issue.identifier);
      return {
        schema_version: 'symphony-evidence-handoff-marker.v1',
        issue_id: issue.id,
        issue_identifier: issue.identifier,
        workspace_path: '/tmp/symphony/CRE-RESTART',
        workspace_metadata_path: '/tmp/symphony/.metadata/CRE-RESTART.json',
        evidence_recorded: true,
        comment_attempts: 1,
        last_error: null,
      };
    },
  };

  const restored = await service.restore_completion_handoff(issue);

  assert.equal(restored, true);
  assert.equal(service.awaiting_completion.has(issue.id), true);
  assert.equal(service.should_dispatch(issue, false), false);
  assert.equal(service.get_issue_snapshot(issue.identifier).status, 'awaiting_completion');
});

test('a restarted service delivers a crash-only handoff marker to Linear', async () => {
  const service = createService();
  const issue = createIssue({ id: 'issue-crash', identifier: 'CRE-CRASH', state: 'claimed' });
  const calls = { comments: 0, persisted: [] };
  const marker = {
    schema_version: 'symphony-evidence-handoff-marker.v1',
    issue_id: issue.id,
    issue_identifier: issue.identifier,
    workspace_path: '/tmp/symphony/CRE-CRASH',
    workspace_metadata_path: '/tmp/symphony/.metadata/CRE-CRASH.json',
    evidence_recorded: false,
    comment_attempts: 0,
    last_error: null,
    handoff: {
      schema_version: 'symphony-evidence-handoff.v1',
      issue: issue.identifier,
      status: 'worker_completed_evidence_only',
      eligible_for_done: false,
      workspace_path: '/tmp/symphony/CRE-CRASH',
      turn_count: 1,
      worker_message: 'Worker completed before Symphony crashed.',
      next_decision: 'Review the preserved workspace.',
    },
  };
  service.tracker = {
    async comment_issue() {
      calls.comments += 1;
    },
  };
  service.workspace_manager = {
    async read_completion_handoff() {
      return marker;
    },
    async write_completion_handoff(_identifier, state) {
      calls.persisted.push(state);
      return state;
    },
  };

  const restored = await service.restore_completion_handoff(issue);

  assert.equal(restored, true);
  assert.equal(calls.comments, 1);
  assert.equal(calls.persisted.at(-1).evidence_recorded, true);
  assert.equal(service.awaiting_completion.get(issue.id).evidence_recorded, true);
  assert.equal(service.should_dispatch(issue, false), false);
});

test('terminal awaiting-completion issues are reconciled without a service restart', async () => {
  const service = createService();
  const issue = createIssue({ id: 'issue-terminal', identifier: 'CRE-TERMINAL', state: 'claimed' });
  const calls = { remove: 0 };
  service.awaiting_completion.set(issue.id, {
    issue_id: issue.id,
    issue_identifier: issue.identifier,
    workspace_path: '/tmp/symphony/CRE-TERMINAL',
    workspace_metadata_path: '/tmp/symphony/.metadata/CRE-TERMINAL.json',
    evidence_recorded: true,
    comment_attempts: 1,
    last_error: null,
  });
  service.tracker = {
    async fetch_issue_states_by_ids(ids) {
      assert.deepEqual(ids, [issue.id]);
      return [{ ...issue, state: 'done' }];
    },
  };
  service.workspace_manager = {
    async remove_workspace(identifier) {
      assert.equal(identifier, issue.identifier);
      calls.remove += 1;
    },
  };

  await service.reconcile_running_issues();

  assert.equal(calls.remove, 1);
  assert.equal(service.awaiting_completion.has(issue.id), false);
});

test('a corrupt durable handoff fails closed after restart', async () => {
  const service = createService();
  const issue = createIssue({ id: 'issue-corrupt', identifier: 'CRE-CORRUPT', state: 'claimed' });
  service.workspace_manager = {
    async read_completion_handoff() {
      throw new Error('completion marker is corrupt');
    },
    get_workspace_paths() {
      return {
        workspace_path: '/tmp/symphony/CRE-CORRUPT',
        metadata_path: '/tmp/symphony/.metadata/CRE-CORRUPT.json',
      };
    },
  };

  const restored = await service.restore_completion_handoff(issue);

  assert.equal(restored, true);
  assert.equal(service.should_dispatch(issue, false), false);
  assert.equal(service.get_issue_snapshot(issue.identifier).last_error, 'completion marker is corrupt');
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

test('legacy completion continues when its gate-bypass warning comment fails', async () => {
  const service = createService();
  const issue = createIssue({ id: 'issue-legacy-warning', identifier: 'CRE-LEGACY-WARNING', state: 'claimed' });
  const calls = { complete: 0, comments: 0, remove: 0 };
  service.current_config.completion.mode = 'worker_exit_legacy';
  service.started = true;
  service.tracker = {
    async complete_issue() {
      calls.complete += 1;
    },
    async comment_issue() {
      calls.comments += 1;
      throw new Error('temporary warning comment failure');
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
    workspace_path: '/tmp/symphony/CRE-LEGACY-WARNING',
    workspace_metadata_path: '/tmp/symphony/CRE-LEGACY-WARNING/.symphony-workspace.json',
    stop_behavior: { mode: 'default' },
  });

  await service.on_worker_exit(issue.id, {
    status: 'completed',
    turn_count: 1,
    final_message: 'Legacy worker finished.',
  });

  assert.equal(calls.comments, 1);
  assert.equal(calls.complete, 1);
  assert.equal(calls.remove, 1);
  assert.equal(service.claimed.has(issue.id), false);
});
