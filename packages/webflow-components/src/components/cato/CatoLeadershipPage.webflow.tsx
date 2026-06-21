import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { CatoLeadershipPage } from './CatoCompanyPages';

export default declareComponent(CatoLeadershipPage, {
  name: 'Cato Leadership Page',
  description: 'Dedicated About dropdown page for Cato leadership profiles with self-contained Cato styling.',
  group: 'Cato Supply',
  options: {
    applyTagSelectors: true,
  },
  props: {
    title: props.Text({
      name: 'Hero Title',
      defaultValue: 'Meet the team helping hospitals protect supply continuity',
    }),
    summary: props.Text({
      name: 'Hero Summary',
      defaultValue:
        'Cato combines healthcare procurement experience, supplier network discipline, and operator-led execution to help supply chain teams respond when standard channels cannot keep pace.',
    }),
    leadershipJson: props.Text({
      name: 'Leadership JSON',
      defaultValue: '',
      tooltip: 'Optional JSON array of leadership members: name, role, bio, imageUrl, linkedinUrl.',
    }),
    assetBasePath: props.Text({
      name: 'Asset Base Path',
      defaultValue: '',
      tooltip: 'Optional prefix for relative profile image paths.',
    }),
    ctaLabel: props.Text({
      name: 'CTA Label',
      defaultValue: 'Contact Us',
    }),
    ctaHref: props.Text({
      name: 'CTA URL',
      defaultValue: '/contact-us',
    }),
  },
});
