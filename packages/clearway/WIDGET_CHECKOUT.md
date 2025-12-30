# CLEARWAY In-Widget Stripe Checkout

> **Zuhandenheit**: The payment flow recedes. Users book courts; the mechanism disappears.

## Overview

Phase 6.4 implements **in-widget Stripe checkout** - a seamless payment experience that keeps users within the embedded widget. No redirects, no pop-ups, just a smooth booking flow.

## What Changed

### Before (Phase 6.0-6.3)
1. User selects time slot in widget
2. **Redirects to `/book` page**
3. User enters info on separate page
4. **Redirects to Stripe Checkout**
5. **Redirects back to success page**
6. Multiple page loads, context switching

### After (Phase 6.4)
1. User selects time slot in widget
2. **Inline form appears in widget**
3. User enters info
4. **Stripe Elements appears in widget**
5. Payment completes without leaving widget
6. Single page experience, seamless flow

## Architecture

### Components

```
Widget.svelte
├─ Court/time selection
├─ User info collection (inline)
└─ CheckoutForm.svelte
   ├─ Stripe Elements (Payment Element)
   ├─ Payment confirmation
   └─ Success handling
```

### API Flow

```
1. User clicks "Book"
   → POST /api/book (create reservation)
   ← { reservation_id }

2. Show payment form
   → POST /api/stripe/payment-intent (create Payment Intent)
   ← { client_secret }

3. Mount Stripe Elements
   → Stripe.js loads dynamically
   → Payment Element mounts in widget

4. User submits payment
   → Stripe.confirmPayment() (client-side)
   → payment_intent.succeeded (webhook)
   ← Reservation confirmed
```

### Files Added

| File | Purpose |
|------|---------|
| `src/lib/services/stripe-payment.ts` | Client-side Stripe.js integration |
| `src/routes/api/stripe/payment-intent/+server.ts` | Payment Intent creation endpoint |
| `src/embed/CheckoutForm.svelte` | Payment form component |

### Files Modified

| File | Changes |
|------|---------|
| `src/embed/Widget.svelte` | Added checkout flow, user info collection |
| `src/embed/widget.ts` | Added `stripePublishableKey` config option |
| `src/routes/api/stripe/webhook/+server.ts` | Enhanced `payment_intent.succeeded` handler |

## Usage

### Basic Integration

```html
<script src="https://clearway.createsomething.space/embed.js"></script>
<script>
  Clearway.init({
    facility: 'thestack',
    container: '#booking-widget',
    theme: 'dark',

    // NEW: Enable in-widget checkout
    stripePublishableKey: 'pk_live_YOUR_KEY',

    // Callback when payment completes
    onBook: (reservation) => {
      console.log('Booked!', reservation);
      // { id, court, start, end, price }
    }
  });
</script>
```

### Configuration Options

```typescript
interface ClearwayConfig {
  facility: string;              // Required
  container: string;             // Required
  theme?: 'light' | 'dark';     // Optional
  date?: string;                 // Optional (YYYY-MM-DD)
  courtType?: string;            // Optional filter

  // NEW: Stripe publishable key
  stripePublishableKey?: string; // Optional (enables in-widget checkout)

  onBook?: (reservation) => void;
  onReady?: () => void;
  onError?: (error) => void;
}
```

### Backward Compatibility

If `stripePublishableKey` is **not provided**:
- Widget falls back to redirect flow
- Existing implementations continue working unchanged
- No breaking changes

If `stripePublishableKey` **is provided**:
- In-widget checkout activates
- Seamless payment experience
- Opt-in enhancement

## Security

### PCI Compliance

- **No card data touches your server**
- Stripe Elements handles all sensitive data
- PCI DSS SAQ-A compliance (simplest level)

### Authentication

- Payment Intent created server-side
- `client_secret` is single-use
- Metadata includes reservation validation

### Webhook Verification

```typescript
// Verify webhook signature
const event = stripe.webhooks.constructEvent(
  payload,
  signature,
  webhookSecret
);

// Only then process payment
if (event.type === 'payment_intent.succeeded') {
  confirmReservation(event.data.object.metadata.reservation_id);
}
```

