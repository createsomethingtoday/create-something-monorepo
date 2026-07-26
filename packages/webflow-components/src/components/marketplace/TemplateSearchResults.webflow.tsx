import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { TemplateSearchResults } from './TemplateSearchResults';

export default declareComponent(TemplateSearchResults, {
  name: 'Template Search Results',
  description:
    'Standalone webflow-template-search results grid with inline no-results recovery. Pair with Template Search Sidebar or Template Filter Bar.',
  group: 'Marketplace',
  props: {
    apiBase: props.Text({
      name: 'API Base URL',
      defaultValue: '',
      tooltip: 'Base URL for the template search API (no trailing slash). Leave blank for production default.',
    }),
    categorySlug: props.Text({
      name: 'Category Slug (preview)',
      defaultValue: '',
    }),
    creatorSlug: props.Text({
      name: 'Creator Slug (preview)',
      defaultValue: '',
      tooltip:
        'Creator/designer slug for Designer preview, e.g. "brix-templates". Production auto-detects from /templates/designers/{slug}.',
    }),
    creatorRecordId: props.Text({
      name: 'Creator Record ID',
      defaultValue: '',
      tooltip:
        'Optional exact creator Airtable/Webflow sync record ID. Bind this on designer profile pages when available; otherwise creator slug is used.',
    }),
    styleSlug: props.Text({
      name: 'Style Slug (preview)',
      defaultValue: '',
    }),
    tagSlug: props.Text({
      name: 'Tag Slug (preview)',
      defaultValue: '',
    }),
    scopeOverride: props.Variant({
      name: 'Scope (preview)',
      options: ['all', 'featured', 'free', 'landing_pages'],
      defaultValue: 'all',
    }),
    defaultSort: props.Variant({
      name: 'Default Sort',
      options: ['popular', 'best_selling', 'newest', 'price_asc', 'price_desc'],
      defaultValue: 'popular',
    }),
    pageSize: props.Number({
      name: 'Items Per Page',
      defaultValue: 24,
    }),
    emptyTitle: props.Text({
      name: 'Empty Title',
      defaultValue: 'No matching templates',
    }),
    emptyDescription: props.Text({
      name: 'Empty Description',
      defaultValue: 'Try a broader search, remove a filter, or start again from the full template catalog.',
    }),
    emptyActionLabel: props.Text({
      name: 'Empty Action Label',
      defaultValue: 'Clear filters',
    }),
    showEmptyRecommendations: props.Boolean({
      name: 'Show Empty Recommendations',
      defaultValue: true,
      tooltip: 'Show four recently featured templates when the current search or filter set has no results.',
    }),
    emptyRecommendationsTitle: props.Text({
      name: 'Empty Recommendations Title',
      defaultValue: 'Recently featured templates',
    }),
    showCategoryMeta: props.Boolean({
      name: 'Show Category Metadata',
      defaultValue: false,
      tooltip: 'Show primary category and subcategory metadata on each template card.',
    }),
    showTemplateType: props.Boolean({
      name: 'Show Template Type',
      defaultValue: false,
      tooltip: 'Show One Page, Multi Page, or Multi Layout on each card.',
    }),
    showPreviewLink: props.Boolean({
      name: 'Show Preview Link',
      defaultValue: false,
      tooltip: 'Show a secondary preview link on cards when the search API has a preview URL.',
    }),
    showFeaturedBadge: props.Boolean({
      name: 'Show Featured Badge',
      defaultValue: false,
      tooltip: 'Show a Featured badge on templates marked as featured by the search API.',
    }),
    showMarketplaceSignals: props.Boolean({
      name: 'Show Marketplace Signals',
      defaultValue: false,
      tooltip:
        'Show compact display-only signals from the search API, such as Popular, purchases, and views. Does not add new filters or sorting.',
    }),
    enableAnalytics: props.Boolean({
      name: 'Enable Analytics',
      defaultValue: true,
      tooltip:
        'Emit aggregate result health telemetry and component errors from the underlying Template Grid.',
    }),
  },
});
