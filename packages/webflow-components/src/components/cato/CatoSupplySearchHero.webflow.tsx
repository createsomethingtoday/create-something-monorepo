import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { CatoSupplySearchHero } from './CatoProductSearch';

export default declareComponent(CatoSupplySearchHero, {
  name: 'Cato Supply Search Hero',
  description: 'Homepage hero with product search and Risk Radar catalog, based on the exported Cato home page.',
  group: 'Cato Supply',
  options: {
    applyTagSelectors: true,
  },
  props: {
    eyebrow: props.Text({
      name: 'Eyebrow',
      defaultValue: '',
    }),
    heading: props.Text({
      name: 'Heading',
      defaultValue: 'What Supply Gap Can We Help You Solve Today?',
    }),
    body: props.Text({
      name: 'Body',
      defaultValue: 'Cato finds out-of-stock, backordered, and on-allocation medical supplies to help your health system ensure uninterrupted care delivery.',
    }),
    placeholder: props.Text({
      name: 'Search Placeholder',
      defaultValue: 'Search by product, brand, manufacturer, part number, or description',
    }),
    buttonLabel: props.Text({
      name: 'Search Button',
      defaultValue: 'Search',
    }),
    productSearchUrl: props.Text({
      name: 'Product Search URL',
      defaultValue: 'https://app.catosupply.com/product_search/',
    }),
    initialQuery: props.Text({
      name: 'Initial Query',
      defaultValue: '',
    }),
    showRiskRadar: props.Boolean({
      name: 'Show Risk Radar',
      defaultValue: true,
    }),
    title: props.Text({
      name: 'Risk Radar Title',
      defaultValue: 'Disrupted Medical Supplies Recently Sourced',
    }),
    summary: props.Text({
      name: 'Risk Radar Summary',
      defaultValue: 'Access our live catalog here to track SKUs affected by market volatility.',
    }),
    ctaLabel: props.Text({
      name: 'Risk Radar CTA',
      defaultValue: 'View Risk Radar',
    }),
    riskRadarUrl: props.Text({
      name: 'Risk Radar URL',
      defaultValue: 'https://app.catosupply.com/risk_radar/',
    }),
    apiUrl: props.Text({
      name: 'Risk Radar API URL',
      defaultValue: 'https://app.catosupply.com/api/variations?tag=Risk+Radar',
    }),
    rowsJson: props.Text({
      name: 'Fallback Rows JSON',
      defaultValue: '',
    }),
    fetchEnabled: props.Boolean({
      name: 'Fetch Live Data',
      defaultValue: true,
    }),
    maxRows: props.Number({
      name: 'Max Rows',
      defaultValue: 24,
    }),
    autoScroll: props.Boolean({
      name: 'Auto Scroll',
      defaultValue: true,
    }),
  },
});
