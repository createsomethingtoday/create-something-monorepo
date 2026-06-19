import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { LeadQualifier } from './BusinessComponents';

export default declareComponent(LeadQualifier, {
  name: 'Lead Qualifier',
  description: 'Ona-styled lead qualification surface with local scoring and optional managed endpoint',
  group: 'Business Logic',
  props: {
    eyebrow: props.Text({
      name: 'Eyebrow',
      defaultValue: 'Business logic component',
    }),
    title: props.Text({
      name: 'Title',
      defaultValue: 'Qualify the workflow before the sales call.',
    }),
    body: props.Text({
      name: 'Body',
      defaultValue: 'Designer-safe questions score the buyer path locally. Add a managed endpoint when the recommendation should come from Dify, MCP, or Cloudflare.',
    }),
    questions: props.Text({
      name: 'Questions (JSON)',
      defaultValue: '[{"id":"workflow","label":"What workflow is creating the most drag?","detail":"Start with the operating path that already has an owner.","options":[{"label":"Lead routing or sales handoff","value":"sales","score":18},{"label":"Customer support or review queue","value":"support","score":14},{"label":"Internal reporting or operations","value":"ops","score":10}]},{"id":"risk","label":"What happens if the workflow fails?","options":[{"label":"Revenue, compliance, or customer trust is affected","value":"high","score":28},{"label":"Team time is wasted but the business can recover","value":"medium","score":18},{"label":"It is mostly an experiment","value":"low","score":8}]},{"id":"systems","label":"How many systems need to stay in sync?","options":[{"label":"Four or more systems","value":"many","score":24},{"label":"Two or three systems","value":"some","score":16},{"label":"One primary system","value":"one","score":6}]}]',
      tooltip: 'JSON array of {id,label,detail?,options:[{label,value?,score?}]}',
    }),
    outcomes: props.Text({
      name: 'Outcomes (JSON)',
      defaultValue: '[{"minScore":58,"label":"Policy OS fit","detail":"The workflow touches enough risk and system complexity to justify a governed workflow layer with approval and evidence states.","ctaLabel":"Map the workflow","ctaHref":"/book","tone":"success"},{"minScore":34,"label":"Workflow System fit","detail":"Start with one bounded operating path, then add policy and agent behavior once the handoff is reliable.","ctaLabel":"Start with one workflow","ctaHref":"/book","tone":"info"},{"minScore":0,"label":"Discovery fit","detail":"This is early enough for a lightweight audit, component demo, or read-only MCP wedge before a larger build.","ctaLabel":"Book a mapping call","ctaHref":"/book","tone":"warning"}]',
      tooltip: 'JSON array of {minScore,label,detail,ctaLabel?,ctaHref?,tone?}',
    }),
    endpointUrl: props.Text({
      name: 'Managed Endpoint URL',
      defaultValue: '',
      tooltip: 'Optional POST endpoint for Dify, MCP, or Cloudflare-backed scoring. Do not put secrets in this value.',
    }),
    submitLabel: props.Text({
      name: 'Submit Label',
      defaultValue: 'Calculate fit',
    }),
    fallbackCtaLabel: props.Text({
      name: 'Fallback CTA Label',
      defaultValue: 'Book mapping session',
    }),
    fallbackCtaHref: props.Text({
      name: 'Fallback CTA Link',
      defaultValue: '/book',
    }),
  },
});
