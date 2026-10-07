import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { TemplateSupportRequest } from './TemplateSupportRequest';

export default declareComponent(TemplateSupportRequest, {
  name: 'Template Support Request',
  description:
    'Button that opens a support form on template detail pages. Webflow emails the creator and logs each request by type, so the creator email never appears on the page.',
  group: 'Marketplace',
  props: {
    templateSlug: props.Text({
      name: 'Template Slug',
      defaultValue: '',
      tooltip: 'Optional. Leave blank to infer from /templates/html/{slug}.',
    }),
    templateName: props.Text({ name: 'Template Name', defaultValue: '' }),
    creatorName: props.Text({
      name: 'Creator Name',
      defaultValue: '',
      tooltip: 'Display only. Do not bind the creator email: props are written into the page HTML.',
    }),
    buttonLabel: props.Text({
      name: 'Button Label',
      defaultValue: '',
      tooltip: 'Optional. Defaults to "Contact {Creator Name}".',
    }),
    enableAnalytics: props.Boolean({ name: 'Enable Analytics', defaultValue: true }),
  },
});
