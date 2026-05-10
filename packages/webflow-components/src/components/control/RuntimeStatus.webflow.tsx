import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { RuntimeStatus } from './ControlComponents';

export default declareComponent(RuntimeStatus, {
  name: 'Runtime Status',
  description: 'Cloudflare and governance runtime status panel with check summaries',
  group: 'Control Plane',
  props: {
    label: props.Text({
      name: 'Label',
      defaultValue: 'Canon Runtime',
    }),
    status: props.Variant({
      name: 'Status',
      options: ['ok', 'warning', 'blocked', 'idle'],
      defaultValue: 'ok',
    }),
    environment: props.Text({
      name: 'Environment',
      defaultValue: 'Webflow + Cloudflare',
    }),
    lastChecked: props.Text({
      name: 'Last Checked',
      defaultValue: 'Preview ready',
    }),
    checks: props.Text({
      name: 'Checks (JSON)',
      defaultValue: '[{"label":"Cloudflare route","status":"ok","detail":"Ready for preview calls"},{"label":"Action execution","status":"idle","detail":"Preview-only in v1"},{"label":"Policy boundary","status":"ok","detail":"Human approval required for mutations"}]',
      tooltip: 'JSON array of {label,status?,detail?}',
    }),
    contextEndpointUrl: props.Text({
      name: 'Workflow Context Endpoint URL',
      defaultValue: '',
      tooltip: 'Optional GET endpoint for D1-backed workflow runtime status',
    }),
    contextId: props.Text({
      name: 'Context ID',
      defaultValue: 'create-something-governed-workflow-console',
    }),
  },
});
