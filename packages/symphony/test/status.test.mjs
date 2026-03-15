import assert from 'node:assert/strict';
import test from 'node:test';

import { summarize_task_events } from '../src/status.js';

test('summarize_task_events keeps historical failures without surfacing an active error after success', () => {
  const summary = summarize_task_events([
    {
      timestamp: '2026-03-15T03:10:00.000Z',
      run_id: 'sym-status',
      lane: 'code-quality',
      agent_id: 'symphony-code-quality',
      task_id: 'lm-status-2',
      phase: 'codex_start',
      status: 'succeeded',
      workspace_path: '/tmp/workspaces/lm-status-2',
    },
    {
      timestamp: '2026-03-15T03:11:00.000Z',
      run_id: 'sym-status',
      lane: 'code-quality',
      agent_id: 'symphony-code-quality',
      task_id: 'lm-status-2',
      phase: 'codex_turn',
      status: 'failed',
      workspace_path: '/tmp/workspaces/lm-status-2',
      error: {
        class: 'StalledSessionError',
        message: 'stalled session',
        retryable: true,
      },
    },
    {
      timestamp: '2026-03-15T03:12:00.000Z',
      run_id: 'sym-status',
      lane: 'code-quality',
      agent_id: 'symphony-code-quality',
      task_id: 'lm-status-2',
      phase: 'cleanup',
      status: 'succeeded',
      workspace_path: '/tmp/workspaces/lm-status-2',
    },
  ]);

  assert.equal(summary.status, 'succeeded');
  assert.equal(summary.phase, 'cleanup');
  assert.equal(summary.last_error, null);
  assert.equal(summary.last_failure.phase, 'codex_turn');
  assert.equal(summary.last_failure.error.class, 'StalledSessionError');
});

test('summarize_task_events surfaces the active error when the latest event failed', () => {
  const summary = summarize_task_events([
    {
      timestamp: '2026-03-15T03:10:00.000Z',
      run_id: 'sym-status',
      lane: 'code-quality',
      agent_id: 'symphony-code-quality',
      task_id: 'lm-status-3',
      phase: 'codex_start',
      status: 'succeeded',
    },
    {
      timestamp: '2026-03-15T03:12:00.000Z',
      run_id: 'sym-status',
      lane: 'code-quality',
      agent_id: 'symphony-code-quality',
      task_id: 'lm-status-3',
      phase: 'codex_turn',
      status: 'failed',
      error: {
        class: 'StalledSessionError',
        message: 'stalled session',
        retryable: true,
      },
    },
  ]);

  assert.equal(summary.status, 'failed');
  assert.equal(summary.last_error.class, 'StalledSessionError');
  assert.equal(summary.last_failure.error.message, 'stalled session');
});

test('summarize_task_events uses current time for active run elapsed reporting', () => {
  const now = Date.now();
  const summary = summarize_task_events([
    {
      timestamp: new Date(now - 10_000).toISOString(),
      run_id: 'sym-status',
      lane: 'code-quality',
      agent_id: 'symphony-code-quality',
      task_id: 'lm-status-4',
      phase: 'claim',
      status: 'succeeded',
    },
    {
      timestamp: new Date(now - 9_000).toISOString(),
      run_id: 'sym-status',
      lane: 'code-quality',
      agent_id: 'symphony-code-quality',
      task_id: 'lm-status-4',
      phase: 'after_create',
      status: 'started',
    },
  ]);

  assert.equal(summary.state, 'running');
  assert.ok(summary.elapsed_ms >= 8_000, `expected active elapsed >= 8000ms, got ${summary.elapsed_ms}`);
});
