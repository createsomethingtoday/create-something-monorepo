import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { OperatingLayerCards } from './ControlComponents';

export default declareComponent(OperatingLayerCards, {
  name: 'Operating Layer Cards',
  description: 'Database, Automation, and Judgment layer cards for governed workflow surfaces',
  group: 'Control Plane',
  props: {
    title: props.Text({
      name: 'Title',
      defaultValue: 'Operating Layers',
    }),
    body: props.Text({
      name: 'Body',
      defaultValue: 'Each feature is designed as a public surface, a callable runtime, and a policy-backed approval state.',
    }),
    layers: props.Text({
      name: 'Layers (JSON)',
      defaultValue: '[{"tier":"Database","title":"Operational Memory","status":"Structured","description":"Authoritative records, review state, and evidence are separated so every action can be traced.","evidence":["Source records","Review state","Evidence IDs"],"tone":"info"},{"tier":"Automation","title":"Callable Runtime","status":"Cloudflare-ready","description":"Actions are prepared as previews before they reach workflow tools, MCP servers, or external systems.","evidence":["API route","Action contract","Runtime checks"],"tone":"success"},{"tier":"Judgment","title":"Approval Boundary","status":"Human-gated","description":"Policy checks and operator approval determine whether a recommendation can become an executed action.","evidence":["Policy checks","Approval owner","Decision log"],"tone":"warning"}]',
      tooltip: 'JSON array of {tier,title,status,description,evidence?,tone?}',
    }),
    layout: props.Variant({
      name: 'Layout',
      options: ['three', 'two', 'compact'],
      defaultValue: 'three',
    }),
  },
});

