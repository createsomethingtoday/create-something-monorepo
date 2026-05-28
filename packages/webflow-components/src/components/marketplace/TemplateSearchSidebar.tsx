import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TemplateSearchBox } from './TemplateSearchBox';
import {
  normalizeTemplateSlug,
  parseTemplateRoute,
  TemplateScope,
  TemplateSort,
} from './templateRoute';
import {
  emitTemplateComponentEvent,
  TEMPLATE_MARKETPLACE_COMPONENT_VERSION,
} from './templateTelemetry';
type SidebarInteractionMode = 'navigate' | 'filter';
type SidebarCountMode = 'global' | 'contextual';

interface SidebarCategory {
  name: string;
  slug: string;
  url?: string;
  count: number | null;
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
}

const DEFAULT_API_BASE = 'https://templates.webflow.com/templates-api';
const WORKER_ORIGIN = 'https://webflow-template-search.createsomething.workers.dev';
const CLOUD_APP_PREVIEW_ORIGIN = 'https://webflow-template-marketplace.webflow.io';
const SIDEBAR_CACHE_TTL_MS = 5 * 60 * 1000;
const SIDEBAR_STORAGE_PREFIX = 'wf-template-sidebar:';

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

const FALLBACK_CATEGORIES: SidebarCategory[] = [
  'Architecture & Design|architecture-and-design-websites',
  'Arts & Entertainment|arts-and-entertainment-websites',
  'Blog & Editorial|blog-and-editorial-websites',
  'Community & Nonprofit|community-and-nonprofit-websites',
  'Documentation|documentation-websites',
  'Education|education-websites',
  'Environment|environment-websites',
  'Food & Drink|food-and-drink-websites',
  'Government|government-websites',
  'Hair & Beauty|hair-and-beauty-websites',
  'Home Services|home-services-websites',
  'HR & Hiring|hr-and-hiring-websites',
  'Launch & Coming Soon|launch-and-coming-soon-websites',
  'Medical|medical-websites',
  'Music & Audio|music-and-audio-websites',
  'Personal|personal-websites',
  'Portfolio & Agency|portfolio-and-agency-websites',
  'Professional Services|professional-services-websites',
  'Real Estate|real-estate-websites',
  'Retail & E-Commerce|retail-and-e-commerce-websites',
  'Technology|technology-websites',
  'Transportation|transportation-websites',
  'Travel|travel-websites',
  'UI Kit|ui-kit-websites',
  'Weddings & Events|weddings-and-events-websites',
  'Wellness|wellness-websites',
].map((entry) => {
  const [name, slug] = entry.split('|');
  return {
    name,
    slug,
    url: `https://webflow.com/templates/category/${slug}`,
    count: null,
  };
});
const FALLBACK_CATEGORY_SLUGS = new Set(FALLBACK_CATEGORIES.map((category) => category.slug));

const SIDEBAR_STYLES = `
.tmsidebar,
.tmsidebar * {
  box-sizing: border-box;
}

.tmsidebar {
  align-self: flex-start;
  width: 100%;
  min-width: 0;
  height: fit-content;
  max-height: calc(100vh - 96px);
  padding: 18px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fff;
  color: #080808;
  font-family: "WF Visual Sans Variable", "WF Visual Sans", "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  overflow: auto;
  position: sticky;
  top: 80px;
  scrollbar-width: none;
}

.tmsidebar::-webkit-scrollbar {
  display: none;
}

.tmsidebar-mobile-disclosure {
  display: none;
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

.tmsidebar-row:hover .tmsidebar-icon,
.tmsidebar-row:focus-visible .tmsidebar-icon,
.tmsidebar-row[aria-current="page"] .tmsidebar-icon {
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
  .tmsidebar {
    max-height: none;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    overflow: visible;
    position: relative;
    top: auto;
  }

  .tmsidebar-desktop-panel {
    display: none;
  }

  .tmsidebar-mobile-disclosure {
    display: block;
    width: 100%;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background: #fff;
    overflow: hidden;
  }

  .tmsidebar-mobile-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 48px;
    padding: 12px 14px;
    color: #080808;
    cursor: pointer;
    list-style: none;
    user-select: none;
  }

  .tmsidebar-mobile-summary::-webkit-details-marker {
    display: none;
  }

  .tmsidebar-mobile-summary-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .tmsidebar-mobile-summary-title {
    font-size: 13px;
    font-weight: 650;
    line-height: 18px;
  }

  .tmsidebar-mobile-summary-current {
    max-width: 100%;
    overflow: hidden;
    color: #757575;
    font-size: 12px;
    line-height: 16px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tmsidebar-mobile-summary-icon {
    flex: 0 0 auto;
    color: #5a5a5a;
    font-size: 18px;
    line-height: 1;
    transform: rotate(90deg);
    transition: transform 160ms ease;
  }

  .tmsidebar-mobile-disclosure[open] .tmsidebar-mobile-summary-icon {
    transform: rotate(-90deg);
  }

  .tmsidebar-mobile-panel {
    max-height: min(68vh, 560px);
    padding: 0 12px 12px;
    overflow: auto;
    scrollbar-width: none;
  }

  .tmsidebar-mobile-panel::-webkit-scrollbar {
    display: none;
  }
}
`;

