import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { TemplateDetailHero } from './TemplateDetailHero';

const offerModeOptions = ['marketplace', 'creator_offer', 'external_checkout', 'fulfillment_link', 'free'];

export default declareComponent(TemplateDetailHero, {
  name: 'Template Detail Hero',
  description:
    'Refreshed marketplace template detail hero with creator context, preview image, preview CTAs, and offer-aware purchase CTA.',
  group: 'Marketplace',
  props: {
    templateName: props.Text({ name: 'Template Name', defaultValue: 'Template name' }),
    templateSlug: props.Text({
      name: 'Template Slug',
      defaultValue: '',
      tooltip: 'Optional. Leave blank to infer from /templates/html/{slug}.',
    }),
    categoryName: props.Text({ name: 'Category Name', defaultValue: 'Templates' }),
    categoryLink: props.Link({ name: 'Category URL' }),
    creatorName: props.Text({ name: 'Creator Name', defaultValue: '' }),
    creatorLink: props.Link({ name: 'Creator URL' }),
    creatorAvatar: props.Image({ name: 'Creator Avatar' }),
    templateImage: props.Image({ name: 'Template Preview Image' }),
    summary: props.Text({ name: 'Summary', defaultValue: '' }),
    publishedDate: props.Text({
      name: 'Updated Date',
      defaultValue: '',
      tooltip: 'Display label such as "May 2026" or a CMS date formatted by Webflow.',
    }),
    price: props.Text({ name: 'Marketplace Price', defaultValue: '' }),
    isFree: props.Boolean({ name: 'Is Free', defaultValue: false }),
    browserPreviewUrl: props.Link({ name: 'Browser Preview URL' }),
    designerPreviewUrl: props.Link({ name: 'Designer Preview URL' }),
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
    showOfferBadge: props.Boolean({ name: 'Show Offer Badge', defaultValue: true }),
    enableAnalytics: props.Boolean({ name: 'Enable Analytics', defaultValue: true }),
  },
});
