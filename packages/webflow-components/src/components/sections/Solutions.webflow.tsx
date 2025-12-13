import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { Solutions } from './Solutions';

export default declareComponent(Solutions, {
  name: 'Solutions',
  description: 'Tabbed content section with text, features, and images',
  group: 'Sections',
  props: {
    heading: props.Text({
      name: 'Section Heading',
      defaultValue: 'Our Solutions',
    }),
    tabs: props.Text({
      name: 'Tabs Data (JSON)',
      defaultValue: '[{"id":"standard","title":"Standard","subtitle":"Entry-level","description":"Perfect for small operations.","features":["99% efficiency","24/7 monitoring"]},{"id":"advanced","title":"Advanced","subtitle":"Enhanced","description":"For larger operations.","features":["Higher capacity","AI optimization"]},{"id":"enterprise","title":"Enterprise","subtitle":"Full-scale","description":"Enterprise-level operations.","features":["Unlimited scale","Custom integrations"]}]',
      tooltip: 'JSON array: [{id, title, subtitle?, description, features?, imageSrc?}]',
    }),
    variant: props.Variant({
      name: 'Brand Color',
      options: ['default', 'lithx', 'petrox', 'dme'],
      defaultValue: 'default',
    }),
  },
});
