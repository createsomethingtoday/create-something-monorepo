import React, { useEffect, useMemo, useState } from 'react';
import { TemplateFilterBar } from '../filter/TemplateFilterBar';
import {
  MarketplaceComponentErrorBoundary,
  useMarketplaceComponentErrorTracking,
} from './MarketplaceComponentErrorBoundary';
import { TemplateSearchBox } from './TemplateSearchBox';

type TemplateSort = 'popular' | 'newest' | 'price_asc' | 'price_desc';
type TemplateScope = 'all' | 'featured' | 'free' | 'landing_pages';
type SidebarInteractionMode = 'navigate' | 'filter';
type SidebarCountMode = 'global' | 'contextual';

interface SidebarCategory {
  name: string;
  slug: string;
  url?: string;
  count: number;
  active?: boolean;
}

interface SidebarPayload {
  pagination?: {
    total_items?: number;
  };
  category_pills?: SidebarCategory[];
}

interface SidebarCounts {
  all: number | null;
  featured: number | null;
  landing_pages: number | null;
  free: number | null;
}

interface CountContext {
  q: string;
  scope: TemplateScope;
  styleSlug: string | null;
  tagSlug: string | null;
  freeOnly: boolean;
}

export interface TemplateSearchSidebarProps {
  /** Base URL for the template search API, no trailing slash. */
  apiBase?: string;
  /** Sidebar heading. */
  title?: string;
  /** Designer preview scope. Production can still infer scope from the URL. */
  scopeOverride?: TemplateScope;
  /** Designer preview category slug. */
  categorySlug?: string;
  /** Designer preview subcategory slug. */
  subcategorySlug?: string;
  /** Designer preview style slug. */
  styleSlug?: string;
  /** Designer preview tag slug. */
  tagSlug?: string;
  /** Default sort used by the filter bar. */
  defaultSort?: TemplateSort;
  /** Click behavior for category/special rows. Navigate matches the native sidebar; Filter keeps the current page and updates URL state. */
  interactionMode?: SidebarInteractionMode;
  /** Count behavior. Global matches the native sidebar; Contextual reflects the current query/style/tag/free context. */
  countMode?: SidebarCountMode;
  /** Show the sidebar search input. */
  showSearch?: boolean;
  /** Search input placeholder. */
  searchPlaceholder?: string;
  /** Search destination when interaction mode is Navigate. */
  searchAction?: string;
  /** Query parameter used by the search destination. */
  queryParam?: string;
  /** Dispatch DOM/wf_analytics search events from the search input. */
  enableAnalytics?: boolean;
  /** Show All/Featured/Landing/Free rows. */
  showSpecialLinks?: boolean;
  /** Show category rows with counts. */
  showCategories?: boolean;
  /** Show counts next to rows. */
  showCounts?: boolean;
  /** Show style filters. */
  showStyles?: boolean;
  /** Show type filters. */
  showTypes?: boolean;
  /** Show sort controls. */
  showSort?: boolean;
  /** Show the free-only toggle. */
  showFreeOnly?: boolean;
}

const DEFAULT_API_BASE = 'https://templates.webflow.com/templates-api';
const WORKER_ORIGIN = 'https://webflow-template-search.createsomething.workers.dev';
const CLOUD_APP_PREVIEW_ORIGIN = 'https://webflow-template-marketplace.webflow.io';
const SIDEBAR_CACHE_TTL_MS = 5 * 60 * 1000;

const sidebarPayloadCache = new Map<string, { timestamp: number; data: SidebarPayload }>();

const SPECIAL_ROWS: Array<{
  key: keyof SidebarCounts;
  scope: TemplateScope;
  label: string;
  href: string;
}> = [
  { key: 'all', scope: 'all', label: 'All', href: '/templates/all' },
  { key: 'featured', scope: 'featured', label: 'Featured', href: '/templates/featured' },
  { key: 'landing_pages', scope: 'landing_pages', label: 'Landing Pages', href: '/templates/landing-page' },
  { key: 'free', scope: 'free', label: 'Free', href: '/templates/free-website-templates' },
];

