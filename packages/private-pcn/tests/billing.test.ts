import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import Stripe from 'stripe';
import {
  checkout,
  paidAccess,
  portal,
  processBillingEvent,
  refreshBilling
} from '../src/lib/server/billing';
import { POST as webhook } from '../src/routes/api/billing/webhook/+server';
import { POST as billingAction } from '../src/routes/api/networks/[slug]/billing/+server';
let sqlite: DatabaseSync;
let env: any;
const network = {
  id: 'alpha',
  slug: 'alpha',
  owner_id: 'owner',
  name: 'Alpha',
  description: '',
  format: 'academy',
  access_model: 'members',
  status: 'draft'
} as const;
function statement(sql: string, values: any[] = []): any {
  return {
    bind: (...args: any[]) => statement(sql, args),
    first: async () => sqlite.prepare(sql).get(...values) || null,
    all: async () => ({ results: sqlite.prepare(sql).all(...values) }),
    run: async () => ({ meta: { changes: sqlite.prepare(sql).run(...values).changes } })
  };
}
const price = {
  id: 'price_fixture',
  active: true,
  currency: 'usd',
  unit_amount: 2450,
  recurring: { interval: 'month', interval_count: 1 }
};
function provider() {
  return {
    prices: { retrieve: vi.fn(async () => price) },
    customers: {
      create: vi.fn(async () => ({ id: 'cus_fixture' })),
      retrieve: vi.fn(async () => ({
        id: 'cus_fixture',
        metadata: { network_id: 'alpha', owner_id: 'owner' }
      }))
    },
    invoicePayments: {
      list: vi.fn(async () => ({
        has_more: false,
        data: [
          { status: 'paid', payment: { type: 'payment_intent', payment_intent: 'pi_invoice' } }
        ]
      }))
    },
    paymentIntents: {
      retrieve: vi.fn(async () => ({
        id: 'pi_invoice',
        customer: 'cus_fixture',
        status: 'succeeded',
        latest_charge: {
          id: 'ch_invoice',
          paid: true,
          refunded: false,
          amount_refunded: 0,
          disputed: false
        }
      }))
    },
    subscriptions: { list: vi.fn(async () => ({ data: [], has_more: false })) },
    checkout: {
      sessions: {
        list: vi.fn(async () => ({ data: [], has_more: false })),
        create: vi.fn(async () => ({
          id: 'cs_fixture',
          url: 'https://checkout.stripe.com/fixture'
        }))
      }
    },
    billingPortal: {
      sessions: { create: vi.fn(async () => ({ url: 'https://billing.stripe.com/fixture' })) }
    }
  } as any;
}
function subscription(status = 'active') {
  return {
    id: 'sub_fixture',
    customer: 'cus_fixture',
    status,
    created: 1,
    livemode: false,
    latest_invoice: { id: 'in_fixture', status: 'paid' },
    metadata: { network_id: 'alpha', owner_id: 'owner' },
    pause_collection: null,
    cancel_at_period_end: false,
    items: {
      data: [{ price, quantity: 1, current_period_end: Math.floor(Date.now() / 1000) + 3600 }]
    }
  };
}
function seedBilling() {
  sqlite
    .prepare('INSERT INTO network_billing(network_id,customer_id,checkout_key) VALUES(?,?,?)')
    .run('alpha', 'cus_fixture', 'stable-key');
}
beforeEach(() => {
  sqlite = new DatabaseSync(':memory:');
  for (const migration of [
    '0001_private_pcn',
    '0002_network_ownership',
    '0003_resource_limits',
    '0004_subscriptions',
    '0008_creator_admission',
    '0010_company_support'
  ])
    sqlite.exec(readFileSync(new URL(`../migrations/${migration}.sql`, import.meta.url), 'utf8'));
  sqlite
    .prepare('INSERT INTO networks(id,slug,owner_id,name) VALUES(?,?,?,?)')
    .run('alpha', 'alpha', 'owner', 'Alpha');
  sqlite.exec(
    "INSERT INTO creator_applications(subject,email,display_name,credentials,teaching_video_url,status) VALUES('owner','owner@example.com','Builder','Experience','https://example.com/video','approved')"
  );
  env = {
    DB: { prepare: statement },
    STRIPE_SECRET_KEY: 'sk_test_fixture',
    STRIPE_PRICE_ID: 'price_fixture',
    STRIPE_WEBHOOK_SECRET: 'whsec_fixture',
    PCN_SELF_SERVICE_ENABLED: 'true',
    CLOUDFLARE_STREAM_API_TOKEN: 'fixture'
  };
});
afterEach(() => sqlite.close());

