import React, {
  CSSProperties,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { TemplateCard } from '../cards/TemplateCard';
import {
  areTemplateStringArraysEqual,
  normalizeTemplateSort,
  parseTemplateRoute,
  TemplateScope,
  TemplateSort,
  toTemplateStyleSlug,
} from '../marketplace/templateRoute';
import {
  emitTemplateComponentEvent,
  TEMPLATE_MARKETPLACE_COMPONENT_VERSION,
} from '../marketplace/templateTelemetry';

// ─── API types ────────────────────────────────────────────────────────────────

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
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
    has_next_page: boolean;
    has_previous_page: boolean;
  };
}

// ─── Filter / route state ─────────────────────────────────────────────────────

interface FilterState {
  q: string;
  scope: TemplateScope;
  categoryGroupSlug: string | null;
  childCategorySlug: string | null;
  styles: string[];
  types: string[];
  freeOnly: boolean;
  sort: TemplateSort;
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface TemplateGridProps {
  /**
   * Base URL for the template search API, no trailing slash.
   * Production default: https://templates.webflow.com/templates-api
   * (Cloud App proxy — CSP-safe from webflow.com pages).
   * Override to https://webflow-template-search.createsomething.workers.dev for local dev.
   */
  apiBase?: string;
  /**
   * Override for Designer preview only.
   * In production the slug is auto-detected from the URL path
   * (/templates/category/{slug}).
   */
  categorySlug?: string;
  /**
   * Override scope for Designer preview of special pages
   * (featured, free, landing_pages).
   * In production the scope is auto-detected from the URL path.
   */
  scopeOverride?: TemplateScope;
  /** Fallback sort when no ?sort= param is present in the URL */
  initialSort?: TemplateSort;
  /** Items per page per infinite-scroll fetch */
  pageSize?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Production Cloud App URL — hosted on *.webflow.com so it passes the
// webflow.com page CSP (connect-src https://*.webflow.com).
const DEFAULT_API_BASE = 'https://templates.webflow.com/templates-api';
// The direct Worker origin is blocked by webflow.com's CSP — rewrite to proxy.
const WORKER_ORIGIN = 'https://webflow-template-search.createsomething.workers.dev';
// Legacy preview URL — rewrite to the production base.
const CLOUD_APP_PREVIEW_ORIGIN = 'https://webflow-template-marketplace.webflow.io';
const DEFAULT_PAGE_SIZE = 24;
const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
const GRID_STORAGE_PREFIX = 'wf-template-grid:';

const gridResponseCache = new Map<string, { timestamp: number; data: ApiResponse }>();
let gridStylesInjected = false;

// Hosts whose images need to be routed through the Cloud App proxy.
// Airtable signed attachment URLs expire after ~2 hours; the proxy caches
// them at Cloudflare edge for 24 h so expiry gaps don't cause broken images.
const IMAGE_PROXY_BLOCKLIST = ['airtableusercontent.com'];

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
    // malformed URL — return as-is
  }
  return imageUrl;
}

