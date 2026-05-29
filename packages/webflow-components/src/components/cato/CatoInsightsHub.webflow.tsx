import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { CatoInsightsHub } from './CatoInsights';

export default declareComponent(CatoInsightsHub, {
  name: 'Cato Insights Hub',
  description: 'Cato Insights landing surface with category cards and latest CMS-style content, based on the exported Webflow project.',
  group: 'Cato Supply',
  options: {
    applyTagSelectors: true,
  },
  props: {
    title: props.Text({
      name: 'Hero Title',
      defaultValue: 'Supply Chain Insights for Outstanding Patient Care',
    }),
    summary: props.Text({
      name: 'Hero Summary',
      defaultValue: 'Stay ahead of disruptions with practical procurement intelligence.',
    }),
    featuredPanelLabel: props.Text({
      name: 'Panel Label',
      defaultValue: 'Featured now',
    }),
    featuredPanelTitle: props.Text({
      name: 'Panel Title',
      defaultValue: 'Relevant disruptions and strategic resources.',
    }),
    featuredPanelSummary: props.Text({
      name: 'Panel Summary',
      defaultValue: 'Use this area to feature the market signals, whitepapers, and company updates that matter most from a business perspective.',
    }),
    featuredPanelCta: props.Text({
      name: 'Panel CTA',
      defaultValue: '',
    }),
    previewEyebrow: props.Text({
      name: 'Preview Eyebrow',
      defaultValue: 'Insights hub',
    }),
    previewTitle: props.Text({
      name: 'Preview Title',
      defaultValue: 'Actionable Supply Chain Insights for Healthcare Leaders',
    }),
    previewSummary: props.Text({
      name: 'Preview Summary',
      defaultValue: 'Browse by content type to access active supply disruptions, overcome market volatility, and apply sourcing strategies that increase supply chain resilience.',
    }),
    itemLimit: props.Number({
      name: 'Item Limit',
      defaultValue: 4,
    }),
    showFilterRail: props.Boolean({
      name: 'Show Filter Rail',
      defaultValue: false,
      tooltip: 'Optional review layout with browse-by-type filters.',
    }),
    showCmsModel: props.Boolean({
      name: 'Show CMS Model Notes',
      defaultValue: false,
    }),
    categoriesJson: props.Text({
      name: 'Categories JSON',
      defaultValue: '',
      tooltip: 'Optional JSON array overriding the default Cato categories.',
    }),
    itemsJson: props.Text({
      name: 'Items JSON',
      defaultValue: '',
      tooltip: 'Optional JSON array overriding the default Cato insight cards.',
    }),
    linkMode: props.Variant({
      name: 'Link Mode',
      options: ['webflow', 'export'],
      defaultValue: 'webflow',
    }),
    pathPrefix: props.Text({
      name: 'Path Prefix',
      defaultValue: '',
      tooltip: 'Optional URL prefix, such as /insights-preview.',
    }),
  },
});