describe('billing lifecycle against migrated SQLite (supporting proof)', () => {
  it('creates server-priced checkout and reconciles a lost response without a second subscription', async () => {
    const stripe = provider();
    stripe.checkout.sessions.create.mockImplementationOnce(async () => {
      stripe.checkout.sessions.list.mockResolvedValue({
        data: [
          {
            id: 'cs_fixture',
            status: 'open',
            url: 'https://checkout.stripe.com/existing',
            metadata: { network_id: 'alpha', checkout_key: 'stable-key' }
          }
        ],
        has_more: false
      });
      throw new Error('response lost');
    });
    await expect(
      checkout(env, network, 'owner@example.com', 'https://private.createsomething.agency', stripe)
    ).rejects.toThrow('response lost');
    expect(
      await checkout(
        env,
        network,
        'owner@example.com',
        'https://private.createsomething.agency',
        stripe
      )
    ).toEqual({ url: 'https://checkout.stripe.com/existing' });
    expect(stripe.customers.create).toHaveBeenCalledTimes(1);
    expect(stripe.checkout.sessions.create).toHaveBeenCalledTimes(1);
    const [parameters, options] = stripe.checkout.sessions.create.mock.calls[0];
    expect(parameters).toMatchObject({
      mode: 'subscription',
      line_items: [{ price: 'price_fixture', quantity: 1 }],
      subscription_data: { metadata: { network_id: 'alpha', owner_id: 'owner' } }
    });
    expect(parameters).not.toHaveProperty('payment_method_types');
    expect(options.idempotencyKey).toMatch(/^pcn-checkout-alpha-/);
  });
  it('does not create a second checkout for an existing subscription', async () => {
    seedBilling();
    const stripe = provider();
    stripe.subscriptions.list.mockResolvedValue({ data: [subscription()], has_more: false });
    await expect(
      checkout(env, network, 'owner@example.com', 'https://private.createsomething.agency', stripe)
    ).rejects.toThrow('already exists');
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });
  it('uses current provider state for delayed events and ignores duplicate delivery', async () => {
    seedBilling();
    const stripe = provider();
    stripe.subscriptions.list.mockResolvedValue({
      data: [subscription('past_due')],
      has_more: false
    });
    const event = {
      id: 'evt_fixture',
      type: 'customer.subscription.updated',
      data: { object: subscription('active') }
    } as any;
    await processBillingEvent(env, event, stripe);
    expect(sqlite.prepare('SELECT status FROM networks WHERE id=?').get('alpha')?.status).toBe(
      'suspended'
    );
    expect(await paidAccess(env, network)).toBe(false);
    await processBillingEvent(env, event, stripe);
    expect(stripe.subscriptions.list).toHaveBeenCalledTimes(1);
  });
  it('keeps a canceled-at-period-end plan active until its verified period ends', async () => {
    seedBilling();
    const stripe = provider();
    const sub = subscription();
    sub.cancel_at_period_end = true;
    stripe.subscriptions.list.mockResolvedValue({ data: [sub], has_more: false });
    await refreshBilling(env, network, stripe);
    expect(await paidAccess(env, network)).toBe(true);
    sqlite.prepare('UPDATE network_billing SET period_end=1').run();
    expect(await paidAccess(env, network)).toBe(false);
  });
  it('does not activate paused collections or an unexpected plan', async () => {
    seedBilling();
    const stripe = provider();
    stripe.subscriptions.list.mockResolvedValue({
      data: [{ ...subscription(), pause_collection: { behavior: 'void' } }],
      has_more: false
    });
    await refreshBilling(env, network, stripe);
    expect(await paidAccess(env, network)).toBe(false);
    stripe.subscriptions.list.mockResolvedValue({
      data: [{ ...subscription(), metadata: { network_id: 'alpha', owner_id: 'other' } }],
      has_more: false
    });
    await expect(refreshBilling(env, network, stripe)).rejects.toThrow('ownership or plan');
  });
  it('rejects wrong prices, missing service readiness and foreign return URLs before a charge', async () => {
    const stripe = provider();
    stripe.prices.retrieve.mockResolvedValue({ ...price, unit_amount: 4900 });
    await expect(
      checkout(env, network, 'owner@example.com', 'https://private.createsomething.agency', stripe)
    ).rejects.toThrow('price');
    await expect(
      checkout(
        { ...env, PCN_SELF_SERVICE_ENABLED: 'false' },
        network,
        'owner@example.com',
        'https://private.createsomething.agency',
        stripe
      )
    ).rejects.toThrow('not available');
    await expect(
      checkout(env, network, 'owner@example.com', 'https://evil.example', stripe)
    ).rejects.toThrow('address');
    expect(stripe.customers.create).not.toHaveBeenCalled();
  });
  it('does not open another owner’s customer portal', async () => {
    seedBilling();
    const stripe = provider();
    stripe.customers.retrieve.mockResolvedValue({
      id: 'cus_fixture',
      metadata: { network_id: 'alpha', owner_id: 'other' }
    });
    await expect(
      portal(env, network, 'https://private.createsomething.agency', stripe)
    ).rejects.toThrow('ownership');
    expect(stripe.billingPortal.sessions.create).not.toHaveBeenCalled();
  });
  it('requires network ownership and same origin before all billing actions', async () => {
    const make = (origin: string, subject: string) =>
      ({
        locals: { network, identity: { subject, email: 'owner@example.com' } },
        platform: { env },
        url: new URL('https://private.createsomething.agency'),
        request: new Request('https://private.createsomething.agency/api/networks/alpha/billing', {
          method: 'POST',
          headers: { origin },
          body: JSON.stringify({ action: 'checkout' })
        })
      }) as any;
    expect(
      (await billingAction(make('https://private.createsomething.agency', 'other'))).status
    ).toBe(403);
    expect((await billingAction(make('https://evil.example', 'owner'))).status).toBe(403);
  });
  it('verifies the raw Stripe signature and rejects stale or altered webhook bodies', async () => {
    const stripe = new Stripe('sk_test_fixture');
    const payload = JSON.stringify({
      id: 'evt_signed',
      type: 'unhandled.fixture',
      livemode: false,
      data: { object: {} }
    });
    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: env.STRIPE_WEBHOOK_SECRET
    });
    const call = (text: string, header = signature) =>
      webhook({
        platform: { env },
        request: new Request('https://private.createsomething.agency/api/billing/webhook', {
          method: 'POST',
          headers: { 'Stripe-Signature': header },
          body: text
        })
      } as any);
    expect((await call(payload)).status).toBe(200);
    expect((await call(payload + ' ')).status).toBe(400);
    expect(
      (
        await call(
          payload,
          stripe.webhooks.generateTestHeaderString({
            payload,
            secret: env.STRIPE_WEBHOOK_SECRET,
            timestamp: 1
          })
        )
      ).status
    ).toBe(400);
  });
});
it('does not charge an unapproved creator or charge away their unused trial time', async () => {
  const stripe = provider();
  sqlite.exec("UPDATE creator_applications SET status='pending'");
  await expect(
    checkout(env, network, 'owner@example.com', 'https://private.createsomething.agency', stripe)
  ).rejects.toThrow('approval');
  expect(stripe.customers.create).not.toHaveBeenCalled();
  sqlite.exec("UPDATE creator_applications SET status='approved'");
  sqlite
    .prepare('INSERT INTO creator_trials(subject,network_id,starts_at,ends_at) VALUES(?,?,?,?)')
    .run('owner', 'alpha', 1, Math.floor(Date.now() / 1000) + 3600);
  await expect(
    checkout(env, network, 'owner@example.com', 'https://private.createsomething.agency', stripe)
  ).rejects.toThrow('free month');
  expect(stripe.customers.create).not.toHaveBeenCalled();
});