function resolveApiBase(apiBase?: string): string {
  const rawBase = apiBase || DEFAULT_API_BASE;
  return rawBase.startsWith(WORKER_ORIGIN) || rawBase.startsWith(CLOUD_APP_PREVIEW_ORIGIN)
    ? DEFAULT_API_BASE
    : rawBase;
}

function readCurrentScope(includeFilterParams = false): TemplateScope {
  return parseTemplateRoute({ includeFilterParams }).scope;
}

function readIsSearchRoute(): boolean {
  return parseTemplateRoute({ includeFilterParams: false }).isSearchRoute;
}

function readCurrentCategory(categorySlugOverride?: string, includeFilterParams = false): string | null {
  return parseTemplateRoute({
    categorySlugOverride,
    includeFilterParams,
  }).categoryGroupSlug;
}

function readCurrentQuery(): string {
  return parseTemplateRoute().q;
}

function readCountContext(countMode: SidebarCountMode, styleSlugOverride?: string, tagSlugOverride?: string): CountContext {
  if (typeof window === 'undefined' || countMode === 'global') {
    return { q: '', scope: 'all', styleSlug: null, tagSlug: null, freeOnly: false };
  }
  const route = parseTemplateRoute({
    styleSlugOverride,
    tagSlugOverride,
  });
  return {
    q: route.q,
    scope: route.scope,
    styleSlug: route.styleSlug,
    tagSlug: route.tagSlug,
    freeOnly: route.freeOnly,
  };
}

function appendCountContext(url: URL, context: CountContext, scope?: TemplateScope): void {
  if (context.q) url.searchParams.set('q', context.q);
  const resolvedScope = scope ?? context.scope;
  if (resolvedScope !== 'all') url.searchParams.set('scope', resolvedScope);
  if (context.styleSlug) url.searchParams.set('style_slug', normalizeTemplateSlug(context.styleSlug));
  if (context.tagSlug) url.searchParams.set('tag_slug', normalizeTemplateSlug(context.tagSlug));
  if (context.freeOnly || resolvedScope === 'free') url.searchParams.set('free_only', 'true');
}

function buildSearchApiUrl(
  apiBase: string,
  context: CountContext,
  scope?: TemplateScope,
  include = 'items,pills',
): string {
  const absolute = apiBase.startsWith('/') && typeof window !== 'undefined'
    ? `${window.location.origin}${apiBase}`
    : apiBase;
  const url = new URL(`${absolute}/api/templates/search`);
  url.searchParams.set('include', include);
  url.searchParams.set('page', '1');
  url.searchParams.set('page_size', '1');
  url.searchParams.set('sort', 'popular');
  appendCountContext(url, context, scope);
  return url.toString();
}

function readSidebarPayloadCache(url: string): SidebarPayload | null {
  const cached = sidebarPayloadCache.get(url);
  if (cached && Date.now() - cached.timestamp < SIDEBAR_CACHE_TTL_MS) {
    return cached.data;
  }
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(`${SIDEBAR_STORAGE_PREFIX}${url}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { timestamp?: unknown; data?: unknown };
    if (typeof parsed.timestamp !== 'number' || Date.now() - parsed.timestamp >= SIDEBAR_CACHE_TTL_MS) {
      return null;
    }
    const data = parsed.data as SidebarPayload;
    sidebarPayloadCache.set(url, { timestamp: parsed.timestamp, data });
    return data;
  } catch {
    return null;
  }
}

function writeSidebarPayloadCache(url: string, data: SidebarPayload): void {
  const entry = { timestamp: Date.now(), data };
  sidebarPayloadCache.set(url, entry);
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(`${SIDEBAR_STORAGE_PREFIX}${url}`, JSON.stringify(entry));
  } catch {
    // Storage can be unavailable in privacy modes; in-memory cache still applies.
  }
}

async function fetchSidebarPayload(url: string, signal: AbortSignal): Promise<SidebarPayload> {
  const cached = readSidebarPayloadCache(url);
  if (cached) return cached;
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Sidebar counts failed with ${response.status}`);
  const data = (await response.json()) as SidebarPayload;
  writeSidebarPayloadCache(url, data);
  return data;
}

