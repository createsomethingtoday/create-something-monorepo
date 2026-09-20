import Stripe from 'stripe';
import type { D1Database } from '@cloudflare/workers-types';
import { BillingError } from './billing';
export type CommerceEnv = App.Platform['env'];
export const PLATFORM_ACCOUNT_ID = 'acct_1JfTzIAzstI6Ecr5';
export const now = () => Math.floor(Date.now() / 1000);
export function commerceStripe(env: CommerceEnv) {
  if (
    typeof env.STRIPE_SECRET_KEY !== 'string' ||
    !/^(sk|rk)_(test|live)_/.test(env.STRIPE_SECRET_KEY)
  )
    throw new BillingError('Seller payments are awaiting configuration.');
  return new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-08-26.dahlia',
    httpClient: Stripe.createFetchHttpClient(),
    maxNetworkRetries: 1,
    timeout: 10000
  });
}
export const liveMode = (env: CommerceEnv) => String(env.STRIPE_SECRET_KEY).includes('_live_');
export interface SellerRow {
  owner_id: string;
  account_id: string | null;
  creation_key: string;
  creation_started: number;
  contact_email: string;
  display_name: string;
  country: string;
  state: string;
  charges_ready: number;
  payouts_ready: number;
  checked_at: number;
  lease_id: string | null;
  lease_until: number;
}
export const readSeller = (db: D1Database, id: string) =>
  db.prepare('SELECT * FROM seller_accounts WHERE owner_id=?').bind(id).first<SellerRow>();
export function validateSeller(account: Stripe.V2.Core.Account, owner: string, env: CommerceEnv) {
  if (
    account.metadata?.pcn_owner !== owner ||
    account.metadata?.application !== 'private_pcn' ||
    account.livemode !== liveMode(env) ||
    account.closed ||
    account.dashboard !== 'full' ||
    account.defaults?.responsibilities?.fees_collector !== 'stripe' ||
    account.defaults?.responsibilities?.losses_collector !== 'stripe'
  )
    throw new BillingError('Seller account configuration could not be verified.');
  const capabilities = account.configuration?.merchant?.capabilities;
  return {
    chargesReady: capabilities?.card_payments?.status === 'active',
    payoutsReady: capabilities?.stripe_balance?.payouts?.status === 'active'
  };
}
export async function syncSeller(env: CommerceEnv, owner: string, stripe = commerceStripe(env)) {
  const row = await readSeller(env.DB, owner);
  if (!row?.account_id) return { state: 'not_started', chargesReady: false, payoutsReady: false };
  const account = await stripe.v2.core.accounts.retrieve(row.account_id, {
    include: ['configuration.merchant', 'defaults', 'requirements']
  });
  const ready = validateSeller(account, owner, env);
  const state = ready.chargesReady && ready.payoutsReady ? 'ready' : 'requirements_due';
  await env.DB.prepare(
    'UPDATE seller_accounts SET state=?,charges_ready=?,payouts_ready=?,checked_at=? WHERE owner_id=? AND account_id=?'
  )
    .bind(
      state,
      Number(ready.chargesReady),
      Number(ready.payoutsReady),
      now(),
      owner,
      row.account_id
    )
    .run();
  return { state, ...ready };
}
export async function ensureSeller(
  env: CommerceEnv,
  owner: { subject: string; email: string },
  displayName: string,
  country: string,
  stripe = commerceStripe(env)
) {
  if (env.PCN_CONNECT_ENABLED !== 'true')
    throw new BillingError('Seller onboarding is not enabled yet. Your draft is saved.');
  if (!/^[A-Z]{2}$/.test(country)) throw new BillingError('Select your business country.', 400);
  const countrySpec = await stripe.countrySpecs.retrieve(country);
  if (countrySpec.id !== country)
    throw new BillingError('That business country is unavailable.', 400);
  await env.DB.prepare(
    'INSERT INTO seller_accounts(owner_id,creation_key,contact_email,display_name,country) VALUES(?,?,?,?,?) ON CONFLICT(owner_id) DO NOTHING'
  )
    .bind(owner.subject, crypto.randomUUID(), owner.email, displayName, country)
    .run();
  const lease = crypto.randomUUID();
  const row = await env.DB.prepare(
    'UPDATE seller_accounts SET lease_id=?,lease_until=? WHERE owner_id=? AND lease_until<? RETURNING *'
  )
    .bind(lease, now() + 120, owner.subject, now())
    .first<SellerRow>();
  if (!row) throw new BillingError('Seller setup is already in progress. Try again shortly.', 409);
  try {
    if (row.account_id) {
      await syncSeller(env, owner.subject, stripe);
      return row.account_id;
    }
    // Never recreate an uncertain account after the conservative idempotency window.
    if (row.creation_started && now() - row.creation_started > 72000)
      throw new BillingError(
        'An earlier setup needs reconciliation. Contact support before creating another account.',
        409
      );
    const platform = await stripe.accounts.retrieve(null);
    if (platform.id !== PLATFORM_ACCOUNT_ID)
      throw new BillingError('The platform payment account could not be verified.');
    await env.DB.prepare(
      'UPDATE seller_accounts SET creation_started=CASE WHEN creation_started=0 THEN ? ELSE creation_started END WHERE owner_id=? AND lease_id=?'
    )
      .bind(now(), owner.subject, lease)
      .run();
    const account = await stripe.v2.core.accounts.create(
      {
        contact_email: row.contact_email,
        display_name: row.display_name,
        identity: { country: row.country },
        dashboard: 'full',
        configuration: { merchant: { capabilities: { card_payments: { requested: true } } } },
        defaults: {
          currency: 'usd',
          responsibilities: { fees_collector: 'stripe', losses_collector: 'stripe' }
        },
        metadata: { application: 'private_pcn', pcn_owner: owner.subject },
        include: ['configuration.merchant', 'defaults', 'requirements']
      },
      { idempotencyKey: `pcn-seller-${row.creation_key}` }
    );
    validateSeller(account, owner.subject, env);
    const saved = await env.DB.prepare(
      "UPDATE seller_accounts SET account_id=?,state='requirements_due' WHERE owner_id=? AND lease_id=? AND account_id IS NULL"
    )
      .bind(account.id, owner.subject, lease)
      .run();
    if (saved.meta.changes !== 1)
      throw new BillingError('Seller setup changed. Refresh to reconcile.', 409);
    return account.id;
  } finally {
    await env.DB.prepare(
      'UPDATE seller_accounts SET lease_id=NULL,lease_until=0 WHERE owner_id=? AND lease_id=?'
    )
      .bind(owner.subject, lease)
      .run();
  }
}
export async function sellerSession(
  env: CommerceEnv,
  owner: { subject: string; email: string },
  name: string,
  country: string,
  stripe = commerceStripe(env)
) {
  if (
    typeof env.STRIPE_PUBLISHABLE_KEY !== 'string' ||
    !env.STRIPE_PUBLISHABLE_KEY.startsWith(liveMode(env) ? 'pk_live_' : 'pk_test_')
  )
    throw new BillingError('Seller onboarding keys are not configured.');
  const account = await ensureSeller(env, owner, name, country, stripe);
  const session = await stripe.accountSessions.create({
    account,
    components: {
      account_onboarding: { enabled: true },
      notification_banner: { enabled: true },
      account_management: { enabled: true },
      payments: { enabled: true },
      payouts: { enabled: true }
    }
  });
  if (session.account !== account || session.livemode !== liveMode(env))
    throw new BillingError('Seller onboarding session could not be verified.');
  return { clientSecret: session.client_secret, publishableKey: env.STRIPE_PUBLISHABLE_KEY };
}
