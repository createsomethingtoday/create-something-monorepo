/**
 * WebMCP tools for the Template Marketplace search and discovery experience.
 *
 * A page-level registrar (see MarketplaceAgentTools.tsx) exposes these tools to
 * in-browser agents via the proposed WebMCP API (`navigator.modelContext` /
 * `document.modelContext`) so agents like ChatGPT's built-in browser drive the
 * marketplace through structured calls instead of scraping shadow-DOM grids.
 *
 * Read tools call the same public search endpoint the grid/filter components
 * use. The one write tool (`update_page_filters`) goes through the exact
 * page-action contract TemplateChat already uses — URL params +
 * `templateFiltersChanged` — so the agent changes the page the user is looking
 * at, with the same pulse/highlight affordances.
 *
 * Data boundary: tool output maps raw sales counts to a coarse demand tier,
 * mirroring the chat agent's `demandTier` policy — what the model does not
 * have, it cannot leak.
 */
import {
  applyPageAction,
  normalizePageActionPayload,
  pageActionChangesFilters,
  pageHasTemplateGrid,
  type PageActionTimers,
} from '../chat/templateChatPageAction';
import {
  createHighlightMissState,
  discoverOpenRoots,
  queryDiscoveredRoots,
} from '../chat/templateChatRuntime';
import type { PageActionPayload } from '../chat/templateChatProtocol';
import {
  TEMPLATE_SORT_OPTIONS,
  normalizeTemplateSort,
  parseTemplateRoute,
  type TemplateRouteState,
} from './templateRoute';

export const MARKETPLACE_AGENT_TOOLS_VERSION = '2026-08-31.1';

// Same default + rewrite guard as the sibling marketplace components:
// webflow.com's CSP is `connect-src https://*.webflow.com`, so direct worker
// or staging bases are rewritten back to the production proxy.
export const DEFAULT_TEMPLATE_API_BASE = 'https://templates.webflow.com/templates-api';
const BLOCKED_API_BASE =
  /webflow-template-search\.createsomething\.workers\.dev|webflow-template-marketplace\.webflow\.io/;

export function resolveAgentToolsApiBase(raw?: string | null): string {
  const trimmed = (raw ?? '').trim().replace(/\/+$/, '');
  if (!trimmed || BLOCKED_API_BASE.test(trimmed)) return DEFAULT_TEMPLATE_API_BASE;
  return trimmed;
}

// ── Search endpoint contract (verified against the deployed worker 2026-08-31) ──
// The deployed worker ignores capability filters (features/has_ecommerce/…),
// so the tool schemas deliberately do not advertise them.

export interface AgentSearchInput {
  q?: string;
  scope?: string;
  category_group_slug?: string;
  child_category_slug?: string;
  styles?: string[];
  tags?: string[];
  types?: string[];
  free_only?: boolean;
  sort?: string;
  page?: number;
  page_size?: number;
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), min), max);
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => String(entry).trim()).filter(Boolean);
}

/** Pure URL mapping so every parameter path is testable without a browser. */
export function buildAgentSearchUrl(
  base: string,
  input: AgentSearchInput,
  view: 'grid' | 'full' = 'full',
  include = 'items',
): string {
  // The base includes a path segment (`/templates-api`), so concatenate rather
  // than resolving with `new URL(path, base)`, which would drop the segment.
  const url = new URL(`${base.replace(/\/+$/, '')}/api/templates/search`);
  url.searchParams.set('include', include);
  url.searchParams.set('view', view);
  url.searchParams.set('page', String(clampInt(input.page, 1, 500, 1)));
  url.searchParams.set('page_size', String(clampInt(input.page_size, 1, 24, 12)));
  if (input.q?.trim()) url.searchParams.set('q', input.q.trim());
  if (input.scope?.trim()) url.searchParams.set('scope', input.scope.trim());
  if (input.category_group_slug?.trim()) {
    url.searchParams.set('category_group_slug', input.category_group_slug.trim());
  }
  if (input.child_category_slug?.trim()) {
    url.searchParams.set('child_category_slug', input.child_category_slug.trim());
  }
  for (const style of stringList(input.styles)) url.searchParams.append('styles', style);
  for (const tag of stringList(input.tags)) url.searchParams.append('tags', tag);
  for (const type of stringList(input.types)) url.searchParams.append('types', type);
  if (input.free_only) url.searchParams.set('free_only', 'true');
  if (input.sort?.trim()) url.searchParams.set('sort', normalizeTemplateSort(input.sort));
  return url.toString();
}

