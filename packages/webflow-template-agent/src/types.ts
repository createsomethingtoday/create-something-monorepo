export interface Env {
  ANTHROPIC_API_KEY: string;
  ANTHROPIC_MODEL?: string;
  SEARCH_API_BASE: string;
  ALLOWED_ORIGINS?: string;
  ENVIRONMENT?: string;
}

// ── Chat protocol (client <-> agent worker) ──────────────────────────────────

export interface ChatRequestMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequestBody {
  messages: ChatRequestMessage[];
  // Opaque continuity blob the client echoes back from the previous turn's
  // `context` event. Re-seeds the slug registry so multi-turn requests can
  // display/compare templates surfaced in earlier turns (the worker is
  // stateless across requests).
  context?: ChatContext;
}

export interface ChatContext {
  known_templates: TemplateSearchItem[];
  // Client viewport hint: 'compact' = narrow docked panel, 'immersive' = wide
  // fullscreen/inline canvas. Steers layout and item-count choices.
  surface?: ChatSurface;
  // Whether the page hosting the chat has a live template grid the agent can
  // drive via update_page (filters/sort/highlights).
  has_page_grid?: boolean;
}

export type ChatSurface = 'compact' | 'immersive';

// update_page tool output, forwarded to the client which applies it to the
// host page's grid/filters via the marketplace components' shared URL-param +
// templateFiltersChanged contract. Slugs are validated against the
// conversation's verified-template registry before emission.
export interface PageActionPayload {
  q?: string | null;
  category_group_slug?: string | null;
  styles?: string[] | null;
  free_only?: boolean | null;
  sort?: string | null;
  clear_filters?: boolean | null;
  highlight_slugs?: string[];
}

// SSE events emitted to the client. `display` payloads are the generative-UI
// contract: the model composes them via the display_results tool; the client
// renders them with design-system components. Items are enriched server-side
// from tool results so the client never re-fetches or trusts model text.
export type AgentSseEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'display'; payload: DisplayPayload }
  // What the agent is doing right now — lets the client narrate waits
  // truthfully instead of a generic "searching" label.
  | { type: 'status'; label: 'thinking' | 'searching' | 'curating' }
  // Apply filters/sort/highlights to the host page's template grid.
  | { type: 'page_action'; payload: PageActionPayload }
  // Continuity snapshot: templates this conversation has verified via tools.
  // The client stores it and echoes it back as `context` on the next request.
  | { type: 'context'; payload: ChatContext }
  | { type: 'done' }
  | { type: 'error'; message: string };

export type DisplayLayout = 'gallery' | 'carousel' | 'spotlight' | 'comparison' | 'shortlist';

export interface DisplayItem {
  template_slug: string;
  reason?: string;
  item: TemplateSearchItem;
}

export interface DisplayPayload {
  layout: DisplayLayout;
  title?: string;
  items: DisplayItem[];
  followups?: string[];
}

// ── Search API shapes (subset of the template-search worker response) ────────

export interface TemplateSearchItem {
  id: string;
  template_slug: string;
  name: string;
  url: string | null;
  preview_url: string | null;
  creator_name: string | null;
  creator_profile_url: string | null;
  creator_avatar_url: string | null;
  creator_avatar_alt: string | null;
  thumbnail_image_url: string | null;
  price: number | null;
  is_free: boolean;
  features: string[];
  has_cms: boolean | null;
  has_ecommerce: boolean | null;
  has_membership: boolean | null;
  has_multiple_layouts: boolean | null;
  is_ui_kit: boolean | null;
  template_type: string | null;
  popularity_score: number | null;
  cumulative_purchases: number | null;
  published_date: string | null;
  category_groups: Array<{ name: string; slug: string; url: string }>;
}

export interface TemplateSearchResponse {
  items: TemplateSearchItem[];
  pagination: { total_items: number };
  applied_filters: Record<string, unknown>;
  available_facets?: {
    styles: Array<{ name: string; slug: string; count: number }>;
    types: Array<{ value: string; count: number }>;
  };
  category_pills?: Array<{ name: string; slug: string; count: number }>;
}
