import assert from 'node:assert/strict';
import test from 'node:test';
import type { WebhookEvent } from '@notionhq/workers';
import { WebhookVerificationError } from '@notionhq/workers';
import {
  processEvidenceWebhookEvents,
  signWebhookBody,
  verifyWebhookSignature
} from './webhook.js';

const secret = 'synthetic-test-secret';
const rawBody = JSON.stringify({
  runbookId: 'runbook-demo',
  evidenceType: 'smoke',
  source: 'local-test'
});

test('webhook signature verification fails closed', () => {
  assert.throws(() => verifyWebhookSignature(rawBody, {}, secret), WebhookVerificationError);
  assert.throws(
    () => verifyWebhookSignature(rawBody, { 'x-runbook-signature-256': 'sha256=bad' }, secret),
    WebhookVerificationError
  );
});

test('verified webhook emits a deterministic receipt', () => {
  const event: WebhookEvent = {
    deliveryId: 'delivery-demo-1',
    body: JSON.parse(rawBody) as Record<string, unknown>,
    rawBody,
    headers: { 'x-runbook-signature-256': signWebhookBody(rawBody, secret) },
    method: 'POST'
  };
  const first = processEvidenceWebhookEvents([event], secret)[0];
  const second = processEvidenceWebhookEvents([event], secret)[0];
  assert.equal(first.status, 'accepted');
  assert.equal(first.receiptId, second.receiptId);
});

test('signature header matching is case-insensitive', () => {
  assert.doesNotThrow(() =>
    verifyWebhookSignature(
      rawBody,
      { 'X-Runbook-Signature-256': signWebhookBody(rawBody, secret) },
      secret
    )
  );
});
