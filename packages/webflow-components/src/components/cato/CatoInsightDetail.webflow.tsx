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
    heroCardLabel: props.Text({
      name: 'Hero Card Label',
      defaultValue: '',
      tooltip: 'Optional override for the right-side hero card label.',
    }),
    heroCardTitle: props.Text({
      name: 'Hero Card Title',
      defaultValue: '',
      tooltip: 'Optional override for the right-side hero card title.',
    }),
    heroCardSummary: props.Text({
      name: 'Hero Card Summary',
      defaultValue: '',
      tooltip: 'Optional override for the right-side hero card summary.',
    }),
    heroCardCta: props.Text({
      name: 'Hero Card CTA',
      defaultValue: '',
      tooltip: 'Optional CTA text for the right-side hero card.',
    }),
    heroCardLink: props.Link({
      name: 'Hero Card Link',
      tooltip: 'Preferred: select the Webflow page for the right-side hero card CTA.',
    }),
    heroCardHref: props.Text({
      name: 'Hero Card URL Fallback',
      defaultValue: '',
      tooltip: 'Optional URL fallback used when Hero Card Link is not set.',
    }),
    featuredImage: props.Image({
      name: 'Featured Image',
      tooltip: 'Bind to the Insights Featured Image field on the CMS template.',
    }),
    featuredImageUrl: props.Text({
      name: 'Featured Image URL',
      defaultValue: '',
      tooltip: 'Optional URL fallback for endpoint-powered detail pages.',
    }),
    featuredImageAlt: props.Text({
      name: 'Featured Image Alt',
      defaultValue: '',
      tooltip: 'Optional alt text override. Defaults to the image alt text or insight title.',
    }),
    featuredImageCaption: props.Text({
      name: 'Featured Image Caption',
      defaultValue: '',
      tooltip: 'Optional caption shown beneath the featured image.',
    }),
    featuredImageFit: props.Variant({
      name: 'Featured Image Fit',
      options: ['contain', 'cover'],
      defaultValue: 'contain',
      tooltip: 'Use contain for full graphics and cover for cropped photo-style hero images.',
    }),
    takeawaysPlacement: props.Variant({
      name: 'Key Takeaways Placement',
      options: ['main', 'sidebar', 'both', 'hidden'],
      defaultValue: 'main',
      tooltip: 'Choose where the Key Takeaways box renders on the detail page.',
    }),
    shareCtaLabel: props.Text({
      name: 'Share CTA Label',
      defaultValue: '',
      tooltip: 'Optional share/download CTA shown near the top of the article.',
    }),
    shareCtaLink: props.Link({
      name: 'Share CTA Link',
      tooltip: 'Preferred: select the Webflow link for the share/download CTA.',
    }),
    shareCtaHref: props.Text({
      name: 'Share CTA URL Fallback',
      defaultValue: '',
      tooltip: 'Optional URL fallback used when Share CTA Link is not set.',
    }),
    relatedRailTitle: props.Text({
      name: 'Related Rail Title',
      defaultValue: 'Featured articles',
      tooltip: 'Heading for the right-side related/featured articles rail.',
    }),
    relatedItemsJson: props.Text({
      name: 'Related Items JSON',
      defaultValue: '',
      tooltip: 'Optional JSON array: [{title, href, meta, summary}]. Defaults to related items in the same archive.',
    }),
    showRelatedRail: props.Boolean({
      name: 'Show Related Rail',
      defaultValue: true,
    }),
    showResourceDetails: props.Boolean({
      name: 'Show Resource Details',
      defaultValue: false,
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
    itemsEndpointUrl: props.Text({
      name: 'Items Endpoint URL',
      defaultValue: '',
      tooltip: 'Public JSON endpoint that returns normalized Insight items. Do not use a secret Webflow API URL here.',
    }),
    fetchItems: props.Boolean({
      name: 'Fetch Endpoint Items',
      defaultValue: true,
      tooltip: 'Fetch Items Endpoint URL in the browser and use returned detail fallback items.',
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
