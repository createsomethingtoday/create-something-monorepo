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
    tags: { type: 'array', items: { type: 'string' }, description: 'Tag slugs.' },
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
  if (typeof input.clear_filters === 'boolean') payload.clear_filters = input.clear_filters;
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
      'Search the Webflow Template Marketplace catalog. Returns matching templates with name, creator, price, categories, styles, demand tier, and links. Use list_categories_and_styles first to discover valid category, style, and tag slugs.',
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
      const body = await fetchSearch(
        buildAgentSearchUrl(apiBase, { q: slug.replace(/-/g, ' '), page_size: 24 }),
      );
      const items = body.items ?? [];
      const match = items.find((item) => (item.template_slug ?? '').toLowerCase() === slug);
      if (!match) {
        return {
          ok: false,
          message: `No template found with slug "${slug}".`,
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
      if (!pageHasTemplateGrid()) {
        return {
          ok: false,
          message:
            'No template grid on this page. Navigate to https://webflow.com/templates (or a category page under /templates) and call update_page_filters again.',
        };
      }
      const payload = normalizePageActionPayload(sanitizePageActionInput(input));
      applyPageAction(payload, highlightMisses, timers, { history: 'push' });
      return {
        ok: true,
        applied: payload,
        href: window.location.href,
        note: 'Filters applied to the visible page; the grid refetches and highlights render asynchronously.',
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
      const roots = discoverOpenRoots(document);
      const seen = new Set<string>();
      for (const el of queryDiscoveredRoots(roots, '[data-template-slug]')) {
        const slug = el.getAttribute('data-template-slug');
        if (slug) seen.add(slug);
        if (seen.size >= MAX_VISIBLE_SLUGS) break;
      }
      return {
        ok: true,
        href,
        path_kind: route.pathKind,
        filters: snapshotIsCurrent && snapshot ? snapshot : {
          q: route.q,
          categoryGroupSlug: route.categoryGroupSlug,
          childCategorySlug: route.childCategorySlug,
          styles: route.styles,
          types: route.types,
          freeOnly: route.freeOnly,
          sort: route.sort,
        },
        has_template_grid: seen.size > 0 || pageHasTemplateGrid(),
        visible_template_slugs: Array.from(seen),
      };
    },
  };

  const tools = [searchTemplates, listCategoriesAndStyles, getTemplate, getPageState];
  if (enablePageActions) tools.splice(3, 0, updatePageFilters);

  if (options.onToolCall) {
    for (const tool of tools) instrumentTool(tool, options.onToolCall);
  }
  return tools;
}

function instrumentTool(
  tool: MarketplaceAgentTool,
  onToolCall: NonNullable<MarketplaceAgentToolsOptions['onToolCall']>,
): void {
  const inner = tool.execute;
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
      onToolCall({ tool: tool.name, ok: semanticOk, durationMs: Date.now() - started });
      return result;
    } catch (err) {
      onToolCall({ tool: tool.name, ok: false, durationMs: Date.now() - started });
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
