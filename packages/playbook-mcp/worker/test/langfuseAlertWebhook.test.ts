import assert from 'node:assert/strict';
import { test } from 'node:test';

import { handleLangfuseAlertWebhook } from '../langfuseAlertWebhook.js';

const secret = 'test-signing-secret';
const nowMs = Date.parse('2026-08-13T00:00:00.000Z');
const timestamp = String(Math.floor(nowMs / 1000));
const payload = JSON.stringify({
  id: 'alert-event-1',
  timestamp: '2026-08-13T00:00:00.000Z',
  type: 'monitor-alert',
  apiVersion: 'v1',
  payload: {
    monitorId: 'monitor-1',
    projectId: 'project-1',
    permalink: 'https://us.cloud.langfuse.com/project/project-1/alerts/monitor-1',
    message: {
      title: 'execution_success crossed alert threshold',
      body: 'execution_success is 0 (threshold: 1) over the last 1 hour'
    },
    severity: 'ALERT',
    timestamp: '2026-08-13T00:00:00.000Z',
    fromTimestamp: '2026-08-12T23:00:00.000Z',
    toTimestamp: '2026-08-13T00:00:00.000Z',
    view: 'scores-boolean',
    filters: [],
    window: '1h'
  }
});

async function signature(body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const bytes = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${timestamp}.${body}`)
  );
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

test('accepts a current signed Langfuse monitor alert and delivers it once', async () => {
  const delivered: unknown[] = [];
  const response = await handleLangfuseAlertWebhook(
    new Request('https://playbook.mcp.createsomething.ltd/webhooks/langfuse/alerts', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-langfuse-signature': `t=${timestamp},v1=${await signature(payload)}`
      },
      body: payload
    }),
    {
      signingSecret: secret,
      nowMs,
      deliver: async (alert) => {
        delivered.push(alert);
      }
    }
  );

  assert.equal(response.status, 202);
  assert.equal(delivered.length, 1);
  assert.deepEqual(await response.json(), { accepted: true, eventId: 'alert-event-1' });
});

test('rejects a forged signature without delivering the alert', async () => {
  let delivered = false;
  const response = await handleLangfuseAlertWebhook(
    new Request('https://playbook.mcp.createsomething.ltd/webhooks/langfuse/alerts', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-langfuse-signature': `t=${timestamp},v1=${'0'.repeat(64)}`
      },
      body: payload
    }),
    {
      signingSecret: secret,
      nowMs,
      deliver: async () => {
        delivered = true;
      }
    }
  );

  assert.equal(response.status, 401);
  assert.equal(delivered, false);
});

test('rejects signed requests older than five minutes', async () => {
  const response = await handleLangfuseAlertWebhook(
    new Request('https://playbook.mcp.createsomething.ltd/webhooks/langfuse/alerts', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-langfuse-signature': `t=${timestamp},v1=${await signature(payload)}`
      },
      body: payload
    }),
    {
      signingSecret: secret,
      nowMs: nowMs + 301_000,
      deliver: async () => undefined
    }
  );

  assert.equal(response.status, 401);
});
