import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import Stripe from 'stripe';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import {
  reconcileOrder,
  checkPurchase,
  processCommerceEvent,
  refreshBuyerRelease,
  acquireAsset
} from '../src/lib/server/asset-orders';
import { ensureSeller, PLATFORM_ACCOUNT_ID } from '../src/lib/server/seller-accounts';
import { POST as webhook } from '../src/routes/api/commerce/webhook/+server';
let sql: DatabaseSync, env: any, stripe: any, session: any, disputes: any[];
const metadata = {
  application: 'private_pcn',
  order_id: 'order',
  buyer_id: 'buyer',
  release_id: 'release',
  network_id: 'net',
  checkout_key: 'key'
};
function statement(query: string, values: any[] = []): any {
  return {
    bind: (...v: any[]) => statement(query, v),
    first: async () => sql.prepare(query).get(...values) || null,
    run: async () => ({ meta: { changes: sql.prepare(query).run(...values).changes } })
  };
}
function account() {
  return {
    id: 'acct_seller',
    livemode: false,
    dashboard: 'full',
    metadata: { application: 'private_pcn', pcn_owner: 'owner' },
    defaults: { responsibilities: { fees_collector: 'stripe', losses_collector: 'stripe' } },
    configuration: {
      merchant: {
        capabilities: {
          card_payments: { status: 'active' },
          stripe_balance: { payouts: { status: 'active' } }
        }
      }
    }
  };
}
function grant() {
  return sql.prepare('SELECT * FROM asset_entitlements').get();
}
function seedOrder() {
  sql.exec(
    "INSERT INTO asset_orders(id,network_id,asset_id,release_id,buyer_id,buyer_email,seller_id,account_id,title,amount,checkout_id,checkout_key) VALUES('order','net','asset','release','buyer','buyer@example.com','owner','acct_seller','Skill',1900,'cs_test','key')"
  );
}
beforeEach(() => {
  sql = new DatabaseSync(':memory:');
  sql.exec('PRAGMA foreign_keys=ON');
  for (const name of [
    '0001_private_pcn.sql',
    '0002_network_ownership.sql',
    '0004_subscriptions.sql',
    '0006_builder_assets.sql',
    '0007_builder_commerce.sql',
    '0008_creator_admission.sql',
    '0010_company_support.sql'
  ])
    sql.exec(readFileSync(new URL(`../migrations/${name}`, import.meta.url), 'utf8'));
  sql.exec(
    "INSERT INTO networks(id,slug,owner_id,name,format,access_model,status) VALUES('net','builder','owner','Builder','academy','preview','active'); INSERT INTO builder_assets(id,network_id,title,kind,summary,price_cents,audience,visibility) VALUES('asset','net','Skill','skill','Review',1900,'public','published'); INSERT INTO asset_releases(id,network_id,asset_id,version,manifest,object_key,sha256,size_bytes) VALUES('release','net','asset','1.0.0','{}','private.zip','hash',4); INSERT INTO seller_accounts(owner_id,account_id,creation_key,contact_email,display_name,country) VALUES('owner','acct_seller','seller-key','owner@example.com','Builder','US');"
  );
  sql.exec(
    "INSERT INTO creator_applications(subject,email,display_name,credentials,teaching_video_url,status) VALUES('owner','owner@example.com','Builder','Experience','https://example.com/video','approved')"
  );
  const now = Math.floor(Date.now() / 1000);
  sql
    .prepare(
      "INSERT INTO network_billing(network_id,subscription_id,checkout_key,status,period_end,checked_at) VALUES('net','sub','billing-key','active',?,?)"
    )
    .run(now + 3600, now);
  env = {
    DB: {
      prepare: statement,
      batch: async (s: any[]) => {
        sql.exec('BEGIN');
        try {
          const r = [];
          for (const x of s) r.push(await x.run());
          sql.exec('COMMIT');
          return r;
        } catch (e) {
          sql.exec('ROLLBACK');
          throw e;
        }
      }
    },
    STRIPE_SECRET_KEY: 'sk_test_fixture',
    PCN_CONNECT_ENABLED: 'true',
    PCN_ASSET_COMMERCE_ENABLED: 'true',
    PCN_ASSET_FEE_POLICY: 'hosting_only_v1'
  };
  disputes = [];
  session = {
    id: 'cs_test',
    url: 'https://checkout.stripe.com/test',
    mode: 'payment',
    livemode: false,
    client_reference_id: 'order',
    metadata: { ...metadata },
    currency: 'usd',
    amount_subtotal: 1900,
    amount_total: 2000,
    customer_email: 'buyer@example.com',
    line_items: {
      data: [{ quantity: 1, price: { unit_amount: 1900, currency: 'usd' } }],
      has_more: false
    },
    total_details: { amount_discount: 0 },
    status: 'complete',
    payment_status: 'paid',
    payment_intent: {
      id: 'pi_test',
      status: 'succeeded',
      livemode: false,
      currency: 'usd',
      amount: 2000,
      amount_received: 2000,
      metadata: { ...metadata },
      latest_charge: {
        id: 'ch_test',
        paid: true,
        captured: true,
        payment_intent: 'pi_test',
        currency: 'usd',
        amount: 2000,
        livemode: false,
        refunded: false,
        amount_refunded: 0
      }
    }
  };
  stripe = {
    checkout: {
      sessions: {
        retrieve: vi.fn(async () => session),
        list: vi.fn(async () => ({ data: [session], has_more: false })),
        create: vi.fn(async () => ({
          id: 'cs_new',
          url: 'https://checkout.stripe.com/new',
          livemode: false
        })),
        expire: vi.fn()
      }
    },
    disputes: { list: vi.fn(async () => ({ data: disputes, has_more: false })) },
    accounts: { retrieve: vi.fn(async () => ({ id: PLATFORM_ACCOUNT_ID })) },
    countrySpecs: { retrieve: vi.fn(async (id: string) => ({ id })) },
    v2: {
      core: {
        accounts: { retrieve: vi.fn(async () => account()), create: vi.fn(async () => account()) }
      }
    }
  };
});
afterEach(() => sql.close());
it('grants only the exact paid release and reconciles repeated confirmations idempotently', async () => {
  seedOrder();
  await reconcileOrder(env, 'order', stripe);
  await reconcileOrder(env, 'order', stripe);
  expect(grant()).toMatchObject({
    buyer_id: 'buyer',
    release_id: 'release',
    source: 'stripe',
    status: 'active'
  });
  expect(sql.prepare('SELECT count(*) AS n FROM asset_entitlements').get()?.n).toBe(1);
  expect(stripe.checkout.sessions.retrieve).toHaveBeenCalledWith('cs_test', expect.anything(), {
    stripeAccount: 'acct_seller'
  });
});
it('does not grant access for open or unpaid checkout returns', async () => {
  seedOrder();
  session.status = 'open';
  session.payment_status = 'unpaid';
  expect((await reconcileOrder(env, 'order', stripe)).status).toBe('pending');
  expect(grant()).toBeUndefined();
});
it.each(['livemode', 'amount', 'buyer', 'release', 'fee', 'transfer'])(
  'rejects mismatched %s before granting',
  async (kind) => {
    seedOrder();
    if (kind === 'livemode') session.livemode = true;
    if (kind === 'amount') session.amount_subtotal = 1;
    if (kind === 'buyer') session.customer_email = 'attacker@example.com';
    if (kind === 'release') session.metadata.release_id = 'other';
    if (kind === 'fee') session.payment_intent.application_fee_amount = 100;
    if (kind === 'transfer') session.payment_intent.transfer_data = { destination: 'other' };
    await expect(reconcileOrder(env, 'order', stripe)).rejects.toThrow();
    expect(grant()).toBeUndefined();
  }
);
it('retains partial refunds, revokes full refunds and refreshes without relying on webhooks', async () => {
  seedOrder();
  await reconcileOrder(env, 'order', stripe);
  session.payment_intent.latest_charge.amount_refunded = 500;
  await reconcileOrder(env, 'order', stripe);
  expect(grant()?.status).toBe('active');
  session.payment_intent.latest_charge.amount_refunded = 2000;
  await refreshBuyerRelease(
    env,
    { id: 'release', asset_id: 'asset', network_id: 'net' } as any,
    'buyer',
    stripe
  );
  expect(grant()?.status).toBe('revoked');
});
it('pauses disputed access and restores it only after a current won dispute', async () => {
  seedOrder();
  disputes = [{ status: 'needs_response' }];
  await reconcileOrder(env, 'order', stripe);
  expect(grant()?.status).toBe('revoked');
  disputes = [{ status: 'won' }];
  await reconcileOrder(env, 'order', stripe);
  expect(grant()?.status).toBe('active');
});
it('fails closed on incomplete dispute history or unavailable provider', async () => {
  seedOrder();
  stripe.disputes.list.mockResolvedValue({ data: [], has_more: true });
  await expect(reconcileOrder(env, 'order', stripe)).rejects.toThrow();
  expect(grant()).toBeUndefined();
  stripe.checkout.sessions.retrieve.mockRejectedValue(new Error('offline'));
  await expect(reconcileOrder(env, 'order', stripe)).rejects.toThrow('offline');
});
it('recovers a lost checkout response using buyer-scoped server metadata', async () => {
  seedOrder();
  sql.exec('UPDATE asset_orders SET checkout_id=NULL');
  expect(await checkPurchase(env, 'attacker', 'release', stripe)).toEqual({
    status: 'not_started'
  });
  expect(await checkPurchase(env, 'buyer', 'release', stripe)).toEqual({ status: 'paid' });
  expect(sql.prepare('SELECT checkout_id FROM asset_orders').get()?.checkout_id).toBe('cs_test');
});
it('ignores old checkout events and rejects a different connected seller', async () => {
  seedOrder();
  const e: any = {
    id: 'evt_old',
    type: 'checkout.session.completed',
    account: 'acct_seller',
    livemode: false,
    data: { object: { id: 'cs_old', metadata: { ...metadata, checkout_key: 'old' } } }
  };
  await processCommerceEvent(env, e, stripe);
  expect(grant()).toBeUndefined();
  sql.exec(
    "INSERT INTO seller_accounts(owner_id,account_id,creation_key,contact_email,display_name,country) VALUES('other','acct_other','other-key','other@example.com','Other','US')"
  );
  e.id = 'evt_wrong';
  e.account = 'acct_other';
  e.data.object.metadata = { ...metadata };
  await expect(processCommerceEvent(env, e, stripe)).rejects.toThrow('account mismatch');
});
it('uses current refund state for delayed completed events and records replay receipts', async () => {
  seedOrder();
  session.payment_intent.latest_charge.refunded = true;
  const e: any = {
    id: 'evt',
    type: 'checkout.session.completed',
    account: 'acct_seller',
    livemode: false,
    data: { object: { id: 'cs_test', metadata: { ...metadata } } }
  };
  await processCommerceEvent(env, e, stripe);
  await processCommerceEvent(env, e, stripe);
  expect(grant()?.status).toBe('revoked');
  expect(stripe.checkout.sessions.retrieve).toHaveBeenCalledTimes(1);
});
it('creates direct charges at the server price with no platform commission', async () => {
  const n: any = sql.prepare("SELECT * FROM networks WHERE id='net'").get(),
    a: any = sql.prepare('SELECT * FROM builder_assets').get(),
    r: any = sql.prepare('SELECT * FROM asset_releases').get();
  await acquireAsset(
    env,
    n,
    a,
    r,
    { subject: 'buyer', email: 'buyer@example.com' },
    'https://private.createsomething.agency',
    stripe
  );
  const [body, options] = stripe.checkout.sessions.create.mock.calls[0];
  expect(options.stripeAccount).toBe('acct_seller');
  expect(options.idempotencyKey).toMatch(/^pcn-order-/);
  expect(body.line_items[0].price_data.unit_amount).toBe(1900);
  expect(body.payment_intent_data).not.toHaveProperty('application_fee_amount');
  expect(body.payment_intent_data).not.toHaveProperty('transfer_data');
  expect(grant()).toBeUndefined();
});
it('retains the same idempotency key after an uncertain checkout creation', async () => {
  const n: any = sql.prepare("SELECT * FROM networks WHERE id='net'").get(),
    a: any = sql.prepare('SELECT * FROM builder_assets').get(),
    r: any = sql.prepare('SELECT * FROM asset_releases').get();
  stripe.checkout.sessions.create.mockRejectedValueOnce(new Error('lost'));
  const buy = () =>
    acquireAsset(
      env,
      n,
      a,
      r,
      { subject: 'buyer', email: 'buyer@example.com' },
      'https://private.createsomething.agency',
      stripe
    );
  await expect(buy()).rejects.toThrow('lost');
  await buy();
  expect(stripe.checkout.sessions.create.mock.calls[0][1].idempotencyKey).toBe(
    stripe.checkout.sessions.create.mock.calls[1][1].idempotencyKey
  );
});
it('creates seller accounts with explicit country and Stripe-owned fees and losses', async () => {
  sql.exec('DELETE FROM seller_accounts');
  await ensureSeller(
    env,
    { subject: 'owner', email: 'owner@example.com' },
    'Builder',
    'CA',
    stripe
  );
  expect(stripe.v2.core.accounts.create.mock.calls[0][0]).toMatchObject({
    identity: { country: 'CA' },
    dashboard: 'full',
    defaults: { responsibilities: { fees_collector: 'stripe', losses_collector: 'stripe' } }
  });
});
it('retains account creation keys after an uncertain result and refuses aged retries', async () => {
  sql.exec('DELETE FROM seller_accounts');
  stripe.v2.core.accounts.create.mockRejectedValueOnce(new Error('lost'));
  const create = () =>
    ensureSeller(env, { subject: 'owner', email: 'owner@example.com' }, 'Builder', 'US', stripe);
  await expect(create()).rejects.toThrow('lost');
  await create();
  expect(stripe.v2.core.accounts.create.mock.calls[0][1]).toEqual(
    stripe.v2.core.accounts.create.mock.calls[1][1]
  );
  sql.exec('UPDATE seller_accounts SET account_id=NULL,creation_started=1');
  await expect(create()).rejects.toThrow('reconciliation');
});
it('rejects seller creation under the wrong platform account', async () => {
  sql.exec('DELETE FROM seller_accounts');
  stripe.accounts.retrieve.mockResolvedValue({ id: 'wrong' });
  await expect(
    ensureSeller(env, { subject: 'owner', email: 'owner@example.com' }, 'Builder', 'US', stripe)
  ).rejects.toThrow('platform');
  expect(stripe.v2.core.accounts.create).not.toHaveBeenCalled();
});
it('verifies real SDK webhook signatures, freshness, mode and connected scope', async () => {
  const secret = 'whsec_fixture';
  env.STRIPE_CONNECT_WEBHOOK_SECRET = secret;
  const sdk = new Stripe('sk_test_fixture');
  const call = async (payload: any, age = 0, invalid = false) => {
    const body = JSON.stringify(payload);
    const signature = invalid
      ? 'invalid'
      : sdk.webhooks.generateTestHeaderString({
          payload: body,
          secret,
          timestamp: Math.floor(Date.now() / 1000) - age
        });
    return webhook({
      platform: { env },
      request: new Request('https://private.createsomething.agency/api/commerce/webhook', {
        method: 'POST',
        body,
        headers: { 'Stripe-Signature': signature }
      })
    } as any);
  };
  const e = {
    id: 'unknown',
    type: 'account.updated',
    account: 'acct_unknown',
    livemode: false,
    data: { object: {} }
  };
  expect((await call(e)).status).toBe(200);
  expect((await call(e, 0, true)).status).toBe(400);
  expect((await call(e, 600)).status).toBe(400);
  expect((await call({ ...e, account: undefined })).status).toBe(400);
  expect((await call({ ...e, livemode: true })).status).toBe(400);
});
it('reuses an open checkout and rotates its key after expiry', async () => {
  seedOrder();
  session.status = 'open';
  session.payment_status = 'unpaid';
  const n: any = sql.prepare("SELECT * FROM networks WHERE id='net'").get(),
    a: any = sql.prepare('SELECT * FROM builder_assets').get(),
    r: any = sql.prepare('SELECT * FROM asset_releases').get();
  const buy = () =>
    acquireAsset(
      env,
      n,
      a,
      r,
      { subject: 'buyer', email: 'buyer@example.com' },
      'https://private.createsomething.agency',
      stripe
    );
  expect(await buy()).toMatchObject({ status: 'checkout', url: session.url });
  expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  session.status = 'expired';
  await buy();
  expect(stripe.checkout.sessions.create.mock.calls[0][1].idempotencyKey).not.toBe('pcn-order-key');
  expect(grant()).toBeUndefined();
});
it('keeps a free release grant idempotent and refuses to reverse its revocation', async () => {
  const n: any = sql.prepare("SELECT * FROM networks WHERE id='net'").get(),
    a: any = { ...sql.prepare('SELECT * FROM builder_assets').get(), price_cents: 0 },
    r: any = sql.prepare('SELECT * FROM asset_releases').get();
  const buy = () =>
    acquireAsset(
      env,
      n,
      a,
      r,
      { subject: 'buyer', email: 'buyer@example.com' },
      'https://private.createsomething.agency',
      stripe
    );
  await buy();
  await buy();
  expect(grant()).toMatchObject({ source: 'free', status: 'active' });
  expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  sql.exec("UPDATE asset_entitlements SET status='revoked'");
  await expect(buy()).rejects.toThrow('Contact the builder');
});
it('does not create a second payment while the order lease is held', async () => {
  seedOrder();
  sql.prepare('UPDATE asset_orders SET lease_until=?').run(Math.floor(Date.now() / 1000) + 120);
  await expect(reconcileOrder(env, 'order', stripe)).rejects.toThrow('being updated');
  expect(stripe.checkout.sessions.retrieve).not.toHaveBeenCalled();
});
it('does not bypass pending purchase recovery when a builder changes the price to free', async () => {
  seedOrder();
  const n: any = sql.prepare("SELECT * FROM networks WHERE id='net'").get(),
    a: any = { ...sql.prepare('SELECT * FROM builder_assets').get(), price_cents: 0 },
    r: any = sql.prepare('SELECT * FROM asset_releases').get();
  await expect(
    acquireAsset(
      env,
      n,
      a,
      r,
      { subject: 'buyer', email: 'buyer@example.com' },
      'https://private.createsomething.agency',
      stripe
    )
  ).rejects.toThrow('existing purchase');
  expect(grant()).toBeUndefined();
});
