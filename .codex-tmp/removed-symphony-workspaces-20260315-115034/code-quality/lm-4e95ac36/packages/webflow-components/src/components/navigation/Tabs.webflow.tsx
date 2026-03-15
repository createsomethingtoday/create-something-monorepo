import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { Tabs } from './Tabs';

export default declareComponent(Tabs, {
  name: 'Tabs',
  description: 'Canon tabs primitive with keyboard navigation and Webflow-friendly JSON content',
  group: 'Navigation',
  props: {
    tabs: props.Text({
      name: 'Tabs (JSON)',
      defaultValue:
        '[{"id":"overview","label":"Overview","content":"A reusable Canon tabs primitive for Webflow."},{"id":"details","label":"Details","content":"Switch between panels with keyboard and pointer interaction."},{"id":"notes","label":"Notes","content":"Use JSON input to define labels, ids, and panel content."}]',
      tooltip: 'JSON array: [{id, label, content?, disabled?}]',
    }),
    activeTab: props.Text({
      name: 'Active Tab ID',
      defaultValue: '',
      tooltip: 'Optional initial tab id',
    }),
    variant: props.Variant({
      name: 'Variant',
      options: ['default', 'pills', 'underline'],
      defaultValue: 'default',
    }),
    size: props.Variant({
      name: 'Size',
      options: ['sm', 'md', 'lg'],
      defaultValue: 'md',
    }),
  },
});
