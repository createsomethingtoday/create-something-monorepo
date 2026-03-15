import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { TextField } from './TextField';

export default declareComponent(TextField, {
  name: 'TextField',
  description: 'Canon text input with label, description, error state, and size controls',
  group: 'Form',
  props: {
    label: props.Text({
      name: 'Label',
      defaultValue: 'Email Address',
    }),
    type: props.Variant({
      name: 'Type',
      options: ['text', 'email', 'password', 'tel', 'url', 'search', 'number'],
      defaultValue: 'text',
    }),
    placeholder: props.Text({
      name: 'Placeholder',
      defaultValue: 'Enter a value',
    }),
    description: props.Text({
      name: 'Description',
      defaultValue: '',
      tooltip: 'Helper text shown below the field when there is no error',
    }),
    error: props.Text({
      name: 'Error',
      defaultValue: '',
      tooltip: 'Error message shown below the field',
    }),
    required: props.Boolean({
      name: 'Required',
      defaultValue: false,
    }),
    disabled: props.Boolean({
      name: 'Disabled',
      defaultValue: false,
    }),
    readOnly: props.Boolean({
      name: 'Read Only',
      defaultValue: false,
    }),
    fieldName: props.Text({
      name: 'Field Name',
      defaultValue: '',
    }),
    autoComplete: props.Text({
      name: 'Autocomplete',
      defaultValue: '',
    }),
    pattern: props.Text({
      name: 'Pattern',
      defaultValue: '',
    }),
    minLength: props.Number({
      name: 'Min Length',
      defaultValue: 0,
      min: 0,
    }),
    maxLength: props.Number({
      name: 'Max Length',
      defaultValue: 0,
      min: 0,
    }),
    size: props.Variant({
      name: 'Size',
      options: ['sm', 'md', 'lg'],
      defaultValue: 'md',
    }),
    value: props.Text({
      name: 'Value',
      defaultValue: '',
    }),
  },
});
