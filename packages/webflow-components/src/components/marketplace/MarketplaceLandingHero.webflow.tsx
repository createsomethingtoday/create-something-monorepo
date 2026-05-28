import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { MarketplaceLandingHero, DEFAULT_HERO_SUGGESTIONS_JSON } from './MarketplaceLandingHero';

export default declareComponent(MarketplaceLandingHero, {
  name: 'Marketplace Landing Hero',
  description:
    'Templates marketplace hero with search submit and search-backed popular category suggestion chips.',
  group: 'Marketplace',
  props: {
    apiBase: props.Text({
      name: 'API Base URL',
      defaultValue: '',
      tooltip:
        'Base URL for the template search API (no trailing slash). Leave blank for production default.',
    }),
    title: props.Text({
      name: 'Title',
      defaultValue: 'Customizable HTML website templates for every need',
    }),
    description: props.Text({
      name: 'Description',
      defaultValue:
        'Build a website tailored to your needs with our curated collection of HTML website templates, fully customizable and built for seamless, responsive web design.',
    }),
    searchPlaceholder: props.Text({
      name: 'Search Placeholder',
      defaultValue: 'Search all templates (e.g. Business, Portfolio)',
    }),
    searchAction: props.Text({
      name: 'Search Action URL',
      defaultValue: 'https://webflow.com/templates/search',
      tooltip: 'Destination URL for search submissions.',
    }),
    queryParam: props.Text({
      name: 'Query Param',
      defaultValue: 'query',
      tooltip: 'Query parameter name used for the search term.',
    }),
    searchExperience: props.Variant({
      name: 'Search Experience',
      options: ['native', 'template_search', 'custom'],
      defaultValue: 'native',
      tooltip:
        'Native keeps the current Webflow search destination. Template Search routes to the standalone webflow-template-search experience. Custom uses Search Action URL and Query Param.',
    }),
    templateSearchAction: props.Text({
      name: 'Template Search URL',
      defaultValue: 'https://webflow.com/templates/search-v2',
      tooltip: 'Destination URL used when Search Experience is Template Search.',
    }),
    templateSearchQueryParam: props.Text({
      name: 'Template Search Query Param',
      defaultValue: 'q',
      tooltip: 'Query parameter name used by the standalone template search experience.',
    }),
    suggestions: props.Text({
      name: 'Fallback Suggestions (JSON)',
      defaultValue: DEFAULT_HERO_SUGGESTIONS_JSON,
      tooltip:
        'JSON array of {label, href, count?}. Used as fallback, or as pinned suggestions when Use Search Suggestions is off.',
    }),
    useSearchSuggestions: props.Boolean({
      name: 'Use Search Suggestions',
      defaultValue: true,
      tooltip: 'Populate suggestion chips from the template search API category pills.',
    }),
    maxSuggestions: props.Number({
      name: 'Max Suggestions',
      defaultValue: 6,
      tooltip: 'Maximum suggestion chips to render. Capped at 10.',
    }),
    showSuggestions: props.Boolean({
      name: 'Show Suggestions',
      defaultValue: true,
    }),
    enableAnalytics: props.Boolean({
      name: 'Enable Analytics',
      defaultValue: true,
      tooltip:
        'Track search submissions and suggestion clicks through wf_analytics and the marketplaceLandingAnalytics DOM event.',
    }),
    experimentRole: props.Variant({
      name: 'Experiment Role',
      options: ['none', 'control', 'treatment'],
      defaultValue: 'treatment',
      tooltip: 'Used by Marketplace Landing Experiment Gate to show or hide this component during A/B tests.',
    }),
  },
});
