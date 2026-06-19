import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { BookingRouter } from './BusinessComponents';

export default declareComponent(BookingRouter, {
  name: 'Booking Router',
  description: 'Ona-styled booking router that sends visitors to the right next step',
  group: 'Business Logic',
  props: {
    eyebrow: props.Text({
      name: 'Eyebrow',
      defaultValue: 'Booking router',
    }),
    title: props.Text({
      name: 'Title',
      defaultValue: 'Route the buyer to the right next step.',
    }),
    body: props.Text({
      name: 'Body',
      defaultValue: 'Use a few operational signals to decide whether the visitor should book discovery, mapping, or a Policy OS scope review.',
    }),
    routes: props.Text({
      name: 'Routes (JSON)',
      defaultValue: '[{"id":"diagnostic","label":"Diagnostic call","detail":"Best when the workflow is still fuzzy or the buyer needs help naming the source of truth.","ctaLabel":"Book diagnostic","ctaHref":"/book","minScore":0,"tone":"info"},{"id":"mapping","label":"Workflow mapping session","detail":"Best when one owner can bring the workflow, systems, and approval boundary to the first call.","ctaLabel":"Map workflow","ctaHref":"/book","minScore":34,"tone":"success"},{"id":"policy","label":"Policy OS scope review","detail":"Best when failures touch revenue, customer trust, compliance, or multiple systems that need governed execution.","ctaLabel":"Scope Policy OS","ctaHref":"/book","minScore":64,"tone":"warning"}]',
      tooltip: 'JSON array of {id,label,detail,ctaLabel,ctaHref,minScore?,tone?}',
    }),
    endpointUrl: props.Text({
      name: 'Managed Endpoint URL',
      defaultValue: '',
      tooltip: 'Optional POST endpoint for Dify, MCP, or Cloudflare-backed route recommendations. Do not put secrets in this value.',
    }),
    defaultUrgency: props.Variant({
      name: 'Default Urgency',
      options: ['low', 'medium', 'high'],
      defaultValue: 'medium',
    }),
    defaultSystems: props.Text({
      name: 'Default Connected Systems',
      defaultValue: '3',
    }),
    defaultRevenueImpact: props.Text({
      name: 'Default Monthly Revenue At Risk',
      defaultValue: '25000',
    }),
    defaultApprovalComplexity: props.Variant({
      name: 'Default Approval Complexity',
      options: ['low', 'medium', 'high'],
      defaultValue: 'medium',
    }),
  },
});
