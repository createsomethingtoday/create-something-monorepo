import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildOperatorRoutingResponse } from '../src/operator-routing.js';
import type { OperatorBrief } from '../src/types.js';

test('routes unassigned priority Linear work to claim first', () => {
  const response = buildOperatorRoutingResponse({
    now: Date.parse('2026-06-22T18:00:00.000Z'),
    queue: {
      ok: true,
      team: 'CRE',
      generated_at: '2026-06-22T18:00:00.000Z',
      issues: [
        {
          identifier: 'CRE-10',
          title: 'Normal assigned item',
          url: 'https://linear.app/createsomething/issue/CRE-10',
          priority: 3,
          updatedAt: '2026-06-22T17:00:00.000Z',
          state: { name: 'Todo', type: 'unstarted' },
          assignee: 'Micah Johnson',
          project: null
        },
        {
          identifier: 'CRE-11',
          title: 'Urgent unassigned item',
          url: 'https://linear.app/createsomething/issue/CRE-11',
          priority: 1,
          updatedAt: '2026-06-20T17:00:00.000Z',
          state: { name: 'Todo', type: 'unstarted' },
          assignee: null,
          project: 'Even'
        }
      ]
    }
  });

  assert.equal(response.issue?.identifier, 'CRE-11');
  assert.equal(response.primary_action, 'claim');
  assert.equal(response.issue?.reason_code, 'urgent_linear_priority');
  assert.deepEqual(response.available_actions, ['claim', 'prep', 'open']);
  assert.ok(response.confidence >= 80);
});

test('keeps blocked assigned work as a prep-first route', () => {
  const response = buildOperatorRoutingResponse({
    now: Date.parse('2026-06-22T18:00:00.000Z'),
    queue: {
      ok: true,
      team: 'CRE',
      generated_at: '2026-06-22T18:00:00.000Z',
      issues: [
        {
          identifier: 'CRE-12',
          title: 'Blocked package validation',
          url: 'https://linear.app/createsomething/issue/CRE-12',
          priority: 2,
          updatedAt: '2026-06-21T18:00:00.000Z',
          state: { name: 'Blocked', type: 'started' },
          assignee: 'Micah Johnson',
          project: 'Even'
        }
      ]
    }
  });

  assert.equal(response.issue?.identifier, 'CRE-12');
  assert.equal(response.primary_action, 'prep');
  assert.equal(response.issue?.reason_code, 'blocked_linear_issue');
  assert.deepEqual(response.available_actions, ['prep', 'open']);
});

test('folds an active operator brief into the routing headline', () => {
  const brief = {
    state: 'health_attention',
    headline: 'HEALTH ATTENTION',
    line1: 'Bridge smoke failing',
    line2: 'Route health is degraded',
    detail: 'Smoke returned 500.',
    action: 'Review bridge deploy',
    urgent: true,
    generated_at: '2026-06-22T18:00:00.000Z',
    clock: {
      timezone: 'America/Chicago',
      generated_at: '2026-06-22T18:00:00.000Z',
      local_date: '2026-06-22',
      local_time: '13:00',
      display_time: '1:00 PM',
      hour: 13,
      minute: 0
    },
    surface: 'core-ink',
    counts: { active_alerts: 1, poor_health: 1 }
  } satisfies OperatorBrief;

  const response = buildOperatorRoutingResponse({
    brief,
    queue: {
      ok: true,
      team: 'CRE',
      generated_at: '2026-06-22T18:00:00.000Z',
      issues: []
    }
  });

  assert.equal(response.headline, 'HEALTH ATTENTION: Bridge smoke failing');
  assert.equal(response.reason_code, 'active_operator_brief');
  assert.equal(response.source_brief?.state, 'health_attention');
});
