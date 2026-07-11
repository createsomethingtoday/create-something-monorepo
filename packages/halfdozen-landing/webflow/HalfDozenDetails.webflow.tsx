import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { DetailsSection } from '../src/sections';
import './globals';

export default declareComponent(DetailsSection, {
  name: 'Half Dozen Details',
  description: 'Service layer carousel section for Foundation, Workflows, Operations, Tooling, Strategy, and Growth.',
  group: 'Half Dozen',
  options: { ssr: true },
  props: {
    assetBaseUrl: props.Text({ name: 'Asset base URL', defaultValue: 'https://halfdozen-landing.pages.dev' })
  }
});
