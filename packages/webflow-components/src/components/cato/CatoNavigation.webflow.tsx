import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { CatoNavigation } from './CatoNavigation';

export default declareComponent(CatoNavigation, {
  name: 'Cato Navigation',
  description:
    'Cato primary navigation with About, Leadership, Board of Directors, Insights mega menu, Case Studies, Risk Radar, and Product Search.',
  group: 'Cato Supply',
  options: {
    applyTagSelectors: false
  },
  props: {
    logoImage: props.Image({
      name: 'Logo Image',
      tooltip: 'Optional Cato logo asset. If omitted, a text fallback renders.'
    }),
    homeLink: props.Link({
      name: 'Home Link',
      tooltip:
        'Preferred: select the Webflow page for the logo/home link. Home URL remains the fallback.'
    }),
    homeHref: props.Text({
      name: 'Home URL Fallback',
      defaultValue: ''
    }),
    aboutLink: props.Link({
      name: 'About Link',
      tooltip: 'Preferred: select the About page. About URL remains the fallback.'
    }),
    aboutHref: props.Text({
      name: 'About URL Fallback',
      defaultValue: ''
    }),
    aboutLabel: props.Text({
      name: 'About Label',
      defaultValue: 'About Us',
      tooltip: 'Visible text for the About trigger, including the mobile menu.'
    }),
    whoWeAreLabel: props.Text({
      name: 'Who We Are Label',
      defaultValue: 'Who We Are',
      tooltip: 'Visible text for the About dropdown item, including the mobile menu.'
    }),
    leadershipLink: props.Link({
      name: 'Leadership Link',
      tooltip:
        'Preferred: select the dedicated Leadership page. Leadership URL remains the fallback.'
    }),
    leadershipHref: props.Text({
      name: 'Leadership URL Fallback',
      defaultValue: ''
    }),
    leadershipLabel: props.Text({
      name: 'Leadership Label',
      defaultValue: 'Leadership',
      tooltip: 'Visible text for the Leadership link, including the mobile menu.'
    }),
    boardLink: props.Link({
      name: 'Board of Directors Link',
      tooltip:
        'Preferred: select the dedicated Board of Directors page. Board of Directors URL remains the fallback.'
    }),
    boardHref: props.Text({
      name: 'Board of Directors URL Fallback',
      defaultValue: ''
    }),
    boardLabel: props.Text({
      name: 'Board of Directors Label',
      defaultValue: 'Board of Directors',
      tooltip: 'Visible text for the Board of Directors link, including the mobile menu.'
    }),
    solutionsLink: props.Link({
      name: 'Solutions Link',
      tooltip: 'Preferred: select the Solutions page. Solutions URL remains the fallback.'
    }),
    solutionsHref: props.Text({
      name: 'Solutions URL Fallback',
      defaultValue: ''
    }),
    solutionsLabel: props.Text({
      name: 'Solutions Label',
      defaultValue: 'Solutions',
      tooltip: 'Visible text for the Solutions link, including the mobile menu.'
    }),
    technologyLink: props.Link({
      name: 'Technology Link',
      tooltip: 'Preferred: select the Technology page. Technology URL remains the fallback.'
    }),
    technologyHref: props.Text({
      name: 'Technology URL Fallback',
      defaultValue: ''
    }),
    technologyLabel: props.Text({
      name: 'Technology Label',
      defaultValue: 'Technology',
      tooltip: 'Visible text for the Technology link, including the mobile menu.'
    }),
    insightsLink: props.Link({
      name: 'Insights Link',
      tooltip:
        'Preferred: select the Insights page. Also drives the mega-menu intro CTA unless Mega Menu Intro CTA Link is set.'
    }),
    insightsHref: props.Text({
      name: 'Insights URL Fallback',
      defaultValue: ''
    }),
    insightsLabel: props.Text({
      name: 'Insights Label',
      defaultValue: 'Insights',
      tooltip: 'Visible text for the Insights trigger, including the mobile menu.'
    }),
    insightsHomeLink: props.Link({
      name: 'Mega Menu Intro CTA Link',
      tooltip: 'Optional override for the mega-menu intro CTA.'
    }),
    resiliencyLink: props.Link({
      name: 'Resiliency Report Alerts Link',
      tooltip: 'Preferred: select the Resiliency Report Alerts page used in the mega menu.'
    }),
    researchLink: props.Link({
      name: 'Industry Research Link',
      tooltip: 'Preferred: select the Industry Research page used in the mega menu.'
    }),
    newsroomLink: props.Link({
      name: 'Newsroom Link',
      tooltip: 'Preferred: select the Newsroom page used in the mega menu.'
    }),
    caseStudiesLink: props.Link({
      name: 'Case Studies Link',
      tooltip: 'Preferred: select the Case Studies page. Case Studies URL remains the fallback.'
    }),
    caseStudiesHref: props.Text({
      name: 'Case Studies URL Fallback',
      defaultValue: ''
    }),
    caseStudiesLabel: props.Text({
      name: 'Case Studies Label',
      defaultValue: 'Case Studies',
      tooltip: 'Visible text for the Case Studies link, including the mobile menu.'
    }),
    riskRadarLink: props.Link({
      name: 'Risk Radar Link',
      tooltip: 'Optional Webflow link override. Risk Radar URL remains the fallback.'
    }),
    riskRadarHref: props.Text({
      name: 'Risk Radar URL Fallback',
      defaultValue: 'https://app.catosupply.com/risk_radar/'
    }),
    riskRadarLabel: props.Text({
      name: 'Risk Radar Label',
      defaultValue: 'Risk Radar',
      tooltip: 'Visible text for the Risk Radar link, including the mobile menu.'
    }),
    productSearchLink: props.Link({
      name: 'Product Search Link',
      tooltip: 'Optional Webflow link override. Product Search URL remains the fallback.'
    }),
    productSearchHref: props.Text({
      name: 'Product Search URL Fallback',
      defaultValue: 'https://app.catosupply.com/product_search/'
    }),
    productSearchLabel: props.Text({
      name: 'Product Search Label',
      defaultValue: 'Product Search'
    }),
    mobileMenuLabel: props.Text({
      name: 'Mobile Menu Button Label',
      defaultValue: 'Menu'
    }),
    mobileMenuCloseLabel: props.Text({
      name: 'Mobile Menu Close Label',
      defaultValue: 'Close'
    }),
    introKicker: props.Text({
      name: 'Mega Menu Intro Kicker',
      defaultValue: ''
    }),
    heading: props.Text({
      name: 'Mega Menu Heading',
      defaultValue: 'Procurement Intelligence for Resilient Care'
    }),
    summary: props.Text({
      name: 'Mega Menu Summary',
      defaultValue: ''
    }),
    introCtaLabel: props.Text({
      name: 'Mega Menu Intro CTA Label',
      defaultValue: 'Explore Cato Insights'
    }),
    browseKicker: props.Text({
      name: 'Mega Menu Browse Kicker',
      defaultValue: ''
    }),
    featureTitle: props.Text({
      name: 'Mega Menu Feature Title',
      defaultValue: 'Resiliency Report Alerts'
    }),
    featureSummary: props.Text({
      name: 'Mega Menu Feature Summary',
      defaultValue: 'Active supply disruptions and market signals for care continuity.'
    }),
    featureCta: props.Text({
      name: 'Mega Menu Feature CTA',
      defaultValue: ''
    }),
    showFeatureCta: props.Boolean({
      name: 'Mega Menu Show Feature CTA',
      defaultValue: false,
      tooltip: 'Keep off unless the green mega-menu feature card should show a bottom text CTA.'
    }),
    featureLabel: props.Text({
      name: 'Mega Menu Feature Label',
      defaultValue: 'Featured'
    }),
    featureHref: props.Text({
      name: 'Mega Menu Feature URL',
      defaultValue: '',
      tooltip: 'Optional override URL for the green mega-menu feature card.'
    }),
    featureItemsJson: props.Text({
      name: 'Mega Menu Feature Items JSON',
      defaultValue: '',
      tooltip:
        'Optional JSON array for the green mega-menu feature card list: [{title, resourceType}].'
    }),
    showFeatureItems: props.Boolean({
      name: 'Mega Menu Show Feature Items',
      defaultValue: true
    }),
    featureItemLimit: props.Number({
      name: 'Mega Menu Feature Item Limit',
      defaultValue: 3
    }),
    fixed: props.Boolean({
      name: 'Sticky Header',
      defaultValue: false
    }),
    showInsightsMegaMenu: props.Boolean({
      name: 'Show Insights Mega Menu',
      defaultValue: true
    }),
    categoriesJson: props.Text({
      name: 'Categories JSON',
      defaultValue: '',
      tooltip: 'Optional JSON array overriding the default Cato Insights mega-menu categories.'
    }),
    resiliencyCategoryLabel: props.Text({
      name: 'Resiliency Category Label',
      defaultValue: '',
      tooltip: 'Optional per-instance rename for Resiliency Report Alerts in the mega menu.'
    }),
    researchCategoryLabel: props.Text({
      name: 'Research Category Label',
      defaultValue: '',
      tooltip: 'Optional per-instance rename for Industry Research in the mega menu.'
    }),
    resourcesCategoryLabel: props.Text({
      name: 'Resources Category Label',
      defaultValue: '',
      tooltip: 'Optional per-instance rename for Resource Library in the mega menu.'
    }),
    newsroomCategoryLabel: props.Text({
      name: 'Newsroom Category Label',
      defaultValue: '',
      tooltip: 'Optional per-instance rename for Newsroom in the mega menu.'
    }),
    itemsJson: props.Text({
      name: 'Items JSON',
      defaultValue: '',
      tooltip: 'Optional JSON array overriding the default Cato Insights mega-menu items.'
    }),
    itemsEndpointUrl: props.Text({
      name: 'Items Endpoint URL',
      defaultValue:
        'https://cato-supply-insights-cms.createsomething.workers.dev/api/cato/insights',
      tooltip: 'Public JSON endpoint that returns normalized Insight items for the mega menu.'
    }),
    fetchItems: props.Boolean({
      name: 'Fetch Endpoint Items',
      defaultValue: true,
      tooltip: 'Fetch Items Endpoint URL in the browser and render returned mega-menu items.'
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
