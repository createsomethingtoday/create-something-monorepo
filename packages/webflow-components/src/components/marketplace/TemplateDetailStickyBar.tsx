import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  revealWhenPrimaryCtaHidden?: boolean;
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
  revealWhenPrimaryCtaHidden = true,
  enableAnalytics = true,
}) => {
  useMarketplaceComponentErrorTracking('TemplateDetailStickyBar', enableAnalytics);
  const [isRevealed, setIsRevealed] = useState(!revealWhenPrimaryCtaHidden);
  const stickyBarRef = useRef<HTMLDivElement>(null);
  const stickyVisibleTrackedRef = useRef(false);
  const stickyRevealedTrackedRef = useRef(false);

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
    if (!revealWhenPrimaryCtaHidden || typeof document === 'undefined') {
      setIsRevealed(true);
      return undefined;
    }

    const stickyElement = stickyBarRef.current;
    if (!stickyElement) return undefined;

    const primaryCtas = Array.from(document.querySelectorAll<HTMLElement>('[data-template-detail-primary-cta]'))
      .filter((element) => !stickyElement.contains(element) && element.getClientRects().length > 0);

    if (!primaryCtas.length) {
      setIsRevealed(true);
      return undefined;
    }

    const visiblePrimaryCtas = new Set<Element>();
    const syncRevealState = () => setIsRevealed(visiblePrimaryCtas.size === 0);

    const BrowserIntersectionObserver = typeof IntersectionObserver === 'undefined' ? null : IntersectionObserver;
    if (BrowserIntersectionObserver) {
      const observer = new BrowserIntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio > 0.15) {
              visiblePrimaryCtas.add(entry.target);
            } else {
              visiblePrimaryCtas.delete(entry.target);
            }
          });
          syncRevealState();
        },
        {
          rootMargin: '0px 0px -12px 0px',
          threshold: [0, 0.15, 0.5, 1],
        },
      );
      primaryCtas.forEach((element) => observer.observe(element));
      return () => observer.disconnect();
    }

    let frame = 0;
    const updateFallback = () => {
      frame = 0;
      const hasVisiblePrimaryCta = primaryCtas.some((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight - 12;
      });
      setIsRevealed(!hasVisiblePrimaryCta);
    };
    const scheduleUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateFallback);
    };

    scheduleUpdate();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, [revealWhenPrimaryCtaHidden]);

  useEffect(() => {
    if (!isRevealed || stickyRevealedTrackedRef.current) return;
    stickyRevealedTrackedRef.current = true;
    trackMarketplaceEvent(
      'Code Component Event',
      {
        ...templateDetailAnalyticsBase('TemplateDetailStickyBar', resolvedSlug, offer),
        scope: 'detail_sticky_bar_revealed',
        reveal_trigger: revealWhenPrimaryCtaHidden ? 'primary_cta_hidden' : 'always_visible',
      },
      enableAnalytics,
    );
  }, [enableAnalytics, isRevealed, offer, resolvedSlug, revealWhenPrimaryCtaHidden]);

  useEffect(() => {
    if (!enableAnalytics || !isRevealed || typeof window === 'undefined') return undefined;
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
  }, [enableAnalytics, isRevealed, offer, resolvedSlug]);

  const primaryTarget = targetForHref(offer.primaryHref, offer.primaryTarget);
  const primaryHrefPresent = Boolean(offer.primaryHref && offer.primaryHref !== '#');
  const priceLine = offer.offerPriceLabel
    ? `${offer.offerPriceLabel} offer - ${offer.priceLabel} standard`
    : offer.priceLabel;

  return (
    <div
      className={`wfdt wfdt-sticky${isRevealed ? '' : ' wfdt-sticky-hidden'}`}
      data-template-detail-sticky-bar=""
      aria-hidden={!isRevealed}
      ref={stickyBarRef}
    >
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
          {...(primaryHrefPresent
            ? { href: offer.primaryHref }
            : { 'aria-disabled': true, tabIndex: -1 })}
          target={primaryTarget}
          rel={relForHref(offer.primaryHref, primaryTarget)}
          data-template-detail-primary-cta=""
          data-purchase-type={offer.purchaseType}
          onClick={(event) => {
            if (!primaryHrefPresent) event.preventDefault();
            trackMarketplaceEvent(
              'Code Component Event',
              {
                ...templateDetailAnalyticsBase('TemplateDetailStickyBar', resolvedSlug, offer),
                scope: 'detail_primary_cta_clicked',
                cta_location: 'sticky_bar',
                purchase_type: offer.purchaseType,
                cta_label: offer.primaryLabel,
                primary_href_present: primaryHrefPresent,
              },
              enableAnalytics,
            );
          }}
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
