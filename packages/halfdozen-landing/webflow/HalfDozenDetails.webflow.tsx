import { declareComponent } from '@webflow/react';
import { DetailsSection } from '../src/sections';
import './globals';

export default declareComponent(DetailsSection, {
  name: 'Half Dozen Details',
  description: 'Service layer carousel section for Foundation, Workflows, Operations, Tooling, Strategy, and Growth.',
  group: 'Half Dozen',
  options: { ssr: true }
});
