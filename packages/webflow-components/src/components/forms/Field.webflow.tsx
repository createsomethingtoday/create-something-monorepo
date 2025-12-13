import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { Field } from './Field';

export default declareComponent(Field, {
  name: 'Field',
  description: 'Form input field with label, validation, and textarea support',
  group: 'Forms',
  props: {
    label: props.Text({
      name: 'Label',
      defaultValue: 'Email Address',
    }),
    placeholder: props.Text({
      name: 'Placeholder',
      defaultValue: 'Enter your email...',
    }),
    type: props.Variant({
      name: 'Input Type',
      options: ['text', 'email', 'tel', 'url', 'password', 'number'],
      defaultValue: 'text',
    }),
    textarea: props.Boolean({
      name: 'Textarea Mode',
      defaultValue: false,
      tooltip: 'Render as multi-line textarea',
    }),
    required: props.Boolean({
      name: 'Required',
      defaultValue: false,
    }),
    note: props.Text({
      name: 'Helper Note',
      defaultValue: '',
      tooltip: 'Helper text below the field',
    }),
    error: props.Text({
      name: 'Error Message',
      defaultValue: '',
      tooltip: 'Error state message (shows red border)',
    }),
    fieldName: props.Text({
      name: 'Field Name',
      defaultValue: '',
      tooltip: 'HTML name attribute for form submission',
    }),
  },
});
