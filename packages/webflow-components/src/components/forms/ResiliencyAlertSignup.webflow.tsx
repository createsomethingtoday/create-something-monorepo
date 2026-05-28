import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { ResiliencyAlertSignup } from './ResiliencyAlertSignup';

export default declareComponent(ResiliencyAlertSignup, {
  name: 'Resiliency Alert Signup',
  description: 'Cato Supply email alert signup card for Resiliency Report Alerts.',
  group: 'Forms',
  props: {
    eyebrow: props.Text({
      name: 'Eyebrow',
      defaultValue: 'Email alerts',
    }),
    heading: props.Text({
      name: 'Heading',
      defaultValue: 'Receive new Resiliency Report Alerts.',
    }),
    summary: props.Text({
      name: 'Summary',
      defaultValue:
        'Get healthcare supply risk signals, disruption reports, and sourcing notes as they publish.',
    }),
    benefits: props.Text({
      name: 'Benefit chips',
      defaultValue:
        'New report releases\nSupply disruption signals\nProcurement response notes',
      tooltip: 'Use one benefit per line, a comma-separated list, or a JSON string array.',
    }),
    label: props.Text({
      name: 'Email Label',
      defaultValue: 'Work email address',
    }),
    placeholder: props.Text({
      name: 'Placeholder',
      defaultValue: 'you@organization.com',
    }),
    buttonLabel: props.Text({
      name: 'Button Label',
      defaultValue: 'Subscribe to alerts',
    }),
    privacyNote: props.Text({
      name: 'Privacy Note',
      defaultValue: 'No spam. Unsubscribe anytime.',
    }),
    endpointUrl: props.Text({
      name: 'Endpoint URL',
      defaultValue: '',
      tooltip: 'Optional JSON POST endpoint. Leave blank for Designer/review preview mode.',
    }),
    source: props.Text({
      name: 'Source',
      defaultValue: 'resiliency-reports',
    }),
    resourceType: props.Text({
      name: 'Resource Type',
      defaultValue: 'Resiliency Report Alerts',
    }),
    successMessage: props.Text({
      name: 'Success Message',
      defaultValue: 'Thanks. You are on the Resiliency Report Alerts list.',
    }),
    errorMessage: props.Text({
      name: 'Error Message',
      defaultValue: 'Something went wrong. Please try again.',
    }),
  },
});
