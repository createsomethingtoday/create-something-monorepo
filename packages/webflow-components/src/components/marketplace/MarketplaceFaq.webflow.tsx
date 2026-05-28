import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { MarketplaceFaq, DEFAULT_FAQ_ITEMS_JSON } from './MarketplaceFaq';

export default declareComponent(MarketplaceFaq, {
  name: 'Marketplace FAQ',
  description:
    'Accessible FAQ accordion for the marketplace landing page, with optional FAQPage JSON-LD for approved copy.',
  group: 'Marketplace',
  props: {
    title: props.Text({
      name: 'Title',
      defaultValue: 'Frequently asked questions',
    }),
    description: props.Text({
      name: 'Description',
      defaultValue: '',
    }),
    items: props.Text({
      name: 'FAQ Items (JSON)',
      defaultValue: DEFAULT_FAQ_ITEMS_JSON,
      tooltip: 'JSON array of {question, answer}. Replace defaults with approved FAQ copy before publishing.',
    }),
    openFirst: props.Boolean({
      name: 'Open First Item',
      defaultValue: false,
    }),
    allowMultipleOpen: props.Boolean({
      name: 'Allow Multiple Open',
      defaultValue: false,
    }),
    includeStructuredData: props.Boolean({
      name: 'Include FAQ JSON-LD',
      defaultValue: false,
      tooltip: 'Enable only after final FAQ copy is approved for SEO/AEO.',
    }),
    enableAnalytics: props.Boolean({
      name: 'Enable Analytics',
      defaultValue: true,
      tooltip:
        'Track FAQ item toggles through wf_analytics and the marketplaceLandingAnalytics DOM event.',
    }),
    experimentRole: props.Variant({
      name: 'Experiment Role',
      options: ['none', 'control', 'treatment'],
      defaultValue: 'treatment',
      tooltip: 'Used by Marketplace Landing Experiment Gate to show or hide this component during A/B tests.',
    }),
  },
});
