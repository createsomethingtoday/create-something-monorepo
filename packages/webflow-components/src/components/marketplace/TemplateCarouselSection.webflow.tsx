import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { TemplateCarouselSection } from './TemplateCarouselSection';

export default declareComponent(TemplateCarouselSection, {
  name: 'Template Carousel Section',
  description:
    'Editorial template carousel for the marketplace landing page. Fetches templates from the search API and renders marketplace cards in a horizontally scrollable section.',
  group: 'Marketplace',
  props: {
    apiBase: props.Text({
      name: 'API Base URL',
      defaultValue: '',
      tooltip:
        'Base URL for the template search API (no trailing slash). Leave blank for production default.',
    }),
    preset: props.Variant({
      name: 'Section Preset',
      options: ['custom', 'curated_by_webflow', 'marketing_teams', 'recently_added', 'free_templates'],
      defaultValue: 'curated_by_webflow',
      tooltip:
        'Sets default title, copy, CTA, scope, and sort. Curated currently uses Featured + Popular until a dedicated curation source exists.',
    }),
    title: props.Text({
      name: 'Title Override',
      defaultValue: '',
      tooltip: 'Optional heading override. Leave blank to use the selected preset title.',
    }),
    description: props.Text({
      name: 'Description Override',
      defaultValue: '',
      tooltip: 'Optional section copy override. Leave blank to use the selected preset copy.',
    }),
    ctaLabel: props.Text({
      name: 'CTA Label Override',
      defaultValue: '',
      tooltip: 'Optional CTA label override. Leave blank to use the selected preset label.',
    }),
    ctaLink: props.Link({
      name: 'CTA Link Override',
    }),
    itemLimit: props.Number({
      name: 'Item Limit',
      defaultValue: 8,
      tooltip: 'Number of templates to fetch for this carousel. Capped at 24.',
    }),
    scopeOverride: props.Variant({
      name: 'Scope Override',
      options: ['auto', 'all', 'featured', 'free', 'landing_pages'],
      defaultValue: 'auto',
      tooltip: 'Auto uses the selected preset scope.',
    }),
    sortOverride: props.Variant({
      name: 'Sort Override',
      options: ['auto', 'popular', 'newest', 'price_asc', 'price_desc'],
      defaultValue: 'auto',
      tooltip: 'Auto uses the selected preset sort.',
    }),
    categorySlug: props.Text({
      name: 'Category Slug',
      defaultValue: '',
      tooltip: 'Optional category group slug filter.',
    }),
    subcategorySlug: props.Text({
      name: 'Subcategory Slug',
      defaultValue: '',
      tooltip: 'Optional child category slug filter.',
    }),
    typeFilter: props.Text({
      name: 'Type Filter',
      defaultValue: '',
      tooltip: 'Optional comma-separated template types, e.g. "One Page".',
    }),
    styleFilter: props.Text({
      name: 'Style Filter',
      defaultValue: '',
      tooltip: 'Optional comma-separated style names or slugs.',
    }),
    query: props.Text({
      name: 'Search Query',
      defaultValue: '',
      tooltip: 'Optional keyword search query. Overrides any preset query.',
    }),
    showCta: props.Boolean({
      name: 'Show CTA',
      defaultValue: true,
    }),
    showCount: props.Boolean({
      name: 'Show Result Count',
      defaultValue: false,
    }),
    openFeaturedDetailsModal: props.Boolean({
      name: 'Enable Featured Preview Modal',
      defaultValue: false,
      tooltip:
        'For featured carousel sections, open a reviewer preview modal from template card clicks before sending shoppers to the detail page.',
    }),
    enableAnalytics: props.Boolean({
      name: 'Enable Analytics',
      defaultValue: true,
      tooltip:
        'Track CTA, carousel navigation, template clicks, and creator clicks through wf_analytics and the marketplaceLandingAnalytics DOM event.',
    }),
    experimentRole: props.Variant({
      name: 'Experiment Role',
      options: ['none', 'control', 'treatment'],
      defaultValue: 'treatment',
      tooltip: 'Used by Marketplace Landing Experiment Gate to show or hide this component during A/B tests.',
    }),
  },
});