it('prices approved company support at $900 with 95 percent sent to the approved partner only', async () => {
  sqlite.exec(
    "INSERT INTO creator_applications(subject,email,display_name,credentials,teaching_video_url,status) VALUES('partner','partner@example.com','Partner','Experience','https://example.com/video','approved'); INSERT INTO support_partners(subject,approved,account_id,review_note,reviewed_by) VALUES('partner',1,'acct_partner','Approved','reviewer'); INSERT INTO support_workspaces(network_id,owner_id,partner_id,company,workflow,status) VALUES('alpha','owner','partner','Company','One agreed workflow','agreed');"
  );
  const stripe = provider();
  stripe.prices.retrieve.mockResolvedValue({ ...price, id: 'price_support', unit_amount: 90000 });
  stripe.v2 = {
    core: {
      accounts: {
        retrieve: vi.fn(async () => ({
          id: 'acct_partner',
          livemode: false,
          dashboard: 'express',
          metadata: { application: 'private_pcn_support', pcn_support_partner: 'partner' },
          defaults: {
            responsibilities: { fees_collector: 'application', losses_collector: 'application' }
          },
          configuration: {
            recipient: {
              capabilities: { stripe_balance: { stripe_transfers: { status: 'active' } } }
            }
          }
        }))
      }
    }
  };
  env.STRIPE_SUPPORT_PRICE_ID = 'price_support';
  env.PCN_SUPPORT_ENABLED = 'true';
  await checkout(
    env,
    network,
    'owner@example.com',
    'https://private.createsomething.agency',
    stripe
  );
  expect(stripe.checkout.sessions.create.mock.calls[0][0]).toMatchObject({
    line_items: [{ price: 'price_support', quantity: 1 }],
    subscription_data: { transfer_data: { destination: 'acct_partner', amount_percent: 95 } }
  });
  expect(stripe.checkout.sessions.create.mock.calls[0][0].subscription_data).not.toHaveProperty(
    'trial_period_days'
  );
});

