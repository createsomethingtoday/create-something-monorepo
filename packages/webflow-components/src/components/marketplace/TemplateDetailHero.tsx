import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { trackMarketplaceEvent } from './analytics';
import type { MarketplaceAnalyticsData } from './analytics';
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
  categoryNames?: string;
  categoryLink?: TemplateDetailLink;
  categoryLinks?: string;
  categoryBaseUrl?: string;
  creatorName?: string;
  creatorLink?: TemplateDetailLink;
  creatorAvatar?: TemplateDetailImage;
  summary?: string;
  publishedDate?: string;
  price?: string;
  isFree?: boolean;
  browserPreviewUrl?: TemplateDetailLink;
  designerPreviewUrl?: TemplateDetailLink;
  previewIframeUrl?: TemplateDetailLink;
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
  showPreviewIframe?: boolean;
  showPreviewDeviceControls?: boolean;
  previewDefaultDevice?: TemplateDetailPreviewDevice;
  showOfferBadge?: boolean;
  enableAnalytics?: boolean;
}

type TemplateDetailPreviewDevice = 'desktop' | 'mobile';

interface TemplateDetailCategoryCrumb {
  label: string;
  href: string;
}

const CATEGORY_ROUTE_ALIASES: Record<string, string> = {
  'real-estate-and-property-management': 'real-estate-websites',
  'retail-and-ecommerce': 'retail-and-e-commerce-websites',
  'retail-and-e-commerce': 'retail-and-e-commerce-websites',
};

const PREVIEW_DEVICE_DIMENSIONS: Record<TemplateDetailPreviewDevice, { width: number; height: number }> = {
  desktop: { width: 1280, height: 800 },
  mobile: { width: 390, height: 760 },
};

function relForHref(href: string, target?: string): string | undefined {
  if (target === '_blank' || isExternalUrl(href)) return 'noopener noreferrer';
  return undefined;
}

function targetForHref(href: string, target?: string): string | undefined {
  if (target) return target;
  return isExternalUrl(href) ? '_blank' : undefined;
}

function formatTemplateTitle(name: string): string {
  const label = name.trim() || 'Template name';
  return /\bwebsite\s+template$/i.test(label) ? label : `${label} - Website Template`;
}

function splitCategoryList(value?: string): string[] {
  const raw = value?.trim();
  if (!raw) return [];
  const separator = raw.includes('\n') ? /\n+/ : /,\s*/;
  return raw
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean);
}

function categorySlug(label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!slug) return '';
  return CATEGORY_ROUTE_ALIASES[slug] ?? (slug.endsWith('-websites') ? slug : `${slug}-websites`);
}

function categoryHrefFromBase(label: string, baseUrl: string): string {
  const slug = categorySlug(label);
  const base = (baseUrl.trim() || '/templates').replace(/\/+$/, '');
  return slug ? `${base}/${slug}` : base;
}

function usableHref(value?: string): string {
  const href = value?.trim() ?? '';
  if (!href || href === '#' || href.toLowerCase() === 'about:blank') return '';
  return href;
}

function buildCategoryCrumbs(input: {
  categoryName: string;
  categoryNames?: string;
  categoryLink?: TemplateDetailLink;
  categoryLinks?: string;
  categoryBaseUrl: string;
}): TemplateDetailCategoryCrumb[] {
  const explicitLabels = splitCategoryList(input.categoryNames);
  const labels = explicitLabels.length ? explicitLabels : splitCategoryList(input.categoryName);
  const hrefs = splitCategoryList(input.categoryLinks).map(usableHref);
  const primaryHref = usableHref(normalizeTemplateDetailLink(input.categoryLink).href);
  const effectiveLabels = labels.length ? labels : ['Category'];

  return effectiveLabels.map((label, index) => ({
    label,
    href:
      (index === 0 && primaryHref) ||
      hrefs[index] ||
      categoryHrefFromBase(label, input.categoryBaseUrl),
  }));
}

