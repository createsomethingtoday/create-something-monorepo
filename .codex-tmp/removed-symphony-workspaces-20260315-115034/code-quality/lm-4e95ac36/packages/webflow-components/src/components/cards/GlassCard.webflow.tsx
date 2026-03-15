import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { GlassCard } from './GlassCard';

export default declareComponent(GlassCard, {
  name: 'Glass Card',
  description: 'Glassmorphism container with backdrop blur and shine effects',
  group: 'Cards',
  props: {
    glassVariant: props.Variant({
      name: 'Glass Style',
      options: ['light', 'dark', 'colored'],
      defaultValue: 'light',
    }),
    brandVariant: props.Variant({
      name: 'Brand Color',
      options: ['default', 'lithx', 'petrox', 'dme'],
      defaultValue: 'default',
      tooltip: 'Only applies when Glass Style is "colored"',
    }),
    showShine: props.Boolean({
      name: 'Hover Shine Effect',
      defaultValue: true,
    }),
    padding: props.Variant({
      name: 'Padding',
      options: ['sm', 'md', 'lg'],
      defaultValue: 'md',
    }),
  },
});
