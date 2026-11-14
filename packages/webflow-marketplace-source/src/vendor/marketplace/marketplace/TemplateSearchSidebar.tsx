import React, { useEffect, useId, useMemo, useState } from 'react';
import {
  MarketplaceComponentErrorBoundary,
  useMarketplaceComponentErrorTracking,
} from './MarketplaceComponentErrorBoundary';
import { TemplateSearchBox } from './TemplateSearchBox';
import { normalizeTemplateSort } from './templateRoute';

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
  /** Collapse the standalone sidebar into a mobile accordion below the tablet breakpoint. */
  collapseOnMobile?: boolean;
}

const DEFAULT_API_BASE = 'https://templates.webflow.com/templates-api';
const WORKER_ORIGIN = 'https://webflow-template-search.webflow-inc.workers.dev';
const CLOUD_APP_PREVIEW_ORIGIN = 'https://webflow-template-marketplace.webflow.io';
const SIDEBAR_CACHE_TTL_MS = 5 * 60 * 1000;

const sidebarPayloadCache = new Map<string, { timestamp: number; data: SidebarPayload }>();

const SPECIAL_ROWS: Array<{
  key: keyof SidebarCounts;
  scope: TemplateScope;
  label: string;
  href: string;
  iconUrl: string;
}> = [
  {
    key: 'all',
    scope: 'all',
    label: 'All',
    href: '/templates/all',
    iconUrl: 'https://cdn.prod.website-files.com/5e593fb060cf87bbaf75dd20/670e6774244fae7c3beb91e0_Size%3D24px.svg',
  },
  {
    key: 'featured',
    scope: 'featured',
    label: 'Featured',
    href: '/templates/featured',
    iconUrl:
      'https://cdn.prod.website-files.com/5e593fb060cf87bbaf75dd20/670e68dbb4f6baeae8b9cbcb_CapabilityAnalytics24%20(1).svg',
  },
  {
    key: 'landing_pages',
    scope: 'landing_pages',
    label: 'Landing Pages',
    href: '/templates/landing-page',
    iconUrl: 'https://cdn.prod.website-files.com/5e593fb060cf87bbaf75dd20/686f2395e5b4dac6d8658ead_map-marker.svg',
  },
  {
    key: 'free',
    scope: 'free',
    label: 'Free',
    href: '/templates/free-website-templates',
    iconUrl: 'https://cdn.prod.website-files.com/5e593fb060cf87bbaf75dd20/670e6764d8568093c6f4f208_tag%20(1).svg',
  },
];

