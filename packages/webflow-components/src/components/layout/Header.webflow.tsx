import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { Header } from './Header';

export default declareComponent(Header, {
  name: 'Header',
  description: 'Site header with logo, navigation, and mobile menu',
  group: 'Layout',
  props: {
    logo: props.Text({
      name: 'Logo Text/URL',
      defaultValue: 'MAVERICK X',
    }),
    logoIsImage: props.Boolean({
      name: 'Logo is Image',
      defaultValue: false,
      tooltip: 'If true, logo is treated as an image URL',
    }),
    logoIcon: props.Text({
      name: 'Logo Icon URL',
      defaultValue: '',
      tooltip: 'Icon-only logo for collapsed state (enables animation)',
    }),
    logoExpanded: props.Boolean({
      name: 'Logo Expanded',
      defaultValue: true,
      tooltip: 'True on home page (full logo), false on internal pages (icon only)',
    }),
    animateLogo: props.Boolean({
      name: 'Animate Logo',
      defaultValue: false,
      tooltip: 'Animate logo expansion on page load (600ms delay)',
    }),
    navItems: props.Text({
      name: 'Nav Items (JSON)',
      defaultValue: '[{"label":"Products","href":"/products"},{"label":"Solutions","href":"/solutions"},{"label":"About","href":"/about"},{"label":"Contact","href":"/contact"}]',
      tooltip: 'JSON array: [{label, href}]',
    }),
    ctaText: props.Text({
      name: 'CTA Button Text',
      defaultValue: '',
      tooltip: 'Optional CTA button in navigation',
    }),
    ctaHref: props.Text({
      name: 'CTA Button Link',
      defaultValue: '',
    }),
    variant: props.Variant({
      name: 'Brand Color',
      options: ['default', 'lithx', 'petrox', 'dme'],
      defaultValue: 'default',
    }),
    lightMode: props.Boolean({
      name: 'Light Mode',
      defaultValue: true,
      tooltip: 'Light text for dark backgrounds',
    }),
  },
});