// ── Response shapes (subset of the worker's public contract) ─────────────────

interface SearchApiNamedRef {
  name?: string;
  slug?: string;
}

interface SearchApiItem {
  template_slug?: string;
  name?: string;
  url?: string;
  preview_url?: string;
  website_url?: string;
  purchase_url?: string;
  creator_name?: string;
  creator_slug?: string;
  price?: number | null;
  is_free?: boolean;
  is_featured?: boolean;
  reviewer_pick_reason?: string | null;
  template_type?: string | null;
  cumulative_purchases?: number | null;
  published_date?: string | null;
  category_groups?: SearchApiNamedRef[];
  child_categories?: SearchApiNamedRef[];
  styles?: Array<string | SearchApiNamedRef>;
  tags?: Array<string | SearchApiNamedRef>;
}

interface SearchApiPill {
  name?: string;
  slug?: string;
  count?: number;
  active?: boolean;
}

interface SearchApiResponse {
  items?: SearchApiItem[];
  pagination?: {
    page?: number;
    page_size?: number;
    total_items?: number;
    total_pages?: number;
    has_next_page?: boolean;
  };
  applied_filters?: { relaxed?: boolean };
  available_facets?: {
    styles?: Array<{ name?: string; slug?: string; count?: number }>;
    types?: Array<{ value?: string; count?: number }>;
  };
  category_pills?: SearchApiPill[];
  subcategory_pills?: SearchApiPill[];
}

/**
 * Coarse demand signal instead of raw sales counts — same thresholds and same
 * data boundary as the marketplace chat agent.
 */
export function demandTier(purchases: number | null | undefined): string | null {
  if (purchases == null) return null;
  if (purchases >= 500) return 'top seller';
  if (purchases >= 100) return 'strong demand';
  if (purchases >= 25) return 'steady demand';
  if (purchases >= 1) return 'emerging';
  return 'new';
}

function namedList(entries: Array<string | SearchApiNamedRef> | undefined): string[] {
  if (!Array.isArray(entries)) return [];
  return entries
    .map((entry) => (typeof entry === 'string' ? entry : entry.name || entry.slug || ''))
    .filter(Boolean);
}

export function summarizeSearchItem(item: SearchApiItem): Record<string, unknown> {
  return {
    template_slug: item.template_slug ?? null,
    name: item.name ?? null,
    creator: item.creator_name ?? null,
    price: item.is_free ? 'Free' : item.price != null ? `$${item.price}` : null,
    template_type: item.template_type ?? null,
    categories: (item.category_groups ?? []).map((group) => group.name).filter(Boolean),
    subcategories: (item.child_categories ?? []).map((child) => child.name).filter(Boolean),
    styles: namedList(item.styles),
    tags: namedList(item.tags),
    demand: demandTier(item.cumulative_purchases),
    published_date: item.published_date ?? null,
    url: item.url ?? null,
    preview_url: item.preview_url ?? null,
  };
}

// ── Tool + registration types ────────────────────────────────────────────────

export interface MarketplaceAgentTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: { readOnlyHint: boolean };
  execute: (input: Record<string, unknown>) => Promise<unknown>;
}

export interface WebMcpToolResult {
  content: Array<{ type: 'text'; text: string }>;
}

export interface MarketplaceAgentToolsOptions {
  apiBase?: string;
  /** Register the page-mutating `update_page_filters` tool. Default true. */
  enablePageActions?: boolean;
  /** Injectable for tests; defaults to the global fetch. */
  fetchImpl?: typeof fetch;
  /** Telemetry hook invoked after every tool execution. */
  onToolCall?: (info: { tool: string; ok: boolean; durationMs: number }) => void;
  fetchTimeoutMs?: number;
}

const CACHE_TTL_MS = 5 * 60_000;
const CACHE_MAX_ENTRIES = 50;
const DEFAULT_FETCH_TIMEOUT_MS = 10_000;
const MAX_VISIBLE_SLUGS = 48;

