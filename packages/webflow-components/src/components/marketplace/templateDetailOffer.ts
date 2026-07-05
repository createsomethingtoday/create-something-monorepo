import type { MarketplaceAnalyticsData } from './analytics';
import { getSafeAnalyticsOverrides, readTemplateAttribution } from './templateAttribution';

export type TemplateDetailOfferMode =
  | 'marketplace'
  | 'fulfillment_link'
  | 'free';

export type TemplateDetailTone = 'default' | 'sale' | 'verified' | 'warning';

export interface TemplateDetailLink {
  href: string;
  target?: string;
}

export interface TemplateDetailImage {
  src: string;
  alt?: string;
}

export interface TemplateDetailOfferInput {
  templateSlug?: string;
  price?: string;
  /** The pre-offer price, for strikethrough/savings when `price` already reflects the applied sale price. */
  originalPrice?: string;
  marketplaceTemplateId?: string;
  offerEnabled?: boolean;
  offerMode?: TemplateDetailOfferMode;
  offerLabel?: string;
  offerPrice?: string;
  offerEndsAt?: string;
  offerVisibility?: string;
  postOfferAction?: string;
  checkoutUrl?: TemplateDetailLink;
  fulfillmentUrl?: TemplateDetailLink;
  isFree?: boolean;
}

export interface TemplateDetailOfferState {
  hasOffer: boolean;
  mode: TemplateDetailOfferMode;
  priceLabel: string;
  offerPriceLabel: string;
  originalPriceLabel: string;
  badgeLabel: string;
  primaryHref: string;
  primaryTarget?: string;
  primaryLabel: string;
  secondaryCopy: string;
  savingsLabel: string;
  expiresLabel: string;
  offerVisibility: string;
  postOfferAction: string;
  purchaseType: string;
  destinationType: string;
  discountBucket: string;
  tone: TemplateDetailTone;
}

const DEFAULT_PRICE = 'Paid template';
const TEMPLATE_DETAIL_COMPONENT_VERSION = 'template_detail_code_components_v1';
const MARKETPLACE_CHECKOUT_BASE_URL = 'https://webflow.com/dashboard/marketplace-checkout/redirect';

export function normalizeTemplateDetailLink(link?: TemplateDetailLink | string | null): Partial<TemplateDetailLink> {
  if (!link) return {};
  if (typeof link === 'string') return { href: link };
  return link;
}

export function normalizeTemplateDetailImage(image?: TemplateDetailImage | string | null): Partial<TemplateDetailImage> {
  if (!image) return {};
  if (typeof image === 'string') return { src: image };
  return image;
}

function isPlaceholderTemplateDetailHref(href?: string | null): boolean {
  const normalized = compact(href).toLowerCase();
  return !normalized || normalized === '#' || normalized === 'about:blank' || normalized === '/';
}

