import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { reconcileSupportPayments } from '../src/lib/server/support-settlements';
let sql: DatabaseSync;
let env: any;
let stripe: any;
let charge: any;
let transfers: any[];
const network = { id: 'support-net', owner_id: 'customer-owner' };
function stmt(query: string, values: any[] = []): any {
  return {
    bind: (...args: any[]) => stmt(query, args),
    first: async () => sql.prepare(query).get(...values) || null,
    all: async () => ({ results: sql.prepare(query).all(...values) }),
    run: async () => ({ meta: { changes: sql.prepare(query).run(...values).changes } })
  };
}
beforeEach(() => {
  sql = new DatabaseSync(':memory:');
  for (const file of readdirSync(new URL('../migrations/', import.meta.url)).sort())
    sql.exec(readFileSync(new URL('../migrations/' + file, import.meta.url), 'utf8'));
  sql.exec(`INSERT INTO networks(id,slug,owner_id,name,kind) VALUES('support-net','support-net','customer-owner','Company','support');
    INSERT INTO creator_applications(subject,email,display_name,credentials,teaching_video_url,status) VALUES('partner','partner@example.com','Partner','Credentials','https://example.com/video','approved');
    INSERT INTO support_partners(subject,approved,account_id,review_note,reviewed_by) VALUES('partner',1,'acct_partner','Test approval','reviewer');
    INSERT INTO support_workspaces(network_id,owner_id,partner_id,company,workflow,status) VALUES('support-net','customer-owner','partner','Company','One workflow','agreed');
    INSERT INTO network_billing(network_id,customer_id,checkout_key) VALUES('support-net','cus_company','stable');`);
  env = {
    DB: { prepare: stmt },
    STRIPE_SECRET_KEY: 'sk_test_fixture',
    STRIPE_SUPPORT_PRICE_ID: 'price_support'
  };
  charge = {
    id: 'ch_support',
    customer: 'cus_company',
    payment_intent: 'pi_support',
    amount: 90000,
    currency: 'usd',
    livemode: false,
    paid: true,
    captured: true,
    disputed: false,
    refunded: false,
    amount_refunded: 0,
    balance_transaction: {
      id: 'txn_fee',
      source: 'ch_support',
      type: 'charge',
      amount: 90000,
      currency: 'usd',
      fee: 2640,
      net: 87360
    }
  };
  transfers = [];
  stripe = {
    invoices: {
      list: vi.fn(async () => ({
        has_more: false,
        data: [
          {
            id: 'in_support',
            customer: 'cus_company',
            status: 'paid',
            livemode: false,
            amount_paid: 90000,
            total: 90000,
            subtotal: 90000,
            parent: { subscription_details: { subscription: 'sub_support' } },
            lines: {
              has_more: false,
              data: [
                {
                  amount: 90000,
                  quantity: 1,
                  pricing: { price_details: { price: 'price_support' } }
                }
              ]
            }
          }
        ]
      }))
    },
    subscriptions: {
      retrieve: vi.fn(async () => ({
        id: 'sub_support',
        customer: 'cus_company',
        livemode: false,
        metadata: {
          network_id: 'support-net',
          owner_id: 'customer-owner',
          support_partner: 'partner',
          support_destination: 'acct_partner',
          support_policy: 'net_processing_75_v1'
        },
        transfer_data: null,
        application_fee_percent: null
      }))
    },
    invoicePayments: {
      list: vi.fn(async () => ({
        has_more: false,
        data: [{ payment: { type: 'payment_intent', payment_intent: 'pi_support' } }]
      }))
    },
    paymentIntents: {
      retrieve: vi.fn(async () => ({
        id: 'pi_support',
        customer: 'cus_company',
        status: 'succeeded',
        livemode: false,
        amount: 90000,
        amount_received: 90000,
        currency: 'usd',
        latest_charge: charge
      }))
    },
    v2: {
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
    },
    transfers: {
      list: vi.fn(async () => ({ has_more: false, data: transfers })),
      create: vi.fn(async (data: any) => {
        const t = { ...data, id: 'tr_support', livemode: false, amount_reversed: 0 };
        transfers.push(t);
        return t;
      }),
      createReversal: vi.fn(async (id: string, data: any) => {
        transfers[0].amount_reversed += data.amount;
        return { id: 'trr_support' };
      })
    }
  };
});
afterEach(() => sql.close());
it('pays the approved partner 75 percent after the actual charge fee once across retries', async () => {
  await reconcileSupportPayments(env, network as any, stripe);
  await reconcileSupportPayments(env, network as any, stripe);
  expect(stripe.transfers.create).toHaveBeenCalledTimes(1);
  expect(stripe.transfers.create.mock.calls[0][0]).toMatchObject({
    amount: 65520,
    currency: 'usd',
    destination: 'acct_partner',
    source_transaction: 'ch_support'
  });
  expect(
    sql
      .prepare('SELECT gross,processing_fee,partner_amount,transfer_id FROM support_settlements')
      .get()
  ).toMatchObject({
    gross: 90000,
    processing_fee: 2640,
    partner_amount: 65520,
    transfer_id: 'tr_support'
  });
});

