import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { ApprovalGate } from './ControlComponents';

export default declareComponent(ApprovalGate, {
  name: 'Approval Gate',
  description: 'Human approval boundary for governed actions',
  group: 'Control Plane',
  props: {
    title: props.Text({
      name: 'Title',
      defaultValue: 'Human Approval Gate',
    }),
    description: props.Text({
      name: 'Description',
      defaultValue: 'The system can prepare the action, but a named operator approves it before execution.',
    }),
    approvalState: props.Variant({
      name: 'Approval State',
      options: ['review', 'approved', 'blocked'],
      defaultValue: 'review',
    }),
    requiredApprover: props.Text({
      name: 'Required Approver',
      defaultValue: 'Named operator',
    }),
    primaryActionLabel: props.Text({
      name: 'Primary Action Label',
      defaultValue: 'Mark approved',
    }),
    secondaryActionLabel: props.Text({
      name: 'Secondary Action Label',
      defaultValue: 'Keep in review',
    }),
    contextEndpointUrl: props.Text({
      name: 'Workflow Context Endpoint URL',
      defaultValue: '',
      tooltip: 'Optional GET endpoint for D1-backed workflow approval state',
    }),
    contextId: props.Text({
      name: 'Context ID',
      defaultValue: 'create-something-governed-workflow-console',
    }),
  },
});
