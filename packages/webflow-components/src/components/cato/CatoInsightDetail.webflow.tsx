import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { CatoInsightDetail } from './CatoInsights';

export default declareComponent(CatoInsightDetail, {
  name: 'Cato Insight Detail',
  description:
    'Cato Insight detail page that can render default exported content or bind direct CMS fields.',
  group: 'Cato Supply',
  options: {
    applyTagSelectors: false
  },
  props: {
    slug: props.Text({
      name: 'Default Slug',
      defaultValue: '2026-supply-disruption-preparedness-brief'
    }),
    title: props.Text({
      name: 'Title Override',
      defaultValue: ''
    }),
    summary: props.Text({
      name: 'Summary Override',
      defaultValue: ''
    }),
    resourceType: props.Text({
      name: 'Resource Type Override',
      defaultValue: ''
    }),
    date: props.Text({
      name: 'Date Override',
      defaultValue: ''
    }),
    pill: props.Text({
      name: 'Pill Override',
      defaultValue: ''
    }),
    audience: props.Text({
      name: 'Audience Override',
      defaultValue: ''
    }),
    heroCardLabel: props.Text({
      name: 'Hero Card Label',
      defaultValue: '',
      tooltip:
        'Optional label for the card on the right side of the detail-page hero. Defaults to Resource Type.'
    }),
    heroCardTitle: props.Text({
      name: 'Hero Card Title',
      defaultValue: '',
      tooltip:
        'Optional title for the card on the right side of the detail-page hero. Defaults to the selected archive title.'
    }),
    heroCardSummary: props.Text({
      name: 'Hero Card Summary',
      defaultValue: '',
      tooltip:
        'Optional summary for the card on the right side of the detail-page hero. Defaults to the audience context.'
    }),
    heroCardCta: props.Text({
      name: 'Hero Card CTA Label',
      defaultValue: '',
      tooltip: 'Optional link label for the card on the right side of the detail-page hero.'
    }),
    heroCardHref: props.Text({
      name: 'Hero Card URL',
      defaultValue: '',
      tooltip:
        'Optional URL for the hero card CTA. If blank, the selected archive URL is used when a CTA label is set.'
    }),
    featuredImage: props.Image({
      name: 'Featured Image',
      tooltip: 'Bind to the Insights featured image field on the CMS template.'
    }),
    featuredImageUrl: props.Text({
      name: 'Featured Image URL',
      defaultValue: '',
      tooltip: 'Optional direct image URL fallback when an image field is not bound.'
    }),
    featuredImageAlt: props.Text({
      name: 'Featured Image Alt',
      defaultValue: '',
      tooltip: 'Alt text for the featured image. Defaults to the article title when blank.'
    }),
    featuredImageCaption: props.Text({
      name: 'Featured Image Caption',
      defaultValue: '',
      tooltip: 'Optional caption or source credit shown below the featured image.'
    }),
    featuredImageFit: props.Variant({
      name: 'Featured Image Fit',
      options: ['cover', 'contain'],
      defaultValue: 'cover',
      tooltip: 'Controls how the featured image fits within the article image frame.'
    }),
    categoryId: props.Variant({
      name: 'Archive',
      options: ['resiliency', 'research', 'resources', 'newsroom'],
      defaultValue: 'resiliency'
    }),
    bodyHtml: props.RichText({
      name: 'Main Content HTML',
      defaultValue: '',
      tooltip: 'Bind to the Insights Main Content rich text field on the CMS template.'
    }),
    bodyJson: props.Text({
      name: 'Body JSON',
      defaultValue: '',
      tooltip:
        'Optional fallback JSON array: [{heading, paragraphs, bullets?}]. Rich text binding takes precedence.'
    }),
    takeawaysHtml: props.RichText({
      name: 'Key Takeaways HTML',
      defaultValue: '',
      tooltip: 'Bind to the Insights Key Takeaways rich text field on the CMS template.'
    }),
    takeawaysJson: props.Text({
      name: 'Takeaways JSON',
      defaultValue: '',
      tooltip: 'Optional fallback JSON array of strings. Rich text binding takes precedence.'
    }),
    takeawaysPlacement: props.Variant({
      name: 'Takeaways Placement',
      options: ['main', 'sidebar', 'both', 'hidden'],
      defaultValue: 'main',
      tooltip: 'Controls where the Key Takeaways box appears on the article detail page.'
    }),
    shareCtaLabel: props.Text({
      name: 'Share CTA Label',
      defaultValue: 'Share',
      tooltip: 'Optional CTA shown below the article headline. Leave blank to hide.'
    }),
    shareCtaHref: props.Text({
      name: 'Share CTA URL',
      defaultValue: '',
      tooltip: 'Optional URL for the share CTA. If blank, the component uses a mailto share link.'
    }),
    relatedRailTitle: props.Text({
      name: 'Related Rail Title',
      defaultValue: '',
      tooltip: 'Optional title for the right-side latest/featured article rail.'
    }),
    relatedItemsJson: props.Text({
      name: 'Related Items JSON',
      defaultValue: '',
      tooltip:
        'Optional JSON array: [{ "title": "...", "href": "...", "resourceType": "...", "date": "..." }]. Defaults to same-archive items.'
    }),
    showRelatedRail: props.Boolean({
      name: 'Show Related Rail',
      defaultValue: true,
      tooltip: 'Shows the right-side latest or featured article list.'
    }),
    showResourceDetails: props.Boolean({
      name: 'Show Resource Details',
      defaultValue: false,
      tooltip: 'Shows the legacy resource details card in the right rail.'
    }),
    categoriesJson: props.Text({
      name: 'Categories JSON',
      defaultValue: ''
    }),
    itemsJson: props.Text({
      name: 'Items JSON',
      defaultValue: ''
    }),
    itemsEndpointUrl: props.Text({
      name: 'Items Endpoint URL',
      defaultValue:
        'https://cato-supply-insights-cms.createsomething.workers.dev/api/cato/insights',
      tooltip:
        'Public JSON endpoint that returns normalized Insight items. Do not use a secret Webflow API URL here.'
    }),
    fetchItems: props.Boolean({
      name: 'Fetch Endpoint Items',
      defaultValue: true,
      tooltip: 'Fetch Items Endpoint URL in the browser and use returned detail fallback items.'
    }),
    linkMode: props.Variant({
      name: 'Link Mode',
      options: ['webflow', 'export'],
      defaultValue: 'webflow'
    }),
    pathPrefix: props.Text({
      name: 'Path Prefix',
      defaultValue: ''
    })
  }
});
