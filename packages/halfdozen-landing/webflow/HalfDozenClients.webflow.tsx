import { declareComponent } from '@webflow/react';
import { ClientsSection } from '../src/sections';
import './globals';

export default declareComponent(ClientsSection, {
  name: 'Half Dozen Clients',
  description: 'Client cloud section from the Half Dozen landing page.',
  group: 'Half Dozen',
  options: { ssr: true },
  props: {}
});