const SORT_ENUM = TEMPLATE_SORT_OPTIONS.map((option) => option.value);
const SCOPE_ENUM = ['all', 'featured', 'free', 'landing_pages'];
const TYPE_ENUM = ['One Page', 'Multi Page', 'Multi Layout'];

const SEARCH_INPUT_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    q: {
      type: 'string',
      description:
        'Free-text search across template names, descriptions, categories, styles, tags, and creator names.',
    },
    scope: { type: 'string', enum: SCOPE_ENUM },
    category_group_slug: {
      type: 'string',
      description: "Category slug from list_categories_and_styles (e.g. 'business').",
    },
    child_category_slug: { type: 'string', description: 'Subcategory slug within a category.' },
    styles: { type: 'array', items: { type: 'string' }, description: 'Style slugs.' },
    // No `tags` filter: tag slugs are not discoverable through the public
    // facets, so advertising the parameter would invite guessed slugs and
    // silently wrong results.
    types: { type: 'array', items: { type: 'string', enum: TYPE_ENUM } },
    free_only: { type: 'boolean' },
    sort: { type: 'string', enum: SORT_ENUM },
    page: { type: 'integer', minimum: 1, maximum: 500 },
    page_size: { type: 'integer', minimum: 1, maximum: 24 },
  },
};

const UPDATE_PAGE_INPUT_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    q: { type: 'string', description: 'Search text to apply to the visible grid.' },
    category_group_slug: { type: 'string', description: 'Category slug to filter the page to.' },
    styles: { type: 'array', items: { type: 'string' } },
    types: { type: 'array', items: { type: 'string', enum: TYPE_ENUM } },
    free_only: { type: 'boolean' },
    sort: { type: 'string', enum: SORT_ENUM },
    clear_filters: {
      type: 'boolean',
      description: 'Clear all existing filters before applying the ones in this call.',
    },
    highlight_slugs: {
      type: 'array',
      items: { type: 'string' },
      description: 'Template slugs to visually highlight in the grid after the change.',
    },
  },
};

// Markers rendered only by the filter-aware grid experiences (TemplateGrid,
// TemplateSearchPage) — deliberately excludes bare [data-template-slug], which
// editorial carousels also render without listening for templateFiltersChanged.
// The data attribute persists across the grid's loading/empty/error branches;
// the class markers cover pages still running older grid bundles.
const FILTER_AWARE_GRID_SELECTOR =
  '[data-marketplace-component="template-grid"], .tmgrid-grid, .tmgrid-item, .tmsearch-page';
// The grid puts data-template-slug on the .tmgrid-item element itself
// (TemplateGrid card markup); the descendant form covers nested variants.
const GRID_SCOPED_SLUG_SELECTOR =
  '.tmgrid-item[data-template-slug], .tmgrid-grid [data-template-slug]';

function pageHasFilterAwareGrid(): boolean {
  if (typeof document === 'undefined') return false;
  const roots = discoverOpenRoots(document);
  return queryDiscoveredRoots(roots, FILTER_AWARE_GRID_SELECTOR).length > 0;
}

/** Filters the current route derives from its pathname; clearing query params cannot remove them. */
function routeOwnedFilters(href: string): string[] {
  const owned: string[] = [];
  // Designer routes are not a TemplatePathKind (parseTemplateRoute reports
  // 'auto'), but the grid derives a creator filter from the pathname there.
  try {
    const designer = new URL(href).pathname.match(/^\/templates\/designers\/([^/]+)\/?$/);
    if (designer?.[1]) owned.push(`creator:${designer[1]}`);
  } catch {
    // Unparseable href: fall through to route parsing below.
  }
  const route: TemplateRouteState = parseTemplateRoute({ href });
  switch (route.pathKind) {
    case 'category':
      if (route.categoryGroupSlug) owned.push(`category:${route.categoryGroupSlug}`);
      break;
    case 'subcategory':
      if (route.childCategorySlug) owned.push(`subcategory:${route.childCategorySlug}`);
      break;
    case 'style':
      if (route.styleSlug) owned.push(`style:${route.styleSlug}`);
      break;
    case 'tag':
      if (route.tagSlug) owned.push(`tag:${route.tagSlug}`);
      break;
    case 'featured':
    case 'free':
    case 'landing_pages':
      owned.push(`scope:${route.pathKind}`);
      break;
    default:
      break;
  }
  return owned;
}

