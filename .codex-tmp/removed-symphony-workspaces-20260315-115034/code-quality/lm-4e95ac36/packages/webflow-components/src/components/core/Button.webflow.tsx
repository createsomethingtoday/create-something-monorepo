import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { Button } from './Button';

export default declareComponent(Button, {
  name: 'Button',
  description: 'Primary CTA button with shine effect, light/dark modes, and optional animated arrow',
  group: 'Core',
  props: {
    title: props.Text({
      name: 'Button Text',
      defaultValue: 'Learn More',
    }),
    href: props.Text({
      name: 'Link URL',
      defaultValue: '',
      tooltip: 'Leave empty for button behavior',
    }),
    arrow: props.Boolean({
      name: 'Show Arrow',
      defaultValue: false,
      tooltip: 'Animated pulsing arrow icon',
    }),
    light: props.Boolean({
      name: 'Light Mode',
      defaultValue: false,
      tooltip: 'White background with dark text (for dark backgrounds)',
    }),
    variant: props.Variant({
      name: 'Brand Variant',
      options: ['default', 'lithx', 'petrox', 'dme'],
      defaultValue: 'default',
      tooltip: 'Focus ring color',
    }),
  },
});
