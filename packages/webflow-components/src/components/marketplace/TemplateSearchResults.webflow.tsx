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
      options: ['popular', 'newest', 'price_asc', 'price_desc'],
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
  },
});
