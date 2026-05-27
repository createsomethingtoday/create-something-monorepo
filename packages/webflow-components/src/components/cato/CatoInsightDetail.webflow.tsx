import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { CatoInsightDetail } from './CatoInsights';

export default declareComponent(CatoInsightDetail, {
  name: 'Cato Insight Detail',
  description: 'Cato Insight detail page that can render default exported content or bind direct CMS fields.',
  group: 'Cato Supply',
  options: {
    applyTagSelectors: false,
  },
  props: {
    slug: props.Text({
      name: 'Default Slug',
      defaultValue: '2026-supply-disruption-preparedness-brief',
    }),
    title: props.Text({
      name: 'Title Override',
      defaultValue: '',
    }),
    summary: props.Text({
      name: 'Summary Override',
      defaultValue: '',
    }),
    resourceType: props.Text({
      name: 'Resource Type Override',
      defaultValue: '',
    }),
    date: props.Text({
      name: 'Date Override',
      defaultValue: '',
    }),
    pill: props.Text({
      name: 'Pill Override',
      defaultValue: '',
    }),
    audience: props.Text({
      name: 'Audience Override',
      defaultValue: '',
    }),
    categoryId: props.Variant({
      name: 'Archive',
      options: ['resiliency', 'research', 'resources', 'newsroom'],
      defaultValue: 'resiliency',
    }),
    bodyHtml: props.RichText({
      name: 'Main Content HTML',
      defaultValue: '',
      tooltip: 'Bind to the Insights Main Content rich text field on the CMS template.',
    }),
    bodyJson: props.Text({
      name: 'Body JSON',
      defaultValue: '',
      tooltip: 'Optional fallback JSON array: [{heading, paragraphs, bullets?}]. Rich text binding takes precedence.',
    }),
    takeawaysHtml: props.RichText({
      name: 'Key Takeaways HTML',
      defaultValue: '',
      tooltip: 'Bind to the Insights Key Takeaways rich text field on the CMS template.',
    }),
    takeawaysJson: props.Text({
      name: 'Takeaways JSON',
      defaultValue: '',
      tooltip: 'Optional fallback JSON array of strings. Rich text binding takes precedence.',
    }),
    categoriesJson: props.Text({
      name: 'Categories JSON',
      defaultValue: '',
    }),
    itemsJson: props.Text({
      name: 'Items JSON',
      defaultValue: '',
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
  },
});
