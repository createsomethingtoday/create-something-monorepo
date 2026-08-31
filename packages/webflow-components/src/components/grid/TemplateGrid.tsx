import React, {
  CSSProperties,
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { TemplateCard, TEMPLATE_CARD_STYLES, type TemplateCardBadge, type TemplateCardLink } from '../cards/TemplateCard';
import { trackMarketplaceEvent } from '../marketplace/analytics';
import { FeaturedTemplatePreview } from '../marketplace/FeaturedTemplatePreview';
import { TemplateCampaignLane } from '../marketplace/TemplateCampaignLane';
import {
  MarketplaceComponentErrorBoundary,
  useMarketplaceComponentErrorTracking,
} from '../marketplace/MarketplaceComponentErrorBoundary';
import {
  getSafeAnalyticsOverrides,
  MARKETPLACE_SIGNAL_WINDOW,
  writeTemplateAttribution,
  type TemplateMarketplaceAttribution,
} from '../marketplace/templateAttribution';
import {
  normalizeTemplateSort as normalizeSort,
  type TemplateSort,
} from '../marketplace/templateRoute';

// ─── API types ────────────────────────────────────────────────────────────────

interface ApiTerm {
  name: string;
  slug: string;
  url?: string;
}

interface ApiItem {
  id: string;
  template_slug: string;
  name: string;
  url: string | null;
  preview_url: string | null;
  website_url: string | null;
  purchase_url: string | null;
  creator_name: string | null;
  creator_slug: string | null;
  creator_profile_url: string | null;
  creator_avatar_url: string | null;
  creator_avatar_alt: string | null;
  thumbnail_image_url: string | null;
  thumbnail_image_secondary_url: string | null;
  price: number | null;
  is_free: boolean;
  is_featured: boolean;
  reviewer_pick_reason: string | null;
  description_short?: string;
  template_type: string | null;
  popularity_score: number | null;
  unique_viewers: number | null;
  cumulative_purchases: number | null;
  published_date: string | null;
  category_groups?: ApiTerm[];
  child_categories?: ApiTerm[];
  styles?: ApiTerm[];
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
  client_filter?: {
    strict_free: boolean;
    dropped_paid_items: number;
    source_total_items: number;
  };
}

// ─── Filter / route state ─────────────────────────────────────────────────────

type TemplateScope = 'all' | 'featured' | 'free' | 'landing_pages';

interface FilterState {
  q: string;
  scope: TemplateScope;
  categoryGroupSlug: string | null;
  childCategorySlug: string | null;
  creatorSlug: string | null;
  creatorRecordId: string | null;
  styleSlug: string | null;
  tagSlug: string | null;
  styles: string[];
  tags: string[];
  types: string[];
  freeOnly: boolean;
  sort: TemplateSort;
}

interface FeaturedPreviewSession {
  items: ApiItem[];
  index: number;
  page: number;
  hasNextPage: boolean;
  total: number;
  filters: FilterState;
  loadingNext: boolean;
  navigationError: string | null;
}

export type TemplateGridDisplayItem<T> =
  | { kind: 'template'; item: T; sourceIndex: number }
  | { kind: 'campaign'; campaignId: 'webflow-mcp-2' };

export type TemplateGridCampaignCoverage = 'all_listings' | 'broad' | 'off';

export interface TemplateGridCampaignContext {
  enabled: boolean;
  coverage: TemplateGridCampaignCoverage;
  query: string;
  scope: TemplateScope;
  categoryGroupSlug: string | null;
  childCategorySlug: string | null;
  creatorSlug: string | null;
  styleSlug: string | null;
  tagSlug: string | null;
  styles: readonly string[];
  tags: readonly string[];
  types: readonly string[];
  freeOnly: boolean;
}

export function shouldShowTemplateGridCampaign(context: TemplateGridCampaignContext): boolean {
  if (!context.enabled || context.coverage === 'off' || context.query.trim()) return false;
  if (context.coverage === 'all_listings') return true;
  if (context.scope !== 'all' && context.scope !== 'featured') return false;
  return (
    !context.categoryGroupSlug &&
    !context.childCategorySlug &&
    !context.creatorSlug &&
    !context.styleSlug &&
    !context.tagSlug &&
    context.styles.length === 0 &&
    context.tags.length === 0 &&
    context.types.length === 0 &&
    !context.freeOnly
  );
}

export function templateGridColumnCount(viewportWidth: number): 1 | 2 | 3 | 4 {
  if (viewportWidth <= 479) return 1;
  if (viewportWidth <= 767) return 2;
  if (viewportWidth <= 991) return 3;
  return 4;
}

export function buildTemplateGridDisplayItems<T>(
  items: readonly T[],
  campaignInsertAfter: number,
  showCampaign: boolean,
): TemplateGridDisplayItem<T>[] {
  const templateItems: TemplateGridDisplayItem<T>[] = items.map((item, sourceIndex) => ({
    kind: 'template',
    item,
    sourceIndex,
  }));
  const insertionIndex = Math.max(1, Math.floor(campaignInsertAfter));
  if (!showCampaign || items.length < insertionIndex) return templateItems;

  return [
    ...templateItems.slice(0, insertionIndex),
    { kind: 'campaign', campaignId: 'webflow-mcp-2' },
    ...templateItems.slice(insertionIndex),
  ];
}

export function appendUniqueFeaturedPreviewItems<T extends { id: string; template_slug: string }>(
  current: readonly T[],
  nextPage: readonly T[],
): T[] {
  const seen = new Set(current.map((item) => item.id || item.template_slug));
  const appended = nextPage.filter((item) => {
    const key = item.id || item.template_slug;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return [...current, ...appended];
}

export type FeaturedPreviewNavigationIntent =
  | { kind: 'move'; index: number }
  | { kind: 'load-next' }
  | { kind: 'none' };

export function resolveFeaturedPreviewNavigation(
  index: number,
  itemCount: number,
  hasNextPage: boolean,
  direction: -1 | 1,
): FeaturedPreviewNavigationIntent {
  const nextIndex = index + direction;
  if (nextIndex >= 0 && nextIndex < itemCount) return { kind: 'move', index: nextIndex };
  if (direction === 1 && hasNextPage) return { kind: 'load-next' };
  return { kind: 'none' };
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface TemplateGridProps {
  /**
   * Base URL for the template search API, no trailing slash.
   * Production default: https://templates.webflow.com/templates-api
   * (Cloud App proxy — CSP-safe from webflow.com pages).
   * Override to https://webflow-template-search.webflow-inc.workers.dev for local dev.
   */
  apiBase?: string;
  /**
   * Override for Designer preview only.
   * In production the slug is auto-detected from the URL path
   * (/templates/category/{slug}).
   */
  categorySlug?: string;
  /**
   * Creator/designer slug for Designer preview. In production the slug is
   * auto-detected from /templates/designers/{slug}.
   */
  creatorSlug?: string;
  /**
   * Optional creator record ID for exact Designer-page binding when available.
   * Production can infer by slug from the URL; record ID narrows duplicate-name cases.
   */
  creatorRecordId?: string;
  /**
   * Style slug for Designer preview. In production the slug is auto-detected
   * from /templates/style/{slug}.
   */
  styleSlug?: string;
  /**
   * Tag slug for Designer preview. In production the slug is auto-detected
   * from /templates/tag/{slug}.
   */
  tagSlug?: string;
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
  /**
   * Render an inline no-results state instead of relying on a native Webflow
   * [fs-cmsfilter-element="empty"] element.
   */
  showEmptyState?: boolean;
  /** No-results heading when showEmptyState is enabled. */
  emptyTitle?: string;
  /** No-results body copy when showEmptyState is enabled. */
  emptyDescription?: string;
  /** Clear-filters button label when showEmptyState is enabled. */
  emptyActionLabel?: string;
  /** Show a small recommendation grid when a query/filter returns no results. */
  showEmptyRecommendations?: boolean;
  /** Heading for the featured-template no-results recommendation grid. */
  emptyRecommendationsTitle?: string;
  /** Show category/subcategory metadata below the creator name. */
  showCategoryMeta?: boolean;
  /** Show the template type alongside category metadata. */
  showTemplateType?: boolean;
  /** Show a secondary Preview link when the API has a preview URL. */
  showPreviewLink?: boolean;
  /** Show Featured badge on API-featured templates. */
  showFeaturedBadge?: boolean;
  /** Show compact social-proof signals from the search API on each card. */
  showMarketplaceSignals?: boolean;
  /** Show the Webflow MCP 2.0 campaign when campaignCoverage permits it. */
  showMcpCampaign?: boolean;
  /** Choose whether the campaign appears across all listings, broad listings only, or nowhere. */
  campaignCoverage?: TemplateGridCampaignCoverage;
  /**
   * Emit aggregate marketplace health telemetry for successful result batches
   * and component errors. Does not send raw query text, template names, or
   * creator names.
   */
  enableAnalytics?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Production Cloud App URL — hosted on *.webflow.com so it passes the
// webflow.com page CSP (connect-src https://*.webflow.com).
const DEFAULT_API_BASE = 'https://templates.webflow.com/templates-api';
// The direct Worker origin is blocked by webflow.com's CSP — rewrite to proxy.
const WORKER_ORIGIN = 'https://webflow-template-search.webflow-inc.workers.dev';
// Persisted component properties may retain the pre-migration Worker origin.
const LEGACY_WORKER_ORIGIN = 'https://webflow-template-search.createsomething.workers.dev';
// Legacy preview URL — rewrite to the production base.
const CLOUD_APP_PREVIEW_ORIGIN = 'https://webflow-template-marketplace.webflow.io';
const DEFAULT_PAGE_SIZE = 24;
const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
const NEW_TEMPLATE_WINDOW_DAYS = 30;
const EMPTY_RECOMMENDATION_COUNT = 4;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const gridResponseCache = new Map<string, { timestamp: number; data: ApiResponse }>();
// Bound the session cache: every query keystroke × page × filter combo is a
// distinct key, so long browsing sessions would otherwise grow unbounded.
const GRID_CACHE_MAX_ENTRIES = 50;

function getCachedGridResponse(url: string): ApiResponse | null {
  const cached = gridResponseCache.get(url);
  if (!cached) return null;
  if (Date.now() - cached.timestamp >= SEARCH_CACHE_TTL_MS) {
    gridResponseCache.delete(url);
    return null;
  }
  return cached.data;
}

function setCachedGridResponse(url: string, data: ApiResponse): void {
  gridResponseCache.delete(url);
  gridResponseCache.set(url, { timestamp: Date.now(), data });
  while (gridResponseCache.size > GRID_CACHE_MAX_ENTRIES) {
    const oldestKey = gridResponseCache.keys().next().value;
    if (oldestKey === undefined) break;
    gridResponseCache.delete(oldestKey);
  }
}

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

// Selectors matching the existing Webflow filter/sort UI (same as client-script.ts)
const SEL_SORT = '[data-template-search-sort], select[name="sort"]';
const SEL_STYLE = '[data-template-search-style], select[name="styles"]';
const SEL_TYPE = '[data-template-search-type], select[name="types"]';
const SEL_FREE = '[data-template-search-free], input[name="free_only"], input[fs-cmsfilter-field="free"]';
const SEL_SEARCH = '[data-template-search-input], input[type="search"]';

// ─── URL helpers ──────────────────────────────────────────────────────────────

// Slugs in the DB are lowercase-hyphenated (mirrors the search-worker's
// slugifySegment). Convert display names from the filter UI to the same format.
function toFilterSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toStyleSlug(name: string): string {
  return toFilterSlug(name);
}

function resolveScopeOverride(scopeOverrideParam?: TemplateScope): TemplateScope | undefined {
  return scopeOverrideParam && scopeOverrideParam !== 'all' ? scopeOverrideParam : undefined;
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
 *   /templates/designers/{slug}        → creator_slug={slug}
 *   /templates/style/{slug}            → style_slug={slug}
 *   /templates/tag/{slug}              → tag_slug={slug}
 *   ?category={slug}                   → category_group_slug={slug}
 *   ?subcategory={slug}                → child_category_slug={slug}
 */
function parseRouteState(
  defaultSort: TemplateSort = 'popular',
  categorySlugOverride?: string,
  scopeOverrideParam?: TemplateScope,
  styleSlugOverride?: string,
  tagSlugOverride?: string,
  creatorSlugOverride?: string,
  creatorRecordIdOverride?: string,
): FilterState {
  const resolvedScopeOverride = resolveScopeOverride(scopeOverrideParam);

  if (typeof window === 'undefined') {
    return {
      q: '',
      scope: resolvedScopeOverride ?? 'all',
      categoryGroupSlug: categorySlugOverride || null,
      childCategorySlug: null,
      creatorSlug: creatorSlugOverride || null,
      creatorRecordId: creatorRecordIdOverride || null,
      styleSlug: styleSlugOverride || null,
      tagSlug: tagSlugOverride || null,
      styles: [],
      tags: [],
      types: [],
      freeOnly: false,
      sort: defaultSort,
    };
  }

  const url = new URL(window.location.href);
  const params = url.searchParams;
  const pathname = url.pathname.replace(/\/+$/, '');
  const scopeParam = normalizeScope(params.get('scope'));

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
  if (scopeParam) {
    scope = scopeParam;
    if (scopeParam === 'free') freeOnly = true;
  }

  // Slug detection from path or query param
  // Path: /templates/category/{slug}
  // Query: ?category={slug} (used on e.g. /templates/free-website-templates?category=architecture-design)
  const categoryMatch = pathname.match(/\/templates\/category\/([^/?#]+)/);
  const subcategoryMatch = pathname.match(/\/templates\/subcategory\/([^/?#]+)/);
  const designerMatch = pathname.match(/\/templates\/designers\/([^/?#]+)/);
  const styleMatch = pathname.match(/\/templates\/style\/([^/?#]+)/);
  const tagMatch = pathname.match(/\/templates\/tag\/([^/?#]+)/);
  const categoryParam = params.get('category') ?? params.get('category_group_slug');
  const subcategoryParam = params.get('subcategory') ?? params.get('child_category_slug');
  const creatorParam = params.get('creator_slug') ?? params.get('designer_slug') ?? params.get('creator') ?? params.get('designer');
  const creatorRecordIdParam = params.get('creator_record_id') ?? params.get('designer_record_id');
  const styleParam = params.get('style_slug') ?? params.get('style');
  const tagParam = params.get('tag_slug') ?? params.get('tag');

  // Query-param filters (user-applied via filter UI)
  const qRaw = params.get('q') ?? params.get('query') ?? params.get('search') ?? '';
  const freeParam = ['1', 'true', 'yes', 'on'].includes((params.get('free_only') ?? '').toLowerCase());
  // Style slugs in the DB are lowercase-hyphenated (slugifySegment), so normalize incoming URL values.
  const styles = params.getAll('styles').flatMap((v) => v.split(',')).filter(Boolean).map(toStyleSlug);
  const tags = params.getAll('tags').flatMap((v) => v.split(',')).filter(Boolean).map(toFilterSlug);
  const types = params.getAll('types').flatMap((v) => v.split(',')).filter(Boolean);

  return {
    q: qRaw.trim(),
    scope: resolvedScopeOverride ?? scope,
    // An explicit query-param filter can override a route/Designer default.
    categoryGroupSlug: categoryParam || categorySlugOverride || (categoryMatch ? categoryMatch[1] : null),
    childCategorySlug: subcategoryParam || (categoryParam ? null : subcategoryMatch ? subcategoryMatch[1] : null),
    creatorSlug: creatorSlugOverride || (designerMatch ? toFilterSlug(designerMatch[1]) : creatorParam ? toFilterSlug(creatorParam) : null),
    creatorRecordId: creatorRecordIdOverride || creatorRecordIdParam || null,
    styleSlug: styleSlugOverride
      ? toFilterSlug(styleSlugOverride)
      : styleMatch
        ? toFilterSlug(styleMatch[1])
        : styleParam
          ? toFilterSlug(styleParam)
          : null,
    tagSlug: tagSlugOverride
      ? toFilterSlug(tagSlugOverride)
      : tagMatch
        ? toFilterSlug(tagMatch[1])
        : tagParam
          ? toFilterSlug(tagParam)
          : null,
    styles,
    tags,
    types,
    freeOnly: freeOnly || freeParam,
    sort: normalizeSort(params.get('sort'), defaultSort),
  };
}

function mergeExternalFilterState(base: FilterState, detail: unknown): FilterState {
  if (!detail || typeof detail !== 'object') return base;
  const patch = detail as Partial<{
    q: unknown;
    categoryGroupSlug: unknown;
    childCategorySlug: unknown;
    creatorSlug: unknown;
    creatorRecordId: unknown;
    styles: unknown;
    tags: unknown;
    types: unknown;
    freeOnly: unknown;
    sort: unknown;
  }>;

  return {
    ...base,
    q: typeof patch.q === 'string' ? patch.q.trim() : base.q,
    categoryGroupSlug:
      typeof patch.categoryGroupSlug === 'string'
        ? patch.categoryGroupSlug.trim() || null
        : patch.categoryGroupSlug === null
          ? null
          : base.categoryGroupSlug,
    childCategorySlug:
      typeof patch.childCategorySlug === 'string'
        ? patch.childCategorySlug.trim() || null
        : patch.childCategorySlug === null
          ? null
          : base.childCategorySlug,
    creatorSlug:
      typeof patch.creatorSlug === 'string'
        ? toFilterSlug(patch.creatorSlug) || null
        : patch.creatorSlug === null
          ? null
          : base.creatorSlug,
    creatorRecordId:
      typeof patch.creatorRecordId === 'string'
        ? patch.creatorRecordId.trim() || null
        : patch.creatorRecordId === null
          ? null
          : base.creatorRecordId,
    styles: Array.isArray(patch.styles) ? patch.styles.filter((value): value is string => typeof value === 'string') : base.styles,
    tags: Array.isArray(patch.tags) ? patch.tags.filter((value): value is string => typeof value === 'string') : base.tags,
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
    a.creatorSlug === b.creatorSlug &&
    a.creatorRecordId === b.creatorRecordId &&
    a.styleSlug === b.styleSlug &&
    a.tagSlug === b.tagSlug &&
    a.freeOnly === b.freeOnly &&
    a.sort === b.sort &&
    areStringArraysEqual(a.styles, b.styles) &&
    areStringArraysEqual(a.tags, b.tags) &&
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
  if (filters.creatorSlug) url.searchParams.set('creator_slug', filters.creatorSlug);
  if (filters.creatorRecordId) url.searchParams.set('creator_record_id', filters.creatorRecordId);
  if (filters.styleSlug) url.searchParams.set('style_slug', toFilterSlug(filters.styleSlug));
  if (filters.tagSlug) url.searchParams.set('tag_slug', toFilterSlug(filters.tagSlug));
  if (filters.freeOnly) url.searchParams.set('free_only', 'true');
  url.searchParams.set('include', 'items');
  url.searchParams.set('view', 'grid');
  url.searchParams.set('sort', filters.sort);
  url.searchParams.set('page', String(page));
  url.searchParams.set('page_size', String(pageSize));
  filters.styles.forEach((v) => url.searchParams.append('styles', v));
  filters.tags.forEach((v) => url.searchParams.append('tags', v));
  filters.types.forEach((v) => url.searchParams.append('types', v));
  return url.toString();
}

function emptyRecommendationFilters(scope: TemplateScope): FilterState {
  return {
    q: '',
    scope,
    categoryGroupSlug: null,
    childCategorySlug: null,
    creatorSlug: null,
    creatorRecordId: null,
    styleSlug: null,
    tagSlug: null,
    styles: [],
    tags: [],
    types: [],
    freeOnly: false,
    sort: 'newest',
  };
}

async function fetchGridResponse(url: string, signal?: AbortSignal): Promise<ApiResponse> {
  const cached = getCachedGridResponse(url);
  if (cached) return cached;

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = (await res.json()) as ApiResponse;
  setCachedGridResponse(url, data);
  return data;
}

function updateUrlParams(filters: FilterState, defaultSort: TemplateSort = 'popular'): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  ['q', 'query', 'search', 'styles', 'tags', 'types', 'free_only', 'sort', 'page'].forEach((k) =>
    url.searchParams.delete(k),
  );
  if (filters.q) url.searchParams.set('q', filters.q);
  if (filters.sort && filters.sort !== defaultSort) url.searchParams.set('sort', filters.sort);
  if (filters.freeOnly && filters.scope !== 'free') url.searchParams.set('free_only', 'true');
  filters.styles.forEach((v) => url.searchParams.append('styles', v));
  filters.tags.forEach((v) => url.searchParams.append('tags', v));
  filters.types.forEach((v) => url.searchParams.append('types', v));
  window.history.replaceState({}, '', url.toString());
}

// ─── Price helper ─────────────────────────────────────────────────────────────

function formatPrice(item: ApiItem): string {
  if (typeof item.price === 'number' && item.price > 0) return `${item.price} USD`;
  if (item.price === 0 || item.is_free) return 'Free';
  return '';
}

function isFreeTemplate(item: ApiItem): boolean {
  if (typeof item.price === 'number') return item.price === 0;
  return item.is_free;
}

function priceNumeric(item: ApiItem): string {
  return typeof item.price === 'number' ? String(item.price) : '';
}

function primaryThumbnailUrl(item: ApiItem): string | null {
  return item.thumbnail_image_url ?? item.thumbnail_image_secondary_url;
}

function firstNamedTerm(terms?: ApiTerm[]): ApiTerm | null {
  return terms?.find((term) => term.name.trim()) ?? null;
}

function toTermLink(term: ApiTerm | null): TemplateCardLink | undefined {
  return term?.url ? { href: term.url } : undefined;
}

function previewTemplateLink(item: ApiItem): TemplateCardLink | undefined {
  if (item.preview_url) return { href: item.preview_url, target: '_blank' };
  if (item.website_url && item.website_url !== item.url) return { href: item.website_url, target: '_blank' };
  return undefined;
}

function featuredBadge(item: ApiItem, enabled: boolean): { badgeText?: string; badgeVariant?: TemplateCardBadge } {
  if (!enabled || !item.is_featured) return {};
  return { badgeText: 'Featured', badgeVariant: 'featured' };
}

function formatCompactNumber(value: number): string {
  if (value >= 1_000_000) return `${Number((value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1))}M`;
  if (value >= 1_000) return `${Number((value / 1_000).toFixed(value >= 10_000 ? 0 : 1))}k`;
  return String(value);
}

function pluralize(value: number, singular: string, plural = `${singular}s`): string {
  return `${formatCompactNumber(value)} ${value === 1 ? singular : plural}`;
}

type MarketplaceSignalDensity = 'full' | 'selective' | 'strict';

function signalDensityForPosition(position: number): MarketplaceSignalDensity {
  if (position <= 12) return 'full';
  if (position <= 24) return 'selective';
  return 'strict';
}

function marketplaceSignals(item: ApiItem, position: number): string[] {
  // The backend field name is historical; the value is a rolling 30-day
  // purchase count, so keep the card labels bucketed instead of implying
  // lifetime proof from exact low counts.
  const purchases = typeof item.cumulative_purchases === 'number' ? item.cumulative_purchases : 0;
  const viewers = typeof item.unique_viewers === 'number' ? item.unique_viewers : 0;
  const popularity = typeof item.popularity_score === 'number' ? item.popularity_score : 0;
  const density = signalDensityForPosition(position);
  const isPopular = popularity >= 5;
  const hasSales = purchases > 0;
  const hasHighViews = viewers >= 5_000;

  if (purchases >= 250) return ['Marketplace favorite', '250+ purchases'];
  if (purchases >= 100) return ['Top seller', '100+ purchases'];
  if (purchases >= 50) return ['Strong seller', '50+ purchases'];
  if (purchases >= 20 && density !== 'strict') return ['Sales momentum', '20+ purchases'];
  if (purchases >= 10 && density === 'full') return ['Recently purchased', '10+ purchases'];
  if (hasSales && isPopular && density === 'full') return ['Recently purchased'];
  if (hasSales && hasHighViews && density === 'full') return ['Buyer interest'];
  if (isPopular && hasHighViews && density !== 'strict') return ['High interest', pluralize(viewers, 'view')];
  if (isPopular && density === 'full') return ['Popular'];
  if (hasHighViews && density === 'full') return [pluralize(viewers, 'view')];
  return [];
}

function isRecentlyPublished(publishedDate: string | null): boolean {
  if (!publishedDate) return false;
  const publishedAt = Date.parse(publishedDate);
  if (Number.isNaN(publishedAt)) return false;
  const age = Date.now() - publishedAt;
  return age >= 0 && age <= NEW_TEMPLATE_WINDOW_DAYS * MS_PER_DAY;
}

function uniqueCreatorCount(items: ApiItem[]): number {
  const creatorKeys = new Set<string>();
  items.forEach((item) => {
    const key = item.creator_profile_url || item.creator_name || item.creator_avatar_url;
    if (key) creatorKeys.add(key);
  });
  return creatorKeys.size;
}

function trackGridHealthEvent(
  data: ApiResponse,
  filters: FilterState,
  append: boolean,
  showMarketplaceSignals: boolean,
  enabled: boolean,
): void {
  const topResult = data.items[0];
  trackMarketplaceEvent(
    'Code Component Event',
    {
      ...getSafeAnalyticsOverrides(),
      component: 'TemplateGrid',
      scope: 'results_rendered',
      append,
      result_count: data.items.length,
      total_items: data.pagination.total_items,
      page: data.pagination.page,
      page_size: data.pagination.page_size,
      has_next_page: data.pagination.has_next_page,
      has_results: data.items.length > 0,
      sort: filters.sort,
      q_present: Boolean(filters.q),
      signal_window: MARKETPLACE_SIGNAL_WINDOW,
      signal_density: 'mixed',
      marketplace_signal_window: MARKETPLACE_SIGNAL_WINDOW,
      styles_count: filters.styles.length,
      tags_count: filters.tags.length,
      types_count: filters.types.length,
      free_only: filters.freeOnly,
      scope_filter: filters.scope,
      category_group_slug: filters.categoryGroupSlug,
      child_category_slug: filters.childCategorySlug,
      creator_slug: filters.creatorSlug,
      creator_record_id_present: Boolean(filters.creatorRecordId),
      style_slug: filters.styleSlug,
      tag_slug: filters.tagSlug,
      marketplace_signals_enabled: showMarketplaceSignals,
      visible_featured_count: data.items.filter((item) => item.is_featured).length,
      visible_free_count: data.items.filter(isFreeTemplate).length,
      visible_new_count: data.items.filter((item) => isRecentlyPublished(item.published_date)).length,
      visible_with_purchases_count: data.items.filter((item) => (item.cumulative_purchases ?? 0) > 0).length,
      visible_with_viewers_count: data.items.filter((item) => (item.unique_viewers ?? 0) > 0).length,
      visible_unique_creators_count: uniqueCreatorCount(data.items),
      top_result_popularity_score: topResult?.popularity_score ?? null,
      client_filter_strict_free: data.client_filter?.strict_free ?? false,
      client_filter_dropped_paid_count: data.client_filter?.dropped_paid_items ?? 0,
      client_filter_source_total_items: data.client_filter?.source_total_items ?? data.pagination.total_items,
    },
    enabled,
  );
}

function normalizeTemplateHref(href: string | null | undefined): string | null {
  if (!href) return null;
  try {
    const url = new URL(href, typeof window !== 'undefined' ? window.location.origin : 'https://webflow.com');
    return `${url.pathname.replace(/\/+$/, '')}${url.search}`;
  } catch {
    return href.replace(/\/+$/, '');
  }
}

export function shouldOpenFeaturedTemplatePreview(options: {
  scope: TemplateScope;
  anchorHref: string | null;
  itemUrl: string | null;
  button: number;
  modified: boolean;
}): boolean {
  return (
    options.scope === 'featured' &&
    options.button === 0 &&
    !options.modified &&
    normalizeTemplateHref(options.anchorHref) === normalizeTemplateHref(options.itemUrl)
  );
}

function isTemplateDetailAnchorClick(event: React.MouseEvent<HTMLDivElement>, itemUrl: string | null): boolean {
  const target = event.target;
  if (!(target instanceof Element)) return false;
  const anchor = target.closest<HTMLAnchorElement>('a[href]');
  if (!anchor) return false;
  return normalizeTemplateHref(anchor.getAttribute('href')) === normalizeTemplateHref(itemUrl);
}

function sourcePathname(): string | null {
  if (typeof window === 'undefined') return null;
  return window.location.pathname || null;
}

function buildTemplateAttribution(
  item: ApiItem,
  filters: FilterState,
  sourcePage: number,
  sourcePosition: number,
  signals: string[],
): TemplateMarketplaceAttribution {
  return {
    version: 1,
    source_component: 'TemplateGrid',
    source_pathname: sourcePathname(),
    source_scope: filters.scope,
    source_sort: filters.sort,
    source_category_group_slug: filters.categoryGroupSlug,
    source_child_category_slug: filters.childCategorySlug,
    source_style_slug: filters.styleSlug,
    source_tag_slug: filters.tagSlug,
    source_free_only: filters.freeOnly,
    source_q_present: Boolean(filters.q),
    source_styles_count: filters.styles.length,
    source_tags_count: filters.tags.length,
    source_types_count: filters.types.length,
    source_page: sourcePage,
    source_position: sourcePosition,
    template_slug: item.template_slug,
    signal_bucket: signals[0] ?? null,
    signal_metric: signals[1] ?? null,
    signal_window: MARKETPLACE_SIGNAL_WINDOW,
    signal_density: signalDensityForPosition(sourcePosition),
    created_at: new Date().toISOString(),
  };
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const GRID_STYLES = `
@keyframes tmgrid-fade-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.tmgrid-item {
  animation: tmgrid-fade-in 320ms ease-out both;
  /* Skip layout/paint for offscreen cards as infinite scroll accumulates items. */
  content-visibility: auto;
  contain-intrinsic-size: auto 420px;
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

/* Flex-based template list; mirrors the native Webflow collection list behavior. */
.tmgrid-grid {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 24px !important;
  width: 100% !important;
  align-items: flex-start !important;
}
.tmgrid-grid > .tmgrid-item {
  /* Avoid calc division syntax here; Designer/Safari can ignore it and stretch items full-width. */
  flex: 0 0 calc(25% - 18px) !important;
  width: calc(25% - 18px) !important;
  max-width: calc(25% - 18px) !important;
  min-width: 0 !important;
  box-sizing: border-box !important;
}
@media (max-width: 991px) {
  .tmgrid-grid > .tmgrid-item {
    flex-basis: calc(33.333333% - 16px) !important;
    width: calc(33.333333% - 16px) !important;
    max-width: calc(33.333333% - 16px) !important;
  }
}
@media (max-width: 767px) {
  .tmgrid-grid > .tmgrid-item {
    flex-basis: calc(50% - 12px) !important;
    width: calc(50% - 12px) !important;
    max-width: calc(50% - 12px) !important;
  }
}
@media (max-width: 479px) {
  .tmgrid-grid > .tmgrid-item {
    flex-basis: 100% !important;
    width: 100% !important;
    max-width: 100% !important;
  }
}
` + TEMPLATE_CARD_STYLES;

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
  emptyBox: {
    width: '100%',
    padding: '56px 24px',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    background: '#fff',
    textAlign: 'center',
  },
  emptyRecovery: {
    width: '100%',
    maxWidth: '680px',
    padding: '28px 0 36px',
    textAlign: 'left',
  },
  emptyTitle: {
    margin: 0,
    color: '#080808',
    fontSize: '22px',
    fontWeight: 600,
    lineHeight: 1.2,
  },
  emptyDescription: {
    maxWidth: '520px',
    margin: '12px 0 0',
    color: '#5f5f5f',
    fontSize: '15px',
    lineHeight: 1.5,
  },
  emptyActions: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '12px',
    marginTop: '22px',
  },
  emptyButton: {
    minHeight: '40px',
    padding: '9px 16px',
    border: '1px solid #d9d9d9',
    borderRadius: '4px',
    background: '#fff',
    color: '#080808',
    cursor: 'pointer',
    font: 'inherit',
    fontSize: '14px',
    fontWeight: 600,
  },
  emptySecondaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '40px',
    padding: '9px 16px',
    border: '1px solid transparent',
    borderRadius: '4px',
    color: '#146ef5',
    cursor: 'pointer',
    font: 'inherit',
    fontSize: '14px',
    fontWeight: 600,
    textDecoration: 'none',
  },
  emptyRecommendations: {
    width: '100%',
    paddingTop: '10px',
  },
  emptyRecommendationsHeader: {
    marginBottom: '18px',
  },
  emptyRecommendationsTitle: {
    margin: 0,
    color: '#080808',
    fontSize: '18px',
    fontWeight: 600,
    lineHeight: 1.25,
  },
  emptyRecommendationsDescription: {
    margin: '6px 0 0',
    color: '#6f6f6f',
    fontSize: '13px',
    lineHeight: 1.4,
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

// ─── Grid item ────────────────────────────────────────────────────────────────

interface TemplateGridItemViewProps {
  item: ApiItem;
  index: number;
  apiBase: string;
  pageSize: number;
  showCategoryMeta: boolean;
  showTemplateType: boolean;
  showPreviewLink: boolean;
  showFeaturedBadge: boolean;
  showMarketplaceSignals: boolean;
  onCardClick: (
    event: React.MouseEvent<HTMLDivElement>,
    item: ApiItem,
    index: number,
    signals: string[],
  ) => void;
}

// Memoized so appended pages and loading-state toggles don't re-render the
// whole accumulated list. Item references are stable across appends; the
// derived object props (links, images, signals) are created inside so the
// parent's shallow compare actually holds.
const TemplateGridItemView = memo<TemplateGridItemViewProps>(({
  item,
  index,
  apiBase,
  pageSize,
  showCategoryMeta,
  showTemplateType,
  showPreviewLink,
  showFeaturedBadge,
  showMarketplaceSignals,
  onCardClick,
}) => {
  const primaryImageUrl = primaryThumbnailUrl(item);
  const primaryCategory = firstNamedTerm(item.category_groups);
  const primarySubcategory = firstNamedTerm(item.child_categories);
  const badgeProps = featuredBadge(item, showFeaturedBadge);
  const position = index + 1;
  const signals = marketplaceSignals(item, position);

  return (
    <div
      className="tmgrid-item"
      style={{ animationDelay: `${Math.min(index % pageSize, 11) * 40}ms` }}
      data-template-slug={item.template_slug}
      onClickCapture={(event) => onCardClick(event, item, index, signals)}
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
        categoryName={primaryCategory?.name}
        categoryLink={toTermLink(primaryCategory)}
        subcategoryName={primarySubcategory?.name}
        subcategoryLink={toTermLink(primarySubcategory)}
        templateType={item.template_type ?? ''}
        previewLink={previewTemplateLink(item)}
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
        priorityIndex={index}
        deferSecondaryImage
        stylesProvided
        approvalDate={item.published_date ?? ''}
        popularityScore={String(item.popularity_score ?? '')}
        showCategoryMeta={showCategoryMeta}
        showTemplateType={showTemplateType}
        showPreviewLink={showPreviewLink}
        showMarketplaceSignals={showMarketplaceSignals}
        marketplaceSignals={signals}
        {...badgeProps}
      />
    </div>
  );
});

TemplateGridItemView.displayName = 'TemplateGridItemView';

// ─── TemplateGrid ─────────────────────────────────────────────────────────────

const TemplateGridInner: React.FC<TemplateGridProps> = ({
  apiBase: apiBaseProp = '',
  categorySlug: categorySlugProp = '',
  creatorSlug: creatorSlugProp = '',
  creatorRecordId: creatorRecordIdProp = '',
  styleSlug: styleSlugProp = '',
  tagSlug: tagSlugProp = '',
  scopeOverride,
  initialSort = 'popular',
  pageSize = DEFAULT_PAGE_SIZE,
  showEmptyState = false,
  emptyTitle = 'No templates found',
  emptyDescription = 'Try a broader search or clear filters to see more templates.',
  emptyActionLabel = 'Clear filters',
  showEmptyRecommendations = true,
  emptyRecommendationsTitle = 'Recently featured templates',
  showCategoryMeta = false,
  showTemplateType = false,
  showPreviewLink = false,
  showFeaturedBadge = false,
  showMarketplaceSignals = false,
  showMcpCampaign = true,
  campaignCoverage = 'all_listings',
  enableAnalytics = true,
}) => {
  useMarketplaceComponentErrorTracking('TemplateGrid', enableAnalytics);

  // Webflow passes defaultValue strings (including '') as actual values, not undefined.
  // Fall back to the relative path whenever the prop is blank.
  // Rewrite any absolute origin that webflow.com's CSP blocks to the relative default:
  //   - Direct Worker URL (always blocked)
  //   - Cloud App preview subdomain (different origin from webflow.com)
  const rawBase = apiBaseProp || DEFAULT_API_BASE;
  const apiBase =
    rawBase.startsWith(WORKER_ORIGIN) ||
    rawBase.startsWith(LEGACY_WORKER_ORIGIN) ||
    rawBase.startsWith(CLOUD_APP_PREVIEW_ORIGIN)
      ? DEFAULT_API_BASE
      : rawBase;
  const resolvedPageSize = pageSize || DEFAULT_PAGE_SIZE;
  // Parse initial filter state from URL on first render
  const [filters, setFilters] = useState<FilterState>(() =>
    parseRouteState(
      initialSort,
      categorySlugProp || undefined,
      scopeOverride,
      styleSlugProp || undefined,
      tagSlugProp || undefined,
      creatorSlugProp || undefined,
      creatorRecordIdProp || undefined,
    ),
  );

  const [items, setItems] = useState<ApiItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalItems, setTotalItems] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emptyRecommendations, setEmptyRecommendations] = useState<ApiItem[]>([]);
  const [emptyRecommendationsTitleState, setEmptyRecommendationsTitleState] = useState(emptyRecommendationsTitle);
  const [emptyRecommendationsLoading, setEmptyRecommendationsLoading] = useState(false);
  const [featuredPreview, setFeaturedPreview] = useState<FeaturedPreviewSession | null>(null);
  const [campaignInsertAfter, setCampaignInsertAfter] = useState<1 | 2 | 3 | 4>(() =>
    typeof window === 'undefined' ? 4 : templateGridColumnCount(window.innerWidth),
  );

  // Publish the resolved filter state (URL + prop overrides) so page-level
  // agent tooling can read what this grid actually shows — the URL alone
  // misses prop-driven constraints like categorySlug or scopeOverride.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    (window as unknown as Record<string, unknown>).__templateMarketplaceGridState = {
      href: window.location.href,
      ...filters,
      updatedAt: Date.now(),
    };
  }, [filters]);

  // Stale-fetch guard: every new filter/sort change increments this
  const fetchEpochRef = useRef(0);
  const activeFetchAbortRef = useRef<AbortController | null>(null);
  const emptyRecommendationsAbortRef = useRef<AbortController | null>(null);
  const featuredPreviewFetchAbortRef = useRef<AbortController | null>(null);
  const featuredPreviewRef = useRef<FeaturedPreviewSession | null>(null);
  const lastHrefRef = useRef(typeof window === 'undefined' ? '' : window.location.href);
  featuredPreviewRef.current = featuredPreview;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncCampaignRow = () => setCampaignInsertAfter(templateGridColumnCount(window.innerWidth));
    syncCampaignRow();
    window.addEventListener('resize', syncCampaignRow);
    return () => window.removeEventListener('resize', syncCampaignRow);
  }, []);

  // Keep Designer prop edits and production URL changes aligned after mount.
  useEffect(() => {
    setFilters((prev) => {
      const next = parseRouteState(
        initialSort,
        categorySlugProp || undefined,
        scopeOverride,
        styleSlugProp || undefined,
        tagSlugProp || undefined,
        creatorSlugProp || undefined,
        creatorRecordIdProp || undefined,
      );
      return areFiltersEqual(prev, next) ? prev : next;
    });
  }, [initialSort, categorySlugProp, creatorSlugProp, creatorRecordIdProp, scopeOverride, styleSlugProp, tagSlugProp]);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchPage = useCallback(
    async (targetPage: number, currentFilters: FilterState, append: boolean) => {
      const epoch = ++fetchEpochRef.current;
      activeFetchAbortRef.current?.abort();
      const controller = new AbortController();
      activeFetchAbortRef.current = controller;
      const url = buildApiUrl(apiBase, currentFilters, targetPage, resolvedPageSize);
      const cached = getCachedGridResponse(url);

      if (cached) {
        if (activeFetchAbortRef.current === controller) activeFetchAbortRef.current = null;
        setError(null);
        setItems((prev) => (append ? [...prev, ...cached.items] : cached.items));
        setPage(cached.pagination.page);
        setHasNextPage(cached.pagination.has_next_page);
        setTotalItems(cached.pagination.total_items);
        trackGridHealthEvent(cached, currentFilters, append, showMarketplaceSignals, enableAnalytics);
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      if (!append) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`API ${res.status}`);
        const data = (await res.json()) as ApiResponse;
        setCachedGridResponse(url, data);

        if (epoch !== fetchEpochRef.current) return;

        setItems((prev) => (append ? [...prev, ...data.items] : data.items));
        setPage(data.pagination.page);
        setHasNextPage(data.pagination.has_next_page);
        setTotalItems(data.pagination.total_items);
        trackGridHealthEvent(data, currentFilters, append, showMarketplaceSignals, enableAnalytics);
      } catch (e) {
        if (controller.signal.aborted) return;
        if (epoch !== fetchEpochRef.current) return;
        setError(e instanceof Error ? e.message : 'Failed to load templates');
      } finally {
        if (activeFetchAbortRef.current === controller) activeFetchAbortRef.current = null;
        if (epoch === fetchEpochRef.current && !controller.signal.aborted) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [apiBase, resolvedPageSize, showMarketplaceSignals, enableAnalytics],
  );

  // Re-fetch from page 1 whenever filters change
  useEffect(() => {
    fetchPage(1, filters, false);
  }, [filters, fetchPage]);

  const rendersComponentEmptyState = showEmptyState || showEmptyRecommendations;

  useEffect(() => {
    if (!showEmptyRecommendations || loading || error || items.length > 0) {
      emptyRecommendationsAbortRef.current?.abort();
      emptyRecommendationsAbortRef.current = null;
      // Functional update keeps the previous (already-empty) array reference so
      // infinite-scroll appends don't schedule a spurious full-grid re-render.
      setEmptyRecommendations((prev) => (prev.length > 0 ? [] : prev));
      setEmptyRecommendationsLoading(false);
      setEmptyRecommendationsTitleState(emptyRecommendationsTitle);
      return;
    }

    const controller = new AbortController();
    emptyRecommendationsAbortRef.current?.abort();
    emptyRecommendationsAbortRef.current = controller;
    setEmptyRecommendations([]);
    setEmptyRecommendationsLoading(true);
    setEmptyRecommendationsTitleState(emptyRecommendationsTitle);

    async function loadEmptyRecommendations() {
      const candidates: Array<{ title: string; filters: FilterState }> = [
        { title: emptyRecommendationsTitle, filters: emptyRecommendationFilters('featured') },
        { title: 'New templates', filters: emptyRecommendationFilters('all') },
      ];

      try {
        for (const candidate of candidates) {
          const url = buildApiUrl(apiBase, candidate.filters, 1, EMPTY_RECOMMENDATION_COUNT);
          const data = await fetchGridResponse(url, controller.signal);
          if (controller.signal.aborted) return;
          if (data.items.length > 0) {
            setEmptyRecommendations(data.items.slice(0, EMPTY_RECOMMENDATION_COUNT));
            setEmptyRecommendationsTitleState(candidate.title);
            return;
          }
        }
      } catch {
        if (!controller.signal.aborted) {
          setEmptyRecommendations([]);
        }
      } finally {
        if (emptyRecommendationsAbortRef.current === controller) {
          emptyRecommendationsAbortRef.current = null;
        }
        if (!controller.signal.aborted) {
          setEmptyRecommendationsLoading(false);
        }
      }
    }

    void loadEmptyRecommendations();
    return () => controller.abort();
  }, [
    apiBase,
    emptyRecommendationsTitle,
    error,
    items.length,
    loading,
    showEmptyRecommendations,
  ]);

  useEffect(() => {
    return () => {
      activeFetchAbortRef.current?.abort();
      emptyRecommendationsAbortRef.current?.abort();
      featuredPreviewFetchAbortRef.current?.abort();
    };
  }, []);

  // ── Infinite scroll ───────────────────────────────────────────────────────
  //
  // Pagination state lives in a ref so the IntersectionObserver is created
  // once per sentinel mount instead of being torn down and recreated on every
  // fetch cycle. Observers only fire on intersection changes, so a
  // post-render check continues loading while the sentinel stays in view.

  const scrollStateRef = useRef({ hasNextPage, loadingMore, loading, error, page, filters });
  const sentinelVisibleRef = useRef(false);
  const loadMoreInFlightRef = useRef(false);
  const sentinelObserverRef = useRef<IntersectionObserver | null>(null);

  const maybeLoadMore = useCallback(() => {
    const state = scrollStateRef.current;
    if (
      !sentinelVisibleRef.current ||
      loadMoreInFlightRef.current ||
      !state.hasNextPage ||
      state.loadingMore ||
      state.loading ||
      state.error
    ) {
      return;
    }
    loadMoreInFlightRef.current = true;
    void fetchPage(state.page + 1, state.filters, true).finally(() => {
      loadMoreInFlightRef.current = false;
    });
  }, [fetchPage]);

  useEffect(() => {
    scrollStateRef.current = { hasNextPage, loadingMore, loading, error, page, filters };
    maybeLoadMore();
  });

  const sentinelRefCallback = useCallback(
    (node: HTMLDivElement | null) => {
      sentinelObserverRef.current?.disconnect();
      sentinelObserverRef.current = null;
      sentinelVisibleRef.current = false;
      if (!node) return;
      const observer = new IntersectionObserver(
        (entries) => {
          sentinelVisibleRef.current = entries[0].isIntersecting;
          maybeLoadMore();
        },
        { rootMargin: '300px' },
      );
      observer.observe(node);
      sentinelObserverRef.current = observer;
    },
    [maybeLoadMore],
  );

  useEffect(() => () => sentinelObserverRef.current?.disconnect(), []);

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
        updateUrlParams(next, initialSort);
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
    const onCategoryFilterUpdated = (event: Event) => {
      const href = window.location.href;
      lastHrefRef.current = href;
      const detail = (event as CustomEvent).detail as
        | { parent?: unknown; category?: unknown; subcategory?: unknown }
        | undefined;
      const hasExplicitCategoryDetail =
        Boolean(detail) &&
        (Object.prototype.hasOwnProperty.call(detail, 'parent') ||
          Object.prototype.hasOwnProperty.call(detail, 'category') ||
          Object.prototype.hasOwnProperty.call(detail, 'subcategory'));
      if (hasExplicitCategoryDetail && detail) {
        const rawCategory = Object.prototype.hasOwnProperty.call(detail, 'category') ? detail.category : detail.parent;
        const rawSubcategory = detail.subcategory;
        setFilters((prev) => {
          const next = {
            ...prev,
            categoryGroupSlug: typeof rawCategory === 'string' && rawCategory.trim() ? rawCategory.trim() : null,
            childCategorySlug: typeof rawSubcategory === 'string' && rawSubcategory.trim() ? rawSubcategory.trim() : null,
          };
          return areFiltersEqual(prev, next) ? prev : next;
        });
        return;
      }
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
            parseRouteState(
              initialSort,
              categorySlugProp || undefined,
              scopeOverride,
              styleSlugProp || undefined,
              tagSlugProp || undefined,
              creatorSlugProp || undefined,
              creatorRecordIdProp || undefined,
            ),
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
    const shouldShow = !rendersComponentEmptyState && !loading && !error && items.length === 0;
    emptyEl.style.display = shouldShow ? '' : 'none';
  }, [loading, error, items.length, rendersComponentEmptyState]);

  // Re-parse from URL on browser back/forward navigation
  useEffect(() => {
    const onPop = () => {
      lastHrefRef.current = window.location.href;
      setFilters(
        parseRouteState(
          initialSort,
          categorySlugProp || undefined,
          scopeOverride,
          styleSlugProp || undefined,
          tagSlugProp || undefined,
          creatorSlugProp || undefined,
          creatorRecordIdProp || undefined,
        ),
      );
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [initialSort, categorySlugProp, creatorSlugProp, creatorRecordIdProp, scopeOverride, styleSlugProp, tagSlugProp]);

  // Re-parse from URL when TemplateFilterBar (code component) updates filter state.
  // TemplateFilterBar writes to URL params then dispatches this event — we just
  // re-read the URL, then merge the event payload so explicit default-sort
  // selections remain distinguishable from "no sort param" URLs.
  useEffect(() => {
    const onFilterBarChange = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      const href = window.location.href;
      lastHrefRef.current = href;
      setFilters((prev) => {
        const next = mergeExternalFilterState(
          parseRouteState(
            initialSort,
            categorySlugProp || undefined,
            scopeOverride,
            styleSlugProp || undefined,
            tagSlugProp || undefined,
            creatorSlugProp || undefined,
            creatorRecordIdProp || undefined,
          ),
          detail ?? readSharedFilterState(href),
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
  }, [initialSort, categorySlugProp, creatorSlugProp, creatorRecordIdProp, scopeOverride, styleSlugProp, tagSlugProp]);

  // replaceState() does not fire popstate. Poll the URL as a low-cost fallback
  // so the grid still refreshes if Webflow isolates or drops the custom event.
  useEffect(() => {
    const id = window.setInterval(() => {
      // Skip work entirely while the tab is hidden; the first visible tick
      // catches up on any URL change that happened in the background.
      if (document.visibilityState === 'hidden') return;
      const href = window.location.href;
      if (href === lastHrefRef.current) return;
      lastHrefRef.current = href;
      setFilters((prev) => {
        const next = mergeExternalFilterState(
          parseRouteState(
            initialSort,
            categorySlugProp || undefined,
            scopeOverride,
            styleSlugProp || undefined,
            tagSlugProp || undefined,
            creatorSlugProp || undefined,
            creatorRecordIdProp || undefined,
          ),
          readSharedFilterState(href),
        );
        return areFiltersEqual(prev, next) ? prev : next;
      });
    }, 250);
    return () => window.clearInterval(id);
  }, [initialSort, categorySlugProp, creatorSlugProp, creatorRecordIdProp, scopeOverride, styleSlugProp, tagSlugProp]);

  const clearFilters = useCallback(() => {
    const next: FilterState = {
      ...filters,
      q: '',
      styles: [],
      tags: [],
      types: [],
      freeOnly: filters.scope === 'free',
      sort: initialSort,
    };
    updateUrlParams(next, initialSort);

    if (typeof window !== 'undefined') {
      const detail = {
        q: next.q,
        styles: [...next.styles],
        tags: [...next.tags],
        types: [...next.types],
        freeOnly: next.freeOnly,
        sort: next.sort,
        href: window.location.href,
        source: 'TemplateGrid',
        updatedAt: Date.now(),
      };
      (window as unknown as Record<string, unknown>).__templateMarketplaceFilters = detail;
      window.dispatchEvent(new CustomEvent('templateFiltersChanged', { detail }));
      document.dispatchEvent(new CustomEvent('templateFiltersChanged', { detail }));
    }

    setFilters(next);
  }, [filters, initialSort]);

  const closeFeaturedPreview = useCallback(() => {
    featuredPreviewFetchAbortRef.current?.abort();
    featuredPreviewFetchAbortRef.current = null;
    featuredPreviewRef.current = null;
    setFeaturedPreview((current) => {
      if (current) {
        const item = current.items[current.index];
        trackMarketplaceEvent(
          'Code Component Event',
          {
            ...getSafeAnalyticsOverrides(),
            component: 'TemplateGrid',
            scope: 'featured_preview_closed',
            template_slug: item?.template_slug ?? null,
            source_position: current.index + 1,
          },
          enableAnalytics,
        );
      }
      return null;
    });
  }, [enableAnalytics]);

  const fetchFeaturedPreviewPage = useCallback(
    async (targetPage: number, currentFilters: FilterState): Promise<ApiResponse | null> => {
      featuredPreviewFetchAbortRef.current?.abort();
      const controller = new AbortController();
      featuredPreviewFetchAbortRef.current = controller;
      const url = buildApiUrl(apiBase, currentFilters, targetPage, resolvedPageSize);
      const cached = getCachedGridResponse(url);
      if (cached) {
        if (featuredPreviewFetchAbortRef.current === controller) featuredPreviewFetchAbortRef.current = null;
        return cached;
      }

      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`API ${response.status}`);
        const data = (await response.json()) as ApiResponse;
        setCachedGridResponse(url, data);
        return controller.signal.aborted ? null : data;
      } catch {
        return null;
      } finally {
        if (featuredPreviewFetchAbortRef.current === controller) featuredPreviewFetchAbortRef.current = null;
      }
    },
    [apiBase, resolvedPageSize],
  );

  const navigateFeaturedPreview = useCallback(
    async (direction: -1 | 1) => {
      const current = featuredPreviewRef.current;
      if (!current || current.loadingNext) return;

      const intent = resolveFeaturedPreviewNavigation(
        current.index,
        current.items.length,
        current.hasNextPage,
        direction,
      );
      if (intent.kind === 'move') {
        const nextIndex = intent.index;
        const next = { ...current, index: nextIndex, navigationError: null };
        featuredPreviewRef.current = next;
        setFeaturedPreview(next);
        const item = next.items[nextIndex];
        trackMarketplaceEvent(
          'Code Component Event',
          {
            ...getSafeAnalyticsOverrides(),
            component: 'TemplateGrid',
            scope: 'featured_preview_navigated',
            navigation_direction: direction === 1 ? 'next' : 'previous',
            template_slug: item.template_slug,
            source_position: nextIndex + 1,
          },
          enableAnalytics,
        );
        return;
      }

      if (intent.kind !== 'load-next') return;

      const loadingSession = { ...current, loadingNext: true, navigationError: null };
      featuredPreviewRef.current = loadingSession;
      setFeaturedPreview(loadingSession);
      const data = await fetchFeaturedPreviewPage(current.page + 1, current.filters);
      if (featuredPreviewRef.current !== loadingSession) return;
      if (!data) {
        const failedSession = {
          ...loadingSession,
          loadingNext: false,
          navigationError: 'Unable to load more Featured templates.',
        };
        featuredPreviewRef.current = failedSession;
        setFeaturedPreview(failedSession);
        trackMarketplaceEvent(
          'Code Component Event',
          {
            ...getSafeAnalyticsOverrides(),
            component: 'TemplateGrid',
            scope: 'featured_preview_next_page_failed',
            failed_page: current.page + 1,
          },
          enableAnalytics,
        );
        return;
      }

      const appendedItems = appendUniqueFeaturedPreviewItems(current.items, data.items);
      const appendedIndex = current.index + 1;
      const nextSession: FeaturedPreviewSession = {
        ...current,
        items: appendedItems,
        index: Math.min(appendedIndex, appendedItems.length - 1),
        page: data.pagination.page,
        hasNextPage: data.pagination.has_next_page,
        total: data.pagination.total_items,
        loadingNext: false,
        navigationError: null,
      };
      featuredPreviewRef.current = nextSession;
      setFeaturedPreview(nextSession);

      const item = nextSession.items[nextSession.index];
      if (item && nextSession.index > current.index) {
        trackMarketplaceEvent(
          'Code Component Event',
          {
            ...getSafeAnalyticsOverrides(),
            component: 'TemplateGrid',
            scope: 'featured_preview_navigated',
            navigation_direction: 'next',
            template_slug: item.template_slug,
            source_position: nextSession.index + 1,
            loaded_page_boundary: true,
          },
          enableAnalytics,
        );
      }
    },
    [enableAnalytics, fetchFeaturedPreviewPage],
  );

  const handleTemplateCardClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>, item: ApiItem, index: number, signals: string[]) => {
      if (!isTemplateDetailAnchorClick(event, item.url)) return;

      const sourcePosition = index + 1;
      const sourcePage = Math.floor(index / resolvedPageSize) + 1;
      const attribution = buildTemplateAttribution(item, filters, sourcePage, sourcePosition, signals);
      writeTemplateAttribution(attribution);

      trackMarketplaceEvent(
        'Code Component Event',
        {
          ...getSafeAnalyticsOverrides(),
          component: 'TemplateGrid',
          scope: 'template_card_clicked',
          source_scope: filters.scope,
          source_sort: filters.sort,
          source_category_group_slug: filters.categoryGroupSlug,
          source_child_category_slug: filters.childCategorySlug,
          source_style_slug: filters.styleSlug,
          source_tag_slug: filters.tagSlug,
          source_free_only: filters.freeOnly,
          source_q_present: Boolean(filters.q),
          source_styles_count: filters.styles.length,
          source_tags_count: filters.tags.length,
          source_types_count: filters.types.length,
          source_page: sourcePage,
          source_position: sourcePosition,
          template_slug: item.template_slug,
          signal_bucket: signals[0] ?? null,
          signal_metric: signals[1] ?? null,
          signal_window: MARKETPLACE_SIGNAL_WINDOW,
          signal_density: signalDensityForPosition(sourcePosition),
        },
        enableAnalytics,
      );

      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest<HTMLAnchorElement>('a[href]');
      const shouldOpenPreview = shouldOpenFeaturedTemplatePreview({
        scope: filters.scope,
        anchorHref: anchor?.getAttribute('href') ?? null,
        itemUrl: item.url,
        button: event.button,
        modified: event.metaKey || event.ctrlKey || event.shiftKey || event.altKey,
      });
      if (!shouldOpenPreview) return;

      event.preventDefault();
      const nextPreviewSession: FeaturedPreviewSession = {
        items: [...items],
        index,
        page,
        hasNextPage,
        total: totalItems ?? items.length,
        filters: {
          ...filters,
          styles: [...filters.styles],
          tags: [...filters.tags],
          types: [...filters.types],
        },
        loadingNext: false,
        navigationError: null,
      };
      featuredPreviewRef.current = nextPreviewSession;
      setFeaturedPreview(nextPreviewSession);
      trackMarketplaceEvent(
        'Code Component Event',
        {
          ...getSafeAnalyticsOverrides(),
          component: 'TemplateGrid',
          scope: 'featured_preview_opened',
          template_slug: item.template_slug,
          source_position: sourcePosition,
          reviewer_pick_reason_present: Boolean(item.reviewer_pick_reason?.trim()),
          direct_purchase_present: Boolean(item.purchase_url),
        },
        enableAnalytics,
      );
    },
    [enableAnalytics, filters, hasNextPage, items, page, resolvedPageSize, totalItems],
  );

  const renderTemplateGridItem = (item: ApiItem, i: number, keyPrefix = 'result') => (
    <TemplateGridItemView
      key={`${keyPrefix}-${item.id}`}
      item={item}
      index={i}
      apiBase={apiBase}
      pageSize={resolvedPageSize}
      showCategoryMeta={showCategoryMeta}
      showTemplateType={showTemplateType}
      showPreviewLink={showPreviewLink}
      showFeaturedBadge={showFeaturedBadge}
      showMarketplaceSignals={showMarketplaceSignals}
      onCardClick={handleTemplateCardClick}
    />
  );

  const activeFeaturedPreviewItem = featuredPreview?.items[featuredPreview.index] ?? null;
  const featuredPreviewOverlay = featuredPreview && activeFeaturedPreviewItem ? (
    <FeaturedTemplatePreview
      item={activeFeaturedPreviewItem}
      index={featuredPreview.index}
      total={featuredPreview.total}
      hasPrevious={featuredPreview.index > 0}
      hasNext={featuredPreview.index < featuredPreview.items.length - 1 || featuredPreview.hasNextPage}
      loadingNext={featuredPreview.loadingNext}
      navigationError={featuredPreview.navigationError}
      onClose={closeFeaturedPreview}
      onNavigate={navigateFeaturedPreview}
      onPrimaryAction={() => {
        trackMarketplaceEvent(
          'Code Component Event',
          {
            ...getSafeAnalyticsOverrides(),
            component: 'TemplateGrid',
            scope: 'featured_preview_primary_action_clicked',
            template_slug: activeFeaturedPreviewItem.template_slug,
            direct_purchase: Boolean(activeFeaturedPreviewItem.purchase_url),
          },
          enableAnalytics,
        );
      }}
      onOpenSite={() => {
        trackMarketplaceEvent(
          'Code Component Event',
          {
            ...getSafeAnalyticsOverrides(),
            component: 'TemplateGrid',
            scope: 'featured_preview_site_opened',
            template_slug: activeFeaturedPreviewItem.template_slug,
          },
          enableAnalytics,
        );
      }}
    />
  ) : null;

  const withFeaturedPreview = (content: React.ReactNode) => (
    <>
      {content}
      {featuredPreviewOverlay}
    </>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading && items.length === 0) {
    return withFeaturedPreview(
      <div style={S.root} data-marketplace-component="template-grid">
        <style dangerouslySetInnerHTML={{ __html: GRID_STYLES }} />
        <div className="tmgrid-grid">
          {Array.from({ length: Math.min(resolvedPageSize, 12) }).map((_, i) => (
            <SkeletonCard key={i} index={i} />
          ))}
        </div>
      </div>,
    );
  }

  if (error && items.length === 0) {
    return withFeaturedPreview(
      <div style={S.root} data-marketplace-component="template-grid">
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
      </div>,
    );
  }

  // When no component empty state is enabled, let the native
  // [fs-cmsfilter-element="empty"] element handle zero-result rendering.
  if (items.length === 0) {
    if (!rendersComponentEmptyState) {
      // Keep a persistent marker so page-level agents can still detect the
      // mounted, filter-aware grid while the native empty element renders.
      return withFeaturedPreview(<div hidden data-marketplace-component="template-grid" />);
    }
    const query = filters.q.trim();
    const resolvedEmptyTitle = query ? `No templates found for "${query}"` : emptyTitle;
    const resolvedEmptyDescription = query
      ? 'Try a shorter search term, remove filters, or start from these recent templates.'
      : emptyDescription;

    return withFeaturedPreview(
      <div style={S.root} data-marketplace-component="template-grid">
        <style dangerouslySetInnerHTML={{ __html: GRID_STYLES }} />
        <div style={S.emptyRecovery} role="status">
          <p style={S.emptyTitle}>{resolvedEmptyTitle}</p>
          <p style={S.emptyDescription}>{resolvedEmptyDescription}</p>
          <div style={S.emptyActions}>
            <button type="button" style={S.emptyButton} onClick={clearFilters}>
              {emptyActionLabel}
            </button>
            <a href="/templates/all" style={S.emptySecondaryButton}>
              Browse all templates
            </a>
          </div>
        </div>

        {(emptyRecommendationsLoading || emptyRecommendations.length > 0) && (
          <div style={S.emptyRecommendations} data-template-grid-section="empty-recommendations">
            <div style={S.emptyRecommendationsHeader}>
              <p style={S.emptyRecommendationsTitle}>{emptyRecommendationsTitleState}</p>
              <p style={S.emptyRecommendationsDescription}>Fresh starting points while you refine the search.</p>
            </div>
            <div className="tmgrid-grid">
              {emptyRecommendationsLoading && emptyRecommendations.length === 0
                ? Array.from({ length: EMPTY_RECOMMENDATION_COUNT }).map((_, i) => <SkeletonCard key={`empty-skeleton-${i}`} index={i} />)
                : emptyRecommendations.map((item, i) => renderTemplateGridItem(item, i, 'empty-recommendation'))}
            </div>
          </div>
        )}
      </div>,
    );
  }

  const isRefreshing = loading && items.length > 0;
  const shouldShowMcpCampaign = shouldShowTemplateGridCampaign({
    enabled: showMcpCampaign,
    coverage: campaignCoverage,
    query: filters.q,
    scope: filters.scope,
    categoryGroupSlug: filters.categoryGroupSlug,
    childCategorySlug: filters.childCategorySlug,
    creatorSlug: filters.creatorSlug,
    styleSlug: filters.styleSlug,
    tagSlug: filters.tagSlug,
    styles: filters.styles,
    tags: filters.tags,
    types: filters.types,
    freeOnly: filters.freeOnly,
  });
  const displayItems = buildTemplateGridDisplayItems(items, campaignInsertAfter, shouldShowMcpCampaign);

  return withFeaturedPreview(
    <div style={S.root} data-marketplace-component="template-grid" aria-busy={isRefreshing ? true : undefined}>
      <style dangerouslySetInnerHTML={{ __html: GRID_STYLES }} />
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
        <div className="tmgrid-grid">
          {displayItems.map((displayItem) =>
            displayItem.kind === 'campaign'
              ? <TemplateCampaignLane key={displayItem.campaignId} enableAnalytics={enableAnalytics} />
              : renderTemplateGridItem(displayItem.item, displayItem.sourceIndex),
          )}
        </div>
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRefCallback} style={{ height: 1 }} aria-hidden="true" />

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
    </div>,
  );
};

export const TemplateGrid: React.FC<TemplateGridProps> = (props) => (
  <MarketplaceComponentErrorBoundary component="TemplateGrid" enabled={props.enableAnalytics}>
    <TemplateGridInner {...props} />
  </MarketplaceComponentErrorBoundary>
);

export default TemplateGrid;
