import assert from 'node:assert/strict';
import test from 'node:test';

import Stripe from 'stripe';

import { POST } from '../src/routes/api/stripe/webhook/+server.ts';

const webhookSecret = 'whsec_cre1288_local_contract';
const stripe = new Stripe('sk_test_cre1288_local_contract');

interface WebhookReceiptRecord {
  event_id: string;
  status: 'received' | 'processing' | 'processed' | 'failed';
  delivery_count: number;
  processing_attempts: number;
  livemode: number;
  last_error: string | null;
}

interface MapEntitlementRecord {
  account_id: string;
  workspace_account_id: string;
  plan_id: string;
  cadence: string;
  stripe_subscription_id: string | null;
  subscription_status: string;
  entitlement_status: string;
  billing_active: number;
}

class TestD1Database {
  readonly webhookReceipts = new Map<string, WebhookReceiptRecord>();
  readonly entitlements = new Map<string, MapEntitlementRecord>();

  prepare(sql: string) {
    let values: unknown[] = [];
    const prepared = {
      bind: (...nextValues: unknown[]) => {
        values = nextValues;
        return prepared;
      },
      run: async () => {
        const changes = this.run(sql, values);
        return { success: true, meta: { changes } };
      },
      first: async <T>() => this.first<T>(sql, values)
    };
    return prepared;
  }

  row<T extends Record<string, unknown>>(sql: string, ...values: unknown[]): T {
    const normalized = this.normalize(sql);
    let row: Record<string, unknown> | undefined;

    if (normalized.includes('FROM agency_map_entitlements WHERE stripe_subscription_id = ?')) {
      const entitlement = [...this.entitlements.values()].find(
        (candidate) => candidate.stripe_subscription_id === values[0]
      );
      if (entitlement) {
        row = normalized.startsWith('SELECT plan_id')
          ? {
              plan_id: entitlement.plan_id,
              cadence: entitlement.cadence,
              entitlement_status: entitlement.entitlement_status,
              billing_active: entitlement.billing_active
            }
          : {
              subscription_status: entitlement.subscription_status,
              entitlement_status: entitlement.entitlement_status,
              billing_active: entitlement.billing_active
            };
      }
    } else if (
      normalized.includes('FROM stripe_webhook_events') &&
      normalized.includes('COUNT(*) AS total')
    ) {
      const receipts = [...this.webhookReceipts.values()];
      row = {
        total: receipts.length,
        processed: receipts.filter((receipt) => receipt.status === 'processed').length,
        live_events: receipts.reduce((total, receipt) => total + receipt.livemode, 0)
      };
    } else if (normalized.startsWith('SELECT delivery_count FROM stripe_webhook_events')) {
      const receipt = this.webhookReceipts.get(String(values[0]));
      if (receipt) row = { delivery_count: receipt.delivery_count };
    } else if (normalized.startsWith('SELECT COUNT(*) AS count FROM stripe_webhook_events')) {
      row = { count: this.webhookReceipts.size };
    }

    assert.ok(row, `Expected a row for: ${sql}`);
    return row as T;
  }

  private normalize(sql: string): string {
    return sql.replace(/\s+/g, ' ').trim();
  }

  private run(sql: string, values: unknown[]): number {
    const normalized = this.normalize(sql);

    if (normalized.startsWith('INSERT INTO stripe_webhook_events')) {
      const eventId = String(values[0]);
      const existing = this.webhookReceipts.get(eventId);
      if (existing) {
        existing.delivery_count += 1;
        if (existing.status === 'failed') existing.status = 'received';
      } else {
        this.webhookReceipts.set(eventId, {
          event_id: eventId,
          status: 'received',
          delivery_count: 1,
          processing_attempts: 0,
          livemode: Number(values[3]),
          last_error: null
        });
      }
      return 1;
    }

    if (normalized.startsWith("UPDATE stripe_webhook_events SET status = 'processing'")) {
      const receipt = this.webhookReceipts.get(String(values[0]));
      if (!receipt || !['received', 'failed'].includes(receipt.status)) return 0;
      receipt.status = 'processing';
      receipt.processing_attempts += 1;
      receipt.last_error = null;
      return 1;
    }

    if (normalized.startsWith("UPDATE stripe_webhook_events SET status = 'processed'")) {
      const receipt = this.webhookReceipts.get(String(values[0]));
      assert.ok(receipt);
      receipt.status = 'processed';
      receipt.last_error = null;
      return 1;
    }

    if (normalized.startsWith("UPDATE stripe_webhook_events SET status = 'failed'")) {
      const receipt = this.webhookReceipts.get(String(values[1]));
      assert.ok(receipt);
      receipt.status = 'failed';
      receipt.last_error = String(values[0]);
      return 1;
    }

    if (normalized.startsWith('INSERT INTO agency_map_entitlements')) {
      const accountId = String(values[3]);
      const workspaceAccountId = String(values[5]);
      this.entitlements.set(`${accountId}:${workspaceAccountId}`, {
        account_id: accountId,
        workspace_account_id: workspaceAccountId,
        plan_id: String(values[6]),
        cadence: String(values[7]),
        stripe_subscription_id: values[9] ? String(values[9]) : null,
        subscription_status: String(values[10]),
        entitlement_status: String(values[11]),
        billing_active: Number(values[12])
      });
      return 1;
    }

    if (normalized.startsWith('UPDATE agency_map_entitlements SET billing_active = ?')) {
      const entitlement = [...this.entitlements.values()].find(
        (candidate) => candidate.stripe_subscription_id === values[3]
      );
      if (!entitlement) return 0;
      entitlement.billing_active = Number(values[0]);
      entitlement.subscription_status = String(values[1]);
      entitlement.entitlement_status = String(values[2]);
      return 1;
    }

    if (
      normalized.startsWith('INSERT INTO agency_commercial_accounts') ||
      normalized.startsWith('INSERT INTO agent_error_logs')
    ) {
      return 1;
    }

    throw new Error(`Unhandled TestD1 mutation: ${normalized}`);
  }

