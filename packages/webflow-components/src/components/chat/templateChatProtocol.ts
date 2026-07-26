// ── Agent protocol ───────────────────────────────────────────────────────────
// The client half of the contract with the webflow-template-agent Worker.
//
// The Worker declares these shapes independently (packages/webflow-template-agent
// is not on this branch yet), so the two copies CAN still drift. Until one side
// imports the other, test/TemplateChatProtocol.test.ts pins every event the
// Worker emits as bytes: a change here that stops accepting the real wire format
// fails a test rather than failing in production. Move this module to a shared
// package when the two converge, and delete this note.

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
