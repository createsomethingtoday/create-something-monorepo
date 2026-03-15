import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { Dialog } from './Dialog';

export default declareComponent(Dialog, {
  name: 'Dialog',
  description: 'Canon modal dialog with title, description, body, actions, and preview-friendly open state',
  group: 'Feedback',
  props: {
    open: props.Boolean({
      name: 'Open',
      defaultValue: true,
    }),
    title: props.Text({
      name: 'Title',
      defaultValue: 'Dialog title',
    }),
    description: props.Text({
      name: 'Description',
      defaultValue: 'A modal surface for focused decisions and short flows.',
    }),
    body: props.Text({
      name: 'Body',
      defaultValue: 'This dialog is designed for Webflow preview use and Canon-aligned UI composition.',
    }),
    primaryActionLabel: props.Text({
      name: 'Primary Action',
      defaultValue: 'Confirm',
    }),
    secondaryActionLabel: props.Text({
      name: 'Secondary Action',
      defaultValue: 'Cancel',
    }),
    closeOnBackdrop: props.Boolean({
      name: 'Close On Backdrop',
      defaultValue: true,
    }),
    closeOnEscape: props.Boolean({
      name: 'Close On Escape',
      defaultValue: true,
    }),
    size: props.Variant({
      name: 'Size',
      options: ['sm', 'md', 'lg', 'full'],
      defaultValue: 'md',
    }),
  },
});
