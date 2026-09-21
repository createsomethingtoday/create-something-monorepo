import Stripe from 'stripe';
import { BillingError, paidAccess } from './billing';
import {
  commerceStripe,
  liveMode,
  now,
  readSeller,
  syncSeller,
  type CommerceEnv
} from './seller-accounts';
import type { AssetRelease, BuilderAsset } from '$lib/assets';
import type { Network } from './networks';
export interface AssetOrder {
  id: string;
  network_id: string;
  asset_id: string;
  release_id: string;
  buyer_id: string;
  buyer_email: string;
  seller_id: string;
  account_id: string;
  title: string;
  amount: number;
  currency: string;
  checkout_id: string | null;
  checkout_key: string;
  checkout_started: number;
  payment_intent_id: string | null;
  status: string;
  checked_at: number;
  lease_id: string | null;
  lease_until: number;
}
const idOf = (value: string | { id: string } | null | undefined) =>
  typeof value === 'string' ? value : value?.id;
export function commerceEnabled(env: CommerceEnv) {
  return (
    env.PCN_ASSET_COMMERCE_ENABLED === 'true' && env.PCN_ASSET_FEE_POLICY === 'hosting_only_v1'
  );
}
export function assetAcquisitionEnabled(env: CommerceEnv, priceCents: number) {
  return priceCents === 0
    ? env.PCN_FREE_ASSETS_ENABLED === 'true' || commerceEnabled(env)
    : commerceEnabled(env);
}
const orderById = (env: CommerceEnv, id: string) =>
  env.DB.prepare('SELECT * FROM asset_orders WHERE id=?').bind(id).first<AssetOrder>();
