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
      defaultValue: 'Template Name'
    }),
    templateLink: props.Link({
      name: 'Template URL'
    }),
    price: props.Text({
      name: 'Price (display)',
      defaultValue: 'Free',
      tooltip: 'Displayed price, e.g. "$39 USD" or "Free"'
    }),
    priceNumeric: props.Text({
      name: 'Price (numeric)',
      defaultValue: '0',
      tooltip: 'Numeric value for Finsweet price sort, e.g. "39"'
    }),
    creatorName: props.Text({
      name: 'Creator Name',
      defaultValue: 'Creator'
    }),
    creatorLink: props.Link({
      name: 'Creator URL'
    }),

    // Images
    primaryImage: props.Image({
      name: 'Primary Image'
    }),
    secondaryImage: props.Image({
      name: 'Hover Image',
      tooltip: 'Image shown on hover (replaces primary)'
    }),
    creatorIcon: props.Image({
      name: 'Creator Icon',
      tooltip: 'Creator or studio avatar (28×28)'
    }),

    // Finsweet sort metadata (category filtering handled via nested collection outside component)
    approvalDate: props.Text({
      name: 'Approval Date',
      defaultValue: '',
      tooltip: 'Finsweet sort field: approval-date (e.g. "May 15, 2026")'
    }),
    popularityScore: props.Text({
      name: 'Popularity Score',
      defaultValue: '',
      tooltip: 'Finsweet sort field: popularity-score'
    }),
    isFree: props.Boolean({
      name: 'Free Flag',
      defaultValue: false,
      tooltip: 'Mark this template as free. Enables Finsweet "free" filter.'
    }),

    // Agent-extended capabilities
    badgeText: props.Text({
      name: 'Badge Label',
      defaultValue: '',
      tooltip:
        'Short label shown over the card image (e.g. "New", "Top Rated"). Leave blank to hide.'
    }),
    badgeVariant: props.Variant({
      name: 'Badge Style',
      options: ['none', 'new', 'featured', 'reviewed', 'top-rated'],
      defaultValue: 'none',
      tooltip: 'Color style for the badge overlay'
    }),
    aiScore: props.Number({
      name: 'AI Score',
      defaultValue: 0,
      tooltip: 'Agent-computed quality score 0–100. Shown when "Show AI Badge" is enabled.'
    }),
    showAiBadge: props.Boolean({
      name: 'Show AI Badge',
      defaultValue: false,
      tooltip: 'Display the AI score badge over the card image'
    }),
    agentNote: props.Text({
      name: 'Agent Note',
      defaultValue: '',
      tooltip:
        'Short note appended below the creator name by an agent (e.g. "Matches your stack"). Leave blank to hide.'
    })
  }
});
