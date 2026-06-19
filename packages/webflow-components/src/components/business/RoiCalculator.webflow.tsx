import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { RoiCalculator } from './BusinessComponents';

export default declareComponent(RoiCalculator, {
  name: 'ROI Calculator',
  description: 'Ona-styled workflow ROI calculator for one business process',
  group: 'Business Logic',
  props: {
    eyebrow: props.Text({
      name: 'Eyebrow',
      defaultValue: 'Revenue model',
    }),
    title: props.Text({
      name: 'Title',
      defaultValue: 'Estimate the value of fixing one workflow.',
    }),
    body: props.Text({
      name: 'Body',
      defaultValue: 'Use this as a buyer-facing calculator for workflow systems, Dify automations, or agent-backed handoffs.',
    }),
    leadLabel: props.Text({
      name: 'Lead Input Label',
      defaultValue: 'Monthly qualified leads',
    }),
    conversionLabel: props.Text({
      name: 'Conversion Input Label',
      defaultValue: 'Current conversion rate (%)',
    }),
    dealValueLabel: props.Text({
      name: 'Deal Value Input Label',
      defaultValue: 'Average deal value',
    }),
    timeSavedLabel: props.Text({
      name: 'Time Saved Input Label',
      defaultValue: 'Hours saved per month',
    }),
    hourlyRateLabel: props.Text({
      name: 'Hourly Rate Input Label',
      defaultValue: 'Loaded hourly rate',
    }),
    costLabel: props.Text({
      name: 'Cost Input Label',
      defaultValue: 'Monthly platform/service cost',
    }),
    defaultMonthlyLeads: props.Text({
      name: 'Default Monthly Leads',
      defaultValue: '120',
    }),
    defaultConversionRate: props.Text({
      name: 'Default Conversion Rate',
      defaultValue: '8',
    }),
    defaultAverageDealValue: props.Text({
      name: 'Default Average Deal Value',
      defaultValue: '1800',
    }),
    defaultTimeSavedHours: props.Text({
      name: 'Default Time Saved Hours',
      defaultValue: '32',
    }),
    defaultHourlyRate: props.Text({
      name: 'Default Hourly Rate',
      defaultValue: '95',
    }),
    defaultMonthlyCost: props.Text({
      name: 'Default Monthly Cost',
      defaultValue: '1500',
    }),
    conversionLiftPercent: props.Text({
      name: 'Conversion Lift Percent',
      defaultValue: '18',
      tooltip: 'Estimated conversion lift from a cleaner workflow, expressed as a percent.',
    }),
    endpointUrl: props.Text({
      name: 'Managed Endpoint URL',
      defaultValue: '',
      tooltip: 'Optional POST endpoint for a managed ROI model. Do not put secrets in this value.',
    }),
  },
});
