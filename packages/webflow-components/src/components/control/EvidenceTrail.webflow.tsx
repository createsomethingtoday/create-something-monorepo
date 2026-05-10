import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { EvidenceTrail } from './ControlComponents';

export default declareComponent(EvidenceTrail, {
  name: 'Evidence Trail',
  description: 'Grounded evidence list for operator review and client-safe proof surfaces',
  group: 'Control Plane',
  props: {
    title: props.Text({
      name: 'Title',
      defaultValue: 'Evidence Trail',
    }),
    body: props.Text({
      name: 'Body',
      defaultValue: '',
    }),
    evidence: props.Text({
      name: 'Evidence (JSON)',
      defaultValue: '[{"label":"Workflow map","detail":"Current workflow, owner, and decision states are captured before automation.","source":"Delivery artifact","tone":"info"},{"label":"Action contract","detail":"Every action has a preview, policy checks, and a human approval state.","source":"Cloudflare route","tone":"success"},{"label":"Private boundary","detail":"Source data, credentials, and raw client records stay outside the public surface.","source":"Governance rule","tone":"warning"}]',
      tooltip: 'JSON array of {label,detail?,source?,href?,tone?,timestamp?}',
    }),
    compact: props.Boolean({
      name: 'Compact',
      defaultValue: false,
    }),
  },
});

