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
    teamMembersJson: props.Text({
      name: 'Team Members JSON',
      defaultValue: '',
      tooltip: 'Optional full Team Members API response or array. Items are filtered to Leadership Team and Both.',
    }),
    leadershipJson: props.Text({
      name: 'Leadership JSON',
      defaultValue: '',
      tooltip: 'Optional JSON array of leadership members: name, role, bio, imageUrl, linkedinUrl.',
    }),
    teamMembersEndpointUrl: props.Text({
      name: 'Team Members Endpoint URL',
      defaultValue: '',
      tooltip: 'Optional public endpoint returning Team Members items. Do not use a private Webflow API URL that requires a token.',
    }),
    fetchTeamMembers: props.Boolean({
      name: 'Fetch Endpoint Team Members',
      defaultValue: false,
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
