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
    introKicker: props.Text({
      name: 'Intro Kicker',
      defaultValue: 'Insights',
    }),
    heading: props.Text({
      name: 'Heading',
      defaultValue: 'Procurement Intelligence for Resilient Care',
    }),
    summary: props.Text({
      name: 'Summary',
      defaultValue: 'Current analysis of the dynamics shaping the healthcare supply chain.',
    }),
    introCtaLabel: props.Text({
      name: 'Intro CTA Label',
      defaultValue: 'Explore Cato Insights',
    }),
    browseKicker: props.Text({
      name: 'Browse Kicker',
      defaultValue: 'Browse insights',
    }),
    resiliencyMenuTitle: props.Text({
      name: 'Resiliency Menu Title',
      defaultValue: 'Resiliency Report Alerts',
    }),
    resiliencyMenuSummary: props.Text({
      name: 'Resiliency Menu Summary',
      defaultValue: 'Access market signals for active supply disruptions.',
    }),
    researchMenuTitle: props.Text({
      name: 'Research Menu Title',
      defaultValue: 'Cato Research',
    }),
    researchMenuSummary: props.Text({
      name: 'Research Menu Summary',
      defaultValue: 'Explore supply chain resilience best practices.',
    }),
    newsroomMenuTitle: props.Text({
      name: 'Newsroom Menu Title',
      defaultValue: 'Newsroom',
    }),
    newsroomMenuSummary: props.Text({
      name: 'Newsroom Menu Summary',
      defaultValue: 'Follow Cato launches, events, press notes, and milestones.',
    }),
    featureLabel: props.Text({
      name: 'Feature Label',
      defaultValue: 'Featured',
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
    featureItemOneTitle: props.Text({
      name: 'Feature Item 1 Title',
      defaultValue: 'Vascular, Angiographic, and Dialysis Kits Shortages',
    }),
    featureItemOneMeta: props.Text({
      name: 'Feature Item 1 Meta',
      defaultValue: 'Resiliency Report',
    }),
    featureItemTwoTitle: props.Text({
      name: 'Feature Item 2 Title',
      defaultValue: 'Nasal Oral ETT Backorders',
    }),
    featureItemTwoMeta: props.Text({
      name: 'Feature Item 2 Meta',
      defaultValue: 'Resiliency Report',
    }),
    featureItemThreeTitle: props.Text({
      name: 'Feature Item 3 Title',
      defaultValue: 'Neurosponges Disruption',
    }),
    featureItemThreeMeta: props.Text({
      name: 'Feature Item 3 Meta',
      defaultValue: 'Resiliency Report',
    }),
    insightsHomeLink: props.Link({
      name: 'Insights Home Link',
      tooltip: 'Preferred: select the Insights page. Falls back to Link Mode and Path Prefix.',
    }),
    resiliencyLink: props.Link({
      name: 'Resiliency Report Alerts Link',
      tooltip: 'Preferred: select the Resiliency Report Alerts page.',
    }),
    researchLink: props.Link({
      name: 'Cato Research Link',
      tooltip: 'Preferred: select the Cato Research page.',
    }),
    whitepapersLink: props.Link({
      name: 'Whitepapers Link',
      tooltip: 'Preferred: select the Whitepapers page.',
    }),
    newsroomLink: props.Link({
      name: 'Newsroom Link',
      tooltip: 'Preferred: select the Newsroom page.',
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
      tooltip: 'Fetch Items Endpoint URL in the browser and render returned menu items.',
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
