import assert from 'node:assert/strict';
import test from 'node:test';
import {
  recordNewsletterDeliveryReceipt,
  type NewsletterDeliveryReceiptDatabase
} from '../src/lib/server/newsletter-delivery-receipt.ts';

test('delivery webhook records delivered state by provider receipt without recipient PII', async () => {
  const calls: Array<{ sql: string; values: unknown[] }> = [];
  const db: NewsletterDeliveryReceiptDatabase = {
    prepare(sql) {
      return {
        bind(...values) {
          return {
            async run() {
              calls.push({ sql, values });
              return { success: true };
            }
          };
        }
      };
    }
  };

  await recordNewsletterDeliveryReceipt(db, 'resend-safe-id', 'email.delivered');

  assert.equal(calls.length, 1);
  assert.match(calls[0]!.sql, /delivered_at/);
  assert.deepEqual(calls[0]!.values, ['delivered', 'delivered', null, 'resend-safe-id']);
  assert.equal(
    calls[0]!.values.some((value) => String(value).includes('@')),
    false
  );
});

test('open and click events are intentionally not stored', async () => {
  let called = false;
  const db: NewsletterDeliveryReceiptDatabase = {
    prepare() {
      called = true;
      throw new Error('should not write');
    }
  };

  await recordNewsletterDeliveryReceipt(db, 'resend-safe-id', 'email.opened');
  await recordNewsletterDeliveryReceipt(db, 'resend-safe-id', 'email.clicked');
  assert.equal(called, false);
});