it('reverses a refunded payment once even if partner approval was removed', async () => {
  await reconcileSupportPayments(env, network as any, stripe);
  sql.exec('UPDATE support_partners SET approved=0');
  charge.refunded = true;
  charge.amount_refunded = 90000;
  await reconcileSupportPayments(env, network as any, stripe);
  await reconcileSupportPayments(env, network as any, stripe);
  expect(stripe.transfers.createReversal).toHaveBeenCalledTimes(1);
  expect(stripe.transfers.createReversal.mock.calls[0][1].amount).toBe(65520);
  expect(sql.prepare('SELECT state,reversed_amount FROM support_settlements').get()).toMatchObject({
    state: 'reversed',
    reversed_amount: 65520
  });
});

it('waits for the actual fee instead of estimating or issuing a transfer', async () => {
  charge.balance_transaction = null;
  await expect(reconcileSupportPayments(env, network as any, stripe)).rejects.toThrow(
    'processing fee not available'
  );
  expect(stripe.transfers.create).not.toHaveBeenCalled();
});
it('recovers a provider transfer after its response was lost without paying twice', async () => {
  const create = stripe.transfers.create.getMockImplementation();
  stripe.transfers.create.mockImplementationOnce(async (...args: any[]) => {
    await create(...args);
    throw new Error('response lost');
  });
  await expect(reconcileSupportPayments(env, network as any, stripe)).rejects.toThrow(
    'response lost'
  );
  await reconcileSupportPayments(env, network as any, stripe);
  expect(stripe.transfers.create).toHaveBeenCalledTimes(1);
  expect(sql.prepare('SELECT transfer_id FROM support_settlements').get()).toMatchObject({
    transfer_id: 'tr_support'
  });
});
it('reduces the partner share for a partial refund and fully reverses a dispute', async () => {
  await reconcileSupportPayments(env, network as any, stripe);
  charge.amount_refunded = 10000;
  await reconcileSupportPayments(env, network as any, stripe);
  expect(transfers[0].amount_reversed).toBe(7500);
  charge.disputed = true;
  await reconcileSupportPayments(env, network as any, stripe);
  expect(transfers[0].amount_reversed).toBe(65520);
});
it('refuses another account or an unapproved partner before sending money', async () => {
  sql.exec('UPDATE support_partners SET approved=0');
  await expect(reconcileSupportPayments(env, network as any, stripe)).rejects.toThrow(
    'partner approval'
  );
  expect(stripe.transfers.create).not.toHaveBeenCalled();
});

it('records the actual reduced transfer when a refund precedes first reconciliation', async () => {
  charge.amount_refunded = 10000;
  await reconcileSupportPayments(env, network as any, stripe);
  await reconcileSupportPayments(env, network as any, stripe);
  expect(transfers[0].amount).toBe(58020);
  expect(sql.prepare('SELECT * FROM support_settlements').get()).toMatchObject({
    partner_amount: 65520,
    transfer_amount: 58020,
    reversed_amount: 0,
    state: 'settled'
  });
  charge.refunded = true;
  charge.amount_refunded = 90000;
  await reconcileSupportPayments(env, network as any, stripe);
  expect(sql.prepare('SELECT * FROM support_settlements').get()).toMatchObject({
    transfer_amount: 58020,
    reversed_amount: 58020,
    state: 'reversed'
  });
});
