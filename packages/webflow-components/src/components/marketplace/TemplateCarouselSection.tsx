import React, { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TemplateCard, TEMPLATE_CARD_STYLES } from '../cards/TemplateCard';
import { MarketplaceExperimentRole, trackMarketplaceEvent } from './analytics';
import type { TemplateSort } from './templateRoute';

type TemplateScope = 'all' | 'featured' | 'free' | 'landing_pages';
type TemplateScopeSetting = 'auto' | TemplateScope;
type TemplateSortSetting = 'auto' | TemplateSort;

export type TemplateCarouselPreset =
  | 'custom'
  | 'curated_by_webflow'
  | 'marketing_teams'
  | 'recently_added'
  | 'free_templates';

interface TemplateCarouselLink {
  href: string;
  target?: string;
}

interface ApiItem {
  id: string;
  template_slug: string;
  name: string;
  url: string | null;
  creator_name: string | null;
  creator_profile_url: string | null;
  creator_avatar_url: string | null;
  creator_avatar_alt: string | null;
  thumbnail_image_url: string | null;
  thumbnail_image_secondary_url: string | null;
  price: number | null;
  is_free: boolean;
  popularity_score: number | null;
  published_date: string | null;
}

interface ApiResponse {
  items: ApiItem[];
  pagination: {
    total_items: number;
  };
}

export interface TemplateCarouselSectionProps {
  /** Base URL for the template search API, no trailing slash. */
  apiBase?: string;
  /** Editorial preset for the section. Some presets are current-data proxies until dedicated curation fields exist. */
  preset?: TemplateCarouselPreset;
  /** Optional heading override. Blank values use the selected preset copy. */
  title?: string;
  /** Optional body copy override. Blank values use the selected preset copy. */
  description?: string;
  /** Optional CTA label override. Blank values use the selected preset copy. */
  ctaLabel?: string;
  /** Optional CTA link override. Blank values use the selected preset link. */
  ctaLink?: TemplateCarouselLink;
  /** Number of templates to fetch. */
  itemLimit?: number;
  /** Override API scope. Auto uses the selected preset. */
  scopeOverride?: TemplateScopeSetting;
  /** Override API sort. Auto uses the selected preset. */
  sortOverride?: TemplateSortSetting;
  /** Optional category group slug filter. */
  categorySlug?: string;
  /** Optional child category slug filter. */
  subcategorySlug?: string;
  /** Optional comma-separated template type filter, e.g. "One Page". */
  typeFilter?: string;
  /** Optional comma-separated style filter. Display names are converted to slugs. */
  styleFilter?: string;
  /** Optional keyword query. */
  query?: string;
  /** Show the section CTA. */
  showCta?: boolean;
  /** Show a compact result count in the section header. */
  showCount?: boolean;
  /** Track CTA, carousel navigation, template clicks, and creator clicks through wf_analytics and a custom DOM event. */
  enableAnalytics?: boolean;
  /** Experiment role used by Marketplace Landing Experiment Gate selectors. */
  experimentRole?: MarketplaceExperimentRole;
}

interface PresetConfig {
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  scope: TemplateScope;
  sort: TemplateSort;
  freeOnly?: boolean;
  query?: string;
}

const DEFAULT_API_BASE = 'https://templates.webflow.com/templates-api';
const WORKER_ORIGIN = 'https://webflow-template-search.createsomething.workers.dev';
const CLOUD_APP_PREVIEW_ORIGIN = 'https://webflow-template-marketplace.webflow.io';
const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
const IMAGE_PROXY_BLOCKLIST = ['airtableusercontent.com'];

const responseCache = new Map<string, { timestamp: number; data: ApiResponse }>();

const PRESETS: Record<TemplateCarouselPreset, PresetConfig> = {
  custom: {
    title: 'Featured templates',
    description: 'Explore professionally designed Webflow templates.',
    ctaLabel: 'Browse templates',
    ctaHref: 'https://webflow.com/templates',
    scope: 'all',
    sort: 'popular',
  },
  curated_by_webflow: {
    title: 'Curated by Webflow',
    description: 'Handpicked HTML templates selected from current marketplace performance.',
    ctaLabel: 'Browse all top rated',
    ctaHref: 'https://webflow.com/templates/featured',
    scope: 'featured',
    sort: 'popular',
  },
  marketing_teams: {
    title: 'Built for marketing teams',
    description: 'HTML templates designed to drive traffic, capture leads, and convert visitors.',
    ctaLabel: 'Browse all sites for marketing teams',
    ctaHref: 'https://webflow.com/templates/search?query=marketing',
    scope: 'all',
    sort: 'popular',
    query: 'marketing',
  },
  recently_added: {
    title: 'Recently added',
    description: 'Fresh new HTML templates from expert creators.',
    ctaLabel: 'Browse all new templates',
    ctaHref: 'https://webflow.com/templates/all?sort=newest',
    scope: 'all',
    sort: 'newest',
  },
  free_templates: {
    title: 'Free templates to get started',
    description: "Not ready to commit? Try a free HTML template and upgrade when you're ready.",
    ctaLabel: 'Browse free templates',
    ctaHref: 'https://webflow.com/templates/free-website-templates',
    scope: 'free',
    sort: 'popular',
    freeOnly: true,
  },
};

