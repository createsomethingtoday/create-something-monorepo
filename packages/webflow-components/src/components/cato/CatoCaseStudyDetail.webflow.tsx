import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { CatoCaseStudyDetail } from './CatoCompanyPages';

export default declareComponent(CatoCaseStudyDetail, {
  name: 'Cato Case Study Detail',
  description: 'CMS-bindable case study detail template with customer profile, challenge, solution, results, and related stories.',
  group: 'Cato Supply',
  options: {
    applyTagSelectors: true,
  },
  props: {
    slug: props.Text({
      name: 'Case Study Slug',
      defaultValue: '',
      tooltip: 'Bind to the Case Studies slug field when used on a CMS template.',
    }),
    title: props.Text({
      name: 'Title',
      defaultValue: '',
      tooltip: 'Optional CMS title override.',
    }),
    clientName: props.Text({
      name: 'Client Name',
      defaultValue: '',
    }),
    summary: props.Text({
      name: 'Short Summary',
      defaultValue: '',
    }),
    customerProfile: props.Text({
      name: 'Customer Profile',
      defaultValue: '',
    }),
    challengeHtml: props.RichText({
      name: 'Challenge HTML',
      defaultValue: '',
      tooltip: 'Bind to the Case Studies challenge rich text field where available.',
    }),
    solutionHtml: props.RichText({
      name: 'Solution HTML',
      defaultValue: '',
      tooltip: 'Bind to the Case Studies solution rich text field where available.',
    }),
    challengeImage: props.Image({
      name: 'Challenge Image',
      tooltip: 'Bind to the Case Studies challenge image field.',
    }),
    solutionImage: props.Image({
      name: 'Solution Image',
      tooltip: 'Bind to the Case Studies solution image field.',
    }),
    challengeImageUrl: props.Text({
      name: 'Challenge Image URL',
      defaultValue: '',
    }),
    solutionImageUrl: props.Text({
      name: 'Solution Image URL',
      defaultValue: '',
    }),
    resultsJson: props.Text({
      name: 'Results JSON',
      defaultValue: '',
      tooltip: 'Optional JSON array of result cards: text, iconUrl.',
    }),
    caseStudiesJson: props.Text({
      name: 'Related Case Studies JSON',
      defaultValue: '',
      tooltip: 'Optional JSON array used for fallback and related stories.',
    }),
    linkMode: props.Variant({
      name: 'Link Mode',
      options: ['webflow', 'export'],
      defaultValue: 'webflow',
    }),
    pathPrefix: props.Text({
      name: 'Path Prefix',
      defaultValue: '',
    }),
    assetBasePath: props.Text({
      name: 'Asset Base Path',
      defaultValue: '',
    }),
    backLabel: props.Text({
      name: 'Back Link Label',
      defaultValue: 'See all case studies',
    }),
    backHref: props.Text({
      name: 'Back Link URL',
      defaultValue: '',
      tooltip: 'Optional override for the all case studies link.',
    }),
  },
});
