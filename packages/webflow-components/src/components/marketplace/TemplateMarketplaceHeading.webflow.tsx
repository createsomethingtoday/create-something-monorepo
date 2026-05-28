import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { TemplateMarketplaceHeading } from './TemplateMarketplaceHeading';

export default declareComponent(TemplateMarketplaceHeading, {
  name: 'Template Marketplace Heading',
  description:
    'Dynamic marketplace breadcrumb, headline, and description that follows Template Grid/Search V2 filter state without replacing page SEO settings.',
  group: 'Marketplace',
  props: {
    apiBase: props.Text({
      name: 'API Base URL',
      defaultValue: '',
      tooltip:
        'Base URL for taxonomy metadata (no trailing slash). Leave blank to use the production Cloud App proxy. Use the direct Worker only for local testing.',
    }),
    pageKind: props.Variant({
      name: 'Page Kind',
      options: ['auto', 'search', 'all', 'featured', 'free', 'landing_pages', 'category', 'subcategory', 'style', 'tag'],
      defaultValue: 'auto',
      tooltip:
        'Use Search for /templates/search-v2, Landing Pages for /templates/landing-page, Free for /templates/free-website-templates, or Auto on routed pages.',
    }),
    categorySlug: props.Text({
      name: 'Category Slug (preview)',
      defaultValue: '',
    }),
    subcategorySlug: props.Text({
      name: 'Subcategory Slug (preview)',
      defaultValue: '',
    }),
    queryParam: props.Text({
      name: 'Query Param',
      defaultValue: 'q',
      tooltip: 'Search V2 uses q. Native /templates/search uses query.',
    }),
    staticRoutePath: props.Text({
      name: 'Static Route Path',
      defaultValue: '',
      tooltip:
        'Optional no-JS/SEO fallback path, e.g. /templates/category/technology-websites. Bind this from Airtable/Webflow CMS slug fields on category pages.',
    }),
    fallbackTitle: props.Text({
      name: 'Static SEO Title',
      defaultValue: '',
      tooltip:
        'Static title for server-rendered fallback markup. Bind to Airtable/Webflow SEO or AEO title where available.',
    }),
    fallbackDescription: props.Text({
      name: 'Static SEO/AEO Description',
      defaultValue: 'Explore Webflow templates by category, style, type, price, and popularity.',
      tooltip:
        'Static supporting copy for server-rendered fallback markup. Bind to Airtable/Webflow category or subcategory descriptions on SEO pages.',
    }),
    descriptionMode: props.Variant({
      name: 'Description Source',
      options: ['preserve_static', 'dynamic'],
      defaultValue: 'preserve_static',
      tooltip:
        'Preserve static keeps live Webflow/Airtable SEO/AEO copy on category and subcategory pages, then falls back to taxonomy metadata when the static text is empty or generic. Dynamic is for Search V2/filter-only pages.',
    }),
    showBreadcrumbs: props.Boolean({
      name: 'Show Breadcrumbs',
      defaultValue: true,
    }),
    showDescription: props.Boolean({
      name: 'Show Description',
      defaultValue: true,
      tooltip: 'Turn off on Search V2 if the page should match the native search heading-only layout.',
    }),
    templatesLabel: props.Text({
      name: 'Templates Label',
      defaultValue: 'Templates',
    }),
    templatesUrl: props.Text({
      name: 'Templates URL',
      defaultValue: '/templates',
    }),
    updateDocumentTitle: props.Boolean({
      name: 'Update Browser Title',
      defaultValue: false,
      tooltip:
        'Leave off for SEO/AEO pages. Enable only for client-side search surfaces where document.title should follow filters.',
    }),
  },
});
