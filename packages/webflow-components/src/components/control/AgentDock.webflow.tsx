import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { AgentDock } from './ControlComponents';

export default declareComponent(AgentDock, {
  name: 'Agent Dock',
  description: 'Bounded operator agent dock with suggested prompts and optional Cloudflare Q&A endpoint',
  group: 'Control Plane',
  props: {
    title: props.Text({
      name: 'Title',
      defaultValue: 'Ask the Control Layer',
    }),
    endpointUrl: props.Text({
      name: 'Cloudflare Endpoint URL',
      defaultValue: '',
      tooltip: 'Optional POST endpoint for live bounded agent answers',
    }),
    contextEndpointUrl: props.Text({
      name: 'Workflow Context Endpoint URL',
      defaultValue: '',
      tooltip: 'Optional GET endpoint for D1-backed workflow state',
    }),
    contextId: props.Text({
      name: 'Context ID',
      defaultValue: 'create-something-governed-workflow-console',
    }),
    placeholder: props.Text({
      name: 'Input Placeholder',
      defaultValue: 'Ask what is approved, private, or ready to preview...',
    }),
    suggestedPrompts: props.Text({
      name: 'Suggested Prompts (JSON)',
      defaultValue: '[{"label":"Explain the workflow","prompt":"Explain how the database, automation, and judgment layers work together."},{"label":"What needs approval?","prompt":"What decision needs approval before this action can run?"},{"label":"What is private?","prompt":"What should stay out of the public surface?"}]',
      tooltip: 'JSON array of {label,prompt}',
    }),
    initialMessages: props.Text({
      name: 'Initial Messages (JSON)',
      defaultValue: '[{"role":"agent","body":"I can answer from the approved Canon control context and keep private source material out of the response.","grounding":["Governance rule","Evidence trail"]}]',
      tooltip: 'JSON array of {role,body,grounding?}',
    }),
  },
});