/**
 * Constraints a mounted grid resolved from its own props (scopeOverride,
 * styleSlug, tagSlug, creatorSlug, categorySlug) rather than the URL — a
 * clear_filters call cannot remove these, so they must be reported as
 * preserved. Detected by comparing the grid-published resolved state against
 * what the current URL alone would produce.
 */
/** The grid-published resolved state, only when it matches the current URL. */
function currentGridState(win: Window): Record<string, unknown> | null {
  const state = (win as unknown as Record<string, unknown>).__templateMarketplaceGridState as
    | Record<string, unknown>
    | undefined;
  return state && state.href === win.location.href ? state : null;
}

function componentOwnedFilters(win: Window, already: string[]): string[] {
  const state = currentGridState(win);
  if (!state) return [];
  let params: URLSearchParams;
  try {
    params = new URL(win.location.href).searchParams;
  } catch {
    return [];
  }
  const route = parseTemplateRoute({ href: win.location.href });
  const owned: string[] = [];
  const push = (entry: string) => {
    if (!already.includes(entry) && !owned.includes(entry)) owned.push(entry);
  };
  if (
    typeof state.scope === 'string' &&
    state.scope !== 'all' &&
    route.scope === 'all' &&
    !params.get('scope')
  ) {
    push(`scope:${state.scope}`);
  }
  if (typeof state.styleSlug === 'string' && state.styleSlug && !route.styleSlug) {
    push(`style:${state.styleSlug}`);
  }
  if (typeof state.tagSlug === 'string' && state.tagSlug && !route.tagSlug) {
    push(`tag:${state.tagSlug}`);
  }
  if (typeof state.creatorSlug === 'string' && state.creatorSlug) {
    push(`creator:${state.creatorSlug}`);
  }
  if (typeof state.creatorRecordId === 'string' && state.creatorRecordId) {
    push(`creator_record_id:${state.creatorRecordId}`);
  }
  if (
    typeof state.categoryGroupSlug === 'string' &&
    state.categoryGroupSlug &&
    !route.categoryGroupSlug &&
    !params.get('category')
  ) {
    push(`category:${state.categoryGroupSlug}`);
  }
  return owned;
}

/**
 * Copy resolved page state the dispatched detail would otherwise lose into
 * query params before an action: route-derived category/subcategory (the
 * detail's nulls read as explicit clears) and the grid's non-default sort
 * (buildFilterChangeDetail defaults a missing sort param to 'popular').
 */
function preserveResolvedPageParams(win: Window, payload: PageActionPayload): void {
  try {
    const url = new URL(win.location.href);
    const route = parseTemplateRoute({ href: url.toString() });
    let mutated = false;
    if (payload.category_group_slug == null) {
      if (route.categoryGroupSlug && route.categoryIsRoute && !url.searchParams.get('category')) {
        url.searchParams.set('category', route.categoryGroupSlug);
        mutated = true;
      }
      if (
        route.childCategorySlug &&
        route.childCategoryIsRoute &&
        !url.searchParams.get('subcategory')
      ) {
        url.searchParams.set('subcategory', route.childCategorySlug);
        mutated = true;
      }
    }
    if (payload.sort == null && !url.searchParams.get('sort')) {
      const gridSort = currentGridState(win)?.sort;
      if (typeof gridSort === 'string' && gridSort && gridSort !== 'popular') {
        url.searchParams.set('sort', gridSort);
        mutated = true;
      }
    }
    if (mutated) win.history.replaceState({}, '', url.toString());
  } catch {
    // Unparseable href: leave the URL untouched.
  }
}

function sanitizePageActionInput(input: Record<string, unknown>): PageActionPayload {
  const payload: PageActionPayload = {};
  if (typeof input.q === 'string') payload.q = input.q;
  if (typeof input.category_group_slug === 'string') {
    payload.category_group_slug = input.category_group_slug;
  }
  if (Array.isArray(input.styles)) payload.styles = stringList(input.styles);
  if (Array.isArray(input.types)) payload.types = stringList(input.types);
  if (typeof input.free_only === 'boolean') payload.free_only = input.free_only;
  if (typeof input.sort === 'string' && input.sort.trim()) {
    payload.sort = normalizeTemplateSort(input.sort);
  }
  // clear_filters: false is a no-op the page-action contract ignores; keeping
  // it would let a {clear_filters: false}-only call claim success.
  if (input.clear_filters === true) payload.clear_filters = true;
  const highlights = stringList(input.highlight_slugs);
  if (highlights.length > 0) payload.highlight_slugs = highlights;
  return payload;
}

