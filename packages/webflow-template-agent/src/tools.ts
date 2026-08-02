import type Anthropic from '@anthropic-ai/sdk';
import type {
  ChatContext,
  DisplayPayload,
  Env,
  PageActionPayload,
  TemplateSearchItem,
  TemplateSearchResponse,
} from './types.js';

// Closed vocabulary sourced from the Templates CMS Features collection.
// Keeping it in the tool schema (enum + strict) makes hallucinated features
// impossible: the model can only filter on features that actually exist.
export const TEMPLATE_FEATURES = [
  '3D transforms',
  'Background video',
  'CSS Grid',
  'Components',
  'Content management system',
  'Custom 404 page',
  'Dynamic content',
  'Ecommerce',
  'Forms',
  'GSAP',
  'Interactions',
  'Media lightbox',
  'Memberships',
  'Responsive design',
  'Responsive navigation',
  'Responsive slider',
  'Retina ready',
  'User Accounts',
  'Web fonts',
] as const;

export const SORT_VALUES = ['popular', 'best_selling', 'newest', 'price_asc', 'price_desc'] as const;
// Exact template_type facet values from the search API's Type filter.
export const TEMPLATE_TYPES = ['Multi Layout', 'Multi Page', 'One Page'] as const;
export const DISPLAY_LAYOUTS = ['gallery', 'carousel', 'spotlight', 'comparison', 'shortlist'] as const;

const MAX_DISPLAY_ITEMS = 12;
// Cap on the continuity snapshot echoed between turns (keeps the request body
// and the model's context note bounded).
const MAX_KNOWN_ITEMS = 40;
const CATEGORY_INTENT_FILLER = new Set([
  'a',
  'am',
  'an',
  'find',
  'for',
  'i',
  'looking',
  'me',
  'need',
  'show',
  'site',
  'sites',
  'template',
  'templates',
  'want',
  'webflow',
  'website',
  'websites',
]);

function categoryIntentKey(value: string): string {
  return (value.toLowerCase().match(/[a-z0-9]+/g) ?? [])
    .filter((token) => !CATEGORY_INTENT_FILLER.has(token))
    .join(' ');
}

function exactCategorySlug(
  query: string,
  pills: TemplateSearchResponse['category_pills'],
): string | null {
  const queryKey = categoryIntentKey(query);
  if (!queryKey) return null;

  const match = (pills ?? []).find(
    (pill) => categoryIntentKey(pill.name) === queryKey || categoryIntentKey(pill.slug) === queryKey,
  );
  return match?.slug ?? null;
}

