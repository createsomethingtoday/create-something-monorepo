import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { TemplateMarketplaceHeading } from './TemplateMarketplaceHeading';

export default declareComponent(TemplateMarketplaceHeading, {
  name: 'Template Marketplace Heading',
  description:
    'Dynamic marketplace breadcrumb, headline, and description that follows Template Grid/Search V2 filter state without replacing page SEO settings.',
  group: 'Marketplace',
  props: {
    pageKind: props.Variant({
      name: 'Page Kind',
      options: ['auto', 'search', 'all', 'featured', 'free', 'landing_pages', 'category'],
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
    fallbackTitle: props.Text({
      name: 'Fallback Title',
      defaultValue: '',
      tooltip:
        'Optional static title fallback. Leave empty on routed pages so /templates/all renders "All Website Templates" and category routes use their route title.',
    }),
    fallbackDescription: props.Text({
      name: 'Fallback Description',
      defaultValue: 'Explore Webflow templates by category, style, type, price, and popularity.',
    }),
    descriptionMode: props.Variant({
      name: 'Description Source',
      options: ['preserve_static', 'dynamic'],
      defaultValue: 'preserve_static',
      tooltip:
        'Preserve static keeps live Webflow/Airtable SEO/AEO copy on category and subcategory pages. Dynamic is for Search V2/filter-only pages.',
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
