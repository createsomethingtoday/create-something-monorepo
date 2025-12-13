# Stripe Integration Setup

This document explains how to configure and use the Stripe payment integration for the Templates Platform.

## Architecture

```
User Flow:
1. User views /pricing page
2. Clicks "Upgrade" → API creates Stripe Checkout session
3. User completes payment on Stripe-hosted page
4. Stripe redirects back to /dashboard?checkout=success
5. Webhook receives events → Updates database
6. User can manage subscription via Billing Portal

Database:
- subscriptions table: Active subscriptions per user
- payment_history table: Payment attempt records
- users.stripe_customer_id: Cached Stripe customer ID
```

## Initial Setup

### 1. Install Dependencies

```bash
pnpm install
```

This will install `stripe` SDK (already added to package.json).

### 2. Create Stripe Account

1. Sign up at https://stripe.com
2. Switch to Test Mode (toggle in Stripe Dashboard)
3. Get API keys from Developers → API Keys

### 3. Create Products and Prices

In Stripe Dashboard → Products:

**Pro Plan**
- Product name: "Pro Plan"
- Price: $29/month
- Copy the Price ID (e.g., `price_1ABC123xyz`)

**Agency Plan**
- Product name: "Agency Plan"
- Price: $99/month
- Copy the Price ID (e.g., `price_1DEF456xyz`)

### 4. Update Price IDs

Edit `src/lib/services/stripe.ts`:

```typescript
export const STRIPE_PRICE_IDS = {
	pro: 'price_1ABC123xyz', // Your actual Pro price ID
	agency: 'price_1DEF456xyz' // Your actual Agency price ID
} as const;
```

Also update `src/routes/pricing/+page.svelte`:

```typescript
{
	id: 'pro',
	// ...
	priceId: 'price_1ABC123xyz',
},
{
	id: 'agency',
	// ...
	priceId: 'price_1DEF456xyz',
}
```

### 5. Configure Environment Variables

**Local Development** (`wrangler.toml`):

```toml
[vars]
STRIPE_SECRET_KEY = "sk_test_..." # From Stripe Dashboard
STRIPE_WEBHOOK_SECRET = "whsec_..." # From webhook setup (step 6)
```

**Production** (via Cloudflare Dashboard or CLI):

```bash
wrangler secret put STRIPE_SECRET_KEY
# Paste: sk_live_...

wrangler secret put STRIPE_WEBHOOK_SECRET
# Paste: whsec_...
```

### 6. Set Up Webhook Endpoint

**Local Testing with Stripe CLI**:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local dev server
stripe listen --forward-to http://localhost:5173/api/webhooks/stripe
# Copy the webhook signing secret (whsec_...)
```

**Production Webhook**:

1. In Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. URL: `https://your-domain.pages.dev/api/webhooks/stripe`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copy the webhook signing secret

### 7. Apply Database Migration

```bash
# Local
pnpm db:migrate

# Production
pnpm db:migrate:prod
```

## Testing the Integration

### Test the Checkout Flow

1. Start dev server: `pnpm dev`
2. Start Stripe webhook forwarding: `stripe listen --forward-to http://localhost:5173/api/webhooks/stripe`
3. Visit `http://localhost:5173/pricing`
4. Click "Upgrade to Pro"
5. Use Stripe test card: `4242 4242 4242 4242`, any future expiry, any CVC
6. Complete checkout
7. Verify redirect to `/dashboard?checkout=success`
8. Check database: `SELECT * FROM subscriptions;`

### Test Card Numbers

Stripe provides test cards for different scenarios:

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Insufficient funds**: `4000 0000 0000 9995`
- **3D Secure**: `4000 0025 0000 3155`

### Test Webhooks

```bash
# Trigger test webhook
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger payment_intent.succeeded
```

## API Endpoints

### POST /api/billing/checkout

Creates a Stripe Checkout session for subscription upgrade.

