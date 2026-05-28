import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { TemplateSearchSidebar } from './TemplateSearchSidebar';

export default declareComponent(TemplateSearchSidebar, {
  name: 'Template Search Sidebar',
  description:
    'Standalone vertical marketplace filter sidebar for webflow-template-search pages. Dispatches the same filter events consumed by Template Grid and Template Search Results.',
  group: 'Marketplace',
  props: {
    apiBase: props.Text({
      name: 'API Base URL',
      defaultValue: '',
      tooltip: 'Base URL for the template search API (no trailing slash). Leave blank for production default.',
    }),
    title: props.Text({
      name: 'Title',
      defaultValue: 'Categories',
    }),
    scopeOverride: props.Variant({
      name: 'Scope (preview)',
      options: ['all', 'featured', 'free', 'landing_pages'],
      defaultValue: 'all',
    }),
    categorySlug: props.Text({
      name: 'Category Slug (preview)',
      defaultValue: '',
    }),
    subcategorySlug: props.Text({
      name: 'Subcategory Slug (preview)',
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
    interactionMode: props.Variant({
      name: 'Interaction Mode',
      options: ['navigate', 'filter'],
      defaultValue: 'navigate',
      tooltip:
        'Navigate matches the native sidebar links. Filter keeps the current page and updates Template Grid state.',
    }),
    countMode: props.Variant({
      name: 'Count Mode',
      options: ['global', 'contextual'],
      defaultValue: 'global',
      tooltip:
        'Global matches the native sidebar totals. Contextual reflects the current query/style/tag/free context.',
    }),
    showSearch: props.Boolean({
      name: 'Show Search',
      defaultValue: true,
    }),
    searchPlaceholder: props.Text({
      name: 'Search Placeholder',
      defaultValue: 'Search for templates',
    }),
    searchAction: props.Text({
      name: 'Search Action URL',
      defaultValue: 'https://webflow.com/templates/search-v2',
      tooltip:
        'Destination for sidebar search in Navigate mode. Defaults to the standalone template search experiment page.',
    }),
    queryParam: props.Text({
      name: 'Query Param',
      defaultValue: 'q',
    }),
    enableAnalytics: props.Boolean({
      name: 'Enable Search Analytics',
      defaultValue: true,
    }),
    showSpecialLinks: props.Boolean({
      name: 'Show Special Links',
      defaultValue: true,
      tooltip: 'Show All, Featured, Landing Pages, and Free rows.',
    }),
    showCategories: props.Boolean({
      name: 'Show Categories',
      defaultValue: true,
    }),
    showCounts: props.Boolean({
      name: 'Show Counts',
      defaultValue: true,
    }),
    showStyles: props.Boolean({
      name: 'Show Styles',
      defaultValue: true,
    }),
    showTypes: props.Boolean({
      name: 'Show Types',
      defaultValue: true,
    }),
    showSort: props.Boolean({
      name: 'Show Sort',
      defaultValue: true,
    }),
    showFreeOnly: props.Boolean({
      name: 'Show Free Only',
      defaultValue: true,
    }),
  },
});
