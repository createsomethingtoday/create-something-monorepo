import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { CatoBoardOfDirectorsPage } from './CatoCompanyPages';

export default declareComponent(CatoBoardOfDirectorsPage, {
  name: 'Cato Board of Directors Page',
  description: 'Dedicated Cato Board of Directors profile page with self-contained Cato styling.',
  group: 'Cato Supply',
  options: {
    applyTagSelectors: true
  },
  props: {
    title: props.Text({
      name: 'Hero Title',
      defaultValue: 'Governance built for resilient healthcare supply'
    }),
    summary: props.Text({
      name: 'Hero Summary',
      defaultValue:
        'Cato is guided by leaders with healthcare, technology, impact investing, operating, and growth experience so hospitals can rely on stronger supply pathways when disruption hits.'
    }),
    boardJson: props.Text({
      name: 'Board JSON',
      defaultValue: '',
      tooltip: 'Optional JSON array of board members: name, role, bio, imageUrl, linkedinUrl.'
    }),
    peopleEndpointUrl: props.Text({
      name: 'People Endpoint URL',
      defaultValue: 'https://cato-supply-insights-cms.createsomething.workers.dev/api/cato/team',
      tooltip: 'Public JSON endpoint for Board profile collection records, including image URLs.'
    }),
    fetchPeople: props.Boolean({
      name: 'Fetch Endpoint People',
      defaultValue: true,
      tooltip: 'Fetch People Endpoint URL in the browser unless Board JSON is set.'
    }),
    assetBasePath: props.Text({
      name: 'Asset Base Path',
      defaultValue: '',
      tooltip: 'Reserved for relative board image paths if Cato provides them later.'
    }),
    ctaLabel: props.Text({
      name: 'CTA Label',
      defaultValue: 'Contact Us'
    }),
    ctaHref: props.Text({
      name: 'CTA URL',
      defaultValue: '/contact-us'
    })
  }
});