// ── Tool factory ─────────────────────────────────────────────────────────────

export function createMarketplaceAgentTools(
  options: MarketplaceAgentToolsOptions = {},
): MarketplaceAgentTool[] {
  const apiBase = resolveAgentToolsApiBase(options.apiBase);
  const enablePageActions = options.enablePageActions !== false;
  const fetchTimeoutMs = options.fetchTimeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;

  // The production proxy strips the worker's public cache headers, so keep the
  // same in-memory response cache the grid uses: full URL key, 5 min TTL.
  const cache = new Map<string, { at: number; body: SearchApiResponse }>();

  async function fetchSearch(url: string): Promise<SearchApiResponse> {
    const cached = cache.get(url);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.body;

    const fetchImpl = options.fetchImpl ?? fetch;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), fetchTimeoutMs);
    try {
      const response = await fetchImpl(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error(`Template search request failed (HTTP ${response.status}).`);
      const body = (await response.json()) as SearchApiResponse;
      if (cache.size >= CACHE_MAX_ENTRIES) {
        const oldest = cache.keys().next().value;
        if (oldest !== undefined) cache.delete(oldest);
      }
      cache.set(url, { at: Date.now(), body });
      return body;
    } finally {
      clearTimeout(timer);
    }
  }

  function searchResultSummary(body: SearchApiResponse): Record<string, unknown> {
    const relaxed = body.applied_filters?.relaxed === true;
    return {
      total_items: body.pagination?.total_items ?? 0,
      page: body.pagination?.page ?? 1,
      page_size: body.pagination?.page_size ?? 0,
      has_next_page: body.pagination?.has_next_page ?? false,
      relaxed,
      ...(relaxed
        ? { note: 'The exact query matched nothing; these are related results.' }
        : {}),
      items: (body.items ?? []).map(summarizeSearchItem),
    };
  }

  const searchTemplates: MarketplaceAgentTool = {
    name: 'search_templates',
    description:
      'Search the Webflow Template Marketplace catalog. Returns matching templates with name, creator, price, categories, styles, demand tier, and links. Use list_categories_and_styles first to discover valid category and style slugs.',
    inputSchema: SEARCH_INPUT_SCHEMA,
    annotations: { readOnlyHint: true },
    async execute(input) {
      const body = await fetchSearch(buildAgentSearchUrl(apiBase, input as AgentSearchInput));
      return searchResultSummary(body);
    },
  };

  const listCategoriesAndStyles: MarketplaceAgentTool = {
    name: 'list_categories_and_styles',
    description:
      'List the marketplace taxonomy: categories (with template counts), subcategories, style and type facets, scopes, and sort options. Call this before filtering so slugs are exact.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        category_group_slug: {
          type: 'string',
          description: 'Optional category slug to also return its subcategories and contextual counts.',
        },
      },
    },
    annotations: { readOnlyHint: true },
    async execute(input) {
      const categorySlug =
        typeof input.category_group_slug === 'string' ? input.category_group_slug : undefined;
      const url = buildAgentSearchUrl(
        apiBase,
        { category_group_slug: categorySlug, page_size: 1, sort: 'popular' },
        'grid',
        'facets,pills',
      );
      const body = await fetchSearch(url);
      const pill = (entry: SearchApiPill) => ({
        name: entry.name ?? null,
        slug: entry.slug ?? null,
        count: entry.count ?? null,
      });
      return {
        categories: (body.category_pills ?? []).map(pill),
        subcategories: (body.subcategory_pills ?? []).map(pill),
        styles: body.available_facets?.styles ?? [],
        types: body.available_facets?.types ?? [],
        scopes: SCOPE_ENUM,
        sort_options: TEMPLATE_SORT_OPTIONS,
      };
    },
  };

  const getTemplate: MarketplaceAgentTool = {
    name: 'get_template',
    description:
      'Get full details for one template by its template_slug (from search_templates results): pricing, categories, styles, tags, preview and purchase links.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['template_slug'],
      properties: {
        template_slug: { type: 'string', description: 'Slug from search_templates results.' },
      },
    },
    annotations: { readOnlyHint: true },
    async execute(input) {
      const slug = String(input.template_slug ?? '').trim().toLowerCase();
      if (!slug) return { ok: false, message: 'template_slug is required.' };
      // The search worker has no exact-slug filter (its FTS index covers
      // names/descriptions/taxonomy, not slugs), so this is a best-effort
      // name-token lookup: try the full slug, then without a duplicate-name
      // numeric suffix (e.g. "zenith-2" → "zenith").
      const queries = [slug.replace(/-/g, ' ')];
      const withoutSuffix = slug.replace(/-\d+$/, '');
      if (withoutSuffix !== slug) queries.push(withoutSuffix.replace(/-/g, ' '));
      let items: SearchApiItem[] = [];
      let match: SearchApiItem | undefined;
      for (const q of queries) {
        const body = await fetchSearch(buildAgentSearchUrl(apiBase, { q, page_size: 24 }));
        items = body.items ?? [];
        match = items.find((item) => (item.template_slug ?? '').toLowerCase() === slug);
        if (match) break;
      }
      if (!match) {
        return {
          ok: false,
          message: `No template found with slug "${slug}". Slug lookup is best-effort (the search API has no exact-slug filter) — try search_templates with the template's name instead.`,
          suggestions: items.slice(0, 5).map(summarizeSearchItem),
        };
      }
      return {
        ok: true,
        template: {
          ...summarizeSearchItem(match),
          is_featured: match.is_featured ?? false,
          reviewer_pick_reason: match.reviewer_pick_reason ?? null,
          website_url: match.website_url ?? null,
          purchase_url: match.purchase_url ?? null,
        },
      };
    },
  };

  // Page-action state is owned by this factory: one registrar per page.
  const highlightMisses = createHighlightMissState();
  const timers: PageActionTimers = new Map();

  const updatePageFilters: MarketplaceAgentTool = {
    name: 'update_page_filters',
    description:
      'Apply search text, filters, or sorting to the template grid on the CURRENT page — the user sees the change immediately, controls pulse to show what changed, and Back undoes it. Only works on webflow.com/templates pages that show a template grid.',
    inputSchema: UPDATE_PAGE_INPUT_SCHEMA,
    annotations: { readOnlyHint: false },
    async execute(input) {
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        return { ok: false, message: 'Page context unavailable.' };
      }
      const requested = sanitizePageActionInput(input);
      const payload = normalizePageActionPayload(requested);
      // Normalization drops unknown category slugs; report that instead of
      // pretending the (now empty) action filtered the page.
      if (requested.category_group_slug != null && payload.category_group_slug == null) {
        return {
          ok: false,
          message: `Unknown category "${requested.category_group_slug}". Call list_categories_and_styles for valid category slugs.`,
        };
      }
      if (Object.keys(payload).length === 0) {
        return {
          ok: false,
          message:
            'No supported filters in this call. Provide q, category_group_slug, styles, types, free_only, sort, clear_filters, or highlight_slugs.',
        };
      }
      // Carousel cards also carry [data-template-slug] but do not listen for
      // templateFiltersChanged, so filter mutations require a filter-aware
      // grid; highlight-only calls may target any template card on the page.
      if (pageActionChangesFilters(payload) ? !pageHasFilterAwareGrid() : !pageHasTemplateGrid()) {
        return {
          ok: false,
          message:
            'No filter-aware template grid on this page. Navigate to https://webflow.com/templates (or a category page under /templates) and call update_page_filters again.',
        };
      }
      const routeOwnedBase = payload.clear_filters ? routeOwnedFilters(window.location.href) : [];
      const routeOwned = payload.clear_filters
        ? [...routeOwnedBase, ...componentOwnedFilters(window, routeOwnedBase)]
        : [];
      // TemplateGrid's external merge treats null category/subcategory in the
      // dispatched detail as explicit clears, and buildFilterChangeDetail
      // defaults a missing sort param to 'popular' — either would let an
      // unrelated action wipe route- or prop-derived state. Pre-seed those
      // values as query params so the detail keeps them.
      if (pageActionChangesFilters(payload) && !payload.clear_filters) {
        preserveResolvedPageParams(window, payload);
      }
      applyPageAction(payload, highlightMisses, timers, { history: 'push' });
      return {
        ok: true,
        applied: payload,
        href: window.location.href,
        ...(routeOwned.length > 0
          ? {
              preserved_route_filters: routeOwned,
              note: 'Query filters were cleared, but these filters come from the page path itself and remain active. Navigate to https://webflow.com/templates for a fully unfiltered view.',
            }
          : {
              note: 'Filters applied to the visible page; the grid refetches and highlights render asynchronously.',
            }),
      };
    },
  };

  const getPageState: MarketplaceAgentTool = {
    name: 'get_page_state',
    description:
      'Read what the user currently sees on this marketplace page: active filters, route kind, and the template slugs visible in the grid.',
    inputSchema: { type: 'object', additionalProperties: false, properties: {} },
    annotations: { readOnlyHint: true },
    async execute() {
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        return { ok: false, message: 'Page context unavailable.' };
      }
      const href = window.location.href;
      const route = parseTemplateRoute({ href });
      // popstate (Back/Forward) changes the URL and grid without refreshing the
      // __templateMarketplaceFilters snapshot, so trust it only when its href
      // still matches the page; otherwise derive filters from the URL.
      const snapshot = (window as unknown as Record<string, unknown>)
        .__templateMarketplaceFilters as Record<string, unknown> | undefined;
      const snapshotIsCurrent = snapshot?.href === href;
      // TemplateGrid publishes its resolved state (URL + prop overrides like
      // categorySlug/scopeOverride), which the URL alone cannot reproduce.
      const gridState = (window as unknown as Record<string, unknown>)
        .__templateMarketplaceGridState as Record<string, unknown> | undefined;
      const gridStateIsCurrent = gridState?.href === href;
      const roots = discoverOpenRoots(document);
      // Prefer cards inside the filter-aware grid; editorial carousels reuse
      // [data-template-slug] but are not part of the active result set, and
      // neither are the fallback cards in the grid's empty-state section.
      const inEmptyRecommendations = (el: Element) =>
        typeof el.closest === 'function' &&
        el.closest('[data-template-grid-section="empty-recommendations"]') != null;
      let slugElements = queryDiscoveredRoots(roots, GRID_SCOPED_SLUG_SELECTOR).filter(
        (el) => !inEmptyRecommendations(el),
      );
      let slugSource: 'grid' | 'page' = 'grid';
      if (slugElements.length === 0) {
        slugElements = queryDiscoveredRoots(roots, '[data-template-slug]').filter(
          (el) => !inEmptyRecommendations(el),
        );
        if (slugElements.length > 0) slugSource = 'page';
      }
      const seen = new Set<string>();
      for (const el of slugElements) {
        const slug = el.getAttribute('data-template-slug');
        if (slug) seen.add(slug);
        if (seen.size >= MAX_VISIBLE_SLUGS) break;
      }
      return {
        ok: true,
        href,
        path_kind: route.pathKind,
        filters:
          gridStateIsCurrent && gridState
            ? gridState
            : snapshotIsCurrent && snapshot
              ? snapshot
              : {
                  q: route.q,
                  scope: route.scope,
                  categoryGroupSlug: route.categoryGroupSlug,
                  childCategorySlug: route.childCategorySlug,
                  styleSlug: route.styleSlug,
                  tagSlug: route.tagSlug,
                  styles: route.styles,
                  types: route.types,
                  freeOnly: route.freeOnly,
                  sort: route.sort,
                },
        filters_source: gridStateIsCurrent ? 'grid' : snapshotIsCurrent ? 'event' : 'url',
        has_template_grid: pageHasFilterAwareGrid(),
        visible_template_slugs: Array.from(seen),
        visible_slug_source: slugSource,
      };
    },
  };

  const tools = [searchTemplates, listCategoriesAndStyles, getTemplate, getPageState];
  if (enablePageActions) tools.splice(3, 0, updatePageFilters);

  // Always instrument: the error-to-result contract (thrown errors become
  // { ok: false, error }) must not depend on whether telemetry is enabled.
  for (const tool of tools) instrumentTool(tool, options.onToolCall);
  return tools;
}