**Request**:
```json
{
  "priceId": "price_1ABC123xyz"
}
```

**Response**:
```json
{
  "success": true,
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/..."
}
```

**Authentication**: Required (session cookie)

### POST /api/billing/portal

Creates a Stripe Customer Portal session for subscription management.

**Response**:
```json
{
  "success": true,
  "url": "https://billing.stripe.com/..."
}
```

**Authentication**: Required (session cookie)

### POST /api/webhooks/stripe

Receives Stripe webhook events.

**Headers**:
- `stripe-signature`: Webhook signature for verification

**Authentication**: Verified via webhook signature

## Customer Portal

Users with active subscriptions can manage their billing via Stripe's Customer Portal:

```typescript
// Example usage in dashboard
async function openBillingPortal() {
  const response = await fetch('/api/billing/portal', { method: 'POST' });
  const { url } = await response.json();
  window.location.href = url;
}
```

The portal allows users to:
- Update payment method
- View invoice history
- Cancel subscription
- Download receipts

## Subscription Lifecycle

1. **User upgrades** → `checkout.session.completed` event
   - Creates/updates Stripe customer ID in users table

2. **Payment succeeds** → `payment_intent.succeeded` event
   - Records payment in payment_history table

3. **Subscription activates** → `customer.subscription.created` event
   - Creates subscription record
   - Updates user plan and site_limit

4. **Monthly renewal** → `customer.subscription.updated` event
   - Updates current_period_end

5. **User cancels** → `customer.subscription.deleted` event
   - Sets subscription status to 'canceled'
   - Downgrades user to free plan

## Plan Features

Defined in `src/lib/services/stripe.ts`:

```typescript
export const PLAN_FEATURES = {
  free: { sites: 1, customDomain: false, analytics: false, support: 'community' },
  pro: { sites: 10, customDomain: true, analytics: true, support: 'email' },
  agency: { sites: 100, customDomain: true, analytics: true, support: 'priority' }
};
```

When a subscription is created/updated, the user's `plan` and `site_limit` fields are updated based on these features.

## Security Considerations

1. **Webhook Signature Verification**: All webhook events are verified using `stripe.webhooks.constructEvent()` to prevent unauthorized requests.

2. **Secret Keys**: Never commit secret keys to git. Use environment variables or Cloudflare secrets.

3. **Customer ID Validation**: The webhook handlers check that the user exists before processing events.

4. **Idempotency**: Subscription updates use upsert logic to handle duplicate webhook deliveries.

## Troubleshooting

### Webhooks not received locally

- Check Stripe CLI is running: `stripe listen`
- Verify forwarding URL matches dev server port
- Check webhook secret is set in `wrangler.toml`

### Checkout session fails

- Verify price IDs in code match Stripe Dashboard
- Check STRIPE_SECRET_KEY is set correctly
- Ensure user is authenticated (session cookie exists)

### Subscription not updating in database

- Check webhook endpoint is configured in Stripe Dashboard
- Verify webhook signature validation passes
- Check database migration was applied
- Look for errors in webhook handler logs

### Payment succeeded but subscription not active

- Check Stripe webhook event order (sometimes events arrive out of order)
- Verify `userId` is set in subscription metadata
- Check subscription status in Stripe Dashboard

## Production Checklist

Before going live:

- [ ] Switch to live API keys (remove `sk_test_`, use `sk_live_`)
- [ ] Create live products and prices in Stripe
- [ ] Update STRIPE_PRICE_IDS with live price IDs
- [ ] Configure production webhook endpoint
- [ ] Set production secrets via `wrangler secret put`
- [ ] Test full checkout flow in production mode
- [ ] Set up Stripe email receipts
- [ ] Configure billing portal settings in Stripe Dashboard
- [ ] Review Stripe's "Going Live" checklist

## References

- [Stripe API Docs](https://stripe.com/docs/api)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Stripe Billing Portal](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
