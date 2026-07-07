import { declareComponent } from '@webflow/react';
import { ContentCtaSection } from '../src/sections';
import './globals';

export default declareComponent(ContentCtaSection, {
  name: 'Half Dozen Content CTA',
  description: "Keep Up content list and Let's Talk consultation CTA.",
  group: 'Half Dozen',
  options: { ssr: true }
});