function readGridResponseCache(url: string): ApiResponse | null {
  const cached = gridResponseCache.get(url);
  if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_TTL_MS) {
    return cached.data;
  }
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(`${GRID_STORAGE_PREFIX}${url}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { timestamp?: unknown; data?: unknown };
    if (typeof parsed.timestamp !== 'number' || Date.now() - parsed.timestamp >= SEARCH_CACHE_TTL_MS) {
      return null;
    }
    const data = parsed.data as ApiResponse;
    gridResponseCache.set(url, { timestamp: parsed.timestamp, data });
    return data;
  } catch {
    return null;
  }
}

function writeGridResponseCache(url: string, data: ApiResponse): void {
  const entry = { timestamp: Date.now(), data };
  gridResponseCache.set(url, entry);
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(`${GRID_STORAGE_PREFIX}${url}`, JSON.stringify(entry));
  } catch {
    // Private browsing and quota limits can block storage; in-memory cache still helps.
  }
}

function prefetchGridPage(url: string): void {
  if (readGridResponseCache(url)) return;
  const run = () => {
    fetch(url)
      .then((res) => (res.ok ? (res.json() as Promise<ApiResponse>) : null))
      .then((data) => {
        if (data) writeGridResponseCache(url, data);
      })
      .catch(() => {});
  };

  const idleWindow = window as typeof window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
  };
  if (typeof idleWindow.requestIdleCallback === 'function') {
    idleWindow.requestIdleCallback(run, { timeout: 1500 });
  } else {
    window.setTimeout(run, 300);
  }
}

// Selectors matching the existing Webflow filter/sort UI (same as client-script.ts)
const SEL_SORT = '[data-template-search-sort], select[name="sort"]';
const SEL_STYLE = '[data-template-search-style], select[name="styles"]';
const SEL_TYPE = '[data-template-search-type], select[name="types"]';
const SEL_FREE = '[data-template-search-free], input[name="free_only"], input[fs-cmsfilter-field="free"]';
const SEL_SEARCH = '[data-template-search-input], input[type="search"]';

// ─── URL helpers ──────────────────────────────────────────────────────────────

function parseRouteState(
  defaultSort: TemplateSort = 'popular',
  slugOverride?: string,
  scopeOverrideParam?: TemplateScope,
): FilterState {
  const route = parseTemplateRoute({
    defaultSort,
    categorySlugOverride: slugOverride,
    scopeOverride: scopeOverrideParam,
  });
  return {
    q: route.q,
    scope: route.scope,
    categoryGroupSlug: route.categoryGroupSlug,
    childCategorySlug: route.childCategorySlug,
    styles: route.styles,
    types: route.types,
    freeOnly: route.freeOnly,
    sort: route.sort,
  };
}

function mergeExternalFilterState(base: FilterState, detail: unknown): FilterState {
  if (!detail || typeof detail !== 'object') return base;
  const patch = detail as Partial<{
    q: unknown;
    query: unknown;
    search: unknown;
    styles: unknown;
    types: unknown;
    freeOnly: unknown;
    sort: unknown;
  }>;
  const q =
    typeof patch.q === 'string'
      ? patch.q
      : typeof patch.query === 'string'
        ? patch.query
        : typeof patch.search === 'string'
          ? patch.search
          : undefined;

  return {
    ...base,
    q: typeof q === 'string' ? q.trim() : base.q,
    styles: Array.isArray(patch.styles) ? patch.styles.filter((value): value is string => typeof value === 'string') : base.styles,
    types: Array.isArray(patch.types) ? patch.types.filter((value): value is string => typeof value === 'string') : base.types,
    freeOnly: typeof patch.freeOnly === 'boolean' ? patch.freeOnly : base.freeOnly,
    sort: typeof patch.sort === 'string' ? normalizeTemplateSort(patch.sort, base.sort) : base.sort,
  };
}

function readSharedFilterState(href: string): unknown {
  if (typeof window === 'undefined') return undefined;
  const detail = (window as unknown as Record<string, unknown>).__templateMarketplaceFilters;
  if (!detail || typeof detail !== 'object') return undefined;
  const shared = detail as { href?: unknown };
  return shared.href === href ? detail : undefined;
}

function areFiltersEqual(a: FilterState, b: FilterState): boolean {
  return (
    a.q === b.q &&
    a.scope === b.scope &&
    a.categoryGroupSlug === b.categoryGroupSlug &&
    a.childCategorySlug === b.childCategorySlug &&
    a.freeOnly === b.freeOnly &&
    a.sort === b.sort &&
    areTemplateStringArraysEqual(a.styles, b.styles) &&
    areTemplateStringArraysEqual(a.types, b.types)
  );
}

function buildApiUrl(base: string, filters: FilterState, page: number, pageSize: number): string {
  // Resolve relative paths against the current origin so new URL() doesn't throw.
  const absolute = base.startsWith('/') && typeof window !== 'undefined'
    ? `${window.location.origin}${base}`
    : base;
  const url = new URL(`${absolute}/api/templates/search`);
  if (filters.q) url.searchParams.set('q', filters.q);
  if (filters.scope !== 'all') url.searchParams.set('scope', filters.scope);
  if (filters.categoryGroupSlug) url.searchParams.set('category_group_slug', filters.categoryGroupSlug);
  if (filters.childCategorySlug) url.searchParams.set('child_category_slug', filters.childCategorySlug);
  if (filters.freeOnly) url.searchParams.set('free_only', 'true');
  url.searchParams.set('include', 'items');
  url.searchParams.set('sort', filters.sort);
  url.searchParams.set('page', String(page));
  url.searchParams.set('page_size', String(pageSize));
  filters.styles.forEach((v) => url.searchParams.append('styles', v));
  filters.types.forEach((v) => url.searchParams.append('types', v));
  return url.toString();
}

function updateUrlParams(filters: FilterState): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  ['q', 'query', 'search', 'styles', 'types', 'free_only', 'sort', 'page'].forEach((k) =>
    url.searchParams.delete(k),
  );
  if (filters.q) url.searchParams.set('q', filters.q);
  if (filters.sort && filters.sort !== 'popular') url.searchParams.set('sort', filters.sort);
  if (filters.freeOnly && filters.scope !== 'free') url.searchParams.set('free_only', 'true');
  filters.styles.forEach((v) => url.searchParams.append('styles', v));
  filters.types.forEach((v) => url.searchParams.append('types', v));
  window.history.replaceState({}, '', url.toString());
}

// ─── Price helper ─────────────────────────────────────────────────────────────

function formatPrice(item: ApiItem): string {
  if (item.is_free || item.price === 0) return 'Free';
  if (typeof item.price !== 'number') return '';
  return `${item.price} USD`;
}

function primaryThumbnailUrl(item: ApiItem): string | null {
  return item.thumbnail_image_url ?? item.thumbnail_image_secondary_url;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const GRID_STYLES = `
@keyframes tmgrid-fade-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.tmgrid-item {
  animation: tmgrid-fade-in 320ms ease-out both;
}
@media (prefers-reduced-motion: reduce) {
  .tmgrid-item { animation: none; opacity: 1 !important; }
}

@keyframes tmgrid-spin {
  to { transform: rotate(360deg); }
}
.tmgrid-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid rgba(0,0,0,0.10);
  border-top-color: rgba(0,0,0,0.45);
  border-radius: 50%;
  animation: tmgrid-spin 0.8s linear infinite;
}
.tmgrid-grid-wrap {
  position: relative;
}
.tmgrid-grid-wrap[data-refreshing="true"] .tmgrid-grid {
  opacity: 0.58;
  pointer-events: none;
  transition: opacity 160ms ease;
}
.tmgrid-refresh-indicator {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 999px;
  background: rgba(255,255,255,0.92);
  box-shadow: 0 6px 20px rgba(0,0,0,0.14);
  backdrop-filter: blur(6px);
}
.tmgrid-refresh-indicator .tmgrid-spinner {
  width: 18px;
  height: 18px;
  border-width: 2px;
}