const CATEGORY_ICON_URLS: Record<string, string> = {
  'architecture-and-design-websites':
    'https://cdn.prod.website-files.com/5e593fb060cf877cf875dd1f/6706cd38713733aafac171b0_Brush-(1).svg',
  'arts-and-entertainment-websites':
    'https://cdn.prod.website-files.com/5e593fb060cf877cf875dd1f/6706cd5b8ea070ac1f6f09d5_microphone-rotated-(1).svg',
  'blog-and-editorial-websites':
    'https://cdn.prod.website-files.com/5e593fb060cf877cf875dd1f/6706cd544ea9af6934f62a4f_Blog-(1).svg',
  'community-and-nonprofit-websites':
    'https://cdn.prod.website-files.com/5e593fb060cf877cf875dd1f/6706cd790202d15dd35c8964_heart-globe-(1).svg',
  'documentation-websites':
    'https://cdn.prod.website-files.com/5e593fb060cf877cf875dd1f/6706cd75713733aafac1c287_clipboard-(1).svg',
  'education-websites':
    'https://cdn.prod.website-files.com/5e593fb060cf877cf875dd1f/67108ca5557a7e0287bed9a4_University-(1).svg',
  'environment-websites':
    'https://cdn.prod.website-files.com/5e593fb060cf877cf875dd1f/6706cd2bc46e4abf254db245_sunrise.svg',
  'food-and-drink-websites':
    'https://cdn.prod.website-files.com/5e593fb060cf877cf875dd1f/67108c96215b682a860be340_drink-2-(1).svg',
  'government-websites':
    'https://cdn.prod.website-files.com/5e593fb060cf877cf875dd1f/6706cd735abd261a7f080744_bank-(1).svg',
  'hair-and-beauty-websites':
    'https://cdn.prod.website-files.com/5e593fb060cf877cf875dd1f/6706cd32352bd54b0587ecfe_sparkles.svg',
  'home-services-websites':
    'https://cdn.prod.website-files.com/5e593fb060cf877cf875dd1f/670948ff793d4e96cf024d19_home-services-icon.svg',
  'hr-and-hiring-websites':
    'https://cdn.prod.website-files.com/5e593fb060cf877cf875dd1f/6706cd3c4cfa0fe9a2251a36_TeamMedium.svg',
  'launch-and-coming-soon-websites':
    'https://cdn.prod.website-files.com/5e593fb060cf877cf875dd1f/670949025d74574ad09d0336_lighting-icon.svg',
  'medical-websites':
    'https://cdn.prod.website-files.com/5e593fb060cf877cf875dd1f/67108ca1bf381ac9e0b4629c_Motion-(1).svg',
  'music-and-audio-websites':
    'https://cdn.prod.website-files.com/5e593fb060cf877cf875dd1f/6706cd6fdb237a95d5837068_MusicNote.svg',
  'personal-websites':
    'https://cdn.prod.website-files.com/5e593fb060cf877cf875dd1f/6706cd8106f5ecd98e795b74_Docs.svg',
  'portfolio-and-agency-websites':
    'https://cdn.prod.website-files.com/5e593fb060cf877cf875dd1f/6706cd5751b1e01601445e5c_User-(1).svg',
  'professional-services-websites':
    'https://cdn.prod.website-files.com/5e593fb060cf877cf875dd1f/670db20ed0f2784e9e8e0335_target.svg',
  'real-estate-websites':
    'https://cdn.prod.website-files.com/5e593fb060cf877cf875dd1f/6706cd45c5f83dd2187bfdb1_location.svg',
  'retail-and-e-commerce-websites':
    'https://cdn.prod.website-files.com/5e593fb060cf877cf875dd1f/670db2115402ce59747c0c81_shopping-cart.svg',
  'technology-websites':
    'https://cdn.prod.website-files.com/5e593fb060cf877cf875dd1f/6711342ea3d7f258ad5e7943_CodeBrackets.svg',
  'transportation-websites':
    'https://cdn.prod.website-files.com/5e593fb060cf877cf875dd1f/6706cd8b5abd261a7f0827b7_train-track-(1).svg',
  'travel-websites':
    'https://cdn.prod.website-files.com/5e593fb060cf877cf875dd1f/67114e638bb1446cc23ec252_map-(1).svg',
  'ui-kit-websites':
    'https://cdn.prod.website-files.com/5e593fb060cf877cf875dd1f/6706cd43352bd54b05880da4_Apps-(1).svg',
  'weddings-and-events-websites':
    'https://cdn.prod.website-files.com/5e593fb060cf877cf875dd1f/6706cd83ddd640e52bafbd4d_Calendar-(1).svg',
  'wellness-websites':
    'https://cdn.prod.website-files.com/5e593fb060cf877cf875dd1f/6706cd49c46e4abf254dd5ec_bike-(1).svg',
};

