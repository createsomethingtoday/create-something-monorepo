import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { CanonControlPanel } from './ControlComponents';

export default declareComponent(CanonControlPanel, {
  name: 'Canon Control Panel',
  description: 'Full CREATE SOMETHING operator control surface for Webflow with Cloudflare-ready agent and action previews',
  group: 'Control Plane',
  props: {
    heading: props.Text({
      name: 'Heading',
      defaultValue: 'Canon Control Panel',
    }),
    subheading: props.Text({
      name: 'Subheading',
      defaultValue: 'A Webflow interface backed by Cloudflare previews, evidence, and human approval boundaries.',
    }),
    contextId: props.Text({
      name: 'Context ID',
      defaultValue: 'canon-control-demo',
    }),
    agentEndpointUrl: props.Text({
      name: 'Agent Endpoint URL',
      defaultValue: '',
      tooltip: 'Optional POST endpoint for the Agent Dock',
    }),
    actionEndpointUrl: props.Text({
      name: 'Action Endpoint URL',
      defaultValue: '',
      tooltip: 'Optional POST endpoint for Action Preview',
    }),
    layers: props.Text({
      name: 'Layers (JSON)',
      defaultValue: '',
      tooltip: 'Optional OperatingLayer array. Leave empty for Canon defaults.',
    }),
    evidence: props.Text({
      name: 'Evidence (JSON)',
      defaultValue: '',
      tooltip: 'Optional EvidenceItem array. Leave empty for Canon defaults.',
    }),
    artifacts: props.Text({
      name: 'Artifacts (JSON)',
      defaultValue: '',
      tooltip: 'Optional ArtifactItem array. Leave empty for Canon defaults.',
    }),
    decisions: props.Text({
      name: 'Decisions (JSON)',
      defaultValue: '',
      tooltip: 'Optional DecisionItem array. Leave empty for Canon defaults.',
    }),
    actions: props.Text({
      name: 'Actions (JSON)',
      defaultValue: '',
      tooltip: 'Optional ActionPreviewItem array. Leave empty for Canon defaults.',
    }),
    suggestedPrompts: props.Text({
      name: 'Suggested Prompts (JSON)',
      defaultValue: '',
      tooltip: 'Optional SuggestedPrompt array. Leave empty for Canon defaults.',
    }),
    runtimeChecks: props.Text({
      name: 'Runtime Checks (JSON)',
      defaultValue: '',
      tooltip: 'Optional RuntimeCheck array. Leave empty for Canon defaults.',
    }),
  },
});

