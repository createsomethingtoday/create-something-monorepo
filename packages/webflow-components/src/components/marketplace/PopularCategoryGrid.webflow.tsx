import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { PopularCategoryGrid, DEFAULT_POPULAR_CATEGORIES_JSON } from './PopularCategoryGrid';

export default declareComponent(PopularCategoryGrid, {
  name: 'Popular Category Grid',
  description:
    'Marketplace landing page category grid. Uses the template search API for category pills, counts, and thumbnail previews.',
  group: 'Marketplace',
  props: {
    apiBase: props.Text({
      name: 'API Base URL',
      defaultValue: '',
      tooltip:
        'Base URL for the template search API (no trailing slash). Leave blank for production default.',
    }),
    title: props.Text({
      name: 'Title',
      defaultValue: 'Find templates by use case',
    }),
    eyebrow: props.Text({
      name: 'Eyebrow',
      defaultValue: 'Popular categories',
    }),
    description: props.Text({
      name: 'Description',
      defaultValue: 'Ten popular launch points to start your template search.',
    }),
    ctaLabel: props.Text({
      name: 'CTA Label',
      defaultValue: 'Browse popular categories',
    }),
    ctaLink: props.Link({
      name: 'CTA Link',
    }),
    categories: props.Text({
      name: 'Fallback Categories (JSON)',
      defaultValue: DEFAULT_POPULAR_CATEGORIES_JSON,
      tooltip:
        'JSON array of {title, slug, href?, count?, imageUrls?}. Used as fallback, or as the pinned list when Use Search Categories is off.',
    }),
    useSearchCategories: props.Boolean({
      name: 'Use Search Categories',
      defaultValue: true,
      tooltip:
        'Populate category titles, slugs, links, and counts from the template search API category pills.',
    }),
    maxCategories: props.Number({
      name: 'Max Categories',
      defaultValue: 10,
      tooltip: 'Maximum category cards to render. Capped at 12.',
    }),
    thumbnailsPerCategory: props.Number({
      name: 'Thumbnails Per Category',
      defaultValue: 3,
      tooltip: 'Number of template thumbnails to show in thumbnail-card layout. Capped at 3.',
    }),
    layout: props.Variant({
      name: 'Layout',
      options: ['icon_table', 'thumbnail_cards'],
      defaultValue: 'icon_table',
      tooltip: 'Icon table matches the updated landing-page brief. Thumbnail cards preserve the exported page pattern.',
    }),
    sort: props.Variant({
      name: 'Thumbnail Sort',
      options: ['popular', 'newest'],
      defaultValue: 'popular',
    }),
    fetchImages: props.Boolean({
      name: 'Fetch Template Images',
      defaultValue: true,
      tooltip: 'Fetch current thumbnails and counts from the template search API.',
    }),
    showCounts: props.Boolean({
      name: 'Show Counts',
      defaultValue: false,
    }),
    columns: props.Variant({
      name: 'Columns',
      options: ['auto', 'two', 'three', 'four'],
      defaultValue: 'auto',
      tooltip: 'Auto mirrors the exported marketplace section: 3 desktop, 2 tablet, 1 mobile.',
    }),
    enableAnalytics: props.Boolean({
      name: 'Enable Analytics',
      defaultValue: true,
      tooltip:
        'Track CTA and category clicks through wf_analytics and the marketplaceLandingAnalytics DOM event.',
    }),
    experimentRole: props.Variant({
      name: 'Experiment Role',
      options: ['none', 'control', 'treatment'],
      defaultValue: 'treatment',
      tooltip: 'Used by Marketplace Landing Experiment Gate to show or hide this component during A/B tests.',
    }),
  },
});