export const AGENT_TOOLS: Anthropic.Messages.ToolUnion[] = [
  {
    name: 'search_templates',
    description:
      'Search the Webflow Template Marketplace. Call this whenever the user describes what they need — translate their intent into filters. For a broad request that names an existing marketplace category, use category_group_slug and leave q null so its requested sort controls the ordering; use q for unstructured topics and template names. General discovery defaults to "popular", a marketplace ranking signal. Use "best_selling" only when the user explicitly asks for best sellers, most purchased, lifetime sales, or all-time favorites. "newest" = recently published. Do not imply that Popular measures recency or conversion. Feature filters use AND semantics.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: {
        q: {
          type: ['string', 'null'],
          description: 'Free-text keywords for unstructured topics or template names. Leave null for category-only queries.',
        },
        category_group_slug: {
          type: ['string', 'null'],
          description: 'Category slug from list_categories_and_styles, e.g. "medical", "technology".',
        },
        styles: {
          type: ['array', 'null'],
          items: { type: 'string' },
          description: 'Style slugs from list_categories_and_styles, e.g. "dark-websites", "minimal-websites".',
        },
        features: {
          type: ['array', 'null'],
          items: { type: 'string', enum: [...TEMPLATE_FEATURES] },
          description: 'Required template features (AND semantics). Only these exact values exist.',
        },
        types: {
          type: ['array', 'null'],
          items: { type: 'string', enum: [...TEMPLATE_TYPES] },
          description:
            'Template type (OR semantics): "Multi Layout" = several layout variations included, "Multi Page" = full multi-page site, "One Page" = single-page site.',
        },
        has_ecommerce: { type: ['boolean', 'null'], description: 'Require a full online-store setup.' },
        has_membership: { type: ['boolean', 'null'], description: 'Require member login / gated content support.' },
        has_cms: { type: ['boolean', 'null'], description: 'Require CMS collections (blog, listings, dynamic content).' },
        free_only: { type: ['boolean', 'null'], description: 'Only free templates.' },
        sort: {
          anyOf: [{ type: 'string', enum: [...SORT_VALUES] }, { type: 'null' }],
          description:
            'General discovery defaults to "popular". Use "best_selling" only when the user explicitly asks for lifetime popularity such as best sellers or most purchased.',
        },
        page_size: { type: ['integer', 'null'], description: '1-24, default 12.' },
      },
      required: [
        'q',
        'category_group_slug',
        'styles',
        'features',
        'types',
        'has_ecommerce',
        'has_membership',
        'has_cms',
        'free_only',
        'sort',
        'page_size',
      ],
      additionalProperties: false,
    },
  },
  {
    name: 'list_categories_and_styles',
    description:
      'List the available template categories (with counts) and style filters. Use this to ground fuzzy intents ("restaurant site" -> which category exists) before searching.',
    strict: true,
    input_schema: { type: 'object', properties: {}, required: [], additionalProperties: false },
  },
  {
    name: 'display_results',
    description:
      'Render templates to the user in the chat UI. Call this after searching — the user cannot see raw search results, only what you display. Layouts: "gallery" (browsing several), "carousel" (a strip), "spotlight" (one strong recommendation), "comparison" (2-4 side by side), "shortlist" (ranked picks, each with a reason). For a broad category search, use a 2-4 item prefix in the exact returned order; do not re-curate the ranked results. Only slugs returned by earlier tool calls in this conversation will render. Include 2-4 short follow-up suggestions the user might tap next.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: {
        layout: { type: 'string', enum: [...DISPLAY_LAYOUTS] },
        title: { type: ['string', 'null'], description: 'Short heading shown above the templates.' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              template_slug: { type: 'string' },
              reason: {
                type: ['string', 'null'],
                description: 'One short line on why this template fits (required for shortlist/spotlight).',
              },
            },
            required: ['template_slug', 'reason'],
            additionalProperties: false,
          },
        },
        followups: {
          type: ['array', 'null'],
          items: { type: 'string' },
          description: '2-4 short suggested next messages, e.g. "Show cheaper options".',
        },
      },
      required: ['layout', 'title', 'items', 'followups'],
      additionalProperties: false,
    },
  },
  {
    // Not strict: the Messages API caps strict tool schemas at 16 union-typed
    // parameters across all tools, and search_templates/display_results use
    // that budget. buildPageAction validates every field defensively instead.
    name: 'update_page',
    description:
      'Update the marketplace page hosting this chat: set its template grid search/filters/sort, and/or request a highlight for verified template cards. Omit any field to leave it unchanged. A single valid highlight is normalized server-side to clear conflicting filters and search the verified template exact name before the browser requests the pulse. Dispatch does not confirm that the browser rendered or highlighted the card. Only call this when the page context says a template grid is present.',
    input_schema: {
      type: 'object',
      properties: {
        q: { type: 'string', description: 'Set the page search query. Empty string clears it.' },
        category_group_slug: {
          type: 'string',
          description: 'Set the page category filter (slug from list_categories_and_styles). Empty string clears it.',
        },
        styles: { type: 'array', items: { type: 'string' }, description: 'Replace the page style filters.' },
        types: {
          type: 'array',
          items: { type: 'string', enum: [...TEMPLATE_TYPES] },
          description: 'Replace the page Type filters ("Multi Layout", "Multi Page", "One Page").',
        },
        free_only: { type: 'boolean', description: 'Toggle the page free-only filter.' },
        sort: { type: 'string', enum: [...SORT_VALUES], description: 'Set the page sort.' },
        clear_filters: { type: 'boolean', description: 'Reset all page filters before applying the rest.' },
        highlight_slugs: {
          type: 'array',
          items: { type: 'string' },
          description: 'Template slugs to highlight in the page grid (pulse + scroll into view).',
        },
      },
      additionalProperties: false,
    },
  },
];

