// ── Agent protocol ───────────────────────────────────────────────────────────
// The single shared contract between TemplateChat and the webflow-template-agent
// Worker. Both sides import these shapes so a protocol change cannot drift
// silently between the browser and the edge.

export type DisplayLayout = 'gallery' | 'carousel' | 'spotlight' | 'comparison' | 'shortlist';

export interface AgentTemplateItem {
  template_slug: string;
  name: string;
  url: string | null;
  /** Published .webflow.io site — frameable on *.webflow.com, used for live previews. */
  website_url?: string | null;
  /** Direct marketplace checkout deep link — used by the preview Buy CTA. */
  purchase_url?: string | null;
  creator_name: string | null;
  creator_profile_url: string | null;
  creator_avatar_url: string | null;
  creator_avatar_alt: string | null;
  thumbnail_image_url: string | null;
  price: number | null;
  is_free: boolean;
  features: string[];
  cumulative_purchases: number | null;
}

export interface DisplayPayload {
  layout: DisplayLayout;
  title?: string;
  items: Array<{ template_slug: string; reason?: string; item: AgentTemplateItem }>;
  followups?: string[];
}

// Filters/sort/highlights the agent wants applied to the host page's template
// grid (via the marketplace components' URL-param + templateFiltersChanged
// contract). Highlight slugs are already validated server-side.
export interface PageActionPayload {
  q?: string | null;
  category_group_slug?: string | null;
  styles?: string[] | null;
  types?: string[] | null;
  free_only?: boolean | null;
  sort?: string | null;
  clear_filters?: boolean | null;
  highlight_slugs?: string[];
}

export type AgentStatus = 'thinking' | 'searching' | 'curating';

export type AgentSseEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'display'; payload: DisplayPayload }
  | { type: 'status'; label: AgentStatus }
  | { type: 'page_action'; payload: PageActionPayload }
  // Signed continuity snapshot from the stateless agent Worker. The browser
  // cannot forge or modify trusted template facts between turns.
  | { type: 'context'; payload: { context_token: string } }
  | { type: 'done' }
  | { type: 'error'; message: string };

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  displays: DisplayPayload[];
}
