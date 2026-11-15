// Forward browse attribution onto the checkout redirect URL.
//
// `templateAttribution.ts` already captures where a buyer found the template
// (source component, filters, page, card position) and carries it as far as
// the purchase-CTA click. Without forwarding, that context dies in
// sessionStorage the moment the buyer leaves for checkout — which is why
// delivered orders have no purchase-surface attribution today. Appending a
// compact, prefixed parameter set to the `marketplace-checkout` URL puts the
// origin on the wire: it lands in server request logs immediately and gives
// the orders service something to persist onto the order record.

import type { TemplateMarketplaceAttribution } from './templateAttribution';

/** Query-parameter prefix. Everything this module writes starts with it. */
export const CHECKOUT_ATTRIBUTION_PARAM_PREFIX = 'wf_attr_';

const SENTINEL_PARAM = `${CHECKOUT_ATTRIBUTION_PARAM_PREFIX}src`;
const MAX_VALUE_LENGTH = 80;
const CHECKOUT_PATH_MARKER = 'marketplace-checkout';
const ALLOWED_HOST = 'webflow.com';
const ALLOWED_HOST_SUFFIX = '.webflow.com';

function clip(value: string): string {
  return value.length > MAX_VALUE_LENGTH ? value.slice(0, MAX_VALUE_LENGTH) : value;
}

function isCheckoutUrl(url: URL): boolean {
  if (url.protocol !== 'https:') return false;
  const host = url.hostname.toLowerCase();
  if (host !== ALLOWED_HOST && !host.endsWith(ALLOWED_HOST_SUFFIX)) return false;
  return url.pathname.toLowerCase().includes(CHECKOUT_PATH_MARKER);
}

/**
 * Returns the checkout href with attribution parameters appended, or null
 * when nothing should change (not a checkout URL, no attribution, or the
 * parameters are already present from an earlier click).
 */
export function appendAttributionToCheckoutHref(
  href: string | null | undefined,
  attribution: TemplateMarketplaceAttribution | null,
  detailTemplateSlug: string | null,
): string | null {
  if (!href || !attribution) return null;

  let url: URL;
  try {
    // Relative checkout hrefs resolve against the marketplace origin.
    url = new URL(href, 'https://webflow.com');
  } catch {
    return null;
  }
  if (!isCheckoutUrl(url)) return null;
  if (url.searchParams.has(SENTINEL_PARAM)) return null;

  const expectedSlug = detailTemplateSlug?.trim() || null;
  const entries: Array<[string, string | null]> = [
    ['src', attribution.source_component],
    ['scope', attribution.source_scope],
    ['sort', attribution.source_sort],
    ['page', String(attribution.source_page)],
    ['pos', String(attribution.source_position)],
    ['slug', attribution.template_slug],
    ['match', expectedSlug ? (attribution.template_slug === expectedSlug ? '1' : '0') : ''],
  ];

  for (const [key, value] of entries) {
    if (value === null || value === '') continue;
    url.searchParams.set(`${CHECKOUT_ATTRIBUTION_PARAM_PREFIX}${key}`, clip(value));
  }

  return url.toString();
}

/**
 * Mutates the purchase CTA's anchor href in place so the navigation that is
 * about to happen carries attribution. Returns true when a href was updated.
 *
 * Works on the element matched by the purchase selector: the anchor itself,
 * a descendant of the anchor, or a wrapper containing one.
 */
export function forwardAttributionToCheckoutAnchor(
  purchaseElement: Element,
  attribution: TemplateMarketplaceAttribution | null,
  detailTemplateSlug: string | null,
): boolean {
  if (!attribution) return false;

  let anchor: Element | null = null;
  try {
    anchor =
      purchaseElement.tagName === 'A'
        ? purchaseElement
        : purchaseElement.closest?.('a[href]') ?? purchaseElement.querySelector?.('a[href]') ?? null;
  } catch {
    return false;
  }
  if (!anchor) return false;

  const href = anchor.getAttribute('href');
  const next = appendAttributionToCheckoutHref(href, attribution, detailTemplateSlug);
  if (!next) return false;

  try {
    anchor.setAttribute('href', next);
    return true;
  } catch {
    return false;
  }
}
