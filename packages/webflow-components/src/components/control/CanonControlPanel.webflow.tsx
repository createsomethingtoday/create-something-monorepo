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
      defaultValue: 'create-something-governed-workflow-console',
    }),
    contextEndpointUrl: props.Text({
      name: 'Workflow Context Endpoint URL',
      defaultValue: '',
      tooltip: 'Optional GET endpoint for D1-backed workflow state',
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
    approvalEndpointUrl: props.Text({
      name: 'Approval Endpoint URL',
      defaultValue: '',
      tooltip: 'Use https://createsomething.agency/api/canon/operator-approval only after operator auth works for this origin. Leave empty for local review state.',
    }),
    approvalRequestCredentials: props.Variant({
      name: 'Approval Request Credentials',
      options: ['same-origin', 'include', 'omit'],
      defaultValue: 'same-origin',
      tooltip: 'Set include for the cross-origin .agency approval endpoint. Keep same-origin when Approval Endpoint URL is empty or same-origin.',
    }),
    operatorName: props.Text({
      name: 'Operator Name',
      defaultValue: 'Operator',
    }),
    businessContexts: props.Text({
      name: 'Business Contexts (JSON)',
      defaultValue: '',
      tooltip: 'Optional BusinessContext array. Leave empty for Canon defaults.',
    }),
    metrics: props.Text({
      name: 'Metrics (JSON)',
      defaultValue: '',
      tooltip: 'Optional WorkflowMetric array. Leave empty for Canon defaults.',
    }),
    sourceStatuses: props.Text({
      name: 'Source Statuses (JSON)',
      defaultValue: '',
      tooltip: 'Optional SourceStatus array. Leave empty for Canon defaults.',
    }),
    approvalQueue: props.Text({
      name: 'Approval Queue (JSON)',
      defaultValue: '',
      tooltip: 'Optional ApprovalQueueItem array. Leave empty for Canon defaults.',
    }),
    executionQueue: props.Text({
      name: 'Execution Queue (JSON)',
      defaultValue: '',
      tooltip: 'Optional ActionExecutionItem array. Leave empty for Canon defaults.',
    }),
    activityEvents: props.Text({
      name: 'Activity Events (JSON)',
      defaultValue: '',
      tooltip: 'Optional ActivityEvent array. Leave empty for Canon defaults.',
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