const CAROUSEL_STYLES = `
.tmcarousel-section,
.tmcarousel-section * {
  box-sizing: border-box;
}

.tmcarousel-section {
  width: 100%;
  color: #080808;
  font-family: "WF Visual Sans Variable", "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.tmcarousel-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 24px;
}

.tmcarousel-copy {
  max-width: 720px;
  min-width: 0;
}

.tmcarousel-title {
  margin: 0;
  color: #080808;
  font-size: 32px;
  line-height: 1.08;
  font-weight: 650;
}

.tmcarousel-description {
  max-width: 620px;
  margin: 10px 0 0;
  color: #5f5f5f;
  font-size: 16px;
  line-height: 1.45;
}

.tmcarousel-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  flex: 0 0 auto;
}

.tmcarousel-count {
  color: #757575;
  font-size: 13px;
  line-height: 1.4;
  white-space: nowrap;
}

.tmcarousel-cta {
  color: #146ef5;
  font-size: 14px;
  font-weight: 570;
  line-height: 1.3;
  text-decoration: none;
  white-space: nowrap;
}

.tmcarousel-cta:hover {
  color: #0f55d9;
  text-decoration: underline;
}

.tmcarousel-shell {
  position: relative;
  min-width: 0;
}

.tmcarousel-track {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(178px, 224px);
  gap: 24px;
  width: 100%;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 0 2px 10px;
  scroll-snap-type: x proximity;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.tmcarousel-track::-webkit-scrollbar {
  display: none;
}

.tmcarousel-item {
  min-width: 0;
  scroll-snap-align: start;
}

.tmcarousel-nav {
  position: absolute;
  top: 38%;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid #d9d9d9;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.96);
  color: #080808;
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.12);
}

.tmcarousel-nav:hover {
  border-color: #a8a8a8;
}

.tmcarousel-nav:focus-visible {
  outline: 2px solid #146ef5;
  outline-offset: 2px;
}

.tmcarousel-nav[data-direction="prev"] {
  left: -20px;
}

.tmcarousel-nav[data-direction="next"] {
  right: -20px;
}

.tmcarousel-skeleton {
  display: block;
}

.tmcarousel-skeleton-image,
.tmcarousel-skeleton-line {
  background: linear-gradient(90deg, #ebebeb 25%, #f5f5f5 50%, #ebebeb 75%);
  background-size: 1200px 100%;
  animation: tmcarousel-shimmer 1.4s infinite linear;
  border-radius: 8px;
}

.tmcarousel-skeleton-image {
  aspect-ratio: 150 / 199;
  margin-bottom: 14px;
}

.tmcarousel-skeleton-line {
  height: 14px;
  margin-bottom: 8px;
}

.tmcarousel-status {
  display: flex;
  align-items: center;
  min-height: 120px;
  color: #757575;
  font-size: 14px;
  line-height: 1.4;
}

@keyframes tmcarousel-shimmer {
  0% { background-position: -600px 0; }
  100% { background-position: 600px 0; }
}

@media (max-width: 991px) {
  .tmcarousel-track {
    grid-auto-columns: minmax(168px, 42%);
  }
}

@media (max-width: 767px) {
  .tmcarousel-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 14px;
  }

  .tmcarousel-title {
    font-size: 28px;
  }

  .tmcarousel-actions {
    justify-content: space-between;
    width: 100%;
  }

  .tmcarousel-track {
    grid-auto-columns: minmax(158px, 74%);
    gap: 16px;
  }

  .tmcarousel-nav {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tmcarousel-skeleton-image,
  .tmcarousel-skeleton-line {
    animation: none;
  }
}
` + TEMPLATE_CARD_STYLES;

const S: Record<string, CSSProperties> = {
  fallbackButton: {
    marginTop: 12,
    padding: '8px 16px',
    fontSize: 13,
    border: '1px solid #d9d9d9',
    borderRadius: 4,
    background: '#fff',
    cursor: 'pointer',
  },
};

