import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { ApprovalQueue } from './ControlComponents';

export default declareComponent(ApprovalQueue, {
  name: 'Approval Queue',
  description: 'Persisted operator approval queue with review, approve, and block actions',
  group: 'Control Plane',
  props: {
    title: props.Text({
      name: 'Title',
      defaultValue: 'Approval Queue',
    }),
    body: props.Text({
      name: 'Body',
      defaultValue: 'Persist decisions before any recommendation can become an external action.',
    }),
    approvals: props.Text({
      name: 'Approvals (JSON)',
      defaultValue: '[{"id":"approval-action-boundary","actionId":"request-approval","title":"Approve action boundary","requester":"Delivery system","requiredApprover":"Named operator","status":"review","risk":"medium","due":"Before connector execution","evidence":["Approval boundary","Policy rules"],"policyChecks":["Named approver required","No external mutation before approval"]}]',
      tooltip: 'JSON array of {id,actionId?,title,requester?,requiredApprover,status?,risk?,due?,evidence?,policyChecks?}',
    }),
    endpointUrl: props.Text({
      name: 'Approval Endpoint URL',
      defaultValue: '',
      tooltip: 'Optional trusted operator proxy for persisted approval updates. Leave empty on public pages.',
    }),
    requestCredentials: props.Variant({
      name: 'Approval Request Credentials',
      options: ['same-origin', 'include', 'omit'],
      defaultValue: 'same-origin',
      tooltip: 'Use include only when calling a trusted operator-session endpoint on a CREATE SOMETHING domain.',
    }),
    actor: props.Text({
      name: 'Actor',
      defaultValue: 'Operator',
    }),
    contextEndpointUrl: props.Text({
      name: 'Workflow Context Endpoint URL',
      defaultValue: '',
      tooltip: 'Optional GET endpoint for D1-backed approval queue',
    }),
    contextId: props.Text({
      name: 'Context ID',
      defaultValue: 'create-something-governed-workflow-console',
    }),
  },
});
