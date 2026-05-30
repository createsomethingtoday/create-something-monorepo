import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { TemplateGrid } from './TemplateGrid';

export default declareComponent(TemplateGrid, {
  name: 'Template Grid',
  description:
    'Infinite-scroll template marketplace grid. Fetches from the template search API and renders cards with lazy loading. Drop this on any category page to replace the Webflow Collection List.',
  group: 'Marketplace',
  props: {
    apiBase: props.Text({
      name: 'API Base URL',
      defaultValue: '',
      tooltip:
        'Base URL for the template search API (no trailing slash). Leave blank to use the production default: https://webflow-template-marketplace.webflow.io/templates (Cloud App proxy — CSP-safe). Override to https://webflow-template-search.createsomething.workers.dev for local dev.'
    }),
    categorySlug: props.Text({
      name: 'Category Slug (preview)',
      defaultValue: '',
      tooltip:
        'Category group slug for Designer preview (e.g. "architecture-and-design-websites"). In production the slug is auto-detected from the page URL (/templates/category/{slug}).'
    }),
    scopeOverride: props.Variant({
      name: 'Scope (preview)',
      options: ['all', 'featured', 'free', 'landing_pages'],
      defaultValue: 'all',
      tooltip:
        'For Designer preview of special pages. "all" = auto-detect from URL in production. Set "featured", "free", or "landing_pages" to preview those page types in the Designer.'
    }),
    initialSort: props.Variant({
      name: 'Default Sort',
      options: ['popular', 'newest', 'price_asc', 'price_desc'],
      defaultValue: 'popular',
      tooltip: 'Fallback sort when no ?sort= query param is present in the URL.'
    }),
    pageSize: props.Number({
      name: 'Items Per Page',
      defaultValue: 24,
      tooltip: 'Number of templates to fetch per infinite-scroll batch.'
    })
  }
});
