import React, { useEffect, useMemo } from 'react';
import { trackMarketplaceEvent } from './analytics';
import { MarketplaceComponentErrorBoundary, useMarketplaceComponentErrorTracking } from './MarketplaceComponentErrorBoundary';
import {
  TemplateDetailLink,
  TemplateDetailOfferMode,
  inferTemplateSlug,
  isExternalUrl,
  normalizeTemplateDetailLink,
  resolveTemplateDetailOffer,
  templateDetailAnalyticsBase,
} from './templateDetailOffer';
import { TEMPLATE_DETAIL_STYLES } from './templateDetailStyles';

export interface TemplateDetailOfferPanelProps {
  templateName?: string;
  templateSlug?: string;
  price?: string;
  isFree?: boolean;
  checkoutUrl?: TemplateDetailLink;
  offerEnabled?: boolean;
  offerMode?: TemplateDetailOfferMode;
  offerLabel?: string;
  offerPrice?: string;
  offerEndsAt?: string;
  offerUrl?: TemplateDetailLink;
  fulfillmentUrl?: TemplateDetailLink;
  secondaryCheckoutLabel?: string;
  showSecondaryCheckout?: boolean;
  supportCopy?: string;
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

const TemplateDetailOfferPanelInner: React.FC<TemplateDetailOfferPanelProps> = ({
  templateName = 'this template',
  templateSlug = '',
  price = '',
  isFree = false,
  checkoutUrl,
  offerEnabled = false,
  offerMode = 'marketplace',
  offerLabel = '',
  offerPrice = '',
  offerEndsAt = '',
  offerUrl,
  fulfillmentUrl,
  secondaryCheckoutLabel = 'Use standard checkout',
  showSecondaryCheckout = true,
  supportCopy = '',
  enableAnalytics = true,
}) => {
  useMarketplaceComponentErrorTracking('TemplateDetailOfferPanel', enableAnalytics);

  const resolvedSlug = useMemo(() => inferTemplateSlug(templateSlug), [templateSlug]);
  const checkout = normalizeTemplateDetailLink(checkoutUrl);
  const offer = resolveTemplateDetailOffer({
    templateSlug: resolvedSlug,
    price,
    isFree,
    offerEnabled,
    offerMode,
    offerLabel,
    offerPrice,
    offerEndsAt,
    offerUrl,
    checkoutUrl,
    fulfillmentUrl,
  });

  useEffect(() => {
    trackMarketplaceEvent(
      'Code Component Event',
      {
        ...templateDetailAnalyticsBase('TemplateDetailOfferPanel', resolvedSlug, offer),
        scope: 'detail_offer_panel_viewed',
      },
      enableAnalytics,
    );
  }, [enableAnalytics, offer, resolvedSlug]);

  const badgeClass =
    offer.tone === 'sale'
      ? 'wfdt-badge wfdt-badge-sale'
      : offer.tone === 'verified'
        ? 'wfdt-badge wfdt-badge-verified'
        : 'wfdt-badge';
  const primaryTarget = targetForHref(offer.primaryHref, offer.primaryTarget);
  const checkoutTarget = checkout.href ? targetForHref(checkout.href, checkout.target) : undefined;
  const showStandardCheckout = showSecondaryCheckout && offer.hasOffer && checkout.href && checkout.href !== offer.primaryHref;

  return (
    <aside className="wfdt wfdt-panel" data-template-detail-offer-panel="">
      <style>{TEMPLATE_DETAIL_STYLES}</style>
      <div className="wfdt-panel-header">
        <div>
          <h2 className="wfdt-panel-title">{offer.hasOffer ? 'Creator offer' : 'Template purchase'}</h2>
          <p className="wfdt-panel-copy">
            {supportCopy ||
              (offer.hasOffer
                ? `${templateName} has an active creator-managed offer.`
                : `Purchase ${templateName} through the standard Marketplace flow.`)}
          </p>
        </div>
        {offer.badgeLabel ? <span className={badgeClass}>{offer.badgeLabel}</span> : null}
      </div>

      <div className="wfdt-price-row">
        <span className="wfdt-price-primary">{offer.offerPriceLabel || offer.priceLabel}</span>
        {offer.offerPriceLabel && offer.priceLabel ? <span className="wfdt-price-original">{offer.priceLabel}</span> : null}
        {offer.savingsLabel ? <span className="wfdt-chip">{offer.savingsLabel}</span> : null}
      </div>

      <p className="wfdt-panel-copy">{offer.secondaryCopy}</p>
      {offer.expiresLabel ? <p className="wfdt-small-note">Offer ends {offer.expiresLabel}.</p> : null}

      <div className="wfdt-panel-actions">
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
                ...templateDetailAnalyticsBase('TemplateDetailOfferPanel', resolvedSlug, offer),
                scope: 'detail_offer_primary_clicked',
                cta_location: 'offer_panel',
              },
              enableAnalytics,
            )
          }
        >
          {offer.primaryLabel}
        </a>

        {showStandardCheckout ? (
          <a
            className="wfdt-button wfdt-button-secondary"
            href={checkout.href}
            target={checkoutTarget}
            rel={relForHref(checkout.href || '', checkoutTarget)}
            data-template-detail-secondary-cta=""
            onClick={() =>
              trackMarketplaceEvent(
                'Code Component Event',
                {
                  ...templateDetailAnalyticsBase('TemplateDetailOfferPanel', resolvedSlug, offer),
                  scope: 'detail_offer_secondary_checkout_clicked',
                  cta_location: 'offer_panel',
                },
                enableAnalytics,
              )
            }
          >
            {secondaryCheckoutLabel}
          </a>
        ) : null}
      </div>

      <p className="wfdt-small-note">
        Existing buyers keep access through their original purchase path. This panel only changes the current discovery and
        purchase path.
      </p>
    </aside>
  );
};

export const TemplateDetailOfferPanel: React.FC<TemplateDetailOfferPanelProps> = (props) => (
  <MarketplaceComponentErrorBoundary component="TemplateDetailOfferPanel" enabled={props.enableAnalytics}>
    <TemplateDetailOfferPanelInner {...props} />
  </MarketplaceComponentErrorBoundary>
);

export default TemplateDetailOfferPanel;
