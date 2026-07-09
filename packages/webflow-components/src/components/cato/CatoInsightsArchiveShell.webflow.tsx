import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { CatoInsightsArchiveShell } from './CatoInsights';

export default declareComponent(CatoInsightsArchiveShell, {
  name: 'Cato Insights Archive Shell',
  description:
    'CMS-ready archive page shell that renders a cached public Insights endpoint inside the archive panel.',
  group: 'Cato Supply',
  options: {
    applyTagSelectors: true
  },
  props: {
    categoryId: props.Variant({
      name: 'Archive',
      options: ['resiliency', 'research', 'resources', 'newsroom'],
      defaultValue: 'resiliency'
    }),
    categorySlug: props.Text({
      name: 'Archive Slug',
      defaultValue: '',
      tooltip: 'Optional CMS slug for Insight Categories, such as resource-library or newsroom.'
    }),
    showHero: props.Boolean({
      name: 'Show Hero',
      defaultValue: true
    }),
    showArchiveIntro: props.Boolean({
      name: 'Show Archive Intro',
      defaultValue: true
    }),
    showSubscribe: props.Boolean({
      name: 'Show Hero Subscribe Element',
      defaultValue: true,
      tooltip: 'Turns the hero card into the email-alert signup element on archives with subscribe support.'
    }),
    showItems: props.Boolean({
      name: 'Show Archive Items',
      defaultValue: true,
      tooltip: 'Renders the public endpoint items inside the archive panel.'
    }),
    categoriesJson: props.Text({
      name: 'Categories JSON',
      defaultValue: ''
    }),
    itemsJson: props.Text({
      name: 'Items JSON',
      defaultValue: '',
      tooltip: 'Fallback item JSON used before the endpoint responds.'
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
