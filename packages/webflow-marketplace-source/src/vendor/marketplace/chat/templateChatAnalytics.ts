import type React from 'react';
import type { MarketplaceAnalyticsData } from '../marketplace/analytics';
import {
  MARKETPLACE_SIGNAL_WINDOW,
  type TemplateMarketplaceAttribution,
} from '../marketplace/templateAttribution';
import type { AgentTemplateItem } from './templateChatProtocol';

// ── Analytics ─────────────────────────────────────────────────────────────────
// All chat telemetry flows through the shared marketplace tracker
// ('Code Component Event' + scope, fanned out to wf_analytics/Segment/
// Amplitude), matching TemplateGrid — chat sessions join the same Amplitude
// funnels, and card clicks write the same attribution record the template
// detail page's conversion tracker consumes.
export type ChatTrack = (scope: string, data?: MarketplaceAnalyticsData) => void;
export type ChatMessageSource = 'input' | 'starter' | 'followup' | 'retry';

export function buildMessageSentAnalytics(
  source: ChatMessageSource,
  turn: number,
  message: string,
): MarketplaceAnalyticsData {
  return {
    source,
    turn,
    message_length: message.length,
  };
}

export function buildChatAttribution(
  item: AgentTemplateItem,
  position: number,
  sourceSort: string,
): TemplateMarketplaceAttribution {
  return {
    version: 1,
    source_component: 'TemplateChat',
    source_pathname: typeof window === 'undefined' ? null : window.location.pathname || null,
    source_scope: 'chat',
    // The display layout (or 'preview') stands in for sort context — chat
    // results are agent-curated, not sorted by a grid lens.
    source_sort: sourceSort,
    source_category_group_slug: null,
    source_child_category_slug: null,
    source_style_slug: null,
    source_tag_slug: null,
    source_free_only: false,
    // Chat results always follow a user prompt.
    source_q_present: true,
    source_styles_count: 0,
    source_tags_count: 0,
    source_types_count: 0,
    source_page: 1,
    source_position: position,
    template_slug: item.template_slug,
    signal_bucket: null,
    signal_metric: null,
    signal_window: MARKETPLACE_SIGNAL_WINDOW,
    signal_density: 'none',
    created_at: new Date().toISOString(),
  };
}

export function isAnchorClickOn(event: React.MouseEvent, href: string | null): boolean {
  if (!href) return false;
  const target = event.target;
  if (!(target instanceof Element)) return false;
  const anchor = target.closest<HTMLAnchorElement>('a[href]');
  return Boolean(anchor && anchor.getAttribute('href') === href);
}
