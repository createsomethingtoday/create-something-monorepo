import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { HalfDozenLanding } from '../src/sections';
import './globals';

export default declareComponent(HalfDozenLanding, {
  name: 'Half Dozen Landing Page',
  description: 'Full Half Dozen landing page assembled from Webflow-ready section components.',
  group: 'Half Dozen',
  options: { ssr: true },
  props: {
    assetBaseUrl: props.Text({
      name: 'Asset base URL',
      defaultValue: 'https://halfdozen-landing.pages.dev'
    }),
    heroMotion: props.Text({ name: 'Hero motion video path', defaultValue: '/media/hero-motion.mp4' }),
    heroMotionPoster: props.Text({ name: 'Hero motion poster path', defaultValue: '/assets/hero-motion-poster.jpg' }),
    heroFullbleedMotion: props.Text({
      name: 'Full-bleed motion video path',
      defaultValue: '/media/hero-fullbleed-motion.mp4'
    }),
    heroFullbleedPoster: props.Text({
      name: 'Full-bleed motion poster path',
      defaultValue: '/assets/hero-fullbleed-poster.jpg'
    }),
    testimonialPhoto: props.Text({
      name: 'Primary testimonial photo path',
      defaultValue: '/assets/testimonials/stereo-punks-photo.webp'
    })
  }
});
