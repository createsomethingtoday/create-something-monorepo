import React, { useEffect, useMemo, useRef } from 'react';
import { trackMarketplaceEvent } from './analytics';
import { MarketplaceComponentErrorBoundary, useMarketplaceComponentErrorTracking } from './MarketplaceComponentErrorBoundary';
import {
  TemplateDetailImage,
  TemplateDetailLink,
  TemplateDetailOfferMode,
  inferTemplateSlug,
  isExternalUrl,
  normalizeTemplateDetailImage,
  normalizeTemplateDetailLink,
  resolveTemplateDetailOffer,
  templateDetailAnalyticsBase,
} from './templateDetailOffer';
import { TEMPLATE_DETAIL_STYLES } from './templateDetailStyles';

export interface TemplateDetailStickyBarProps {
  templateName?: string;
  templateSlug?: string;
  creatorName?: string;
  thumbnail?: TemplateDetailImage;
  price?: string;
  isFree?: boolean;
  browserPreviewUrl?: TemplateDetailLink;
  designerPreviewUrl?: TemplateDetailLink;
  checkoutUrl?: TemplateDetailLink;
  marketplaceTemplateId?: string;
  offerEnabled?: boolean;
  offerMode?: TemplateDetailOfferMode;
  offerLabel?: string;
  offerPrice?: string;
  offerEndsAt?: string;
  offerVisibility?: string;
  postOfferAction?: string;
  fulfillmentUrl?: TemplateDetailLink;
  showBrowserPreview?: boolean;
  showDesignerPreview?: boolean;
  enableAnalytics?: boolean;
}

function relForHref(href: string, target?: string): string | undefined {
  if (target === '_blank' || isExternalUrl(href)) return 'noopener noreferrer';
  return undefined;
}

function targetForHref(href: string, target?: string): string | undefined {
  if (target) return target;
  return isExternalUrl(href) ? '_blank' : undefined;
}

