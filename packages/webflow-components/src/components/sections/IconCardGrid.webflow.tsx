import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { IconCardGrid } from './IconCardGrid';

export default declareComponent(IconCardGrid, {
  name: 'Icon Card Grid',
  description: 'Grid of icon cards with configurable columns and styles',
  group: 'Sections',
  props: {
    heading: props.Text({
      name: 'Section Heading',
      defaultValue: '',
      tooltip: 'Optional section heading above the grid',
    }),
    cards: props.Text({
      name: 'Cards Data (JSON)',
      defaultValue: '[{"title":"High Efficiency","description":"99% metal recovery rate","icon":"circle"},{"title":"Sustainable","description":"Zero waste process","icon":"hexagon"},{"title":"Scalable","description":"From pilot to industrial scale","icon":"square"},{"title":"Cost Effective","description":"Reduce operational costs","icon":"triangle"}]',
      tooltip: 'JSON array: [{title, description?, icon?, imageUrl?, href?}]',
    }),
    columns: props.Variant({
      name: 'Columns',
      options: ['2', '3', '4'],
      defaultValue: '3',
    }),
    cardVariant: props.Variant({
      name: 'Card Style',
      options: ['default', 'minimal', 'detailed'],
      defaultValue: 'default',
    }),
    variant: props.Variant({
      name: 'Brand Color',
      options: ['default', 'lithx', 'petrox', 'dme'],
      defaultValue: 'default',
    }),
  },
});
