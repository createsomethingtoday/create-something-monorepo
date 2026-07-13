import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { ContentCtaSection } from '../src/sections';
import './globals';

export default declareComponent(ContentCtaSection, {
  name: 'Half Dozen Content CTA',
  description: "Keep Up content list and Let's Talk consultation CTA.",
  group: 'Half Dozen',
  options: { ssr: true },
  props: {
    assetBaseUrl: props.Text({ name: 'Asset base URL', defaultValue: 'https://halfdozen-landing.pages.dev' })
  }
});
