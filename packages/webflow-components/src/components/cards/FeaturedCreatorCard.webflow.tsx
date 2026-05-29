import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { FeaturedCreatorCard } from './FeaturedCreatorCard';

export default declareComponent(FeaturedCreatorCard, {
  name: 'Featured Creator Card',
  description:
    'CMS-bindable marketplace card for a monthly featured creator batch. Highlights featured count, recent launches, demand, category breadth, and a top template.',
  group: 'Marketplace',
  props: {
    creatorName: props.Text({
      name: 'Creator Name',
      defaultValue: 'Featured Creator',
    }),
    creatorLink: props.Link({
      name: 'Creator URL',
    }),
    creatorAvatar: props.Image({
      name: 'Creator Avatar',
    }),
    monthLabel: props.Text({
      name: 'Month Label',
      defaultValue: 'This month',
      tooltip: 'Shown above the creator name, e.g. "June 2026" or "This month".',
    }),
    rankLabel: props.Text({
      name: 'Rank Label',
      defaultValue: 'Featured',
      tooltip: 'Short badge label, e.g. "#1", "Momentum", or "Editorial pick".',
    }),
    accent: props.Variant({
      name: 'Accent',
      options: ['neutral', 'momentum', 'demand', 'editorial'],
      defaultValue: 'neutral',
      tooltip: 'Subtle visual emphasis for the monthly batch.',
    }),
    headline: props.Text({
      name: 'Headline',
      defaultValue: '12 featured templates',
      tooltip: 'Primary card headline. Bind to a CMS-formatted summary field when available.',
    }),
    curationNote: props.Text({
      name: 'Curation Note',
      defaultValue: 'Selected from marketplace performance, recent launches, and editorial quality signals.',
      tooltip: 'One sentence explaining why this creator is in the monthly batch.',
    }),
    topTemplateName: props.Text({
      name: 'Top Template Name',
      defaultValue: 'Top template',
    }),
    topTemplateLink: props.Link({
      name: 'Top Template URL',
    }),
    topTemplateImage: props.Image({
      name: 'Top Template Image',
    }),
    featuredTemplateCount: props.Text({
      name: 'Featured Templates',
      defaultValue: '12',
      tooltip: 'Public display value for current featured template count.',
    }),
    newTemplates90d: props.Text({
      name: 'New Templates 90d',
      defaultValue: '9',
      tooltip: 'Templates published in the last 90 days.',
    }),
    buyerDemand: props.Text({
      name: 'Buyer Demand',
      defaultValue: '52.6k buys',
      tooltip: 'Public-safe demand label, usually rounded purchases or views.',
    }),
    categoryBreadth: props.Text({
      name: 'Category Breadth',
      defaultValue: '26',
      tooltip: 'Number of marketplace category groups represented by published templates.',
    }),
    ctaLabel: props.Text({
      name: 'CTA Label',
      defaultValue: 'View creator',
    }),
  },
});
