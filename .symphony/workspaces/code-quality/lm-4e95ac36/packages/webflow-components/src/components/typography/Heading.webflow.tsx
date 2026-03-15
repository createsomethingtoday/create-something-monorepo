import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { Heading } from './Heading';

export default declareComponent(Heading, {
  name: 'Heading',
  description: 'Canon heading with fluid typography and semantic level control',
  group: 'Typography',
  props: {
    content: props.Text({
      name: 'Content',
      defaultValue: 'A heading that carries the page',
    }),
    level: props.Number({
      name: 'Level',
      defaultValue: 2,
      min: 1,
      max: 6,
    }),
    fluidScale: props.Variant({
      name: 'Scale',
      options: ['canonical', 'custom'],
      defaultValue: 'canonical',
    }),
    min: props.Text({
      name: 'Custom Min',
      defaultValue: '',
      tooltip: 'Used when Scale is custom, e.g. 2rem',
    }),
    max: props.Text({
      name: 'Custom Max',
      defaultValue: '',
      tooltip: 'Used when Scale is custom, e.g. 4rem',
    }),
    tone: props.Variant({
      name: 'Tone',
      options: ['primary', 'secondary', 'tertiary', 'muted', 'subtle'],
      defaultValue: 'primary',
    }),
    align: props.Variant({
      name: 'Align',
      options: ['left', 'center', 'right'],
      defaultValue: 'left',
    }),
  },
});