export function inferTemplateSlug(explicitSlug?: string): string {
  const trimmed = explicitSlug?.trim();
  if (trimmed) return trimmed;
  if (typeof window === 'undefined') return '';
  const match = window.location.pathname.match(/\/templates\/html\/([^/?#]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : '';
}

export function isExternalUrl(href: string): boolean {
  if (!href) return false;
  try {
    const url = new URL(href, typeof window === 'undefined' ? 'https://webflow.com' : window.location.origin);
    if (typeof window === 'undefined') return url.hostname !== 'webflow.com';
    return url.hostname !== window.location.hostname;
  } catch {
    return /^https?:\/\//i.test(href);
  }
}

function compact(value?: string | null): string {
  return value?.trim() ?? '';
}

function isFreePrice(value?: string): boolean {
  return /\bfree\b/i.test(compact(value));
}

function priceBucket(value?: string): string {
  const normalized = compact(value).toLowerCase();
  if (!normalized || normalized === DEFAULT_PRICE.toLowerCase()) return 'unknown';
  if (isFreePrice(normalized) || normalized === '$0' || normalized === '0' || normalized === '0 usd') return 'free';
  return 'paid';
}

function discountBucket(savingsPercent: number): string {
  if (!savingsPercent) return 'none';
  if (savingsPercent < 25) return 'under_25';
  if (savingsPercent < 50) return '25_to_49';
  if (savingsPercent < 75) return '50_to_74';
  return '75_plus';
}

function parsePrice(value?: string): number | null {
  const normalized = compact(value).replace(/,/g, '');
  if (!normalized) return null;
  if (isFreePrice(normalized)) return 0;
  const match = normalized.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeMarketplaceTemplateId(value?: string): string {
  return compact(value).replace(/[^a-zA-Z0-9_-]/g, '');
}

function marketplaceCheckoutLink(templateId?: string): Partial<TemplateDetailLink> {
  const normalized = normalizeMarketplaceTemplateId(templateId);
  if (!normalized) return {};
  return {
    href: `${MARKETPLACE_CHECKOUT_BASE_URL}?rtype=Template&rid=${encodeURIComponent(normalized)}&unauthSignup=true`,
  };
}

export function resolveTemplateDetailCheckoutLink(input: {
  checkoutUrl?: TemplateDetailLink;
  marketplaceTemplateId?: string;
}): Partial<TemplateDetailLink> {
  const checkoutUrl = normalizeTemplateDetailLink(input.checkoutUrl);
  const href = compact(checkoutUrl.href);
  if (!isPlaceholderTemplateDetailHref(href)) return checkoutUrl;
  return marketplaceCheckoutLink(input.marketplaceTemplateId);
}

function resolveTemplateDetailFulfillmentLink(link?: TemplateDetailLink): Partial<TemplateDetailLink> {
  const fulfillmentUrl = normalizeTemplateDetailLink(link);
  const href = compact(fulfillmentUrl.href);
  if (isPlaceholderTemplateDetailHref(href)) return {};
  return fulfillmentUrl;
}

function formatDateLabel(value?: string): string {
  const raw = compact(value);
  if (!raw) return '';

  const timestamp = Date.parse(raw);
  if (!Number.isFinite(timestamp)) return raw;

  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(timestamp));
  } catch {
    return raw;
  }
}

function resolveMode(input: TemplateDetailOfferInput, hasOffer: boolean): TemplateDetailOfferMode {
  if (input.isFree || isFreePrice(input.price)) return 'free';
  if (hasOffer && input.offerMode === 'fulfillment_link') return 'fulfillment_link';
  if (hasOffer && input.offerMode === 'free') return 'free';
  // Price-change offers are applied to the real template price and sold through
  // standard Marketplace checkout; only explicit fulfillment offers swap the CTA.
  if (hasOffer) return 'marketplace';
  return input.offerMode === 'free' ? 'free' : 'marketplace';
}

function offerBadge(mode: TemplateDetailOfferMode, label: string, hasOffer: boolean): string {
  if (label) return label;
  if (!hasOffer && mode !== 'free') return '';
  if (mode === 'free') return 'Free template';
  if (mode === 'fulfillment_link') return 'Creator fulfillment';
  return hasOffer ? 'Limited-time price' : '';
}

function marketplacePrimaryLabel(priceLabel: string): string {
  const label = compact(priceLabel);
  if (!label || label === DEFAULT_PRICE) return 'Buy template';
  if (/^buy\b/i.test(label)) return label;
  if (/free/i.test(label)) return 'Use for free';
  return `Buy ${label}`;
}

function primaryLabel(mode: TemplateDetailOfferMode, hasOffer: boolean, priceLabel: string): string {
  if (mode === 'free') return 'Use for free';
  if (mode === 'fulfillment_link') return 'Get creator offer';
  return marketplacePrimaryLabel(priceLabel);
}

function hasDetailOnlyLifecycle(visibility: string, action: string): boolean {
  const combined = `${visibility} ${action}`.toLowerCase();
  return (
    combined.includes('detail only') ||
    combined.includes('detail-only') ||
    combined.includes('unlisted') ||
    combined.includes('hidden') ||
    combined.includes('delist') ||
    combined.includes('archive') ||
    combined.includes('remove from search')
  );
}

function secondaryCopy(mode: TemplateDetailOfferMode, hasOffer: boolean, visibility: string, action: string): string {
  if (mode === 'free') return 'Use this template in Webflow at no cost.';
  if (mode === 'fulfillment_link') {
    return 'Complete the creator offer through the Webflow-generated fulfillment link.';
  }
  if (hasOffer && hasDetailOnlyLifecycle(visibility, action)) {
    return 'Limited creator offer. After this window, the listing may move to detail-only access or a marketplace lifecycle review.';
  }
  if (hasOffer) {
    return 'Limited-time price applied at standard Webflow Marketplace checkout.';
  }
  return 'Purchase through Webflow Marketplace checkout.';
}

function purchaseType(mode: TemplateDetailOfferMode, hasOffer: boolean): string {
  if (mode === 'free') return 'free';
  if (mode === 'fulfillment_link') return 'fulfillment_link';
  return 'marketplace_checkout';
}

function tone(mode: TemplateDetailOfferMode, hasOffer: boolean): TemplateDetailTone {
  if (mode === 'fulfillment_link') return 'verified';
  if (mode === 'free') return 'default';
  return hasOffer ? 'sale' : 'default';
}

function attributionContext(templateSlug?: string): MarketplaceAnalyticsData {
  const attribution = readTemplateAttribution();
  if (!attribution) {
    return {
      attribution_present: false,
      attribution_match: false,
    };
  }

  const expectedTemplateSlug = inferTemplateSlug(templateSlug) || null;
  return {
    attribution_present: true,
    attribution_match: expectedTemplateSlug ? attribution.template_slug === expectedTemplateSlug : null,
    attribution_source_component: attribution.source_component,
    attribution_source_pathname: attribution.source_pathname,
    attribution_source_scope: attribution.source_scope,
    attribution_source_sort: attribution.source_sort,
    attribution_source_category_group_slug: attribution.source_category_group_slug,
    attribution_source_child_category_slug: attribution.source_child_category_slug,
    attribution_source_style_slug: attribution.source_style_slug,
    attribution_source_tag_slug: attribution.source_tag_slug,
    attribution_source_free_only: attribution.source_free_only,
    attribution_source_q_present: attribution.source_q_present,
    attribution_source_styles_count: attribution.source_styles_count,
    attribution_source_tags_count: attribution.source_tags_count,
    attribution_source_types_count: attribution.source_types_count,
    attribution_source_page: attribution.source_page,
    attribution_source_position: attribution.source_position,
    attribution_template_slug: attribution.template_slug,
  };
}

export function resolveTemplateDetailOffer(input: TemplateDetailOfferInput): TemplateDetailOfferState {
  const checkoutFallbackUrl = resolveTemplateDetailCheckoutLink(input);
  const fulfillmentUrl = resolveTemplateDetailFulfillmentLink(input.fulfillmentUrl);
  const offerPriceLabel = compact(input.offerPrice);
  const offerVisibility = compact(input.offerVisibility);
  const postOfferAction = compact(input.postOfferAction);
  const isFreeTemplate = Boolean(input.isFree || isFreePrice(input.price));
  const priceLabel = isFreeTemplate ? 'Free' : compact(input.price) || DEFAULT_PRICE;
  const hasOffer = Boolean(input.offerEnabled && (offerPriceLabel || compact(input.offerLabel) || fulfillmentUrl.href));
  const mode = resolveMode(input, hasOffer);
  const activePrimaryLink = hasOffer && mode === 'fulfillment_link' ? fulfillmentUrl : checkoutFallbackUrl;
  const fallbackPrimaryLink = checkoutFallbackUrl.href ? checkoutFallbackUrl : fulfillmentUrl;
  const primaryLink = activePrimaryLink.href ? activePrimaryLink : fallbackPrimaryLink;

  const originalPriceLabel = compact(input.originalPrice);
  const originalPrice = parsePrice(originalPriceLabel) ?? parsePrice(priceLabel);
  const currentPrice = parsePrice(offerPriceLabel) ?? parsePrice(priceLabel);
  const savings =
    hasOffer && originalPrice && currentPrice !== null && currentPrice < originalPrice
      ? Math.round((1 - currentPrice / originalPrice) * 100)
      : 0;
  const expiresLabel = formatDateLabel(input.offerEndsAt);

  return {
    hasOffer,
    mode,
    priceLabel,
    offerPriceLabel,
    originalPriceLabel,
    badgeLabel: offerBadge(mode, compact(input.offerLabel), hasOffer),
    primaryHref: primaryLink.href || '#',
    primaryTarget: primaryLink.target,
    primaryLabel: primaryLabel(mode, hasOffer, priceLabel),
    secondaryCopy: secondaryCopy(mode, hasOffer, offerVisibility, postOfferAction),
    savingsLabel: savings > 0 ? `${savings}% off` : '',
    expiresLabel,
    offerVisibility,
    postOfferAction,
    purchaseType: purchaseType(mode, hasOffer),
    destinationType: purchaseType(mode, hasOffer),
    discountBucket: discountBucket(savings),
    tone: tone(mode, hasOffer),
  };
}

export function templateDetailAnalyticsBase(
  component: string,
  templateSlug?: string,
  offer?: TemplateDetailOfferState,
): MarketplaceAnalyticsData {
  return {
    ...getSafeAnalyticsOverrides(),
    ...attributionContext(templateSlug),
    component,
    detail_page_component_version: TEMPLATE_DETAIL_COMPONENT_VERSION,
    template_detail_surface: 'code_component',
    detail_template_slug: inferTemplateSlug(templateSlug) || null,
    detail_price_bucket: offer ? priceBucket(offer.priceLabel) : null,
    offer_enabled: Boolean(offer?.hasOffer),
    offer_mode: offer?.mode ?? null,
    offer_purchase_type: offer?.purchaseType ?? null,
    cta_destination_type: offer?.destinationType ?? null,
    offer_price_bucket: offer?.offerPriceLabel ? priceBucket(offer.offerPriceLabel) : null,
    offer_has_price: Boolean(offer?.offerPriceLabel),
    offer_has_expiration: Boolean(offer?.expiresLabel),
    offer_has_discount: Boolean(offer?.savingsLabel),
    offer_discount_bucket: offer?.discountBucket ?? null,
    offer_visibility: offer?.offerVisibility ?? null,
    post_offer_action: offer?.postOfferAction ?? null,
    primary_cta_label: offer?.primaryLabel ?? null,
    primary_cta_href_present: Boolean(offer?.primaryHref && offer.primaryHref !== '#'),
  };
}
