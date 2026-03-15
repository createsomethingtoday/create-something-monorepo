import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { StatsDisplay } from './StatsDisplay';

export default declareComponent(StatsDisplay, {
  name: 'Stats Display',
  description: 'Animated statistics display with count-up effect',
  group: 'Data',
  props: {
    stats: props.Text({
      name: 'Stats Data (JSON)',
      defaultValue: '[{"value":99,"suffix":"%","label":"Recovery Rate"},{"value":50,"suffix":"+","label":"Installations"},{"value":24,"suffix":"/7","label":"Support"}]',
      tooltip: 'JSON array of stats: [{value, suffix?, prefix?, label}]',
    }),
    columns: props.Variant({
      name: 'Columns',
      options: ['2', '3', '4'],
      defaultValue: '3',
    }),
    variant: props.Variant({
      name: 'Style',
      options: ['default', 'cards', 'minimal'],
      defaultValue: 'default',
    }),
    brandVariant: props.Variant({
      name: 'Brand Color',
      options: ['default', 'lithx', 'petrox', 'dme'],
      defaultValue: 'default',
    }),
    animated: props.Boolean({
      name: 'Count-Up Animation',
      defaultValue: true,
      tooltip: 'Animate numbers from 0 on load',
    }),
  },
});