async function locked<T>(
  env: CommerceEnv,
  id: string,
  work: (row: AssetOrder, lease: string) => Promise<T>
) {
  const lease = crypto.randomUUID();
  const row = await env.DB.prepare(
    'UPDATE asset_orders SET lease_id=?,lease_until=? WHERE id=? AND lease_until<? RETURNING *'
  )
    .bind(lease, now() + 120, id, now())
    .first<AssetOrder>();
  if (!row) throw new BillingError('This purchase is being updated. Try again shortly.', 409);
  try {
    return await work(row, lease);
  } finally {
    await env.DB.prepare(
      'UPDATE asset_orders SET lease_id=NULL,lease_until=0 WHERE id=? AND lease_id=?'
    )
      .bind(id, lease)
      .run();
  }
}
function metadata(row: AssetOrder) {
  return {
    application: 'private_pcn',
    order_id: row.id,
    buyer_id: row.buyer_id,
    release_id: row.release_id,
    network_id: row.network_id,
    checkout_key: row.checkout_key
  };
}
function metadataMatches(actual: Stripe.Metadata | null, expected: Record<string, string>) {
  return !!actual && Object.entries(expected).every(([key, value]) => actual[key] === value);
}
function assertSession(session: Stripe.Checkout.Session, row: AssetOrder, env: CommerceEnv) {
  const line = session.line_items?.data[0];
  if (
    session.mode !== 'payment' ||
    session.livemode !== liveMode(env) ||
    session.client_reference_id !== row.id ||
    !metadataMatches(session.metadata, metadata(row)) ||
    session.currency !== row.currency ||
    session.amount_subtotal !== row.amount ||
    session.customer_email !== row.buyer_email ||
    session.line_items?.has_more ||
    session.line_items?.data.length !== 1 ||
    line?.quantity !== 1 ||
    line.price?.unit_amount !== row.amount ||
    line.price?.currency !== row.currency ||
    session.total_details?.amount_discount !== 0
  )
    throw new BillingError('Purchase details could not be verified. No access was granted.');
}
async function sessionFor(env: CommerceEnv, row: AssetOrder, stripe: Stripe, explicitId?: string) {
  const checkout = row.checkout_id || explicitId;
  if (!checkout) return null;
  const session = await stripe.checkout.sessions.retrieve(
    checkout,
    { expand: ['line_items', 'payment_intent.latest_charge'] },
    { stripeAccount: row.account_id }
  );
  assertSession(session, row, env);
  return session;
}
async function reconcileLocked(
  env: CommerceEnv,
  row: AssetOrder,
  lease: string,
  stripe: Stripe,
  explicitId?: string
) {
  const session = await sessionFor(env, row, stripe, explicitId);
  if (!session) return { status: row.status, session: null };
  let status = 'pending';
  let intentId: string | null = null;
  if (session.status === 'expired') status = 'expired';
  else if (session.status === 'complete' && session.payment_status === 'paid') {
    const pi = session.payment_intent;
    if (
      !pi ||
      typeof pi === 'string' ||
      pi.status !== 'succeeded' ||
      pi.livemode !== liveMode(env) ||
      pi.currency !== row.currency ||
      pi.amount !== session.amount_total ||
      pi.amount_received !== session.amount_total ||
      !metadataMatches(pi.metadata, metadata(row)) ||
      pi.application_fee_amount ||
      pi.transfer_data ||
      pi.on_behalf_of
    )
      throw new BillingError('The builder payment could not be verified.');
    intentId = pi.id;
    const charge = pi.latest_charge;
    if (
      !charge ||
      typeof charge === 'string' ||
      !charge.paid ||
      !charge.captured ||
      idOf(charge.payment_intent) !== pi.id ||
      charge.currency !== row.currency ||
      charge.amount !== pi.amount ||
      charge.livemode !== liveMode(env)
    )
      throw new BillingError('Payment settlement could not be verified.');
    const disputes = await stripe.disputes.list(
      { charge: charge.id, limit: 100 },
      { stripeAccount: row.account_id }
    );
    if (disputes.has_more) throw new BillingError('Payment review is incomplete. Try again later.');
    status =
      charge.refunded || charge.amount_refunded >= charge.amount
        ? 'refunded'
        : disputes.data.some((d) => !['won', 'warning_closed'].includes(d.status))
          ? 'disputed'
          : 'paid';
  }
  // Lease-conditional entitlement writes prevent a delayed reader overwriting a newer refund.
  const entitlement = status === 'paid' ? 'active' : 'revoked';
  const writes = await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO asset_entitlements(id,network_id,asset_id,release_id,buyer_id,source,status) SELECT ?,network_id,asset_id,release_id,buyer_id,'stripe',? FROM asset_orders WHERE id=? AND lease_id=? AND ? IN ('paid','refunded','disputed') ON CONFLICT(buyer_id,release_id) DO UPDATE SET status=excluded.status WHERE asset_entitlements.source='stripe'"
    ).bind(`order-${row.id}`, entitlement, row.id, lease, status),
    env.DB.prepare(
      'UPDATE asset_orders SET status=?,checkout_id=?,payment_intent_id=COALESCE(?,payment_intent_id),checked_at=? WHERE id=? AND lease_id=?'
    ).bind(status, session.id, intentId, now(), row.id, lease)
  ]);
  if (writes[1].meta.changes !== 1)
    throw new BillingError('Payment state changed. Refresh to continue.', 409);
  return { status, session };
}
export async function reconcileOrder(
  env: CommerceEnv,
  id: string,
  stripe = commerceStripe(env),
  explicitId?: string
) {
  return locked(env, id, (row, lease) => reconcileLocked(env, row, lease, stripe, explicitId));
}
export async function refreshBuyerRelease(
  env: CommerceEnv,
  release: AssetRelease,
  buyer: string,
  stripe?: Stripe
) {
  const entitlement = await env.DB.prepare(
    'SELECT source FROM asset_entitlements WHERE network_id=? AND asset_id=? AND release_id=? AND buyer_id=?'
  )
    .bind(release.network_id, release.asset_id, release.id, buyer)
    .first<{ source: string }>();
  if (!entitlement || entitlement.source === 'free') return;
  const row = await env.DB.prepare(
    'SELECT id FROM asset_orders WHERE network_id=? AND asset_id=? AND release_id=? AND buyer_id=?'
  )
    .bind(release.network_id, release.asset_id, release.id, buyer)
    .first<{ id: string }>();
  if (!row) throw new BillingError('The payment record for this release could not be verified.');
  await reconcileOrder(env, row.id, stripe || commerceStripe(env));
}
function originFor(origin: string) {
  if (
    ![
      'https://private.createsomething.agency',
      'https://cs-private-pcn-preview.createsomething.workers.dev'
    ].includes(origin)
  )
    throw new BillingError('Unsupported checkout origin.', 400);
  return origin;
}
export async function acquireAsset(
  env: CommerceEnv,
  network: Network,
  asset: BuilderAsset,
  release: AssetRelease,
  buyer: { subject: string; email: string },
  origin: string,
  stripe?: Stripe
) {
  if (!assetAcquisitionEnabled(env, asset.price_cents))
    throw new BillingError('Asset purchasing is not available yet. You have not been charged.');
  if (
    !network.owner_id ||
    network.status !== 'active' ||
    asset.visibility !== 'published' ||
    asset.network_id !== network.id ||
    release.network_id !== network.id ||
    release.asset_id !== asset.id
  )
    throw new BillingError('This release is not available for purchase.', 409);
  if (buyer.subject === network.owner_id)
    throw new BillingError('You already own this package. Download it from the asset page.', 409);
  if (!(await paidAccess(env, network)))
    throw new BillingError('This builder’s storefront is temporarily unavailable.');
  const existingEntitlement = await env.DB.prepare(
    'SELECT source,status FROM asset_entitlements WHERE network_id=? AND asset_id=? AND release_id=? AND buyer_id=?'
  )
    .bind(network.id, asset.id, release.id, buyer.subject)
    .first<{ source: string; status: string }>();
  if (existingEntitlement?.source === 'free') {
    if (existingEntitlement.status !== 'active')
      throw new BillingError('Contact the builder about access to this release.', 409);
    return {
      status: 'acquired',
      url: `/n/${network.slug}/assets/${asset.id}?release=${release.id}`
    };
  }
  if (asset.price_cents === 0 && existingEntitlement)
    throw new BillingError(
      'Contact the builder about the existing payment before acquiring this release again.',
      409
    );
  if (asset.price_cents === 0) {
    const previousOrder = await env.DB.prepare(
      'SELECT id FROM asset_orders WHERE buyer_id=? AND release_id=?'
    )
      .bind(buyer.subject, release.id)
      .first();
    if (previousOrder)
      throw new BillingError(
        'Check your existing purchase or contact the builder before acquiring this release again.',
        409
      );
    await env.DB.prepare(
      "INSERT INTO asset_entitlements(id,network_id,asset_id,release_id,buyer_id,source,status) VALUES(?,?,?,?,?,'free','active') ON CONFLICT(buyer_id,release_id) DO NOTHING"
    )
      .bind(crypto.randomUUID(), network.id, asset.id, release.id, buyer.subject)
      .run();
    return {
      status: 'acquired',
      url: `/n/${network.slug}/assets/${asset.id}?release=${release.id}`
    };
  }
  const target = originFor(origin);
  stripe ??= commerceStripe(env);
  const ready = await syncSeller(env, network.owner_id, stripe);
  if (!ready.chargesReady || !ready.payoutsReady)
    throw new BillingError('This builder needs to complete payment setup before accepting sales.');
  const seller = await readSeller(env.DB, network.owner_id);
  if (!seller?.account_id) throw new BillingError('Seller account unavailable.');
  await env.DB.prepare(
    'INSERT INTO asset_orders(id,network_id,asset_id,release_id,buyer_id,buyer_email,seller_id,account_id,title,amount,checkout_key) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(buyer_id,release_id) DO NOTHING'
  )
    .bind(
      crypto.randomUUID(),
      network.id,
      asset.id,
      release.id,
      buyer.subject,
      buyer.email,
      network.owner_id,
      seller.account_id,
      asset.title,
      asset.price_cents,
      crypto.randomUUID()
    )
    .run();
  const saved = await env.DB.prepare(
    'SELECT id FROM asset_orders WHERE buyer_id=? AND release_id=?'
  )
    .bind(buyer.subject, release.id)
    .first<{ id: string }>();
  if (!saved) throw new BillingError('Purchase could not be saved.');
  return locked(env, saved.id, async (row, lease) => {
    if (row.seller_id !== network.owner_id || row.account_id !== seller.account_id)
      throw new BillingError('Seller ownership changed. Contact support.');
    if (row.checkout_id) {
      const result = await reconcileLocked(env, row, lease, stripe);
      if (result.status === 'paid')
        return {
          status: 'acquired',
          url: `/n/${network.slug}/assets/${asset.id}?release=${release.id}`
        };
      if (['refunded', 'disputed'].includes(result.status))
        throw new BillingError(
          'Contact the builder about the existing payment before purchasing again.',
          409
        );
      if (result.session?.status === 'open' && row.amount === asset.price_cents) {
        if (!result.session.url) throw new BillingError('Checkout link unavailable.');
        return { status: 'checkout', url: result.session.url };
      }
      if (result.session?.status === 'complete')
        throw new BillingError(
          'Payment is being confirmed. Use Check purchase; do not pay again.',
          409
        );
      if (result.session?.status === 'open')
        await stripe.checkout.sessions.expire(
          result.session.id,
          {},
          { stripeAccount: row.account_id }
        );
      row.checkout_id = null;
      row.checkout_started = 0;
      row.checkout_key = crypto.randomUUID();
      row.amount = asset.price_cents;
      row.title = asset.title;
      await env.DB.prepare(
        "UPDATE asset_orders SET checkout_id=NULL,checkout_started=0,checkout_key=?,amount=?,title=?,status='pending' WHERE id=? AND lease_id=?"
      )
        .bind(row.checkout_key, row.amount, row.title, row.id, lease)
        .run();
    }
    if (row.checkout_started && now() - row.checkout_started > 72000)
      throw new BillingError(
        'An earlier checkout needs recovery. Check your purchase or contact support before retrying.',
        409
      );
    await env.DB.prepare(
      'UPDATE asset_orders SET checkout_started=CASE WHEN checkout_started=0 THEN ? ELSE checkout_started END WHERE id=? AND lease_id=?'
    )
      .bind(now(), row.id, lease)
      .run();
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        payment_method_types: ['card'],
        customer_email: row.buyer_email,
        client_reference_id: row.id,
        metadata: metadata(row),
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'usd',
              unit_amount: row.amount,
              tax_behavior: 'exclusive',
              product_data: {
                name: row.title,
                description: `Release ${release.version} — license and installation guidance included.`
              }
            }
          }
        ],
        payment_intent_data: { metadata: metadata(row) },
        automatic_tax: { enabled: true, liability: { type: 'self' } },
        billing_address_collection: 'required',
        success_url: `${target}/n/${network.slug}/assets/${asset.id}?purchase=${row.id}&release=${release.id}`,
        cancel_url: `${target}/n/${network.slug}/assets/${asset.id}?purchase=${row.id}&release=${release.id}`
      },
      { stripeAccount: row.account_id, idempotencyKey: `pcn-order-${row.checkout_key}` }
    );
    if (!session.url || session.livemode !== liveMode(env))
      throw new BillingError('Checkout could not be confirmed. Check purchase before retrying.');
    const result = await env.DB.prepare(
      'UPDATE asset_orders SET checkout_id=? WHERE id=? AND lease_id=?'
    )
      .bind(session.id, row.id, lease)
      .run();
    if (result.meta.changes !== 1)
      throw new BillingError('Checkout is being reconciled. Refresh before continuing.', 409);
    return { status: 'checkout', url: session.url };
  });
}
export async function checkPurchase(
  env: CommerceEnv,
  buyer: string,
  release: string,
  stripe = commerceStripe(env)
) {
  const row = await env.DB.prepare('SELECT * FROM asset_orders WHERE buyer_id=? AND release_id=?')
    .bind(buyer, release)
    .first<AssetOrder>();
  if (!row) return { status: 'not_started' };
  if (!row.checkout_id) {
    const sessions = await stripe.checkout.sessions.list(
      { created: { gte: Math.max(0, row.checkout_started - 300) }, limit: 100 },
      { stripeAccount: row.account_id }
    );
    const matching = sessions.data.filter(
      (s) => s.client_reference_id === row.id && metadataMatches(s.metadata, metadata(row))
    );
    if (matching.length > 1)
      throw new BillingError('Multiple checkouts need reconciliation. Contact support.');
    if (matching.length === 0) return { status: 'pending' };
    return { status: (await reconcileOrder(env, row.id, stripe, matching[0].id)).status };
  }
  return { status: (await reconcileOrder(env, row.id, stripe)).status };
}
export async function processCommerceEvent(
  env: CommerceEnv,
  event: Stripe.Event,
  stripe = commerceStripe(env)
) {
  if (event.livemode !== liveMode(env) || !event.account)
    throw new BillingError('Wrong payment event mode or account.', 400);
  if (await env.DB.prepare('SELECT id FROM commerce_events WHERE id=?').bind(event.id).first())
    return;
  const seller = await env.DB.prepare('SELECT * FROM seller_accounts WHERE account_id=?')
    .bind(event.account)
    .first<{ owner_id: string }>();
  if (!seller) return;
  const object = event.data.object as unknown as {
    id: string;
    metadata?: Stripe.Metadata;
    payment_intent?: string | { id: string };
    charge?: string | { id: string };
  };
  if (event.type === 'account.updated') {
    await syncSeller(env, seller.owner_id, stripe);
  } else if (event.type === 'account.application.deauthorized') {
    await env.DB.prepare(
      "UPDATE seller_accounts SET state='disconnected',charges_ready=0,payouts_ready=0,checked_at=? WHERE account_id=?"
    )
      .bind(now(), event.account)
      .run();
  } else {
    let order: AssetOrder | null = null,
      sessionId: string | undefined;
    if (event.type.startsWith('checkout.session.')) {
      order = object.metadata?.order_id ? await orderById(env, object.metadata.order_id) : null;
      if (order && object.metadata?.checkout_key !== order.checkout_key) order = null;
      sessionId = object.id;
    } else if (
      event.type.startsWith('charge.') ||
      event.type.startsWith('refund.') ||
      event.type.startsWith('payment_intent.')
    ) {
      let intent = event.type.startsWith('payment_intent.')
        ? object.id
        : idOf(object.payment_intent);
      if (!intent && object.charge) {
        const charge = await stripe.charges.retrieve(
          idOf(object.charge)!,
          {},
          { stripeAccount: event.account }
        );
        intent = idOf(charge.payment_intent);
      }
      if (intent) {
        order = await env.DB.prepare(
          'SELECT * FROM asset_orders WHERE account_id=? AND payment_intent_id=?'
        )
          .bind(event.account, intent)
          .first<AssetOrder>();
        if (!order) {
          const pi = await stripe.paymentIntents.retrieve(
            intent,
            {},
            { stripeAccount: event.account }
          );
          order = pi.metadata.order_id ? await orderById(env, pi.metadata.order_id) : null;
        }
      }
    }
    if (order) {
      if (order.account_id !== event.account || order.seller_id !== seller.owner_id)
        throw new BillingError('Payment account mismatch.', 400);
      if (!order.checkout_id && !sessionId)
        throw new BillingError('Waiting for checkout confirmation.');
      await reconcileOrder(env, order.id, stripe, sessionId);
    }
  }
  await env.DB.prepare(
    'INSERT INTO commerce_events(id,account_id,type) VALUES(?,?,?) ON CONFLICT(id) DO NOTHING'
  )
    .bind(event.id, event.account, event.type)
    .run();
}
