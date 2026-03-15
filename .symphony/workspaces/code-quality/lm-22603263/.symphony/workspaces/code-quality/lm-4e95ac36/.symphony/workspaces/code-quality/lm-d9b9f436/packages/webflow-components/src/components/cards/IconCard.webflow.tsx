import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { IconCard } from './IconCard';

export default declareComponent(IconCard, {
  name: 'Icon Card',
  description: 'Feature card with icon/image, title, and optional description',
  group: 'Cards',
  props: {
    title: props.Text({
      name: 'Title',
      defaultValue: 'Feature Title',
    }),
    description: props.Text({
      name: 'Description',
      defaultValue: '',
      tooltip: 'Only shown in "detailed" card style',
    }),
    icon: props.Variant({
      name: 'Icon Shape',
      options: ['circle', 'square', 'triangle', 'hexagon'],
      defaultValue: 'circle',
      tooltip: 'Geometric placeholder icon (overridden by image)',
    }),
    imageUrl: props.Text({
      name: 'Image URL',
      defaultValue: '',
      tooltip: 'Custom image (overrides icon)',
    }),
    href: props.Text({
      name: 'Link URL',
      defaultValue: '',
    }),
    variant: props.Variant({
      name: 'Brand Color',
      options: ['default', 'lithx', 'petrox', 'dme'],
      defaultValue: 'default',
    }),
    cardVariant: props.Variant({
      name: 'Card Style',
      options: ['default', 'minimal', 'detailed'],
      defaultValue: 'default',
    }),
  },
});