// ── Tool executors ────────────────────────────────────────────────────────────

export interface PageActionInput {
  q?: string | null;
  category_group_slug?: string | null;
  styles?: string[] | null;
  types?: string[] | null;
  free_only?: boolean | null;
  sort?: string | null;
  clear_filters?: boolean | null;
  highlight_slugs?: string[] | null;
}

export interface SearchToolInput {
  q?: string | null;
  category_group_slug?: string | null;
  styles?: string[] | null;
  features?: string[] | null;
  types?: string[] | null;
  has_ecommerce?: boolean | null;
  has_membership?: boolean | null;
  has_cms?: boolean | null;
  free_only?: boolean | null;
  sort?: string | null;
  page_size?: number | null;
}

export function buildSearchUrl(base: string, input: SearchToolInput): string {
  const url = new URL('/api/templates/search', base);
  url.searchParams.set('include', 'items');
  url.searchParams.set('view', 'grid');
  url.searchParams.set('page_size', String(Math.min(Math.max(input.page_size ?? 12, 1), 24)));
  if (input.q) url.searchParams.set('q', input.q);
  if (input.category_group_slug) url.searchParams.set('category_group_slug', input.category_group_slug);
  for (const style of input.styles ?? []) url.searchParams.append('styles', style);
  for (const feature of input.features ?? []) url.searchParams.append('features', feature);
  for (const type of input.types ?? []) url.searchParams.append('types', type);
  if (input.has_ecommerce) url.searchParams.set('has_ecommerce', 'true');
  if (input.has_membership) url.searchParams.set('has_membership', 'true');
  if (input.has_cms) url.searchParams.set('has_cms', 'true');
  if (input.free_only) url.searchParams.set('free_only', 'true');
  if (input.sort) url.searchParams.set('sort', input.sort);
  return url.toString();
}

// Trim items to what the model needs to reason about — the full item is kept
// in the slug registry for display enrichment, not replayed into context.
// The model never sees raw sales counts — only a coarse demand tier. Prompt
// rules ban quoting numbers, but a data boundary cannot be prompted around:
// what the model does not have, it cannot leak. Raw counts still drive the
// search API's ranking and the display payload's card signals.
function demandTier(purchases: number | null): string | null {
  if (purchases == null) return null;
  if (purchases >= 500) return 'top seller';
  if (purchases >= 100) return 'strong demand';
  if (purchases >= 25) return 'steady demand';
  if (purchases >= 1) return 'emerging';
  return 'new';
}

function itemSummary(item: TemplateSearchItem): Record<string, unknown> {
  return {
    template_slug: item.template_slug,
    name: item.name,
    creator: item.creator_name,
    price: item.is_free ? 'Free' : item.price != null ? `$${item.price}` : null,
    categories: (item.category_groups ?? []).map((group) => group.name),
    features: item.features ?? [],
    has_ecommerce: item.has_ecommerce,
    has_membership: item.has_membership,
    has_cms: item.has_cms,
    template_type: item.template_type,
    demand: demandTier(item.cumulative_purchases),
    published_date: item.published_date,
  };
}

export class TemplateToolExecutor {
  // Anti-hallucination registry: display_results only renders slugs the
  // conversation has actually seen from tool results.
  private readonly knownItems = new Map<string, TemplateSearchItem>();
  // Category browse results have an explicit marketplace ordering. Keep the
  // leading compact prefix at the validation boundary so model curation cannot
  // silently turn Popular into a different ranking.
  private rankedCategorySlugs: string[] | null = null;

