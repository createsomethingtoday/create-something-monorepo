import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { TemplateCard } from './TemplateCard';

export default declareComponent(TemplateCard, {
  name: 'Template Card',
  description:
    'Marketplace template card with agent-extended capabilities: badges, AI score, and notes. Preserves full Finsweet filter/sort compatibility.',
  group: 'Cards',
  props: {
    // Core content
    templateName: props.Text({
      name: 'Template Name',
      defaultValue: 'Template Name',
    }),
    templateLink: props.Link({
      name: 'Template URL',
    }),
    price: props.Text({
      name: 'Price (display)',
      defaultValue: 'Free',
      tooltip: 'Displayed price, e.g. "$39 USD" or "Free"',
    }),
    priceNumeric: props.Text({
      name: 'Price (numeric)',
      defaultValue: '0',
      tooltip: 'Numeric value for Finsweet price sort, e.g. "39"',
    }),
    creatorName: props.Text({
      name: 'Creator Name',
      defaultValue: 'Creator',
    }),
    creatorLink: props.Link({
      name: 'Creator URL',
    }),
    categoryName: props.Text({
      name: 'Category Name',
      defaultValue: '',
      tooltip: 'Primary marketplace category shown when Category Metadata is enabled.',
    }),
    categoryLink: props.Link({
      name: 'Category URL',
    }),
    subcategoryName: props.Text({
      name: 'Subcategory Name',
      defaultValue: '',
      tooltip: 'Primary marketplace subcategory shown when Category Metadata is enabled.',
    }),
    subcategoryLink: props.Link({
      name: 'Subcategory URL',
    }),
    templateType: props.Text({
      name: 'Template Type',
      defaultValue: '',
      tooltip: 'One Page, Multi Page, or Multi Layout.',
    }),
    previewLink: props.Link({
      name: 'Preview URL',
    }),

    // Images
    primaryImage: props.Image({
      name: 'Primary Image',
    }),
    secondaryImage: props.Image({
      name: 'Hover Image',
      tooltip: 'Image shown on hover (replaces primary)',
    }),
    creatorIcon: props.Image({
      name: 'Creator Icon',
      tooltip: 'Creator or studio avatar (28×28)',
    }),

    // Finsweet sort metadata (category filtering handled via nested collection outside component)
    approvalDate: props.Text({
      name: 'Approval Date',
      defaultValue: '',
      tooltip: 'Finsweet sort field: approval-date (e.g. "May 15, 2026")',
    }),
    popularityScore: props.Text({
      name: 'Popularity Score',
      defaultValue: '',
      tooltip: 'Finsweet sort field: popularity-score',
    }),
    cumulativePurchases: props.Text({
      name: 'Rolling 30D Purchases',
      defaultValue: '',
      tooltip:
        'Recent purchase count used to derive marketplace signal badges for standalone cards. Sales buckets take precedence over views.',
    }),
    uniqueViewers: props.Text({
      name: 'Recent Unique Viewers',
      defaultValue: '',
      tooltip:
        'Recent unique viewer count used to derive high-interest marketplace signals for standalone cards when purchase volume is lower.',
    }),
    isFree: props.Boolean({
      name: 'Free Flag',
      defaultValue: false,
      tooltip: 'Mark this template as free. Enables Finsweet "free" filter.',
    }),

    // Agent-extended capabilities
    badgeText: props.Text({
      name: 'Badge Label',
      defaultValue: '',
      tooltip: 'Short label shown over the card image (e.g. "New", "Top Rated"). Leave blank to hide.',
    }),
    badgeVariant: props.Variant({
      name: 'Badge Style',
      options: ['none', 'new', 'featured', 'reviewed', 'top-rated'],
      defaultValue: 'none',
      tooltip: 'Color style for the badge overlay',
    }),
    aiScore: props.Number({
      name: 'AI Score',
      defaultValue: 0,
      tooltip: 'Agent-computed quality score 0–100. Shown when "Show AI Badge" is enabled.',
    }),
    showAiBadge: props.Boolean({
      name: 'Show AI Badge',
      defaultValue: false,
      tooltip: 'Display the AI score badge over the card image',
    }),
    agentNote: props.Text({
      name: 'Agent Note',
      defaultValue: '',
      tooltip: 'Short note appended below the creator name by an agent (e.g. "Matches your stack"). Leave blank to hide.',
    }),
    showCategoryMeta: props.Boolean({
      name: 'Show Category Metadata',
      defaultValue: false,
      tooltip: 'Show category and subcategory metadata under the creator name.',
    }),
    showTemplateType: props.Boolean({
      name: 'Show Template Type',
      defaultValue: false,
      tooltip: 'Show the template type alongside category metadata.',
    }),
    showPreviewLink: props.Boolean({
      name: 'Show Preview Link',
      defaultValue: false,
      tooltip: 'Show a secondary preview link below the card metadata.',
    }),
    previewLabel: props.Text({
      name: 'Preview Label',
      defaultValue: 'Preview',
    }),
    showMarketplaceSignals: props.Boolean({
      name: 'Show Marketplace Signals',
      defaultValue: false,
      tooltip: 'Display compact social-proof signals such as popularity, views, or purchases.',
    }),
    marketplaceSignalsText: props.Text({
      name: 'Marketplace Signals',
      defaultValue: '',
      tooltip:
        'Optional comma-separated override for static cards, e.g. "Top seller, 100+ purchases". Leave blank to derive from purchase/view fields.',
    }),
  },
});
