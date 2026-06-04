export type TemplateDetailOfferMode =
  | 'marketplace'
  | 'creator_offer'
  | 'external_checkout'
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
  offerEnabled?: boolean;
  offerMode?: TemplateDetailOfferMode;
  offerLabel?: string;
  offerPrice?: string;
  offerEndsAt?: string;
  offerUrl?: TemplateDetailLink;
  checkoutUrl?: TemplateDetailLink;
  fulfillmentUrl?: TemplateDetailLink;
  isFree?: boolean;
}

export interface TemplateDetailOfferState {
  hasOffer: boolean;
  mode: TemplateDetailOfferMode;
  priceLabel: string;
  offerPriceLabel: string;
  badgeLabel: string;
  primaryHref: string;
  primaryTarget?: string;
  primaryLabel: string;
  secondaryCopy: string;
  savingsLabel: string;
  expiresLabel: string;
  purchaseType: string;
  tone: TemplateDetailTone;
}

const DEFAULT_PRICE = 'Paid template';

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

function parsePrice(value?: string): number | null {
  const normalized = compact(value).replace(/,/g, '');
  if (!normalized || /free/i.test(normalized)) return 0;
  const match = normalized.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
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
  if (input.isFree) return 'free';
  if (hasOffer && input.offerMode && input.offerMode !== 'marketplace') return input.offerMode;
  if (hasOffer) return 'creator_offer';
  return input.offerMode === 'free' ? 'free' : 'marketplace';
}

function offerBadge(mode: TemplateDetailOfferMode, label: string, hasOffer: boolean): string {
  if (label) return label;
  if (!hasOffer && mode !== 'free') return '';
  if (mode === 'free') return 'Free template';
  if (mode === 'fulfillment_link') return 'Creator fulfillment';
  if (mode === 'external_checkout') return 'Creator checkout';
  return 'Creator sale';
}

function primaryLabel(mode: TemplateDetailOfferMode, hasOffer: boolean): string {
  if (mode === 'free') return 'Use for free';
  if (mode === 'fulfillment_link') return 'Get creator offer';
  if (mode === 'external_checkout') return 'Continue to creator offer';
  if (hasOffer) return 'Get creator offer';
  return 'Buy template';
}

function secondaryCopy(mode: TemplateDetailOfferMode, hasOffer: boolean): string {
  if (mode === 'free') return 'Use this template in Webflow at no cost.';
  if (mode === 'fulfillment_link') {
    return 'After an approved creator purchase, install the published template in Webflow with the fulfillment link.';
  }
  if (mode === 'external_checkout') {
    return 'Complete the creator offer outside Webflow, then return to install the template in Webflow.';
  }
  if (hasOffer) return 'Limited creator offer. Standard Marketplace checkout remains available if the offer expires.';
  return 'Purchase through Webflow Marketplace checkout.';
}

function purchaseType(mode: TemplateDetailOfferMode, hasOffer: boolean): string {
  if (mode === 'free') return 'free';
  if (mode === 'fulfillment_link') return 'fulfillment_link';
  if (mode === 'external_checkout') return 'external_checkout';
  if (hasOffer) return 'creator_offer';
  return 'marketplace_checkout';
}

function tone(mode: TemplateDetailOfferMode, hasOffer: boolean): TemplateDetailTone {
  if (mode === 'fulfillment_link' || mode === 'external_checkout') return 'verified';
  if (mode === 'free') return 'default';
  return hasOffer ? 'sale' : 'default';
}

export function resolveTemplateDetailOffer(input: TemplateDetailOfferInput): TemplateDetailOfferState {
  const offerUrl = normalizeTemplateDetailLink(input.offerUrl);
  const checkoutUrl = normalizeTemplateDetailLink(input.checkoutUrl);
  const fulfillmentUrl = normalizeTemplateDetailLink(input.fulfillmentUrl);
  const offerPriceLabel = compact(input.offerPrice);
  const priceLabel = compact(input.price) || (input.isFree ? 'Free' : DEFAULT_PRICE);
  const hasOffer = Boolean(input.offerEnabled && (offerPriceLabel || compact(input.offerLabel) || offerUrl.href || fulfillmentUrl.href));
  const mode = resolveMode(input, hasOffer);
  const preferredOfferUrl = mode === 'fulfillment_link' && fulfillmentUrl.href ? fulfillmentUrl : offerUrl;
  const activePrimaryLink = hasOffer || mode === 'free' ? preferredOfferUrl : checkoutUrl;
  const fallbackPrimaryLink = checkoutUrl.href ? checkoutUrl : preferredOfferUrl;
  const primaryLink = activePrimaryLink.href ? activePrimaryLink : fallbackPrimaryLink;

  const originalPrice = parsePrice(priceLabel);
  const offerPrice = parsePrice(offerPriceLabel);
  const savings =
    originalPrice && offerPrice !== null && offerPrice < originalPrice
      ? Math.round((1 - offerPrice / originalPrice) * 100)
      : 0;
  const expiresLabel = formatDateLabel(input.offerEndsAt);

  return {
    hasOffer,
    mode,
    priceLabel,
    offerPriceLabel,
    badgeLabel: offerBadge(mode, compact(input.offerLabel), hasOffer),
    primaryHref: primaryLink.href || '#',
    primaryTarget: primaryLink.target,
    primaryLabel: primaryLabel(mode, hasOffer),
    secondaryCopy: secondaryCopy(mode, hasOffer),
    savingsLabel: savings > 0 ? `${savings}% off` : '',
    expiresLabel,
    purchaseType: purchaseType(mode, hasOffer),
    tone: tone(mode, hasOffer),
  };
}

export function templateDetailAnalyticsBase(
  component: string,
  templateSlug?: string,
  offer?: TemplateDetailOfferState,
): Record<string, string | boolean | null> {
  return {
    component,
    detail_template_slug: inferTemplateSlug(templateSlug) || null,
    offer_enabled: Boolean(offer?.hasOffer),
    offer_mode: offer?.mode ?? null,
    offer_purchase_type: offer?.purchaseType ?? null,
  };
}