const SIDEBAR_STYLES = `
.tmsidebar,
.tmsidebar * {
  box-sizing: border-box;
}

.tmsidebar {
  align-self: start;
  width: 100%;
  height: auto;
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

.tmsidebar-mobile-toggle {
  display: none;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 48px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #080808;
  cursor: pointer;
  font: inherit;
  font-size: 15px;
  font-weight: 650;
  line-height: 1.2;
  text-align: left;
  letter-spacing: 0;
}

.tmsidebar-mobile-chevron {
  flex: 0 0 auto;
  color: rgba(0, 0, 0, 0.48);
  font-size: 18px;
  line-height: 1;
  transition: transform 160ms ease;
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
  display: block;
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
  object-fit: contain;
  filter: grayscale(100%) brightness(60%);
  opacity: 0.9;
  transition: filter 120ms ease, opacity 120ms ease;
}

.tmsidebar-icon-fallback {
  display: inline-flex;
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: #d9d9d9;
}

.tmsidebar-row[aria-current="page"] .tmsidebar-icon,
.tmsidebar-row:hover .tmsidebar-icon,
.tmsidebar-row:focus-visible .tmsidebar-icon {
  filter: grayscale(0%) brightness(100%);
  opacity: 1;
}

.tmsidebar-row[aria-current="page"] .tmsidebar-icon-fallback,
.tmsidebar-row:hover .tmsidebar-icon-fallback {
  background: #e8f0ff;
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

@media (max-width: 991px) {
  .tmsidebar[data-collapse-mobile="true"] {
    padding: 0;
    overflow: hidden;
  }

  .tmsidebar[data-collapse-mobile="true"] .tmsidebar-title {
    display: none;
  }

  .tmsidebar[data-collapse-mobile="true"] .tmsidebar-mobile-toggle {
    display: flex;
    padding: 14px 16px;
  }

  .tmsidebar[data-collapse-mobile="true"] .tmsidebar-body {
    display: none;
    padding: 0 16px 16px;
  }

  .tmsidebar[data-collapse-mobile="true"][data-mobile-open="true"] .tmsidebar-body {
    display: block;
  }

  .tmsidebar[data-collapse-mobile="true"][data-mobile-open="true"] .tmsidebar-mobile-chevron {
    transform: rotate(180deg);
  }
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
  if (typeof window === 'undefined') return categorySlugOverride || null;
  const url = new URL(window.location.href);
  const pathname = url.pathname.replace(/\/+$/, '');
  const categoryMatch = pathname.match(/\/templates\/category\/([^/?#]+)/);
  return (
    url.searchParams.get('category') ||
    url.searchParams.get('category_group_slug') ||
    categorySlugOverride ||
    (categoryMatch ? categoryMatch[1] : null)
  );
}

function readCurrentQuery(): string {
  if (typeof window === 'undefined') return '';
  const params = new URL(window.location.href).searchParams;
  return (params.get('q') ?? params.get('query') ?? params.get('search') ?? '').trim();
}

function readCountContext(countMode: SidebarCountMode, styleSlugOverride?: string, tagSlugOverride?: string): CountContext {
  if (typeof window === 'undefined' || countMode === 'global') {
    return defaultCountContext();
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

function defaultCountContext(): CountContext {
  return { q: '', scope: 'all', styleSlug: null, tagSlug: null, freeOnly: false };
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

function getCategoryIconUrl(slug: string): string | null {
  return CATEGORY_ICON_URLS[slug] ?? CATEGORY_ICON_URLS[`${slug}-websites`] ?? null;
}

function renderRowIcon(iconUrl: string | null): React.ReactNode {
  if (!iconUrl) return <span className="tmsidebar-icon-fallback" aria-hidden="true" />;
  return <img className="tmsidebar-icon" src={iconUrl} width={16} height={16} alt="" loading="lazy" aria-hidden="true" />;
}

function notifySidebarFiltersChanged(source: string): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  const detail = {
    q: (url.searchParams.get('q') ?? url.searchParams.get('query') ?? url.searchParams.get('search') ?? '').trim(),
    categoryGroupSlug: url.searchParams.get('category') ?? url.searchParams.get('category_group_slug'),
    childCategorySlug: url.searchParams.get('subcategory') ?? url.searchParams.get('child_category_slug'),
    styles: url.searchParams.getAll('styles').flatMap((value) => value.split(',')).filter(Boolean),
    tags: url.searchParams.getAll('tags').flatMap((value) => value.split(',')).filter(Boolean),
    types: url.searchParams.getAll('types').flatMap((value) => value.split(',')).filter(Boolean),
    freeOnly: ['1', 'true', 'yes', 'on'].includes((url.searchParams.get('free_only') ?? '').toLowerCase()),
    sort: normalizeTemplateSort(url.searchParams.get('sort')),
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
  collapseOnMobile = true,
}) => {
  useMarketplaceComponentErrorTracking('TemplateSearchSidebar', enableAnalytics);

  const apiBase = resolveApiBase(apiBaseProp);
  const bodyId = useId();
  const [counts, setCounts] = useState<SidebarCounts>({ all: null, featured: null, landing_pages: null, free: null });
  const [categories, setCategories] = useState<SidebarCategory[]>([]);
  const [loading, setLoading] = useState(showCategories || showSpecialLinks);
  const [error, setError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [routeVersion, setRouteVersion] = useState(0);
  const [hasHydrated, setHasHydrated] = useState(false);

  const activeScope = hasHydrated
    ? scopeOverride !== 'all'
      ? scopeOverride
      : readCurrentScope()
    : scopeOverride !== 'all'
      ? scopeOverride
      : 'all';
  const activeCategory = hasHydrated ? readCurrentCategory(categorySlug) : categorySlug || null;
  const shouldUseFilterMode = interactionMode === 'filter';

  const countContext = useMemo(
    () =>
      hasHydrated
        ? readCountContext(countMode, styleSlug || undefined, tagSlug || undefined)
        : defaultCountContext(),
    [countMode, hasHydrated, routeVersion, styleSlug, tagSlug],
  );

  useEffect(() => {
    if (!hasHydrated) return undefined;

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
  }, [apiBase, countContext, countMode, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated || !shouldUseFilterMode) return;
    setSearchValue(readCurrentQuery());
  }, [hasHydrated, routeVersion, shouldUseFilterMode]);

  useEffect(() => {
    setHasHydrated(true);
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
    setMobileOpen(false);
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
    setMobileOpen(false);
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
    <div
      className="tmsidebar"
      data-collapse-mobile={collapseOnMobile ? 'true' : undefined}
      data-mobile-open={mobileOpen ? 'true' : undefined}
    >
      <style dangerouslySetInnerHTML={{ __html: SIDEBAR_STYLES }} />
      <button
        type="button"
        className="tmsidebar-mobile-toggle"
        aria-expanded={mobileOpen}
        aria-controls={bodyId}
        onClick={() => setMobileOpen((value) => !value)}
      >
        <span>{title || 'Filters'}</span>
        <span className="tmsidebar-mobile-chevron" aria-hidden="true">
          v
        </span>
      </button>
      {title ? <p className="tmsidebar-title">{title}</p> : null}

      <div id={bodyId} className="tmsidebar-body">
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
                        {renderRowIcon(row.iconUrl)}
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
                  const iconUrl = getCategoryIconUrl(category.slug);
                  return (
                    <li key={category.slug}>
                      <a
                        className="tmsidebar-row"
                        href={href}
                        aria-current={active ? 'page' : undefined}
                        onClick={(event) => onCategoryClick(category, event)}
                      >
                        {renderRowIcon(iconUrl)}
                        <span className="tmsidebar-label">{category.name}</span>
                        {renderCount(category.count)}
                      </a>
                    </li>
                  );
                })}
            </ul>
          </nav>
        )}
      </div>

    </div>
  );
};

export const TemplateSearchSidebar: React.FC<TemplateSearchSidebarProps> = (props) => (
  <MarketplaceComponentErrorBoundary component="TemplateSearchSidebar" enabled={props.enableAnalytics}>
    <TemplateSearchSidebarInner {...props} />
  </MarketplaceComponentErrorBoundary>
);

export default TemplateSearchSidebar;
