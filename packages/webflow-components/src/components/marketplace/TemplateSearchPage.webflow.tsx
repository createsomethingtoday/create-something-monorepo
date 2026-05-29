import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { DEFAULT_QUICK_SEARCHES, TemplateSearchPage } from './TemplateSearchPage';

export default declareComponent(TemplateSearchPage, {
  name: 'Template Search Page',
  description:
    'Standalone marketplace search experiment surface powered by webflow-template-search. Includes search, quick searches, filter sidebar, mobile drawer, active chips, result grid, and no-results recovery.',
  group: 'Marketplace',
  props: {
    apiBase: props.Text({
      name: 'API Base URL',
      defaultValue: '',
      tooltip:
        'Base URL for the template search API (no trailing slash). Leave blank for production default. Must match Template Grid and Template Filter Bar.',
    }),
    eyebrow: props.Text({
      name: 'Eyebrow',
      defaultValue: 'Template marketplace search',
    }),
    title: props.Text({
      name: 'Title',
      defaultValue: 'Find the right Webflow template faster',
    }),
    description: props.Text({
      name: 'Description',
      defaultValue:
        'Search the template catalog, refine by style, type, and price, then keep browsing without leaving the marketplace experience.',
    }),
    searchPlaceholder: props.Text({
      name: 'Search Placeholder',
      defaultValue: 'Search templates, categories, styles, or use cases',
    }),
    quickSearches: props.Text({
      name: 'Quick Searches (JSON)',
      defaultValue: DEFAULT_QUICK_SEARCHES,
      tooltip: 'JSON array of strings or {label, query} objects.',
    }),
    showQuickSearches: props.Boolean({
      name: 'Show Quick Searches',
      defaultValue: true,
    }),
    scopeOverride: props.Variant({
      name: 'Scope (preview)',
      options: ['all', 'featured', 'free', 'landing_pages'],
      defaultValue: 'all',
      tooltip:
        'For Designer preview or scoped experiment pages. Use all for the default standalone search page.',
    }),
    categorySlug: props.Text({
      name: 'Category Slug (preview)',
      defaultValue: '',
    }),
    styleSlug: props.Text({
      name: 'Style Slug (preview)',
      defaultValue: '',
    }),
    tagSlug: props.Text({
      name: 'Tag Slug (preview)',
      defaultValue: '',
    }),
    defaultSort: props.Variant({
      name: 'Default Sort',
      options: ['popular', 'newest', 'price_asc', 'price_desc'],
      defaultValue: 'popular',
    }),
    pageSize: props.Number({
      name: 'Items Per Page',
      defaultValue: 24,
    }),
    noindex: props.Boolean({
      name: 'Noindex Experiment Page',
      defaultValue: true,
      tooltip: 'Adds noindex,follow while this standalone search page is an experiment.',
    }),
    enableAnalytics: props.Boolean({
      name: 'Enable Analytics',
      defaultValue: true,
      tooltip:
        'Dispatches templateSearchExperienceAnalytics DOM events and wf_analytics.track calls when available.',
    }),
  },
});
