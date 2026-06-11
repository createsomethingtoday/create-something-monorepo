import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { TemplateDetailStickyBar } from './TemplateDetailStickyBar';

const offerModeOptions = ['marketplace', 'fulfillment_link', 'free'];

export default declareComponent(TemplateDetailStickyBar, {
  name: 'Template Detail Sticky Bar',
  description:
    'Fixed bottom conversion bar for template detail pages with thumbnail, price/offer context, preview link, and offer-aware primary CTA.',
  group: 'Marketplace',
  props: {
    templateName: props.Text({ name: 'Template Name', defaultValue: 'Template name' }),
    templateSlug: props.Text({
      name: 'Template Slug',
      defaultValue: '',
      tooltip: 'Optional. Leave blank to infer from /templates/html/{slug}.',
    }),
    creatorName: props.Text({ name: 'Creator Name', defaultValue: '' }),
    thumbnail: props.Image({ name: 'Thumbnail Image' }),
    price: props.Text({ name: 'Marketplace Price', defaultValue: '' }),
    isFree: props.Boolean({ name: 'Is Free', defaultValue: false }),
    browserPreviewUrl: props.Link({ name: 'Browser Preview URL' }),
    designerPreviewUrl: props.Link({ name: 'Designer Preview URL' }),
    checkoutUrl: props.Link({ name: 'Marketplace Checkout URL' }),
    marketplaceTemplateId: props.Text({
      name: 'Marketplace Template ID',
      defaultValue: '',
      tooltip: 'Bind to the Templates CMS Unique ID field. Used to build the Marketplace checkout redirect if Marketplace Checkout URL is blank.',
    }),
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
    offerVisibility: props.Text({ name: 'Offer Visibility', defaultValue: '' }),
    postOfferAction: props.Text({ name: 'Post-Offer Action', defaultValue: '' }),
    fulfillmentUrl: props.Link({ name: 'Fulfillment Link' }),
    showBrowserPreview: props.Boolean({ name: 'Show Browser Preview', defaultValue: true }),
    showDesignerPreview: props.Boolean({ name: 'Show Designer Preview', defaultValue: false }),
    revealWhenPrimaryCtaHidden: props.Boolean({
      name: 'Reveal When Primary CTA Hidden',
      defaultValue: true,
      tooltip: 'When enabled, the sticky bar stays hidden while another primary purchase CTA is visible on the page.',
    }),
    enableAnalytics: props.Boolean({ name: 'Enable Analytics', defaultValue: true }),
  },
});