function resolveApiBase(apiBaseProp?: string): string {
  const rawBase = apiBaseProp || DEFAULT_API_BASE;
  return rawBase.startsWith(WORKER_ORIGIN) || rawBase.startsWith(CLOUD_APP_PREVIEW_ORIGIN)
    ? DEFAULT_API_BASE
    : rawBase;
}

function toStyleSlug(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function csvValues(value?: string, normalize?: (part: string) => string): string[] {
  return (value ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => (normalize ? normalize(part) : part));
}

function normalizeLimit(value?: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 8;
  return Math.min(Math.max(Math.round(numeric), 1), 24);
}

function proxyImageUrl(imageUrl: string, apiBase: string): string {
  try {
    const host = new URL(imageUrl).hostname;
    if (IMAGE_PROXY_BLOCKLIST.some((blocked) => host.includes(blocked))) {
      const proxyBase = apiBase.startsWith('/') && typeof window !== 'undefined'
        ? `${window.location.origin}${apiBase}`
        : apiBase;
      return `${proxyBase}/api/avatar?url=${encodeURIComponent(imageUrl)}`;
    }
  } catch {
    return imageUrl;
  }
  return imageUrl;
}

function formatPrice(item: ApiItem): string {
  if (typeof item.price === 'number' && item.price > 0) return `${item.price} USD`;
  if (item.price === 0 || item.is_free) return 'Free';
  return '';
}

function isFreeTemplate(item: ApiItem): boolean {
  if (typeof item.price === 'number') return item.price === 0;
  return item.is_free;
}

function requiresStrictFreeFilter(scope: TemplateScope, preset: PresetConfig): boolean {
  return scope === 'free' || preset.freeOnly === true;
}

function normalizeCarouselResponse(data: ApiResponse, scope: TemplateScope, preset: PresetConfig): ApiResponse {
  if (!requiresStrictFreeFilter(scope, preset)) return data;
  const items = data.items.filter(isFreeTemplate);
  return {
    ...data,
    items,
    pagination: {
      ...data.pagination,
      total_items: Math.max(0, data.pagination.total_items - (data.items.length - items.length)),
    },
  };
}

function priceNumeric(item: ApiItem): string {
  if (typeof item.price !== 'number') return '';
  return String(item.price);
}

function primaryThumbnailUrl(item: ApiItem): string | null {
  return item.thumbnail_image_url ?? item.thumbnail_image_secondary_url;
}

function buildApiUrl(
  base: string,
  options: {
    preset: PresetConfig;
    limit: number;
    scope: TemplateScope;
    sort: TemplateSort;
    categorySlug?: string;
    subcategorySlug?: string;
    typeFilter?: string;
    styleFilter?: string;
    query?: string;
  },
): string {
  const absolute = base.startsWith('/') && typeof window !== 'undefined'
    ? `${window.location.origin}${base}`
    : base;
  const url = new URL(`${absolute}/api/templates/search`);
  url.searchParams.set('include', 'items');
  url.searchParams.set('page', '1');
  url.searchParams.set('page_size', String(options.limit));
  url.searchParams.set('sort', options.sort);
  if (options.scope !== 'all') url.searchParams.set('scope', options.scope);

  const q = (options.query || options.preset.query || '').trim();
  if (q) url.searchParams.set('q', q);
  if (options.preset.freeOnly || options.scope === 'free') url.searchParams.set('free_only', 'true');
  if (options.categorySlug) url.searchParams.set('category_group_slug', options.categorySlug.trim());
  if (options.subcategorySlug) url.searchParams.set('child_category_slug', options.subcategorySlug.trim());
  csvValues(options.typeFilter).forEach((value) => url.searchParams.append('types', value));
  csvValues(options.styleFilter, toStyleSlug).forEach((value) => url.searchParams.append('styles', value));
  return url.toString();
}

const SkeletonCard: React.FC<{ index: number }> = ({ index }) => (
  <div className="tmcarousel-item tmcarousel-skeleton" style={{ animationDelay: `${index * 35}ms` }}>
    <div className="tmcarousel-skeleton-image" />
    <div className="tmcarousel-skeleton-line" style={{ width: '72%' }} />
    <div className="tmcarousel-skeleton-line" style={{ width: '46%' }} />
  </div>
);

export const TemplateCarouselSection: React.FC<TemplateCarouselSectionProps> = ({
  apiBase: apiBaseProp = '',
  preset = 'curated_by_webflow',
  title = '',
  description = '',
  ctaLabel = '',
  ctaLink,
  itemLimit = 8,
  scopeOverride = 'auto',
  sortOverride = 'auto',
  categorySlug = '',
  subcategorySlug = '',
  typeFilter = '',
  styleFilter = '',
  query = '',
  showCta = true,
  showCount = false,
  enableAnalytics = true,
  experimentRole = 'treatment',
}) => {
  const selectedPreset = PRESETS[preset] ?? PRESETS.curated_by_webflow;
  const apiBase = resolveApiBase(apiBaseProp);
  const limit = normalizeLimit(itemLimit);
  const scope = scopeOverride === 'auto' ? selectedPreset.scope : scopeOverride;
  const sort = sortOverride === 'auto' ? selectedPreset.sort : sortOverride;
  const resolvedTitle = title.trim() || selectedPreset.title;
  const resolvedDescription = description.trim() || selectedPreset.description;
  const resolvedCtaLabel = ctaLabel.trim() || selectedPreset.ctaLabel;
  const resolvedCtaHref = ctaLink?.href || selectedPreset.ctaHref;
  const trackRef = useRef<HTMLDivElement>(null);

  const apiUrl = useMemo(
    () =>
      buildApiUrl(apiBase, {
        preset: selectedPreset,
        limit,
        scope,
        sort,
        categorySlug,
        subcategorySlug,
        typeFilter,
        styleFilter,
        query,
      }),
    [apiBase, categorySlug, limit, preset, query, scope, selectedPreset, sort, styleFilter, subcategorySlug, typeFilter],
  );

  const [items, setItems] = useState<ApiItem[]>([]);
  const [totalItems, setTotalItems] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(
    async (signal?: AbortSignal) => {
      const cached = responseCache.get(apiUrl);
      if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_TTL_MS) {
        const data = normalizeCarouselResponse(cached.data, scope, selectedPreset);
        setItems(data.items);
        setTotalItems(data.pagination.total_items);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const response = await fetch(apiUrl, { signal });
        if (!response.ok) throw new Error(`API ${response.status}`);
        const data = normalizeCarouselResponse((await response.json()) as ApiResponse, scope, selectedPreset);
        responseCache.set(apiUrl, { timestamp: Date.now(), data });
        setItems(data.items);
        setTotalItems(data.pagination.total_items);
      } catch (err) {
        if (signal?.aborted) return;
        setError(err instanceof Error ? err.message : 'Failed to load templates');
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [apiUrl, scope, selectedPreset],
  );

  useEffect(() => {
    const abortController = new AbortController();
    loadItems(abortController.signal);
    return () => abortController.abort();
  }, [loadItems]);

  const scroll = useCallback((direction: -1 | 1) => {
    const node = trackRef.current;
    if (!node) return;
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    node.scrollBy({
      left: direction * Math.max(280, Math.round(node.clientWidth * 0.82)),
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }, []);

  const trackSectionEvent = useCallback(
    (eventName: string, data: Record<string, string | number | boolean | null | undefined> = {}) => {
      trackMarketplaceEvent(
        eventName,
        {
          component: 'TemplateCarouselSection',
          section_preset: preset,
          section_title: resolvedTitle,
          scope,
          sort,
          ...data,
        },
        enableAnalytics,
      );
    },
    [enableAnalytics, preset, resolvedTitle, scope, sort],
  );

  const onNavClick = useCallback(
    (direction: -1 | 1) => {
      trackSectionEvent('Marketplace Landing Section - Carousel Navigated', {
        navigation_direction: direction === 1 ? 'next' : 'previous',
      });
      scroll(direction);
    },
    [scroll, trackSectionEvent],
  );

  const onItemClickCapture = useCallback(
    (item: ApiItem, index: number, event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest('a');
      if (!anchor) return;
      const isCreatorClick = anchor.classList.contains('tmcard-creator-link');
      trackSectionEvent(
        isCreatorClick
          ? 'Marketplace Landing Section - Creator Clicked'
          : 'Marketplace Landing Section - Template Clicked',
        {
          template_id: item.id,
          template_slug: item.template_slug,
          template_name: item.name,
          template_position: index + 1,
          creator_name: item.creator_name,
          link_url: anchor.getAttribute('href') || item.url || null,
        },
      );
    },
    [trackSectionEvent],
  );

  return (
    <section
      className="tmcarousel-section"
      aria-label={resolvedTitle}
      data-marketplace-component="template-carousel-section"
      data-marketplace-preset={preset}
      data-marketplace-scope={scope}
      data-marketplace-sort={sort}
      data-marketplace-landing-experiment={experimentRole === 'none' ? undefined : experimentRole}
    >
      <style dangerouslySetInnerHTML={{ __html: CAROUSEL_STYLES }} />
      <div className="tmcarousel-header">
        <div className="tmcarousel-copy">
          <h2 className="tmcarousel-title">{resolvedTitle}</h2>
          {resolvedDescription && <p className="tmcarousel-description">{resolvedDescription}</p>}
        </div>
        <div className="tmcarousel-actions">
          {showCount && totalItems !== null && (
            <div className="tmcarousel-count">
              {totalItems.toLocaleString()} template{totalItems === 1 ? '' : 's'}
            </div>
          )}
          {showCta && resolvedCtaHref && (
            <a
              className="tmcarousel-cta"
              href={resolvedCtaHref}
              target={ctaLink?.target}
              rel={ctaLink?.target === '_blank' ? 'noreferrer' : undefined}
              data-marketplace-link="section-cta"
              onClick={() =>
                trackSectionEvent('Marketplace Landing Section - CTA Clicked', {
                  cta_label: resolvedCtaLabel,
                  cta_href: resolvedCtaHref,
                })
              }
            >
              {resolvedCtaLabel}
            </a>
          )}
        </div>
      </div>

      <div className="tmcarousel-shell">
        {items.length > 3 && (
          <>
            <button
              type="button"
              className="tmcarousel-nav"
              data-direction="prev"
              aria-label={`Previous ${resolvedTitle} templates`}
              onClick={() => onNavClick(-1)}
            >
              <span aria-hidden="true">&lt;</span>
            </button>
            <button
              type="button"
              className="tmcarousel-nav"
              data-direction="next"
              aria-label={`Next ${resolvedTitle} templates`}
              onClick={() => onNavClick(1)}
            >
              <span aria-hidden="true">&gt;</span>
            </button>
          </>
        )}

        <div ref={trackRef} className="tmcarousel-track">
          {loading && items.length === 0
            ? Array.from({ length: Math.min(limit, 8) }).map((_, index) => (
                <SkeletonCard key={`skeleton-${index}`} index={index} />
              ))
            : items.map((item, index) => {
                const primaryImageUrl = primaryThumbnailUrl(item);
                return (
                  <div
                    key={item.id}
                    className="tmcarousel-item"
                    data-template-slug={item.template_slug}
                    data-marketplace-template-position={index + 1}
                    onClickCapture={(event) => onItemClickCapture(item, index, event)}
                  >
                    <TemplateCard
                      templateName={item.name}
                      templateLink={{ href: item.url ?? '#' }}
                      price={formatPrice(item)}
                      priceNumeric={priceNumeric(item)}
                      isFree={isFreeTemplate(item)}
                      creatorName={item.creator_name ?? ''}
                      creatorLink={
                        item.creator_profile_url
                          ? { href: item.creator_profile_url, target: '_blank' }
                          : undefined
                      }
                      creatorIcon={
                        item.creator_avatar_url
                          ? {
                              src: proxyImageUrl(item.creator_avatar_url, apiBase),
                              alt: item.creator_avatar_alt ?? item.creator_name ?? '',
                            }
                          : undefined
                      }
                      primaryImage={
                        primaryImageUrl ? { src: proxyImageUrl(primaryImageUrl, apiBase), alt: item.name } : undefined
                      }
                      secondaryImage={
                        item.thumbnail_image_secondary_url
                          ? { src: proxyImageUrl(item.thumbnail_image_secondary_url, apiBase), alt: item.name }
                          : undefined
                      }
                      priorityIndex={index}
                      deferSecondaryImage
                      stylesProvided
                      approvalDate={item.published_date ?? ''}
                      popularityScore={String(item.popularity_score ?? '')}
                      badgeVariant={preset === 'recently_added' ? 'new' : preset === 'curated_by_webflow' ? 'featured' : 'none'}
                      badgeText={preset === 'recently_added' ? 'New' : preset === 'curated_by_webflow' ? 'Curated' : ''}
                    />
                  </div>
                );
              })}
        </div>

        {!loading && error && items.length === 0 && (
          <div className="tmcarousel-status">
            <div>
              <div>Unable to load templates.</div>
              <button type="button" onClick={() => loadItems()} style={S.fallbackButton}>
                Retry
              </button>
            </div>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="tmcarousel-status">No templates found.</div>
        )}
      </div>
    </section>
  );
};

export default TemplateCarouselSection;
