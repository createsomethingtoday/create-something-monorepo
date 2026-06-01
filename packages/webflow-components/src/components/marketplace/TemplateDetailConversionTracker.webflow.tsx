import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { TemplateDetailConversionTracker } from './TemplateDetailConversionTracker';

export default declareComponent(TemplateDetailConversionTracker, {
  name: 'Template Detail Conversion Tracker',
  description:
    'Non-visual marketplace tracker for template detail pages. Connects safe grid attribution to detail views, preview clicks, and purchase CTA clicks without sending raw query text or creator names.',
  group: 'Marketplace',
  props: {
    templateSlug: props.Text({
      name: 'Template Slug',
      defaultValue: '',
      tooltip:
        'Optional. Leave blank to infer from /templates/html/{slug}. Used to match detail-page events to the prior grid card click.',
    }),
    price: props.Text({
      name: 'Price',
      defaultValue: '',
      tooltip: 'Optional public price label. Analytics only sends free/paid/unknown, not the exact price.',
    }),
    enableAnalytics: props.Boolean({
      name: 'Enable Analytics',
      defaultValue: true,
      tooltip:
        'Track detail view, preview CTA, and purchase CTA events with safe first-party marketplace attribution.',
    }),
    trackView: props.Boolean({
      name: 'Track Detail View',
      defaultValue: true,
    }),
    trackPreviewClicks: props.Boolean({
      name: 'Track Preview Clicks',
      defaultValue: true,
    }),
    trackPurchaseClicks: props.Boolean({
      name: 'Track Purchase Clicks',
      defaultValue: true,
    }),
  },
});