function toCanonicalSidebarCategories(categories: SidebarCategory[] | undefined): SidebarCategory[] {
  const bySlug = new Map(
    (categories ?? [])
      .filter((category) => FALLBACK_CATEGORY_SLUGS.has(category.slug))
      .map((category) => [category.slug, category]),
  );

  return FALLBACK_CATEGORIES.map((category) => {
    const live = bySlug.get(category.slug);
    return {
      ...category,
      count: typeof live?.count === 'number' ? live.count : category.count,
    };
  });
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

export const TemplateSearchSidebar: React.FC<TemplateSearchSidebarProps> = ({
  apiBase: apiBaseProp = '',
  title = 'Categories',
  scopeOverride = 'all',
  categorySlug = '',
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
}) => {
  const apiBase = resolveApiBase(apiBaseProp);
  const [counts, setCounts] = useState<SidebarCounts>({ all: null, featured: null, landing_pages: null, free: null });
  const [categories, setCategories] = useState<SidebarCategory[]>(() =>
    showCategories ? FALLBACK_CATEGORIES : [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [routeVersion, setRouteVersion] = useState(0);
  const hydrationEventRef = useRef(false);

  const shouldUseFilterMode = interactionMode === 'filter';
  const isSearchRoute = readIsSearchRoute();
  const activeScope = scopeOverride !== 'all' ? scopeOverride : readCurrentScope(shouldUseFilterMode);
  const activeCategory = readCurrentCategory(categorySlug, shouldUseFilterMode);

  const countContext = useMemo(
    () => readCountContext(countMode, styleSlug || undefined, tagSlug || undefined),
    [countMode, routeVersion, styleSlug, tagSlug],
  );

  useEffect(() => {
    emitTemplateComponentEvent('TemplateSearchSidebar', 'mounted', {
      interaction_mode: interactionMode,
      count_mode: countMode,
      active_scope: activeScope,
      active_category: activeCategory,
    });
    // Initial route state is intentionally captured once for component health telemetry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const needsCategoryPayload = showCategories || (showSpecialLinks && showCounts);
    const needsSpecialCounts = showSpecialLinks && showCounts;

    if (!needsCategoryPayload) {
      setLoading(false);
      setError(null);
      setCategories([]);
      setCounts({ all: null, featured: null, landing_pages: null, free: null });
      return undefined;
    }

    const ac = new AbortController();
    setLoading(showCategories && categories.length === 0);
    setError(null);

    const categoryUrl = buildSearchApiUrl(
      apiBase,
      countContext,
      countMode === 'contextual' ? undefined : 'all',
      'pills',
    );
    const specialUrls = SPECIAL_ROWS.reduce<Record<keyof SidebarCounts, string>>((acc, row) => {
      acc[row.key] = buildSearchApiUrl(apiBase, countContext, row.scope, 'count');
      return acc;
    }, { all: categoryUrl, featured: categoryUrl, landing_pages: categoryUrl, free: categoryUrl });

    const cachedCategoryPayload = readSidebarPayloadCache(categoryUrl);
    if (cachedCategoryPayload) {
      setCategories(showCategories ? toCanonicalSidebarCategories(cachedCategoryPayload.category_pills) : []);
      setCounts((current) => ({
        ...current,
        all: needsSpecialCounts ? Number(cachedCategoryPayload.pagination?.total_items ?? 0) : null,
      }));
      if (!hydrationEventRef.current) {
        hydrationEventRef.current = true;
        emitTemplateComponentEvent('TemplateSearchSidebar', 'navigation_hydrated', {
          source: 'cache',
          category_count: cachedCategoryPayload.category_pills?.length ?? 0,
          total_items: cachedCategoryPayload.pagination?.total_items ?? null,
          count_mode: countMode,
        });
      }
      setLoading(false);
    }

    fetchSidebarPayload(categoryUrl, ac.signal)
      .then((categoryPayload) => {
        if (ac.signal.aborted) return;
        setCategories(showCategories ? toCanonicalSidebarCategories(categoryPayload.category_pills) : []);
        setCounts((current) => ({
          ...current,
          all: needsSpecialCounts ? Number(categoryPayload.pagination?.total_items ?? 0) : null,
        }));
        if (!hydrationEventRef.current) {
          hydrationEventRef.current = true;
          emitTemplateComponentEvent('TemplateSearchSidebar', 'navigation_hydrated', {
            source: 'network',
            category_count: categoryPayload.category_pills?.length ?? 0,
            total_items: categoryPayload.pagination?.total_items ?? null,
            count_mode: countMode,
          });
        }
      })
      .catch((err) => {
        if (!ac.signal.aborted) {
          const message = err instanceof Error ? err.message : 'Unable to load sidebar counts';
          setError(message);
          emitTemplateComponentEvent('TemplateSearchSidebar', 'navigation_error', {
            message,
            count_mode: countMode,
          });
        }
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });

    if (needsSpecialCounts) {
      Promise.all([
        fetchSidebarPayload(specialUrls.featured, ac.signal),
        fetchSidebarPayload(specialUrls.landing_pages, ac.signal),
        fetchSidebarPayload(specialUrls.free, ac.signal),
      ])
        .then(([featuredPayload, landingPayload, freePayload]) => {
          if (ac.signal.aborted) return;
          setCounts((current) => ({
            ...current,
            featured: Number(featuredPayload.pagination?.total_items ?? 0),
            landing_pages: Number(landingPayload.pagination?.total_items ?? 0),
            free: Number(freePayload.pagination?.total_items ?? 0),
          }));
        })
        .catch(() => {});
    }

    return () => ac.abort();
  }, [apiBase, countContext, countMode, showCategories, showCounts, showSpecialLinks]);

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

  const shouldUseFallbackCategories =
    showCategories && categories.length === 0 && !loading && (Boolean(error) || countMode === 'global');
  const displayCategories = shouldUseFallbackCategories ? FALLBACK_CATEGORIES : categories;
  const activeCategoryLabel = activeCategory
    ? displayCategories.find((category) => category.slug === activeCategory)?.name
    : null;
  const activeSpecialLabel = !activeCategory
    ? SPECIAL_ROWS.find((row) => activeScope === row.scope)?.label
    : null;
  const mobileSummaryLabel = activeCategoryLabel ?? activeSpecialLabel ?? 'All templates';

  const renderSidebarContent = (includeTitle = true) => (
    <>
      {includeTitle && title ? <p className="tmsidebar-title">{title}</p> : null}

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
          enableAnalytics={enableAnalytics}
          source="TemplateSearchSidebar"
        />
      )}

      {(showSpecialLinks || showCategories) && (
        <nav aria-label="Template categories">
          <ul className="tmsidebar-list">
            {showSpecialLinks &&
              SPECIAL_ROWS.map((row) => {
                const active = (shouldUseFilterMode || !isSearchRoute) && activeScope === row.scope && !activeCategory;
                return (
                  <li key={row.key}>
                    <a
                      className="tmsidebar-row"
                      href={row.href}
                      aria-current={active ? 'page' : undefined}
                    >
                      {renderRowIcon(row.iconUrl)}
                      <span className="tmsidebar-label">{row.label}</span>
                      {renderCount(counts[row.key])}
                    </a>
                  </li>
                );
              })}

            {showSpecialLinks && showCategories && <li className="tmsidebar-divider" aria-hidden="true" />}

            {showCategories && loading && displayCategories.length === 0 && (
              <li className="tmsidebar-loading">Loading categories</li>
            )}

            {showCategories && error && displayCategories.length === 0 && (
              <li className="tmsidebar-error">Unable to load categories</li>
            )}

            {showCategories &&
              displayCategories.map((category) => {
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
    </>
  );

  return (
    <div
      className={`tmsidebar ${shouldUseFilterMode ? 'tmsidebar--filter' : 'tmsidebar--navigate'}`}
      data-template-component="TemplateSearchSidebar"
      data-template-component-version={TEMPLATE_MARKETPLACE_COMPONENT_VERSION}
    >
      <style>{SIDEBAR_STYLES}</style>
      <div className="tmsidebar-desktop-panel">{renderSidebarContent()}</div>
      <details className="tmsidebar-mobile-disclosure">
        <summary className="tmsidebar-mobile-summary">
          <span className="tmsidebar-mobile-summary-text">
            <span className="tmsidebar-mobile-summary-title">{title || 'Categories'}</span>
            <span className="tmsidebar-mobile-summary-current">{mobileSummaryLabel}</span>
          </span>
          <span className="tmsidebar-mobile-summary-icon" aria-hidden="true">›</span>
        </summary>
        <div className="tmsidebar-mobile-panel">{renderSidebarContent(false)}</div>
      </details>
    </div>
  );
};

export default TemplateSearchSidebar;
