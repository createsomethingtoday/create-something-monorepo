import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { Select } from './Select';

export default declareComponent(Select, {
  name: 'Select',
  description: 'Dropdown select field with custom styling',
  group: 'Forms',
  props: {
    label: props.Text({
      name: 'Label',
      defaultValue: 'Category',
    }),
    placeholder: props.Text({
      name: 'Placeholder',
      defaultValue: 'Select an option',
    }),
    items: props.Text({
      name: 'Options',
      defaultValue: 'Option 1, Option 2, Option 3',
      tooltip: 'Comma-separated list of options',
    }),
    required: props.Boolean({
      name: 'Required',
      defaultValue: false,
    }),
    fieldName: props.Text({
      name: 'Field Name',
      defaultValue: '',
      tooltip: 'HTML name attribute for form submission',
    }),
  },
});