function actionClick(
  component: string,
  event: string,
  enabled: boolean,
  templateSlug: string | undefined,
  payload: MarketplaceAnalyticsData,
  offer?: Parameters<typeof templateDetailAnalyticsBase>[2],
): void {
  trackMarketplaceEvent(
    'Code Component Event',
    {
      ...templateDetailAnalyticsBase(component, templateSlug, offer),
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
  categoryNames = '',
  categoryLink,
  categoryLinks = '',
  categoryBaseUrl = 'https://webflow.com/templates/category',
  creatorName = '',
  creatorLink,
  creatorAvatar,
  summary = '',
  publishedDate = '',
  price = '',
  isFree = false,
  browserPreviewUrl,
  designerPreviewUrl,
  previewIframeUrl,
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
  showPreviewIframe = true,
  showPreviewDeviceControls = true,
  previewDefaultDevice = 'desktop',
  showOfferBadge = true,
  enableAnalytics = true,
}) => {
  useMarketplaceComponentErrorTracking('TemplateDetailHero', enableAnalytics);
  const [previewIframeReady, setPreviewIframeReady] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<TemplateDetailPreviewDevice>(previewDefaultDevice);
  const [previewStageWidth, setPreviewStageWidth] = useState(0);
  const previewStageRef = useRef<HTMLDivElement>(null);
  const heroViewedRef = useRef(false);
  const previewVisibleTrackedRef = useRef(false);
  const previewLoadedHrefRef = useRef('');
  const previewLoadStartedAtRef = useRef<number | null>(null);

  const resolvedSlug = useMemo(() => inferTemplateSlug(templateSlug), [templateSlug]);
  const breadcrumbCategories = useMemo(
    () =>
      buildCategoryCrumbs({
        categoryName,
        categoryNames,
        categoryLink,
        categoryLinks,
        categoryBaseUrl,
      }),
    [categoryBaseUrl, categoryLink, categoryName, categoryNames, categoryLinks],
  );
  const creatorHref = normalizeTemplateDetailLink(creatorLink).href || '#';
  const avatar = normalizeTemplateDetailImage(creatorAvatar);
  const browserPreview = normalizeTemplateDetailLink(browserPreviewUrl);
  const designerPreview = normalizeTemplateDetailLink(designerPreviewUrl);
  const previewIframe = normalizeTemplateDetailLink(previewIframeUrl);
  const previewIframeHref = previewIframe.href || '';
  const hasPreviewIframe = Boolean(showPreviewIframe && previewIframeHref);
  const previewDimensions = PREVIEW_DEVICE_DIMENSIONS[previewDevice];
  const previewScale = previewStageWidth ? Math.min(1, previewStageWidth / previewDimensions.width) : 1;
  const previewStageStyle: CSSProperties = {
    minHeight: `${Math.round(previewDimensions.height * previewScale)}px`,
  };
  const previewFrameStyle: CSSProperties = {
    width: `${previewDimensions.width}px`,
    height: `${previewDimensions.height}px`,
    transform: `translateX(-50%) scale(${previewScale})`,
  };
  const titleLabel = useMemo(() => formatTemplateTitle(templateName), [templateName]);
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
    if (!enableAnalytics || heroViewedRef.current) return;
    heroViewedRef.current = true;
    actionClick('TemplateDetailHero', 'detail_hero_viewed', enableAnalytics, resolvedSlug, {
      has_creator: Boolean(creatorName),
      has_creator_avatar: Boolean(avatar.src),
      has_preview_iframe: Boolean(previewIframeHref),
      has_browser_preview: Boolean(browserPreview.href),
      has_designer_preview: Boolean(designerPreview.href),
      category_count: breadcrumbCategories.length,
      category_links_provided: Boolean(
        splitCategoryList(categoryLinks).some(usableHref) ||
          usableHref(normalizeTemplateDetailLink(categoryLink).href),
      ),
      default_preview_device: previewDefaultDevice,
      preview_device: previewDevice,
      preview_device_controls_enabled: showPreviewDeviceControls,
    }, offer);
  }, [
    avatar.src,
    browserPreview.href,
    breadcrumbCategories.length,
    categoryLink,
    categoryLinks,
    creatorName,
    designerPreview.href,
    enableAnalytics,
    offer,
    previewDefaultDevice,
    previewDevice,
    previewIframeHref,
    resolvedSlug,
    showPreviewDeviceControls,
  ]);

  useEffect(() => {
    setPreviewIframeReady(false);
    previewLoadedHrefRef.current = '';
    previewLoadStartedAtRef.current = null;
    if (!hasPreviewIframe || typeof window === 'undefined') return undefined;

    const timeout = window.setTimeout(() => {
      previewLoadStartedAtRef.current = typeof performance === 'undefined' ? Date.now() : performance.now();
      setPreviewIframeReady(true);
    }, 200);

    return () => window.clearTimeout(timeout);
  }, [hasPreviewIframe, previewIframeHref]);

  useEffect(() => {
    previewVisibleTrackedRef.current = false;
  }, [previewIframeHref]);

  useEffect(() => {
    setPreviewDevice(previewDefaultDevice);
  }, [previewDefaultDevice]);

  useEffect(() => {
    if (!hasPreviewIframe || typeof window === 'undefined') return undefined;
    const element = previewStageRef.current;
    if (!element) return undefined;

    const updateWidth = () => setPreviewStageWidth(element.clientWidth);
    updateWidth();

    const BrowserResizeObserver = typeof ResizeObserver === 'undefined' ? null : ResizeObserver;
    if (BrowserResizeObserver) {
      const observer = new BrowserResizeObserver(updateWidth);
      observer.observe(element);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [hasPreviewIframe]);

  useEffect(() => {
    if (!enableAnalytics || !hasPreviewIframe || typeof window === 'undefined') return undefined;
    const element = previewStageRef.current;
    if (!element) return undefined;

    const trackVisible = () => {
      if (previewVisibleTrackedRef.current) return;
      previewVisibleTrackedRef.current = true;
      actionClick('TemplateDetailHero', 'detail_preview_iframe_visible', enableAnalytics, resolvedSlug, {
        default_preview_device: previewDefaultDevice,
        preview_device: previewDevice,
        preview_device_controls_enabled: showPreviewDeviceControls,
      }, offer);
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
        { threshold: 0.25 },
      );
      observer.observe(element);
      return () => observer.disconnect();
    }

    const frame = window.requestAnimationFrame(trackVisible);
    return () => window.cancelAnimationFrame(frame);
  }, [
    enableAnalytics,
    hasPreviewIframe,
    offer,
    previewDefaultDevice,
    previewDevice,
    resolvedSlug,
    showPreviewDeviceControls,
  ]);

  function handlePreviewIframeLoad(): void {
    if (!previewIframeReady || !previewIframeHref || previewLoadedHrefRef.current === previewIframeHref) return;
    previewLoadedHrefRef.current = previewIframeHref;
    const now = typeof performance === 'undefined' ? Date.now() : performance.now();
    const startedAt = previewLoadStartedAtRef.current;
    actionClick('TemplateDetailHero', 'detail_preview_iframe_loaded', enableAnalytics, resolvedSlug, {
      default_preview_device: previewDefaultDevice,
      preview_device: previewDevice,
      preview_device_controls_enabled: showPreviewDeviceControls,
      preview_load_ms: startedAt === null ? null : Math.max(0, Math.round(now - startedAt)),
      has_preview_url: true,
    }, offer);
  }

  const badgeClass =
    offer.tone === 'sale'
      ? 'wfdt-badge wfdt-badge-sale'
      : offer.tone === 'verified'
        ? 'wfdt-badge wfdt-badge-verified'
        : 'wfdt-badge';
  const primaryTarget = targetForHref(offer.primaryHref, offer.primaryTarget);

  return (
    <div className="wfdt" data-template-detail-hero="">
      <style>{TEMPLATE_DETAIL_STYLES}</style>
      <section className="wfdt-hero">
        <div className="wfdt-hero-copy">
          <nav className="wfdt-breadcrumb" aria-label="Template breadcrumb">
            <a className="wfdt-breadcrumb-marketplace" href="/marketplace" aria-label="Marketplace">
              <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" focusable="false">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M6.43934 3L3 6.43934V9C3 10.6569 4.34315 12 6 12C7.39788 12 8.57245 11.0439 8.90549 9.75H9.09451C9.42755 11.0439 10.6021 12 12 12C13.3979 12 14.5725 11.0439 14.9055 9.75H15.0945C15.4275 11.0439 16.6021 12 18 12C19.6569 12 21 10.6569 21 9V6.43934L17.5607 3H6.43934ZM4.5 7.06066L7.06066 4.5H16.9393L19.5 7.06066V9C19.5 9.82843 18.8284 10.5 18 10.5C17.1716 10.5 16.5 9.82843 16.5 9V8.25H13.5V9C13.5 9.82843 12.8284 10.5 12 10.5C11.1716 10.5 10.5 9.82843 10.5 9V8.25H7.5V9C7.5 9.82843 6.82843 10.5 6 10.5C5.17157 10.5 4.5 9.82843 4.5 9V7.06066Z"
                  fill="#146EF5"
                />
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M6.43934 3L3 6.43934V9C3 10.6569 4.34315 12 6 12C7.39788 12 8.57245 11.0439 8.90549 9.75H9.09451C9.42755 11.0439 10.6021 12 12 12C13.3979 12 14.5725 11.0439 14.9055 9.75H15.0945C15.4275 11.0439 16.6021 12 18 12C19.6569 12 21 10.6569 21 9V6.43934L17.5607 3H6.43934ZM4.5 7.06066L7.06066 4.5H16.9393L19.5 7.06066V9C19.5 9.82843 18.8284 10.5 18 10.5C17.1716 10.5 16.5 9.82843 16.5 9V8.25H13.5V9C13.5 9.82843 12.8284 10.5 12 10.5C11.1716 10.5 10.5 9.82843 10.5 9V8.25H7.5V9C7.5 9.82843 6.82843 10.5 6 10.5C5.17157 10.5 4.5 9.82843 4.5 9V7.06066Z"
                  fill="url(#wfdt-marketplace-gradient-top)"
                />
                <path
                  d="M6 18V13.5H4.5V18C4.5 18.8284 5.17157 19.5 6 19.5H18C18.8284 19.5 19.5 18.8284 19.5 18V13.5H18V18H6Z"
                  fill="#146EF5"
                />
                <path
                  d="M6 18V13.5H4.5V18C4.5 18.8284 5.17157 19.5 6 19.5H18C18.8284 19.5 19.5 18.8284 19.5 18V13.5H18V18H6Z"
                  fill="url(#wfdt-marketplace-gradient-bottom)"
                />
                <defs>
                  <linearGradient
                    id="wfdt-marketplace-gradient-top"
                    x1="12"
                    y1="3"
                    x2="12"
                    y2="19.5"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopOpacity="0" />
                    <stop offset="1" stopOpacity="0.05" />
                  </linearGradient>
                  <linearGradient
                    id="wfdt-marketplace-gradient-bottom"
                    x1="12"
                    y1="3"
                    x2="12"
                    y2="19.5"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopOpacity="0" />
                    <stop offset="1" stopOpacity="0.05" />
                  </linearGradient>
                </defs>
              </svg>
            </a>
            <span className="wfdt-breadcrumb-chevron" aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 12 12" focusable="false">
                <path
                  d="m6.76 5.62-1.94-2.26.86-.73 2.56 2.99-2.56 2.99-.86-.73 1.94-2.26Z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <a className="wfdt-breadcrumb-link" href="/templates">
              Templates
            </a>
            <span className="wfdt-breadcrumb-chevron" aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 12 12" focusable="false">
                <path
                  d="m6.76 5.62-1.94-2.26.86-.73 2.56 2.99-2.56 2.99-.86-.73 1.94-2.26Z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <span className="wfdt-breadcrumb-categories">
              {breadcrumbCategories.map((category, index) => (
                <React.Fragment key={`${category.label}-${index}`}>
                  {index > 0 ? <span className="wfdt-breadcrumb-comma">, </span> : null}
                  <a className="wfdt-breadcrumb-link" href={category.href}>
                    {category.label}
                  </a>
                </React.Fragment>
              ))}
            </span>
          </nav>
          <div className="wfdt-hero-main">
            <div className="wfdt-hero-identity">
              <h1 className="wfdt-title">{titleLabel}</h1>
              {summary ? <p className="wfdt-summary">{summary}</p> : null}
              <div className="wfdt-meta-row">
                {creatorName ? (
                  <a className="wfdt-creator-link" href={creatorHref}>
                    {avatar.src ? (
                      <img className="wfdt-avatar" src={avatar.src} alt={avatar.alt || creatorName} />
                    ) : (
                      <span className="wfdt-avatar wfdt-avatar-fallback" aria-hidden="true">
                        {creatorName.trim().slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <span>{creatorName}</span>
                  </a>
                ) : null}
                {publishedDate ? <span className="wfdt-chip">Updated {publishedDate}</span> : null}
                {showOfferBadge && offer.badgeLabel ? <span className={badgeClass}>{offer.badgeLabel}</span> : null}
                {offer.savingsLabel ? <span className="wfdt-chip">{offer.savingsLabel}</span> : null}
              </div>
            </div>
            <div className="wfdt-actions">
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
                      preview_device: previewDevice,
                      cta_label: 'Preview in browser',
                    }, offer)
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
                      preview_device: previewDevice,
                      cta_label: 'Preview in Webflow',
                    }, offer)
                  }
                >
                  Preview in Webflow
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
                  actionClick('TemplateDetailHero', 'detail_primary_cta_clicked', enableAnalytics, resolvedSlug, {
                    cta_location: 'hero',
                    purchase_type: offer.purchaseType,
                    cta_label: offer.primaryLabel,
                    primary_href_present: Boolean(offer.primaryHref && offer.primaryHref !== '#'),
                  }, offer)
                }
              >
                {offer.primaryLabel}
              </a>
            </div>
          </div>
        </div>
      </section>
      {hasPreviewIframe ? (
        <section className="wfdt-preview-section" aria-label={`${titleLabel} preview`}>
          <div className="wfdt-preview-card">
            {showPreviewDeviceControls ? (
              <div className="wfdt-preview-controls" aria-label="Preview viewport">
                {(['desktop', 'mobile'] as const).map((device) => (
                  <button
                    key={device}
                    type="button"
                    className={`wfdt-preview-control${previewDevice === device ? ' wfdt-preview-control-active' : ''}`}
                    aria-pressed={previewDevice === device}
                    onClick={() => {
                      setPreviewDevice(device);
                      actionClick('TemplateDetailHero', 'detail_preview_viewport_changed', enableAnalytics, resolvedSlug, {
                        preview_device: device,
                        previous_preview_device: previewDevice,
                      }, offer);
                    }}
                  >
                    {device === 'desktop' ? 'Desktop' : 'Mobile'}
                  </button>
                ))}
              </div>
            ) : null}
            <div
              className={`wfdt-preview-stage wfdt-preview-stage-${previewDevice}`}
              ref={previewStageRef}
              style={previewStageStyle}
            >
              <div className={`wfdt-preview-frame wfdt-preview-frame-${previewDevice}`} style={previewFrameStyle}>
                <iframe
                  className="wfdt-preview-iframe"
                  src={previewIframeReady ? previewIframeHref : 'about:blank'}
                  data-src={previewIframeHref}
                  title={`${titleLabel} preview`}
                  loading="lazy"
                  sandbox="allow-scripts"
                  allowFullScreen
                  onLoad={handlePreviewIframeLoad}
                />
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
};

export const TemplateDetailHero: React.FC<TemplateDetailHeroProps> = (props) => (
  <MarketplaceComponentErrorBoundary component="TemplateDetailHero" enabled={props.enableAnalytics}>
    <TemplateDetailHeroInner {...props} />
  </MarketplaceComponentErrorBoundary>
);

export default TemplateDetailHero;
