import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { SubmissionGuidelines } from './SubmissionGuidelines';

export default declareComponent(SubmissionGuidelines, {
  name: 'Submission Guidelines',
  description:
    'Template submission guidelines from the Marketplace CMS (Submission Guidelines collection), with a section menu and linkable rules.',
  group: 'Marketplace',
  props: {
    apiBase: props.Text({
      name: 'API Base',
      defaultValue: 'https://templates.webflow.com/templates-api',
      tooltip: 'templates-api proxy base, no trailing slash. Worker origins are rewritten to it (webflow.com CSP only allows *.webflow.com).',
    }),
    defaultSection: props.Text({
      name: 'Default Section',
      defaultValue: '',
      tooltip: 'Section id to open first, for example "required-pages". Empty opens the first section.',
    }),
    syncUrlHash: props.Boolean({
      name: 'Sync URL Hash',
      defaultValue: true,
      tooltip: 'Keep the open section in the URL so sections and single rules can be linked.',
    }),
  },
});
