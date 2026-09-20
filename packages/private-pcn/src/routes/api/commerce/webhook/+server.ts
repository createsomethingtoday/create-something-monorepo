import { json } from '@sveltejs/kit';
import Stripe from 'stripe';
import type { RequestHandler } from './$types';
import { boundedText } from '$lib/server/body';
import { commerceStripe, liveMode } from '$lib/server/seller-accounts';
import { processCommerceEvent } from '$lib/server/asset-orders';
export const POST: RequestHandler = async ({ request, platform }) => {
  const env = platform?.env;
  if (!env || typeof env.STRIPE_CONNECT_WEBHOOK_SECRET !== 'string')
    return json({ error: 'Commerce webhook unavailable.' }, { status: 503 });
  let event: Stripe.Event, stripe: Stripe;
  try {
    stripe = commerceStripe(env);
    event = await stripe.webhooks.constructEventAsync(
      await boundedText(request, 262144),
      request.headers.get('Stripe-Signature') || '',
      env.STRIPE_CONNECT_WEBHOOK_SECRET,
      300,
      Stripe.createSubtleCryptoProvider()
    );
  } catch {
    return json({ error: 'Invalid webhook signature or payload.' }, { status: 400 });
  }
  if (event.livemode !== liveMode(env) || !event.account)
    return json({ error: 'Wrong event mode or account.' }, { status: 400 });
  try {
    await processCommerceEvent(env, event, stripe);
    return json({ received: true });
  } catch {
    return json({ error: 'Payment reconciliation will be retried.' }, { status: 503 });
  }
};
