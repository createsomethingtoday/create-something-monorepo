import React from 'react';
import { TemplateChat, type TemplateChatProps } from './TemplateChat';

/**
 * Template Finder for Made in Webflow surfaces.
 *
 * Same conversational template discovery as TemplateChat — the agent searches
 * the marketplace and renders recommendations as template cards inside the
 * chat — but page actions are pinned off: the Made in Webflow listing shows
 * community sites, not templates, so there is no template grid for the agent
 * to filter, sort, or highlight. The agent is told the page has no grid, and
 * any page_action events are dropped without touching the page.
 */
export type MadeInWebflowTemplateFinderProps = Omit<
  TemplateChatProps,
  'enablePageActions'
>;

export const MadeInWebflowTemplateFinder: React.FC<MadeInWebflowTemplateFinderProps> = (
  props,
) => <TemplateChat {...props} enablePageActions={false} />;

export default MadeInWebflowTemplateFinder;