function instrumentTool(
  tool: MarketplaceAgentTool,
  onToolCall: MarketplaceAgentToolsOptions['onToolCall'],
): void {
  const inner = tool.execute;
  // Telemetry must never break a tool call: the callback ultimately reaches
  // third-party analytics, so its failures are swallowed, not propagated.
  const report = (ok: boolean, started: number) => {
    try {
      onToolCall?.({ tool: tool.name, ok, durationMs: Date.now() - started });
    } catch {
      // Ignore analytics failures.
    }
  };
  tool.execute = async (input) => {
    const started = Date.now();
    try {
      const result = await inner(input);
      // A resolved result can still be a semantic failure ({ ok: false });
      // count those as failures so tool-health metrics stay honest.
      const semanticOk = !(
        result &&
        typeof result === 'object' &&
        (result as { ok?: unknown }).ok === false
      );
      report(semanticOk, started);
      return result;
    } catch (err) {
      report(false, started);
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  };
}

// ── WebMCP registration ──────────────────────────────────────────────────────

interface ModelContextLike {
  registerTool?: (tool: unknown) => unknown;
  provideContext?: (context: { tools: unknown[] }) => unknown;
}

function findModelContext(): ModelContextLike | null {
  if (typeof window === 'undefined') return null;
  const nav = window.navigator as Navigator & { modelContext?: ModelContextLike };
  if (nav?.modelContext) return nav.modelContext;
  const doc = document as Document & { modelContext?: ModelContextLike };
  return doc?.modelContext ?? null;
}

/** Adapt a tool so its result matches the WebMCP content-array shape. */
export function toWebMcpTool(tool: MarketplaceAgentTool): Record<string, unknown> {
  return {
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    annotations: tool.annotations,
    execute: async (input: Record<string, unknown>): Promise<WebMcpToolResult> => {
      const raw = await tool.execute(input ?? {});
      if (
        raw &&
        typeof raw === 'object' &&
        Array.isArray((raw as { content?: unknown }).content)
      ) {
        return raw as WebMcpToolResult;
      }
      let text: string;
      try {
        text = typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2);
      } catch {
        text = raw == null ? String(raw) : '[unserializable tool result]';
      }
      return { content: [{ type: 'text', text }] };
    },
  };
}

