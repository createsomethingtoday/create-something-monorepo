import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { Footer } from './Footer';

export default declareComponent(Footer, {
  name: 'Footer',
  description: 'Site footer with logo, link columns, and social links',
  group: 'Layout',
  props: {
    logo: props.Text({
      name: 'Logo Text/URL',
      defaultValue: 'MAVERICK X',
    }),
    logoIsImage: props.Boolean({
      name: 'Logo is Image',
      defaultValue: false,
    }),
    tagline: props.Text({
      name: 'Tagline',
      defaultValue: 'Transforming industries with sustainable technology.',
    }),
    columns: props.Text({
      name: 'Columns (JSON)',
      defaultValue: '[{"title":"Company","links":[{"label":"About","href":"/about"},{"label":"Careers","href":"/careers"}]},{"title":"Products","links":[{"label":"LithX","href":"/lithx"},{"label":"PetroX","href":"/petrox"}]},{"title":"Resources","links":[{"label":"Documentation","href":"/docs"},{"label":"Contact","href":"/contact"}]}]',
      tooltip: 'JSON array: [{title, links: [{label, href}]}]',
    }),
    socialLinks: props.Text({
      name: 'Social Links (JSON)',
      defaultValue: '[{"platform":"linkedin","href":"https://linkedin.com"},{"platform":"twitter","href":"https://twitter.com"}]',
      tooltip: 'JSON array: [{platform: linkedin|twitter|youtube|instagram|facebook, href}]',
    }),
    copyright: props.Text({
      name: 'Copyright Text',
      defaultValue: '',
      tooltip: 'Leave empty for auto-generated year',
    }),
    variant: props.Variant({
      name: 'Brand Color',
      options: ['default', 'lithx', 'petrox', 'dme'],
      defaultValue: 'default',
    }),
  },
});
