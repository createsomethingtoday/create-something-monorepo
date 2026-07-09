import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { CatoInsightsHub } from './CatoInsights';

export default declareComponent(CatoInsightsHub, {
  name: 'Cato Insights Hub',
  description:
    'Cato Insights landing surface with category cards and latest CMS-style content, based on the exported Webflow project.',
  group: 'Cato Supply',
  options: {
    applyTagSelectors: true
  },
  props: {
    title: props.Text({
      name: 'Hero Title',
      defaultValue: 'Supply Chain Insights to Protect Clinical Continuity'
    }),
    summary: props.Text({
      name: 'Hero Summary',
      defaultValue: 'Stay ahead of disruptions with practical procurement intelligence.'
    }),
    featuredPanelLabel: props.Text({
      name: 'Panel Label',
      defaultValue: '',
      tooltip: 'Optional eyebrow above the featured report card. Leave blank to match the current Insights hero.'
    }),
    featuredPanelTitle: props.Text({
      name: 'Panel Title',
      defaultValue: "Medline's West Coast Medical-Surgical Hub Fire"
    }),
    featuredPanelSummary: props.Text({
      name: 'Panel Summary',
      defaultValue:
        "A June 11th fire destroyed Medline's primary med-surg hub for Northern and Central California, disrupting roughly 335 high-volume SKUs."
    }),
    featuredPanelCta: props.Text({
      name: 'Panel CTA',
      defaultValue: 'Access Report'
    }),
    featuredPanelLink: props.Link({
      name: 'Panel CTA Link',
      tooltip:
        'Optional override for the featured panel CTA. Falls back to the Resiliency Report Alerts link.'
    }),
    previewEyebrow: props.Text({
      name: 'Preview Eyebrow',
      defaultValue: ''
    }),
    previewTitle: props.Text({
      name: 'Preview Title',
      defaultValue: 'Actionable Supply Chain Insights for Healthcare Leaders'
    }),
    previewSummary: props.Text({
      name: 'Preview Summary',
      defaultValue:
        'Browse by content type to access active supply disruptions, overcome market volatility, and apply sourcing strategies that increase supply chain resilience.'
    }),
    itemLimit: props.Number({
      name: 'Item Limit',
      defaultValue: 4
    }),
    showFilterRail: props.Boolean({
      name: 'Show Filter Rail',
      defaultValue: true,
      tooltip: 'Optional review layout with browse-by-type filters.'
    }),
    showPreviewHeader: props.Boolean({
      name: 'Show Preview Header',
      defaultValue: true,
      tooltip: 'Optional headline block above the latest insights grid.'
    }),
    showCmsModel: props.Boolean({
      name: 'Show CMS Model Notes',
      defaultValue: false
    }),
    insightsHomeLink: props.Link({
      name: 'Insights Home Link',
      tooltip: 'Preferred: select the Insights page used by the filter rail All insights link.'
    }),
    resiliencyLink: props.Link({
      name: 'Resiliency Report Alerts Link',
      tooltip:
        'Preferred: select the Resiliency Report Alerts page used by category cards and filters.'
    }),
    researchLink: props.Link({
      name: 'Industry Research Link',
      tooltip: 'Preferred: select the Industry Research page used by category cards and filters.'
    }),
    newsroomLink: props.Link({
      name: 'Newsroom Link',
      tooltip: 'Preferred: select the Newsroom page used by category cards and filters.'
    }),
    resiliencyCardTitle: props.Text({
      name: 'Resiliency Card Title',
      defaultValue: 'Supply volatility tracking.'
    }),
    resiliencyCardSummary: props.Text({
      name: 'Resiliency Card Summary',
      defaultValue: 'Access market signals for active supply disruptions.'
    }),
    resiliencyCardCta: props.Text({
      name: 'Resiliency Card CTA',
      defaultValue: 'Explore alerts'
    }),
    researchCardTitle: props.Text({
      name: 'Research Card Title',
      defaultValue: 'Procurement strategy unpacked.'
    }),
    researchCardSummary: props.Text({
      name: 'Research Card Summary',
      defaultValue: 'Explore supply chain resilience best practices.'
    }),
    researchCardCta: props.Text({
      name: 'Research Card CTA',
      defaultValue: 'Browse research'
    }),
    newsroomCardTitle: props.Text({
      name: 'Newsroom Card Title',
      defaultValue: 'Newsroom'
    }),
    newsroomCardSummary: props.Text({
      name: 'Newsroom Card Summary',
      defaultValue: 'Follow Cato launches, events, press notes, and milestones.'
    }),
    newsroomCardCta: props.Text({
      name: 'Newsroom Card CTA',
      defaultValue: 'Visit newsroom'
    }),
    categoriesJson: props.Text({
      name: 'Categories JSON',
      defaultValue: '',
      tooltip: 'Optional JSON array overriding the default Cato categories.'
    }),
    itemsJson: props.Text({
      name: 'Items JSON',
      defaultValue: '',
      tooltip: 'Optional JSON array overriding the default Cato insight cards.'
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
      tooltip: 'Fetch Items Endpoint URL in the browser and render returned hub items.'
    }),
    linkMode: props.Variant({
      name: 'Link Mode',
      options: ['webflow', 'export'],
      defaultValue: 'webflow'
    }),
    pathPrefix: props.Text({
      name: 'Path Prefix',
      defaultValue: '',
      tooltip: 'Optional URL prefix, such as /insights-preview.'
    })
  }
});
