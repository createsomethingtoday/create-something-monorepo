import Stripe from 'stripe';
import type { D1Database } from '@cloudflare/workers-types';
import type { Network } from './networks';

export const PLAN = {
  amount: 2450,
  currency: 'usd',
  interval: 'month',
  members: 100,
  sessions: 20,
  sessionMinutes: 30,
  deliveryMinutes: 5000
} as const;
type Env = App.Platform['env'];
export class BillingError extends Error {
  constructor(
    message: string,
    public status = 503
  ) {
    super(message);
  }
}
export interface BillingRow {
  network_id: string;
  customer_id: string | null;
  subscription_id: string | null;
  checkout_id: string | null;
  checkout_key: string;
  status: string;
  period_end: number;
  checked_at: number;
  cancel_at_period_end: number;
  lease_id: string | null;
  lease_until: number;
}
export function stripeClient(env: Env) {
  if (typeof env.STRIPE_SECRET_KEY !== 'string' || typeof env.STRIPE_PRICE_ID !== 'string')
    throw new BillingError('Subscription billing is not configured yet.');
  return new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-08-26.dahlia',
    httpClient: Stripe.createFetchHttpClient(),
    maxNetworkRetries: 1,
    timeout: 10000
  });
}

type BillingTerms = { amount: number; priceId: string; partnerId?: string; destination?: string };
async function billingTerms(env: Env, network: Network): Promise<BillingTerms> {
  const support = await env.DB.prepare(
    'SELECT partner_id,status FROM support_workspaces WHERE network_id=?'
  )
    .bind(network.id)
    .first<{ partner_id: string; status: string }>();
  if (!support) return { amount: PLAN.amount, priceId: String(env.STRIPE_PRICE_ID || '') };
  const partner = await env.DB.prepare(
    "SELECT p.account_id FROM support_partners p JOIN creator_applications a ON a.subject=p.subject WHERE p.subject=? AND p.approved=1 AND a.status='approved'"
  )
    .bind(support.partner_id)
    .first<{ account_id: string | null }>();
  if (support.status !== 'agreed' || !partner?.account_id)
    throw new BillingError(
      'An agreed scope and approved support partner with payment setup are required.',
      403
    );
  return {
    amount: 90000,
    priceId: String(env.STRIPE_SUPPORT_PRICE_ID || ''),
    partnerId: support.partner_id,
    destination: partner.account_id
  };
}

const seconds = () => Math.floor(Date.now() / 1000);
const objectId = (value: string | { id: string } | null) =>
  typeof value === 'string' ? value : value?.id || null;
export const readBilling = (db: D1Database, id: string) =>
  db.prepare('SELECT * FROM network_billing WHERE network_id=?').bind(id).first<BillingRow>();
