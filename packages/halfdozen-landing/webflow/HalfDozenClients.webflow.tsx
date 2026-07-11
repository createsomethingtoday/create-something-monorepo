import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { ClientsSection } from '../src/sections';
import './globals';

export default declareComponent(ClientsSection, {
  name: 'Half Dozen Clients',
  description: 'Figma-authored scroll transition, client cloud, and motion-aware media playback.',
  group: 'Half Dozen',
  options: { ssr: true },
  props: {
    assetBaseUrl: props.Text({ name: 'Asset base URL', defaultValue: 'https://halfdozen-landing.pages.dev' }),
    heroFullbleedMotion: props.Text({
      name: 'Full-bleed motion video path',
      defaultValue: '/media/hero-fullbleed-motion.mp4'
    }),
    heroFullbleedPoster: props.Text({
      name: 'Full-bleed motion poster path',
      defaultValue: '/assets/hero-fullbleed-poster.jpg'
    })
  }
});