it('withdraws paid access when the current invoice is refunded or disputed', async () => {
  seedBilling();
  const stripe = provider();
  stripe.subscriptions.list.mockResolvedValue({ data: [subscription()], has_more: false });
  stripe.paymentIntents.retrieve.mockResolvedValue({
    id: 'pi_invoice',
    customer: 'cus_fixture',
    status: 'succeeded',
    latest_charge: {
      id: 'ch_invoice',
      paid: true,
      refunded: true,
      amount_refunded: 2450,
      disputed: false
    }
  });
  const row = await refreshBilling(env, network, stripe);
  expect(row.status).toBe('payment_pending');
  expect(await paidAccess(env, network)).toBe(false);
});
it('reconciles refund events immediately instead of waiting for a subscription change', async () => {
  seedBilling();
  const stripe = provider();
  stripe.subscriptions.list.mockResolvedValue({ data: [subscription()], has_more: false });
  await refreshBilling(env, network, stripe);
  stripe.paymentIntents.retrieve.mockResolvedValue({
    id: 'pi_invoice',
    customer: 'cus_fixture',
    status: 'succeeded',
    latest_charge: {
      id: 'ch_invoice',
      paid: true,
      refunded: true,
      amount_refunded: 2450,
      disputed: false
    }
  });
  await processBillingEvent(
    env,
    {
      id: 'evt_refund',
      type: 'charge.refunded',
      data: { object: { customer: 'cus_fixture' } }
    } as any,
    stripe
  );
  expect(await paidAccess(env, network)).toBe(false);
});
