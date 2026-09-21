import { json } from '@sveltejs/kit';
import Stripe from 'stripe';
import type { RequestHandler } from './$types';
import { boundedText } from '$lib/server/body';
import { stripeClient, processBillingEvent } from '$lib/server/billing';
export const POST: RequestHandler = async ({ request, platform }) => {
  const env = platform?.env;
  if (!env || typeof env.STRIPE_WEBHOOK_SECRET !== 'string')
    return json({ error: 'Webhook unavailable.' }, { status: 503 });
  let event: Stripe.Event;
  let stripe: Stripe;
  try {
    stripe = stripeClient(env);
    event = await stripe.webhooks.constructEventAsync(
      await boundedText(request, 262144),
      request.headers.get('Stripe-Signature') || '',
      env.STRIPE_WEBHOOK_SECRET,
      300,
      Stripe.createSubtleCryptoProvider()
    );
  } catch {
    return json({ error: 'Invalid webhook signature or payload.' }, { status: 400 });
  }
  if (event.livemode !== String(env.STRIPE_SECRET_KEY).includes('_live_'))
    return json({ error: 'Wrong billing mode.' }, { status: 400 });
  try {
    await processBillingEvent(env, event, stripe);
    return json({ received: true });
  } catch {
    return json({ error: 'Billing reconciliation will be retried.' }, { status: 503 });
  }
};
