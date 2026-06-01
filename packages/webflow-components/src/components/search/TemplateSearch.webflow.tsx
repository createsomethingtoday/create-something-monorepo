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
      defaultValue: 'https://templates.webflow.com/templates-api',
      tooltip: 'Base URL of the CSP-safe template search proxy. Use https://templates.webflow.com/templates-api on webflow.com.',
    }),
    searchResultsUrl: props.Text({
      name: 'Search Results URL',
      defaultValue: '',
      tooltip: 'URL to navigate to on Enter — query is appended as ?query=. Leave empty to stay on the current page (search-v2 pattern).',
    }),
    collectionBase: props.Text({
      name: 'Template Detail Base URL',
      defaultValue: '/templates/html/',
      tooltip: 'Fallback base path for template detail pages. Used only if the search API item has no URL.',
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