const TemplateDetailStickyBarInner: React.FC<TemplateDetailStickyBarProps> = ({
  templateName = 'Template name',
  templateSlug = '',
  creatorName = '',
  thumbnail,
  price = '',
  isFree = false,
  browserPreviewUrl,
  designerPreviewUrl,
  checkoutUrl,
  marketplaceTemplateId = '',
  offerEnabled = false,
  offerMode = 'marketplace',
  offerLabel = '',
  offerPrice = '',
  offerEndsAt = '',
  offerVisibility = '',
  postOfferAction = '',
  fulfillmentUrl,
  showBrowserPreview = true,
  showDesignerPreview = false,
  enableAnalytics = true,
}) => {
  useMarketplaceComponentErrorTracking('TemplateDetailStickyBar', enableAnalytics);
  const stickyBarRef = useRef<HTMLDivElement>(null);
  const stickyVisibleTrackedRef = useRef(false);

  const resolvedSlug = useMemo(() => inferTemplateSlug(templateSlug), [templateSlug]);
  const image = normalizeTemplateDetailImage(thumbnail);
  const browserPreview = normalizeTemplateDetailLink(browserPreviewUrl);
  const designerPreview = normalizeTemplateDetailLink(designerPreviewUrl);
  const offer = useMemo(
    () =>
      resolveTemplateDetailOffer({
        templateSlug: resolvedSlug,
        price,
        marketplaceTemplateId,
        isFree,
        offerEnabled,
        offerMode,
        offerLabel,
        offerPrice,
        offerEndsAt,
        offerVisibility,
        postOfferAction,
        checkoutUrl,
        fulfillmentUrl,
      }),
    [
      checkoutUrl,
      fulfillmentUrl,
      isFree,
      marketplaceTemplateId,
      offerEnabled,
      offerEndsAt,
      offerLabel,
      offerMode,
      offerPrice,
      offerVisibility,
      postOfferAction,
      price,
      resolvedSlug,
    ],
  );

  useEffect(() => {
    trackMarketplaceEvent(
      'Code Component Event',
      {
        ...templateDetailAnalyticsBase('TemplateDetailStickyBar', resolvedSlug, offer),
        scope: 'detail_sticky_bar_viewed',
      },
      enableAnalytics,
    );
  }, [enableAnalytics, offer, resolvedSlug]);

  useEffect(() => {
    if (!enableAnalytics || typeof window === 'undefined') return undefined;
    const element = stickyBarRef.current;
    if (!element) return undefined;

    const trackVisible = () => {
      if (stickyVisibleTrackedRef.current) return;
      stickyVisibleTrackedRef.current = true;
      trackMarketplaceEvent(
        'Code Component Event',
        {
          ...templateDetailAnalyticsBase('TemplateDetailStickyBar', resolvedSlug, offer),
          scope: 'detail_sticky_bar_visible',
        },
        enableAnalytics,
      );
    };

    const BrowserIntersectionObserver = typeof IntersectionObserver === 'undefined' ? null : IntersectionObserver;
    if (BrowserIntersectionObserver) {
      const observer = new BrowserIntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            trackVisible();
            observer.disconnect();
          }
        },
        { threshold: 0.5 },
      );
      observer.observe(element);
      return () => observer.disconnect();
    }

    const frame = window.requestAnimationFrame(trackVisible);
    return () => window.cancelAnimationFrame(frame);
  }, [enableAnalytics, offer, resolvedSlug]);

  const primaryTarget = targetForHref(offer.primaryHref, offer.primaryTarget);
  const priceLine = offer.offerPriceLabel
    ? `${offer.offerPriceLabel} offer - ${offer.priceLabel} standard`
    : offer.priceLabel;

  return (
    <div className="wfdt wfdt-sticky" data-template-detail-sticky-bar="" ref={stickyBarRef}>
      <style>{TEMPLATE_DETAIL_STYLES}</style>
      <div className="wfdt-sticky-meta">
        {image.src ? <img className="wfdt-sticky-thumb" src={image.src} alt={image.alt || `${templateName} thumbnail`} /> : null}
        <div style={{ minWidth: 0 }}>
          <p className="wfdt-sticky-title">{templateName}</p>
          <p className="wfdt-sticky-subtitle">
            {creatorName ? `${creatorName} - ` : ''}
            {priceLine}
          </p>
        </div>
      </div>
      <div className="wfdt-sticky-actions">
        {showBrowserPreview && browserPreview.href ? (
          <a
            className="wfdt-button wfdt-button-secondary"
            href={browserPreview.href}
            target={targetForHref(browserPreview.href, browserPreview.target)}
            rel={relForHref(browserPreview.href, browserPreview.target)}
            onClick={() =>
              trackMarketplaceEvent(
                'Code Component Event',
                {
                  ...templateDetailAnalyticsBase('TemplateDetailStickyBar', resolvedSlug, offer),
                  scope: 'detail_preview_cta_clicked',
                  cta_location: 'sticky_bar',
                  preview_type: 'browser',
                  cta_label: 'Preview',
                },
                enableAnalytics,
              )
            }
          >
            Preview
          </a>
        ) : null}
        {showDesignerPreview && designerPreview.href ? (
          <a
            className="wfdt-button wfdt-button-secondary"
            href={designerPreview.href}
            target={targetForHref(designerPreview.href, designerPreview.target)}
            rel={relForHref(designerPreview.href, designerPreview.target)}
            onClick={() =>
              trackMarketplaceEvent(
                'Code Component Event',
                {
                  ...templateDetailAnalyticsBase('TemplateDetailStickyBar', resolvedSlug, offer),
                  scope: 'detail_preview_cta_clicked',
                  cta_location: 'sticky_bar',
                  preview_type: 'designer',
                  cta_label: 'Designer',
                },
                enableAnalytics,
              )
            }
          >
            Designer
          </a>
        ) : null}
        <a
          className={`wfdt-button${offer.hasOffer ? ' wfdt-button-offer' : ''}`}
          href={offer.primaryHref}
          target={primaryTarget}
          rel={relForHref(offer.primaryHref, primaryTarget)}
          data-template-detail-primary-cta=""
          data-purchase-type={offer.purchaseType}
          onClick={() =>
            trackMarketplaceEvent(
              'Code Component Event',
              {
                ...templateDetailAnalyticsBase('TemplateDetailStickyBar', resolvedSlug, offer),
                scope: 'detail_primary_cta_clicked',
                cta_location: 'sticky_bar',
                purchase_type: offer.purchaseType,
                cta_label: offer.primaryLabel,
                primary_href_present: Boolean(offer.primaryHref && offer.primaryHref !== '#'),
              },
              enableAnalytics,
            )
          }
        >
          {offer.primaryLabel}
        </a>
      </div>
    </div>
  );
};

export const TemplateDetailStickyBar: React.FC<TemplateDetailStickyBarProps> = (props) => (
  <MarketplaceComponentErrorBoundary component="TemplateDetailStickyBar" enabled={props.enableAnalytics}>
    <TemplateDetailStickyBarInner {...props} />
  </MarketplaceComponentErrorBoundary>
);

export default TemplateDetailStickyBar;