const SIDEBAR_STYLES = `
.tmsidebar,
.tmsidebar * {
  box-sizing: border-box;
}

.tmsidebar {
  width: 100%;
  min-width: 0;
  padding: 18px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fff;
  color: #080808;
  font-family: "WF Visual Sans Variable", "WF Visual Sans", "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.tmsidebar-title {
  margin: 0 0 16px;
  color: #080808;
  font-size: 15px;
  font-weight: 650;
  line-height: 1.2;
  letter-spacing: 0;
}

.tmsidebar-search {
  margin-bottom: 12px;
}

.tmsidebar-search-input {
  appearance: none;
  width: 100%;
  min-height: 36px;
  margin: 0;
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #fff;
  color: #080808;
  font: inherit;
  font-size: 14px;
  line-height: 1.2;
}

.tmsidebar-search-input::placeholder {
  color: #757575;
}

.tmsidebar-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.tmsidebar-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  min-height: 40px;
  width: 100%;
  padding: 8px;
  border: 0;
  border-radius: 4px;
  background: #fff;
  color: #363636;
  cursor: pointer;
  font: inherit;
  font-size: 14px;
  line-height: 24px;
  text-align: left;
  text-decoration: none;
}

.tmsidebar-row:hover,
.tmsidebar-row:focus-visible,
.tmsidebar-row[aria-current="page"] {
  background: #f5f5f5;
  color: #146ef5;
}

.tmsidebar-row:focus-visible {
  outline: 2px solid #146ef5;
  outline-offset: 2px;
}

.tmsidebar-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
  border: 1px solid currentColor;
  border-radius: 4px;
  color: #757575;
  opacity: 0.8;
}

.tmsidebar-row[aria-current="page"] .tmsidebar-icon,
.tmsidebar-row:hover .tmsidebar-icon {
  color: #146ef5;
  opacity: 1;
}

.tmsidebar-label {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tmsidebar-count {
  flex: 0 0 auto;
  color: #757575;
  font-size: 11px;
  line-height: 16px;
  opacity: 0.72;
  font-variant-numeric: tabular-nums;
}

.tmsidebar-divider {
  height: 1px;
  margin: 8px 0;
  background: #e0e0e0;
}

.tmsidebar-loading,
.tmsidebar-error {
  padding: 8px;
  color: #757575;
  font-size: 13px;
  line-height: 1.35;
}

.tmsidebar-filters {
  margin-top: 16px;
}

.tmsidebar .tmfilter-filter-sort-container,
.tmsidebar .tmfilter-root {
  flex-direction: column;
  align-items: stretch;
}

.tmsidebar .tmfilter-dropdown,
.tmsidebar .tmfilter-search-wrap,
.tmsidebar .tmfilter-sort,
.tmsidebar .tmfilter-sort-toggle {
  width: 100%;
  min-width: 0;
  margin-left: 0;
}

.tmsidebar .tmfilter-sort-toggle {
  flex-direction: column;
}

.tmsidebar .tmfilter-sort-option {
  width: 100%;
  border-left: 0;
  border-top: 1px solid #e0e0e0;
  text-align: left;
}

.tmsidebar .tmfilter-sort-option:first-child {
  border-top: 0;
}
`;

function resolveApiBase(apiBase?: string): string {
  const rawBase = apiBase || DEFAULT_API_BASE;
  return rawBase.startsWith(WORKER_ORIGIN) || rawBase.startsWith(CLOUD_APP_PREVIEW_ORIGIN)
    ? DEFAULT_API_BASE
    : rawBase;
}

function toFilterSlug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function normalizeScope(value: string | null): TemplateScope | null {
  switch (value) {
    case 'all':
    case 'featured':
    case 'free':
    case 'landing_pages':
      return value;
    default:
      return null;
  }
}

function readCurrentScope(): TemplateScope {
  if (typeof window === 'undefined') return 'all';
  const url = new URL(window.location.href);
  const scopeParam = normalizeScope(url.searchParams.get('scope'));
  if (scopeParam) return scopeParam;
  const pathname = url.pathname.replace(/\/+$/, '');
  if (pathname === '/templates/featured') return 'featured';
  if (pathname === '/templates/free' || pathname === '/templates/free-website-templates') return 'free';
  if (/\/templates\/landing-page(s)?($|\/)/.test(pathname)) return 'landing_pages';
  return 'all';
}

