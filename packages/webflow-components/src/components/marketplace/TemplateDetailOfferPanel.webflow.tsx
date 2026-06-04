import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { TemplateDetailOfferPanel } from './TemplateDetailOfferPanel';

const offerModeOptions = ['marketplace', 'creator_offer', 'external_checkout', 'fulfillment_link', 'free'];

export default declareComponent(TemplateDetailOfferPanel, {
  name: 'Template Detail Offer Panel',
  description:
    'Sidebar or inline purchase panel for template detail pages. Shows Marketplace price, creator offer price, fulfillment-link context, and safe CTA routing.',
  group: 'Marketplace',
  props: {
    templateName: props.Text({ name: 'Template Name', defaultValue: 'this template' }),
    templateSlug: props.Text({
      name: 'Template Slug',
      defaultValue: '',
      tooltip: 'Optional. Leave blank to infer from /templates/html/{slug}.',
    }),
    price: props.Text({ name: 'Marketplace Price', defaultValue: '' }),
    isFree: props.Boolean({ name: 'Is Free', defaultValue: false }),
    checkoutUrl: props.Link({ name: 'Marketplace Checkout URL' }),
    offerEnabled: props.Boolean({
      name: 'Offer Enabled',
      defaultValue: false,
      tooltip: 'Enable when there is an approved creator-managed offer for this template.',
    }),
    offerMode: props.Variant({
      name: 'Offer Mode',
      options: offerModeOptions,
      defaultValue: 'marketplace',
    }),
    offerLabel: props.Text({ name: 'Offer Badge Label', defaultValue: '' }),
    offerPrice: props.Text({ name: 'Offer Price', defaultValue: '' }),
    offerEndsAt: props.Text({ name: 'Offer Ends At', defaultValue: '' }),
    offerUrl: props.Link({ name: 'Creator Offer URL' }),
    fulfillmentUrl: props.Link({ name: 'Fulfillment Link' }),
    secondaryCheckoutLabel: props.Text({
      name: 'Secondary Checkout Label',
      defaultValue: 'Use standard checkout',
    }),
    showSecondaryCheckout: props.Boolean({
      name: 'Show Standard Checkout',
      defaultValue: true,
    }),
    supportCopy: props.Text({
      name: 'Panel Copy',
      defaultValue: '',
      tooltip: 'Optional override copy. Leave blank for mode-specific default copy.',
    }),
    enableAnalytics: props.Boolean({ name: 'Enable Analytics', defaultValue: true }),
  },
});
