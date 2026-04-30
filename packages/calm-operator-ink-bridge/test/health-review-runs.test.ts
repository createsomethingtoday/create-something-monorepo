import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildHealthReviewRunRecord,
  normalizeHealthReviewRunLimit,
  rowHealthReviewRun
} from '../src/health-review-runs.js';
import type { HealthReviewReport } from '../src/types.js';

const report: HealthReviewReport = {
  ok: true,
  state: 'health_attention',
  generated_at: '2026-04-30T12:00:00.000Z',
  checked: 3,
  healthy_count: 1,
  poor_count: 1,
  stale_count: 1,
  stale_after_ms: 1000,
  headline: 'HEALTH ATTENTION',
  summary: '1 poor, 1 stale health checks',
  detail: 'Hub MCP: failed - down',
  action: 'Review agent/MCP health source',
  urgent: true,
  items: []
};

test('builds completed health review run records from reports', () => {
  const run = buildHealthReviewRunRecord({
    id: 'run-1',
    trigger: 'scheduled',
    status: 'completed',
    startedAt: 100,
    finishedAt: 175,
    collectedCount: 4,
    report,
    payload: { collected: [{ component: 'Hub MCP', ok: false }] }
  });

  assert.equal(run.id, 'run-1');
  assert.equal(run.trigger, 'scheduled');
  assert.equal(run.status, 'completed');
  assert.equal(run.ok, true);
  assert.equal(run.state, 'health_attention');
  assert.equal(run.collected_count, 4);
  assert.equal(run.checked, 3);
  assert.equal(run.poor_count, 1);
  assert.equal(run.stale_count, 1);
  assert.equal(run.urgent, true);
  assert.equal(run.duration_ms, 75);
  assert.equal(run.error, '');
});

test('builds failed health review run records with bounded error text', () => {
  const run = buildHealthReviewRunRecord({
    id: 'run-2',
    trigger: '',
    status: 'failed',
    startedAt: 200,
    finishedAt: 250,
    error: `failed ${'x'.repeat(700)}`
  });

  assert.equal(run.trigger, 'unknown');
  assert.equal(run.status, 'failed');
  assert.equal(run.ok, false);
  assert.equal(run.state, 'failed');
  assert.equal(run.checked, 0);
  assert.equal(run.report, null);
  assert.equal(run.error.length, 500);
});

test('normalizes health review run history limits', () => {
  assert.equal(normalizeHealthReviewRunLimit(undefined), 20);
  assert.equal(normalizeHealthReviewRunLimit('0'), 20);
  assert.equal(normalizeHealthReviewRunLimit('7'), 7);
  assert.equal(normalizeHealthReviewRunLimit(200), 100);
});

test('maps persisted health review run rows', () => {
  const run = rowHealthReviewRun({
    id: 'run-3',
    trigger: 'manual',
    status: 'completed',
    ok: 1,
    state: 'clear',
    collected_count: 2,
    checked: 2,
    healthy_count: 2,
    poor_count: 0,
    stale_count: 0,
    urgent: 0,
    started_at: 300,
    finished_at: 360,
    duration_ms: 60,
    error: '',
    report_json: JSON.stringify({ ...report, state: 'clear', urgent: false }),
    payload_json: JSON.stringify({ collected: [] })
  });

  assert.equal(run.id, 'run-3');
  assert.equal(run.ok, true);
  assert.equal(run.urgent, false);
  assert.equal(run.report?.state, 'clear');
  assert.deepEqual(run.payload, { collected: [] });
});
