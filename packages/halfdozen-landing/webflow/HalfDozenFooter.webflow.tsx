import { declareComponent } from '@webflow/react';
import { FooterSection } from '../src/sections';
import './globals';

export default declareComponent(FooterSection, {
  name: 'Half Dozen Footer',
  description: 'Footer section with Half Dozen lockup, navigation, legal links, and contact CTA.',
  group: 'Half Dozen',
  options: { ssr: true },
  props: {}
});
