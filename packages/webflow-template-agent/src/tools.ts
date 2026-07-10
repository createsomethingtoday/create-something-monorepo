import type Anthropic from '@anthropic-ai/sdk';
import type { DisplayPayload, Env, TemplateSearchItem, TemplateSearchResponse } from './types.js';

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
export const DISPLAY_LAYOUTS = ['gallery', 'carousel', 'spotlight', 'comparison', 'shortlist'] as const;

const MAX_DISPLAY_ITEMS = 12;

export const AGENT_TOOLS: Anthropic.Messages.ToolUnion[] = [
  {
    name: 'search_templates',
    description:
      'Search the Webflow Template Marketplace. Call this whenever the user describes what they need — translate their intent into filters. Sorts: "popular" = current demand (recent sales), "best_selling" = all-time sales, "newest" = recently published. Feature filters use AND semantics.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: {
        q: { type: ['string', 'null'], description: 'Free-text keywords (template names, topics). Omit for pure filter queries.' },
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
        has_ecommerce: { type: ['boolean', 'null'], description: 'Require a full online-store setup.' },
        has_membership: { type: ['boolean', 'null'], description: 'Require member login / gated content support.' },
        has_cms: { type: ['boolean', 'null'], description: 'Require CMS collections (blog, listings, dynamic content).' },
        free_only: { type: ['boolean', 'null'], description: 'Only free templates.' },
        sort: { type: ['string', 'null'], enum: [...SORT_VALUES, null] as never, description: 'Default "popular".' },
        page_size: { type: ['integer', 'null'], description: '1-24, default 12.' },
      },
      required: [
        'q',
        'category_group_slug',
        'styles',
        'features',
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
      'Render templates to the user in the chat UI. Call this after searching — the user cannot see raw search results, only what you display. Layouts: "gallery" (browsing several), "carousel" (a strip), "spotlight" (one strong recommendation), "comparison" (2-4 side by side), "shortlist" (ranked picks, each with a reason). Only slugs returned by earlier tool calls in this conversation will render. Include 2-4 short follow-up suggestions the user might tap next.',
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
];

// ── Tool executors ────────────────────────────────────────────────────────────

export interface SearchToolInput {
  q?: string | null;
  category_group_slug?: string | null;
  styles?: string[] | null;
  features?: string[] | null;
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
  if (input.has_ecommerce) url.searchParams.set('has_ecommerce', 'true');
  if (input.has_membership) url.searchParams.set('has_membership', 'true');
  if (input.has_cms) url.searchParams.set('has_cms', 'true');
  if (input.free_only) url.searchParams.set('free_only', 'true');
  if (input.sort) url.searchParams.set('sort', input.sort);
  return url.toString();
}

// Trim items to what the model needs to reason about — the full item is kept
// in the slug registry for display enrichment, not replayed into context.
function itemSummary(item: TemplateSearchItem): Record<string, unknown> {
  return {
    template_slug: item.template_slug,
    name: item.name,
    creator: item.creator_name,
    price: item.is_free ? 'Free' : item.price != null ? `$${item.price}` : null,
    categories: item.category_groups.map((group) => group.name),
    features: item.features,
    has_ecommerce: item.has_ecommerce,
    has_membership: item.has_membership,
    has_cms: item.has_cms,
    cumulative_purchases: item.cumulative_purchases,
    published_date: item.published_date,
  };
}

export class TemplateToolExecutor {
  // Anti-hallucination registry: display_results only renders slugs the
  // conversation has actually seen from tool results.
  private readonly knownItems = new Map<string, TemplateSearchItem>();

  constructor(private readonly env: Env) {}

  async searchTemplates(input: SearchToolInput): Promise<string> {
    const response = await fetch(buildSearchUrl(this.env.SEARCH_API_BASE, input), {
      headers: { 'User-Agent': 'webflow-template-agent/0.1' },
    });
    if (!response.ok) {
      return JSON.stringify({ error: `Search failed (${response.status}). Try adjusting the filters.` });
    }

    const data = (await response.json()) as TemplateSearchResponse;
    for (const item of data.items) this.knownItems.set(item.template_slug, item);

    return JSON.stringify({
      total_items: data.pagination.total_items,
      returned: data.items.length,
      items: data.items.map(itemSummary),
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

  // Validates + enriches a display request. Unknown slugs are dropped (never
  // rendered); returns null when nothing valid remains.
  buildDisplayPayload(input: {
    layout: string;
    title?: string | null;
    items: Array<{ template_slug: string; reason?: string | null }>;
    followups?: string[] | null;
  }): { payload: DisplayPayload | null; dropped: string[] } {
    const dropped: string[] = [];
    const items = [];
    for (const entry of input.items.slice(0, MAX_DISPLAY_ITEMS)) {
      const known = this.knownItems.get(entry.template_slug);
      if (!known) {
        dropped.push(entry.template_slug);
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
