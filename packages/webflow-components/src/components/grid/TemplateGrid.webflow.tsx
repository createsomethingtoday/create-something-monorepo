import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { TemplateGrid } from './TemplateGrid';

export default declareComponent(TemplateGrid, {
  name: 'Template Grid',
  description:
    'Infinite-scroll template marketplace grid. Fetches from the template search API and renders cards with lazy loading. Drop this on category, subcategory, style, tag, or special template-list pages to replace the Webflow Collection List.',
  group: 'Marketplace',
  props: {
    apiBase: props.Text({
      name: 'API Base URL',
      defaultValue: '',
      tooltip:
        'Base URL for the template search API (no trailing slash). Leave blank to use the production default: https://webflow-template-marketplace.webflow.io/templates (Cloud App proxy — CSP-safe). Override to https://webflow-template-search.createsomething.workers.dev for local dev.',
    }),
    categorySlug: props.Text({
      name: 'Category Slug (preview)',
      defaultValue: '',
      tooltip:
        'Category group slug for Designer preview (e.g. "architecture-and-design-websites"). In production the slug is auto-detected from the page URL (/templates/category/{slug}).',
    }),
    creatorSlug: props.Text({
      name: 'Creator Slug (preview)',
      defaultValue: '',
      tooltip:
        'Creator/designer slug for Designer preview (e.g. "brix-templates"). In production the slug is auto-detected from the page URL (/templates/designers/{slug}).',
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
      tooltip:
        'Style slug for Designer preview (e.g. "modern"). In production the slug is auto-detected from the page URL (/templates/style/{slug}).',
    }),
    tagSlug: props.Text({
      name: 'Tag Slug (preview)',
      defaultValue: '',
      tooltip:
        'Tag slug for Designer preview (e.g. "automation"). In production the slug is auto-detected from the page URL (/templates/tag/{slug}).',
    }),
    scopeOverride: props.Variant({
      name: 'Scope (preview)',
      options: ['all', 'featured', 'free', 'landing_pages'],
      defaultValue: 'all',
      tooltip:
        'For Designer preview of special pages. "all" = auto-detect from URL in production. Set "featured", "free", or "landing_pages" to preview those page types in the Designer.',
    }),
    initialSort: props.Variant({
      name: 'Default Sort',
      options: ['popular', 'newest', 'price_asc', 'price_desc'],
      defaultValue: 'popular',
      tooltip: 'Fallback sort when no ?sort= query param is present in the URL.',
    }),
    pageSize: props.Number({
      name: 'Items Per Page',
      defaultValue: 24,
      tooltip: 'Number of templates to fetch per infinite-scroll batch.',
    }),
    showEmptyState: props.Boolean({
      name: 'Show Empty State',
      defaultValue: false,
      tooltip:
        'Render an inline no-results state. Leave off when the page already has a native Webflow/Finsweet empty-state element.',
    }),
    emptyTitle: props.Text({
      name: 'Empty Title',
      defaultValue: 'No templates found',
    }),
    emptyDescription: props.Text({
      name: 'Empty Description',
      defaultValue: 'Try a broader search or clear filters to see more templates.',
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
        'Emit aggregate marketplace health telemetry for successful result batches and component errors. Does not send raw query text, template names, or creator names.',
    }),
  },
});
