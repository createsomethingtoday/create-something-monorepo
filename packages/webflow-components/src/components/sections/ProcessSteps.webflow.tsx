import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { ProcessSteps } from './ProcessSteps';

export default declareComponent(ProcessSteps, {
  name: 'Process Steps',
  description: 'Step-by-step process navigator with clickable steps and dot pagination',
  group: 'Sections',
  props: {
    heading: props.Text({
      name: 'Section Heading',
      defaultValue: 'How It Works',
    }),
    steps: props.Text({
      name: 'Steps Data (JSON)',
      defaultValue: '[{"id":"1","number":1,"title":"Assessment","description":"Analyze current operations."},{"id":"2","number":2,"title":"Design","description":"Custom solution architecture."},{"id":"3","number":3,"title":"Implementation","description":"Seamless deployment."},{"id":"4","number":4,"title":"Optimization","description":"Continuous improvement."}]',
      tooltip: 'JSON array: [{id, number, title, description, imageSrc?}]',
    }),
    variant: props.Variant({
      name: 'Brand Color',
      options: ['default', 'lithx', 'petrox', 'dme'],
      defaultValue: 'default',
    }),
  },
});
