import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { CatoInsightCmsCard } from './CatoInsights';

export default declareComponent(CatoInsightCmsCard, {
  name: 'Cato Insight CMS Card',
  description: 'CMS-bindable Cato Insight card for use inside native Webflow Collection Lists.',
  group: 'Cato Supply',
  options: {
    applyTagSelectors: false,
  },
  props: {
    title: props.Text({
      name: 'Title',
      defaultValue: 'Insight title',
      tooltip: 'Bind to the current Insight Name field.',
    }),
    summary: props.Text({
      name: 'Short Summary',
      defaultValue: 'Read the latest Cato insight.',
      tooltip: 'Bind to the current Insight Short Summary field.',
    }),
    resourceType: props.Text({
      name: 'Resource Type',
      defaultValue: '',
      tooltip: 'Optional fallback label. Bind when Content Label is unavailable.',
    }),
    contentLabel: props.Text({
      name: 'Content Label',
      defaultValue: '',
      tooltip: 'Bind to the current Insight Content Label field.',
    }),
    date: props.Text({
      name: 'Publish Date',
      defaultValue: '',
      tooltip: 'Bind to the current Insight Publish Date field.',
    }),
    ctaLabel: props.Text({
      name: 'CTA Label',
      defaultValue: 'Read update',
    }),
    slug: props.Text({
      name: 'Slug',
      defaultValue: '',
      tooltip: 'Bind to the current Insight Slug field if Item Link is not bound.',
    }),
    itemLink: props.Link({
      name: 'Item Link',
      tooltip: 'Preferred: bind to the current Insight collection page link.',
    }),
    featured: props.Boolean({
      name: 'Featured Layout',
      defaultValue: false,
    }),
    linkMode: props.Variant({
      name: 'Link Mode',
      options: ['webflow', 'export'],
      defaultValue: 'webflow',
    }),
    pathPrefix: props.Text({
      name: 'Path Prefix',
      defaultValue: '/insights',
      tooltip: 'Used with Slug when Item Link is not bound.',
    }),
  },
});
