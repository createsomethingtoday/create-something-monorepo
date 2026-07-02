import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveTemplateDetailOffer } from '../src/components/marketplace/templateDetailOffer';

const CHECKOUT = { href: 'https://webflow.com/dashboard/marketplace-checkout/redirect?rtype=Template&rid=abc123' };

test('no offer: standard marketplace buy button', () => {
  const offer = resolveTemplateDetailOffer({
    price: '$79 USD',
    checkoutUrl: CHECKOUT,
  });

  assert.equal(offer.hasOffer, false);
  assert.equal(offer.mode, 'marketplace');
  assert.equal(offer.primaryLabel, 'Buy $79 USD');
  assert.equal(offer.primaryHref, CHECKOUT.href);
  assert.equal(offer.purchaseType, 'marketplace_checkout');
  assert.equal(offer.tone, 'default');
});

test('marketplace-mode price change offer keeps standard checkout button', () => {
  // Set Price already reflects the applied sale price; the offer mirrors carry
  // presentation metadata only — no fulfillment URL exists.
  const offer = resolveTemplateDetailOffer({
    price: '$65 USD',
    originalPrice: '$79 USD',
    offerEnabled: true,
    offerMode: 'marketplace',
    offerLabel: 'Launch price',
    offerPrice: '$65',
    offerEndsAt: '2026-07-16T00:00:00.000Z',
    checkoutUrl: CHECKOUT,
  });

  assert.equal(offer.hasOffer, true);
  assert.equal(offer.mode, 'marketplace');
  assert.equal(offer.primaryLabel, 'Buy $65 USD');
  assert.equal(offer.primaryHref, CHECKOUT.href);
  assert.equal(offer.purchaseType, 'marketplace_checkout');
  assert.equal(offer.destinationType, 'marketplace_checkout');
  assert.equal(offer.badgeLabel, 'Launch price');
  assert.equal(offer.tone, 'sale');
  assert.equal(offer.savingsLabel, '18% off');
  assert.equal(offer.secondaryCopy, 'Limited-time price applied at standard Webflow Marketplace checkout.');
  assert.ok(offer.expiresLabel);
});

test('marketplace-mode offer without originalPrice shows badge but no savings', () => {
  const offer = resolveTemplateDetailOffer({
    price: '$65 USD',
    offerEnabled: true,
    offerMode: 'marketplace',
    offerLabel: 'Launch price',
    offerPrice: '$65',
    checkoutUrl: CHECKOUT,
  });

  assert.equal(offer.hasOffer, true);
  assert.equal(offer.savingsLabel, '');
  assert.equal(offer.badgeLabel, 'Launch price');
  assert.equal(offer.primaryLabel, 'Buy $65 USD');
});

test('marketplace-mode offer never masquerades as fulfillment when mode omitted', () => {
  const offer = resolveTemplateDetailOffer({
    price: '$99 USD',
    offerEnabled: true,
    offerLabel: 'Limited offer',
    offerPrice: '$79',
    checkoutUrl: CHECKOUT,
  });

  assert.equal(offer.mode, 'marketplace');
  assert.equal(offer.primaryLabel, 'Buy $99 USD');
  assert.equal(offer.purchaseType, 'marketplace_checkout');
  assert.equal(offer.savingsLabel, '20% off');
});

test('legacy fulfillment-link offer still swaps the primary CTA', () => {
  const offer = resolveTemplateDetailOffer({
    price: '$99 USD',
    offerEnabled: true,
    offerMode: 'fulfillment_link',
    offerLabel: 'Creator offer',
    offerPrice: '$79',
    checkoutUrl: CHECKOUT,
    fulfillmentUrl: { href: 'https://webflow.com/dashboard/sites/new?t=abc&fc=xyz' },
  });

  assert.equal(offer.mode, 'fulfillment_link');
  assert.equal(offer.primaryLabel, 'Get creator offer');
  assert.equal(offer.primaryHref, 'https://webflow.com/dashboard/sites/new?t=abc&fc=xyz');
  assert.equal(offer.purchaseType, 'fulfillment_link');
  assert.equal(offer.tone, 'verified');
});

test('fulfillment-mode offer with no link falls back to checkout href', () => {
  const offer = resolveTemplateDetailOffer({
    price: '$99 USD',
    offerEnabled: true,
    offerMode: 'fulfillment_link',
    offerLabel: 'Creator offer',
    checkoutUrl: CHECKOUT,
  });

  assert.equal(offer.primaryHref, CHECKOUT.href);
});

test('free template stays free regardless of offer fields', () => {
  const offer = resolveTemplateDetailOffer({
    price: 'Free',
    offerEnabled: true,
    offerLabel: 'Promo',
    checkoutUrl: CHECKOUT,
  });

  assert.equal(offer.mode, 'free');
  assert.equal(offer.primaryLabel, 'Use for free');
});
