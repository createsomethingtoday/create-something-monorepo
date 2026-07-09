import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { CatoAboutPage } from './CatoCompanyPages';

export default declareComponent(CatoAboutPage, {
  name: 'Cato About Page',
  description: 'Improved About page experience with self-contained Cato styling, proof, values, and mission sections. Leadership and Board now live on separate About dropdown pages by default.',
  group: 'Cato Supply',
  options: {
    applyTagSelectors: true,
  },
  props: {
    title: props.Text({
      name: 'Hero Title',
      defaultValue: 'The Healthcare Procurement Platform Purpose Built for Off-Contract Spend',
    }),
    summary: props.Text({
      name: 'Hero Summary',
      defaultValue:
        'Hospital systems depend on nimble supply chains to guarantee care continuity. Traditional contract-driven models for medical supplies expose hospitals to market volatility while holding them accountable for patient care.',
    }),
    ctaLabel: props.Text({
      name: 'CTA Label',
      defaultValue: 'Contact Us',
    }),
    ctaHref: props.Text({
      name: 'CTA URL',
      defaultValue: '/contact-us',
    }),
    goalTitle: props.Text({
      name: 'Goal Title',
      defaultValue: 'We Protect Patient Care When Supply Chain Disruptions Occur',
    }),
    goalText: props.Text({
      name: 'Goal Text',
      defaultValue:
        'Health systems face chronic supply disruptions, including shortages, tariff fluctuations, and product recalls that force them to step outside established channels in 1 out of 5 procurement situations.\n\nOur technology, supported by a team of experts, manages disruptions, optimizes spending, and delivers the products clinicians need to improve patient outcomes without interfering with existing GPO relationships.',
    }),
    missionTitle: props.Text({
      name: 'Mission Title',
      defaultValue: 'We Are Mission Driven',
    }),
    missionText: props.Text({
      name: 'Mission Text',
      defaultValue:
        'We believe a resilient supply chain contributes to a healthier world. Cato exists to help ensure access to safe, reliable, and cost-effective medical supplies.\n\nAt its core, Cato has a practical mission: ensure dependable access to the supplies required for continuous care delivery. We broaden sourcing options so providers can maintain continuity in volatile markets and focus resources where they matter most: the patient.',
    }),
    metricsJson: props.Text({
      name: 'Metrics JSON',
      defaultValue: '',
      tooltip: 'Optional JSON array of impact metrics: value, label, note.',
    }),
    valuesJson: props.Text({
      name: 'Values JSON',
      defaultValue: '',
      tooltip: 'Optional JSON array of Cato values: title, description, iconUrl.',
    }),
    teamMembersJson: props.Text({
      name: 'Team Members JSON',
      defaultValue: '',
      tooltip: 'Optional full Team Members API response or array. Items are filtered by Type for optional team sections.',
    }),
    leadershipJson: props.Text({
      name: 'Leadership JSON',
      defaultValue: '',
      tooltip: 'Optional JSON array of leadership members: name, role, bio, imageUrl, linkedinUrl.',
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
      tooltip: 'Optional prefix for exported asset paths, such as / or a static review path.',
    }),
    showMission: props.Boolean({
      name: 'Show Mission',
      defaultValue: true,
    }),
    showTeam: props.Boolean({
      name: 'Show Legacy Team Sections',
      defaultValue: false,
    }),
  },
});
