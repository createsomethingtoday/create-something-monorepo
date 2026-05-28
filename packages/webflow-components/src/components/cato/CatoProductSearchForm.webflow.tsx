import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { CatoProductSearchForm } from './CatoProductSearch';

export default declareComponent(CatoProductSearchForm, {
  name: 'Cato Product Search Form',
  description: 'Search form that redirects queries to the Cato product search app.',
  group: 'Cato Supply',
  options: {
    applyTagSelectors: true,
  },
  props: {
    placeholder: props.Text({
      name: 'Placeholder',
      defaultValue: 'Search by product, brand, manufacturer, part number, or description',
    }),
    buttonLabel: props.Text({
      name: 'Button Label',
      defaultValue: 'Search',
    }),
    productSearchUrl: props.Text({
      name: 'Product Search URL',
      defaultValue: 'https://app.catosupply.com/product_search/',
    }),
    initialQuery: props.Text({
      name: 'Initial Query',
      defaultValue: '',
    }),
    compact: props.Boolean({
      name: 'Compact',
      defaultValue: false,
    }),
  },
});