  private first<T>(sql: string, values: unknown[]): T | null {
    const normalized = this.normalize(sql);
    if (normalized.startsWith('SELECT status, processing_attempts FROM stripe_webhook_events')) {
      const receipt = this.webhookReceipts.get(String(values[0]));
      if (!receipt) return null;
      return {
        status: receipt.status,
        processing_attempts: receipt.processing_attempts
      } as T;
    }
    throw new Error(`Unhandled TestD1 query: ${normalized}`);
  }
}

function mapMetadata(planId: 'map-monthly' | 'map-yearly', suffix = 'test') {
  return {
    product_id: planId,
    auth_subject: `identity_cre1288_${suffix}`,
    account_id: `acct_cre1288_${suffix}`,
    tenant_id: `tenant_cre1288_${suffix}`,
    workspace_account_id: `acct_cre1288_${suffix}`,
    customer_email: `map-cre1288-${suffix}@createsomething.invalid`
  };
}

function makeEvent(id: string, type: string, object: Record<string, unknown>) {
  return {
    id,
    object: 'event',
    api_version: '2025-06-30.basil',
    created: Math.floor(Date.now() / 1000),
    data: { object },
    livemode: false,
    pending_webhooks: 1,
    request: { id: `req_${id}`, idempotency_key: null },
    type
  };
}

async function deliver(input: {
  db: TestD1Database;
  waiters: Promise<unknown>[];
  event: ReturnType<typeof makeEvent>;
  signature?: string;
}) {
  const body = JSON.stringify(input.event);
  const signature =
    input.signature ??
    stripe.webhooks.generateTestHeaderString({ payload: body, secret: webhookSecret });
  const response = await POST({
    request: new Request('https://createsomething.agency/api/stripe/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': signature },
      body
    }),
    platform: {
      env: {
        DB: input.db as unknown as D1Database,
        STRIPE_SECRET_KEY: 'sk_test_cre1288_local_contract',
        STRIPE_WEBHOOK_SECRET: webhookSecret
      },
      context: {
        waitUntil: (promise: Promise<unknown>) => input.waiters.push(promise)
      }
    }
  } as never);

  while (input.waiters.length > 0) {
    await Promise.all(input.waiters.splice(0));
  }
  return response;
}

function subscriptionEvent(
  status: 'active' | 'canceled',
  planId: 'map-monthly' | 'map-yearly' = 'map-monthly',
  suffix = 'contract'
) {
  return {
    id: `sub_cre1288_${suffix}`,
    object: 'subscription',
    status,
    customer: {
      id: 'cus_cre1288_contract',
      object: 'customer',
      email: `map-cre1288-${suffix}@createsomething.invalid`
    },
    metadata: mapMetadata(planId, suffix),
    cancel_at_period_end: false,
    items: {
      data: [
        {
          price: { id: 'price_cre1288_monthly' },
          current_period_end: Math.floor(Date.now() / 1000) + 2_592_000
        }
      ]
    }
  };
}

function invoiceEvent(status: 'paid' | 'payment_failed') {
  return {
    id: `in_cre1288_${status}`,
    object: 'invoice',
    customer: 'cus_cre1288_contract',
    customer_email: 'map-cre1288-test@createsomething.invalid',
    amount_paid: status === 'paid' ? 100 : 0,
    amount_due: 100,
    currency: 'usd',
    hosted_invoice_url: 'https://invoice.stripe.test/cre1288',
    parent: {
      type: 'subscription_details',
      subscription_details: { subscription: 'sub_cre1288_contract' }
    }
  };
}

