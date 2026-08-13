import { createHmac, timingSafeEqual } from 'node:crypto';
import { WebhookVerificationError, type WebhookEvent } from '@notionhq/workers';
import type { EvidenceWebhookReceipt } from './contracts.js';
import { stableId } from './ids.js';

const SIGNATURE_HEADER = 'x-runbook-signature-256';

export function signWebhookBody(rawBody: string, secret: string): string {
  return `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;
}

export function verifyWebhookSignature(
  rawBody: string,
  headers: Record<string, string>,
  secret: string | undefined
): void {
  if (!secret) {
    throw new WebhookVerificationError('RUNBOOK_WEBHOOK_SECRET is not configured.');
  }
  const signature = Object.entries(headers).find(
    ([name]) => name.toLowerCase() === SIGNATURE_HEADER
  )?.[1];
  const expected = signWebhookBody(rawBody, secret);
  if (!signature || signature.length !== expected.length) {
    throw new WebhookVerificationError('Invalid runbook webhook signature.');
  }
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new WebhookVerificationError('Invalid runbook webhook signature.');
  }
}

export function buildEvidenceWebhookReceipt(event: WebhookEvent): EvidenceWebhookReceipt {
  const runbookId = readRequiredString(event.body, 'runbookId');
  const evidenceType = readRequiredString(event.body, 'evidenceType');
  const source = readRequiredString(event.body, 'source');
  return {
    receiptId: stableId('webhook', [event.deliveryId, runbookId, evidenceType, source]),
    deliveryId: event.deliveryId,
    runbookId,
    evidenceType,
    source,
    status: 'accepted'
  };
}

export function processEvidenceWebhookEvents(
  events: WebhookEvent[],
  secret: string | undefined
): EvidenceWebhookReceipt[] {
  return events.map((event) => {
    verifyWebhookSignature(event.rawBody, event.headers, secret);
    return buildEvidenceWebhookReceipt(event);
  });
}

function readRequiredString(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Webhook body requires a non-empty ${key}.`);
  }
  return value.trim();
}
