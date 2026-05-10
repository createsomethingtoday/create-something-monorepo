import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { DecisionQueue } from './ControlComponents';

export default declareComponent(DecisionQueue, {
  name: 'Decision Queue',
  description: 'Operator decision list with owners, states, and triad tiers',
  group: 'Control Plane',
  props: {
    title: props.Text({
      name: 'Title',
      defaultValue: 'Decisions Needed',
    }),
    body: props.Text({
      name: 'Body',
      defaultValue: '',
    }),
    decisions: props.Text({
      name: 'Decisions (JSON)',
      defaultValue: '[{"title":"Confirm authoritative data","description":"Name the source of truth before automation reads or writes records.","owner":"Operator","state":"open","tier":"Database"},{"title":"Approve action boundary","description":"Decide which actions can be drafted and which require manual approval.","owner":"Delivery lead","state":"review","tier":"Judgment"},{"title":"Enable runtime smoke","description":"Verify the Cloudflare endpoint and fallback behavior before publishing.","owner":"Engineer","state":"ready","tier":"Automation"}]',
      tooltip: 'JSON array of {title,description?,owner?,due?,state?,tier?}',
    }),
  },
});

