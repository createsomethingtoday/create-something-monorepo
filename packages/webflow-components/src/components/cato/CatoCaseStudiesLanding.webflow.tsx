import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { CatoCaseStudiesLanding } from './CatoCompanyPages';

export default declareComponent(CatoCaseStudiesLanding, {
  name: 'Cato Case Studies Landing',
  description: 'Improved Case Studies landing page with featured customer story, result proof, CMS-friendly JSON, and self-contained Cato styling.',
  group: 'Cato Supply',
  options: {
    applyTagSelectors: true,
  },
  props: {
    title: props.Text({
      name: 'Hero Title',
      defaultValue: 'Customer Success Stories',
    }),
    summary: props.Text({
      name: 'Hero Summary',
      defaultValue:
        'Healthcare teams use Cato to navigate disruption, broaden sourcing options, and protect care continuity when standard channels cannot keep pace.',
    }),
    panelLabel: props.Text({
      name: 'Panel Label',
      defaultValue: 'Featured now',
    }),
    panelTitle: props.Text({
      name: 'Panel Title',
      defaultValue: 'Operational resilience in real sourcing moments.',
    }),
    panelSummary: props.Text({
      name: 'Panel Summary',
      defaultValue:
        'Use this page to collect approved customer stories and show how Cato helps healthcare teams respond to supply disruption.',
    }),
    caseStudiesJson: props.Text({
      name: 'Case Studies JSON',
      defaultValue: '',
      tooltip: 'Optional JSON array of case studies: title, slug, clientName, summary, customerProfile, featured, results.',
    }),
    linkMode: props.Variant({
      name: 'Link Mode',
      options: ['webflow', 'export'],
      defaultValue: 'webflow',
    }),
    pathPrefix: props.Text({
      name: 'Path Prefix',
      defaultValue: '',
      tooltip: 'Optional URL prefix for generated case study links.',
    }),
    contactLabel: props.Text({
      name: 'Contact CTA Label',
      defaultValue: 'Get in Touch',
    }),
    contactHref: props.Text({
      name: 'Contact CTA URL',
      defaultValue: '/contact-us',
    }),
    assetBasePath: props.Text({
      name: 'Asset Base Path',
      defaultValue: '',
      tooltip: 'Reserved for any relative image paths included in JSON.',
    }),
    showFeatured: props.Boolean({
      name: 'Show Featured Case',
      defaultValue: true,
    }),
  },
});