  constructor(private readonly env: Env) {}

  // Re-seed the registry from the previous turn's continuity snapshot so a
  // stateless worker can still display/compare templates surfaced earlier.
  seedFromContext(context: ChatContext | undefined): void {
    for (const item of (context?.known_templates ?? []).slice(0, MAX_KNOWN_ITEMS)) {
      if (item?.template_slug && !this.knownItems.has(item.template_slug)) {
        this.knownItems.set(item.template_slug, item);
      }
    }
  }

  // Most-recent-first snapshot for the next turn's `context` echo.
  snapshotContext(): ChatContext {
    return { known_templates: Array.from(this.knownItems.values()).slice(-MAX_KNOWN_ITEMS) };
  }

  // Compact facts about already-verified templates, injected as a system
  // context block so the model can reference/compare them without re-searching.
  describeKnownItems(): string | null {
    if (this.knownItems.size === 0) return null;
    const lines = Array.from(this.knownItems.values())
      .slice(-MAX_KNOWN_ITEMS)
      .map((item) => JSON.stringify(itemSummary(item)));
    return `Templates already verified by tools earlier in this conversation (you may display or compare these by template_slug without re-searching):\n${lines.join('\n')}`;
  }

  async searchTemplates(input: SearchToolInput): Promise<string> {
    this.rankedCategorySlugs = null;
    let searchInput = input;
    let searchUrl = new URL(buildSearchUrl(this.env.SEARCH_API_BASE, searchInput));
    if (input.q && !input.category_group_slug) searchUrl.searchParams.set('include', 'items,pills');

    let response = await fetch(searchUrl, {
      headers: { 'User-Agent': 'webflow-template-agent/0.1' },
    });
    if (!response.ok) {
      return JSON.stringify({ error: `Search failed (${response.status}). Try adjusting the filters.` });
    }

    let data = (await response.json()) as TemplateSearchResponse;
    const categorySlug = input.q && !input.category_group_slug ? exactCategorySlug(input.q, data.category_pills) : null;
    if (categorySlug) {
      searchInput = { ...input, q: null, category_group_slug: categorySlug };
      response = await fetch(buildSearchUrl(this.env.SEARCH_API_BASE, searchInput), {
        headers: { 'User-Agent': 'webflow-template-agent/0.1' },
      });
      if (!response.ok) {
        return JSON.stringify({ error: `Search failed (${response.status}). Try adjusting the filters.` });
      }
      data = (await response.json()) as TemplateSearchResponse;
    }

    for (const item of data.items) this.knownItems.set(item.template_slug, item);
    if (searchInput.category_group_slug && !searchInput.q) {
      this.rankedCategorySlugs = data.items.slice(0, 4).map((item) => item.template_slug);
    }

    return JSON.stringify({
      total_items: data.pagination.total_items,
      returned: data.items.length,
      items: data.items.map(itemSummary),
      ...(this.rankedCategorySlugs
        ? {
            display_prefix: this.rankedCategorySlugs,
            display_instruction: 'Display a 2-4 item prefix in this exact order.',
          }
        : {}),
    });
  }

  async listCategoriesAndStyles(): Promise<string> {
    const url = new URL('/api/templates/search', this.env.SEARCH_API_BASE);
    url.searchParams.set('include', 'facets,pills');
    url.searchParams.set('page', '1');
    url.searchParams.set('page_size', '1');
    const response = await fetch(url.toString(), { headers: { 'User-Agent': 'webflow-template-agent/0.1' } });
    if (!response.ok) return JSON.stringify({ error: `Facet lookup failed (${response.status}).` });

    const data = (await response.json()) as TemplateSearchResponse;
    return JSON.stringify({
      categories: (data.category_pills ?? []).map((pill) => ({ name: pill.name, slug: pill.slug, count: pill.count })),
      styles: (data.available_facets?.styles ?? []).map((style) => ({ name: style.name, slug: style.slug })),
      features: TEMPLATE_FEATURES,
    });
  }