## Testing

### Test Mode

Use Stripe test keys:
```javascript
stripePublishableKey: 'pk_test_...'
```

### Test Cards

| Card Number | Outcome |
|-------------|---------|
| `4242 4242 4242 4242` | Success |
| `4000 0000 0000 9995` | Decline |
| `4000 0025 0000 3155` | 3D Secure auth |

Expiry: Any future date
CVC: Any 3 digits
ZIP: Any 5 digits

### Local Development

1. Start dev server:
   ```bash
   pnpm dev
   ```

2. Build embed widget:
   ```bash
   pnpm build:embed
   ```

3. Open example:
   ```
   http://localhost:5173/widget-example.html
   ```

4. Configure webhook endpoint (optional):
   ```bash
   stripe listen --forward-to localhost:5173/api/stripe/webhook
   ```

## Styling

### Stripe Elements Theming

Automatically matches widget theme:

```typescript
// Dark theme
{
  colorPrimary: '#ffffff',
  colorBackground: '#1a1a1a',
  colorText: '#ffffff'
}

// Light theme
{
  colorPrimary: '#000000',
  colorBackground: '#ffffff',
  colorText: '#000000'
}
```

### Custom CSS Variables

Widget respects Canon Design System tokens:
- `--font-sans`
- `--color-bg-surface`
- `--color-fg-primary`
- `--radius-md`
- `--space-lg`

## Error Handling

### Network Errors

```javascript
onError: (error) => {
  if (error.message.includes('network')) {
    // Show retry UI
  }
}
```

### Payment Declined

User sees inline error message. No page reload. Can retry immediately.

### Webhook Failures

Reservation remains `pending`. Admin dashboard shows failed payments. Support can manually confirm.

## Mobile Responsive

- Payment form stacks on mobile
- Touch-optimized input fields
- Keyboard-aware scrolling
- iOS autocomplete support

## Accessibility

- Semantic HTML structure
- ARIA labels on form fields
- Keyboard navigation support
- Screen reader friendly
- Focus management

## Performance

### Lazy Loading

Stripe.js loads only when user clicks "Book":
```typescript
const stripe = await loadStripe(publishableKey);
```

### Bundle Size

Impact on embed.js:
- CheckoutForm.svelte: ~8KB
- stripe-payment.ts: ~3KB
- Total: **~11KB gzipped**

Stripe.js loads from CDN (not bundled).

## Monitoring

### Success Metrics

Track in `onBook` callback:
```javascript
onBook: (reservation) => {
  analytics.track('Booking Completed', {
    reservation_id: reservation.id,
    amount: reservation.price,
    method: 'in_widget'
  });
}
```

### Error Tracking

```javascript
onError: (error) => {
  Sentry.captureException(error, {
    tags: { component: 'clearway_widget' }
  });
}
```

## Migration Guide

### From External Checkout

**Old flow:**
```javascript
Clearway.init({
  facility: 'thestack',
  container: '#widget'
});
// Redirects to /book → Stripe → back
```

**New flow:**
```javascript
Clearway.init({
  facility: 'thestack',
  container: '#widget',
  stripePublishableKey: 'pk_live_...'  // Add this line
});
// Everything happens in widget
```

### From CourtReserve Widget

Same API, just add Stripe key:
```javascript
CourtReserve.createWidget({
  // ... existing config
  stripePublishableKey: 'pk_live_...'
});
```

## Philosophy

**Zuhandenheit**: The tool recedes into transparent use.

Users don't want "Stripe integration" or "payment processing". They want to **book a court**.

The in-widget checkout makes the payment mechanism invisible:
- No page transitions
- No mental context switching
- No "where am I?" moments

The booking flow becomes:
1. See availability
2. Pick a time
3. Pay
4. Done

The tool has receded. The outcome remains.

## Support

- **Documentation**: This file
- **Example**: `/widget-example.html`
- **API Reference**: `/embed.js` JSDoc comments
- **Issues**: GitHub Issues on WORKWAY repo
