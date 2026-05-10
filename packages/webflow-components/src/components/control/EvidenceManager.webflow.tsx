import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { EvidenceManager } from './ControlComponents';

export default declareComponent(EvidenceManager, {
  name: 'Evidence Manager',
  description: 'Evidence visibility and review-state manager for public-safe, internal, and private grounding',
  group: 'Control Plane',
  props: {
    title: props.Text({
      name: 'Title',
      defaultValue: 'Evidence Manager',
    }),
    body: props.Text({
      name: 'Body',
      defaultValue: 'Review which evidence is public-safe, internal, or private before it grounds an action.',
    }),
    evidence: props.Text({
      name: 'Evidence (JSON)',
      defaultValue: '[{"id":"workflow-map","label":"Workflow map","detail":"Current workflow, owner, and decision states are captured before automation.","source":"D1 workflow context","tone":"info","visibility":"public","status":"approved"}]',
      tooltip: 'JSON array of {id?,label,detail?,source?,tone?,visibility?,status?,owner?}',
    }),
    contextEndpointUrl: props.Text({
      name: 'Workflow Context Endpoint URL',
      defaultValue: '',
      tooltip: 'Optional GET endpoint for D1-backed evidence',
    }),
    contextId: props.Text({
      name: 'Context ID',
      defaultValue: 'create-something-governed-workflow-console',
    }),
  },
});
