import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { Navigation } from './Navigation';

export default declareComponent(Navigation, {
  name: 'Navigation',
  description: 'Canon primary navigation with active link state, CTA, and mobile menu',
  group: 'Navigation',
  props: {
    logo: props.Text({
      name: 'Logo',
      defaultValue: 'CREATE SOMETHING',
    }),
    logoSuffix: props.Text({
      name: 'Logo Suffix',
      defaultValue: '',
    }),
    logoHref: props.Text({
      name: 'Logo Link',
      defaultValue: '/',
    }),
    links: props.Text({
      name: 'Links (JSON)',
      defaultValue:
        '[{"label":"Home","href":"/"},{"label":"Work","href":"/work"},{"label":"Papers","href":"/papers"},{"label":"Contact","href":"/contact"}]',
      tooltip: 'JSON array: [{label, href}]',
    }),
    currentPath: props.Text({
      name: 'Current Path',
      defaultValue: '/',
      tooltip: 'Used to determine active nav state',
    }),
    fixed: props.Boolean({
      name: 'Fixed',
      defaultValue: false,
    }),
    ctaLabel: props.Text({
      name: 'CTA Label',
      defaultValue: '',
    }),
    ctaHref: props.Text({
      name: 'CTA Link',
      defaultValue: '',
    }),
    mobileMenuLabel: props.Text({
      name: 'Mobile Menu Label',
      defaultValue: 'Menu',
    }),
  },
});
