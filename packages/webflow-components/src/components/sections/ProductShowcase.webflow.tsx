import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { ProductShowcase } from './ProductShowcase';

export default declareComponent(ProductShowcase, {
  name: 'Product Showcase',
  description: 'Three-column product grid with video backgrounds and hover effects',
  group: 'Sections',
  props: {
    products: props.Text({
      name: 'Products (JSON)',
      defaultValue: '[{"name":"LithX","tagline":"Mining Solutions","description":"Advanced lithium extraction technology.","url":"#"},{"name":"PetroX","tagline":"Oil & Gas Technology","description":"Innovative produced water treatment.","url":"#"},{"name":"DME","tagline":"Water Treatment","description":"Direct metal extraction solutions.","url":"#"}]',
      tooltip: 'JSON array: [{name, tagline, description?, url, videoSrc?, imageSrc?}]',
    }),
    variant: props.Variant({
      name: 'Brand Color',
      options: ['default', 'lithx', 'petrox', 'dme'],
      defaultValue: 'default',
    }),
  },
});
