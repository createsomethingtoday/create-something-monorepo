import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { TemplateSearch } from './TemplateSearch';

export default declareComponent(TemplateSearch, {
  name: 'Template Search',
  description: 'Search input with typeahead suggestions. Reads and writes ?query= URL param so Template Grid re-fetches without a page reload.',
  group: 'Template Marketplace',
  props: {
    apiBaseUrl: props.Text({
      name: 'API Base URL',
      defaultValue: '',
      tooltip: 'Base URL of the webflow-template-search worker, e.g. https://webflow-template-search.workers.dev. Leave empty to use the same origin.',
    }),
    searchResultsUrl: props.Text({
      name: 'Search Results URL',
      defaultValue: '',
      tooltip: 'URL to navigate to on Enter — query is appended as ?query=. Leave empty to stay on the current page (search-v2 pattern).',
    }),
    collectionBase: props.Text({
      name: 'Category Base URL',
      defaultValue: '/templates/category/',
      tooltip: 'Base path for category pages. Suggestion clicks navigate here + the template slug.',
    }),
    placeholder: props.Text({
      name: 'Placeholder',
      defaultValue: 'Search templates…',
    }),
    maxSuggestions: props.Text({
      name: 'Max Suggestions',
      defaultValue: '5',
      tooltip: 'Number of typeahead suggestions to show (1–10).',
    }),
    queryParamKey: props.Text({
      name: 'Query Param Key',
      defaultValue: 'query',
      tooltip: 'URL search param name. Use "query" to match the existing /templates/search page.',
    }),
  },
});
