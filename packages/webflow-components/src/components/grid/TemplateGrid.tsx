import React, {
  CSSProperties,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { TemplateCard } from '../cards/TemplateCard';

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

type TemplateSort = 'popular' | 'newest' | 'price_asc' | 'price_desc';
type TemplateScope = 'all' | 'featured' | 'free' | 'landing_pages';

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

// Hosts whose images need to be routed through the Cloud App proxy.
// Airtable signed attachment URLs expire after ~2 hours; the proxy caches
// them at Cloudflare edge for 24 h so expiry gaps don't cause broken images.
const IMAGE_PROXY_BLOCKLIST = ['airtableusercontent.com', 'dl.airtable.com'];

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

// Selectors matching the existing Webflow filter/sort UI (same as client-script.ts)
const SEL_SORT = '[data-template-search-sort], select[name="sort"]';
const SEL_STYLE = '[data-template-search-style], select[name="styles"]';
const SEL_TYPE = '[data-template-search-type], select[name="types"]';
const SEL_FREE = '[data-template-search-free], input[name="free_only"], input[fs-cmsfilter-field="free"]';
const SEL_SEARCH = '[data-template-search-input], input[type="search"]';

// ─── URL helpers ──────────────────────────────────────────────────────────────

// Style slugs in the DB are lowercase-hyphenated (mirrors the search-worker's
// slugifySegment). Convert display names from the filter UI to the same format.
function toStyleSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeSort(value: string | null | undefined, fallback: TemplateSort = 'popular'): TemplateSort {
  switch ((value ?? '').trim()) {
    case 'newest':
    case 'approval-date':
    case 'approval-date-desc':
      return 'newest';
    case 'price_asc':
    case 'price-asc':
      return 'price_asc';
    case 'price_desc':
    case 'price-desc':
      return 'price_desc';
    case 'popular':
    case 'popularity-score':
    case 'popularity-score-desc':
      return 'popular';
    default:
      return fallback;
  }
}

function resolveScopeOverride(scopeOverrideParam?: TemplateScope): TemplateScope | undefined {
  return scopeOverrideParam && scopeOverrideParam !== 'all' ? scopeOverrideParam : undefined;
}

/**
 * Derives the full filter state from the current page URL.
 * Mirrors client-script.ts parseRouteState() so all Webflow template URL
 * patterns map correctly to API parameters.
 *
 * Supported paths:
 *   /templates/all                     → scope=all
 *   /templates/featured                → scope=featured
 *   /templates/free                    → scope=free
 *   /templates/free-website-templates  → scope=free
 *   /templates/landing-page            → scope=landing_pages
 *   /templates/landing-pages           → scope=landing_pages
 *   /templates/category/{slug}         → category_group_slug={slug}
 *   /templates/subcategory/{slug}      → child_category_slug={slug}
 *   ?category={slug}                   → category_group_slug={slug}
 *   ?subcategory={slug}                → child_category_slug={slug}
 */
function parseRouteState(
  defaultSort: TemplateSort = 'popular',
  slugOverride?: string,
  scopeOverrideParam?: TemplateScope,
): FilterState {
  const resolvedScopeOverride = resolveScopeOverride(scopeOverrideParam);

  if (typeof window === 'undefined') {
    return {
      q: '',
      scope: resolvedScopeOverride ?? 'all',
      categoryGroupSlug: slugOverride || null,
      childCategorySlug: null,
      styles: [],
      types: [],
      freeOnly: false,
      sort: defaultSort,
    };
  }

  const url = new URL(window.location.href);
  const params = url.searchParams;
  const pathname = url.pathname.replace(/\/+$/, '');

  let scope: TemplateScope = 'all';
  let freeOnly = false;

  // Path-based scope detection
  if (pathname === '/templates/featured') scope = 'featured';
  if (
    pathname === '/templates/free' ||
    pathname === '/templates/free-website-templates' ||
    params.get('pricing') === 'free'
  ) {
    scope = 'free';
    freeOnly = true;
  }
  if (/\/templates\/landing-page(s)?($|\/)/.test(pathname)) {
    scope = 'landing_pages';
  }

  // Slug detection from path or query param
  // Path: /templates/category/{slug}
  // Query: ?category={slug} (used on e.g. /templates/free-website-templates?category=architecture-design)
  const categoryMatch = pathname.match(/\/templates\/category\/([^/?#]+)/);
  const subcategoryMatch = pathname.match(/\/templates\/subcategory\/([^/?#]+)/);
  const categoryParam = params.get('category');
  const subcategoryParam = params.get('subcategory');

  // Query-param filters (user-applied via filter UI)
  const qRaw = params.get('q') ?? params.get('query') ?? params.get('search') ?? '';
  const freeParam = ['1', 'true', 'yes', 'on'].includes((params.get('free_only') ?? '').toLowerCase());
  // Style slugs in the DB are lowercase-hyphenated (slugifySegment), so normalize incoming URL values.
  const styles = params.getAll('styles').flatMap((v) => v.split(',')).filter(Boolean).map(toStyleSlug);
  const types = params.getAll('types').flatMap((v) => v.split(',')).filter(Boolean);

  return {
    q: qRaw.trim(),
    scope: resolvedScopeOverride ?? scope,
    // Designer preview slug prop takes precedence over URL detection
    categoryGroupSlug: slugOverride || (categoryMatch ? categoryMatch[1] : categoryParam || null),
    childCategorySlug: subcategoryMatch ? subcategoryMatch[1] : subcategoryParam || null,
    styles,
    types,
    freeOnly: freeOnly || freeParam,
    sort: normalizeSort(params.get('sort'), defaultSort),
  };
}

function mergeExternalFilterState(base: FilterState, detail: unknown): FilterState {
  if (!detail || typeof detail !== 'object') return base;
  const patch = detail as Partial<{
    q: unknown;
    styles: unknown;
    types: unknown;
    freeOnly: unknown;
    sort: unknown;
  }>;

  return {
    ...base,
    q: typeof patch.q === 'string' ? patch.q.trim() : base.q,
    styles: Array.isArray(patch.styles) ? patch.styles.filter((value): value is string => typeof value === 'string') : base.styles,
    types: Array.isArray(patch.types) ? patch.types.filter((value): value is string => typeof value === 'string') : base.types,
    freeOnly: typeof patch.freeOnly === 'boolean' ? patch.freeOnly : base.freeOnly,
    sort: typeof patch.sort === 'string' ? normalizeSort(patch.sort, base.sort) : base.sort,
  };
}

function readSharedFilterState(href: string): unknown {
  if (typeof window === 'undefined') return undefined;
  const detail = (window as unknown as Record<string, unknown>).__templateMarketplaceFilters;
  if (!detail || typeof detail !== 'object') return undefined;
  const shared = detail as { href?: unknown };
  return shared.href === href ? detail : undefined;
}

function areStringArraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function areFiltersEqual(a: FilterState, b: FilterState): boolean {
  return (
    a.q === b.q &&
    a.scope === b.scope &&
    a.categoryGroupSlug === b.categoryGroupSlug &&
    a.childCategorySlug === b.childCategorySlug &&
    a.freeOnly === b.freeOnly &&
    a.sort === b.sort &&
    areStringArraysEqual(a.styles, b.styles) &&
    areStringArraysEqual(a.types, b.types)
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

/* Responsive grid breakpoints injected here so Webflow classes don't override */
.tmgrid-grid {
  display: grid !important;
  grid-template-columns: repeat(4, 1fr) !important;
  gap: 24px !important;
  width: 100% !important;
}
@media (max-width: 991px) { .tmgrid-grid { grid-template-columns: repeat(3, 1fr) !important; } }
@media (max-width: 767px) { .tmgrid-grid { grid-template-columns: repeat(2, 1fr) !important; } }
@media (max-width: 479px) { .tmgrid-grid { grid-template-columns: 1fr !important; } }
`;

const S: Record<string, CSSProperties> = {
  root: {
    width: '100%',
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

const SkeletonCard: React.FC<{ index: number }> = ({ index }) => (
  <div className="tmgrid-item" style={{ animationDelay: `${index * 40}ms` }}>
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
  // Parse initial filter state from URL on first render
  const [filters, setFilters] = useState<FilterState>(() =>
    parseRouteState(initialSort, categorySlugProp || undefined, scopeOverride),
  );

  const [items, setItems] = useState<ApiItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalItems, setTotalItems] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  // Stale-fetch guard: every new filter/sort change increments this
  const fetchEpochRef = useRef(0);
  const lastHrefRef = useRef(typeof window === 'undefined' ? '' : window.location.href);

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

      if (!append) {
        setLoading(true);
        setError(null);
        setItems([]);
      } else {
        setLoadingMore(true);
      }

      try {
        const url = buildApiUrl(apiBase, currentFilters, targetPage, resolvedPageSize);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`API ${res.status}`);
        const data: ApiResponse = await res.json();

        if (epoch !== fetchEpochRef.current) return;

        setItems((prev) => (append ? [...prev, ...data.items] : data.items));
        setPage(data.pagination.page);
        setHasNextPage(data.pagination.has_next_page);
        setTotalItems(data.pagination.total_items);
      } catch (e) {
        if (epoch !== fetchEpochRef.current) return;
        setError(e instanceof Error ? e.message : 'Failed to load templates');
      } finally {
        if (epoch === fetchEpochRef.current) {
          setLoading(false);
          setLoadingMore(false);
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
      applyFilters({ sort: normalizeSort((e.target as HTMLSelectElement).value, 'popular') });
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
      applyFilters({ sort: normalizeSort(field, 'popular') });
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
        .map((span) => toStyleSlug(span.textContent ?? ''))
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
      lastHrefRef.current = window.location.href;
      setFilters(parseRouteState(initialSort, categorySlugProp || undefined, scopeOverride));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
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

  if (loading) {
    return (
      <div style={S.root}>
        <style dangerouslySetInnerHTML={{ __html: GRID_STYLES }} />
        <div className="tmgrid-grid">
          {Array.from({ length: Math.min(resolvedPageSize, 12) }).map((_, i) => (
            <SkeletonCard key={i} index={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={S.root}>
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

  return (
    <div style={S.root}>
      <style dangerouslySetInnerHTML={{ __html: GRID_STYLES }} />
      {totalItems !== null && (
        <div style={S.countLabel}>
          {totalItems.toLocaleString()} template{totalItems !== 1 ? 's' : ''}
        </div>
      )}

      <div className="tmgrid-grid">
        {items.map((item, i) => (
          <div
            key={item.id}
            className="tmgrid-item"
            style={{ animationDelay: `${Math.min(i % resolvedPageSize, 11) * 40}ms` }}
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
              primaryImage={
                item.thumbnail_image_url
                  ? { src: proxyImageUrl(item.thumbnail_image_url, apiBase), alt: item.name }
                  : undefined
              }
              secondaryImage={
                item.thumbnail_image_secondary_url
                  ? { src: proxyImageUrl(item.thumbnail_image_secondary_url, apiBase), alt: item.name }
                  : undefined
              }
              approvalDate={item.published_date ?? ''}
              popularityScore={String(item.popularity_score ?? '')}
            />
          </div>
        ))}
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
