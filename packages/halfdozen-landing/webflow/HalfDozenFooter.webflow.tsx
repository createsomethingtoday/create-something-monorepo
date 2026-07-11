import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { FooterSection } from '../src/sections';
import './globals';

export default declareComponent(FooterSection, {
  name: 'Half Dozen Footer',
  description: 'Footer section with Half Dozen lockup, navigation, legal links, and contact CTA.',
  group: 'Half Dozen',
  options: { ssr: true },
  props: {
    assetBaseUrl: props.Text({ name: 'Asset base URL', defaultValue: 'https://halfdozen-landing.pages.dev' })
  }
});
