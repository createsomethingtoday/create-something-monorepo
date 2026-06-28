import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { CatoNavigation } from './CatoNavigation';

export default declareComponent(CatoNavigation, {
  name: 'Cato Navigation',
  description: 'Cato primary navigation with About, Leadership, Insights mega menu, Case Studies, Risk Radar, and Product Search.',
  group: 'Cato Supply',
  options: {
    applyTagSelectors: false,
  },
  props: {
    logoImage: props.Image({
      name: 'Logo Image',
      tooltip: 'Optional Cato logo asset. If omitted, a text fallback renders.',
    }),
    homeLink: props.Link({
      name: 'Home Link',
      tooltip: 'Preferred: select the Webflow page for the logo/home link. Home URL remains the fallback.',
    }),
    homeHref: props.Text({
      name: 'Home URL Fallback',
      defaultValue: '',
    }),
    aboutLink: props.Link({
      name: 'About Link',
      tooltip: 'Preferred: select the About page. About URL remains the fallback.',
    }),
    aboutHref: props.Text({
      name: 'About URL Fallback',
      defaultValue: '',
    }),
    leadershipLink: props.Link({
      name: 'Leadership Link',
      tooltip: 'Preferred: select the dedicated Leadership page. Leadership URL remains the fallback.',
    }),
    leadershipHref: props.Text({
      name: 'Leadership URL Fallback',
      defaultValue: '',
    }),
    solutionsLink: props.Link({
      name: 'Solutions Link',
      tooltip: 'Preferred: select the Solutions page. Solutions URL remains the fallback.',
    }),
    solutionsHref: props.Text({
      name: 'Solutions URL Fallback',
      defaultValue: '',
    }),
    technologyLink: props.Link({
      name: 'Technology Link',
      tooltip: 'Preferred: select the Technology page. Technology URL remains the fallback.',
    }),
    technologyHref: props.Text({
      name: 'Technology URL Fallback',
      defaultValue: '',
    }),
    insightsLink: props.Link({
      name: 'Insights Link',
      tooltip: 'Preferred: select the Insights page. Also drives the Insights Home link inside the mega menu unless Insights Home Link is set.',
    }),
    insightsHref: props.Text({
      name: 'Insights URL Fallback',
      defaultValue: '',
    }),
    insightsHomeLink: props.Link({
      name: 'Insights Home Link',
      tooltip: 'Optional override for the Insights Home link inside the mega menu.',
    }),
    resiliencyLink: props.Link({
      name: 'Resiliency Report Alerts Link',
      tooltip: 'Preferred: select the Resiliency Report Alerts page used in the mega menu.',
    }),
    researchLink: props.Link({
      name: 'Cato Research Link',
      tooltip: 'Preferred: select the Cato Research page used in the mega menu.',
    }),
    newsroomLink: props.Link({
      name: 'Newsroom Link',
      tooltip: 'Preferred: select the Newsroom page used in the mega menu.',
    }),
    caseStudiesLink: props.Link({
      name: 'Case Studies Link',
      tooltip: 'Preferred: select the Case Studies page. Case Studies URL remains the fallback.',
    }),
    caseStudiesHref: props.Text({
      name: 'Case Studies URL Fallback',
      defaultValue: '',
    }),
    riskRadarLink: props.Link({
      name: 'Risk Radar Link',
      tooltip: 'Optional Webflow link override. Risk Radar URL remains the fallback.',
    }),
    riskRadarHref: props.Text({
      name: 'Risk Radar URL Fallback',
      defaultValue: 'https://app.catosupply.com/risk_radar/',
    }),
    productSearchLink: props.Link({
      name: 'Product Search Link',
      tooltip: 'Optional Webflow link override. Product Search URL remains the fallback.',
    }),
    productSearchHref: props.Text({
      name: 'Product Search URL Fallback',
      defaultValue: 'https://app.catosupply.com/product_search/',
    }),
    productSearchLabel: props.Text({
      name: 'Product Search Label',
      defaultValue: 'Product Search',
    }),
    introKicker: props.Text({
      name: 'Mega Menu Intro Kicker',
      defaultValue: '',
    }),
    heading: props.Text({
      name: 'Mega Menu Heading',
      defaultValue: 'Procurement Intelligence for Resilient Care',
    }),
    summary: props.Text({
      name: 'Mega Menu Summary',
      defaultValue: '',
    }),
    introCtaLabel: props.Text({
      name: 'Mega Menu Intro CTA Label',
      defaultValue: 'Explore Cato Insights',
    }),
    browseKicker: props.Text({
      name: 'Mega Menu Browse Kicker',
      defaultValue: '',
    }),
    insightsHomeTitle: props.Text({
      name: 'Mega Menu Home Title',
      defaultValue: 'Insights Home',
    }),
    insightsHomeSummary: props.Text({
      name: 'Mega Menu Home Summary',
      defaultValue: 'All reports, research, resources, and newsroom updates.',
    }),
    featureTitle: props.Text({
      name: 'Mega Menu Feature Title',
      defaultValue: 'Resiliency Report Alerts',
    }),
    featureSummary: props.Text({
      name: 'Mega Menu Feature Summary',
      defaultValue: 'Active supply disruptions and market signals for care continuity.',
    }),
    featureCta: props.Text({
      name: 'Mega Menu Feature CTA',
      defaultValue: '',
    }),
    showFeatureCta: props.Boolean({
      name: 'Mega Menu Show Feature CTA',
      defaultValue: false,
      tooltip: 'Keep off unless the green mega-menu feature card should show a bottom text CTA.',
    }),
    featureLabel: props.Text({
      name: 'Mega Menu Feature Label',
      defaultValue: 'Featured',
    }),
    featureHref: props.Text({
      name: 'Mega Menu Feature URL',
      defaultValue: '',
      tooltip: 'Optional override URL for the green mega-menu feature card.',
    }),
    featureItemsJson: props.Text({
      name: 'Mega Menu Feature Items JSON',
      defaultValue: '',
      tooltip: 'Optional JSON array for the green mega-menu feature card list: [{title, resourceType}].',
    }),
    showFeatureItems: props.Boolean({
      name: 'Mega Menu Show Feature Items',
      defaultValue: true,
    }),
    featureItemLimit: props.Number({
      name: 'Mega Menu Feature Item Limit',
      defaultValue: 4,
    }),
    fixed: props.Boolean({
      name: 'Sticky Header',
      defaultValue: false,
    }),
    showInsightsMegaMenu: props.Boolean({
      name: 'Show Insights Mega Menu',
      defaultValue: true,
    }),
    categoriesJson: props.Text({
      name: 'Categories JSON',
      defaultValue: '',
      tooltip: 'Optional JSON array overriding the default Cato Insights mega-menu categories.',
    }),
    itemsJson: props.Text({
      name: 'Items JSON',
      defaultValue: '',
      tooltip: 'Optional JSON array overriding the default Cato Insights mega-menu items.',
    }),
    itemsEndpointUrl: props.Text({
      name: 'Items Endpoint URL',
      defaultValue: '',
      tooltip: 'Public JSON endpoint that returns normalized Insight items for the mega menu.',
    }),
    fetchItems: props.Boolean({
      name: 'Fetch Endpoint Items',
      defaultValue: true,
      tooltip: 'Fetch Items Endpoint URL in the browser and render returned mega-menu items.',
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
