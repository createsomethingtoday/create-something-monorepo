import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PRODUCTION_WATCHDOG_ALERT_COOLDOWN_SECONDS,
  buildWatchdogAlertEmail,
  evaluateProductionWatchdog
} from '../production-watchdog.js';

test('reminds about an unresolved production watchdog finding every six hours', () => {
  assert.equal(PRODUCTION_WATCHDOG_ALERT_COOLDOWN_SECONDS, 6 * 60 * 60);
});

test('reports a failed production health probe before a user has to', () => {
  assert.deepEqual(
    evaluateProductionWatchdog({
      healthOk: false,
      healthStatus: 503,
      invocationCount: 0,
      failureCount: 0,
      topErrors: []
    }),
    [
      {
        rule: 'health_probe_failed',
        message: 'CREATE SOMETHING Hub health probe returned HTTP 503.'
      }
    ]
  );
});

test('reports production MCP failures with their recurring error cluster', () => {
  assert.deepEqual(
    evaluateProductionWatchdog({
      healthOk: true,
      healthStatus: 200,
      invocationCount: 8,
      failureCount: 2,
      topErrors: [{ message: 'Connection expired', count: 2 }]
    }),
    [
      {
        rule: 'mcp_failures',
        message:
          '2 of 8 MCP invocations failed in the last 15 minutes (25.0%). Top error: Connection expired (2).'
      }
    ]
  );
});

test('stays quiet when the probe and recent invocations are healthy', () => {
  assert.deepEqual(
    evaluateProductionWatchdog({
      healthOk: true,
      healthStatus: 200,
      invocationCount: 12,
      failureCount: 0,
      topErrors: []
    }),
    []
  );
});

test('builds an operator email with a Langfuse correlation id', () => {
  const email = buildWatchdogAlertEmail({
    checkedAt: '2026-08-12T12:00:00.000Z',
    correlationId: 'watchdog-123',
    findings: [{ rule: 'mcp_failures', message: 'One production call failed.' }]
  });

  assert.equal(email.subject, '[CREATE SOMETHING] Production watchdog detected 1 issue');
  assert.match(email.text, /One production call failed\./);
  assert.match(email.text, /watchdog-123/);
});
