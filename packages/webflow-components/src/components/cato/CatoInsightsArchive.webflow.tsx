import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { CatoInsightsArchive } from './CatoInsights';

export default declareComponent(CatoInsightsArchive, {
  name: 'Cato Insights Archive',
  description: 'Focused Cato archive page for Resiliency Reports, Research, Resources, or Newsroom.',
  group: 'Cato Supply',
  options: {
    applyTagSelectors: true,
  },
  props: {
    categoryId: props.Variant({
      name: 'Archive',
      options: ['resiliency', 'research', 'resources', 'newsroom'],
      defaultValue: 'resiliency',
    }),
    categorySlug: props.Text({
      name: 'Archive Slug',
      defaultValue: '',
      tooltip: 'Optional CMS slug for Insight Categories, such as resource-library or newsroom.',
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
    itemsEndpointUrl: props.Text({
      name: 'Items Endpoint URL',
      defaultValue: '',
      tooltip: 'Public JSON endpoint that returns normalized Insight items. Do not use a secret Webflow API URL here.',
    }),
    fetchItems: props.Boolean({
      name: 'Fetch Endpoint Items',
      defaultValue: true,
      tooltip: 'Fetch Items Endpoint URL in the browser and render returned archive items.',
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
