import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { CatoInsightsMegaMenu } from './CatoInsights';

export default declareComponent(CatoInsightsMegaMenu, {
  name: 'Cato Insights Mega Menu',
  description: 'Self-contained Insights mega menu content from the exported Cato navigation.',
  group: 'Cato Supply',
  options: {
    applyTagSelectors: true
  },
  props: {
    introKicker: props.Text({
      name: 'Intro Kicker',
      defaultValue: ''
    }),
    heading: props.Text({
      name: 'Heading',
      defaultValue: 'Procurement Intelligence for Resilient Care'
    }),
    summary: props.Text({
      name: 'Summary',
      defaultValue: ''
    }),
    introCtaLabel: props.Text({
      name: 'Intro CTA Label',
      defaultValue: 'Explore Cato Insights'
    }),
    browseKicker: props.Text({
      name: 'Browse Kicker',
      defaultValue: ''
    }),
    featureTitle: props.Text({
      name: 'Feature Title',
      defaultValue: 'Resiliency Report Alerts'
    }),
    featureSummary: props.Text({
      name: 'Feature Summary',
      defaultValue: 'Active supply disruptions and market signals for care continuity.'
    }),
    featureCta: props.Text({
      name: 'Feature CTA',
      defaultValue: ''
    }),
    showFeatureCta: props.Boolean({
      name: 'Show Feature CTA',
      defaultValue: false,
      tooltip: 'Keep off unless the green feature card should show a bottom text CTA.'
    }),
    featureLabel: props.Text({
      name: 'Feature Label',
      defaultValue: 'Featured'
    }),
    featureHref: props.Text({
      name: 'Feature URL',
      defaultValue: '',
      tooltip: 'Optional override URL for the green feature card.'
    }),
    featureItemsJson: props.Text({
      name: 'Feature Items JSON',
      defaultValue: '',
      tooltip: 'Optional JSON array for the green feature card list: [{title, resourceType}].'
    }),
    showFeatureItems: props.Boolean({
      name: 'Show Feature Items',
      defaultValue: true
    }),
    featureItemLimit: props.Number({
      name: 'Feature Item Limit',
      defaultValue: 3
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
      tooltip: 'Fetch Items Endpoint URL in the browser and render returned menu items.'
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
