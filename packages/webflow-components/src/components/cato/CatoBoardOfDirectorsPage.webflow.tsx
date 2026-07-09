import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { CatoBoardOfDirectorsPage } from './CatoCompanyPages';

export default declareComponent(CatoBoardOfDirectorsPage, {
  name: 'Cato Board of Directors Page',
  description: 'Dedicated Cato Board of Directors profile page with self-contained Cato styling.',
  group: 'Cato Supply',
  options: {
    applyTagSelectors: true,
  },
  props: {
    title: props.Text({
      name: 'Hero Title',
      defaultValue: 'Governance built for resilient healthcare supply',
    }),
    summary: props.Text({
      name: 'Hero Summary',
      defaultValue:
        'Cato is guided by leaders with healthcare, technology, impact investing, operating, and growth experience so hospitals can rely on stronger supply pathways when disruption hits.',
    }),
    teamMembersJson: props.Text({
      name: 'Team Members JSON',
      defaultValue: '',
      tooltip: 'Optional full Team Members API response or array. Items are filtered to Board Member and Both.',
    }),
    boardJson: props.Text({
      name: 'Board JSON',
      defaultValue: '',
      tooltip: 'Optional JSON array of board members: name, role, bio, imageUrl, linkedinUrl.',
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
      tooltip: 'Reserved for relative board image paths if Cato provides them later.',
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
