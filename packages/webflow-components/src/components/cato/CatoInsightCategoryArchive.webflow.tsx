import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { CatoInsightsArchive } from './CatoInsights';

export default declareComponent(CatoInsightsArchive, {
  name: 'Cato Insight Category Archive',
  description: 'CMS-template archive that resolves the active Insight Category from the page slug.',
  group: 'Cato Supply',
  options: {
    applyTagSelectors: true
  },
  props: {
    categorySlug: props.Text({
      name: 'Archive Slug',
      defaultValue: '',
      tooltip:
        'Bind to the Insight Categories slug field, or leave blank to infer the slug from the URL.'
    }),
    categoryId: props.Variant({
      name: 'Fallback Archive',
      options: ['resiliency', 'research', 'resources', 'newsroom'],
      defaultValue: 'resiliency'
    }),
    showSubscribe: props.Boolean({
      name: 'Show Hero Subscribe Element',
      defaultValue: true,
      tooltip: 'Turns the hero card into the email-alert signup element on archives with subscribe support.'
    }),
    categoriesJson: props.Text({
      name: 'Categories JSON',
      defaultValue: ''
    }),
    itemsJson: props.Text({
      name: 'Items JSON',
      defaultValue: ''
    }),
    itemsEndpointUrl: props.Text({
      name: 'Items Endpoint URL',
      defaultValue:
        'https://cato-supply-insights-cms.createsomething.workers.dev/api/cato/insights',
      tooltip:
        'Public JSON endpoint that returns normalized Insight items. Do not use a secret Webflow API URL here.'
    }),
    fetchItems: props.Boolean({
      name: 'Fetch Endpoint Items',
      defaultValue: true,
      tooltip: 'Fetch Items Endpoint URL in the browser and render returned archive items.'
    }),
    linkMode: props.Variant({
      name: 'Link Mode',
      options: ['webflow', 'export'],
      defaultValue: 'webflow'
    }),
    pathPrefix: props.Text({
      name: 'Path Prefix',
      defaultValue: ''
    })
  }
});
