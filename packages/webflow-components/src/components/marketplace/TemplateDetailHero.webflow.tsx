import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { TemplateDetailHero } from './TemplateDetailHero';

const offerModeOptions = ['marketplace', 'fulfillment_link', 'free'];
const previewDeviceOptions = ['desktop', 'mobile'];

export default declareComponent(TemplateDetailHero, {
  name: 'Template Detail Hero',
  description:
    'Marketplace template detail hero with creator context, preview CTAs, offer-aware purchase CTA, and an optional below-hero desktop/mobile iframe preview.',
  group: 'Marketplace',
  props: {
    templateName: props.Text({ name: 'Template Name', defaultValue: 'Template name' }),
    templateSlug: props.Text({
      name: 'Template Slug',
      defaultValue: '',
      tooltip: 'Optional. Leave blank to infer from /templates/html/{slug}.',
    }),
    categoryName: props.Text({ name: 'Category Name', defaultValue: 'Templates' }),
    categoryNames: props.Text({
      name: 'Category Names',
      defaultValue: '',
      tooltip: 'Optional comma- or newline-separated category labels. Use for multi-category breadcrumbs.',
    }),
    categoryLink: props.Link({ name: 'Category URL' }),
    categoryLinks: props.Text({
      name: 'Category URLs',
      defaultValue: '',
      tooltip: 'Optional comma- or newline-separated URLs matching Category Names.',
    }),
    categoryBaseUrl: props.Text({
      name: 'Category Base URL',
      defaultValue: 'https://webflow.com/templates/category',
      tooltip: 'Used to build category links when explicit Category URLs are not supplied.',
    }),
    creatorName: props.Text({ name: 'Creator Name', defaultValue: '' }),
    creatorLink: props.Link({ name: 'Creator URL' }),
    creatorAvatar: props.Image({ name: 'Creator Avatar' }),
    summary: props.Text({ name: 'Summary', defaultValue: '' }),
    reviewerPickReason: props.Text({
      name: 'Reviewer Pick Reason',
      defaultValue: '',
      tooltip: 'Bind to Templates CMS field: Reviewer Pick Reason (featured templates). Empty values hide the callout.',
    }),
    publishedDate: props.Text({
      name: 'Updated Date',
      defaultValue: '',
      tooltip: 'Display label such as "May 2026" or a CMS date formatted by Webflow.',
    }),
    price: props.Text({ name: 'Marketplace Price', defaultValue: '' }),
    isFree: props.Boolean({ name: 'Is Free', defaultValue: false }),
    browserPreviewUrl: props.Link({ name: 'Browser Preview URL' }),
    designerPreviewUrl: props.Link({ name: 'Designer Preview URL' }),
    previewIframeUrl: props.Link({
      name: 'Preview Iframe URL',
      tooltip: 'Bind to the Templates CMS Direct Link field. The iframe loads after the hero paints.',
    }),
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
    showPreviewIframe: props.Boolean({ name: 'Show Preview Iframe', defaultValue: true }),
    showPreviewDeviceControls: props.Boolean({ name: 'Show Preview Device Controls', defaultValue: true }),
    previewDefaultDevice: props.Variant({
      name: 'Default Preview Device',
      options: previewDeviceOptions,
      defaultValue: 'desktop',
    }),
    showOfferBadge: props.Boolean({ name: 'Show Offer Badge', defaultValue: true }),
    enableAnalytics: props.Boolean({ name: 'Enable Analytics', defaultValue: true }),
  },
});
