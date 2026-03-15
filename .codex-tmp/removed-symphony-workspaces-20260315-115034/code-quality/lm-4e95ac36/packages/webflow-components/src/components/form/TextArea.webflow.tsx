import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { TextArea } from './TextArea';

export default declareComponent(TextArea, {
  name: 'TextArea',
  description: 'Canon multiline text field with label, description, error state, and rows control',
  group: 'Form',
  props: {
    label: props.Text({
      name: 'Label',
      defaultValue: 'Message',
    }),
    placeholder: props.Text({
      name: 'Placeholder',
      defaultValue: 'Write something helpful',
    }),
    description: props.Text({
      name: 'Description',
      defaultValue: '',
    }),
    error: props.Text({
      name: 'Error',
      defaultValue: '',
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
    rows: props.Number({
      name: 'Rows',
      defaultValue: 5,
      min: 2,
      max: 20,
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
