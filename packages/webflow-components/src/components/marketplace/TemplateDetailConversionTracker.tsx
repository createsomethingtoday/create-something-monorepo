import React, { useEffect, useRef } from 'react';
import { trackMarketplaceEvent } from './analytics';
import {
  attributionAnalytics,
  getSafeAnalyticsOverrides,
  MARKETPLACE_SIGNAL_WINDOW,
  readTemplateAttribution,
} from './templateAttribution';

export interface TemplateDetailConversionTrackerProps {
  /** Template slug for the current detail page. Leave blank to infer from /templates/html/{slug}. */
  templateSlug?: string;
  /** Public price label, used only to bucket the template as free, paid, or unknown. */
  price?: string;
  /** Enable first-party marketplace analytics for this non-visual tracker. */
  enableAnalytics?: boolean;
  /** Track a detail-view event when the component mounts on a template detail page. */
  trackView?: boolean;
  /** Track Browser Preview and Designer Preview CTA clicks. */
  trackPreviewClicks?: boolean;
  /** Track purchase/use-template CTA clicks. */
  trackPurchaseClicks?: boolean;
}

const PURCHASE_SELECTOR = [
  '[data-template-detail-primary-cta]',
  '[data-template-detail-secondary-cta]',
  '[data-purchase-type]',
  '.cc-purchase',
  'a[href*="/dashboard/marketplace-checkout/redirect"]',
  'a[href*="marketplace-checkout"]',
].join(',');
const PREVIEW_SELECTOR = [
  '#hero-browser-preview',
  '#hero-designer-preview',
  '#footer-browser-preview',
  '#footer-designer-preview',
].join(',');

function inferTemplateSlug(explicitSlug?: string): string | null {
  const propSlug = explicitSlug?.trim();
  if (propSlug) return propSlug;
  if (typeof window === 'undefined') return null;
  const match = window.location.pathname.match(/\/templates\/html\/([^/?#]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function isTemplateDetailPage(): boolean {
  return typeof window !== 'undefined' && /\/templates\/html\/[^/?#]+/.test(window.location.pathname);
}

function priceBucket(price?: string): string {
  const value = price?.trim().toLowerCase() ?? '';
  if (!value) return 'unknown';
  if (value === 'free' || value === '$0' || value === '0' || value === '0 usd') return 'free';
  return 'paid';
}

function targetElement(event: MouseEvent): Element | null {
  return event.target instanceof Element ? event.target : null;
}

function ctaLocation(element: Element): string {
  const id = element.id.toLowerCase();
  if (id.includes('footer')) return 'sticky_footer';
  if (id.includes('hero')) return 'hero';
  if (element.closest('[data-template-detail-sticky-bar]')) return 'sticky_bar';
  if (element.closest('[data-template-detail-offer-panel]')) return 'offer_panel';
  if (element.closest('[data-template-detail-hero]')) return 'hero';
  if (element.closest('[data-wf--template-details-footer--variant]')) return 'sticky_footer';
  return 'unknown';
}

function previewType(element: Element): string {
  const id = element.id.toLowerCase();
  if (id.includes('designer')) return 'designer';
  if (id.includes('browser')) return 'browser';
  return 'unknown';
}

function purchaseType(element: Element, price?: string): string {
  const attributedElement = element.closest('[data-purchase-type]');
  const attributedType = attributedElement?.getAttribute('data-purchase-type')?.trim();
  if (attributedType) return attributedType;
  return priceBucket(price) === 'free' ? 'use_free_template' : 'checkout';
}

export const TemplateDetailConversionTracker: React.FC<TemplateDetailConversionTrackerProps> = ({
  templateSlug = '',
  price = '',
  enableAnalytics = true,
  trackView = true,
  trackPreviewClicks = true,
  trackPurchaseClicks = true,
}) => {
  const viewTrackedRef = useRef(false);

  useEffect(() => {
    if (!enableAnalytics || !isTemplateDetailPage()) return;

    const resolvedTemplateSlug = inferTemplateSlug(templateSlug);

    const baseData = () => {
      const attribution = readTemplateAttribution();
      return {
        ...getSafeAnalyticsOverrides(),
        ...attributionAnalytics(attribution, resolvedTemplateSlug),
        component: 'TemplateDetailConversionTracker',
        detail_template_slug: resolvedTemplateSlug,
        detail_price_bucket: priceBucket(price),
        signal_window: attribution?.signal_window ?? MARKETPLACE_SIGNAL_WINDOW,
        signal_density: attribution?.signal_density ?? null,
        signal_bucket: attribution?.signal_bucket ?? null,
        signal_metric: attribution?.signal_metric ?? null,
      };
    };

    if (trackView && !viewTrackedRef.current) {
      viewTrackedRef.current = true;
      trackMarketplaceEvent(
        'Code Component Event',
        {
          ...baseData(),
          scope: 'detail_viewed',
        },
        enableAnalytics,
      );
    }

    const onClick = (event: MouseEvent) => {
      const target = targetElement(event);
      if (!target) return;

      const previewEl = trackPreviewClicks ? target.closest(PREVIEW_SELECTOR) : null;
      if (previewEl) {
        trackMarketplaceEvent(
          'Code Component Event',
          {
            ...baseData(),
            scope: 'detail_preview_cta_clicked',
            cta_location: ctaLocation(previewEl),
            preview_type: previewType(previewEl),
          },
          enableAnalytics,
        );
        return;
      }

      const purchaseEl = trackPurchaseClicks ? target.closest(PURCHASE_SELECTOR) : null;
      if (purchaseEl) {
        trackMarketplaceEvent(
          'Code Component Event',
          {
            ...baseData(),
            scope: 'detail_purchase_cta_clicked',
            cta_location: ctaLocation(purchaseEl),
            purchase_type: purchaseType(purchaseEl, price),
          },
          enableAnalytics,
        );
      }
    };

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [enableAnalytics, price, templateSlug, trackPreviewClicks, trackPurchaseClicks, trackView]);

  return <span data-template-detail-conversion-tracker="" style={{ display: 'none' }} />;
};

export default TemplateDetailConversionTracker;
