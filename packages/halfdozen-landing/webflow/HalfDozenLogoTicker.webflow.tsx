import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { LogoTicker } from '../src/sections';
import './globals';

export default declareComponent(LogoTicker, {
  name: 'Half Dozen Logo Ticker',
  description: 'Animated client logo ticker.',
  group: 'Half Dozen',
  options: { ssr: true },
  props: {
    assetBaseUrl: props.Text({ name: 'Asset base URL', defaultValue: 'https://halfdozen-landing.pages.dev' })
  }
});
