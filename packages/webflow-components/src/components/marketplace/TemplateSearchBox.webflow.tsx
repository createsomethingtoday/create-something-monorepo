import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { TemplateSearchBox } from './TemplateSearchBox';

export default declareComponent(TemplateSearchBox, {
  name: 'Template Search Box',
  description:
    'Marketplace search input that can route to the standalone webflow-template-search results page or filter the current Template Search page in place.',
  group: 'Marketplace',
  props: {
    mode: props.Variant({
      name: 'Mode',
      options: ['route', 'filter'],
      defaultValue: 'route',
      tooltip:
        'Route sends users to a search results page. Filter updates the current page query and Template Grid/Search Results state.',
    }),
    variant: props.Variant({
      name: 'Variant',
      options: ['hero', 'sidebar', 'compact'],
      defaultValue: 'hero',
    }),
    defaultValue: props.Text({
      name: 'Default Value',
      defaultValue: '',
    }),
    placeholder: props.Text({
      name: 'Placeholder',
      defaultValue: 'Search for templates',
    }),
    ariaLabel: props.Text({
      name: 'ARIA Label',
      defaultValue: 'Search Webflow templates',
    }),
    buttonLabel: props.Text({
      name: 'Button Label',
      defaultValue: 'Search',
    }),
    showButton: props.Boolean({
      name: 'Show Button',
      defaultValue: true,
    }),
    searchAction: props.Text({
      name: 'Search Action URL',
      defaultValue: 'https://webflow.com/templates/search-v2',
      tooltip:
        'Destination used by Route mode. Defaults to the standalone template search experiment page.',
    }),
    queryParam: props.Text({
      name: 'Query Param',
      defaultValue: 'q',
    }),
    maxLength: props.Number({
      name: 'Max Length',
      defaultValue: 256,
    }),
    allowEmptySubmit: props.Boolean({
      name: 'Allow Empty Submit',
      defaultValue: false,
      tooltip: 'Useful in Filter mode when an empty submit should clear the current query.',
    }),
    enableAnalytics: props.Boolean({
      name: 'Enable Analytics',
      defaultValue: true,
    }),
    source: props.Text({
      name: 'Event Source',
      defaultValue: 'TemplateSearchBox',
    }),
  },
});
