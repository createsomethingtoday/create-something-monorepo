import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { CatoRiskRadarCatalog } from './CatoProductSearch';

export default declareComponent(CatoRiskRadarCatalog, {
  name: 'Cato Risk Radar Catalog',
  description: 'Live Risk Radar table component replacing the exported custom-code embed.',
  group: 'Cato Supply',
  options: {
    applyTagSelectors: true,
  },
  props: {
    title: props.Text({
      name: 'Title',
      defaultValue: 'Disrupted Medical Supplies Recently Sourced',
    }),
    summary: props.Text({
      name: 'Summary',
      defaultValue: 'Access our live catalog here to track SKUs affected by market volatility.',
    }),
    ctaLabel: props.Text({
      name: 'CTA Label',
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
      tooltip: 'Optional JSON rows used if the API is unavailable in Designer.',
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