@keyframes tmgrid-shimmer {
  0%   { background-position: -600px 0; }
  100% { background-position:  600px 0; }
}
.tmgrid-skeleton {
  background: linear-gradient(90deg, #ebebeb 25%, #f5f5f5 50%, #ebebeb 75%);
  background-size: 1200px 100%;
  animation: tmgrid-shimmer 1.4s infinite linear;
  border-radius: 8px;
}

/* Responsive flex breakpoints injected here so Webflow classes don't override */
.tmgrid-grid {
  display: flex !important;
  flex-wrap: wrap !important;
  align-items: flex-start !important;
  gap: 24px !important;
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  overflow: visible !important;
  box-sizing: border-box !important;
}
.tmgrid-item {
  flex: 0 1 calc((100% - 72px) / 4) !important;
  width: calc((100% - 72px) / 4) !important;
  min-width: 0 !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
  content-visibility: auto;
  contain-intrinsic-size: 360px 560px;
}
.tmgrid-grid[data-columns="1"] .tmgrid-item {
  flex-basis: 100% !important;
  width: 100% !important;
}
.tmgrid-grid[data-columns="2"] .tmgrid-item {
  flex-basis: calc((100% - 16px) / 2) !important;
  width: calc((100% - 16px) / 2) !important;
}
.tmgrid-grid[data-columns="3"] .tmgrid-item {
  flex-basis: calc((100% - 40px) / 3) !important;
  width: calc((100% - 40px) / 3) !important;
}
.tmgrid-grid[data-columns="4"] .tmgrid-item {
  flex-basis: calc((100% - 72px) / 4) !important;
  width: calc((100% - 72px) / 4) !important;
}
.tmgrid-grid[data-columns="2"] .tmcard-link {
  margin-bottom: 10px !important;
}
.tmgrid-grid[data-columns="2"] .tmcard-meta {
  gap: 6px !important;
}
.tmgrid-grid[data-columns="2"] .tmcard-creator-icon,
.tmgrid-grid[data-columns="2"] .tmcard-creator-initials {
  width: 24px !important;
  height: 24px !important;
}
.tmgrid-grid[data-columns="2"] .tmcard-details-row {
  flex-direction: column !important;
  gap: 2px !important;
}
.tmgrid-grid[data-columns="2"] .tmcard-price-wrap {
  margin-left: 0 !important;
}
.tmgrid-grid[data-columns="2"] .tmcard-name,
.tmgrid-grid[data-columns="2"] .tmcard-price {
  font-size: 13px !important;
  line-height: 17px !important;
}
.tmgrid-grid[data-columns="2"] .tmcard-creator {
  font-size: 12px !important;
  line-height: 16px !important;
}
@media (max-width: 991px) {
  .tmgrid-grid {
    column-gap: 20px !important;
    row-gap: 24px !important;
  }
  .tmgrid-item {
    flex-basis: calc((100% - 40px) / 3) !important;
    width: calc((100% - 40px) / 3) !important;
  }
}
@media (max-width: 767px) {
  .tmgrid-grid {
    column-gap: 16px !important;
    row-gap: 24px !important;
  }
  .tmgrid-item {
    flex-basis: calc((100% - 16px) / 2) !important;
    width: calc((100% - 16px) / 2) !important;
  }
}
@media (max-width: 479px) {
  .tmgrid-grid {
    column-gap: 14px !important;
    row-gap: 26px !important;
  }
  .tmgrid-item {
    flex-basis: calc((100% - 14px) / 2) !important;
    width: calc((100% - 14px) / 2) !important;
  }
}
@media (max-width: 359px) {
  .tmgrid-grid {
    gap: 28px !important;
  }
  .tmgrid-item {
    flex-basis: 100% !important;
    width: 100% !important;
  }
}
`;

const S: Record<string, CSSProperties> = {
  root: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    boxSizing: 'border-box',
  },
  loadMoreWrapper: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: '48px',
    paddingBottom: '24px',
    minHeight: '80px',
  },
  errorBox: {
    padding: '32px',
    textAlign: 'center',
    color: 'rgba(0,0,0,0.5)',
    fontSize: '14px',
  },
  countLabel: {
    paddingBottom: '20px',
    fontSize: '13px',
    color: 'rgba(0,0,0,0.45)',
  },
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function getColumnCount(width: number): number {
  if (width < 360) return 1;
  if (width < 768) return 2;
  if (width < 992) return 3;
  return 4;
}

function getColumnGap(width: number): number {
  if (width < 360) return 0;
  if (width < 768) return 16;
  if (width < 992) return 20;
  return 24;
}

function getRowGap(width: number): number {
  return width < 360 ? 28 : 24;
}

function getFlexBasis(columns: number, columnGap: number): string {
  if (columns <= 1) return '100%';
  return `calc((100% - ${(columns - 1) * columnGap}px) / ${columns})`;
}

function getViewportWidth(): number | null {
  if (typeof window === 'undefined') return null;
  const visualWidth = window.visualViewport?.width ?? window.innerWidth;
  const documentWidth = document.documentElement.clientWidth || window.innerWidth;
  // Webflow Code Components can be hosted inside a wider runtime container on
  // mobile. The physical screen width is the most reliable cap for card layout.
  const screenWidth = window.screen?.width || Number.POSITIVE_INFINITY;
  const width = Math.floor(Math.min(visualWidth, documentWidth, screenWidth));
  return width > 0 ? width : null;
}

const SkeletonCard: React.FC<{ index: number; itemStyle: CSSProperties }> = ({ index, itemStyle }) => (
  <div className="tmgrid-item" style={{ ...itemStyle, animationDelay: `${index * 40}ms` }}>
    <div className="tmgrid-skeleton" style={{ aspectRatio: '150 / 199', marginBottom: '14px' }} />
    <div className="tmgrid-skeleton" style={{ height: '14px', width: '70%', marginBottom: '6px' }} />
    <div className="tmgrid-skeleton" style={{ height: '14px', width: '45%' }} />
  </div>
);

// ─── TemplateGrid ─────────────────────────────────────────────────────────────

export const TemplateGrid: React.FC<TemplateGridProps> = ({
  apiBase: apiBaseProp = '',
  categorySlug: categorySlugProp = '',
  scopeOverride,
  initialSort = 'popular',
  pageSize = DEFAULT_PAGE_SIZE,
}) => {
  // Webflow passes defaultValue strings (including '') as actual values, not undefined.
  // Fall back to the relative path whenever the prop is blank.
  // Rewrite any absolute origin that webflow.com's CSP blocks to the relative default:
  //   - Direct Worker URL (always blocked)
  //   - Cloud App preview subdomain (different origin from webflow.com)
  const rawBase = apiBaseProp || DEFAULT_API_BASE;
  const apiBase =
    rawBase.startsWith(WORKER_ORIGIN) || rawBase.startsWith(CLOUD_APP_PREVIEW_ORIGIN)
      ? DEFAULT_API_BASE
      : rawBase;
  const resolvedPageSize = pageSize || DEFAULT_PAGE_SIZE;
  const initialFilters = parseRouteState(initialSort, categorySlugProp || undefined, scopeOverride);
  const initialGridData =
    typeof window !== 'undefined'
      ? readGridResponseCache(buildApiUrl(apiBase, initialFilters, 1, resolvedPageSize))
      : null;
  // Parse initial filter state from URL on first render
  const [filters, setFilters] = useState<FilterState>(() => initialFilters);

  const [items, setItems] = useState<ApiItem[]>(() => initialGridData?.items ?? []);
  const [page, setPage] = useState(() => initialGridData?.pagination.page ?? 1);
  const [hasNextPage, setHasNextPage] = useState(() => initialGridData?.pagination.has_next_page ?? false);
  const [totalItems, setTotalItems] = useState<number | null>(() => initialGridData?.pagination.total_items ?? null);
  const [loading, setLoading] = useState(() => !initialGridData);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState<number | null>(() => getViewportWidth());

  const rootRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Stale-fetch guard: every new filter/sort change increments this
  const fetchEpochRef = useRef(0);
  const fetchAbortRef = useRef<AbortController | null>(null);
  const lastHrefRef = useRef(typeof window === 'undefined' ? '' : window.location.href);

  useEffect(() => {
    emitTemplateComponentEvent('TemplateGrid', 'mounted', {
      scope: initialFilters.scope,
      category_group_slug: initialFilters.categoryGroupSlug,
      child_category_slug: initialFilters.childCategorySlug,
      styles: initialFilters.styles,
      page_size: resolvedPageSize,
    });
    // Initial route state is intentionally captured once for component health telemetry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    if (gridStylesInjected) return;
    gridStylesInjected = true;
    const styleEl = document.createElement('style');
    styleEl.textContent = GRID_STYLES;
    document.head.appendChild(styleEl);
  }, []);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const root = rootRef.current;
    if (!root) return undefined;

    const container =
      root.closest<HTMLElement>('.mp-main') ??
      root.closest<HTMLElement>('.mp-collection-list') ??
      root.parentElement;
    if (!container) return undefined;

    const updateContainerWidth = () => {
      const measuredWidth = Math.floor(container.getBoundingClientRect().width);
      const viewportWidth = getViewportWidth();
      const nextWidth = viewportWidth ? Math.min(measuredWidth, viewportWidth) : measuredWidth;
      if (nextWidth > 0) {
        setContainerWidth((current) => (current === nextWidth ? current : nextWidth));
      }
    };

    updateContainerWidth();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateContainerWidth);
      window.visualViewport?.addEventListener('resize', updateContainerWidth);
      return () => {
        window.removeEventListener('resize', updateContainerWidth);
        window.visualViewport?.removeEventListener('resize', updateContainerWidth);
      };
    }

    const observer = new ResizeObserver(updateContainerWidth);
    observer.observe(container);
    window.visualViewport?.addEventListener('resize', updateContainerWidth);
    return () => {
      observer.disconnect();
      window.visualViewport?.removeEventListener('resize', updateContainerWidth);
    };
  }, []);

  // Keep Designer prop edits and production URL changes aligned after mount.
  useEffect(() => {
    setFilters((prev) => {
      const next = parseRouteState(initialSort, categorySlugProp || undefined, scopeOverride);
      return areFiltersEqual(prev, next) ? prev : next;
    });
  }, [initialSort, categorySlugProp, scopeOverride]);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchPage = useCallback(
    async (targetPage: number, currentFilters: FilterState, append: boolean) => {
      const epoch = ++fetchEpochRef.current;
      const url = buildApiUrl(apiBase, currentFilters, targetPage, resolvedPageSize);
      const cached = readGridResponseCache(url);

      if (cached) {
        setError(null);
        setItems((prev) => (append ? [...prev, ...cached.items] : cached.items));
        setPage(cached.pagination.page);
        setHasNextPage(cached.pagination.has_next_page);
        setTotalItems(cached.pagination.total_items);
        setLoading(false);
        setLoadingMore(false);
        if (targetPage === 1) {
          emitTemplateComponentEvent('TemplateGrid', 'results_loaded', {
            source: 'cache',
            total_items: cached.pagination.total_items,
            item_count: cached.items.length,
            scope: currentFilters.scope,
            category_group_slug: currentFilters.categoryGroupSlug,
            child_category_slug: currentFilters.childCategorySlug,
            styles: currentFilters.styles,
          });
        }
        if (!append && cached.pagination.has_next_page) {
          prefetchGridPage(buildApiUrl(apiBase, currentFilters, targetPage + 1, resolvedPageSize));
        }
        return;
      }

      fetchAbortRef.current?.abort();
      const controller = new AbortController();
      fetchAbortRef.current = controller;

      if (!append) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`API ${res.status}`);
        const data: ApiResponse = await res.json();
        writeGridResponseCache(url, data);

        if (epoch !== fetchEpochRef.current) return;

        setItems((prev) => (append ? [...prev, ...data.items] : data.items));
        setPage(data.pagination.page);
        setHasNextPage(data.pagination.has_next_page);
        setTotalItems(data.pagination.total_items);
        if (targetPage === 1) {
          emitTemplateComponentEvent('TemplateGrid', 'results_loaded', {
            source: 'network',
            total_items: data.pagination.total_items,
            item_count: data.items.length,
            scope: currentFilters.scope,
            category_group_slug: currentFilters.categoryGroupSlug,
            child_category_slug: currentFilters.childCategorySlug,
            styles: currentFilters.styles,
          });
        }
        if (!append && data.pagination.has_next_page) {
          prefetchGridPage(buildApiUrl(apiBase, currentFilters, targetPage + 1, resolvedPageSize));
        }
      } catch (e) {
        if (epoch !== fetchEpochRef.current) return;
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setError(e instanceof Error ? e.message : 'Failed to load templates');
        if (targetPage === 1) {
          emitTemplateComponentEvent('TemplateGrid', 'results_error', {
            message: e instanceof Error ? e.message : 'Failed to load templates',
            scope: currentFilters.scope,
            category_group_slug: currentFilters.categoryGroupSlug,
            child_category_slug: currentFilters.childCategorySlug,
            styles: currentFilters.styles,
          });
        }
      } finally {
        if (epoch === fetchEpochRef.current) {
          setLoading(false);
          setLoadingMore(false);
          if (fetchAbortRef.current === controller) {
            fetchAbortRef.current = null;
          }
        }
      }
    },
    [apiBase, resolvedPageSize],
  );

  // Re-fetch from page 1 whenever filters change
  useEffect(() => {
    fetchPage(1, filters, false);
  }, [filters, fetchPage]);

  // ── Infinite scroll ───────────────────────────────────────────────────────

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !loadingMore && !loading) {
          fetchPage(page + 1, filters, true);
        }
      },
      { rootMargin: '300px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, loadingMore, loading, page, filters, fetchPage]);

  // ── Wire Webflow filter/sort UI controls ──────────────────────────────────
  //
  // Two wiring paths coexist:
  //   1. Custom-attribute controls (data-template-search-*) — original design
  //   2. Webflow native Finsweet-style controls (fs-cmssort-field / fs-cmsfilter-field)
  //      used by the live webflow.com template marketplace
  //
  // Both paths call the same applyFilters() function.

  useLayoutEffect(() => {
    let debounceId: ReturnType<typeof setTimeout> | null = null;

    function applyFilters(patch: Partial<FilterState>) {
      setFilters((prev) => {
        const next = { ...prev, ...patch };
        updateUrlParams(next);
        return next;
      });
    }

    // ── Path 1: custom-attribute controls ────────────────────────────────────
    const sortEl = document.querySelector<HTMLSelectElement>(SEL_SORT);
    const styleEl = document.querySelector<HTMLSelectElement>(SEL_STYLE);
    const typeEl = document.querySelector<HTMLSelectElement>(SEL_TYPE);
    const freeEl = document.querySelector<HTMLInputElement>(SEL_FREE);
    const searchEl = document.querySelector<HTMLInputElement>(SEL_SEARCH);

    if (sortEl) sortEl.value = filters.sort;
    if (freeEl) freeEl.checked = filters.freeOnly;
    if (searchEl) searchEl.value = filters.q;

    const onSort = (e: Event) => {
      applyFilters({ sort: normalizeTemplateSort((e.target as HTMLSelectElement).value, 'popular') });
    };
    const onStyle = (e: Event) => {
      const v = (e.target as HTMLSelectElement).value;
      applyFilters({ styles: v ? [v] : [] });
    };
    const onType = (e: Event) => {
      const v = (e.target as HTMLSelectElement).value;
      applyFilters({ types: v ? [v] : [] });
    };
    const onFree = (e: Event) => {
      applyFilters({ freeOnly: (e.target as HTMLInputElement).checked });
    };
    const onSearch = (e: Event) => {
      const q = (e.target as HTMLInputElement).value.trim();
      if (debounceId) clearTimeout(debounceId);
      debounceId = setTimeout(() => applyFilters({ q }), 220);
    };

    sortEl?.addEventListener('change', onSort);
    styleEl?.addEventListener('change', onStyle);
    typeEl?.addEventListener('change', onType);
    freeEl?.addEventListener('change', onFree);
    searchEl?.addEventListener('input', onSearch);

    // ── Path 2: Webflow native Finsweet-style controls ───────────────────────

    // Sort: <a href="#" fs-cmssort-field="popularity-score-desc">Popular</a>
    // Intercept click, map field value to our sort key, let Webflow dropdown
    // JS continue (no stopPropagation) so it closes the menu + updates the label.
    const onFsSortClick = (e: MouseEvent) => {
      e.preventDefault(); // prevent href="#" page-jump; dropdown close still fires
      const field = (e.currentTarget as HTMLElement).getAttribute('fs-cmssort-field') ?? '';
      applyFilters({ sort: normalizeTemplateSort(field, 'popular') });
    };
    const fsSortLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[fs-cmssort-field]'));
    fsSortLinks.forEach((link) => link.addEventListener('click', onFsSortClick));

    // Filters: listen to the Finsweet filter form for checkbox/radio changes.
    // Style checkboxes: <label><input type="checkbox"><span fs-cmsfilter-field="styles">Modern</span></label>
    // Type radios:      <input type="radio" name="Type" value="One Page">
    // Free toggle:      <input fs-cmsfilter-field="free" type="checkbox">
    function collectFsStyles(): string[] {
      return Array.from(document.querySelectorAll<HTMLElement>('[fs-cmsfilter-field="styles"]'))
        .filter((span) => {
          const label = span.closest('label');
          return (label?.querySelector<HTMLInputElement>('input[type="checkbox"]'))?.checked ?? false;
        })
        // Convert display names to slugs so they match style_slug in the DB.
        .map((span) => toTemplateStyleSlug(span.textContent ?? ''))
        .filter(Boolean);
    }

    const onFsFilterChange = () => {
      const typeInput = document.querySelector<HTMLInputElement>('input[name="Type"]:checked');
      const freeInput = document.querySelector<HTMLInputElement>('[fs-cmsfilter-field="free"]');
      applyFilters({
        styles: collectFsStyles(),
        types: typeInput?.value ? [typeInput.value] : [],
        freeOnly: freeInput?.checked ?? false,
      });
    };
    const fsFilterForm = document.querySelector<HTMLElement>('[fs-cmsfilter-element="filters"]');
    fsFilterForm?.addEventListener('change', onFsFilterChange);

    // ── categoryFilterUpdated integration ───────────────────────────────────────
    // Category pill clicks update URL state via replaceState, which does not
    // trigger popstate. Listen for the bridge event and re-read the category
    // slugs from either the legacy analytics global or the URL fallback.
    type CategoryFilterAnalyticsGlobal = {
      getContext: () => { current_category?: string | null; current_subcategory?: string | null };
    };
    const onCategoryFilterUpdated = () => {
      const href = window.location.href;
      lastHrefRef.current = href;
      const analytics = (window as unknown as Record<string, unknown>).CategoryFilterAnalytics as
        | CategoryFilterAnalyticsGlobal
        | undefined;
      if (typeof analytics?.getContext === 'function') {
        const ctx = analytics.getContext();
        setFilters((prev) => ({
          ...prev,
          categoryGroupSlug: ctx.current_category || null,
          childCategorySlug: ctx.current_subcategory || null,
        }));
      } else {
        // Fallback: re-parse URL (assumes the filter script called pushState first)
        setFilters((prev) => {
          const next = mergeExternalFilterState(
            parseRouteState(initialSort, categorySlugProp || undefined, scopeOverride),
            readSharedFilterState(href),
          );
          return areFiltersEqual(prev, next) ? prev : next;
        });
      }
    };
    document.addEventListener('categoryFilterUpdated', onCategoryFilterUpdated);

    return () => {
      sortEl?.removeEventListener('change', onSort);
      styleEl?.removeEventListener('change', onStyle);
      typeEl?.removeEventListener('change', onType);
      freeEl?.removeEventListener('change', onFree);
      searchEl?.removeEventListener('input', onSearch);
      fsSortLinks.forEach((link) => link.removeEventListener('click', onFsSortClick));
      fsFilterForm?.removeEventListener('change', onFsFilterChange);
      document.removeEventListener('categoryFilterUpdated', onCategoryFilterUpdated);
      if (debounceId) clearTimeout(debounceId);
    };
    // Only run once on mount — selectors are stable page-level elements
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Drive the native Webflow empty-state element ─────────────────────────
  // Finsweet normally controls [fs-cmsfilter-element="empty"]; since we own
  // the filtering we hide/show it ourselves based on our result state.
  useEffect(() => {
    const emptyEl = document.querySelector<HTMLElement>('[fs-cmsfilter-element="empty"]');
    if (!emptyEl) return;
    const shouldShow = !loading && !error && items.length === 0;
    emptyEl.style.display = shouldShow ? '' : 'none';
  }, [loading, error, items]);

  // Re-parse from URL on browser back/forward navigation
  useEffect(() => {
    const onPop = () => {
      const href = window.location.href;
      lastHrefRef.current = href;
      setFilters((prev) => {
        const next = mergeExternalFilterState(
          parseRouteState(initialSort, categorySlugProp || undefined, scopeOverride),
          readSharedFilterState(href),
        );
        return areFiltersEqual(prev, next) ? prev : next;
      });
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [initialSort, categorySlugProp, scopeOverride]);

  // TemplateSearch writes ?query= and dispatches this event so the grid can
  // refresh immediately without waiting for URL polling or a full page reload.
  useEffect(() => {
    const onTemplateSearchQuery = (event: Event) => {
      const href = window.location.href;
      lastHrefRef.current = href;
      setFilters((prev) => {
        const parsed = parseRouteState(initialSort, categorySlugProp || undefined, scopeOverride);
        const withShared = mergeExternalFilterState(parsed, readSharedFilterState(href));
        const next = mergeExternalFilterState(withShared, (event as CustomEvent).detail);
        return areFiltersEqual(prev, next) ? prev : next;
      });
    };
    window.addEventListener('template-search-query', onTemplateSearchQuery);
    document.addEventListener('template-search-query', onTemplateSearchQuery);
    return () => {
      window.removeEventListener('template-search-query', onTemplateSearchQuery);
      document.removeEventListener('template-search-query', onTemplateSearchQuery);
    };
  }, [initialSort, categorySlugProp, scopeOverride]);

  // Re-parse from URL when TemplateFilterBar (code component) updates filter state.
  // TemplateFilterBar writes to URL params then dispatches this event — we just
  // re-read the URL, then merge the event payload so explicit default-sort
  // selections remain distinguishable from "no sort param" URLs.
  useEffect(() => {
    const onFilterBarChange = (event: Event) => {
      const href = window.location.href;
      lastHrefRef.current = href;
      setFilters((prev) => {
        const next = mergeExternalFilterState(
          parseRouteState(initialSort, categorySlugProp || undefined, scopeOverride),
          (event as CustomEvent).detail ?? readSharedFilterState(href),
        );
        return areFiltersEqual(prev, next) ? prev : next;
      });
    };
    window.addEventListener('templateFiltersChanged', onFilterBarChange);
    document.addEventListener('templateFiltersChanged', onFilterBarChange);
    return () => {
      window.removeEventListener('templateFiltersChanged', onFilterBarChange);
      document.removeEventListener('templateFiltersChanged', onFilterBarChange);
    };
  }, [initialSort, categorySlugProp, scopeOverride]);

  // replaceState() does not fire popstate. Poll the URL as a low-cost fallback
  // so the grid still refreshes if Webflow isolates or drops the custom event.
  useEffect(() => {
    const id = window.setInterval(() => {
      const href = window.location.href;
      if (href === lastHrefRef.current) return;
      lastHrefRef.current = href;
      setFilters((prev) => {
        const next = mergeExternalFilterState(
          parseRouteState(initialSort, categorySlugProp || undefined, scopeOverride),
          readSharedFilterState(href),
        );
        return areFiltersEqual(prev, next) ? prev : next;
      });
    }, 250);
    return () => window.clearInterval(id);
  }, [initialSort, categorySlugProp, scopeOverride]);

  // ── Render ─────────────────────────────────────────────────────────────────

  const measuredWidth = containerWidth ?? 1200;
  const flexColumns = getColumnCount(measuredWidth);
  const columnGap = getColumnGap(measuredWidth);
  const rowGap = getRowGap(measuredWidth);
  const flexBasis = getFlexBasis(flexColumns, columnGap);
  const gridStyle: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    columnGap: `${columnGap}px`,
    rowGap: `${rowGap}px`,
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    overflow: 'visible',
  };
  const gridItemStyle: CSSProperties = {
    flex: `0 1 ${flexBasis}`,
    width: flexBasis,
    minWidth: 0,
    maxWidth: '100%',
  };

  if (loading && items.length === 0) {
    return (
      <div
        ref={rootRef}
        className="tmgrid-shell"
        style={S.root}
        data-template-component="TemplateGrid"
        data-template-component-version={TEMPLATE_MARKETPLACE_COMPONENT_VERSION}
      >
        <div className="tmgrid-grid" data-columns={flexColumns} style={gridStyle}>
          {Array.from({ length: Math.min(resolvedPageSize, 12) }).map((_, i) => (
            <SkeletonCard key={i} index={i} itemStyle={gridItemStyle} />
          ))}
        </div>
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div
        style={S.root}
        data-template-component="TemplateGrid"
        data-template-component-version={TEMPLATE_MARKETPLACE_COMPONENT_VERSION}
      >
        <div style={S.errorBox}>
          <p>Unable to load templates. Please try refreshing the page.</p>
          <button
            onClick={() => fetchPage(1, filters, false)}
            style={{
              marginTop: '12px',
              padding: '8px 20px',
              fontSize: '13px',
              cursor: 'pointer',
              border: '1px solid rgba(0,0,0,0.2)',
              borderRadius: '6px',
              background: 'white',
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // When items is empty (but not loading/error), render nothing — the native
  // [fs-cmsfilter-element="empty"] element is shown by the effect above.
  if (items.length === 0) return null;

  const isRefreshing = loading && items.length > 0;

  return (
    <div
      ref={rootRef}
      className="tmgrid-shell"
      style={S.root}
      aria-busy={isRefreshing ? true : undefined}
      data-template-component="TemplateGrid"
      data-template-component-version={TEMPLATE_MARKETPLACE_COMPONENT_VERSION}
    >
      {totalItems !== null && (
        <div style={S.countLabel}>
          {totalItems.toLocaleString()} template{totalItems !== 1 ? 's' : ''}
        </div>
      )}

      <div className="tmgrid-grid-wrap" data-refreshing={isRefreshing ? 'true' : undefined}>
        {isRefreshing && (
          <div className="tmgrid-refresh-indicator" aria-hidden="true">
            <div className="tmgrid-spinner" />
          </div>
        )}
        <div className="tmgrid-grid" data-columns={flexColumns} style={gridStyle}>
          {items.map((item, i) => {
            const primaryImageUrl = primaryThumbnailUrl(item);
            return (
              <div
                key={item.id}
                className="tmgrid-item"
                style={{
                  ...gridItemStyle,
                  animationDelay: `${Math.min(i % resolvedPageSize, 11) * 40}ms`,
                }}
                data-template-slug={item.template_slug}
              >
                <TemplateCard
                  templateName={item.name}
                  templateLink={{ href: item.url ?? '#' }}
                  price={formatPrice(item)}
                  priceNumeric={String(item.price ?? '0')}
                  isFree={item.is_free}
                  creatorName={item.creator_name ?? ''}
                  creatorLink={
                    item.creator_profile_url
                      ? { href: item.creator_profile_url, target: '_blank' }
                      : undefined
                  }
                  creatorIcon={
                    item.creator_avatar_url
                      ? { src: proxyImageUrl(item.creator_avatar_url, apiBase), alt: item.creator_avatar_alt ?? item.creator_name ?? '' }
                      : undefined
                  }
                  primaryImage={primaryImageUrl ? { src: proxyImageUrl(primaryImageUrl, apiBase), alt: item.name } : undefined}
                  secondaryImage={
                    item.thumbnail_image_secondary_url
                      ? { src: proxyImageUrl(item.thumbnail_image_secondary_url, apiBase), alt: item.name }
                      : undefined
                  }
                  priorityIndex={i}
                  deferSecondaryImage
                  approvalDate={item.published_date ?? ''}
                  popularityScore={String(item.popularity_score ?? '')}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} style={{ height: 1 }} aria-hidden="true" />

      {loadingMore && (
        <div style={S.loadMoreWrapper}>
          <div className="tmgrid-spinner" />
        </div>
      )}

      {!hasNextPage && items.length > 0 && (
        <div
          style={{
            ...S.loadMoreWrapper,
            fontSize: '13px',
            color: 'rgba(0,0,0,0.35)',
          }}
        >
          All {totalItems?.toLocaleString()} templates loaded
        </div>
      )}
    </div>
  );
};

export default TemplateGrid;
