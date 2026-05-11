import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { OperatorActivityLog } from './ControlComponents';

export default declareComponent(OperatorActivityLog, {
  name: 'Operator Activity Log',
  description: 'Public-safe audit trail for previews, approvals, evidence, decisions, and deployments',
  group: 'Control Plane',
  props: {
    title: props.Text({
      name: 'Title',
      defaultValue: 'Operator Activity Log',
    }),
    body: props.Text({
      name: 'Body',
      defaultValue: 'Show the public-safe audit trail for previews, approvals, evidence, and deployments.',
    }),
    events: props.Text({
      name: 'Events (JSON)',
      defaultValue: '[{"id":"event-context-ready","eventType":"context","label":"Workflow context ready","detail":"The console can render from sanitized workflow state.","actor":"Cloudflare","timestamp":"Runtime read","tone":"success"}]',
      tooltip: 'JSON array of {id,eventType?,label,detail?,actor?,timestamp?,tone?}',
    }),
    contextEndpointUrl: props.Text({
      name: 'Workflow Context Endpoint URL',
      defaultValue: '',
      tooltip: 'Optional GET endpoint for D1-backed activity events',
    }),
    contextId: props.Text({
      name: 'Context ID',
      defaultValue: 'create-something-governed-workflow-console',
    }),
  },
});