async function locked<T>(
  db: D1Database,
  id: string,
  work: (row: BillingRow, lease: string) => Promise<T>
): Promise<T> {
  await db
    .prepare(
      'INSERT INTO network_billing(network_id,checkout_key) VALUES(?,?) ON CONFLICT(network_id) DO NOTHING'
    )
    .bind(id, crypto.randomUUID())
    .run();
  const lease = crypto.randomUUID();
  const row = await db
    .prepare(
      'UPDATE network_billing SET lease_id=?,lease_until=? WHERE network_id=? AND lease_until<? RETURNING *'
    )
    .bind(lease, seconds() + 120, id, seconds())
    .first<BillingRow>();
  if (!row) throw new BillingError('Billing is being updated. Try again in a moment.', 409);
  try {
    return await work(row, lease);
  } finally {
    await db
      .prepare(
        'UPDATE network_billing SET lease_id=NULL,lease_until=0 WHERE network_id=? AND lease_id=?'
      )
      .bind(id, lease)
      .run();
  }
}
async function update(db: D1Database, id: string, lease: string, sql: string, values: unknown[]) {
  const result = await db
    .prepare(`UPDATE network_billing SET ${sql} WHERE network_id=? AND lease_id=?`)
    .bind(...values, id, lease)
    .run();
  if (result.meta.changes !== 1)
    throw new BillingError('Billing changed while processing. Refresh to continue.', 409);
}
function validateSubscription(
  subscription: Stripe.Subscription,
  row: BillingRow,
  network: Network,
  env: Env,
  terms: BillingTerms
) {
  const item = subscription.items.data[0];
  if (
    objectId(subscription.customer) !== row.customer_id ||
    subscription.metadata.network_id !== network.id ||
    subscription.metadata.owner_id !== network.owner_id ||
    subscription.items.data.length !== 1 ||
    item.price.id !== terms.priceId ||
    item.quantity !== 1 ||
    item.price.currency !== PLAN.currency ||
    item.price.unit_amount !== terms.amount ||
    item.price.recurring?.interval !== PLAN.interval ||
    item.price.recurring.interval_count !== 1 ||
    (terms.destination
      ? objectId(subscription.transfer_data?.destination || null) !== terms.destination ||
        subscription.transfer_data?.amount_percent !== 95 ||
        subscription.application_fee_percent != null ||
        subscription.metadata.support_partner !== terms.partnerId
      : !!subscription.transfer_data || !!subscription.application_fee_percent) ||
    subscription.livemode !== String(env.STRIPE_SECRET_KEY).includes('_live_')
  )
    throw new BillingError('Subscription ownership or plan could not be verified.');
  return item;
}
async function synchronize(
  stripe: Stripe,
  db: D1Database,
  row: BillingRow,
  network: Network,
  env: Env,
  lease: string
) {
  if (!row.customer_id) return row;
  // Re-read current provider state so delayed/out-of-order webhook payloads cannot restore access.
  const subscriptions = await stripe.subscriptions.list({
    customer: row.customer_id,
    status: 'all',
    limit: 100,
    expand: ['data.latest_invoice']
  });
  if (subscriptions.has_more)
    throw new BillingError('Billing history needs reconciliation. Contact support.');
  const relevant = subscriptions.data.filter((s) => s.metadata.network_id === network.id);
  const current = relevant.filter((s) => !['canceled', 'incomplete_expired'].includes(s.status));
  if (current.length > 1)
    throw new BillingError('More than one subscription needs reconciliation. Contact support.');
  const subscription = current[0] || relevant.sort((a, b) => b.created - a.created)[0];
  if (!subscription) return row;
  const terms = await billingTerms(env, network);
  const item = validateSubscription(subscription, row, network, env, terms);
  const invoice = subscription.latest_invoice;
  let paid = typeof invoice === 'object' && invoice !== null && invoice.status === 'paid';
  if (paid && invoice && typeof invoice === 'object') {
    const payments = await stripe.invoicePayments.list({
      invoice: invoice.id,
      status: 'paid',
      limit: 100
    });
    paid = !payments.has_more && payments.data.length > 0;
    for (const payment of payments.data) {
      const id = objectId(payment.payment.payment_intent || null);
      if (payment.payment.type !== 'payment_intent' || !id) {
        paid = false;
        continue;
      }
      const intent = await stripe.paymentIntents.retrieve(id, { expand: ['latest_charge'] });
      const charge = intent.latest_charge;
      if (
        objectId(intent.customer) !== row.customer_id ||
        intent.status !== 'succeeded' ||
        !charge ||
        typeof charge === 'string' ||
        !charge.paid ||
        charge.disputed ||
        charge.refunded ||
        charge.amount_refunded > 0
      )
        paid = false;
    }
  }
  const active =
    paid &&
    subscription.status === 'active' &&
    !subscription.pause_collection &&
    item.current_period_end > seconds();
  await update(
    db,
    network.id,
    lease,
    'subscription_id=?,status=?,period_end=?,checked_at=?,cancel_at_period_end=?',
    [
      subscription.id,
      subscription.pause_collection
        ? 'paused'
        : subscription.status === 'active' && !paid
          ? 'payment_pending'
          : subscription.status,
      item.current_period_end,
      seconds(),
      subscription.cancel_at_period_end ? 1 : 0
    ]
  );
  // Conditional lease guard also protects the cross-table entitlement update.
  await db
    .prepare(
      'UPDATE networks SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND EXISTS(SELECT 1 FROM network_billing WHERE network_id=? AND lease_id=?)'
    )
    .bind(active ? 'active' : 'suspended', network.id, network.id, lease)
    .run();
  return (await readBilling(db, network.id))!;
}
export async function refreshBilling(env: Env, network: Network, stripe = stripeClient(env)) {
  return locked(env.DB, network.id, (row, lease) =>
    synchronize(stripe, env.DB, row, network, env, lease)
  );
}
export async function paidAccess(env: Env, network: Network) {
  if (network.id === 'default') return network.status === 'active';
  const support = await env.DB.prepare(
    'SELECT network_id FROM support_workspaces WHERE network_id=?'
  )
    .bind(network.id)
    .first();
  if (support) {
    try {
      await billingTerms(env, network);
    } catch {
      return false;
    }
  }
  const approved = await env.DB.prepare(
    "SELECT subject FROM creator_applications WHERE subject=? AND status='approved'"
  )
    .bind(network.owner_id)
    .first();
  if (!support && !approved) return false;
  const trial = await env.DB.prepare(
    'SELECT ends_at FROM creator_trials WHERE subject=? AND network_id=?'
  )
    .bind(network.owner_id, network.id)
    .first<{ ends_at: number }>();
  if (!support && trial && trial.ends_at > seconds()) return true;
  let row = await readBilling(env.DB, network.id);
  if (!row?.subscription_id) return false;
  if (row.checked_at < seconds() - 300) row = await refreshBilling(env, network);
  return row.status === 'active' && row.period_end > seconds();
}
export async function checkout(
  env: Env,
  network: Network,
  email: string,
  returnOrigin: string,
  stripe = stripeClient(env)
) {
  const terms = await billingTerms(env, network);
  if (
    (terms.destination ? env.PCN_SUPPORT_ENABLED : env.PCN_SELF_SERVICE_ENABLED) !== 'true' ||
    (!terms.destination && !env.CLOUDFLARE_STREAM_API_TOKEN)
  )
    throw new BillingError('Paid activation is not available yet. Your draft is saved.');
  if (
    ![
      'https://private.createsomething.agency',
      'https://cs-private-pcn-preview.createsomething.workers.dev'
    ].includes(returnOrigin)
  )
    throw new BillingError('Checkout is unavailable on this address.');
  const approval = await env.DB.prepare(
    "SELECT subject FROM creator_applications WHERE subject=? AND status='approved'"
  )
    .bind(network.owner_id)
    .first();
  if (!terms.destination && !approval)
    throw new BillingError('Creator approval is required before subscribing.', 403);
  const trial = await env.DB.prepare(
    'SELECT ends_at FROM creator_trials WHERE subject=? AND network_id=?'
  )
    .bind(network.owner_id, network.id)
    .first<{ ends_at: number }>();
  if (!terms.destination && trial && trial.ends_at > seconds())
    throw new BillingError('Your free month is still active. Subscribe after it ends.', 409);
  if (terms.destination) {
    const account = await stripe.v2.core.accounts.retrieve(terms.destination, {
      include: ['configuration.recipient', 'defaults']
    });
    if (
      account.closed ||
      account.livemode !== String(env.STRIPE_SECRET_KEY).includes('_live_') ||
      account.metadata?.application !== 'private_pcn_support' ||
      account.metadata?.pcn_support_partner !== terms.partnerId ||
      account.dashboard !== 'express' ||
      account.defaults?.responsibilities?.fees_collector !== 'application' ||
      account.defaults?.responsibilities?.losses_collector !== 'application' ||
      account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status !==
        'active'
    )
      throw new BillingError('Support partner payout configuration could not be verified.');
  }
  return locked(env.DB, network.id, async (row, lease) => {
    const price = await stripe.prices.retrieve(terms.priceId);
    if (
      !price.active ||
      price.unit_amount !== terms.amount ||
      price.currency !== PLAN.currency ||
      price.recurring?.interval !== PLAN.interval ||
      price.recurring.interval_count !== 1
    )
      throw new BillingError('The launch price could not be verified.');
    if (!row.customer_id) {
      const customer = await stripe.customers.create(
        { email, metadata: { network_id: network.id, owner_id: network.owner_id! } },
        { idempotencyKey: `pcn-customer-${network.id}` }
      );
      await update(env.DB, network.id, lease, 'customer_id=?', [customer.id]);
      row.customer_id = customer.id;
    }
    row = await synchronize(stripe, env.DB, row, network, env, lease);
    if (!['none', 'canceled', 'incomplete_expired'].includes(row.status))
      throw new BillingError(
        'A subscription already exists. Manage it in billing instead of starting another.',
        409
      );
    // Listing also reconciles a successful create whose response was lost before its ID was saved.
    const sessions = await stripe.checkout.sessions.list({
      customer: row.customer_id!,
      limit: 100
    });
    if (sessions.has_more)
      throw new BillingError('Checkout history needs reconciliation. Contact support.');
    const ours = sessions.data.filter((s) => s.metadata?.network_id === network.id);
    const open = ours.filter((s) => s.status === 'open');
    if (open.length > 1) throw new BillingError('Checkout needs reconciliation. Contact support.');
    if (open[0]?.url) return { url: open[0].url };
    if (
      row.status === 'none' &&
      ours.some((s) => s.status === 'complete' && s.payment_status === 'unpaid')
    )
      throw new BillingError(
        'A payment is still pending. Refresh billing once it has completed.',
        409
      );
    if (ours.some((s) => s.metadata?.checkout_key === row.checkout_key)) {
      row.checkout_key = crypto.randomUUID();
      await update(env.DB, network.id, lease, 'checkout_key=?', [row.checkout_key]);
    }
    const destination = `${returnOrigin}/n/${network.slug}/settings`;
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'subscription',
        integration_identifier: terms.destination ? 'pcn_support_qmwrzjht' : 'pcn_hosting_qmwrzjht',
        customer: row.customer_id!,
        line_items: [{ price: price.id, quantity: 1 }],
        success_url: `${destination}?checkout=returned`,
        cancel_url: destination,
        client_reference_id: network.id,
        metadata: { network_id: network.id, checkout_key: row.checkout_key },
        subscription_data: {
          metadata: {
            network_id: network.id,
            owner_id: network.owner_id!,
            ...(terms.partnerId ? { support_partner: terms.partnerId } : {})
          },
          ...(terms.destination
            ? { transfer_data: { destination: terms.destination, amount_percent: 95 } }
            : {})
        },
        billing_address_collection: 'required',
        ...(env.STRIPE_AUTOMATIC_TAX_ENABLED === 'true' ? { automatic_tax: { enabled: true } } : {})
      },
      { idempotencyKey: `pcn-checkout-${network.id}-${row.checkout_key}` }
    );
    await update(env.DB, network.id, lease, 'checkout_id=?', [session.id]);
    if (!session.url)
      throw new BillingError(
        'Checkout could not return a payment page. Refresh billing before retrying.'
      );
    return { url: session.url };
  });
}
export async function portal(
  env: Env,
  network: Network,
  returnOrigin: string,
  stripe = stripeClient(env)
) {
  const row = await readBilling(env.DB, network.id);
  if (!row?.customer_id)
    throw new BillingError('Start a subscription before opening billing.', 409);
  if (
    ![
      'https://private.createsomething.agency',
      'https://cs-private-pcn-preview.createsomething.workers.dev'
    ].includes(returnOrigin)
  )
    throw new BillingError('Billing is unavailable on this address.');
  const customer = await stripe.customers.retrieve(row.customer_id);
  if (
    customer.deleted ||
    customer.metadata.network_id !== network.id ||
    customer.metadata.owner_id !== network.owner_id
  )
    throw new BillingError('Billing ownership could not be verified.');
  if (typeof env.STRIPE_PORTAL_CONFIGURATION_ID !== 'string')
    throw new BillingError('The subscription portal is not configured yet.');
  const session = await stripe.billingPortal.sessions.create({
    configuration: env.STRIPE_PORTAL_CONFIGURATION_ID,
    customer: row.customer_id,
    return_url: `${returnOrigin}/n/${network.slug}/settings`
  });
  return { url: session.url };
}
export async function processBillingEvent(
  env: Env,
  event: Stripe.Event,
  stripe = stripeClient(env)
) {
  if (
    !/^(customer\.subscription\.|checkout\.session\.|invoice\.|charge\.refunded$|charge\.dispute\.|refund\.)/.test(
      event.type
    )
  )
    return;
  const object = event.data.object as unknown as {
    customer?: string | { id: string };
    metadata?: Record<string, string>;
    charge?: string | { id: string };
  };
  let customer = objectId(object.customer || null);
  const chargeId = objectId(object.charge || null);
  if (!customer && chargeId)
    customer = objectId((await stripe.charges.retrieve(chargeId)).customer);
  if (!customer) return;
  const row = await env.DB.prepare('SELECT * FROM network_billing WHERE customer_id=?')
    .bind(customer)
    .first<BillingRow>();
  if (!row) return; // This endpoint owns only PCN customers.
  if (
    await env.DB.prepare('SELECT event_id FROM billing_events WHERE event_id=?')
      .bind(event.id)
      .first()
  )
    return;
  const network = await env.DB.prepare('SELECT * FROM networks WHERE id=?')
    .bind(row.network_id)
    .first<Network>();
  if (!network) throw new BillingError('Network missing during billing reconciliation.');
  await refreshBilling(env, network, stripe);
  await env.DB.prepare(
    'INSERT INTO billing_events(event_id,network_id,event_type) VALUES(?,?,?) ON CONFLICT(event_id) DO NOTHING'
  )
    .bind(event.id, network.id, event.type)
    .run();
}
