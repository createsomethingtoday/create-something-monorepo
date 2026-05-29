import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { CatoInsightsArchive } from './CatoInsights';

export default declareComponent(CatoInsightsArchive, {
  name: 'Cato Insight Category Archive',
  description: 'CMS-template archive that resolves the active Insight Category from the page slug.',
  group: 'Cato Supply',
  options: {
    applyTagSelectors: true,
  },
  props: {
    categorySlug: props.Text({
      name: 'Archive Slug',
      defaultValue: '',
      tooltip: 'Bind to the Insight Categories slug field, or leave blank to infer the slug from the URL.',
    }),
    categoryId: props.Variant({
      name: 'Fallback Archive',
      options: ['resiliency', 'research', 'resources', 'newsroom'],
      defaultValue: 'resiliency',
    }),
    showSubscribe: props.Boolean({
      name: 'Show Subscribe Block',
      defaultValue: true,
      tooltip: 'Only renders on categories configured with subscribe support.',
    }),
    categoriesJson: props.Text({
      name: 'Categories JSON',
      defaultValue: '',
    }),
    itemsJson: props.Text({
      name: 'Items JSON',
      defaultValue: '',
    }),
    linkMode: props.Variant({
      name: 'Link Mode',
      options: ['webflow', 'export'],
      defaultValue: 'webflow',
    }),
    pathPrefix: props.Text({
      name: 'Path Prefix',
      defaultValue: '',
    }),
  },
});
