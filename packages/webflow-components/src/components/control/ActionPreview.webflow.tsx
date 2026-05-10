import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { ActionPreview } from './ControlComponents';

export default declareComponent(ActionPreview, {
  name: 'Action Preview',
  description: 'Governed action preview with policy checks, evidence, and optional Cloudflare endpoint calls',
  group: 'Control Plane',
  props: {
    title: props.Text({
      name: 'Title',
      defaultValue: 'Action Preview',
    }),
    body: props.Text({
      name: 'Body',
      defaultValue: 'Preview governed actions before anything mutates an external system.',
    }),
    endpointUrl: props.Text({
      name: 'Cloudflare Endpoint URL',
      defaultValue: '',
      tooltip: 'Optional POST endpoint for live action previews',
    }),
    contextId: props.Text({
      name: 'Context ID',
      defaultValue: 'canon-control-demo',
    }),
    defaultActionId: props.Text({
      name: 'Default Action ID',
      defaultValue: 'draft-operator-brief',
    }),
    actions: props.Text({
      name: 'Actions (JSON)',
      defaultValue: '[{"id":"draft-operator-brief","label":"Draft operator brief","description":"Prepare a client-safe workflow brief from approved evidence and decisions.","status":"allowed","risk":"low","policyChecks":["Uses public evidence only","No credentials or private source data","Operator can edit before sharing"],"evidence":["Workflow map","Decision queue","Runtime contract"]},{"id":"request-approval","label":"Request approval","description":"Prepare an approval request that lists the action, owner, and policy checks.","status":"requires_approval","risk":"medium","policyChecks":["Requires named approval owner","Records decision state","Does not execute external writes"],"evidence":["Approval boundary","Policy rules"]},{"id":"execute-external-action","label":"Execute external action","description":"Blocked in this demo because v1 only previews governed actions.","status":"blocked","risk":"high","policyChecks":["External mutation disabled","Production connector not configured","Human approval required"],"evidence":["Governance rule"]}]',
      tooltip: 'JSON array of {id,label,description,status?,risk?,policyChecks?,evidence?}',
    }),
  },
});