export interface RegisterAgentToolsResult {
  api: 'registerTool' | 'provideContext' | 'none';
  registered: number;
}

/**
 * Register tools with whichever WebMCP surface the browser exposes. Prefers the
 * incremental `registerTool` (the shape OpenAI's Site tools documents) and
 * falls back to wholesale `provideContext`. No-op in browsers without WebMCP.
 */
export function registerMarketplaceAgentTools(
  tools: MarketplaceAgentTool[],
): RegisterAgentToolsResult {
  try {
    const modelContext = findModelContext();
    if (!modelContext) return { api: 'none', registered: 0 };
    if (typeof modelContext.registerTool === 'function') {
      let registered = 0;
      for (const tool of tools) {
        modelContext.registerTool(toWebMcpTool(tool));
        registered += 1;
      }
      return { api: 'registerTool', registered };
    }
    if (typeof modelContext.provideContext === 'function') {
      modelContext.provideContext({ tools: tools.map(toWebMcpTool) });
      return { api: 'provideContext', registered: tools.length };
    }
    return { api: 'none', registered: 0 };
  } catch {
    return { api: 'none', registered: 0 };
  }
}

// ── Page-level debug handle ──────────────────────────────────────────────────

export interface AgentToolsWindowHandle {
  version: string;
  listTools: () => Array<{ name: string; description: string; readOnly: boolean }>;
  callTool: (name: string, input?: Record<string, unknown>) => Promise<unknown>;
}

export function createAgentToolsWindowHandle(
  tools: MarketplaceAgentTool[],
): AgentToolsWindowHandle {
  return {
    version: MARKETPLACE_AGENT_TOOLS_VERSION,
    listTools: () =>
      tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        readOnly: tool.annotations.readOnlyHint,
      })),
    callTool: async (name, input = {}) => {
      const tool = tools.find((entry) => entry.name === name);
      if (!tool) throw new Error(`Unknown marketplace agent tool: ${name}`);
      return tool.execute(input);
    },
  };
}
