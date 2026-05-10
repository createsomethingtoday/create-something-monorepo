import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { ArtifactGrid } from './ControlComponents';

export default declareComponent(ArtifactGrid, {
  name: 'Artifact Grid',
  description: 'Client-safe artifact packet with visibility and governance labels',
  group: 'Control Plane',
  props: {
    title: props.Text({
      name: 'Title',
      defaultValue: 'Review Artifacts',
    }),
    body: props.Text({
      name: 'Body',
      defaultValue: '',
    }),
    artifacts: props.Text({
      name: 'Artifacts (JSON)',
      defaultValue: '[{"title":"Operator Brief","type":"Review Packet","description":"A concise handoff that explains the workflow, risks, and next decision.","visibility":"public","tone":"info"},{"title":"Policy Rules","type":"Governance","description":"Rules that decide when an action can be drafted, previewed, approved, or blocked.","visibility":"internal","tone":"warning"},{"title":"Runtime Contract","type":"Cloudflare API","description":"Endpoint shape for bounded agent answers and action previews.","visibility":"public","tone":"success"}]',
      tooltip: 'JSON array of {title,type?,description?,href?,visibility?,tone?}',
    }),
    contextEndpointUrl: props.Text({
      name: 'Workflow Context Endpoint URL',
      defaultValue: '',
      tooltip: 'Optional GET endpoint for D1-backed workflow artifacts',
    }),
    contextId: props.Text({
      name: 'Context ID',
      defaultValue: 'create-something-governed-workflow-console',
    }),
    columns: props.Variant({
      name: 'Columns',
      options: ['two', 'three', 'four'],
      defaultValue: 'three',
    }),
  },
});
