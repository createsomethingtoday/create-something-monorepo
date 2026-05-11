import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { BusinessContextSwitcher } from './ControlComponents';

export default declareComponent(BusinessContextSwitcher, {
  name: 'Business Context Switcher',
  description: 'Business, client, project, workflow, and environment scope for the governed console',
  group: 'Control Plane',
  props: {
    title: props.Text({
      name: 'Title',
      defaultValue: 'Business Context',
    }),
    body: props.Text({
      name: 'Body',
      defaultValue: 'Scope the console before reviewing actions, approvals, and source status.',
    }),
    contexts: props.Text({
      name: 'Contexts (JSON)',
      defaultValue: '[{"id":"cs-ops-core","client":"CREATE SOMETHING","project":"Governed Workflow Console","workflow":"Webflow + Cloudflare delivery","environment":"Production preview","status":"active","owner":"Operator","detail":"Console state is scoped to the CREATE SOMETHING operating layer."}]',
      tooltip: 'JSON array of {id,client,project,workflow,environment,status?,owner?,detail?}',
    }),
    activeContextId: props.Text({
      name: 'Active Context ID',
      defaultValue: 'cs-ops-core',
    }),
    contextEndpointUrl: props.Text({
      name: 'Workflow Context Endpoint URL',
      defaultValue: '',
      tooltip: 'Optional GET endpoint for D1-backed business contexts',
    }),
    contextId: props.Text({
      name: 'Context ID',
      defaultValue: 'create-something-governed-workflow-console',
    }),
  },
});
