import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildHealthReviewReport } from '../src/health-review.js';
import type { StoredHealthSnapshot } from '../src/types.js';

function health(overrides: Partial<StoredHealthSnapshot>): StoredHealthSnapshot {
  return {
    id: 'health-1',
    source: 'mcp-review',
    component: 'MCP review agent',
    status: 'healthy',
    summary: 'ok',
    detail: '',
    severity: 0,
    observed_at: 1,
    updated_at: 1,
    payload: {},
    ...overrides
  };
}

test('builds a clear health review report when checks are healthy', () => {
  const report = buildHealthReviewReport({
    health: [health({ updated_at: 900 })],
    now: 1000,
    staleAfterMs: 1000
  });

  assert.equal(report.state, 'clear');
  assert.equal(report.checked, 1);
  assert.equal(report.healthy_count, 1);
  assert.equal(report.poor_count, 0);
  assert.equal(report.stale_count, 0);
});

test('marks poor health checks as attention-worthy', () => {
  const report = buildHealthReviewReport({
    health: [
      health({
        id: 'agent-fail',
        status: 'failed',
        component: 'Registry review agent',
        summary: 'MCP registry review failed',
        severity: 85,
        updated_at: 950
      })
    ],
    now: 1000,
    staleAfterMs: 1000
  });

  assert.equal(report.state, 'health_attention');
  assert.equal(report.poor_count, 1);
  assert.equal(report.urgent, true);
  assert.match(report.detail, /Registry review agent/);
});

test('marks stale health checks as attention-worthy', () => {
  const report = buildHealthReviewReport({
    health: [
      health({
        id: 'agent-stale',
        component: 'Claude Code Slack watcher',
        summary: 'Last heartbeat was too old',
        updated_at: 0
      })
    ],
    now: 5000,
    staleAfterMs: 1000
  });

  assert.equal(report.state, 'health_attention');
  assert.equal(report.stale_count, 1);
  assert.equal(report.urgent, true);
});