test('signed Stripe events drive Map entitlement failure, recovery, cancellation, and durable receipts', async (t) => {
  t.mock.method(console, 'debug', () => {});
  t.mock.method(console, 'info', () => {});
  t.mock.method(console, 'warn', () => {});
  t.mock.method(console, 'error', () => {});
  const db = new TestD1Database();
  const waiters: Promise<unknown>[] = [];

  const activeResponse = await deliver({
    db,
    waiters,
    event: makeEvent(
      'evt_cre1288_active',
      'customer.subscription.created',
      subscriptionEvent('active')
    )
  });
  assert.equal(activeResponse.status, 200);
  assert.deepEqual(
    db.row<{ subscription_status: string; entitlement_status: string; billing_active: number }>(
      `SELECT subscription_status, entitlement_status, billing_active
			 FROM agency_map_entitlements WHERE stripe_subscription_id = ?`,
      'sub_cre1288_contract'
    ),
    { subscription_status: 'active', entitlement_status: 'active', billing_active: 1 }
  );

  await deliver({
    db,
    waiters,
    event: makeEvent('evt_cre1288_failed', 'invoice.payment_failed', invoiceEvent('payment_failed'))
  });
  assert.deepEqual(
    db.row<{ subscription_status: string; entitlement_status: string; billing_active: number }>(
      `SELECT subscription_status, entitlement_status, billing_active
			 FROM agency_map_entitlements WHERE stripe_subscription_id = ?`,
      'sub_cre1288_contract'
    ),
    {
      subscription_status: 'payment_failed',
      entitlement_status: 'payment_failed',
      billing_active: 0
    }
  );

  await deliver({
    db,
    waiters,
    event: makeEvent('evt_cre1288_paid', 'invoice.paid', invoiceEvent('paid'))
  });
  assert.deepEqual(
    db.row<{ subscription_status: string; entitlement_status: string; billing_active: number }>(
      `SELECT subscription_status, entitlement_status, billing_active
			 FROM agency_map_entitlements WHERE stripe_subscription_id = ?`,
      'sub_cre1288_contract'
    ),
    { subscription_status: 'paid', entitlement_status: 'active', billing_active: 1 }
  );

  await deliver({
    db,
    waiters,
    event: makeEvent(
      'evt_cre1288_canceled',
      'customer.subscription.deleted',
      subscriptionEvent('canceled')
    )
  });
  assert.deepEqual(
    db.row<{ subscription_status: string; entitlement_status: string; billing_active: number }>(
      `SELECT subscription_status, entitlement_status, billing_active
			 FROM agency_map_entitlements WHERE stripe_subscription_id = ?`,
      'sub_cre1288_contract'
    ),
    { subscription_status: 'canceled', entitlement_status: 'canceled', billing_active: 0 }
  );

  await deliver({
    db,
    waiters,
    event: makeEvent(
      'evt_cre1288_yearly',
      'customer.subscription.created',
      subscriptionEvent('active', 'map-yearly', 'yearly')
    )
  });
  assert.deepEqual(
    db.row<{
      plan_id: string;
      cadence: string;
      entitlement_status: string;
      billing_active: number;
    }>(
      `SELECT plan_id, cadence, entitlement_status, billing_active
			 FROM agency_map_entitlements WHERE stripe_subscription_id = ?`,
      'sub_cre1288_yearly'
    ),
    { plan_id: 'map-yearly', cadence: 'yearly', entitlement_status: 'active', billing_active: 1 }
  );

  assert.deepEqual(
    db.row<{ total: number; processed: number; live_events: number }>(
      `SELECT COUNT(*) AS total,
			        SUM(CASE WHEN status = 'processed' THEN 1 ELSE 0 END) AS processed,
			        SUM(livemode) AS live_events
			 FROM stripe_webhook_events`
    ),
    { total: 5, processed: 5, live_events: 0 }
  );

  const duplicate = await deliver({
    db,
    waiters,
    event: makeEvent(
      'evt_cre1288_canceled',
      'customer.subscription.deleted',
      subscriptionEvent('canceled')
    )
  });
  assert.deepEqual(await duplicate.json(), {
    received: true,
    duplicate: true,
    status: 'processed'
  });
  assert.equal(
    db.row<{ delivery_count: number }>(
      'SELECT delivery_count FROM stripe_webhook_events WHERE event_id = ?',
      'evt_cre1288_canceled'
    ).delivery_count,
    2
  );
});

test('Stripe webhook rejects a payload without a valid signature before writing state', async (t) => {
  t.mock.method(console, 'error', () => {});
  const db = new TestD1Database();
  await assert.rejects(
    () =>
      deliver({
        db,
        waiters: [],
        event: makeEvent('evt_cre1288_invalid', 'invoice.paid', invoiceEvent('paid')),
        signature: 't=0,v1=invalid'
      }),
    (error: unknown) => (error as { status?: number }).status === 400
  );
  assert.equal(
    db.row<{ count: number }>('SELECT COUNT(*) AS count FROM stripe_webhook_events').count,
    0
  );
});
