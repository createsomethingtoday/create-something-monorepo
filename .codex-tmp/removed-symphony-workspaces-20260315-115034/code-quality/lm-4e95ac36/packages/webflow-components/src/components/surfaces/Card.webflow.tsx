import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { Card } from './Card';

export default declareComponent(Card, {
  name: 'Card',
  description: 'Canon card surface with variant, radius, padding, and hover controls',
  group: 'Surfaces',
  props: {
    variant: props.Variant({
      name: 'Variant',
      options: ['standard', 'elevated', 'outlined', 'glass'],
      defaultValue: 'standard',
    }),
    radius: props.Variant({
      name: 'Radius',
      options: ['sm', 'md', 'lg', 'xl'],
      defaultValue: 'lg',
    }),
    padding: props.Variant({
      name: 'Padding',
      options: ['none', 'sm', 'md', 'lg', 'xl'],
      defaultValue: 'lg',
    }),
    hover: props.Boolean({
      name: 'Hover',
      defaultValue: false,
    }),
    href: props.Text({
      name: 'Link URL',
      defaultValue: '',
      tooltip: 'Optional link target for clickable cards',
    }),
    title: props.Text({
      name: 'Title',
      defaultValue: 'Card title',
    }),
    body: props.Text({
      name: 'Body',
      defaultValue: 'A reusable Canon card surface for Webflow components.',
    }),
  },
});