function readCurrentCategory(categorySlugOverride?: string): string | null {
  if (categorySlugOverride) return categorySlugOverride;
  if (typeof window === 'undefined') return null;
  const url = new URL(window.location.href);
  const pathname = url.pathname.replace(/\/+$/, '');
  const categoryMatch = pathname.match(/\/templates\/category\/([^/?#]+)/);
  return categoryMatch ? categoryMatch[1] : url.searchParams.get('category') || url.searchParams.get('category_group_slug');
}

function readCurrentQuery(): string {
  if (typeof window === 'undefined') return '';
  const params = new URL(window.location.href).searchParams;
  return (params.get('q') ?? params.get('query') ?? params.get('search') ?? '').trim();
}

function readCountContext(countMode: SidebarCountMode, styleSlugOverride?: string, tagSlugOverride?: string): CountContext {
  if (typeof window === 'undefined' || countMode === 'global') {
    return { q: '', scope: 'all', styleSlug: null, tagSlug: null, freeOnly: false };
  }
  const url = new URL(window.location.href);
  const params = url.searchParams;
  const scope = readCurrentScope();
  return {
    q: (params.get('q') ?? params.get('query') ?? params.get('search') ?? '').trim(),
    scope,
    styleSlug: styleSlugOverride || params.get('style_slug') || params.get('style'),
    tagSlug: tagSlugOverride || params.get('tag_slug') || params.get('tag'),
    freeOnly: ['1', 'true', 'yes', 'on'].includes((params.get('free_only') ?? '').toLowerCase()),
  };
}

function appendCountContext(url: URL, context: CountContext, scope?: TemplateScope): void {
  if (context.q) url.searchParams.set('q', context.q);
  const resolvedScope = scope ?? context.scope;
  if (resolvedScope !== 'all') url.searchParams.set('scope', resolvedScope);
  if (context.styleSlug) url.searchParams.set('style_slug', toFilterSlug(context.styleSlug));
  if (context.tagSlug) url.searchParams.set('tag_slug', toFilterSlug(context.tagSlug));
  if (context.freeOnly || resolvedScope === 'free') url.searchParams.set('free_only', 'true');
}

function buildSearchApiUrl(apiBase: string, context: CountContext, scope?: TemplateScope): string {
  const absolute = apiBase.startsWith('/') && typeof window !== 'undefined'
    ? `${window.location.origin}${apiBase}`
    : apiBase;
  const url = new URL(`${absolute}/api/templates/search`);
  url.searchParams.set('include', 'items,pills');
  url.searchParams.set('page', '1');
  url.searchParams.set('page_size', '1');
  url.searchParams.set('sort', 'popular');
  appendCountContext(url, context, scope);
  return url.toString();
}

async function fetchSidebarPayload(url: string, signal: AbortSignal): Promise<SidebarPayload> {
  const cached = sidebarPayloadCache.get(url);
  if (cached && Date.now() - cached.timestamp < SIDEBAR_CACHE_TTL_MS) return cached.data;
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Sidebar counts failed with ${response.status}`);
  const data = (await response.json()) as SidebarPayload;
  sidebarPayloadCache.set(url, { timestamp: Date.now(), data });
  return data;
}

function formatCount(value: number | null): string {
  return typeof value === 'number' ? value.toLocaleString() : '';
}

function notifySidebarFiltersChanged(source: string): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  const detail = {
    q: (url.searchParams.get('q') ?? url.searchParams.get('query') ?? url.searchParams.get('search') ?? '').trim(),
    styles: url.searchParams.getAll('styles').flatMap((value) => value.split(',')).filter(Boolean),
    tags: url.searchParams.getAll('tags').flatMap((value) => value.split(',')).filter(Boolean),
    types: url.searchParams.getAll('types').flatMap((value) => value.split(',')).filter(Boolean),
    freeOnly: ['1', 'true', 'yes', 'on'].includes((url.searchParams.get('free_only') ?? '').toLowerCase()),
    sort: (url.searchParams.get('sort') as TemplateSort | null) ?? 'popular',
    href: window.location.href,
    source,
    updatedAt: Date.now(),
  };
  (window as unknown as Record<string, unknown>).__templateMarketplaceFilters = detail;
  window.dispatchEvent(new CustomEvent('templateFiltersChanged', { detail }));
  document.dispatchEvent(new CustomEvent('templateFiltersChanged', { detail }));
}

const TemplateSearchSidebarInner: React.FC<TemplateSearchSidebarProps> = ({
  apiBase: apiBaseProp = '',
  title = 'Categories',
  scopeOverride = 'all',
  categorySlug = '',
  subcategorySlug = '',
  styleSlug = '',
  tagSlug = '',
  defaultSort = 'popular',
  interactionMode = 'navigate',
  countMode = 'global',
  showSearch = true,
  searchPlaceholder = 'Search for templates',
  searchAction = 'https://webflow.com/templates/search-v2',
  queryParam = 'q',
  enableAnalytics = true,
  showSpecialLinks = true,
  showCategories = true,
  showCounts = true,
  showStyles = true,
  showTypes = true,
  showSort = true,
  showFreeOnly = true,
}) => {
  useMarketplaceComponentErrorTracking('TemplateSearchSidebar', enableAnalytics);

  const apiBase = resolveApiBase(apiBaseProp);
  const [counts, setCounts] = useState<SidebarCounts>({ all: null, featured: null, landing_pages: null, free: null });
  const [categories, setCategories] = useState<SidebarCategory[]>([]);
  const [loading, setLoading] = useState(showCategories || showSpecialLinks);
  const [error, setError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [routeVersion, setRouteVersion] = useState(0);

  const activeScope = scopeOverride !== 'all' ? scopeOverride : readCurrentScope();
  const activeCategory = readCurrentCategory(categorySlug);
  const shouldUseFilterMode = interactionMode === 'filter';

  const countContext = useMemo(
    () => readCountContext(countMode, styleSlug || undefined, tagSlug || undefined),
    [countMode, routeVersion, styleSlug, tagSlug],
  );

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);

    const categoryUrl = buildSearchApiUrl(apiBase, countContext, countMode === 'contextual' ? undefined : 'all');
    const specialUrls = SPECIAL_ROWS.reduce<Record<keyof SidebarCounts, string>>((acc, row) => {
      acc[row.key] = buildSearchApiUrl(apiBase, countContext, row.scope);
      return acc;
    }, { all: categoryUrl, featured: categoryUrl, landing_pages: categoryUrl, free: categoryUrl });

    Promise.all([
      fetchSidebarPayload(categoryUrl, ac.signal),
      fetchSidebarPayload(specialUrls.all, ac.signal),
      fetchSidebarPayload(specialUrls.featured, ac.signal),
      fetchSidebarPayload(specialUrls.landing_pages, ac.signal),
      fetchSidebarPayload(specialUrls.free, ac.signal),
    ])
      .then(([categoryPayload, allPayload, featuredPayload, landingPayload, freePayload]) => {
        if (ac.signal.aborted) return;
        setCategories(categoryPayload.category_pills ?? []);
        setCounts({
          all: Number(allPayload.pagination?.total_items ?? 0),
          featured: Number(featuredPayload.pagination?.total_items ?? 0),
          landing_pages: Number(landingPayload.pagination?.total_items ?? 0),
          free: Number(freePayload.pagination?.total_items ?? 0),
        });
      })
      .catch((err) => {
        if (!ac.signal.aborted) setError(err instanceof Error ? err.message : 'Unable to load sidebar counts');
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });

    return () => ac.abort();
  }, [apiBase, countContext, countMode]);

  useEffect(() => {
    if (!shouldUseFilterMode) return;
    setSearchValue(readCurrentQuery());
  }, [routeVersion, shouldUseFilterMode]);

  useEffect(() => {
    const bump = () => setRouteVersion((value) => value + 1);
    window.addEventListener('popstate', bump);
    window.addEventListener('templateFiltersChanged', bump);
    document.addEventListener('templateFiltersChanged', bump);
    document.addEventListener('categoryFilterUpdated', bump);
    return () => {
      window.removeEventListener('popstate', bump);
      window.removeEventListener('templateFiltersChanged', bump);
      document.removeEventListener('templateFiltersChanged', bump);
      document.removeEventListener('categoryFilterUpdated', bump);
    };
  }, []);

  const onSpecialClick = (scope: TemplateScope, event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!shouldUseFilterMode || typeof window === 'undefined') return;
    event.preventDefault();
    const url = new URL(window.location.href);
    url.searchParams.delete('category');
    url.searchParams.delete('category_group_slug');
    url.searchParams.delete('subcategory');
    url.searchParams.delete('child_category_slug');
    url.searchParams.delete('page');
    url.searchParams.delete('scope');
    url.searchParams.delete('free_only');
    if (scope !== 'all') url.searchParams.set('scope', scope);
    if (scope === 'free') url.searchParams.set('free_only', 'true');
    window.history.replaceState({}, '', url.toString());
    notifySidebarFiltersChanged('TemplateSearchSidebar');
  };

  const onCategoryClick = (category: SidebarCategory, event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!shouldUseFilterMode || typeof window === 'undefined') return;
    event.preventDefault();
    const url = new URL(window.location.href);
    const isActive = activeCategory === category.slug;
    url.searchParams.delete('subcategory');
    url.searchParams.delete('child_category_slug');
    url.searchParams.delete('page');
    if (isActive) {
      url.searchParams.delete('category');
      url.searchParams.delete('category_group_slug');
    } else {
      url.searchParams.set('category', category.slug);
      url.searchParams.delete('category_group_slug');
    }
    window.history.replaceState({}, '', url.toString());
    notifySidebarFiltersChanged('TemplateSearchSidebar');
    document.dispatchEvent(
      new CustomEvent('categoryFilterUpdated', {
        detail: { parent: isActive ? null : category.slug, category: isActive ? null : category.slug, subcategory: null },
      }),
    );
  };

  const renderCount = (value: number | null) => {
    if (!showCounts) return null;
    return <span className="tmsidebar-count">{formatCount(value)}</span>;
  };

  return (
    <div className="tmsidebar">
      <style>{SIDEBAR_STYLES}</style>
      {title ? <p className="tmsidebar-title">{title}</p> : null}

      {showSearch && (
        <TemplateSearchBox
          className="tmsidebar-search"
          mode={shouldUseFilterMode ? 'filter' : 'route'}
          variant="sidebar"
          value={searchValue}
          onValueChange={setSearchValue}
          placeholder={searchPlaceholder}
          searchAction={searchAction}
          queryParam={queryParam}
          showButton={false}
          enableAnalytics
          source="TemplateSearchSidebar"
        />
      )}

      {(showSpecialLinks || showCategories) && (
        <nav aria-label="Template categories">
          <ul className="tmsidebar-list">
            {showSpecialLinks &&
              SPECIAL_ROWS.map((row) => {
                const active = activeScope === row.scope && !activeCategory;
                return (
                  <li key={row.key}>
                    <a
                      className="tmsidebar-row"
                      href={row.href}
                      aria-current={active ? 'page' : undefined}
                      onClick={(event) => onSpecialClick(row.scope, event)}
                    >
                      <span className="tmsidebar-icon" aria-hidden="true" />
                      <span className="tmsidebar-label">{row.label}</span>
                      {renderCount(counts[row.key])}
                    </a>
                  </li>
                );
              })}

            {showSpecialLinks && showCategories && <li className="tmsidebar-divider" aria-hidden="true" />}

            {showCategories && loading && categories.length === 0 && (
              <li className="tmsidebar-loading">Loading categories</li>
            )}

            {showCategories && error && categories.length === 0 && (
              <li className="tmsidebar-error">Unable to load categories</li>
            )}

            {showCategories &&
              categories.map((category) => {
                const active = activeCategory === category.slug;
                const href = category.url || `https://webflow.com/templates/category/${category.slug}`;
                return (
                  <li key={category.slug}>
                    <a
                      className="tmsidebar-row"
                      href={href}
                      aria-current={active ? 'page' : undefined}
                      onClick={(event) => onCategoryClick(category, event)}
                    >
                      <span className="tmsidebar-icon" aria-hidden="true" />
                      <span className="tmsidebar-label">{category.name}</span>
                      {renderCount(category.count)}
                    </a>
                  </li>
                );
              })}
          </ul>
        </nav>
      )}

      {(showStyles || showTypes || showSort || showFreeOnly) && (
        <div className="tmsidebar-filters">
          <TemplateFilterBar
            apiBase={apiBase}
            scopeOverride={scopeOverride}
            categorySlug={categorySlug}
            subcategorySlug={subcategorySlug}
            styleSlug={styleSlug}
            tagSlug={tagSlug}
            showSearch={false}
            showStyles={showStyles}
            showTypes={showTypes}
            showSort={showSort}
            sortDisplay="segmented"
            showFreeOnly={showFreeOnly && activeScope !== 'free'}
            showSubcategoryPills={false}
            defaultSort={defaultSort}
          />
        </div>
      )}
    </div>
  );
};

export const TemplateSearchSidebar: React.FC<TemplateSearchSidebarProps> = (props) => (
  <MarketplaceComponentErrorBoundary component="TemplateSearchSidebar" enabled={props.enableAnalytics}>
    <TemplateSearchSidebarInner {...props} />
  </MarketplaceComponentErrorBoundary>
);

export default TemplateSearchSidebar;
