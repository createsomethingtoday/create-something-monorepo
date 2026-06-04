import React, { useEffect, useMemo } from 'react';
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

export interface TemplateDetailHeroProps {
  templateName?: string;
  templateSlug?: string;
  categoryName?: string;
  categoryLink?: TemplateDetailLink;
  creatorName?: string;
  creatorLink?: TemplateDetailLink;
  creatorAvatar?: TemplateDetailImage;
  templateImage?: TemplateDetailImage;
  summary?: string;
  publishedDate?: string;
  price?: string;
  isFree?: boolean;
  browserPreviewUrl?: TemplateDetailLink;
  designerPreviewUrl?: TemplateDetailLink;
  checkoutUrl?: TemplateDetailLink;
  offerEnabled?: boolean;
  offerMode?: TemplateDetailOfferMode;
  offerLabel?: string;
  offerPrice?: string;
  offerEndsAt?: string;
  offerUrl?: TemplateDetailLink;
  fulfillmentUrl?: TemplateDetailLink;
  showOfferBadge?: boolean;
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

function actionClick(
  component: string,
  event: string,
  enabled: boolean,
  templateSlug: string | undefined,
  payload: Record<string, string | boolean | null>,
): void {
  trackMarketplaceEvent(
    'Code Component Event',
    {
      ...templateDetailAnalyticsBase(component, templateSlug),
      scope: event,
      ...payload,
    },
    enabled,
  );
}

const TemplateDetailHeroInner: React.FC<TemplateDetailHeroProps> = ({
  templateName = 'Template name',
  templateSlug = '',
  categoryName = 'Templates',
  categoryLink,
  creatorName = '',
  creatorLink,
  creatorAvatar,
  templateImage,
  summary = '',
  publishedDate = '',
  price = '',
  isFree = false,
  browserPreviewUrl,
  designerPreviewUrl,
  checkoutUrl,
  offerEnabled = false,
  offerMode = 'marketplace',
  offerLabel = '',
  offerPrice = '',
  offerEndsAt = '',
  offerUrl,
  fulfillmentUrl,
  showOfferBadge = true,
  enableAnalytics = true,
}) => {
  useMarketplaceComponentErrorTracking('TemplateDetailHero', enableAnalytics);

  const resolvedSlug = useMemo(() => inferTemplateSlug(templateSlug), [templateSlug]);
  const categoryHref = normalizeTemplateDetailLink(categoryLink).href || '/templates';
  const creatorHref = normalizeTemplateDetailLink(creatorLink).href || '#';
  const avatar = normalizeTemplateDetailImage(creatorAvatar);
  const heroImage = normalizeTemplateDetailImage(templateImage);
  const browserPreview = normalizeTemplateDetailLink(browserPreviewUrl);
  const designerPreview = normalizeTemplateDetailLink(designerPreviewUrl);
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
    actionClick('TemplateDetailHero', 'detail_hero_viewed', enableAnalytics, resolvedSlug, {
      has_creator: Boolean(creatorName),
      has_preview_image: Boolean(heroImage.src),
    });
  }, [creatorName, enableAnalytics, heroImage.src, resolvedSlug]);

  const badgeClass =
    offer.tone === 'sale'
      ? 'wfdt-badge wfdt-badge-sale'
      : offer.tone === 'verified'
        ? 'wfdt-badge wfdt-badge-verified'
        : 'wfdt-badge';
  const primaryTarget = targetForHref(offer.primaryHref, offer.primaryTarget);

  return (
    <section className="wfdt wfdt-hero" data-template-detail-hero="">
      <style>{TEMPLATE_DETAIL_STYLES}</style>
      <div className="wfdt-hero-copy">
        <nav className="wfdt-breadcrumb" aria-label="Template breadcrumb">
          <a className="wfdt-breadcrumb-link" href="/templates">
            Templates
          </a>
          <span>/</span>
          <a className="wfdt-breadcrumb-link" href={categoryHref}>
            {categoryName || 'Category'}
          </a>
        </nav>
        <h1 className="wfdt-title">{templateName}</h1>
        {summary ? <p className="wfdt-summary">{summary}</p> : null}
        <div className="wfdt-meta-row">
          {creatorName ? (
            <a className="wfdt-creator-link" href={creatorHref}>
              {avatar.src ? <img className="wfdt-avatar" src={avatar.src} alt={avatar.alt || creatorName} /> : null}
              <span>{creatorName}</span>
            </a>
          ) : null}
          {publishedDate ? <span className="wfdt-chip">Updated {publishedDate}</span> : null}
          {showOfferBadge && offer.badgeLabel ? <span className={badgeClass}>{offer.badgeLabel}</span> : null}
          {offer.savingsLabel ? <span className="wfdt-chip">{offer.savingsLabel}</span> : null}
        </div>
        <div className="wfdt-actions">
          <a
            className={`wfdt-button${offer.hasOffer ? ' wfdt-button-offer' : ''}`}
            href={offer.primaryHref}
            target={primaryTarget}
            rel={relForHref(offer.primaryHref, primaryTarget)}
            data-template-detail-primary-cta=""
            data-purchase-type={offer.purchaseType}
            onClick={() =>
              actionClick('TemplateDetailHero', 'detail_primary_cta_clicked', enableAnalytics, resolvedSlug, {
                cta_location: 'hero',
                purchase_type: offer.purchaseType,
              })
            }
          >
            {offer.primaryLabel}
          </a>
          {browserPreview.href ? (
            <a
              className="wfdt-button wfdt-button-secondary"
              href={browserPreview.href}
              target={targetForHref(browserPreview.href, browserPreview.target)}
              rel={relForHref(browserPreview.href, browserPreview.target)}
              onClick={() =>
                actionClick('TemplateDetailHero', 'detail_preview_cta_clicked', enableAnalytics, resolvedSlug, {
                  cta_location: 'hero',
                  preview_type: 'browser',
                })
              }
            >
              Preview in browser
            </a>
          ) : null}
          {designerPreview.href ? (
            <a
              className="wfdt-button wfdt-button-secondary"
              href={designerPreview.href}
              target={targetForHref(designerPreview.href, designerPreview.target)}
              rel={relForHref(designerPreview.href, designerPreview.target)}
              onClick={() =>
                actionClick('TemplateDetailHero', 'detail_preview_cta_clicked', enableAnalytics, resolvedSlug, {
                  cta_location: 'hero',
                  preview_type: 'designer',
                })
              }
            >
              Preview in Webflow
            </a>
          ) : null}
        </div>
      </div>
      <div className="wfdt-media-card" aria-label={`${templateName} preview`}>
        {heroImage.src ? (
          <img src={heroImage.src} alt={heroImage.alt || `${templateName} preview`} />
        ) : (
          <div className="wfdt-media-placeholder">Template preview</div>
        )}
      </div>
    </section>
  );
};

export const TemplateDetailHero: React.FC<TemplateDetailHeroProps> = (props) => (
  <MarketplaceComponentErrorBoundary component="TemplateDetailHero" enabled={props.enableAnalytics}>
    <TemplateDetailHeroInner {...props} />
  </MarketplaceComponentErrorBoundary>
);

export default TemplateDetailHero;
