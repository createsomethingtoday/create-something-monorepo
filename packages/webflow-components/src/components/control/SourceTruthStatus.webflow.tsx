import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { SourceTruthStatus } from './ControlComponents';

export default declareComponent(SourceTruthStatus, {
  name: 'Source Truth Status',
  description: 'Source-of-truth and connectivity status for database, automation, secrets, and policy systems',
  group: 'Control Plane',
  props: {
    title: props.Text({
      name: 'Title',
      defaultValue: 'Source-of-Truth Status',
    }),
    body: props.Text({
      name: 'Body',
      defaultValue: 'Confirm the systems that own data, automation, secrets, and policy before action.',
    }),
    sources: props.Text({
      name: 'Sources (JSON)',
      defaultValue: '[{"system":"Cloudflare D1","status":"ok","detail":"Sanitized workflow context and approval queue are available.","lastSynced":"Runtime read","owner":"Engineering","tier":"Database"},{"system":"Approval Policy","status":"warning","detail":"External mutations require a named human approval path.","lastSynced":"Policy artifact","owner":"Operator","tier":"Judgment"}]',
      tooltip: 'JSON array of {system,status?,detail,lastSynced?,owner?,tier?}',
    }),
    contextEndpointUrl: props.Text({
      name: 'Workflow Context Endpoint URL',
      defaultValue: '',
      tooltip: 'Optional GET endpoint for D1-backed source status',
    }),
    contextId: props.Text({
      name: 'Context ID',
      defaultValue: 'create-something-governed-workflow-console',
    }),
  },
});
