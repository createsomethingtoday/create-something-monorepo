import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { ActionExecutionQueue } from './ControlComponents';

export default declareComponent(ActionExecutionQueue, {
  name: 'Action Execution Queue',
  description: 'Execution readiness queue showing preview, queued, approved, blocked, and executed action states',
  group: 'Control Plane',
  props: {
    title: props.Text({
      name: 'Title',
      defaultValue: 'Action Execution Queue',
    }),
    body: props.Text({
      name: 'Body',
      defaultValue: 'Track which actions are previews, approved, queued, blocked, or executed.',
    }),
    items: props.Text({
      name: 'Execution Items (JSON)',
      defaultValue: '[{"id":"execution-draft-brief","actionId":"draft-operator-brief","title":"Draft operator brief","status":"preview","owner":"Operator","system":"Cloudflare route","risk":"low","rollback":"Discard generated draft before publication.","lastUpdated":"Preview ready"},{"id":"execution-external-action","actionId":"execute-external-action","title":"Execute external action","status":"blocked","owner":"Senior operator","system":"External connector","risk":"high","rollback":"Define rollback before enabling connector execution.","lastUpdated":"Blocked in v1"}]',
      tooltip: 'JSON array of {id,actionId?,title,status?,owner?,system?,risk?,rollback?,lastUpdated?}',
    }),
    contextEndpointUrl: props.Text({
      name: 'Workflow Context Endpoint URL',
      defaultValue: '',
      tooltip: 'Optional GET endpoint for D1-backed execution queue',
    }),
    contextId: props.Text({
      name: 'Context ID',
      defaultValue: 'create-something-governed-workflow-console',
    }),
  },
});
