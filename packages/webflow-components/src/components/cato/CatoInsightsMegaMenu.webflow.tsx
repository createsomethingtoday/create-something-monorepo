import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { CatoInsightsMegaMenu } from './CatoInsights';

export default declareComponent(CatoInsightsMegaMenu, {
  name: 'Cato Insights Mega Menu',
  description: 'Self-contained Insights mega menu content from the exported Cato navigation.',
  group: 'Cato Supply',
  options: {
    applyTagSelectors: true,
  },
  props: {
    heading: props.Text({
      name: 'Heading',
      defaultValue: 'Procurement Intelligence for Resilient Care',
    }),
    summary: props.Text({
      name: 'Summary',
      defaultValue: 'Current analysis of the dynamics shaping the healthcare supply chain.',
    }),
    featureTitle: props.Text({
      name: 'Feature Title',
      defaultValue: 'Resiliency Report Alerts',
    }),
    featureSummary: props.Text({
      name: 'Feature Summary',
      defaultValue: 'Active supply disruptions and market signals for care continuity.',
    }),
    featureCta: props.Text({
      name: 'Feature CTA',
      defaultValue: 'Explore Our Insights',
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
