import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { PricingRecommender } from './BusinessComponents';

export default declareComponent(PricingRecommender, {
  name: 'Pricing Recommender',
  description: 'Ona-styled offer router that recommends a package from workflow signals',
  group: 'Business Logic',
  props: {
    eyebrow: props.Text({
      name: 'Eyebrow',
      defaultValue: 'Offer router',
    }),
    title: props.Text({
      name: 'Title',
      defaultValue: 'Recommend the right implementation tier.',
    }),
    body: props.Text({
      name: 'Body',
      defaultValue: 'Translate team size, workflow volume, approval needs, and risk into a simple offer recommendation.',
    }),
    plans: props.Text({
      name: 'Plans (JSON)',
      defaultValue: '[{"id":"foundation","name":"Foundation Pack","price":"$750+","description":"Install the Webflow component pack and configure a static workflow surface.","minScore":0,"ctaLabel":"Install foundation","ctaHref":"/book","features":["Canon/Ona visual system","Designer-safe props","Static fallback content"]},{"id":"workflow","name":"Workflow System","price":"$3k+","description":"Connect one workflow to a managed endpoint with routing, evidence, and fallback states.","minScore":38,"ctaLabel":"Map one workflow","ctaHref":"/book","features":["Cloudflare route","D1-backed state","Operator handoff"]},{"id":"policy-os","name":"Policy OS","price":"$8k+","description":"Add governed agent behavior, approval policy, and monthly tuning for high-stakes workflows.","minScore":68,"ctaLabel":"Scope Policy OS","ctaHref":"/book","features":["Dify/MCP boundary","Approval gates","Regression evidence"]}]',
      tooltip: 'JSON array of {id,name,price?,description,minScore?,ctaLabel?,ctaHref?,features?}',
    }),
    endpointUrl: props.Text({
      name: 'Managed Endpoint URL',
      defaultValue: '',
      tooltip: 'Optional POST endpoint for Dify, MCP, or Cloudflare-backed pricing recommendations. Do not put secrets in this value.',
    }),
    defaultTeamSize: props.Text({
      name: 'Default Team Size',
      defaultValue: '6',
    }),
    defaultMonthlyVolume: props.Text({
      name: 'Default Monthly Workflow Volume',
      defaultValue: '250',
    }),
    defaultWorkflowRisk: props.Variant({
      name: 'Default Workflow Risk',
      options: ['low', 'medium', 'high'],
      defaultValue: 'medium',
    }),
    approvalRequired: props.Boolean({
      name: 'Approval Required',
      defaultValue: true,
    }),
  },
});
