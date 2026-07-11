import { declareComponent } from '@webflow/react';
import { HalfDozenHeader } from '../src/sections';
import './globals';

export default declareComponent(HalfDozenHeader, {
  name: 'Half Dozen Header',
  description: 'Standalone Half Dozen primary header and navigation.',
  group: 'Half Dozen',
  options: { ssr: true },
  props: {}
});
