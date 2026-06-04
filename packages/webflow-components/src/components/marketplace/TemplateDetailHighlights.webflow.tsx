import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { TemplateDetailHighlights } from './TemplateDetailHighlights';

export default declareComponent(TemplateDetailHighlights, {
  name: 'Template Detail Highlights',
  description:
    'Scannable detail-page summary for build type, included features, creator support, and quality signals. Place before long tabs or accordions.',
  group: 'Marketplace',
  props: {
    templateSlug: props.Text({
      name: 'Template Slug',
      defaultValue: '',
      tooltip: 'Optional. Leave blank to infer from /templates/html/{slug}.',
    }),
    title: props.Text({
      name: 'Title',
      defaultValue: 'Everything needed to start faster',
    }),
    description: props.Text({
      name: 'Description',
      defaultValue:
        'Scan the build, included structure, support path, and quality signals before opening the full template preview.',
    }),
    templateType: props.Text({
      name: 'Template Type',
      defaultValue: '',
      tooltip: 'Example: Multi page, One page, UI kit, or Landing page.',
    }),
    pagesCount: props.Text({
      name: 'Included Pages',
      defaultValue: '',
      tooltip: 'Example: 12 pages, 30 sections, or CMS-ready pages.',
    }),
    featureSummary: props.Text({
      name: 'Feature Summary',
      defaultValue: '',
    }),
    supportSummary: props.Text({
      name: 'Support Summary',
      defaultValue: '',
    }),
    qualitySummary: props.Text({
      name: 'Quality Summary',
      defaultValue: '',
      tooltip: 'Example: Recently updated, top seller, accessibility checked, or verified quality.',
    }),
    highlightsJson: props.Text({
      name: 'Highlights JSON',
      defaultValue: '',
      tooltip:
        'Optional JSON array of {label, value, detail}. When provided, it replaces the individual summary fields.',
    }),
    enableAnalytics: props.Boolean({ name: 'Enable Analytics', defaultValue: true }),
  },
});
