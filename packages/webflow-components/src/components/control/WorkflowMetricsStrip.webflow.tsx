import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { WorkflowMetricsStrip } from './ControlComponents';

export default declareComponent(WorkflowMetricsStrip, {
  name: 'Workflow Metrics Strip',
  description: 'Operational metrics for decisions, approvals, runtime posture, and private-boundary health',
  group: 'Control Plane',
  props: {
    title: props.Text({
      name: 'Title',
      defaultValue: '',
    }),
    body: props.Text({
      name: 'Body',
      defaultValue: '',
    }),
    metrics: props.Text({
      name: 'Metrics (JSON)',
      defaultValue: '[{"label":"Open decisions","value":"3","detail":"Operator review queue","tone":"warning"},{"label":"Pending approvals","value":"2","detail":"Named approver required","tone":"warning"},{"label":"Runtime posture","value":"Preview","detail":"No external mutation in v1","tone":"success"},{"label":"Private boundary","value":"Enforced","detail":"Secrets and raw records stay out of Webflow","tone":"success"}]',
      tooltip: 'JSON array of {label,value,detail?,tone?,trend?}',
    }),
    contextEndpointUrl: props.Text({
      name: 'Workflow Context Endpoint URL',
      defaultValue: '',
      tooltip: 'Optional GET endpoint for D1-backed workflow metrics',
    }),
    contextId: props.Text({
      name: 'Context ID',
      defaultValue: 'create-something-governed-workflow-console',
    }),
  },
});