  // Validates an update_page request. Highlight slugs are filtered against the
  // verified-template registry; returns null when the request is a no-op.
  buildPageAction(input: PageActionInput): { payload: PageActionPayload | null; unknownSlugs: string[] } {
    const unknownSlugs: string[] = [];
    const highlights: string[] = [];
    for (const slug of (input.highlight_slugs ?? []).slice(0, MAX_DISPLAY_ITEMS)) {
      if (this.knownItems.has(slug)) highlights.push(slug);
      else unknownSlugs.push(slug);
    }

    const payload: PageActionPayload = {};
    if (input.q != null) payload.q = input.q;
    if (input.category_group_slug != null) payload.category_group_slug = input.category_group_slug;
    if (input.styles != null) payload.styles = input.styles.slice(0, 10);
    if (input.types != null) {
      payload.types = input.types.filter((value) => (TEMPLATE_TYPES as readonly string[]).includes(value)).slice(0, 3);
    }
    if (input.free_only != null) payload.free_only = input.free_only;
    if (input.sort != null && (SORT_VALUES as readonly string[]).includes(input.sort)) payload.sort = input.sort;
    if (input.clear_filters) payload.clear_filters = true;
    if (highlights.length > 0) {
      payload.highlight_slugs = highlights;

      // A single-card highlight must first make that card render. Treat this
      // as an executor invariant rather than prompt advice: clear any stale
      // page filters and search the verified template's exact display name.
      // The host grid applies clear_filters first, then reapplies fields in
      // this payload before it retries the slug highlight.
      if (highlights.length === 1) {
        const known = this.knownItems.get(highlights[0]);
        if (known?.name) {
          payload.clear_filters = true;
          payload.q = known.name;
          delete payload.category_group_slug;
          delete payload.styles;
          delete payload.types;
          delete payload.free_only;
        }
      }
    }

    return { payload: Object.keys(payload).length > 0 ? payload : null, unknownSlugs };
  }

  // Validates + enriches a display request. Unknown slugs are dropped (never
  // rendered); returns null when nothing valid remains.
  buildDisplayPayload(input: {
    layout: string;
    title?: string | null;
    items: Array<{ template_slug: string; reason?: string | null }>;
    followups?: string[] | null;
  }): { payload: DisplayPayload | null; dropped: string[] } {
    const dropped: string[] = [];
    const requested = input.items.slice(0, MAX_DISPLAY_ITEMS);
    const reasons = new Map(requested.map((entry) => [entry.template_slug, entry.reason ?? undefined]));
    for (const entry of requested) {
      if (!this.knownItems.has(entry.template_slug)) dropped.push(entry.template_slug);
    }

    const rankedCount = requested.length > 0 ? Math.min(Math.max(requested.length, 2), 4) : 0;
    const entries =
      this.rankedCategorySlugs && rankedCount > 0
        ? this.rankedCategorySlugs.slice(0, rankedCount).map((template_slug) => ({
            template_slug,
            reason: reasons.get(template_slug),
          }))
        : requested;
    const items = [];
    for (const entry of entries) {
      const known = this.knownItems.get(entry.template_slug);
      if (!known) {
        continue;
      }
      items.push({ template_slug: entry.template_slug, reason: entry.reason ?? undefined, item: known });
    }

    if (items.length === 0) return { payload: null, dropped };

    return {
      payload: {
        layout: (DISPLAY_LAYOUTS as readonly string[]).includes(input.layout)
          ? (input.layout as DisplayPayload['layout'])
          : 'gallery',
        title: input.title ?? undefined,
        items,
        followups: (input.followups ?? []).slice(0, 4),
      },
      dropped,
    };
  }
}
